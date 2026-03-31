<template>
  <div>
    <!-- 顶部标题 -->
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold text-gray-800">📦 产品库</h1>
      <div class="flex gap-2">
        <button @click="exportType='single'; showExportModal=true" class="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 transition cursor-pointer">🎱 导出单品+赠品</button>
        <button @click="exportType='bundle'; showExportModal=true" class="bg-orange-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-orange-600 transition cursor-pointer">📦 导出套装+赠品</button>
        <button v-if="canEdit" @click="showImportModal=true" class="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition cursor-pointer">📥 导入</button>
        <button v-if="canEdit" @click="openProductModal()" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition cursor-pointer">+ 添加产品</button>
      </div>
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

    <!-- ============ 导出弹窗 ============ -->
    <div v-if="showExportModal" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" @click.self="showExportModal=false">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 class="font-bold text-lg text-gray-800 mb-1">{{ exportType==='bundle' ? '📦 导出套装+赠品' : '🎱 导出单品+赠品' }}</h2>
        <p class="text-xs text-gray-400 mb-4">选择要导出的数据列{{ exportType==='bundle' ? '，套装会包含子商品明细' : '，单品会包含关联赠品' }}</p>
        <div class="grid grid-cols-2 gap-2 mb-4">
          <label v-for="col in exportColumns" :key="col.key" class="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-gray-100 cursor-pointer hover:bg-gray-50">
            <input type="checkbox" v-model="col.checked" class="rounded text-blue-600" />
            <span>{{ col.label }}</span>
          </label>
        </div>
        <div class="flex justify-end gap-2">
          <button @click="showExportModal=false" class="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg cursor-pointer">取消</button>
          <button @click="doExport" class="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer">下载 Excel</button>
        </div>
      </div>
    </div>

    <!-- ============ 导入弹窗 ============ -->
    <div v-if="showImportModal" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" @click.self="showImportModal=false">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <h2 class="font-bold text-lg text-gray-800 mb-1">📥 导入产品</h2>
        <p class="text-xs text-gray-400 mb-3">上传 Excel 文件，按 SKU 编码匹配：已有则更新，没有则新建</p>

        <!-- 步骤1：上传文件 -->
        <div v-if="importStep===1" class="space-y-3">
          <div class="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-400 transition cursor-pointer" @click="$refs.importFile.click()">
            <div class="text-3xl mb-2">📄</div>
            <div class="text-sm text-gray-500">点击或拖拽 Excel 文件到此处</div>
            <div class="text-xs text-gray-400 mt-1">支持 .xlsx / .xls</div>
            <input ref="importFile" type="file" accept=".xlsx,.xls" class="hidden" @change="onImportFileSelected" />
          </div>
          <div class="flex items-center gap-3">
            <button @click="downloadSingleTemplate" class="text-xs text-blue-600 hover:text-blue-800 cursor-pointer">📥 下载单品模板</button>
            <button @click="downloadBundleTemplate" class="text-xs text-orange-600 hover:text-orange-800 cursor-pointer">📦 下载套装模板</button>
          </div>
          <div v-if="importFile" class="text-sm bg-blue-50 rounded-lg p-3 flex items-center justify-between">
            <span>📄 {{ importFile.name }}</span>
            <button @click="importFile=null" class="text-red-400 text-xs cursor-pointer">✕ 移除</button>
          </div>
          <button v-if="importFile" @click="parseImportFile" :disabled="importParsing" class="w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 cursor-pointer disabled:opacity-50">
            {{ importParsing ? '解析中...' : '下一步：预览数据' }}
          </button>
        </div>

        <!-- 步骤2：预览确认 -->
        <div v-if="importStep===2" class="space-y-3">
          <div class="text-sm text-gray-600">
            {{ importType === 'bundle' ? '📦 套装' : '🎱 单品' }}
            · <b>{{ importBundles.length || importPreview.length }}</b> 条记录
            <span class="text-green-600 ml-2">新增 {{ importNewCount }}</span>
            <span class="text-blue-600 ml-2">更新 {{ importUpdateCount }}</span>
          </div>
          <!-- 单品预览 -->
          <div v-if="importType !== 'bundle'" class="max-h-60 overflow-y-auto border border-gray-100 rounded-lg">
            <table class="w-full text-xs">
              <thead class="bg-gray-50 sticky top-0">
                <tr>
                  <th class="px-2 py-1.5 text-left">状态</th>
                  <th class="px-2 py-1.5 text-left">SKU编码</th>
                  <th class="px-2 py-1.5 text-left">产品名称</th>
                  <th class="px-2 py-1.5 text-left">分类</th>
                  <th class="px-2 py-1.5 text-right">成本价</th>
                  <th class="px-2 py-1.5 text-right">零售价</th>
                  <th class="px-2 py-1.5 text-right">库存</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in importPreview.slice(0, 100)" :key="i" class="border-t border-gray-50">
                  <td class="px-2 py-1">
                    <span v-if="row._isNew" class="text-green-600 bg-green-50 px-1 rounded">新增</span>
                    <span v-else class="text-blue-600 bg-blue-50 px-1 rounded">更新</span>
                  </td>
                  <td class="px-2 py-1 font-mono">{{ row['SKU编码'] }}</td>
                  <td class="px-2 py-1">{{ row['产品名称'] }}</td>
                  <td class="px-2 py-1">{{ row['分类'] }}</td>
                  <td class="px-2 py-1 text-right">{{ row['成本价'] ?? '' }}</td>
                  <td class="px-2 py-1 text-right">{{ row['零售价'] ?? '' }}</td>
                  <td class="px-2 py-1 text-right">{{ row['库存'] ?? '' }}</td>
                </tr>
              </tbody>
            </table>
            <div v-if="importPreview.length > 100" class="text-xs text-gray-400 text-center py-2">...还有 {{ importPreview.length - 100 }} 条</div>
          </div>
          <!-- 套装预览 -->
          <div v-else class="max-h-60 overflow-y-auto border border-gray-100 rounded-lg">
            <div v-for="(b, bi) in importBundles.slice(0, 20)" :key="bi" class="border-b border-gray-50 last:border-0">
              <div class="flex items-center gap-2 px-2 py-1.5 bg-orange-50 text-xs">
                <span v-if="b._isNew" class="text-green-600 font-bold">[新增]</span>
                <span v-else class="text-blue-600 font-bold">[更新]</span>
                <span class="font-mono font-bold">{{ b.code }}</span>
                <span>{{ b.name }}</span>
                <span class="text-gray-400 ml-auto">{{ b.items.length }} 件</span>
              </div>
              <table class="w-full text-xs">
                <tbody>
                  <tr v-for="(item, ii) in b.items" :key="ii" class="border-t border-gray-50/50">
                    <td class="px-3 py-1 text-gray-400 w-8">{{ ii+1 }}</td>
                    <td class="px-2 py-1 font-mono">{{ item.childSkuCode }}</td>
                    <td class="px-2 py-1">{{ item.childName }}</td>
                    <td class="px-2 py-1">×{{ item.quantity }}</td>
                    <td class="px-2 py-1 text-right">{{ item.cost_price ?? '' }}</td>
                    <td class="px-2 py-1 text-right">{{ item.retail_price ?? '' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="importBundles.length > 20" class="text-xs text-gray-400 text-center py-2">...还有 {{ importBundles.length - 20 }} 个套装</div>
          </div>
          <div class="flex gap-2">
            <button @click="importStep=1" class="flex-1 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">上一步</button>
            <button @click="doImport" :disabled="importSaving" class="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-50">
              {{ importSaving ? '导入中...' : `确认导入` }}
            </button>
          </div>
        </div>

        <!-- 步骤3：完成 -->
        <div v-if="importStep===3" class="text-center py-6">
          <div class="text-4xl mb-3">✅</div>
          <div class="text-lg font-bold text-gray-800">导入完成</div>
          <div class="text-sm text-gray-500 mt-1">
            新增 {{ importResult.created }} 条，更新 {{ importResult.updated }} 条
          </div>
          <button @click="closeImport" class="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 cursor-pointer">完成</button>
        </div>
      </div>
    </div>
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
import * as XLSX from 'xlsx'

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

// ========== 导入导出 ==========

const showExportModal = ref(false)
const showImportModal = ref(false)
const exportType = ref('single') // single | bundle
const exportColumns = ref([
  { key: 'sku_code', label: 'SKU编码', checked: true },
  { key: 'name', label: '产品名称', checked: true },
  { key: 'product_type', label: '产品类型', checked: false },
  { key: 'category', label: '分类', checked: true },
  { key: 'brand', label: '品牌', checked: true },
  { key: 'cost_price', label: '成本价', checked: true },
  { key: 'retail_price', label: '零售价', checked: true },
  { key: 'stock', label: '库存', checked: true },
  { key: 'gifts', label: '赠品', checked: true },
])

// ========== 导出逻辑 ==========
async function doExport() {
  try {
    const isBundle = exportType.value === 'bundle'
    const pType = isBundle ? 'bundle' : 'single'
    const { data: products } = await supabase.from('products').select('id, name, product_type, category, brand, cost_price, retail_price').eq('status', 'active').eq('product_type', pType).order('name')
    if (!products?.length) { toast('没有可导出的产品', 'warning'); return }

    const pids = products.map(p => p.id)
    const { data: skus } = await supabase.from('product_skus').select('id, sku_code, product_id, cost_price, retail_price, stock').in('product_id', pids).order('sku_code')
    const skuByPid = {}
    ;(skus || []).forEach(s => { if (!skuByPid[s.product_id]) skuByPid[s.product_id] = []; skuByPid[s.product_id].push(s) })

    const selectedCols = exportColumns.value.filter(c => c.checked)
    const colKeys = new Set(selectedCols.map(c => c.key))

    if (isBundle) {
      // 套装导出：套装行 + 子商品行
      const { data: bundleItems } = await supabase.from('bundle_items').select('id, bundle_id, sku_id, quantity, sort_order').in('bundle_id', pids)
      const { data: childSkus } = await supabase.from('product_skus').select('id, sku_code, cost_price, retail_price')
      const childSkuMap = {}
      ;(childSkus || []).forEach(s => { childSkuMap[s.id] = s })
      const itemsByBundle = {}
      ;(bundleItems || []).forEach(item => { if (!itemsByBundle[item.bundle_id]) itemsByBundle[item.bundle_id] = []; itemsByBundle[item.bundle_id].push(item) })

      const rows = []
      for (const p of products) {
        const pSkus = skuByPid[p.id] || []
        const pSku = pSkus[0]
        const items = (itemsByBundle[p.id] || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        // Bundle header row
        rows.push({
          '套装SKU编码': pSku?.sku_code || '',
          '套装名称': p.name,
          '成本价': pSku?.cost_price ?? p.cost_price ?? '',
          '零售价': pSku?.retail_price ?? p.retail_price ?? '',
          '库存': pSku?.stock ?? 0,
          '子商品SKU编码': '',
          '子商品名称': '',
          '数量': '',
          '子商品成本价': '',
          '子商品零售价': '',
        })
        // Child item rows
        for (const item of items) {
          const child = childSkuMap[item.sku_id]
          rows.push({
            '套装SKU编码': pSku?.sku_code || '',
            '套装名称': p.name,
            '成本价': '',
            '零售价': '',
            '库存': '',
            '子商品SKU编码': child?.sku_code || '',
            '子商品名称': child ? `#${item.sku_id?.slice(0,6)}` : '',
            '数量': item.quantity,
            '子商品成本价': child?.cost_price ?? '',
            '子商品零售价': child?.retail_price ?? '',
          })
        }
      }
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 8 }, { wch: 8 }, { wch: 6 }, { wch: 14 }, { wch: 16 }, { wch: 6 }, { wch: 10 }, { wch: 10 }]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '套装')
      XLSX.writeFile(wb, `套装+赠品_${new Date().toISOString().slice(0,10)}.xlsx`)
    } else {
      // 单品导出：带赠品信息
      // 先获取赠品数据
      const { data: giftBundles } = await supabase.from('product_bundles').select('id, product_id, gift_name').in('product_id', pids)
      const { data: giftItems } = giftBundles?.length ? await supabase.from('product_bundle_items').select('id, bundle_id, gift_name, quantity').in('bundle_id', giftBundles.map(g => g.id)) : []
      const giftsByPid = {}
      ;(giftBundles || []).forEach(gb => {
        const items = (giftItems || []).filter(gi => gi.bundle_id === gb.id)
        giftsByPid[gb.product_id] = giftsByPid[gb.product_id] || []
        giftsByPid[gb.product_id].push(...items)
      })

      const rows = []
      for (const p of products) {
        const pSkus = skuByPid[p.id] || []
        const gifts = giftsByPid[p.id] || []
        const giftNames = gifts.map(g => `${g.gift_name || '赠品'}×${g.quantity || 1}`).join(', ')

        if (pSkus.length === 0) {
          const row = {}
          selectedCols.forEach(c => {
            if (c.key === 'sku_code') row['SKU编码'] = ''
            else if (c.key === 'stock') row['库存'] = ''
            else if (c.key === 'product_type') row['产品类型'] = '单品'
            else if (c.key === 'category') row['分类'] = PRODUCT_ITEM_CATEGORIES[p[c.key]] || p[c.key] || ''
            else if (c.key === 'gifts') row['赠品'] = giftNames
            else row[c.label] = p[c.key] ?? ''
          })
          rows.push(row)
        } else {
          for (const sku of pSkus) {
            const row = {}
            selectedCols.forEach(c => {
              if (c.key === 'sku_code') row['SKU编码'] = sku.sku_code || ''
              else if (c.key === 'cost_price') row['成本价'] = sku.cost_price ?? p.cost_price ?? ''
              else if (c.key === 'retail_price') row['零售价'] = sku.retail_price ?? p.retail_price ?? ''
              else if (c.key === 'stock') row['库存'] = sku.stock ?? 0
              else if (c.key === 'product_type') row['产品类型'] = '单品'
              else if (c.key === 'category') row['分类'] = PRODUCT_ITEM_CATEGORIES[p[c.key]] || p[c.key] || ''
              else if (c.key === 'gifts') row['赠品'] = giftNames
              else row[c.label] = p[c.key] ?? ''
            })
            rows.push(row)
          }
        }
      }
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '单品')
      XLSX.writeFile(wb, `单品+赠品_${new Date().toISOString().slice(0,10)}.xlsx`)
    }

    showExportModal.value = false
    toast('导出成功', 'success')
  } catch (e) {
    toast('导出失败: ' + e.message, 'error')
  }
}

