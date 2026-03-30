import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'

export const useProductStore = defineStore('products', {
  state: () => ({
    products: [],
    loading: false,
    pagination: { total: 0, page: 1, pageSize: 50 },
  }),

  actions: {
    async fetchProducts({ keyword, category, brand, status, page = 1, pageSize = 50 } = {}) {
      this.loading = true
      try {
        let query = supabase
          .from('products')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range((page - 1) * pageSize, page * pageSize - 1)

        if (keyword) {
          query = query.or(`name.ilike.%${keyword}%,brand.ilike.%${keyword}%`)
        }
        if (category) query = query.eq('category', category)
        if (brand) query = query.eq('brand', brand)
        if (status) query = query.eq('status', status)

        const { data, error, count } = await query
        if (error) throw error
        this.products = data || []
        this.pagination = { total: count || 0, page, pageSize }
      } catch (e) {
        console.error('Failed to fetch products:', e)
      } finally {
        this.loading = false
      }
    },

    async createProduct(payload) {
      const { data, error } = await supabase
        .from('products')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      this.products.unshift(data)
      return data
    },

    async updateProduct(id, updates) {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      const idx = this.products.findIndex(p => p.id === id)
      if (idx >= 0) this.products[idx] = data
      return data
    },

    async deleteProduct(id) {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
      this.products = this.products.filter(p => p.id !== id)
    },

    async searchProducts(keyword) {
      if (!keyword || keyword.length < 1) return []
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, brand, cost_price, retail_price, unit, status')
        .eq('status', 'active')
        .or(`name.ilike.%${keyword}%,brand.ilike.%${keyword}%`)
        .limit(20)
      if (error) throw error
      return data || []
    },

    // ========== 套装赠品系统 ==========

    /** 获取产品的套装（含赠品详情） */
    async getProductBundle(productId) {
      const { data, error } = await supabase
        .from('product_bundle_items')
        .select(`
          id, quantity, sort_order,
          product_id,
          products:product_id(id, name, category, brand, cost_price, retail_price, unit)
        `)
        .eq('bundle_id', productId)
        .order('sort_order')
      if (error) throw error
      return data || []
    },

    /** 通过 RPC 获取完整套装（bundle + gifts） */
    async fetchBundleForProduct(productId) {
      const { data, error } = await supabase.rpc('get_product_bundle', { p_product_id: productId })
      if (error) throw error
      return data // { bundle_id, name, main_product_id, main_product_name, gifts: [...] }
    },

    /** 保存套装：创建或更新 */
    async saveBundle(mainProductId, gifts, bundleName = null, createdBy = null) {
      // gifts: [{ product_id, quantity }]
      if (!gifts || gifts.length === 0) return

      // 1. Upsert bundle（ON CONFLICT main_product_id → 更新）
      const { data: bundle, error: bErr } = await supabase
        .from('product_bundles')
        .upsert(
          { main_product_id: mainProductId, name: bundleName, created_by: createdBy },
          { onConflict: 'main_product_id' }
        )
        .select()
        .single()
      if (bErr) throw bErr

      const bundleId = bundle.id

      // 2. 删除旧的赠品关联
      await supabase.from('product_bundle_items').delete().eq('bundle_id', bundleId)

      // 3. 插入新的赠品
      const items = gifts.map((g, i) => ({
        bundle_id: bundleId,
        product_id: g.product_id,
        quantity: g.quantity || 1,
        sort_order: i,
      }))
      const { error: iErr } = await supabase.from('product_bundle_items').insert(items)
      if (iErr) throw iErr

      return bundle
    },

    /** 删除套装 */
    async deleteBundle(mainProductId) {
      const { error } = await supabase
        .from('product_bundles')
        .delete()
        .eq('main_product_id', mainProductId)
      if (error) throw error
    },

    /** 赠品价值校验：赠品总成本是否超过主产品成本的 N 倍 */
    validateGiftValue(mainCostPrice, gifts, limitMultiplier = 3) {
      const giftTotalCost = gifts.reduce((sum, g) => sum + (Number(g.cost_price) || 0) * (g.quantity || 1), 0)
      const maxAllowed = Number(mainCostPrice) * limitMultiplier
      return {
        giftTotalCost,
        maxAllowed,
        isWithinLimit: giftTotalCost <= maxAllowed || maxAllowed === 0,
        overBy: maxAllowed > 0 ? Math.max(0, giftTotalCost - maxAllowed) : 0,
      }
    },
  },
})
