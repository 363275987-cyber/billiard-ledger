import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'

export const useAccountStore = defineStore('accounts', {
  state: () => ({
    accounts: [],
    loading: false,
    _forceRefresh: false,
  }),
  actions: {
    async fetchAccounts() {
      // 数据缓存：已有数据且非强制刷新时跳过
      if (this.accounts.length > 0 && !this._forceRefresh) return
      this._forceRefresh = false
      this.loading = true
      try {
        const { data, error } = await supabase
          .from('accounts')
          .select('*')
          .order('ip_code')
          .order('sequence')
        if (error) throw error
        this.accounts = data || []
      } catch (e) {
        console.error('Failed to fetch accounts:', e)
      } finally {
        this.loading = false
      }
    },

    async createAccount(payload) {
      const { data, error } = await supabase
        .from('accounts')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      this.accounts.push(data)
      return data
    },

    async updateAccount(id, updates) {
      const { data, error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      const idx = this.accounts.findIndex(a => a.id === id)
      if (idx >= 0) this.accounts[idx] = data
      return data
    },

    async deleteAccount(id) {
      // 检查是否有关联订单
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', id)
      if (count && count > 0) {
        throw new Error(`该账户下有 ${count} 笔订单，无法删除。请先处理关联订单。`)
      }
      const { error } = await supabase.from('accounts').delete().eq('id', id)
      if (error) {
        if (error.message?.includes('foreign key')) {
          throw new Error('该账户有关联数据，无法删除')
        }
        throw error
      }
      this.accounts = this.accounts.filter(a => a.id !== id)
    },

    // 获取活跃账户列表（用于下拉选择）
    getActiveAccounts() {
      return this.accounts.filter(a => a.status === 'active')
    },

    // 更新账户余额（原子操作）
    // amountDelta > 0 增加，< 0 减少
    async updateBalance(accountId, amountDelta) {
      const { data, error } = await supabase.rpc('increment_balance', {
        acct_id: accountId,
        delta: amountDelta
      })
      if (error) throw error
      // data 现在是 {old_balance, new_balance}
      const newBal = data?.new_balance ?? (typeof data === 'number' ? data : null)
      // 更新本地缓存
      const idx = this.accounts.findIndex(a => a.id === accountId)
      if (idx >= 0) this.accounts[idx].balance = Number(newBal) || ((this.accounts[idx].balance || 0) + amountDelta)
      return data
    },

    // 从 Supabase 重新加载余额（同步真实数据）
    async refreshBalance(accountId) {
      const { data, error } = await supabase
        .from('accounts')
        .select('balance')
        .eq('id', accountId)
        .single()
      if (error) throw error
      const idx = this.accounts.findIndex(a => a.id === accountId)
      if (idx >= 0) this.accounts[idx].balance = data.balance
      return data.balance
    },

    // 按 IP 分组
    getGroupedByIP() {
      const groups = {}
      for (const acc of this.getActiveAccounts()) {
        if (!groups[acc.ip_code]) groups[acc.ip_code] = []
        groups[acc.ip_code].push(acc)
      }
      return groups
    },
  },
})