// ========== 导入逻辑 ==========
const importStep = ref(1) // 1=上传 2=预览 3=完成
const importType = ref('single') // single | bundle
const importFile = ref(null)
const importParsing = ref(false)
const importSaving = ref(false)
const importPreview = ref([]) // 单品行
const importBundles = ref([]) // 套装组
const importResult = ref({ created: 0, updated: 0 })

const importNewCount = computed(() => {
  if (importType.value === 'bundle') return importBundles.value.filter(b => b._isNew).length
  return importPreview.value.filter(r => r._isNew).length
})
const importUpdateCount = computed(() => {
  if (importType.value === 'bundle') return importBundles.value.filter(b => !b._isNew).length
  return importPreview.value.filter(r => !r._isNew).length
})

function downloadSingleTemplate() {
  const rows = [
    { 'SKU编码': 'DAA001', '产品名称': '示例球杆', '分类': '球杆', '品牌': 'DBA', '成本价': 334, '零售价': 1555, '库存': 50 },
    { 'SKU编码': 'DAB001', '产品名称': '示例杆桶', '分类': '包装', '品牌': 'DBA', '成本价': 90, '零售价': 425, '库存': 30 },
  ]
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 6 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '单品')
  XLSX.writeFile(wb, '单品导入模板.xlsx')
}

