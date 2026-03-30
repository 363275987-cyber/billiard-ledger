import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'
import { logOperation, getAccountBalance, formatMoneyStr } from '../utils/operationLogger'

export const useExpenseStore = defineStore('expenses', {
  state: () => ({
    expenses: [],
    loading: false,
    pagination: { total: 0, page: 1, pageSize: 20 },
  }),

  actions: {
    async fetchExpenses({ status, category, dateFrom, dateTo, search, searchField, page = 1, pageSize = 20 } = {}) {
      this.loading = true
      try {
        let query = supabase
          .from('expenses')
          .select('*, profiles:created_by(name, role), approver:approver_id(name)', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range((page - 1) * pageSize, page * pageSize - 1)

        if (status) query = query.eq('status', status)
        if (category) query = query.eq('category', category)
        if (dateFrom) query = query.gte('created_at', dateFrom)
        if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59')
        if (search) {
          const field = searchField
          if (field && field !== 'account_name') {
            if (field === 'payee' || field === 'note' || field === 'category') {
              query = query.ilike(field, `%${search}%`)
            }
          } else {
            // 全部字段或账户名搜索
            const { data: matchedAccounts } = await supabase
              .from('accounts')
              .select('id')
              .or(`short_name.ilike.%${search}%,code.ilike.%${search}%`)
              .limit(50)
            const accIds = (matchedAccounts || []).map(a => a.id)
            if (!field && accIds.length === 0) {
              query = query.or(`payee.ilike.%${search}%,note.ilike.%${search}%,expense_no.ilike.%${search}%`)
            } else {
              let orParts = `payee.ilike.%${search}%,note.ilike.%${search}%,expense_no.ilike.%${search}%`
              if (accIds.length > 0) {
                orParts += `,account_id.in.(${accIds.join(',')})`
              }
              query = query.or(orParts)
            }
          }
        }

        const { data, error, count } = await query
        if (error) throw error
        this.expenses = data || []
        this.pagination = { total: count || 0, page, pageSize }
      } catch (e) {
        console.error('Failed to fetch expenses:', e)
      } finally {
        this.loading = false
      }
    },

    async createExpense(payload) {
      const userId = (await supabase.auth.getSession()).data.session?.user?.id
      
      // <= 2000 不需要审批，提交后直接标记已付款
      let status = 'pending'
      let approvedBy = null
      let approvedAt = null
      let paidAt = null
      
      if (payload.amount <= 2000) {
        status = 'paid'
        approvedBy = userId
        approvedAt = new Date().toISOString()
        paidAt = new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from('expenses')
        .insert({ ...payload, status, approver_id: approvedBy, approved_at: approvedAt, paid_at: paidAt, created_by: userId })
        .select('*, profiles:created_by(name, role)')
        .single()
      if (error) throw error
      this.expenses.unshift(data)
      
      // 已付款状态：自动扣减账户余额
      let balBefore = null
      let balAfter = null
      if (status === 'paid' && payload.account_id && payload.amount) {
        try {
          const { useAccountStore } = await import('./accounts')
          const accStore = useAccountStore()
          // 从缓存取扣款前余额
          balBefore = accStore.accounts.find(a => a.id === payload.account_id)?.balance ?? null
          await accStore.updateBalance(payload.account_id, -Number(payload.amount))
          // 扣款后余额（缓存已更新）
          balAfter = accStore.accounts.find(a => a.id === payload.account_id)?.balance ?? null
          // 余额快照写入支出记录
          if (balAfter != null) {
            supabase.from('expenses').update({ balance_after: balAfter }).eq('id', data.id).then()
          }
        } catch (e) {
          console.warn('支出余额扣减失败:', e)
        }
      }

      // 操作日志（已付款）
      if (status === 'paid') {
        try {
          const acc = await getAccountBalance(payload.account_id)
          const balText = balBefore != null && balAfter != null
            ? `，余额 ${Number(balBefore).toFixed(2)} ${Number(balAfter) < Number(balBefore) ? '-' : '+'} ${Math.abs(Number(balBefore) - Number(balAfter)).toFixed(2)} → ${Number(balAfter).toFixed(2)}`
            : ''
          logOperation({
            action: 'pay_expense',
            module: '支出',
            description: `支付支出 ${formatMoneyStr(payload.amount)}，类别：${payload.category || '未分类'}${acc ? `，账户：${acc.name}` : ''}${balText}`,
            detail: { expense_id: data.id, amount: payload.amount, category: payload.category, account_id: payload.account_id, balance_before: balBefore, balance_after: balAfter },
            amount: payload.amount,
            accountId: payload.account_id,
            accountName: acc?.name || null,
          })
        } catch (_) {}
      }
      
      return data
    },

    async approveExpense(id, approved) {
      const userId = (await supabase.auth.getSession()).data.session?.user?.id
      // 安全检查：只有 pending 状态可以审批
      const { data: current } = await supabase.from('expenses').select('status').eq('id', id).single()
      if (!current || current.status !== 'pending') {
        throw new Error('该支出不在待审批状态')
      }
      const updates = {
        status: approved ? 'approved' : 'rejected',
        approver_id: userId,
        approved_at: new Date().toISOString(),
      }
      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      const idx = this.expenses.findIndex(e => e.id === id)
      if (idx >= 0) this.expenses[idx] = data
      return data
    },

    async markAsPaid(id, accountId) {
      // 安全检查：只有 approved 状态可以确认付款
      const { data: current } = await supabase.from('expenses').select('status, amount, account_id').eq('id', id).single()
      if (!current || current.status !== 'approved') {
        throw new Error('该支出未通过审批，无法确认付款')
      }
      const { data, error } = await supabase
        .from('expenses')
        .update({ status: 'paid', account_id: accountId, paid_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      // 扣减付款账户余额
      let balResult = null
      if (accountId && current.amount) {
        try {
          const { useAccountStore } = await import('./accounts')
          balResult = await useAccountStore().updateBalance(accountId, -Number(current.amount))
          if (balResult?.new_balance != null) {
            supabase.from('expenses').update({ balance_after: balResult.new_balance }).eq('id', id).then()
          }
        } catch (e) {
          console.warn('支出余额扣减失败:', e)
        }
      }
      const idx = this.expenses.findIndex(e => e.id === id)
      if (idx >= 0) this.expenses[idx] = data

      // 操作日志
      try {
        const acc = await getAccountBalance(accountId)
        logOperation({
          action: 'pay_expense',
          module: '支出',
          description: `确认付款 ${formatMoneyStr(current.amount)}${acc ? `，账户：${acc.name}` : ''}`,
          detail: { expense_id: id, amount: current.amount, account_id: accountId },
          amount: current.amount,
          accountId: accountId,
          accountName: acc?.name || null,
          balanceAfter: acc ? await getAccountBalance(accountId).then(r => r?.balance ?? null) : null,
        })
      } catch (_) {}

      return data
    },
  },
})
