import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'

export const useSalesGroupStore = defineStore('salesGroup', {
  state: () => ({
    groups: [],
    members: [],        // current group members
    groupPerformance: [], // group performance data
    loading: false,
  }),
  actions: {
    // 获取所有分组
    async fetchGroups() {
      this.loading = true
      try {
        const { data, error } = await supabase
          .from('sales_groups')
          .select('*')
          .order('created_at', { ascending: false })
        if (error) throw error
        this.groups = data || []
      } catch (e) {
        console.error('Failed to fetch groups:', e)
        throw e
      } finally {
        this.loading = false
      }
    },

    // 创建分组 - 使用 RPC 绕过 RLS
    async createGroup({ name, leader_id }) {
      const { data, error } = await supabase
        .rpc('create_sales_group', { p_name: name, p_leader_id: leader_id || null })
      if (error) throw error

      await this.fetchGroups()
      return data
    },

    // 更新分组
    async updateGroup(id, updates) {
      const { error } = await supabase
        .from('sales_groups')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      await this.fetchGroups()
    },

    // 删除分组
    async deleteGroup(id) {
      // 先删除成员
      await supabase.from('sales_group_members').delete().eq('group_id', id)
      const { error } = await supabase.from('sales_groups').delete().eq('id', id)
      if (error) throw error
      await this.fetchGroups()
    },

    // 获取分组下的成员（带 profile 信息）
    async fetchMembers(groupId) {
      const { data, error } = await supabase
        .from('sales_group_members')
        .select(`
          *,
          profile:profiles(id, name, role, phone)
        `)
        .eq('group_id', groupId)
        .order('role', { ascending: false }) // leader first
      if (error) throw error
      this.members = data || []
      return this.members
    },

    // 添加成员
    async addMember(groupId, userId, role = 'member') {
      const { error } = await supabase
        .from('sales_group_members')
        .insert({ group_id: groupId, user_id: userId, role })
      if (error) throw error
      await this.fetchMembers(groupId)
    },

    // 移除成员
    async removeMember(groupId, userId) {
      const { error } = await supabase
        .from('sales_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId)
      if (error) throw error
      await this.fetchMembers(groupId)
    },

    // 设置组长（更新分组 leader_id + 成员角色）
    async setLeader(groupId, userId) {
      // 先把当前 leader 改为 member
      const group = this.groups.find(g => g.id === groupId)
      if (group?.leader_id) {
        await supabase
          .from('sales_group_members')
          .update({ role: 'member' })
          .eq('group_id', groupId)
          .eq('user_id', group.leader_id)
      }

      // 更新新 leader 的角色
      await supabase
        .from('sales_group_members')
        .update({ role: 'leader' })
        .eq('group_id', groupId)
        .eq('user_id', userId)

      // 更新分组表
      await supabase
        .from('sales_groups')
        .update({ leader_id: userId, updated_at: new Date().toISOString() })
        .eq('id', groupId)

      await this.fetchGroups()
      await this.fetchMembers(groupId)
    },

    // 获取用户所在的销售组
    async getUserGroup(userId) {
      const { data, error } = await supabase
        .rpc('get_user_sales_group', { p_user_id: userId })
      if (error) throw error
      return data || []
    },

    // 获取组内业绩
    async fetchGroupPerformance(groupId, month) {
      const { data, error } = await supabase
        .from('v_group_performance')
        .select('*')
        .eq('group_id', groupId)
        .like('month', `${month}%`)
      if (error) throw error
      this.groupPerformance = data || []
      return this.groupPerformance
    },

    // 获取组员列表（用于添加成员选择）
    async getAvailableUsers() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('status', 'active')
        .order('name')
      if (error) throw error
      return data || []
    },
  },
})