function downloadBundleTemplate() {
  // 套装模板：套装SKU编码, 套装名称, 成本价, 零售价, 库存, 子商品SKU编码, 子商品名称, 数量, 子商品成本价, 子商品零售价
  // 每个套装有一个头部行（子商品编码为空）+ 多个子商品行
  const rows = [
    { '套装SKU编码': 'TA001', '套装名称': '破晓风暴套装', '成本价': '', '零售价': 2499, '库存': 10, '子商品SKU编码': '', '子商品名称': '', '数量': '', '子商品成本价': '', '子商品零售价': '' },
    { '套装SKU编码': 'TA001', '套装名称': '破晓风暴套装', '成本价': '', '零售价': '', '库存': '', '子商品SKU编码': 'DAA001', '子商品名称': 'DBA破晓', '数量': 1, '子商品成本价': 334, '子商品零售价': 1555 },
    { '套装SKU编码': 'TA001', '套装名称': '破晓风暴套装', '成本价': '', '零售价': '', '库存': '', '子商品SKU编码': 'DAB001', '子商品名称': 'DBA风暴杆桶', '数量': 1, '子商品成本价': 90, '子商品零售价': 425 },
    { '套装SKU编码': 'TA002', '套装名称': '破晓雷霆套装', '成本价': '', '零售价': 2899, '库存': 5, '子商品SKU编码': '', '子商品名称': '', '数量': '', '子商品成本价': '', '子商品零售价': '' },
    { '套装SKU编码': 'TA002', '套装名称': '破晓雷霆套装', '成本价': '', '零售价': '', '库存': '', '子商品SKU编码': 'DAA001', '子商品名称': 'DBA破晓', '数量': 1, '子商品成本价': 334, '子商品零售价': 1555 },
  ]
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 8 }, { wch: 8 }, { wch: 6 }, { wch: 14 }, { wch: 16 }, { wch: 6 }, { wch: 10 }, { wch: 10 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '套装')
  XLSX.writeFile(wb, '套装导入模板.xlsx')
}

