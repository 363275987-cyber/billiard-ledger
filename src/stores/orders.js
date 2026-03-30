import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'
import { logOperation, getAccountBalance, formatMoneyStr } from '../utils/operationLogger'

export const useOrderStore = defineStore('orders', {
  state: () => ({
    orders: [],
    loading: false,
    pagination: { total: 0, page: 1, pageSize: 20 },
  }),

  actions: {
    async fetchOrders({ keyword, searchField, category, dateFrom, dateTo, status, page = 1, pageSize = 20 } = {}) {
      this.loading = true
      try {
        const keywordParams = { searchField }
        let query = supabase
          .from('orders')
          .select('*, sales_profile:sales_id(name)', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range((page - 1) * pageSize, page * pageSize - 1)

        if (keyword) {
          // 按指定字段搜索
          const field = keywordParams.searchField
          if (field && field !== 'account_name') {
            // 指定字段搜索（不走账户查询，速度快）
            if (field === 'account_code' || field === 'customer_name' || field === 'product_name' || field === 'order_no' || field === 'note' || field === 'service_number_code') {
              query = query.ilike(field, `%${keyword}%`)
            }
          } else if (field === 'account_name' || !field) {
            // 账户名搜索：先查账户
            const { data: matchedAccounts } = await supabase
              .from('accounts')
              .select('id')
              .or(`short_name.ilike.%${keyword}%,code.ilike.%${keyword}%`)
              .limit(50)
            const accIds = (matchedAccounts || []).map(a => a.id)
            if (!field && accIds.length === 0) {
              // "全部字段"模式下账户没匹配到，退回到多字段 ilike
              query = query.or(`customer_name.ilike.%${keyword}%,product_name.ilike.%${keyword}%,account_code.ilike.%${keyword}%,order_no.ilike.%${keyword}%,note.ilike.%${keyword}%`)
            } else {
              let orParts = `customer_name.ilike.%${keyword}%,product_name.ilike.%${keyword}%,account_code.ilike.%${keyword}%,order_no.ilike.%${keyword}%,note.ilike.%${keyword}%`
              if (accIds.length > 0) {
                orParts += `,account_id.in.(${accIds.join(',')})`
              }
              query = query.or(orParts)
            }
          }
        }
        if (category) query = query.eq('product_category', category)
        if (status) query = query.eq('status', status)
        if (dateFrom) query = query.gte('created_at', dateFrom)
        if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59')

        const { data, error, count } = await query
        if (error) throw error
        this.orders = data || []
        this.pagination = { total: count || 0, page, pageSize }
      } catch (e) {
        console.error('Failed to fetch orders:', e)
      } finally {
        this.loading = false
      }
    },

    async createOrder(payload) {
      // 一次性获取 session，避免多次异步请求
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id

      // 自动填充 sales_id：通过 account_id 查当前活跃分配
      let salesId = payload.sales_id
      if (!salesId && payload.account_id) {
        const { data: ca } = await supabase
          .from('channel_assignments')
          .select('sales_id')
          .eq('account_id', payload.account_id)
          .eq('status', 'active')
          .maybeSingle()
        if (ca) salesId = ca.sales_id
      }
      // Fallback: 如果还是没有 sales_id，用当前用户
      if (!salesId) salesId = userId

      const { data, error } = await supabase
        .from('orders')
        .insert({
          ...payload,
          sales_id: salesId,
          creator_id: userId,
        })
        .select()
        .single()
      if (error) throw error
      this.orders.unshift(data)

      // 自动更新对应账户余额
      let balBefore = null
      let balAfter = null
      if (payload.account_id && payload.amount) {
        const { useAccountStore } = await import('./accounts')
        const accStore = useAccountStore()
        balBefore = accStore.accounts.find(a => a.id === payload.account_id)?.balance ?? null
        try {
          await accStore.updateBalance(payload.account_id, Number(payload.amount))
          balAfter = accStore.accounts.find(a => a.id === payload.account_id)?.balance ?? null
        } catch (e) {
          console.error('余额更新失败，订单已创建但余额未更新:', e)
          // 不阻止订单创建，但在日志中标记
        }
      }

      // 操作日志
      try {
        const accName = await getAccountBalance(payload.account_id).then(r => r?.name || null)
        const balText = balBefore != null && balAfter != null
          ? `，余额 ${Number(balBefore).toFixed(2)} ${Number(balAfter) > Number(balBefore) ? '+' : '-'} ${Math.abs(Number(balAfter) - Number(balBefore)).toFixed(2)} → ${Number(balAfter).toFixed(2)}`
          : ''
        logOperation({
          action: 'create_order',
          module: '订单',
          description: `新建订单 ${data.order_no || ''}，金额 ${formatMoneyStr(payload.amount)}${accName ? `，账户：${accName}` : ''}${balText}${payload.customer_name ? `，客户：${payload.customer_name}` : ''}`,
          detail: { order_id: data.id, order_no: data.order_no, amount: payload.amount, customer_name: payload.customer_name, account_id: payload.account_id, balance_before: balBefore, balance_after: balAfter },
          amount: payload.amount,
          accountId: payload.account_id,
          accountName: accName,
        })
      } catch (_) {}

      return data
    },

    async updateOrder(id, updates) {
      // 安全检查：非 admin/finance 不能修改 status
      const { data: session } = await supabase.auth.getSession()
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (!['admin', 'finance'].includes(profile?.role)) {
        delete updates.status
      }

      // 记录变更前的快照（用于后续余额调整）
      const oldOrder = this.orders.find(o => o.id === id)
      const needCancelRefund = oldOrder && updates.status === 'cancelled' && oldOrder.status !== 'cancelled'
        && oldOrder.account_id && oldOrder.amount && Number(oldOrder.amount) > 0
      const amountDelta = (updates.amount !== undefined && oldOrder && Number(updates.amount) !== Number(oldOrder.amount))
        ? Number(updates.amount) - Number(oldOrder.amount || 0)
        : 0
      const needAmountAdjust = amountDelta !== 0 && oldOrder && oldOrder.account_id

      // ⚠️ 先更新数据库，成功后再调整余额（防止余额变了但DB没变）
      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      const idx = this.orders.findIndex(o => o.id === id)
      if (idx >= 0) this.orders[idx] = data

      // DB 更新成功后，再处理余额变动
      const { useAccountStore } = await import('./accounts')
      const accStore = useAccountStore()

      // 取消订单：退回余额
      if (needCancelRefund) {
        try {
          const balBefore = accStore.accounts.find(a => a.id === oldOrder.account_id)?.balance ?? null
          await accStore.updateBalance(oldOrder.account_id, -Number(oldOrder.amount))
          const balAfter = accStore.accounts.find(a => a.id === oldOrder.account_id)?.balance ?? null
          try {
            const accInfo = await getAccountBalance(oldOrder.account_id)
            const accName = accInfo?.name || ''
            const balText = balBefore != null && balAfter != null
              ? `，余额 ${Number(balBefore).toFixed(2)} - ${Math.abs(Number(balBefore) - Number(balAfter)).toFixed(2)} → ${Number(balAfter).toFixed(2)}`
              : ''
            logOperation({
              action: 'cancel_order',
              module: '订单',
              description: `取消订单 ${oldOrder.order_no || ''}，退回金额 ${formatMoneyStr(oldOrder.amount)}，客户：${oldOrder.customer_name || ''}，账户：${accName}${balText}`,
              detail: { order_id: id, order_no: oldOrder.order_no, amount: oldOrder.amount, customer_name: oldOrder.customer_name, account_id: oldOrder.account_id, account_name: accName, balance_before: balBefore, balance_after: balAfter },
              amount: oldOrder.amount,
              accountId: oldOrder.account_id,
              accountName: accName,
              balanceBefore: balBefore,
              balanceAfter: balAfter,
            })
          } catch (_) {}
        } catch (e) {
          console.error('❌ 取消订单余额回退失败（订单已取消但余额未退），需手动处理！订单:', oldOrder.order_no, '账户:', oldOrder.account_id, '金额:', oldOrder.amount, e)
        }
      }

      // 修改金额：调整余额差额
      if (needAmountAdjust) {
        try {
          const balBefore = accStore.accounts.find(a => a.id === oldOrder.account_id)?.balance ?? null
          await accStore.updateBalance(oldOrder.account_id, amountDelta)
          const balAfter = accStore.accounts.find(a => a.id === oldOrder.account_id)?.balance ?? null
          try {
            const accInfo = await getAccountBalance(oldOrder.account_id)
            const accName = accInfo?.name || ''
            const dir = amountDelta > 0 ? '+' : '-'
            const balText = balBefore != null && balAfter != null
              ? `，余额 ${Number(balBefore).toFixed(2)} ${dir} ${Math.abs(amountDelta).toFixed(2)} → ${Number(balAfter).toFixed(2)}`
              : ''
            logOperation({
              action: 'update_order_amount',
              module: '订单',
              description: `修改订单 ${oldOrder.order_no || ''} 金额 ${formatMoneyStr(oldOrder.amount)} → ${formatMoneyStr(updates.amount)}，客户：${oldOrder.customer_name || ''}，账户：${accName}${balText}`,
              detail: { order_id: id, order_no: oldOrder.order_no, old_amount: oldOrder.amount, new_amount: updates.amount, delta: amountDelta, customer_name: oldOrder.customer_name, account_id: oldOrder.account_id, account_name: accName, balance_before: balBefore, balance_after: balAfter },
              amount: Math.abs(amountDelta),
              accountId: oldOrder.account_id,
              accountName: accName,
              balanceBefore: balBefore,
              balanceAfter: balAfter,
            })
          } catch (_) {}
        } catch (e) {
          console.error('❌ 订单金额变更余额调整失败（订单已改但余额未调），需手动处理！订单:', oldOrder.order_no, '差额:', amountDelta, e)
        }
      }

      return data
    },

    async deleteOrder(idOrOrder) {
      const order = typeof idOrOrder === 'object' ? idOrOrder : null
      const id = typeof idOrOrder === 'string' ? idOrOrder : order.id

      // 通过 RPC 软删除
      const { error: delError } = await supabase.rpc('delete_order', { p_id: id })
      if (delError) throw delError

      // 退回余额（通过 RPC，已包含余额快照）
      let refundInfo = null
      if (order?.account_id && order?.amount && Number(order.amount) > 0) {
        const { data: refund } = await supabase.rpc('refund_order_balance', { p_order_id: id })
        refundInfo = refund
        if (refund?.ok) {
          const { useAccountStore } = await import('./accounts')
          useAccountStore().refreshBalance(order.account_id)
        }
      }

      // 操作日志
      if (order) {
        try {
          const { logOperation, getAccountBalance } = await import('../utils/operationLogger')
          const accInfo = order.account_id ? await getAccountBalance(order.account_id) : null
          const accName = accInfo?.name || ''
          const balText = refundInfo?.old_balance != null && refundInfo?.new_balance != null
            ? `，余额 ${Number(refundInfo.old_balance).toFixed(2)} - ${Math.abs(Number(refundInfo.old_balance) - Number(refundInfo.new_balance)).toFixed(2)} → ${Number(refundInfo.new_balance).toFixed(2)}`
            : ''
          logOperation({
            action: 'delete_order',
            module: '订单',
            description: `删除订单 ${order.order_no || ''}，退回金额 ${Number(order.amount || 0).toFixed(2)}，客户：${order.customer_name || ''}，账户：${accName}${balText}`,
            detail: { order_id: id, order_no: order.order_no, amount: order.amount, customer_name: order.customer_name, account_id: order.account_id, account_name: accName, balance_before: refundInfo?.old_balance, balance_after: refundInfo?.new_balance },
            amount: order.amount,
            accountId: order.account_id,
            accountName: accName,
          })
        } catch (_) {}
      }

      this.orders = this.orders.filter(o => o.id !== id)
    },
  },
})
