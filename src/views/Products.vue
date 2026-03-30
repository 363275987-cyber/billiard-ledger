<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-bold text-gray-800">📦 产品库</h1>
      <button
        v-if="canEdit"
        @click="openModal()"
        class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition cursor-pointer"
      >
        + 添加产品
      </button>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-4 gap-4 mb-5">
      <div class="bg-white rounded-xl border border-gray-100 p-4">
        <div class="text-xs text-gray-400 mb-1">📦 产品总数</div>
        <div class="text-2xl font-bold text-gray-800">{{ summary.total }}</div>
      </div>
      <div class="bg-white rounded-xl border border-gray-100 p-4">
        <div class="text-xs text-gray-400 mb-1">🎱 球杆/前支</div>
        <div class="text-2xl font-bold text-blue-600">{{ summary.cue }}</div>
      </div>
      <div class="bg-white rounded-xl border border-gray-100 p-4">
        <div class="text-xs text-gray-400 mb-1">🔧 皮头/配件</div>
        <div class="text-2xl font-bold text-purple-600">{{ summary.accessory }}</div>
      </div>
      <div class="bg-white rounded-xl border border-gray-100 p-4">
        <div class="text-xs text-gray-400 mb-1">🎱 球桌/台尼</div>
        <div class="text-2xl font-bold text-orange-500">{{ summary.table }}</div>
      </div>
    </div>

    <!-- 搜索过滤 -->
    <div class="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex gap-3 items-center flex-wrap">
      <input
        v-model="filters.keyword"
        placeholder="搜索产品名称/品牌"
        class="px-3 py-2 border border-gray-200 rounded-lg text-sm w-56 outline-none focus:ring-2 focus:ring-blue-500"
        @keyup.enter="loadProducts"
      />
      <select v-model="filters.category" class="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
        <option value="">全部分类</option>
        <option v-for="(label, key) in PRODUCT_ITEM_CATEGORIES" :key="key" :value="key">{{ label }}</option>
      </select>
      <select v-model="filters.brand" class="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
        <option value="">全部品牌</option>
        <option v-for="b in brands" :key="b" :value="b">{{ b }}</option>
      </select>
      <select v-model="filters.status" class="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
        <option value="">全部状态</option>
        <option value="active">上架中</option>
        <option value="inactive">已下架</option>
      </select>
      <button @click="loadProducts" class="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition cursor-pointer">搜索</button>
      <span class="text-sm text-gray-400 ml-auto">共 {{ productStore.pagination.total }} 个产品</span>
    </div>

    <!-- 产品列表 -->
    <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div v-if="productStore.loading" class="py-16 text-center text-gray-400 text-sm">加载中…</div>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="bg-gray-50 text-gray-600">
            <th class="px-4 py-3 text-center font-medium">图片</th>
            <th class="px-4 py-3 text-left font-medium">产品名称</th>
            <th class="px-4 py-3 text-left font-medium">分类</th>
            <th class="px-4 py-3 text-left font-medium">品牌</th>
            <th v-if="canSeeCost" class="px-4 py-3 text-right font-medium">成本价</th>
            <th class="px-4 py-3 text-right font-medium">零售价</th>
            <th class="px-4 py-3 text-left font-medium">单位</th>
            <th class="px-4 py-3 text-center font-medium">状态</th>
            <th class="px-4 py-3 text-center font-medium" v-if="canEdit || canDelete">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="product in productStore.products"
            :key="product.id"
            class="border-t border-gray-50 hover:bg-gray-50/60"
          >
            <td class="px-4 py-3 text-center">
              <span class="text-2xl">{{ product.image || '📦' }}</span>
            </td>
            <td class="px-4 py-3">
              <div class="text-gray-800 font-medium">{{ product.name }}</div>
              <div v-if="product.sub_category" class="text-xs text-gray-400 mt-0.5">{{ product.sub_category }}</div>
              <div v-if="bundleGiftCount[product.id]" class="text-xs text-purple-500 mt-0.5">
                📦 已绑定 {{ bundleGiftCount[product.id] }} 个赠品
              </div>
            </td>
            <td class="px-4 py-3">
              <span class="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                {{ PRODUCT_ITEM_CATEGORIES[product.category] || product.category || '—' }}
              </span>
            </td>
            <td class="px-4 py-3 text-gray-500">{{ product.brand || '—' }}</td>
            <td v-if="canSeeCost" class="px-4 py-3 text-right">
              <span :class="Number(product.cost_price) > 0 ? 'text-red-500' : 'text-gray-400'">
                {{ Number(product.cost_price) > 0 ? formatMoney(product.cost_price) : '未设置' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right text-gray-600">
              {{ product.retail_price ? formatMoney(product.retail_price) : '—' }}
            </td>
            <td class="px-4 py-3 text-gray-500">{{ product.unit || '个' }}</td>
            <td class="px-4 py-3 text-center">
              <span :class="product.status === 'active' ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-50'" class="text-xs px-2 py-0.5 rounded">
                {{ product.status === 'active' ? '上架中' : '已下架' }}
              </span>
            </td>
            <td class="px-4 py-3 text-center" v-if="canEdit || canDelete">
              <div class="flex items-center justify-center gap-1">
                <button v-if="canEdit" @click="openBundleModal(product)" class="text-purple-500 hover:text-purple-700 text-xs px-2 py-1 rounded hover:bg-purple-50 transition cursor-pointer" title="管理套装赠品">🎁 套装</button>
                <button v-if="canEdit" @click="openModal(product)" class="text-blue-500 hover:text-blue-700 text-xs px-2 py-1 rounded hover:bg-blue-50 transition cursor-pointer">编辑</button>
                <button v-if="canDelete" @click="handleDelete(product)" class="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50 transition cursor-pointer">删除</button>
              </div>
            </td>
          </tr>
          <tr v-if="!productStore.loading && productStore.products.length === 0">
            <td :colspan="canEdit ? 8 : 7" class="px-4 py-16 text-center text-gray-400">
              <div class="text-3xl mb-2">📦</div>
              <div>暂无产品数据</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal: Add/Edit Product -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      @click.self="showModal = false"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 class="font-bold text-gray-800">{{ editingProduct ? '编辑产品' : '添加产品' }}</h2>
          <button @click="showModal = false" class="text-gray-400 hover:text-gray-600 text-xl cursor-pointer">&times;</button>
        </div>
        <form @submit.prevent="handleSubmit" class="p-6 space-y-4 overflow-y-auto">
          <!-- 产品名称 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">产品名称 <span class="text-red-400">*</span></label>
            <input
              v-model="form.name"
              placeholder="如：国熙-霜华-小头杆"
              required
              class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <!-- 分类 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">分类</label>
              <select v-model="form.category" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">请选择</option>
                <option v-for="(label, key) in PRODUCT_ITEM_CATEGORIES" :key="key" :value="key">{{ label }}</option>
              </select>
            </div>
            <!-- 品牌 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">品牌</label>
              <input
                v-model="form.brand"
                placeholder="如：国熙、DBA"
                list="brand-suggestions"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="brand-suggestions">
                <option v-for="b in brands" :key="b" :value="b" />
              </datalist>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <!-- 图片(Emoji) -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">图片（Emoji）</label>
              <input
                v-model="form.image"
                placeholder="如：🎱 🔧 🧤"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p class="text-xs text-gray-400 mt-1">输入emoji作为产品图片</p>
            </div>
            <!-- 子分类 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">子分类</label>
              <input
                v-model="form.sub_category"
                placeholder="如：小头杆、皮头、手套"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <!-- 成本价 -->
            <div v-if="canSeeCost">
              <label class="block text-sm font-medium text-gray-700 mb-1">成本价（元）</label>
              <input
                v-model.number="form.cost_price"
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <!-- 零售价 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">建议零售价（元）</label>
              <input
                v-model.number="form.retail_price"
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <!-- 单位 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">单位</label>
              <input
                v-model="form.unit"
                placeholder="个"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <!-- 状态 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <select v-model="form.status" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <option value="active">上架中</option>
                <option value="inactive">已下架</option>
              </select>
            </div>
          </div>

          <!-- 提交 -->
          <div class="flex gap-3 pt-2">
            <button
              type="button"
              @click="showModal = false"
              class="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
            >取消</button>
            <button
              type="submit"
              :disabled="submitting"
              class="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >{{ submitting ? '提交中…' : (editingProduct ? '保存修改' : '添加产品') }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 赠品选择弹窗（套装管理） -->
    <GiftSelector
      v-if="showGiftModal"
      :mainProductId="bundleTarget.product_id"
      :mainProductName="bundleTarget.name"
      :mainCostPrice="Number(bundleTarget.cost_price) || 0"
      :existingGifts="bundleTarget.existingGifts || []"
      @confirm="onBundleConfirmed"
      @close="showGiftModal = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { usePermission } from '../composables/usePermission'
import { useProductStore } from '../stores/products'
import { formatMoney, PRODUCT_ITEM_CATEGORIES, toast, debounce } from '../lib/utils'
import GiftSelector from '../components/GiftSelector.vue'

const authStore = useAuthStore()
const productStore = useProductStore()
const { canDelete, canSeeCost, loadRole } = usePermission()

const canEdit = computed(() => ['admin', 'finance', 'manager'].includes(authStore.profile?.role))
const brands = ref([])

const summary = reactive({ total: 0, cue: 0, accessory: 0, table: 0 })

const filters = reactive({
  keyword: '',
  category: '',
  brand: '',
  status: '',
})

const debouncedLoad = debounce(() => loadProducts(), 300)
watch(() => [filters.category, filters.brand, filters.status], () => debouncedLoad())

async function loadSummary() {
  try {
    const { data } = await supabase.from('products').select('category').eq('status', 'active')
    const list = data || []
    summary.total = list.length
    summary.cue = list.filter(p => ['cue', 'shaft'].includes(p.category)).length
    summary.accessory = list.filter(p => ['tip', 'accessory', 'chalk', 'glue', 'maintenance'].includes(p.category)).length
    summary.table = list.filter(p => ['table'].includes(p.category)).length
  } catch (e) {
    console.error('加载统计失败:', e)
  }
}

async function loadProducts() {
  await productStore.fetchProducts({
    keyword: filters.keyword || undefined,
    category: filters.category || undefined,
    brand: filters.brand || undefined,
    status: filters.status || undefined,
  })
  // 动态获取所有品牌
  const { data } = await supabase.from('products').select('brand').not('brand', 'is', null).order('brand')
  if (data) {
    brands.value = [...new Set(data.map(p => p.brand).filter(Boolean))].sort()
  }
}

// Modal
const showModal = ref(false)
const editingProduct = ref(null)
const submitting = ref(false)

const defaultForm = () => ({
  name: '',
  category: '',
  brand: '',
  cost_price: 0,
  retail_price: null,
  unit: '个',
  status: 'active',
  image: '',
  sub_category: '',
})

const form = reactive(defaultForm())

function openModal(product = null) {
  editingProduct.value = product
  if (product) {
    Object.assign(form, {
      name: product.name || '',
      category: product.category || '',
      brand: product.brand || '',
      cost_price: product.cost_price ?? 0,
      retail_price: product.retail_price ?? null,
      unit: product.unit || '个',
      status: product.status || 'active',
      image: product.image || '',
      sub_category: product.sub_category || '',
    })
  } else {
    Object.assign(form, defaultForm())
  }
  showModal.value = true
}

async function handleSubmit() {
  submitting.value = true
  try {
    const payload = {
      name: form.name,
      category: form.category || null,
      brand: form.brand || null,
      cost_price: form.cost_price || 0,
      retail_price: form.retail_price || null,
      unit: form.unit || '个',
      status: form.status,
      image: form.image || '',
      sub_category: form.sub_category || '',
    }

    if (editingProduct.value) {
      await productStore.updateProduct(editingProduct.value.id, payload)
      toast('产品已更新', 'success')
    } else {
      await productStore.createProduct(payload)
      toast('产品已添加', 'success')
    }

    showModal.value = false
    loadProducts()
    loadSummary()
  } catch (e) {
    console.error(e)
    toast(e.message || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

async function handleDelete(product) {
  if (!confirm(`确定要删除产品「${product.name}」吗？`)) return
  try {
    await productStore.deleteProduct(product.id)
    toast('产品已删除', 'success')
    loadProducts()
    loadSummary()
  } catch (e) {
    toast(e.message || '删除失败', 'error')
  }
}

// ========== 套装管理 ==========
const showGiftModal = ref(false)
const bundleTarget = ref({}) // 当前操作套装的产品
const bundleGiftCount = ref({}) // 产品ID → 赠品数量

/** 打开套装管理弹窗 */
async function openBundleModal(product) {
  let existingGifts = []
  if (product.id) {
    try {
      const bundle = await productStore.fetchBundleForProduct(product.id)
      if (bundle && bundle.gifts && bundle.gifts.length > 0) {
        existingGifts = bundle.gifts
      }
    } catch (e) {
      // 首次配置，静默
    }
  }
  bundleTarget.value = {
    product_id: product.id,
    name: product.name,
    cost_price: product.cost_price,
    existingGifts,
  }
  showGiftModal.value = true
}

/** 套装确认回调 */
async function onBundleConfirmed({ gifts, saveAsDefault }) {
  if (gifts.length === 0) return
  try {
    await productStore.saveBundle(bundleTarget.value.product_id, gifts, null, authStore.user?.id)
    toast(`套装已保存（${gifts.length} 个赠品）`, 'success')
    showGiftModal.value = false
    loadProducts()
    loadBundleCounts()
  } catch (e) {
    console.error('保存套装失败:', e)
    toast('保存套装失败: ' + e.message, 'error')
  }
}

/** 加载所有产品的套装赠品数量 */
async function loadBundleCounts() {
  try {
    const { data, error } = await supabase
      .from('product_bundle_items')
      .select('bundle_id, product_id')
    if (error) throw error

    // bundle_id → main_product_id 的映射
    const bundleIds = [...new Set((data || []).map(d => d.bundle_id))]
    if (bundleIds.length === 0) return

    const { data: bundles } = await supabase
      .from('product_bundles')
      .select('id, main_product_id')
      .in('id', bundleIds)
    if (!bundles) return

    const bundleToMain = {}
    bundles.forEach(b => { bundleToMain[b.id] = b.main_product_id })

    const counts = {}
    ;(data || []).forEach(d => {
      const mainId = bundleToMain[d.bundle_id]
      if (mainId) counts[mainId] = (counts[mainId] || 0) + 1
    })
    bundleGiftCount.value = counts
  } catch (e) {
    console.error('加载套装数量失败:', e)
  }
}

onMounted(async () => {
  loadRole()
  await Promise.all([loadProducts(), loadSummary(), loadBundleCounts()])
})
</script>