function onImportFileSelected(e) {
  const file = e.target.files?.[0]
  if (file) importFile.value = file
}

async function parseImportFile() {
  if (!importFile.value) return
  importParsing.value = true
  try {
    const buf = await importFile.value.arrayBuffer()
    const wb = XLSX.read(buf)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws)
    if (!rows.length) { toast('文件中没有数据', 'warning'); return }

    // Detect type: if first row has '套装SKU编码' column → bundle
    const firstKey = Object.keys(rows[0])[0]
    if (firstKey === '套装SKU编码') {
      importType.value = 'bundle'
      await parseBundleRows(rows)
    } else {
      importType.value = 'single'
      await parseSingleRows(rows)
    }
    importStep.value = 2
  } catch (e) {
    toast('解析失败: ' + e.message, 'error')
  } finally {
    importParsing.value = false
  }
}

async function parseSingleRows(rows) {
  const { data: existingSkus } = await supabase.from('product_skus').select('id, sku_code, product_id, cost_price, retail_price, stock, products:product_id(id, name, product_type, category, brand)')
  const skuMap = {}
  ;(existingSkus || []).forEach(s => { skuMap[s.sku_code] = s })

  importPreview.value = rows.map(row => {
    const code = String(row['SKU编码'] || '').trim()
    return {
      'SKU编码': code,
      '产品名称': row['产品名称'] || '',
      '分类': row['分类'] || '',
      '品牌': row['品牌'] || '',
      '成本价': row['成本价'] != null ? Number(row['成本价']) : null,
      '零售价': row['零售价'] != null ? Number(row['零售价']) : null,
      '库存': row['库存'] != null ? Number(row['库存']) : null,
      _isNew: !skuMap[code],
      _existingSku: skuMap[code],
    }
  }).filter(r => r['SKU编码'])
  importBundles.value = []
}

