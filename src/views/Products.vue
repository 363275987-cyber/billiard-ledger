<template>
  <div>
    <!-- 顶部标题 -->
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold text-gray-800">📦 产品库</h1>
      <button v-if="canEdit" @click="openProductModal()" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition cursor-pointer">+ 添加产品</button>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <div class="bg-white rounded-xl border border-gray-100 p-3">
        <div class="text-xs text-gray-400">📦 产品总数</div>
        <div class="text-xl font-bold text-gray-800">{{ summary.total }}</div>
      </div>
      <div class="bg-white rounded-xl border border-gray-100 p-3">
        <div class="text-xs text-gray-400">🎱 球杆/前支</div>
        <div class="text-xl font-bold text-blue-600">{{ summary.cue }}</div>
      </div>
      <div class="bg-white rounded-xl border border-gray-100 p-3">
        <div class="text-xs text-gray-400">🔧 配件/耗材</div>
        <div class="text-xl font-bold text-purple-600">{{ summary.accessory }}</div>
      </div>
      <div class="bg-white rounded-xl border border-gray-100 p-3">
        <div class="text-xs text-gray-400">📦 套装/福袋</div>
        <div class="text-xl font-bold text-orange-500">{{ summary.bundle }}</div>
      </div>
    </div>

    <!-- 搜索过滤 -->
    <div class="bg-white rounded-xl border border-gray-100 p-3 mb-4">
      <!-- Tab 切换 -->
      <div class="flex gap-1 mb-3 border-b border-gray-100 pb-2">
        <button @click="activeTab='single'; loadProducts()" :class="activeTab==='single' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'" class="px-4 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer">🎱 单品 <span class="text-xs opacity-70">{{ summary.total - summary.bundle }}</span></button>
        <button @click="activeTab='bundle'; loadProducts()" :class="activeTab==='bundle' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'" class="px-4 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer">📦 套装 <span class="text-xs opacity-70">{{ summary.bundle }}</span></button>
      </div>
      <!-- 筛选行 -->
      <div class="flex gap-2 items-center flex-wrap">
        <input v-model="filters.keyword" placeholder="搜索名称/品牌/SKU" class="px-3 py-2 border border-gray-200 rounded-lg text-sm flex-1 min-w-[140px] outline-none focus:ring-2 focus:ring-blue-500" @keyup.enter="loadProducts" />
        <select v-model="filters.category" @change="loadProducts" class="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
          <option value="">全部分类</option>
          <option v-for="(label, key) in PRODUCT_ITEM_CATEGORIES" :key="key" :value="key">{{ label }}</option>
        </select>
        <select v-model="filters.brand" @change="loadProducts" class="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
          <option value="">全部品牌</option>
          <option v-for="b in brands" :key="b" :value="b">{{ b }}</option>
        </select>
        <button @click="loadProducts" class="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition cursor-pointer">搜索</button>
        <span class="text-xs text-gray-400">{{ productStore.pagination.total }} 个</span>
      </div>
    </div>

    <!-- 产品卡片列表 -->
    <div v-if="productStore.loading" class="py-16 text-center text-gray-400 text-sm">加载中…</div>
    <div v-else-if="productStore.products.length === 0" class="bg-white rounded-xl border border-gray-100 py-16 text-center text-gray-400">
      <div class="text-4xl mb-2">📦</div>
      <div>暂无产品</div>
    </div>
    <div v-else class="grid gap-3">
      <div v-for="p in productStore.products" :key="p.id" class="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <!-- 卡片头部 -->
        <div class="p-4 flex items-start gap-3 cursor-pointer" @click="toggleExpand(p.id)">
          <span class="text-2xl shrink-0 mt-0.5">{{ p.image || '📦' }}</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-mono text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">{{ firstSkuCode(p) }}</span>
              <span class="font-medium text-gray-800 truncate">{{ p.name }}</span>
              <span :class="typeColor(p.product_type)" class="text-xs px-1.5 py-0.5 rounded">{{ typeLabel(p.product_type) }}</span>
              <span :class="p.status === 'active' ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-100'" class="text-xs px-1.5 py-0.5 rounded">{{ p.status === 'active' ? '上架' : '下架' }}</span>
            </div>
            <div class="flex items-center gap-3 mt-1 text-xs text-gray-400">
              <span v-if="p.brand">{{ p.brand }}</span>
              <span v-if="p.category">{{ PRODUCT_ITEM_CATEGORIES[p.category] || p.category }}</span>
              <span class="text-red-500">成本: ¥{{ p.cost_price || 0 }}</span>
              <span class="text-gray-700 font-medium">零售: ¥{{ p.retail_price || '未定价' }}</span>
            </div>
          </div>
          <div class="shrink-0 flex items-center gap-1">
            <span v-if="expandedIds[p.id] === undefined && skuCount(p.id) > 0" class="text-xs text-gray-400">{{ skuCount(p.id) }}个规格</span>
            <span class="text-gray-300 transition-transform text-sm" :class="{ 'rotate-180': expandedIds[p.id] }">▼</span>
          </div>
        </div>

        <!-- 展开内容：SKU列表 或 套装明细 -->
        <div v-if="expandedIds[p.id]" class="border-t border-gray-50 bg-gray-50/50">
          <!-- 单品/课程：显示 SKU 列表 -->
          <div v-if="p.product_type !== 'bundle' && p.product_type !== 'gift_bag'">
            <div class="p-3">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-medium text-gray-500">SKU 规格列表</span>
                <button v-if="canEdit" @click.stop="openSkuModal(p)" class="text-xs text-blue-600 hover:text-blue-800 cursor-pointer">+ 添加SKU</button>
              </div>
              <div v-if="!skusMap[p.id] || skusMap[p.id].length === 0" class="text-xs text-gray-400 text-center py-4">暂无SKU，请点击添加</div>
              <div v-else class="space-y-2">
                <div v-for="s in skusMap[p.id]" :key="s.id" class="bg-white rounded-lg border border-gray-100 p-3">
                  <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-sm font-medium text-gray-700">{{ s.sku_code || '未编码' }}</span>
                        <span v-for="spec in (s.specs || [])" :key="spec.name" class="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{{ spec.name }}:{{ spec.value }}</span>
                      </div>
                      <div class="flex items-center gap-4 mt-1 text-xs text-gray-400">
                        <span v-if="canSeeCost">成本: <span class="text-red-500">¥{{ s.cost_price || 0 }}</span></span>
                        <span>零售: <span class="text-gray-600">¥{{ s.retail_price || 0 }}</span></span>
                        <span>库存: <span :class="(s.stock - (s.reserved||0)) < 5 ? 'text-red-500 font-medium' : 'text-gray-600'">{{ s.stock || 0 }}</span></span>
                        <span v-if="s.reserved">预留: {{ s.reserved }}</span>
                        <span v-if="s.barcode" class="text-gray-300">📦{{ s.barcode }}</span>
                      </div>
                    </div>
                    <div v-if="canEdit" class="shrink-0 flex gap-1">
                      <button @click.stop="openSkuModal(p, s)" class="text-blue-500 hover:text-blue-700 text-xs px-2 py-1 cursor-pointer">编辑</button>
                      <button @click.stop="handleDeleteSku(p, s)" class="text-red-400 hover:text-red-600 text-xs px-2 py-1 cursor-pointer">删除</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 套装/福袋：显示包含的子商品 -->
          <div v-else>
            <div class="p-3">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-medium text-gray-500">包含子商品</span>
                <button v-if="canEdit" @click.stop="openBundleEditModal(p)" class="text-xs text-blue-600 hover:text-blue-800 cursor-pointer">编辑套装</button>
              </div>
              <div v-if="!bundleItemsMap[p.id] || bundleItemsMap[p.id].length === 0" class="text-xs text-gray-400 text-center py-4">暂无子商品</div>
              <div v-else class="space-y-1">
                <div v-for="item in bundleItemsMap[p.id]" :key="item.id" class="flex items-center gap-2 text-sm bg-white rounded-lg border border-gray-100 px-3 py-2">
                  <span class="text-gray-700 flex-1 truncate">{{ getBundleItemName(item) }}</span>
                  <span class="text-gray-400 text-xs">×{{ item.quantity }}</span>
                  <span v-if="canSeeCost && getSkuCost(item)" class="text-xs text-red-400">¥{{ getSkuCost(item) }}</span>
                </div>
                <div v-if="canSeeCost" class="text-xs text-right text-gray-400 pt-1">
                  子商品总成本: ¥{{ bundleTotalCost(p.id) }}
                  <span v-if="p.retail_price" class="ml-2">套装价: ¥{{ p.retail_price }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 卡片底部操作栏 -->
        <div v-if="canEdit || canDelete" class="border-t border-gray-50 px-4 py-2 flex items-center justify-end gap-1 bg-white">
          <button v-if="canEdit" @click.stop="openProductModal(p)" class="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 cursor-pointer">编辑</button>
          <button v-if="canEdit && p.product_type !== 'bundle' && p.product_type !== 'gift_bag'" @click.stop="openBundleModal(p)" class="text-xs text-gray-500 hover:text-purple-600 px-2 py-1 rounded hover:bg-purple-50 cursor-pointer" title="赠品管理">🎁赠品</button>
          <button v-if="canDelete" @click.stop="handleDeleteProduct(p)" class="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 cursor-pointer">删除</button>
        </div>
      </div>
    </div>

    <!-- ============ 弹窗：新建/编辑产品(SPU) ============ -->
    <div v-if="showProductModal" class="fixed inset-0 bg-black/30 flex items-center justify-center z-50" @click.self="showProductModal = false">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 class="font-bold text-gray-800">{{ editingProduct ? '编辑产品' : '添加产品' }}</h2>
          <button @click="showProductModal = false" class="text-gray-400 hover:text-gray-600 text-xl cursor-pointer">&times;</button>
        </div>
        <form @submit.prevent="handleSaveProduct" class="p-5 space-y-3 overflow-y-auto flex-1">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">产品名称 <span class="text-red-400">*</span></label>
            <input v-model="pform.name" required placeholder="如：国熙-霜华-小头杆" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">产品类型</label>
              <select v-model="pform.product_type" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
                <option value="single">单品</option>
                <option value="course">课程</option>
                <option value="bundle">套装</option>
                <option value="gift_bag">福袋</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">分类</label>
              <select v-model="pform.category" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
                <option value="">请选择</option>
                <option v-for="(label, key) in PRODUCT_ITEM_CATEGORIES" :key="key" :value="key">{{ label }}</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">品牌</label>
              <input v-model="pform.brand" placeholder="如：国熙" list="brand-list" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              <datalist id="brand-list"><option v-for="b in brands" :key="b" :value="b" /></datalist>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">子分类</label>
              <input v-model="pform.sub_category" placeholder="如：小头杆" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div v-if="canSeeCost">
              <label class="block text-sm font-medium text-gray-700 mb-1">成本价</label>
              <input v-model.number="pform.cost_price" type="number" placeholder="0" min="0" step="0.01" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">零售价</label>
              <input v-model.number="pform.retail_price" type="number" placeholder="0" min="0" step="0.01" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">SPU编码</label>
              <input v-model="pform.spu_code" placeholder="自动生成" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">单位</label>
              <input v-model="pform.unit" placeholder="个" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">图片(Emoji)</label>
              <input v-model="pform.image" placeholder="🎱" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div class="flex gap-3 pt-2">
            <button type="button" @click="showProductModal = false" class="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer">取消</button>
            <button type="submit" :disabled="saving" class="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 cursor-pointer">{{ saving ? '...' : (editingProduct ? '保存' : '添加') }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- ============ 弹窗：新建/编辑 SKU ============ -->
    <div v-if="showSkuModal" class="fixed inset-0 bg-black/30 flex items-center justify-center z-50" @click.self="showSkuModal = false">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 class="font-bold text-gray-800">{{ editingSku ? '编辑SKU' : '添加SKU' }}</h2>
          <span class="text-xs text-gray-400">{{ skuTargetProduct?.name }}</span>
          <button @click="showSkuModal = false" class="text-gray-400 hover:text-gray-600 text-xl cursor-pointer">&times;</button>
        </div>
        <form @submit.prevent="handleSaveSku" class="p-5 space-y-3 overflow-y-auto flex-1">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">SKU编码 <span class="text-red-400">*</span></label>
            <input v-model="sform.sku_code" required placeholder="如：ST-01" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <!-- 规格组 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">规格</label>
            <div class="space-y-2">
              <div v-for="(spec, idx) in sform.specs" :key="idx" class="flex items-center gap-2">
                <input v-model="spec.name" placeholder="颜色" class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm outline-none" />
                <input v-model="spec.value" placeholder="黑色" class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm outline-none" />
                <button type="button" @click="sform.specs.splice(idx, 1)" v-if="sform.specs.length > 1" class="text-red-400 hover:text-red-600 text-sm cursor-pointer">✕</button>
              </div>
            </div>
            <button type="button" @click="sform.specs.push({ name: '', value: '' })" class="text-xs text-blue-600 hover:text-blue-800 mt-1 cursor-pointer">+ 添加规格</button>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div v-if="canSeeCost">
              <label class="block text-sm font-medium text-gray-700 mb-1">成本价</label>
              <input v-model.number="sform.cost_price" type="number" placeholder="0" min="0" step="0.01" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">零售价</label>
              <input v-model.number="sform.retail_price" type="number" placeholder="0" min="0" step="0.01" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">库存数量</label>
              <input v-model.number="sform.stock" type="number" placeholder="0" min="0" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">预留数量</label>
              <input v-model.number="sform.reserved" type="number" placeholder="0" min="0" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">条形码（选填）</label>
            <input v-model="sform.barcode" placeholder="如：6901234567890" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <!-- 平台绑定 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">平台绑定（选填）</label>
            <div class="space-y-2">
              <div v-for="(pb, idx) in sform.platform_bindings" :key="idx" class="flex items-center gap-2">
                <select v-model="pb.platform" class="px-2 py-1.5 border border-gray-200 rounded text-sm outline-none">
                  <option value="">选择平台</option>
                  <option value="douyin">抖音</option>
                  <option value="kuaishou">快手</option>
                  <option value="taobao">淘宝</option>
                  <option value="wechat">微信</option>
                  <option value="xiaohongshu">小红书</option>
                </select>
                <input v-model="pb.outer_sku_id" placeholder="平台SKU ID" class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm outline-none" />
                <button type="button" @click="sform.platform_bindings.splice(idx, 1)" v-if="sform.platform_bindings.length > 0" class="text-red-400 hover:text-red-600 text-sm cursor-pointer">✕</button>
              </div>
            </div>
            <button type="button" @click="sform.platform_bindings.push({ platform: '', outer_sku_id: '', name: '' })" class="text-xs text-blue-600 hover:text-blue-800 mt-1 cursor-pointer">+ 添加平台</button>
          </div>
          <div class="flex gap-3 pt-2">
            <button type="button" @click="showSkuModal = false" class="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer">取消</button>
            <button type="submit" :disabled="saving" class="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 cursor-pointer">{{ saving ? '...' : (editingSku ? '保存' : '添加') }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- ============ 弹窗：编辑套装(子商品) ============ -->
    <div v-if="showBundleEditModal" class="fixed inset-0 bg-black/30 flex items-center justify-center z-50" @click.self="showBundleEditModal = false">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 class="font-bold text-gray-800">编辑套装</h2>
          <span class="text-xs text-gray-400">{{ bundleEditTarget?.name }}</span>
          <button @click="showBundleEditModal = false" class="text-gray-400 hover:text-gray-600 text-xl cursor-pointer">&times;</button>
        </div>
        <div class="p-5 space-y-3 overflow-y-auto flex-1">
          <!-- 添加子商品 -->
          <div class="flex gap-2">
            <input v-model="bundleSearch" placeholder="搜索产品/SKU名称" class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" @keyup.enter="searchForBundle" />
            <button @click="searchForBundle" class="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 cursor-pointer">搜索</button>
          </div>
          <!-- 搜索结果 -->
          <div v-if="bundleSearchResults.length > 0" class="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
            <div v-for="r in bundleSearchResults" :key="r.sku?.id || r.id" class="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between" @click="addBundleItem(r)">
              <span class="text-sm text-gray-700">{{ r.name }}<span v-if="r.sku?.sku_code" class="text-gray-400 ml-1">({{ r.sku.sku_code }})</span></span>
              <span class="text-xs text-blue-600">添加</span>
            </div>
          </div>
          <!-- 已选子商品 -->
          <div>
            <div class="text-sm font-medium text-gray-600 mb-2">已选子商品</div>
            <div v-if="bundleEditItems.length === 0" class="text-xs text-gray-400 text-center py-4">请搜索并添加子商品</div>
            <div v-else class="space-y-2">
              <div v-for="(item, idx) in bundleEditItems" :key="idx" class="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <span class="text-sm text-gray-700 flex-1 truncate">{{ item.product_name }}<span v-if="item.sku_code" class="text-gray-400 ml-1">({{ item.sku_code }})</span></span>
                <div class="flex items-center gap-1">
                  <button @click="item.quantity = Math.max(1, item.quantity - 1)" class="w-6 h-6 rounded bg-gray-200 text-gray-600 text-xs flex items-center justify-center cursor-pointer">-</button>
                  <span class="text-sm w-6 text-center">{{ item.quantity }}</span>
                  <button @click="item.quantity++" class="w-6 h-6 rounded bg-gray-200 text-gray-600 text-xs flex items-center justify-center cursor-pointer">+</button>
                </div>
                <button @click="bundleEditItems.splice(idx, 1)" class="text-red-400 hover:text-red-600 text-sm cursor-pointer">✕</button>
              </div>
            </div>
          </div>
          <div v-if="canSeeCost && bundleEditItems.length > 0" class="text-xs text-right text-gray-400">
            子商品总成本: ¥{{ bundleEditTotalCost }}
          </div>
        </div>
        <div class="px-5 py-3 border-t border-gray-100 flex gap-3 shrink-0">
          <button @click="showBundleEditModal = false" class="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer">取消</button>
          <button @click="handleSaveBundleEdit" :disabled="saving" class="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 cursor-pointer">{{ saving ? '...' : '保存套装' }}</button>
        </div>
      </div>
    </div>

    <!-- ============ 赠品选择弹窗（复用现有组件） ============ -->
    <GiftSelector v-if="showGiftModal" :mainProductId="giftTarget.productId" :mainProductName="giftTarget.name" :mainCostPrice="Number(giftTarget.costPrice) || 0" :existingGifts="giftTarget.existingGifts || []" @confirm="onGiftConfirmed" @close="showGiftModal = false" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { usePermission } from '../composables/usePermission'
import { useProductStore } from '../stores/products'
import { formatMoney, PRODUCT_ITEM_CATEGORIES, toast } from '../lib/utils'
import GiftSelector from '../components/GiftSelector.vue'

const authStore = useAuthStore()
const productStore = useProductStore()
const { canDelete, canSeeCost, loadRole } = usePermission()
const canEdit = computed(() => ['admin', 'finance', 'manager'].includes(authStore.profile?.role))

const brands = ref([])
const summary = reactive({ total: 0, cue: 0, accessory: 0, bundle: 0 })
const filters = reactive({ keyword: '', category: '', brand: '' })
const activeTab = ref('single')
const expandedIds = reactive({})      // 展开的卡片
const skusMap = reactive({})           // productId → sku[]
const bundleItemsMap = reactive({})    // bundleId → item[]
const saving = ref(false)

// ========== 工具函数 ==========
const typeLabel = (t) => ({ single: '单品', course: '课程', bundle: '套装', gift_bag: '福袋' })[t] || '单品'
const typeColor = (t) => ({ single: 'bg-blue-50 text-blue-600', course: 'bg-purple-50 text-purple-600', bundle: 'bg-orange-50 text-orange-600', gift_bag: 'bg-red-50 text-red-600' })[t] || 'bg-gray-50 text-gray-500'
const skuCount = (pid) => (skusMap[pid] || []).length

// 获取产品第一个SKU的编码
function firstSkuCode(p) {
  const skus = skusMap[p.id] || []
  return skus.length > 0 ? (skus[0].sku_code || '未编码') : '未编码'
}

function getBundleItemName(item) {
  const ps = item.product_skus
  if (!ps) return '未知'
  const pname = ps.products?.name || '未知'
  const code = ps.sku_code || ''
  const specs = (ps.specs || []).map(s => s.value).join('/')
  return [pname, code, specs].filter(Boolean).join(' - ')
}

function getSkuCost(item) {
  return item.product_skus?.cost_price ? Number(item.product_skus.cost_price) : 0
}

function bundleTotalCost(pid) {
  return (bundleItemsMap[pid] || []).reduce((sum, item) => sum + getSkuCost(item) * item.quantity, 0)
}

// ========== 加载数据 ==========
async function loadProducts() {
  await productStore.fetchProducts({
    keyword: filters.keyword || undefined,
    product_type: activeTab.value,
    category: filters.category || undefined,
    brand: filters.brand || undefined,
    page: 1,
    pageSize: 1000,
  })
  // 批量加载所有 SKU（一次查询）
  const { data: allSkus } = await supabase.from('product_skus').select('*').order('sku_code')
  if (allSkus) {
    for (const s of allSkus) {
      if (!skusMap[s.product_id]) skusMap[s.product_id] = []
      skusMap[s.product_id].push(s)
    }
  }
  // 批量加载所有套装明细（一次查询）
  const bundleIds = productStore.products.filter(p => p.product_type === 'bundle' || p.product_type === 'gift_bag').map(p => p.id)
  if (bundleIds.length > 0) {
    const { data: allItems } = await supabase.from('bundle_items').select('id, quantity, sort_order, sku_id, bundle_id, product_skus:sku_id(id, sku_code, specs, cost_price, retail_price, stock, products:product_id(id, name))').in('bundle_id', bundleIds).order('sort_order')
    if (allItems) {
      for (const item of allItems) {
        const bid = item.bundle_id
        if (!bundleItemsMap[bid]) bundleItemsMap[bid] = []
        bundleItemsMap[bid].push(item)
      }
    }
  }
  // 品牌列表
  const { data } = await supabase.from('products').select('brand').not('brand', 'is', null).order('brand')
  if (data) brands.value = [...new Set(data.map(p => p.brand).filter(Boolean))].sort()
}

async function loadSkus(pid) {
  try {
    const { data } = await supabase.from('product_skus').select('*').eq('product_id', pid).order('sku_code')
    skusMap[pid] = data || []
  } catch (e) { skusMap[pid] = [] }
}

async function loadBundleItems(bid) {
  try {
    const { data } = await supabase.from('bundle_items').select('id, quantity, sort_order, sku_id, product_skus:sku_id(id, sku_code, specs, cost_price, retail_price, stock, products:product_id(id, name))').eq('bundle_id', bid).order('sort_order')
    bundleItemsMap[bid] = data || []
  } catch (e) { bundleItemsMap[bid] = [] }
}

async function loadSummary() {
  try {
    const { data } = await supabase.from('products').select('category, product_type').eq('status', 'active')
    const list = data || []
    summary.total = list.length
    summary.cue = list.filter(p => ['cue', 'shaft'].includes(p.category)).length
    summary.accessory = list.filter(p => ['tip', 'accessory', 'chalk', 'glue', 'maintenance', 'glove'].includes(p.category)).length
    summary.bundle = list.filter(p => ['bundle', 'gift_bag'].includes(p.product_type)).length
  } catch (e) {}
}

function toggleExpand(pid) {
  if (expandedIds[pid]) {
    delete expandedIds[pid]
  } else {
    expandedIds[pid] = true
  }
}

// ========== 产品(SPU) CRUD ==========
const showProductModal = ref(false)
const editingProduct = ref(null)
const pform = reactive({ name: '', product_type: 'single', category: '', brand: '', sub_category: '', cost_price: 0, retail_price: null, spu_code: '', unit: '个', image: '', status: 'active' })

function openProductModal(p = null) {
  editingProduct.value = p
  if (p) {
    Object.assign(pform, { name: p.name, product_type: p.product_type || 'single', category: p.category || '', brand: p.brand || '', sub_category: p.sub_category || '', cost_price: p.cost_price ?? 0, retail_price: p.retail_price ?? null, spu_code: p.spu_code || '', unit: p.unit || '个', image: p.image || '', status: p.status || 'active' })
  } else {
    Object.assign(pform, { name: '', product_type: 'single', category: '', brand: '', sub_category: '', cost_price: 0, retail_price: null, spu_code: '', unit: '个', image: '', status: 'active' })
  }
  showProductModal.value = true
}

async function handleSaveProduct() {
  saving.value = true
  try {
    const payload = { name: pform.name, product_type: pform.product_type || 'single', category: pform.category || null, brand: pform.brand || null, sub_category: pform.sub_category || '', cost_price: pform.cost_price || 0, retail_price: pform.retail_price || null, spu_code: pform.spu_code || null, unit: pform.unit || '个', image: pform.image || '', status: pform.status }
    if (editingProduct.value) {
      await productStore.updateProduct(editingProduct.value.id, payload)
      toast('已更新', 'success')
    } else {
      await productStore.createProduct(payload)
      toast('已添加', 'success')
    }
    showProductModal.value = false
    await loadProducts()
    loadSummary()
  } catch (e) {
    toast(e.message || '操作失败', 'error')
  } finally {
    saving.value = false
  }
}

async function handleDeleteProduct(p) {
  const skus = skusMap[p.id] || []
  const msg = skus.length > 0 ? `确定删除「${p.name}」及其 ${skus.length} 个SKU？` : `确定删除「${p.name}」？`
  if (!confirm(msg)) return
  try {
    await productStore.deleteProduct(p.id)
    toast('已删除', 'success')
    delete expandedIds[p.id]
    delete skusMap[p.id]
    delete bundleItemsMap[p.id]
    await loadProducts()
    loadSummary()
  } catch (e) { toast(e.message, 'error') }
}

// ========== SKU CRUD ==========
const showSkuModal = ref(false)
const editingSku = ref(null)
const skuTargetProduct = ref(null)
const sform = reactive({ sku_code: '', specs: [{ name: '', value: '' }], cost_price: 0, retail_price: 0, stock: 0, reserved: 0, barcode: '', platform_bindings: [] })

function openSkuModal(product, sku = null) {
  skuTargetProduct.value = product
  editingSku.value = sku
  if (sku) {
    Object.assign(sform, { sku_code: sku.sku_code || '', specs: sku.specs?.length > 0 ? JSON.parse(JSON.stringify(sku.specs)) : [{ name: '', value: '' }], cost_price: sku.cost_price || 0, retail_price: sku.retail_price || 0, stock: sku.stock || 0, reserved: sku.reserved || 0, barcode: sku.barcode || '', platform_bindings: sku.platform_bindings?.length > 0 ? JSON.parse(JSON.stringify(sku.platform_bindings)) : [] })
  } else {
    Object.assign(sform, { sku_code: '', specs: [{ name: '', value: '' }], cost_price: 0, retail_price: 0, stock: 0, reserved: 0, barcode: '', platform_bindings: [] })
  }
  showSkuModal.value = true
}

async function handleSaveSku() {
  if (!skuTargetProduct.value) return
  saving.value = true
  try {
    // 过滤空规格
    const validSpecs = sform.specs.filter(s => s.name && s.value)
    const validPb = sform.platform_bindings.filter(p => p.platform && p.outer_sku_id)
    const payload = { product_id: skuTargetProduct.value.id, sku_code: sform.sku_code, specs: validSpecs.length > 0 ? validSpecs : [], cost_price: sform.cost_price || 0, retail_price: sform.retail_price || 0, stock: sform.stock || 0, reserved: sform.reserved || 0, barcode: sform.barcode || '', platform_bindings: validPb }

    if (editingSku.value) {
      await productStore.updateSku(editingSku.value.id, payload)
      toast('SKU已更新', 'success')
    } else {
      await productStore.createSku(payload)
      toast('SKU已添加', 'success')
    }
    showSkuModal.value = false
    await loadSkus(skuTargetProduct.value.id)
  } catch (e) {
    toast(e.message || '操作失败', 'error')
  } finally {
    saving.value = false
  }
}

async function handleDeleteSku(product, sku) {
  if (!confirm(`确定删除SKU「${sku.sku_code}」？`)) return
  try {
    await productStore.deleteSku(sku.id)
    toast('已删除', 'success')
    await loadSkus(product.id)
  } catch (e) { toast(e.message, 'error') }
}

// ========== 套装明细(bundle_items) ==========
const showBundleEditModal = ref(false)
const bundleEditTarget = ref(null)
const bundleEditItems = ref([])
const bundleSearch = ref('')
const bundleSearchResults = ref([])

function openBundleEditModal(p) {
  bundleEditTarget.value = p
  bundleEditItems.value = (bundleItemsMap[p.id] || []).map(item => ({ sku_id: item.sku_id, product_name: getBundleItemName(item), sku_code: item.product_skus?.sku_code || '', quantity: item.quantity }))
  bundleSearch.value = ''
  bundleSearchResults.value = []
  showBundleEditModal.value = true
}

const bundleEditTotalCost = computed(() => bundleEditItems.value.reduce((sum, item) => {
  // 从缓存中找成本
  const bi = (bundleItemsMap[bundleEditTarget.value?.id] || []).find(b => b.sku_id === item.sku_id)
  return sum + (bi ? getSkuCost(bi) : 0) * item.quantity
}, 0))

async function searchForBundle() {
  if (!bundleSearch.value.trim()) return
  try {
    // 搜索 products + product_skus
    const { data } = await supabase.from('product_skus').select('id, sku_code, specs, cost_price, products:product_id(id, name)').ilike('sku_code', `%${bundleSearch.value}%`).limit(10)
    bundleSearchResults.value = (data || []).map(r => ({ sku: r, name: r.products?.name || '', id: r.id }))
    if (bundleSearchResults.value.length === 0) {
      const { data: p2 } = await supabase.from('product_skus').select('id, sku_code, specs, cost_price, products:product_id(id, name)').ilike('products.name', `%${bundleSearch.value}%`).limit(10)
      bundleSearchResults.value = (p2 || []).map(r => ({ sku: r, name: r.products?.name || '', id: r.id }))
    }
  } catch (e) { bundleSearchResults.value = [] }
}

function addBundleItem(r) {
  if (bundleEditItems.value.find(i => i.sku_id === r.sku_id || r.id)) {
    toast('已添加', 'warning')
    return
  }
  bundleEditItems.value.push({ sku_id: r.sku_id || r.id, product_name: r.name, sku_code: r.sku?.sku_code || '', quantity: 1 })
  bundleSearchResults.value = []
  bundleSearch.value = ''
}

async function handleSaveBundleEdit() {
  if (!bundleEditTarget.value) return
  saving.value = true
  try {
    const items = bundleEditItems.value.map((item, i) => ({ sku_id: item.sku_id, quantity: item.quantity, sort_order: i }))
    await productStore.saveBundleItems(bundleEditTarget.value.id, items)
    await loadBundleItems(bundleEditTarget.value.id)
    showBundleEditModal.value = false
    toast('套装已保存', 'success')
  } catch (e) {
    toast(e.message, 'error')
  } finally {
    saving.value = false
  }
}

// ========== 赠品（product_bundles，保留） ==========
const showGiftModal = ref(false)
const giftTarget = reactive({ productId: null, name: '', costPrice: 0, existingGifts: [] })

async function openBundleModal(p) {
  let existingGifts = []
  try {
    const bundle = await productStore.fetchBundleForProduct(p.id)
    if (bundle?.gifts?.length > 0) existingGifts = bundle.gifts
  } catch (e) {}
  giftTarget.productId = p.id
  giftTarget.name = p.name
  giftTarget.costPrice = p.cost_price
  giftTarget.existingGifts = existingGifts
  showGiftModal.value = true
}

async function onGiftConfirmed({ gifts, saveAsDefault }) {
  if (gifts.length === 0) return
  try {
    await productStore.saveBundle(giftTarget.productId, gifts, null, authStore.user?.id)
    toast('赠品已保存', 'success')
    showGiftModal.value = false
  } catch (e) { toast('保存失败: ' + e.message, 'error') }
}

// ========== 初始化 ==========
onMounted(async () => {
  loadRole()
  await Promise.all([loadProducts(), loadSummary()])
})
</script>