async function parseBundleRows(rows) {
  const { data: existingSkus } = await supabase.from('product_skus').select('id, sku_code, product_id, cost_price, retail_price, stock')
  const { data: existingProducts } = await supabase.from('products').select('id, name, product_type').eq('status', 'active')
  const skuMap = {}
  ;(existingSkus || []).forEach(s => { skuMap[s.sku_code] = s })
  const productMap = {}
  ;(existingProducts || []).forEach(p => { productMap[p.name] = p })

  // Group rows by 套装SKU编码
  const bundleGroups = {}
  for (const row of rows) {
    const code = String(row['套装SKU编码'] || '').trim()
    if (!code) continue
    if (!bundleGroups[code]) bundleGroups[code] = { code, name: row['套装名称'] || '', cost_price: null, retail_price: null, stock: null, items: [] }
    const g = bundleGroups[code]
    if (row['成本价'] != null && g.cost_price === null) g.cost_price = Number(row['成本价'])
    if (row['零售价'] != null && g.retail_price === null) g.retail_price = Number(row['零售价'])
    if (row['库存'] != null && g.stock === null) g.stock = Number(row['库存'])
    const childCode = String(row['子商品SKU编码'] || '').trim()
    if (childCode) {
      g.items.push({
        childSkuCode: childCode,
        childName: row['子商品名称'] || '',
        quantity: Number(row['数量']) || 1,
        cost_price: row['子商品成本价'] != null ? Number(row['子商品成本价']) : null,
        retail_price: row['子商品零售价'] != null ? Number(row['子商品零售价']) : null,
      })
    }
  }

  const bundles = []
  for (const code of Object.keys(bundleGroups)) {
    const g = bundleGroups[code]
    bundles.push({
      ...g,
      _isNew: !skuMap[code],
      _existingSku: skuMap[code],
    })
  }

  importBundles.value = bundles
  importPreview.value = []
}

async function doImport() {
  importSaving.value = true
  let created = 0, updated = 0
  try {
    if (importType.value === 'single') {
      for (const row of importPreview.value) {
        if (row._isNew) {
          const catKey = Object.entries(PRODUCT_ITEM_CATEGORIES).find(([k, v]) => v === row['分类'])?.[0] || null
          const { data: product, error: pe } = await supabase.from('products').insert({
            name: row['产品名称'], category: catKey || row['分类'], brand: row['品牌'],
            cost_price: row['成本价'], retail_price: row['零售价'],
            product_type: 'single', status: 'active',
          }).select().single()
          if (pe) { console.error('创建失败:', row['SKU编码'], pe.message); continue }
          const { error: se } = await supabase.from('product_skus').insert({
            product_id: product.id, sku_code: row['SKU编码'],
            cost_price: row['成本价'], retail_price: row['零售价'], stock: row['库存'] ?? 0,
          })
          if (!se) created++
        } else {
          const updates = {}
          if (row['成本价'] != null) updates.cost_price = row['成本价']
          if (row['零售价'] != null) updates.retail_price = row['零售价']
          if (row['库存'] != null) updates.stock = row['库存']
          const prodUpdates = {}
          if (row['产品名称']) prodUpdates.name = row['产品名称']
          if (row['品牌']) prodUpdates.brand = row['品牌']
          const catKey = Object.entries(PRODUCT_ITEM_CATEGORIES).find(([k, v]) => v === row['分类'])?.[0]
          if (catKey) prodUpdates.category = catKey
          if (Object.keys(updates).length) await supabase.from('product_skus').update(updates).eq('id', row._existingSku.id)
          if (Object.keys(prodUpdates).length) await supabase.from('products').update(prodUpdates).eq('id', row._existingSku.product_id)
          updated++
        }
      }
    } else {
      // 套装导入
      const { data: allSkus } = await supabase.from('product_skus').select('id, sku_code, product_id')
      const skuIdMap = {}
      ;(allSkus || []).forEach(s => { skuIdMap[s.sku_code] = s })

      for (const bundle of importBundles.value) {
        if (bundle._isNew) {
          // Create bundle product + SKU + bundle_items
          const { data: product, error: pe } = await supabase.from('products').insert({
            name: bundle.name, cost_price: bundle.cost_price, retail_price: bundle.retail_price,
            product_type: 'bundle', status: 'active',
          }).select().single()
          if (pe) { console.error('创建套装失败:', bundle.code, pe.message); continue }
          const { data: sku, error: se } = await supabase.from('product_skus').insert({
            product_id: product.id, sku_code: bundle.code,
            cost_price: bundle.cost_price, retail_price: bundle.retail_price, stock: bundle.stock ?? 0,
          }).select().single()
          if (se) { console.error('创建套装SKU失败:', bundle.code, se.message); continue }
          // Create bundle_items
          const items = bundle.items.map((item, i) => ({
            bundle_id: product.id,
            sku_id: skuIdMap[item.childSkuCode]?.id,
            quantity: item.quantity,
            sort_order: i,
          })).filter(item => item.sku_id)
          if (items.length) await supabase.from('bundle_items').insert(items)
          created++
        } else {
          // Update existing bundle
          const updates = {}
          if (bundle.cost_price != null) updates.cost_price = bundle.cost_price
          if (bundle.retail_price != null) updates.retail_price = bundle.retail_price
          if (bundle.stock != null) updates.stock = bundle.stock
          if (bundle.name) {
            await supabase.from('products').update({ name: bundle.name }).eq('id', bundle._existingSku.product_id)
          }
          if (Object.keys(updates).length) await supabase.from('product_skus').update(updates).eq('id', bundle._existingSku.id)
          // Replace bundle items
          if (bundle.items.length) {
            await supabase.from('bundle_items').delete().eq('bundle_id', bundle._existingSku.product_id)
            const items = bundle.items.map((item, i) => ({
              bundle_id: bundle._existingSku.product_id,
              sku_id: skuIdMap[item.childSkuCode]?.id,
              quantity: item.quantity,
              sort_order: i,
            })).filter(item => item.sku_id)
            if (items.length) await supabase.from('bundle_items').insert(items)
          }
          updated++
        }
      }
    }

    importResult.value = { created, updated }
    importStep.value = 3
  } catch (e) {
    toast('导入失败: ' + e.message, 'error')
  } finally {
    importSaving.value = false
  }
}

function closeImport() {
  showImportModal.value = false
  importStep.value = 1
  importFile.value = null
  importPreview.value = []
  importBundles.value = []
  importResult.value = { created: 0, updated: 0 }
  loadProducts()
  loadSummary()
}

// ========== 初始化 ==========
onMounted(async () => {
  loadRole()
  await Promise.all([loadProducts(), loadSummary()])
})
</script>
