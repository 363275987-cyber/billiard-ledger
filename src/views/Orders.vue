<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-4 md:mb-6">
      <h1 class="text-lg md:text-xl font-bold text-gray-800">📝 订单登记</h1>
      <div class="flex items-center gap-2 flex-wrap">
        <!-- 随机测试数据 -->
        <div v-if="isAdmin" class="inline-flex items-center gap-1">
          <select v-model="testCount" class="text-xs border border-dashed border-gray-300 rounded px-2 py-1 text-gray-400 bg-transparent outline-none cursor-pointer">
            <option :value="1">1条</option>
            <option :value="5">5条</option>
            <option :value="10">10条</option>
            <option :value="20">20条</option>
          </select>
          <button @click="generateTestData(testCount)" class="text-xs px-2 py-1 border border-dashed border-gray-300 rounded text-gray-400 hover:bg-gray-50 hover:text-gray-600 cursor-pointer">
            🎲 随机测试
          </button>
        </div>
        <button
          v-if="canCreate"
          @click="showTextMode = !showTextMode"
          class="px-3 md:px-4 py-2 rounded-lg text-sm transition cursor-pointer whitespace-nowrap"
          :class="showTextMode ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'"
        >
          📋 文本模式
        </button>
        <button
          v-if="canCreate"
          @click="openImportModal()"
          class="bg-green-600 text-white px-3 md:px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition cursor-pointer whitespace-nowrap"
        >
          📥 导入
        </button>
        <button
          v-if="canCreate"
          @click="openModal()"
          class="bg-blue-600 text-white px-3 md:px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition cursor-pointer whitespace-nowrap"
        >
          + 新建
        </button>
      </div>
    </div>

    <!-- Text Mode Panel -->
    <div v-if="showTextMode" class="mb-6">
      <div class="bg-white rounded-xl border border-gray-100 p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold text-gray-700">📋 粘贴订单文本</h3>
          <button @click="showTextMode = false" class="text-gray-400 hover:text-gray-600 text-sm cursor-pointer">收起 ✕</button>
        </div>
        <textarea
          v-model="rawText"
          rows="5"
          placeholder="粘贴订单文本，支持一次粘贴多条订单（按序号自动分隔）..."
          class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none font-mono"
        ></textarea>
        <div class="flex items-center gap-2 mt-3">
          <button
            @click="handleParse"
            :disabled="!rawText.trim()"
            class="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
          >
            🔍 解析
          </button>
          <button
            @click="rawText = ''; parsedOrders = []"
            class="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 cursor-pointer transition"
          >
            清空
          </button>
        </div>

        <!-- Parsed Preview -->
        <div v-if="parsedOrders.length > 0" class="mt-4 space-y-3">
          <div class="text-xs text-gray-400 mb-1">解析到 {{ parsedOrders.length }} 条订单，可编辑后确认填入：</div>
          <div
            v-for="(order, idx) in parsedOrders"
            :key="idx"
            class="border border-purple-100 bg-purple-50/30 rounded-lg p-4"
          >
            <div class="text-xs text-gray-400 font-mono bg-gray-50 rounded px-2 py-1 mb-2 break-all whitespace-pre-wrap">{{ order._rawText }}</div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold text-purple-600">订单 {{ idx + 1 }}</span>
              <button
                @click="applyOrder(idx)"
                class="px-3 py-1 bg-purple-600 text-white rounded-md text-xs hover:bg-purple-700 cursor-pointer transition"
              >
                确认填入
              </button>
            </div>
            <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <div>
                <span class="text-gray-400 text-xs">客服号：</span>
                <input v-model="order.service_number" class="border border-gray-200 rounded px-2 py-0.5 text-sm w-full bg-white" />
              </div>
              <div>
                <span class="text-gray-400 text-xs">客户姓名：</span>
                <input v-model="order.customer_name" class="border border-gray-200 rounded px-2 py-0.5 text-sm w-full bg-white" />
              </div>
              <div>
                <span class="text-gray-400 text-xs">客户电话：</span>
                <input v-model="order.customer_phone" maxlength="11" @blur="autoFillRowCustomer(order)" class="border rounded px-2 py-0.5 text-sm w-full bg-white" :class="order.customer_phone && !/^1[3-9]\d{9}$/.test(order.customer_phone) ? 'border-red-300' : 'border-gray-200'" />
              </div>
              <div>
                <span class="text-gray-400 text-xs">金额：</span>
                <input v-model.number="order.amount" type="number" class="border border-gray-200 rounded px-2 py-0.5 text-sm w-full bg-white" />
              </div>
              <div class="col-span-2">
                <span class="text-gray-400 text-xs">收货地址：</span>
                <input v-model="order.customer_address" class="border border-gray-200 rounded px-2 py-0.5 text-sm w-full bg-white" />
              </div>
              <div>
                <span class="text-gray-400 text-xs">产品类型：</span>
                <select v-model="order.product_category" class="border border-gray-200 rounded px-2 py-0.5 text-sm w-full bg-white">
                  <option value="">请选择</option>
                  <option v-for="(label, key) in PRODUCT_CATEGORIES" :key="key" :value="key">{{ label }}</option>
                </select>
              </div>
              <div>
                <span class="text-gray-400 text-xs">收款账户：</span>
                <div class="flex items-center gap-1">
                  <input v-model="order._accountSearch" @focus="order._accDropdown = true" @input="order._accDropdown = true" @blur="order._accDropdown = false"
                    class="border border-gray-200 rounded px-2 py-0.5 text-sm flex-1 bg-white cursor-pointer min-w-0"
                    :placeholder="getAccountLabel(order.account_id)" />
                  <button @click="showQuickAddAccount = true" class="shrink-0 w-6 h-6 flex items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm cursor-pointer" title="添加新账户">+</button>
                  <div v-if="order._accDropdown && filterAccountsBySearch(order._accountSearch).length > 0"
                    class="absolute z-30 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto min-w-[160px]">
                    <div v-for="acc in filterAccountsBySearch(order._accountSearch).slice(0, 20)" :key="acc.id"
                      @mousedown.prevent="order.account_id = acc.id; order._accountSearch = ''"
                      class="px-2 py-1.5 text-sm hover:bg-blue-50 cursor-pointer whitespace-nowrap">
                      {{ acc.short_name || acc.code }}（¥{{ Number(acc.balance || 0).toFixed(0) }}）
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-span-2">
                <span class="text-gray-400 text-xs">产品名称：</span>
                <input v-model="order.product_name" class="border border-gray-200 rounded px-2 py-0.5 text-sm w-full bg-white" />
              </div>
              <div v-if="order.order_no" class="col-span-2 text-xs text-gray-400">
                订单号：{{ order.order_no }}
              </div>
            </div>
            <!-- 产品明细 -->
            <div v-if="order.products && order.products.length > 0" class="mt-2 pt-2 border-t border-purple-100">
              <div class="text-xs text-gray-400 mb-1">产品明细：</div>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="p in order.products"
                  :key="p.name"
                  class="bg-white border border-purple-200 text-purple-700 text-xs px-2 py-0.5 rounded"
                >
                  {{ p.name }} × {{ p.qty }}
                </span>
              </div>
            </div>
          </div>
          <!-- Batch Submit All -->
          <div v-if="parsedOrders.length > 1" class="flex items-center justify-between mt-3 pt-3 border-t border-purple-100">
            <span class="text-xs text-gray-400">合计 {{ parsedOrders.length }} 条订单，总金额 ¥{{ parsedTotalAmount }}</span>
            <button
              @click="submitAllParsedOrders"
              :disabled="submittingAll"
              class="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
            >
              {{ submittingAll ? '提交中...' : '✅ 全部提交' }}
            </button>
          </div>
        </div>

        <!-- Parse Error -->
        <div v-if="parseError" class="mt-3 text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">
          ⚠️ {{ parseError }}
        </div>

        <!-- Quick Add Account Modal -->
        <div v-if="showQuickAddAccount" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30" @click.self="showQuickAddAccount = false">
          <div class="bg-white rounded-xl shadow-xl w-80 p-5">
            <h3 class="text-sm font-semibold mb-3">快捷创建收款账户</h3>
            <div class="space-y-3">
              <div>
                <label class="block text-xs text-gray-500 mb-1">账户简称 *</label>
                <input v-model="quickAccountForm.short_name" placeholder="如：南113珊有赞" class="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">付款简称</label>
                <input v-model="quickAccountForm.payment_alias" placeholder="如：南113珊" class="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">平台</label>
                <select v-model="quickAccountForm.platform" class="w-full px-3 py-2 border rounded-lg text-sm bg-white cursor-pointer">
                  <option value="other">其他</option>
                  <option value="wechat">微信</option>
                  <option value="alipay">支付宝</option>
                  <option value="youzan">有赞</option>
                  <option value="taobao">淘宝</option>
                  <option value="douyin">抖音</option>
                  <option value="kuaishou">快手</option>
                </select>
              </div>
              <div class="flex gap-2 pt-1">
                <button @click="quickCreateAccount" class="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 cursor-pointer">创建</button>
                <button @click="showQuickAddAccount = false" class="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 cursor-pointer">取消</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 今日订单汇总 -->
    <div v-if="todayOrdersData.loaded" class="bg-white rounded-xl p-3 mb-4 border border-gray-100 flex items-center gap-3">
      <div class="w-1 h-8 rounded-full bg-green-500"></div>
      <div class="flex items-center gap-4 text-sm">
        <span class="text-gray-400">今日订单</span>
        <span class="font-semibold text-gray-800">{{ todayOrdersData.orderCount }} 笔</span>
        <span class="text-green-600">{{ '¥' + todayOrdersData.orderTotal.toFixed(2) }}</span>
        <template v-if="todayOrdersData.refundCount > 0">
          <span class="text-gray-300">|</span>
          <span class="text-gray-400">退款</span>
          <span class="font-semibold text-red-500">{{ todayOrdersData.refundCount }} 笔</span>
          <span class="text-red-400">{{ '¥' + todayOrdersData.refundTotal.toFixed(2) }}</span>
        </template>
      </div>
    </div>

    <!-- Stats Cards -->
    <div v-if="!filters.category && !filters.status && !filters.dateFrom && !filters.dateTo" class="grid grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-5">
      <div class="bg-white rounded-xl border border-gray-100 p-4">
        <div class="text-xs text-gray-400 mb-1">📋 今日订单</div>
        <div class="text-2xl font-bold text-gray-800">{{ stats.todayCount }}</div>
      </div>
      <div class="bg-white rounded-xl border border-gray-100 p-4">
        <div class="text-xs text-gray-400 mb-1">📦 本月订单</div>
        <div class="text-2xl font-bold text-gray-800">{{ stats.monthCount }}</div>
      </div>
      <div class="bg-white rounded-xl border border-gray-100 p-4">
        <div class="text-xs text-gray-400 mb-1">💰 本月金额</div>
        <div class="text-2xl font-bold text-green-600">{{ formatMoney(stats.monthAmount) }}</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-gray-100 p-3 md:p-4 mb-4">
      <div class="flex gap-2 md:gap-3 items-center flex-wrap">
        <select v-model="filters.searchField" class="px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer">
          <option value="">全部字段</option>
          <option value="customer_name">客户名称</option>
          <option value="product_name">产品名称</option>
          <option value="account_name">收款账户</option>
          <option value="account_code">账户代码</option>
          <option value="order_no">订单编号</option>
          <option value="note">备注</option>
          <option value="service_number_code">客服号</option>
        </select>
        <div class="relative flex items-center">
          <input
            v-model="filters.keyword"
            placeholder="搜索客户/产品/订单号/账户代码/备注"
            class="px-3 py-2 pr-9 border border-gray-200 rounded-lg text-sm w-full md:w-56 outline-none focus:ring-2 focus:ring-blue-500"
            @keyup.enter="loadOrders"
          />
          <button @click="loadOrders" class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer" title="搜索">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </button>
        </div>
        <div class="flex gap-2 items-center overflow-x-auto flex-1 min-w-0 pb-1 md:pb-0">
          <select
            v-model="filters.category"
            class="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none flex-shrink-0"
          >
            <option value="">全部类型</option>
            <option v-for="(label, key) in PRODUCT_CATEGORIES" :key="key" :value="key">{{ label }}</option>
          </select>
          <select
            v-model="filters.status"
            class="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none flex-shrink-0"
          >
            <option value="">全部状态</option>
            <option v-for="(cfg, key) in ORDER_STATUS" :key="key" :value="key">{{ cfg.label }}</option>
          </select>
          <input
            v-model="filters.dateFrom"
            type="date"
            class="px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none flex-shrink-0"
          />
          <input
            v-model="filters.dateTo"
            type="date"
            class="px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none flex-shrink-0"
          />
          <button
            @click="loadOrders"
            class="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition cursor-pointer flex-shrink-0"
          >
            搜索
          </button>
          <button
            @click="handleExportOrders"
            class="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 transition cursor-pointer flex-shrink-0"
          >
            📥 导出CSV
          </button>
        </div>
      </div>
      <div class="text-sm text-gray-400 mt-2 text-right">{{ orderStore.pagination.total }} 条</div>
    </div>

    <!-- Action Bar -->
    <div v-if="selectedOrders.length > 0" class="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
      <span class="text-red-600 text-sm font-medium">已选 {{ selectedOrders.length }} 条</span>
      <button v-if="canDelete" @click="handleBatchDelete" class="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-red-700 transition cursor-pointer">删除选中</button>
      <button @click="selectedOrders = []" class="text-gray-500 text-sm hover:text-gray-700 cursor-pointer">取消选择</button>
    </div>

    <!-- Orders Table (desktop) -->
    <div class="bg-white rounded-xl border border-gray-100 overflow-hidden hidden md:block">
      <Skeleton v-if="orderStore.loading" type="table" :rows="8" :columns="10" />
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="bg-gray-50 text-gray-600">
            <th v-if="canDeleteOrders" class="px-4 py-3 text-center w-10">
              <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" class="rounded cursor-pointer">
            </th>
            <th class="px-4 py-3 text-left font-medium">时间</th>
            <th class="px-4 py-3 text-left font-medium">客服号</th>
            <th class="px-4 py-3 text-left font-medium">收款账户</th>
            <th class="px-4 py-3 text-left font-medium">客户</th>
            <th class="px-4 py-3 text-left font-medium">产品类型</th>
            <th class="px-4 py-3 text-left font-medium">产品名</th>
            <th class="px-4 py-3 text-right font-medium">金额</th>
            <th class="px-4 py-3 text-left font-medium">业绩归属</th>
            <th class="px-4 py-3 text-center font-medium">来源</th>
            <th class="px-4 py-3 text-center font-medium">状态</th>
            <th class="px-4 py-3 text-center font-medium" v-if="canEdit">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="order in orderStore.orders"
            :key="order.id"
            class="border-t border-gray-50 hover:bg-gray-50/60"
          >
            <td v-if="canDeleteOrders" class="px-4 py-3 text-center">
              <input type="checkbox" :value="order.id" v-model="selectedOrders" class="rounded cursor-pointer">
            </td>
            <td class="px-4 py-3 text-gray-500 whitespace-nowrap">{{ formatDate(order.created_at) }}</td>
            <td class="px-4 py-3">
              <span v-if="order.service_number_code" class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">{{ order.service_number_code }}</span>
              <span v-else class="text-gray-300 text-xs">—</span>
            </td>
            <td class="px-4 py-3">
              <span v-if="order.account_id" class="text-xs">{{ getAccountName(order.account_id) }}</span>
              <span v-else-if="order.payment_method" class="px-2 py-0.5 rounded text-xs font-medium" :class="paymentMethodClass(order.payment_method)">{{ paymentMethodLabel(order.payment_method) }}</span>
              <span v-else class="text-gray-300 text-xs">—</span>
            </td>
            <td class="px-4 py-3 text-gray-800">
              <div>{{ order.customer_name }}</div>
              <div v-if="order.customer_phone" class="text-xs text-gray-400">{{ order.customer_phone }}</div>
            </td>
            <td class="px-4 py-3 text-gray-500">{{ PRODUCT_CATEGORIES[order.product_category] || order.product_category }}</td>
            <td class="px-4 py-3 text-gray-800 max-w-[160px] truncate" :title="order.product_name">{{ order.product_name }}</td>
            <td class="px-4 py-3 text-right font-medium text-green-600 whitespace-nowrap">
              {{ formatMoney(order.amount) }}
            </td>
            <td class="px-4 py-3 text-gray-500 text-xs">{{ order.sales_profile?.name || order.sales_name || '—' }}</td>
            <td class="px-4 py-3 text-center">
              <span :class="order.order_source === 'sales_guided' ? 'text-blue-600' : order.order_source === 'organic' ? 'text-gray-400' : 'text-purple-600'" 
                class="text-xs px-1.5 py-0.5 rounded">
                {{ ORDER_SOURCE_LABELS[order.order_source] || '—' }}
              </span>
            </td>
            <td class="px-4 py-3 text-center">
              <span
                :class="[ORDER_STATUS[order.status]?.class, 'px-2 py-0.5 rounded text-xs']"
              >
                {{ ORDER_STATUS[order.status]?.label || order.status }}
              </span>
            </td>
            <td class="px-4 py-3 text-center" v-if="canEdit">
              <div class="flex items-center justify-center gap-1">
                <button v-if="order.status === 'pending'" @click="handleConfirmPayment(order)" class="text-green-600 hover:text-green-800 text-xs px-2 py-1 rounded hover:bg-green-50 transition cursor-pointer">确认收款</button>
                <button
                  @click="openModal(order)"
                  class="text-blue-500 hover:text-blue-700 text-xs px-2 py-1 rounded hover:bg-blue-50 transition cursor-pointer"
                >编辑</button>
                <button
                  v-if="order.status === 'pending' && isFinance"
                  @click="handleCancel(order)"
                  class="text-orange-500 hover:text-orange-700 text-xs px-2 py-1 rounded hover:bg-orange-50 transition cursor-pointer"
                >取消</button>
                <button
                  v-if="canDeleteOrder(order)"
                  @click="handleDelete(order)"
                  class="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50 transition cursor-pointer"
                >删除</button>
              </div>
            </td>
          </tr>
          <tr v-if="!orderStore.loading && orderStore.orders.length === 0">
            <td :colspan="canEdit ? 11 : 10" class="px-4 py-16 text-center text-gray-400">
              <div class="text-3xl mb-2">📭</div>
              <div>暂无订单数据</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Card List -->
    <div class="md:hidden space-y-2">
      <div v-if="orderStore.loading" class="space-y-2">
        <div v-for="i in 5" :key="i" class="bg-white rounded-xl border border-gray-100 p-4">
          <div class="h-4 w-24 bg-gray-100 rounded animate-pulse mb-2"></div>
          <div class="h-6 w-32 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </div>
      <div
        v-for="order in orderStore.orders"
        :key="'m-' + order.id"
        class="bg-white rounded-xl border border-gray-100 p-3 shadow-sm"
      >
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span v-if="order.service_number_code" class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium flex-shrink-0">{{ order.service_number_code }}</span>
            <span class="text-sm font-semibold text-green-600">{{ formatMoney(order.amount) }}</span>
          </div>
          <span
            :class="[ORDER_STATUS[order.status]?.class, 'px-2 py-0.5 rounded text-xs flex-shrink-0 ml-2']"
          >
            {{ ORDER_STATUS[order.status]?.label || order.status }}
          </span>
        </div>
        <div class="text-sm text-gray-800 truncate mb-1">{{ order.customer_name || '--' }}</div>
        <div class="text-xs text-gray-400 truncate mb-2">
          {{ PRODUCT_CATEGORIES[order.product_category] || order.product_category || '' }}
          <span v-if="order.product_name"> · {{ order.product_name }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-400">{{ formatDate(order.created_at) }}</span>
          <div class="flex items-center gap-2">
            <button v-if="order.status === 'pending'" @click="handleConfirmPayment(order)" class="text-green-600 text-xs px-2 py-1 rounded hover:bg-green-50 transition cursor-pointer">确认收款</button>
            <button @click="openModal(order)" class="text-blue-500 text-xs px-2 py-1 rounded hover:bg-blue-50 transition cursor-pointer">编辑</button>
            <button v-if="canDeleteOrder(order)" @click="handleDelete(order)" class="text-red-400 text-xs px-2 py-1 rounded hover:bg-red-50 transition cursor-pointer">删除</button>
          </div>
        </div>
      </div>
      <div v-if="!orderStore.loading && orderStore.orders.length === 0" class="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">
        <div class="text-3xl mb-2">📭</div>
        <div>暂无订单数据</div>
      </div>
    </div>

    <!-- Pagination -->
    <div
      v-if="orderStore.pagination.total > 0"
      class="flex items-center justify-between mt-4 px-1"
    >
      <div class="text-sm text-gray-400">
        第 {{ orderStore.pagination.page }} / {{ totalPages }} 页
      </div>
      <div class="flex items-center gap-1">
        <button
          @click="goPage(1)"
          :disabled="orderStore.pagination.page <= 1"
          class="px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >首页</button>
        <button
          @click="goPage(orderStore.pagination.page - 1)"
          :disabled="orderStore.pagination.page <= 1"
          class="px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >上一页</button>
        <template v-for="p in displayPages" :key="p">
          <span v-if="p === '...'" class="px-2 text-gray-400 text-sm">…</span>
          <button
            v-else
            @click="goPage(p)"
            :class="[
              'px-2.5 py-1.5 text-sm rounded-lg cursor-pointer',
              p === orderStore.pagination.page
                ? 'bg-blue-600 text-white border border-blue-600'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            ]"
          >{{ p }}</button>
        </template>
        <button
          @click="goPage(orderStore.pagination.page + 1)"
          :disabled="orderStore.pagination.page >= totalPages"
          class="px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >下一页</button>
        <button
          @click="goPage(totalPages)"
          :disabled="orderStore.pagination.page >= totalPages"
          class="px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >末页</button>
      </div>
    </div>

    <!-- Modal: New/Edit Order -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      @click.self="showModal = false"
    >
      <div class="bg-white rounded-none md:rounded-2xl shadow-2xl w-full md:max-w-lg md:mx-auto md:max-h-[90vh] overflow-hidden flex flex-col inset-0 md:inset-auto">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 class="font-bold text-gray-800">{{ editingOrder ? '编辑订单' : '新建订单' }}</h2>
          <button @click="showModal = false" class="text-gray-400 hover:text-gray-600 text-xl cursor-pointer">&times;</button>
        </div>
        <form @submit.prevent="handleSubmit" class="p-6 space-y-4 overflow-y-auto">
          <!-- 客服号 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">客服号 <span class="text-red-400">*</span></label>
            <div class="relative">
              <input
                v-model="snSearch"
                @focus="snDropdownOpen = true"
                @blur="closeSnDropdown"
                placeholder="输入客服号或微信号搜索..."
                class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div v-if="selectedSnDisplay" class="text-xs text-green-600 mt-1">已选：{{ selectedSnDisplay }}</div>
              <!-- 搜索下拉 -->
              <div v-if="snDropdownOpen && filteredServiceNumbers.length > 0"
                class="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                <div v-for="sn in filteredServiceNumbers" :key="sn.code"
                  @mousedown.prevent="selectSn(sn)"
                  class="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer flex justify-between items-center">
                  <span>{{ sn.display }}</span>
                  <span v-if="sn.wechat_name" class="text-xs text-gray-400">{{ sn.wechat_name }}</span>
                </div>
              </div>
              <div v-if="snDropdownOpen && snSearch && filteredServiceNumbers.length === 0"
                class="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-400">
                无匹配结果
              </div>
            </div>
          </div>

          <!-- 收款账户 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">收款账户</label>
            <div class="relative">
              <input
                v-model="form.accountSearch"
                @focus="accountDropdownOpen = true"
                @input="accountDropdownOpen = true"
                @blur="accountDropdownOpen = false"
                placeholder="搜索账户名称/简称"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">{{ selectedAccountDisplay }}</div>
              <div v-if="accountDropdownOpen && filteredAccounts.length > 0"
                class="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                <div v-for="acc in filteredAccounts" :key="acc.id"
                  @mousedown.prevent="selectAccount(acc)"
                  class="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer flex justify-between items-center">
                  <span>{{ acc.short_name || acc.code }}</span>
                  <span class="text-xs text-gray-400">¥{{ Number(acc.balance || 0).toFixed(0) }}</span>
                </div>
              </div>
            </div>
          </div>
            </div>
          </div>

          <!-- 客户信息 -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">客户姓名 <span class="text-red-400">*</span></label>
              <input
                v-model="form.customer_name"
                placeholder="客户姓名"
                required
                class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">客户电话</label>
              <input
                v-model="form.customer_phone"
                placeholder="手机号（输入后自动匹配老客户）"
                maxlength="11"
                @blur="autoFillCustomer"
                class="w-full px-3 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                :class="form.customer_phone && !/^1[3-9]\d{9}$/.test(form.customer_phone) ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'"
              />
              <p v-if="form.customer_phone && !/^1[3-9]\d{9}$/.test(form.customer_phone)" class="text-xs text-red-500 mt-1">请输入正确的11位手机号</p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">收货地址</label>
            <input
              v-model="form.customer_address"
              placeholder="省-市-区-详细地址"
              class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- 产品明细（多产品） -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-gray-700">产品明细 <span class="text-red-400">*</span></label>
              <div class="flex items-center gap-2">
                <button type="button" @click="addProductItem" class="text-xs text-blue-600 hover:text-blue-800 cursor-pointer">+ 添加产品</button>
              </div>
            </div>
            <div v-if="form.productItems.length === 0" class="text-center py-4 border border-dashed border-gray-200 rounded-lg text-sm text-gray-400">
              请添加至少一个产品
            </div>
            <div v-else class="space-y-2 relative" ref="productListRef">
              <div v-for="(item, idx) in form.productItems" :key="idx" class="flex items-center gap-2 rounded-lg px-3 py-2" :class="item.is_gift ? 'bg-purple-50 border border-purple-100' : 'bg-gray-50'">
                <span v-if="item.is_gift" class="text-purple-400 text-sm flex-shrink-0">🎁</span>
                <input v-model="item.name" :id="'product-input-' + idx" placeholder="输入关键字搜索产品库" class="flex-1 min-w-0 px-2 py-1.5 border border-gray-200 rounded text-sm bg-white outline-none focus:ring-1 focus:ring-blue-500" @input="onItemNameInput(idx)" @focus="onItemNameInput(idx)" @blur="onProductBlur" />
                <span v-if="item.sale_price > 0 && !item.is_gift" class="text-sm text-green-600 font-medium whitespace-nowrap flex-shrink-0">¥{{ item.sale_price }}</span>
                <span v-if="item.is_gift" class="text-xs text-purple-400 whitespace-nowrap flex-shrink-0">¥0</span>
                <input v-model.number="item.qty" type="number" min="1" placeholder="数量" class="w-16 px-2 py-1.5 border border-gray-200 rounded text-sm text-center bg-white outline-none focus:ring-1 focus:ring-blue-500" />
                <button v-if="!item.is_gift && item.product_id" type="button" @click="openGiftSelector(idx)" class="text-purple-500 hover:text-purple-700 text-xs whitespace-nowrap cursor-pointer" title="选赠品">🎁 赠品</button>
                <button type="button" @click="removeProductItem(idx)" class="text-gray-400 hover:text-red-500 cursor-pointer text-lg leading-none">&times;</button>
              </div>
            </div>
            <!-- 产品搜索下拉（放在列表外面，fixed定位） -->
            <div v-if="showProductDropdown && activeProductItemIdx >= 0"
              class="z-50 bg-white border border-gray-200 rounded-lg shadow-xl max-h-72 overflow-hidden"
              :style="productDropdownStyle">
              <!-- 下拉内搜索框 -->
              <div class="p-2 border-b border-gray-100 sticky top-0 bg-white">
                <input
                  ref="dropdownSearchRef"
                  v-model="dropdownSearch"
                  placeholder="搜索产品名称/品牌..."
                  class="w-full px-2 py-1.5 border border-gray-200 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50"
                />
              </div>
              <!-- 产品列表 -->
              <div class="overflow-y-auto max-h-56">
                <div
                  v-for="p in dropdownFilteredProducts"
                  :key="p.id"
                  @mousedown.prevent="selectProduct(p)"
                  class="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-50 last:border-0"
                >
                  <div class="font-medium text-gray-800">{{ p.name }}</div>
                  <div class="text-xs text-gray-400">
                    {{ PRODUCT_ITEM_CATEGORIES[p.category] || p.category || '' }}
                    <span v-if="p.brand"> · {{ p.brand }}</span>
                    <span v-if="Number(p.retail_price) > 0"> · ¥{{ p.retail_price }}</span>
                  </div>
                </div>
                <div v-if="dropdownFilteredProducts.length === 0" class="text-center py-4 text-gray-400 text-sm">
                  没有匹配的产品
                </div>
              </div>
            </div>
            <!-- 产品类型 -->
            <div class="mt-2">
              <select v-model="form.product_category" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">请选择产品类型</option>
                <option v-for="(label, key) in PRODUCT_CATEGORIES" :key="key" :value="key">{{ label }}</option>
              </select>
            </div>
          </div>

          <!-- 赠品选择弹窗 -->
          <GiftSelector
            v-if="showGiftModal"
            :mainProductId="giftModalProduct.product_id"
            :mainProductName="giftModalProduct.name"
            :mainCostPrice="Number(giftModalProduct.unit_cost) || 0"
            :existingGifts="giftModalProduct.existingGifts || []"
            :editingExisting="!!giftModalProduct.existingGifts?.length"
            @confirm="onGiftsConfirmed"
            @close="showGiftModal = false"
          />

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">金额（元）<span class="text-red-400">*</span></label>
            <input
              v-model.number="form.amount"
              type="number"
              placeholder="0.00"
              required
              min="0"
              step="0.01"
              class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div v-if="mainProductBasePrice > 0" class="text-xs mt-1" :class="isAmountOutOfRange ? 'text-red-500 font-medium' : 'text-gray-400'">
              建议售价 ¥{{ mainProductBasePrice }}，可浮动范围 ¥{{ (mainProductBasePrice * 0.9).toFixed(0) }} ~ ¥{{ (mainProductBasePrice * 1.1).toFixed(0) }}
            </div>
          </div>

          <!-- 状态（仅编辑时显示） -->
          <div v-if="editingOrder && isFinance">
            <label class="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              v-model="form.status"
              class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option v-for="(cfg, key) in ORDER_STATUS" :key="key" :value="key">{{ cfg.label }}</option>
            </select>
          </div>

          <!-- 订单来源 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">订单来源</label>
            <select v-model="form.order_source"
              class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
              <option value="sales_guided">🤝 销售引导（微信沟通→下单）</option>
              <option value="organic">🛒 有机流量（客户自己下的）</option>
              <option value="cs_service">🎧 客服处理（电商客服）</option>
            </select>
            <p class="text-xs text-gray-400 mt-1">
              销售引导 = 业绩归销售；有机流量 = 不归销售；客服处理 = 客服低提成
            </p>
          </div>

          <!-- 备注 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <textarea
              v-model="form.note"
              rows="2"
              placeholder="发货仓库、其他备注..."
              class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            ></textarea>
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
            >{{ submitting ? '提交中…' : (editingOrder ? '保存修改' : '提交订单') }}</button>
          </div>
        </form>
      </div>
    </div>
    <!-- Modal: Excel Import -->
    <div
      v-if="showImportModal"
      class="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      @click.self="showImportModal = false"
      @dragover.prevent="isDraggingFile = true"
      @dragleave.prevent="isDraggingFile = false"
      @drop.prevent="handleFileDrop"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full md:max-w-5xl md:mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 class="font-bold text-gray-800">📥 批量导入订单</h2>
          <button @click="showImportModal = false" class="text-gray-400 hover:text-gray-600 text-xl cursor-pointer">&times;</button>
        </div>

        <div class="p-6 overflow-y-auto">
          <!-- Step 1: Upload -->
          <div v-if="importStep === 'upload'" class="space-y-4">
            <div class="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-700">
              <p class="font-medium mb-1">📌 使用说明</p>
              <ul class="list-disc list-inside space-y-1 text-xs text-blue-600">
                <li>支持聚水潭导出的Excel（自动识别列名映射）</li>
                <li>也支持手动模板格式（需手动映射列）</li>
                <li>自动去重：已导入的线上订单号会跳过</li>
                <li>自动匹配产品库、解析平台和客服号</li>
              </ul>
            </div>

            <label v-if="!importing" class="cursor-pointer">
              <div
                class="border-2 border-dashed rounded-lg p-8 text-center transition"
                :class="isDraggingFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-400 hover:bg-green-50/30'"
              >
                <div class="text-3xl mb-2">📁</div>
                <div class="text-sm text-gray-600">点击选择 Excel 文件，或拖拽到此处</div>
                <div class="text-xs text-gray-400 mt-1">支持 .xlsx / .xls，自动识别聚水潭/抖店后台格式</div>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                class="hidden"
                @change="handleFileSelect"
              />
            </label>
            <div v-else class="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50/50">
              <div class="text-3xl mb-2 animate-pulse">📊</div>
              <div class="text-sm text-blue-600 font-medium">正在解析文件...</div>
              <div class="text-xs text-blue-400 mt-1">大文件可能需要几十秒，请耐心等待</div>
            </div>

            <div v-if="importError" class="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">
              ⚠️ {{ importError }}
            </div>
          </div>

          <!-- Step 2: Preview & Select (聚水潭模式) -->
          <div v-if="importStep === 'preview'" class="space-y-4">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <h3 class="text-sm font-semibold text-gray-700">
                👁️ 数据预览
                <span v-if="importFormat" class="text-xs text-green-600 ml-1">（{{ getFormatLabel(importFormat) }}）</span>
              </h3>
              <div class="flex items-center gap-3 text-xs">
                <label class="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" :checked="isAllPreviewSelected" @change="toggleAllPreviewSelection" class="rounded cursor-pointer">
                  <span>全选</span>
                </label>
                <span class="text-green-600">已选 {{ selectedPreviewCount }} / {{ jstPreviewOrders.length }} 条</span>
              </div>
            </div>

            <!-- 过滤和统计 -->
            <div class="flex items-center gap-2 flex-wrap">
              <input
                v-model="previewFilter"
                placeholder="搜索产品/收货人..."
                class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs w-40 outline-none focus:ring-1 focus:ring-green-500"
              />
              <select v-model="previewStatusFilter" class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white outline-none cursor-pointer">
                <option value="">全部状态</option>
                <option value="completed">已完成/已发货</option>
                <option value="cancelled">已取消</option>
                <option value="pending">售后中/待发货</option>
              </select>
              <select v-model="previewPlatformFilter" class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white outline-none cursor-pointer">
                <option value="">全部平台</option>
                <option value="kuaishou">快手</option>
                <option value="douyin">抖店</option>
                <option value="weixin_video">视频号</option>
                <option value="taobao">淘宝</option>
              </select>
              <span class="text-xs text-gray-400">合计金额: ¥{{ previewTotalAmount }}</span>
            </div>

            <!-- 预览表格 -->
            <div class="border border-gray-200 rounded-lg overflow-hidden">
              <div class="overflow-x-auto max-h-[45vh] overflow-y-auto">
                <table class="w-full text-xs">
                  <thead class="sticky top-0 z-10">
                    <tr class="bg-gray-50 text-gray-600">
                      <th class="px-2 py-2 text-center w-8"><input type="checkbox" :checked="isAllPreviewSelected" @change="toggleAllPreviewSelection" class="rounded cursor-pointer"></th>
                      <th class="px-2 py-2 text-left font-medium">行号</th>
                      <th class="px-2 py-2 text-left font-medium">产品名称</th>
                      <th class="px-2 py-2 text-right font-medium">金额</th>
                      <th class="px-2 py-2 text-center font-medium">数量</th>
                      <th v-if="canSeeCost" class="px-2 py-2 text-right font-medium">成本</th>
                      <th class="px-2 py-2 text-left font-medium">收货人</th>
                      <th class="px-2 py-2 text-left font-medium">地区</th>
                      <th class="px-2 py-2 text-center font-medium">平台</th>
                      <th class="px-2 py-2 text-center font-medium">状态</th>
                      <th class="px-2 py-2 text-left font-medium">店铺</th>
                      <th class="px-2 py-2 text-center font-medium">产品匹配</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="order in filteredPreviewOrders"
                      :key="order._rowIdx"
                      class="border-t border-gray-100 hover:bg-green-50/30"
                      :class="{ 'opacity-40': !order._selected }"
                    >
                      <td class="px-2 py-1.5 text-center">
                        <input type="checkbox" v-model="order._selected" class="rounded cursor-pointer">
                      </td>
                      <td class="px-2 py-1.5 text-gray-400">{{ order._rowIdx }}</td>
                      <td class="px-2 py-1.5 text-gray-800 max-w-[120px] truncate" :title="order.product_name">{{ order.product_name || '—' }}</td>
                      <td class="px-2 py-1.5 text-right text-green-600 font-medium whitespace-nowrap">{{ formatMoney(order.amount) }}</td>
                      <td class="px-2 py-1.5 text-center text-gray-600">{{ order.quantity }}</td>
                      <td class="px-2 py-1.5 text-right text-gray-500">{{ order.unit_cost > 0 ? '¥' + order.unit_cost.toFixed(2) : '—' }}</td>
                      <td class="px-2 py-1.5 text-gray-800 max-w-[80px] truncate" :title="order.customer_name">{{ order.customer_name || '—' }}</td>
                      <td class="px-2 py-1.5 text-gray-500 max-w-[100px] truncate" :title="[order.province, order.city, order.district].filter(Boolean).join(' ')">
                        {{ [order.province, order.city, order.district].filter(Boolean).join(' ') || '—' }}
                      </td>
                      <td class="px-2 py-1.5 text-center">
                        <span class="px-1.5 py-0.5 rounded text-[10px]" :class="platformTagClass(order.platform)">{{ platformLabel(order.platform) }}</span>
                      </td>
                      <td class="px-2 py-1.5 text-center">
                        <span class="px-1.5 py-0.5 rounded text-[10px]" :class="order.status === 'cancelled' ? 'bg-gray-100 text-gray-500' : order.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'">{{ order.status_raw }}</span>
                      </td>
                      <td class="px-2 py-1.5 text-gray-400 max-w-[100px] truncate" :title="order.store_name">{{ order.store_name }}</td>
                      <td class="px-2 py-1.5 text-center">
                        <div v-if="order._matchedProduct" class="text-left">
                          <div class="text-green-600 text-[10px] truncate" title="匹配: {{ order._matchedProduct.name }}">✓ {{ order._matchedProduct.name }}</div>
                          <div v-if="canSeeCost" class="text-[10px] text-gray-400">成本 ¥{{ Number(order._matchedProduct.cost_price || 0).toFixed(0) }}</div>
                        </div>
                        <span v-else class="text-gray-300">—</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 统计 -->
            <div class="flex items-center justify-between text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              <span>已跳过重复/无效: {{ jstSkippedCount }} 条</span>
              <span>已选 {{ selectedPreviewCount }} 条，总金额 ¥{{ selectedPreviewTotalAmount }}</span>
            </div>

            <div class="flex gap-3 pt-2">
              <button
                @click="importStep = 'upload'; jstPreviewOrders = []; jstSkippedCount = 0"
                class="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                ← 重新上传
              </button>
              <button
                @click="showImportModal = false; resetImport()"
                class="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                取消
              </button>
              <button
                @click="handleImport"
                :disabled="selectedPreviewCount === 0 || importing"
                class="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
              >
                {{ importing ? '⏳ 导入中...' : `✅ 确认导入 ${selectedPreviewCount} 条订单` }}
              </button>
            </div>
          </div>

          <!-- Step 3: Results -->
          <div v-if="importStep === 'result'" class="space-y-4">
            <div class="text-center py-4">
              <div class="text-4xl mb-3">🎉</div>
              <h3 class="text-lg font-bold text-gray-800 mb-2">导入完成</h3>
              <div class="flex items-center justify-center gap-6">
                <div class="text-center">
                  <div class="text-2xl font-bold text-green-600">{{ importResult.success }}</div>
                  <div class="text-xs text-gray-400">成功</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-yellow-500">{{ importResult.duplicate }}</div>
                  <div class="text-xs text-gray-400">跳过（重复）</div>
                </div>
                <div v-if="importResult.failures.length > 0" class="text-center">
                  <div class="text-2xl font-bold text-red-500">{{ importResult.failures.length }}</div>
                  <div class="text-xs text-gray-400">失败</div>
                </div>
              </div>
            </div>

            <div v-if="importResult.failures.length > 0" class="bg-red-50 border border-red-100 rounded-lg p-3">
              <div class="text-xs font-medium text-red-600 mb-2">失败的订单：</div>
              <div class="space-y-1 max-h-32 overflow-y-auto">
                <div v-for="(fail, idx) in importResult.failures" :key="idx" class="text-xs text-red-500">
                  第 {{ fail.row }} 行：{{ fail.product_name || fail.customer_name }} — {{ fail.message }}
                </div>
              </div>
            </div>

            <div class="flex justify-center pt-2">
              <button
                @click="showImportModal = false; resetImport()"
                class="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 cursor-pointer transition"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { useOrderStore } from '../stores/orders'
import { useProductStore } from '../stores/products'
import { useAccountStore } from '../stores/accounts'
import { formatMoney, PRODUCT_CATEGORIES, ORDER_STATUS, ORDER_SOURCE as ORDER_SOURCE_LABELS, toast, formatDate, debounce, PRODUCT_ITEM_CATEGORIES } from '../lib/utils'
import { parseOrderText, parsedToForm } from '../lib/orderParser'
import { parseExcelFile, autoMatchColumns, downloadTemplate, mapRowsToOrders, IMPORT_FIELDS } from '../lib/excelImporter'
import { parseJstExcel, parseDoudianExcel, detectExcelFormat, getFormatLabel, autoMatchJstColumns, autoMatchDoudianColumns, mapJstRowsToOrders, mapDoudianRowsToOrders, matchProduct } from '../lib/excelOrderImporter'
import { randomPick, randomPhone, randomName, randomAddress, randomAmount, PRODUCT_CATEGORIES_LIST, PRODUCT_NAMES_BY_CATEGORY } from '../lib/testDataHelper'
import { usePermission } from '../composables/usePermission'
import Skeleton from '../components/Skeleton.vue'
import GiftSelector from '../components/GiftSelector.vue'

// ---------- permission ----------
const { canDelete, canSeeCost, isAdmin: permIsAdmin, loadRole } = usePermission()

// ---------- stores ----------
const authStore = useAuthStore()
const orderStore = useOrderStore()
const productStore = useProductStore()
const accountStore = useAccountStore()

// ---------- permissions ----------
const isFinance = computed(() => authStore.isFinance)
const isAdmin = computed(() => authStore.isAdmin)
const canEdit = computed(() => isAdmin.value || isFinance.value || authStore.isSales)
const canCreate = computed(() => isAdmin.value || isFinance.value || authStore.isSales || authStore.isCS)

// ---------- text mode ----------
const showTextMode = ref(false)
const rawText = ref('')
const parsedOrders = ref([])
const orderAccountOptions = ref([])
const accountDropdownOpen = ref(false)
const submittingAll = ref(false)
const parsedTotalAmount = computed(() => parsedOrders.value.reduce((sum, o) => sum + (Number(o.amount) || 0), 0))
const parseError = ref('')
const showQuickAddAccount = ref(false)
const quickAccountForm = reactive({ short_name: '', payment_alias: '', platform: 'other' })

// 收款账户搜索
const filteredAccounts = computed(() => {
  const kw = (form.accountSearch || '').trim().toLowerCase()
  if (!kw) return orderAccountOptions.value
  return orderAccountOptions.value.filter(a =>
    (a.short_name || '').toLowerCase().includes(kw) ||
    (a.code || '').toLowerCase().includes(kw) ||
    (a.payment_alias || '').toLowerCase().includes(kw)
  )
})
const selectedAccountDisplay = computed(() => {
  if (!form.account_id) return ''
  const acc = orderAccountOptions.value.find(a => a.id === form.account_id)
  return acc ? `¥${Number(acc.balance || 0).toFixed(0)}` : ''
})
function selectAccount(acc) {
  form.account_id = acc.id
  form.accountSearch = ''
  accountDropdownOpen.value = false
}
function getAccountLabel(accountId) {
  if (!accountId) return '搜索账户'
  const acc = orderAccountOptions.value.find(a => a.id === accountId)
  return acc ? `${acc.short_name || acc.code}（¥${Number(acc.balance || 0).toFixed(0)}）` : '未匹配'
}
function filterAccountsBySearch(kw) {
  kw = (kw || '').trim().toLowerCase()
  if (!kw) return orderAccountOptions.value
  return orderAccountOptions.value.filter(a =>
    (a.short_name || '').toLowerCase().includes(kw) ||
    (a.code || '').toLowerCase().includes(kw) ||
    (a.payment_alias || '').toLowerCase().includes(kw)
  )
}

async function quickCreateAccount() {
  const name = quickAccountForm.short_name.trim()
  if (!name) { toast('请输入账户简称', 'warning'); return }
  try {
    const payload = {
      short_name: name, code: name, platform: quickAccountForm.platform,
      payment_alias: quickAccountForm.payment_alias?.trim() || null,
    }
    await accountStore.createAccount(payload)
    accountStore._forceRefresh = true
    await accountStore.fetchAccounts()
    orderAccountOptions.value = accountStore.getActiveAccounts().map(a => ({
      id: a.id, short_name: a.short_name || a.code, balance: a.balance,
    }))
    showQuickAddAccount.value = false
    quickAccountForm.short_name = ''
    quickAccountForm.payment_alias = ''
    toast(`账户「${name}」创建成功`, 'success')
  } catch (e) {
    toast('创建失败: ' + (e.message || ''), 'error')
  }
}

async function handleParse() {
  parseError.value = ''
  if (!rawText.value.trim()) return
  try {
    const orders = parseOrderText(rawText.value)
    // 对每个订单自动匹配收款账户
    let activeAccs = accountStore.getActiveAccounts()
    const accNames = activeAccs
      .flatMap(a => {
        const names = [(a.short_name || a.code)].filter(Boolean)
        if (a.payment_alias) names.push(a.payment_alias)
        return names.map(n => ({ name: n, accountId: a.id, label: a.short_name || a.code }))
      })
      .filter(Boolean)
      .sort((a, b) => b.name.length - a.name.length)

    // 需要自动创建的客服号→收款账户映射
    const autoCreateQueue = []

    for (const order of orders) {
      const line = order._rawText || ''
      let matched = false
      for (const { name, accountId, label } of accNames) {
        if (line.includes(name)) {
          order.account_id = accountId
          order.account_label = label
          matched = true
          break
        }
      }
      // 没匹配到但有 account_keyword（人名+平台，如"太泰有赞"）→ 自动创建
      if (!matched && order.account_keyword) {
        const newShortName = order.account_keyword
        if (!autoCreateQueue.find(q => q.short_name === newShortName)) {
          const exists = accountStore.accounts.find(a => (a.short_name || a.code) === newShortName)
          if (!exists) {
            autoCreateQueue.push({
              short_name: newShortName,
              platform: order.platform === 'wechat' ? 'wechat' : order.platform === 'alipay' ? 'alipay' : order.platform === 'youzan' ? 'youzan' : 'other',
            })
          }
        }
        order._pendingAccountName = newShortName
      }
    }

    // 批量自动创建缺失的收款账户
    for (const item of autoCreateQueue) {
      try {
        const { data } = await accountStore.createAccount({
          short_name: item.short_name,
          code: item.short_name,
          platform: item.platform,
          balance: 0,
          opening_balance: 0,
          status: 'active',
        })
        // 刷新账户列表，更新 accNames
        accountStore._forceRefresh = true
        await accountStore.fetchAccounts()
        activeAccs = accountStore.getActiveAccounts()
        toast(`自动创建收款账户：${item.short_name}`, 'success')
      } catch (e) {
        console.warn('自动创建账户失败:', item.short_name, e)
      }
    }

    // 重新匹配（新建的账户也能匹配到）
    const refreshedAccs = accountStore.getActiveAccounts()
    const refreshedNames = refreshedAccs
      .flatMap(a => {
        const names = [(a.short_name || a.code)].filter(Boolean)
        if (a.payment_alias) names.push(a.payment_alias)
        return names.map(n => ({ name: n, accountId: a.id, label: a.short_name || a.code }))
      })
      .filter(Boolean)
      .sort((a, b) => b.name.length - a.name.length)

    for (const order of orders) {
      if (order.account_id) continue
      const line = order._rawText || ''
      for (const { name, accountId, label } of refreshedNames) {
        if (line.includes(name)) {
          order.account_id = accountId
          order.account_label = label
          break
        }
      }
    }

    if (orders.length === 0) {
      parseError.value = '未能解析出任何订单，请检查文本格式'
      parsedOrders.value = []
      return
    }
    parsedOrders.value = orders
    // 更新下拉选项
    orderAccountOptions.value = accountStore.getActiveAccounts().map(a => ({
      id: a.id,
      short_name: a.short_name || a.code,
      balance: a.balance,
    }))
  } catch (e) {
    console.error('解析失败:', e)
    parseError.value = '解析出错: ' + (e.message || '未知错误')
    parsedOrders.value = []
  }
}

function applyOrder(idx) {
  const order = parsedOrders.value[idx]
  if (!order) return
  const formData = parsedToForm(order)
  Object.assign(form, formData)
  // 如果解析出多个产品，填充到productItems
  if (order.products && order.products.length > 0) {
    form.productItems = order.products.map(p => ({
      name: p.name || '',
      qty: p.qty || 1,
      unit_cost: 0,
      sale_price: 0,
      product_id: null,
      is_gift: false,
    }))
    // 自动识别产品类型
    const firstProduct = order.products[0].name || ''
    const category = guessProductCategory(firstProduct)
    if (category) form.product_category = category
  } else if (formData.product_name) {
    form.productItems = [{ name: formData.product_name, qty: 1, unit_cost: 0, sale_price: 0, product_id: null, is_gift: false }]
  }
  // 如果解析出的客服号匹配已有客服号，预选上
  if (formData.service_number && availableServiceNumbers.value.some(sn => sn.code === formData.service_number)) {
    form.service_number = formData.service_number
  }
  showTextMode.value = false
  showModal.value = true
  editingOrder.value = null
  toast('已填入订单表单，请确认后提交', 'success')
}

async function submitAllParsedOrders() {
  submittingAll.value = true
  let success = 0
  let failed = 0
  for (const order of parsedOrders.value) {
    try {
      const payload = {
        service_number_code: order.service_number || null,
        payment_method: order.payment_method || null,
        customer_name: order.customer_name || null,
        customer_phone: order.customer_phone || null,
        customer_address: order.customer_address || null,
        product_category: order.product_category || null,
        product_name: order.product_name || null,
        amount: Number(order.amount) || 0,
        note: order.note || '',
        status: 'completed',
        account_id: order.account_id || null,
      }
      await orderStore.createOrder(payload)
      success++
    } catch (e) {
      failed++
      console.error('订单提交失败:', e)
    }
  }
  submittingAll.value = false
  await orderStore.fetchOrders()
  parsedOrders.value = []
  rawText.value = ''
  toast(`已提交 ${success} 条订单${failed > 0 ? `，${failed} 条失败` : ''}`, failed > 0 ? 'warning' : 'success')
}

// ---------- CSV export ----------
async function handleExportOrders() {
  try {
    toast('正在导出...', 'info')
    const safeKeyword = (filters.keyword || '').replace(/[,%().*]/g, '')
    let query = supabase
      .from('orders')
      .select('id, order_no, customer_name, product_name, amount, status, created_at, order_source, service_number_code, note, product_category, sales_profile:sales_id(name)')
      .order('created_at', { ascending: false })
      .limit(5000)

    if (safeKeyword) {
      const field = filters.searchField
      if (field && field !== 'account_name') {
        if (field === 'account_code' || field === 'customer_name' || field === 'product_name' || field === 'order_no' || field === 'note' || field === 'service_number_code') {
          query = query.ilike(field, `%${safeKeyword}%`)
        }
      } else {
        const { data: matchedAccounts } = await supabase
          .from('accounts')
          .select('id')
          .or(`short_name.ilike.%${safeKeyword}%,code.ilike.%${safeKeyword}%`)
          .limit(50)
        const accIds = (matchedAccounts || []).map(a => a.id)
        if (accIds.length > 0) {
          query = query.or(`customer_name.ilike.%${safeKeyword}%,product_name.ilike.%${safeKeyword}%,order_no.ilike.%${safeKeyword}%,note.ilike.%${safeKeyword}%,account_id.in.(${accIds.join(',')})`)
        } else {
          query = query.or(`customer_name.ilike.%${safeKeyword}%,product_name.ilike.%${safeKeyword}%,order_no.ilike.%${safeKeyword}%,note.ilike.%${safeKeyword}%`)
        }
      }
    }
    if (filters.category) query = query.eq('product_category', filters.category)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom)
    if (filters.dateTo) query = query.lte('created_at', filters.dateTo + 'T23:59:59')

    const { data, error } = await query
    if (error) throw error
    const rows = data || []

    const header = ['订单号', '客户名', '产品名称', '金额', '状态', '日期', '平台', '客服号', '备注']
    const body = rows.map(o => [
      o.order_no || '',
      o.customer_name || '',
      o.product_name || '',
      Number(o.amount).toFixed(2),
      ORDER_STATUS[o.status]?.label || o.status || '',
      formatDate(o.created_at),
      ORDER_SOURCE_LABELS[o.order_source] || o.order_source || '',
      o.service_number_code || '',
      o.note || '',
    ])

    const BOM = '\uFEFF'
    const csv = BOM + [header, ...body].map(row =>
      row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
    ).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    const today = new Date().toISOString().slice(0, 10)
    link.download = `订单_${today}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    toast(`已导出 ${rows.length} 条数据`, 'success')
  } catch (e) {
    console.error('导出失败:', e)
    toast('导出失败：' + (e.message || ''), 'error')
  }
}

// ---------- delete ----------
const selectedOrders = ref([])
const canDeleteOrders = computed(() => isAdmin.value || isFinance.value || authStore.isSales)
const isAllSelected = computed(() => orderStore.orders.length > 0 && selectedOrders.value.length === orderStore.orders.length)

function toggleSelectAll(e) {
  if (e.target.checked) {
    selectedOrders.value = orderStore.orders.map(o => o.id)
  } else {
    selectedOrders.value = []
  }
}

function canDeleteOrder(order) {
  if (isAdmin.value || isFinance.value) return true
  if (authStore.isSales) {
    return order.created_by === authStore.profile?.id
  }
  return false
}

// ---------- stats ----------
const stats = reactive({ todayCount: 0, monthCount: 0, monthAmount: 0 })

// --- 今日订单数据 ---
const todayOrdersData = reactive({ orderCount: 0, orderTotal: 0, refundCount: 0, refundTotal: 0, loaded: false })

async function loadTodayOrdersData() {
  try {
    const now = new Date()
    let dayStart
    if (now.getHours() < 6) {
      dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 6, 0, 0)
    } else {
      dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0)
    }
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)
    const startISO = dayStart.toISOString()
    const endISO = dayEnd.toISOString()

    const [orderRes, refundRes] = await Promise.all([
      supabase
        .from('orders')
        .select('amount')
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .is('deleted_at', null),
      supabase
        .from('refunds')
        .select('refund_amount')
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .is('deleted_at', null),
    ])

    const orders = orderRes.data || []
    const refunds = refundRes.data || []
    todayOrdersData.orderCount = orders.length
    todayOrdersData.orderTotal = orders.reduce((s, r) => s + (Number(r.amount) || 0), 0)
    todayOrdersData.refundCount = refunds.length
    todayOrdersData.refundTotal = refunds.reduce((s, r) => s + (Number(r.refund_amount) || 0), 0)
    todayOrdersData.loaded = true
  } catch (e) {
    console.error('加载今日订单数据失败:', e)
  }
}

async function loadStats() {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`

  try {
    // Today count
    const { count: todayCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStr)
      .lt('created_at', todayStr + 'T23:59:59')
      .eq('status', 'completed')

    // Month count
    const { count: monthCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', monthStart)
      .eq('status', 'completed')

    // Month sum
    const { data: monthData } = await supabase
      .from('orders')
      .select('amount')
      .gte('created_at', monthStart)
      .eq('status', 'completed')

    stats.todayCount = todayCount || 0
    stats.monthCount = monthCount || 0
    stats.monthAmount = (monthData || []).reduce((s, r) => s + (Number(r.amount) || 0), 0)
  } catch (e) {
    console.error('加载统计失败:', e)
    // RLS or network error — show 0, not NaN
    stats.todayCount = 0
    stats.monthCount = 0
    stats.monthAmount = 0
  }
}

// ---------- filters ----------
const filters = reactive({
  keyword: '',
  searchField: '',
  category: '',
  status: '',
  dateFrom: '',
  dateTo: '',
})

// Watch filters for auto-reload (debounced)
const debouncedLoad = debounce(() => loadOrders(), 300)
watch(
  () => [filters.category, filters.status, filters.dateFrom, filters.dateTo],
  () => debouncedLoad()
)

// ---------- load orders ----------
async function loadOrders() {
  // 转义搜索关键词，防止 PostgREST 注入
  const safeKeyword = (filters.keyword || '').replace(/[,%().*]/g, '')
  await orderStore.fetchOrders({
    keyword: safeKeyword || undefined,
    searchField: filters.searchField || undefined,
    category: filters.category || undefined,
    status: filters.status || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    page: orderStore.pagination.page,
    pageSize: orderStore.pagination.pageSize,
  })
}

// ---------- service numbers ----------
const serviceNumbers = ref([])
const snSearch = ref('')
const snDropdownOpen = ref(false)

const PAYMENT_METHODS = [
  { value: 'wechat', label: '微信收款' },
  { value: 'alipay', label: '支付宝' },
  { value: 'bank_transfer', label: '银行卡转账' },
  { value: 'taobao', label: '淘宝' },
  { value: 'douyin', label: '抖音小店' },
  { value: 'cash', label: '现金' },
  { value: 'other', label: '其他' },
]

const paymentMethodLabels = {
  wechat: '微信收款', alipay: '支付宝', bank_transfer: '银行卡转账',
  taobao: '淘宝', douyin: '抖音小店', cash: '现金', other: '其他',
}

const paymentMethodColors = {
  wechat: 'bg-green-50 text-green-700', alipay: 'bg-blue-50 text-blue-700',
  bank_transfer: 'bg-gray-100 text-gray-700', taobao: 'bg-orange-50 text-orange-700',
  douyin: 'bg-pink-50 text-pink-700', cash: 'bg-emerald-50 text-emerald-700',
  other: 'bg-gray-50 text-gray-600',
}

function paymentMethodLabel(m) { return paymentMethodLabels[m] || m || '' }
function paymentMethodClass(m) { return paymentMethodColors[m] || paymentMethodColors.other }
function getAccountName(accountId) {
  const acc = accountStore.accounts.find(a => a.id === accountId)
  return acc ? (acc.short_name || acc.code) : '未知账户'
}

const availableServiceNumbers = computed(() => {
  const list = serviceNumbers.value
  if (isFinance.value) {
    return list.map(sn => ({
      code: sn.code,
      display: sn.sales_name ? `${sn.code} - ${sn.sales_name}` : `${sn.code} - (未分配)`,
      wechat_name: sn.wechat_name || '',
    }))
  }
  // Sales/CS: only their own, mark with (我的)
  return list.map(sn => ({
    code: sn.code,
    display: sn.sales_id === authStore.profile?.id ? `${sn.code} (我的)` : `${sn.code}`,
    wechat_name: sn.wechat_name || '',
  }))
})

const filteredServiceNumbers = computed(() => {
  if (!snSearch.value) return availableServiceNumbers.value
  const kw = snSearch.value.toLowerCase()
  return availableServiceNumbers.value.filter(sn =>
    sn.code.toLowerCase().includes(kw) || sn.display.toLowerCase().includes(kw) || sn.wechat_name.toLowerCase().includes(kw)
  )
})

const selectedSnDisplay = computed(() => {
  if (!form.service_number) return ''
  const sn = availableServiceNumbers.value.find(s => s.code === form.service_number)
  return sn ? sn.display + (sn.wechat_name ? ` (${sn.wechat_name})` : '') : ''
})

function selectSn(sn) {
  form.service_number = sn.code
  snSearch.value = ''
  snDropdownOpen.value = false
}

function closeSnDropdown() {
  setTimeout(() => { snDropdownOpen.value = false }, 200)
}

async function loadServiceNumbers() {
  try {
    const { data, error } = await supabase.rpc('get_service_numbers')
    if (!error && data) serviceNumbers.value = data
  } catch (e) {
    console.error('加载客服号失败:', e)
  }
}


// ---------- modal ----------
const showModal = ref(false)
const editingOrder = ref(null)
const submitting = ref(false)
const testCount = ref(5)

// 金额浮动相关
const mainProductBasePrice = computed(() => {
  const mainItem = form.productItems.find(i => !i.is_gift && i.product_id)
  return mainItem && mainItem.sale_price > 0 ? mainItem.sale_price : 0
})

const isAmountOutOfRange = computed(() => {
  if (mainProductBasePrice.value <= 0 || !form.amount) return false
  const min = mainProductBasePrice.value * 0.9
  const max = mainProductBasePrice.value * 1.1
  return form.amount < min || form.amount > max
})

// ---------- 随机测试数据生成 ----------
async function generateTestData(count) {
  try {
    let accs = accountStore.getActiveAccounts()
    if (!accs.length) { toast('没有可用账户', 'warning'); return }
    const { data: products } = await supabase.from('products').select('name, category, retail_price').gt('retail_price', 0).limit(500)
    const productList = (products || []).filter(p => Number(p.retail_price) > 0)
    if (!productList.length) { toast('产品库为空', 'warning'); return }
    const { data: sns } = await supabase.from('service_numbers').select('code').eq('status', 'active')
    const snList = (sns || []).map(s => s.code)
    const userId = (await supabase.auth.getSession()).data.session?.user?.id
    const catMap = {
      cue: 'cue', shaft: 'cue', extension: 'cue', jump_break: 'cue',
      tip: 'accessory', chalk: 'accessory', glove: 'accessory', glue: 'accessory',
      rest: 'accessory', towel: 'accessory', maintenance: 'accessory', bag: 'accessory',
      case: 'accessory', accessory: 'accessory', ball: 'accessory', table: 'accessory',
      book: 'other', service: 'other',
    }
    let success = 0
    for (let i = 0; i < count; i++) {
      const product = randomPick(productList)
      const acc = randomPick(accs)
      const { data, error } = await supabase.from('orders').insert({
        customer_name: randomName(),
        customer_phone: randomPhone(),
        customer_address: randomAddress(),
        product_category: catMap[product.category] || 'other',
        product_name: product.name,
        amount: product.retail_price,
        account_id: acc.id,
        service_number_code: snList.length ? randomPick(snList) : null,
        payment_method: randomPick(['wechat', 'alipay', 'bank_transfer']),
        note: '测试数据',
        status: 'completed',
        order_source: 'sales_guided',
        creator_id: userId,
        sales_id: userId,
      }).select().single()
      if (error) { console.warn('订单插入失败:', error.message); continue }
      // 手动更新余额
      let balBefore = null
      let balAfter = null
      try {
        const { useAccountStore } = await import('../stores/accounts')
        const accStore = useAccountStore()
        balBefore = accStore.accounts.find(a => a.id === acc.id)?.balance ?? null
        await accStore.updateBalance(acc.id, Number(product.retail_price))
        balAfter = accStore.accounts.find(a => a.id === acc.id)?.balance ?? null
      } catch (e) { console.warn('余额更新失败:', e) }
      // 操作日志
      try {
        const { logOperation } = await import('../utils/operationLogger')
        const balText = balBefore != null && balAfter != null
          ? `，余额 ${Number(balBefore).toFixed(2)} ${Number(balAfter) > Number(balBefore) ? '+' : '-'} ${Math.abs(Number(balAfter) - Number(balBefore)).toFixed(2)} → ${Number(balAfter).toFixed(2)}`
          : ''
        const accName = acc.short_name || acc.name || ''
        logOperation({
          action: 'create_order',
          module: '订单',
          description: `[测试] 创建订单 ${data.order_no || ''}，金额 ${Number(product.retail_price).toFixed(2)}，产品：${product.name}，客户：${data.customer_name}，账户：${accName}${balText}`,
          detail: { order_id: data.id, order_no: data.order_no, amount: product.retail_price, product: product.name, customer: data.customer_name, account_id: acc.id, account_name: accName, balance_before: balBefore, balance_after: balAfter },
          amount: product.retail_price,
          accountId: acc.id,
          accountName: accName,
        })
      } catch (_) {}
      success++
    }
    await orderStore.fetchOrders()
    toast(`成功生成 ${success} 条测试订单`, 'success')
  } catch (e) {
    console.error(e)
    toast('生成测试数据失败：' + (e.message || ''), 'error')
  }
}

const defaultForm = () => ({
  service_number: '',
  payment_method: 'wechat',
  account_id: '',
  accountSearch: '',
  customer_name: '',
  customer_phone: '',
  customer_address: '',
  product_category: '',
  product_name: '',
  amount: null,
  note: '',
  status: 'completed',
  order_source: 'sales_guided',
  productItems: [{ name: '', qty: 1, unit_cost: 0, sale_price: 0, product_id: null, is_gift: false }],
})

const form = reactive(defaultForm())

// ---------- 产品分类自动识别 ----------
const CATEGORY_KEYWORDS = {
  cue: ['球杆', '前支', '后把', '皮头', '接牙'],
  tip: ['皮头'],
  shaft: ['前支'],
  extension: ['加长把', '接杆'],
  chalk: ['巧粉', '球粉'],
  glove: ['手套'],
  case: ['球杆盒', '杆盒', '球杆箱'],
  bag: ['球杆袋', '球杆包'],
  ball: ['台球', '球'],
  table: ['球桌', '台球桌', '台尼', '桌布'],
  maintenance: ['保养', '维护', '蜡'],
  rest: ['架杆', '十字架'],
  book: ['书', '教材'],
  course: ['课程', '课', '教学'],
  service: ['服务', '维修'],
  accessory: ['配件', '附件', '零件'],
  consumable: ['耗材'],
  jump_break: ['跳球', '冲球'],
  other: [],
}
function guessProductCategory(name) {
  if (!name) return ''
  const n = name.toLowerCase()
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (n.includes(kw)) return cat
    }
  }
  return ''
}

// ---------- 产品明细（多产品） ----------
const productSuggestions = ref([])
const showProductDropdown = ref(false)
let productSearchTimer = null
const activeProductItemIdx = ref(-1)
const productListRef = ref(null)
const dropdownSearchRef = ref(null)
const dropdownSearch = ref('')
const allProductList = ref([]) // 全部产品（按使用频率排序）
const allProductsLoaded = ref(false)

// 下拉内搜索过滤后的产品
const dropdownFilteredProducts = computed(() => {
  let list = allProductList.value
  if (dropdownSearch.value) {
    const kw = dropdownSearch.value.toLowerCase()
    list = list.filter(p =>
      (p.name && p.name.toLowerCase().includes(kw)) ||
      (p.brand && p.brand.toLowerCase().includes(kw))
    )
  }
  return list
})

// 产品搜索下拉定位：基于当前输入框的位置
const productDropdownStyle = computed(() => {
  if (activeProductItemIdx.value < 0) return { display: 'none' }
  const container = productListRef.value
  if (!container) return { display: 'none' }
  const input = container.querySelector(`#product-input-${activeProductItemIdx.value}`)
  if (!input) return { display: 'none' }
  const rect = input.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  return {
    position: 'fixed',
    top: (rect.bottom + 4) + 'px',
    left: rect.left + 'px',
    width: Math.max(rect.width, 320) + 'px',
    minWidth: '320px',
  }
})

/** 加载全部产品（按使用频率排序：被订单引用多的排前面） */
async function loadAllProducts() {
  if (allProductsLoaded.value) return
  try {
    // 查询产品 + 被订单引用次数
    const { data, error } = await supabase
      .from('products')
      .select('id, name, category, brand, cost_price, retail_price, unit, status')
      .eq('status', 'active')
      .order('name')
    if (error) throw error

    // 查询各产品被 order_items 引用的次数
    const { data: stats } = await supabase
      .from('order_items')
      .select('product_id, id')
      .not('product_id', 'is', null)

    const usageCount = {}
    ;(stats || []).forEach(row => {
      usageCount[row.product_id] = (usageCount[row.product_id] || 0) + 1
    })

    // 按使用次数降序排序，同次数按名称排
    allProductList.value = (data || []).sort((a, b) => {
      const aCount = usageCount[a.id] || 0
      const bCount = usageCount[b.id] || 0
      if (bCount !== aCount) return bCount - aCount
      return (a.name || '').localeCompare(b.name || '')
    })
    allProductsLoaded.value = true
  } catch (e) {
    console.error('加载产品列表失败:', e)
    // 降级：用 store 搜索
    const results = await productStore.searchProducts('')
    allProductList.value = results || []
    allProductsLoaded.value = true
  }
}

function addProductItem() {
  form.productItems.push({ name: '', qty: 1, unit_cost: 0, sale_price: 0, product_id: null })
}

function removeProductItem(idx) {
  // 赠品可以删到0，主产品至少保留1个
  const nonGiftCount = form.productItems.filter(i => !i.is_gift).length
  if (!form.productItems[idx].is_gift && nonGiftCount <= 1) return
  form.productItems.splice(idx, 1)
}

async function onItemNameInput(idx) {
  activeProductItemIdx.value = idx
  const name = form.productItems[idx].name
  // 任何状态都打开下拉（空输入也打开，显示全部产品）
  dropdownSearch.value = name || ''
  showProductDropdown.value = true
  await loadAllProducts()
}

function selectProduct(p) {
  const idx = activeProductItemIdx.value
  if (idx >= 0 && idx < form.productItems.length) {
    // 1. 清掉该位置后面原有的赠品行
    let removeIdx = idx + 1
    while (removeIdx < form.productItems.length && form.productItems[removeIdx].is_gift) {
      form.productItems.splice(removeIdx, 1)
    }

    // 2. 更新主产品信息
    form.productItems[idx].name = p.name
    form.productItems[idx].product_id = p.id
    form.productItems[idx].unit_cost = Number(p.cost_price) || 0
    form.productItems[idx].sale_price = Number(p.retail_price) || 0

    // 3. 更新产品类型（始终跟随主产品）
    if (p.category) {
      form.product_category = p.category
    }

    // 4. 更新金额（有售价就填充，无论之前有没有值）
    if (Number(p.retail_price) > 0) {
      form.amount = Number(p.retail_price)
    } else {
      form.amount = 0
    }

    // 5. 自动带出新产品的套装赠品
    autoLoadBundleGifts(idx, p.id)
  }
  showProductDropdown.value = false
  dropdownSearch.value = ''
  activeProductItemIdx.value = -1
}

// ========== 赠品系统 ==========
const showGiftModal = ref(false)
const giftModalProduct = ref({}) // 当前选赠品的主产品
let giftModalTargetIdx = -1

/** 打开赠品选择弹窗 */
async function openGiftSelector(idx) {
  giftModalTargetIdx = idx
  const item = form.productItems[idx]

  // 尝试加载已有套装赠品
  let existingGifts = []
  if (item.product_id) {
    try {
      const bundle = await productStore.fetchBundleForProduct(item.product_id)
      if (bundle && bundle.gifts && bundle.gifts.length > 0) {
        existingGifts = bundle.gifts
      }
    } catch (e) {
      // 静默处理，可能是首次配置
    }
  }

  giftModalProduct.value = {
    product_id: item.product_id,
    name: item.name,
    unit_cost: item.unit_cost,
    existingGifts,
  }
  showGiftModal.value = true
}

/** 赠品确认回调 */
function onGiftsConfirmed({ gifts, saveAsDefault }) {
  if (gifts.length === 0) return
  const targetIdx = giftModalTargetIdx
  const mainItem = form.productItems[targetIdx]

  // 移除该主产品后面已有的赠品行
  let insertIdx = targetIdx + 1
  // 找到主产品后连续的赠品行
  while (insertIdx < form.productItems.length && form.productItems[insertIdx].is_gift) {
    form.productItems.splice(insertIdx, 1)
  }

  // 插入新赠品
  gifts.forEach((g, i) => {
    form.productItems.splice(insertIdx + i, 0, {
      name: g.product_name,
      qty: g.quantity,
      unit_cost: g.cost_price,
      sale_price: 0,
      product_id: g.product_id,
      is_gift: true,
    })
  })

  showGiftModal.value = false

  // 保存为默认套装
  if (saveAsDefault && mainItem.product_id) {
    productStore.saveBundle(mainItem.product_id, gifts, null, authStore.user?.id)
      .catch(e => console.error('保存套装失败:', e))
  }
}

/** 自动带出套装赠品（选择产品时调用） */
async function autoLoadBundleGifts(itemIdx, productId) {
  try {
    const bundle = await productStore.fetchBundleForProduct(productId)
    if (bundle && bundle.gifts && bundle.gifts.length > 0) {
      // 移除该位置后面已有的赠品行
      let insertIdx = itemIdx + 1
      while (insertIdx < form.productItems.length && form.productItems[insertIdx].is_gift) {
        form.productItems.splice(insertIdx, 1)
      }
      // 插入赠品
      bundle.gifts.forEach((g, i) => {
        form.productItems.splice(insertIdx + i, 0, {
          name: g.product_name,
          qty: g.quantity,
          unit_cost: g.cost_price,
          sale_price: 0,
          product_id: g.product_id,
          is_gift: true,
        })
      })
      toast(`已自动带入 ${bundle.gifts.length} 个赠品`, 'success')
    }
  } catch (e) {
    // 静默处理，不阻塞操作
    console.log('无套装或加载失败:', e.message)
  }
}

function onProductBlur() {
  setTimeout(() => {
    showProductDropdown.value = false
    dropdownSearch.value = ''
  }, 200)
}

function clearProductLink() {
  // no-op for multi-item
}

function openModal(order = null) {
  editingOrder.value = order
  if (order) {
    Object.assign(form, {
      service_number: order.service_number_code || '',
      payment_method: order.payment_method || 'wechat',
      account_id: order.account_id || '',
      customer_name: order.customer_name || '',
      customer_phone: order.customer_phone || '',
      customer_address: order.customer_address || '',
      product_category: order.product_category || '',
      product_name: order.product_name || '',
      amount: order.amount,
      note: order.note || '',
      status: order.status || 'completed',
      productItems: order.product_name ? [{ name: order.product_name, qty: 1, unit_cost: 0, sale_price: 0, product_id: null, is_gift: false }] : [],
    })
    // 加载订单已有产品明细
    if (order.id) {
      supabase.from('order_items').select('*').eq('order_id', order.id).then(({ data }) => {
        if (data && data.length > 0) {
          form.productItems = data.map(d => ({
            name: d.product_name || '',
            qty: d.quantity || 1,
            unit_cost: d.unit_cost || 0,
            sale_price: d.sale_price || 0,
            product_id: d.product_id || null,
            is_gift: !!d.is_gift,
          }))
        }
      })
    }
  } else {
    Object.assign(form, defaultForm())
  }
  showModal.value = true
  snSearch.value = ''
  snDropdownOpen.value = false
  form.accountSearch = ''
  accountDropdownOpen.value = false
}
async function autoFillCustomer() {
  const phone = form.customer_phone?.trim()
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) return
  try {
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name, phone, address')
      .eq('phone', phone)
      .limit(1)
    if (customers?.length > 0) {
      const c = customers[0]
      if (c.name && !form.customer_name) form.customer_name = c.name
      if (c.address && !form.customer_address) form.customer_address = c.address
      toast(`已匹配老客户：${c.name}`, 'info')
    }
  } catch (_) {}
}

// 列表模式下某行的自动填充
async function autoFillRowCustomer(order) {
  const phone = order.customer_phone?.trim()
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) return
  try {
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name, phone, address')
      .eq('phone', phone)
      .limit(1)
    if (customers?.length > 0) {
      const c = customers[0]
      if (c.name && !order.customer_name) order.customer_name = c.name
      if (c.address && !order.customer_address) order.customer_address = c.address
    }
  } catch (_) {}
}


async function handleSubmit() {
  // 电话格式校验
  if (form.customer_phone && !/^1[3-9]\d{9}$/.test(form.customer_phone)) {
    toast('请输入正确的11位手机号', 'error')
    return
  }

  // 金额浮动校验：有售价的主产品，业务员只能在售价的10%范围内调整
  const mainItem = form.productItems.find(i => !i.is_gift && i.product_id)
  if (mainItem && mainItem.sale_price > 0 && form.amount > 0) {
    const basePrice = mainItem.sale_price
    const minPrice = basePrice * 0.9
    const maxPrice = basePrice * 1.1
    if (form.amount < minPrice || form.amount > maxPrice) {
      const isAdminOrFinance = ['admin', 'finance', 'manager'].includes(authStore.profile?.role)
      if (!isAdminOrFinance) {
        const diff = form.amount < basePrice ? basePrice - form.amount : form.amount - basePrice
        toast(`售价浮动超出限制（±${(basePrice * 0.1).toFixed(0)}元），当前偏差 ¥${diff.toFixed(0)}，请联系经理审批`, 'error')
        return
      }
    }
  }
  submitting.value = true
  try {
    const payload = {
      service_number_code: form.service_number,
      payment_method: form.payment_method,
      account_id: form.account_id || null,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      customer_address: form.customer_address,
      product_category: form.product_category,
      product_name: form.product_name,
      amount: form.amount,
      note: form.note,
    }

    let orderId
    if (editingOrder.value) {
      if (isFinance.value) payload.status = form.status
      const updated = await orderStore.updateOrder(editingOrder.value.id, payload)
      orderId = updated.id
      toast('订单已更新', 'success')
    } else {
      payload.status = 'completed'
      const created = await orderStore.createOrder(payload)
      orderId = created.id
      toast('订单已创建', 'success')
    }

    // 创建 order_items 记录（关联产品库）
    const mainProduct = form.productItems.find(i => i.name)
    if (mainProduct) {
      // 更新订单的主产品名
      await supabase.from('orders').update({
        product_name: form.productItems.map(i => i.name || '').filter(Boolean).join('、'),
      }).eq('id', orderId)

      for (const item of form.productItems) {
        if (!item.name) continue
        try {
          const rowData = {
            order_id: orderId,
            product_name: item.name,
            quantity: item.qty || 1,
            unit_cost: item.unit_cost || 0,
            is_gift: !!item.is_gift,
            sale_price: item.is_gift ? 0 : (item.sale_price || 0),
          }
          if (item.product_id) rowData.product_id = item.product_id
          await supabase.from('order_items').insert(rowData)
        } catch (e) {
          console.warn('创建订单明细失败:', e)
        }
      }

      // 回写产品库：首次填写的金额自动更新 retail_price
      const mainItem = form.productItems.find(i => !i.is_gift && i.product_id && i.name)
      if (mainItem && form.amount > 0) {
        try {
          const { data: existing } = await supabase
            .from('products')
            .select('retail_price')
            .eq('id', mainItem.product_id)
            .single()

          if (!existing.retail_price || Number(existing.retail_price) === 0) {
            // 产品没有零售价 → 首次设置，直接回写
            await supabase.from('products').update({
              retail_price: form.amount,
              price_status: 'pending', // 标记为待确认
            }).eq('id', mainItem.product_id)
          }
        } catch (e) {
          console.warn('回写零售价失败:', e)
        }
      }
    }

    showModal.value = false
    loadStats()
    loadOrders()
    // 同步客户数据到客户管理
    supabase.rpc('sync_customers_from_orders').then(() => {})
  } catch (e) {
    console.error(e)
    toast(e.message || '操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

// ---------- actions ----------
async function handleConfirmPayment(order) {
  if (!confirm(`确认已收到款项 ¥${Number(order.amount).toLocaleString()}？\n\n客户：${order.customer_name}\n产品：${order.product_name}`)) return
  try {
    const { error } = await supabase.from('orders').update({ status: 'completed' }).eq('id', order.id)
    if (error) throw error
    order.status = 'completed'
    toast('已确认收款', 'success')
    loadOrders()
  } catch (e) {
    toast('操作失败：' + (e.message || ''), 'error')
  }
}

async function handleCancel(order) {
  if (!confirm('确定要取消此订单吗？')) return
  try {
    await orderStore.updateOrder(order.id, { status: 'cancelled' })
    toast('订单已取消', 'success')
    loadStats()
    loadOrders()
  } catch (e) {
    toast(e.message || '操作失败', 'error')
  }
}

async function handleDelete(order) {
  if (!confirm('确定要删除此订单吗？此操作不可恢复。')) return
  try {
    await orderStore.deleteOrder(order)
    toast('订单已删除', 'success')
    selectedOrders.value = selectedOrders.value.filter(id => id !== order.id)
    loadStats()
    loadOrders()
  } catch (e) {
    toast(e.message || '操作失败', 'error')
  }
}

async function handleBatchDelete() {
  if (!confirm(`确定要删除选中的 ${selectedOrders.value.length} 条订单吗？`)) return
  try {
    const { data, error } = await supabase.rpc('batch_delete_orders', { p_ids: selectedOrders.value })
    if (error) throw error
    toast(`已删除 ${data?.deleted || 0} 条订单`, 'success')
    selectedOrders.value = []
    loadStats()
    loadOrders()
  } catch (e) {
    toast('批量删除失败：' + (e.message || ''), 'error')
  }
}

// ---------- pagination ----------
const totalPages = computed(() => {
  const { total, pageSize } = orderStore.pagination
  return Math.max(1, Math.ceil(total / pageSize))
})

function calcDisplayPages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = []
  pages.push(1)
  if (current > 3) pages.push('...')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  if (total > 1) pages.push(total)
  return pages
}

const displayPages = computed(() => calcDisplayPages(orderStore.pagination.page, totalPages.value))

function goPage(p) {
  if (p < 1 || p > totalPages.value) return
  orderStore.pagination.page = p
  loadOrders()
}

// ---------- Excel Import (聚水潭格式) ----------
const showImportModal = ref(false)
const isDraggingFile = ref(false)
const importStep = ref('upload') // upload | preview | result
const importIsJst = ref(false)
const importFormat = ref('') // jst | doudian | generic
const importError = ref('')
const importing = ref(false)
const importResult = ref({ success: 0, duplicate: 0, failures: [] })
const jstPreviewOrders = ref([])
const jstSkippedCount = ref(0)
const jstColumnMap = ref({})
const previewFilter = ref('')
const previewStatusFilter = ref('')
const previewPlatformFilter = ref('')

// 产品库缓存（用于匹配）
const allProductsCache = ref([])

function resetImport() {
  importStep.value = 'upload'
  importIsJst.value = false
  importFormat.value = ''
  importError.value = ''
  importing.value = false
  importResult.value = { success: 0, duplicate: 0, failures: [] }
  jstPreviewOrders.value = []
  jstSkippedCount.value = 0
  jstColumnMap.value = {}
  previewFilter.value = ''
  previewStatusFilter.value = ''
  previewPlatformFilter.value = ''
}

function openImportModal() {
  resetImport()
  showImportModal.value = true
}

// 平台标签样式
function platformLabel(p) {
  const labels = { kuaishou: '快手', douyin: '抖店', weixin_video: '视频号', taobao: '淘宝', jd: '京东', other: '其他' }
  return labels[p] || p || ''
}
function platformTagClass(p) {
  const classes = { kuaishou: 'bg-orange-50 text-orange-600', douyin: 'bg-pink-50 text-pink-600', weixin_video: 'bg-green-50 text-green-600', taobao: 'bg-red-50 text-red-600', other: 'bg-gray-100 text-gray-500' }
  return classes[p] || classes.other
}

// 过滤后的预览订单
const filteredPreviewOrders = computed(() => {
  let list = jstPreviewOrders.value
  if (previewStatusFilter.value) {
    list = list.filter(o => o.status === previewStatusFilter.value)
  }
  if (previewPlatformFilter.value) {
    list = list.filter(o => o.platform === previewPlatformFilter.value)
  }
  if (previewFilter.value.trim()) {
    const kw = previewFilter.value.trim().toLowerCase()
    list = list.filter(o =>
      (o.product_name || '').toLowerCase().includes(kw) ||
      (o.customer_name || '').toLowerCase().includes(kw) ||
      (o.store_name || '').toLowerCase().includes(kw)
    )
  }
  return list
})

const selectedPreviewCount = computed(() => jstPreviewOrders.value.filter(o => o._selected).length)
const isAllPreviewSelected = computed(() => jstPreviewOrders.value.length > 0 && jstPreviewOrders.value.every(o => o._selected))

const previewTotalAmount = computed(() => jstPreviewOrders.value.reduce((s, o) => s + (Number(o.amount) || 0), 0))
const selectedPreviewTotalAmount = computed(() => jstPreviewOrders.value.filter(o => o._selected).reduce((s, o) => s + (Number(o.amount) || 0), 0))

function toggleAllPreviewSelection(e) {
  const val = e.target.checked
  for (const order of jstPreviewOrders.value) {
    order._selected = val
  }
}

async function loadAllProductsForTest() {
  if (allProductsCache.value.length > 0) return allProductsCache.value
  try {
    const { data } = await supabase
      .from('product_items')
      .select('id, name, cost_price, category, brand')
      .order('name')
      .limit(2000)
    allProductsCache.value = data || []
    return allProductsCache.value
  } catch (e) {
    console.error('加载产品库失败:', e)
    return []
  }
}


async function handleFileSelect(e) {
  const file = e.target.files?.[0]
  if (!file) return
  await processImportFile(file)
  e.target.value = ''
}

function handleFileDrop(e) {
  isDraggingFile.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  const ext = file.name.split('.').pop().toLowerCase()
  if (!['xlsx', 'xls'].includes(ext)) {
    importError.value = '仅支持 .xlsx / .xls 格式'
    return
  }
  processImportFile(file)
}

async function processImportFile(file) {
  importError.value = ''
  importing.value = true

  try {
    const rawData = await parseJstExcel(file)
    const sheetNames = rawData._sheetNames || []
    const firstHeaders = rawData.headers || []

    const format = detectExcelFormat(sheetNames, firstHeaders)
    importFormat.value = format
    importIsJst.value = format === 'jst'

    let orders = []
    let skipped = 0

    if (format === 'jst') {
      const columnMap = autoMatchJstColumns(firstHeaders)
      jstColumnMap.value = columnMap
      const result = mapJstRowsToOrders(rawData.rows, columnMap)
      orders = result.orders
      skipped = result.skipped

    } else if (format === 'doudian') {
      const doudianData = await parseDoudianExcel(file)
      const columnMap = autoMatchDoudianColumns(doudianData.headers)
      jstColumnMap.value = columnMap
      const result = mapDoudianRowsToOrders(doudianData.rows, columnMap)
      orders = result.orders
      skipped = result.skipped

    } else {
      const genericData = await parseExcelFile(file)
      const autoMapping = autoMatchColumns(genericData.headers)
      const columnMapping = {}
      Object.keys(autoMapping).forEach(k => { columnMapping[k] = autoMapping[k] })
      const { orders: mappedOrders, errors } = mapRowsToOrders(columnMapping, genericData.rows, 2)
      orders = mappedOrders.map((o, i) => ({
        _rowIdx: i + 2,
        _selected: true,
        external_order_no: '',
        store_name: '',
        platform: o.payment_method || 'other',
        status: 'completed',
        status_raw: '已完成',
        product_name: o.product_name,
        brand: '',
        product_category: '',
        unit_cost: 0,
        amount: o.amount,
        quantity: o.quantity,
        customer_name: o.customer_name,
        customer_phone: o.customer_phone || '',
        province: '',
        city: '',
        district: '',
        customer_address: o.customer_address || '',
        express_company: '',
        express_no: '',
        service_prefix: '',
        _matchedProduct: null,
      }))
      skipped = errors.length
    }

    jstPreviewOrders.value = orders
    jstSkippedCount.value = skipped

    const products = await loadAllProductsForTest()
    for (const order of orders) {
      order._matchedProduct = matchProduct(order.product_name, products)
    }

    importStep.value = 'preview'
  } catch (err) {
    importError.value = err.message
  } finally {
    importing.value = false
  }
}

async function handleImport() {
  const selectedOrders = jstPreviewOrders.value.filter(o => o._selected)
  if (selectedOrders.length === 0) return
  importing.value = true

  const success = []
  const duplicate = []
  const failures = []

  // 预加载已有订单号（去重检测）
  const externalNos = selectedOrders.map(o => o.external_order_no).filter(Boolean)
  const existingOrderNos = new Set()
  if (externalNos.length > 0) {
    try {
      // 查询note字段中包含这些订单号的记录（因为orders表没有直接的external_order_no字段）
      // 我们用note字段搜索，或者检查order_no
      const { data: existingOrders } = await supabase
        .from('orders')
        .select('note, order_no')
        .limit(50000)

      if (existingOrders) {
        for (const ex of existingOrders) {
          const note = ex.note || ''
          // 匹配note中的"订单号：xxx"或"线上订单号:xxx"
          const match = note.match(/(?:线上)?订单号[：:]\s*(\S+)/)
          if (match) existingOrderNos.add(match[1])
          if (ex.order_no) existingOrderNos.add(ex.order_no)
        }
      }
    } catch (e) {
      console.warn('去重查询失败:', e)
    }
  }

  // 批量导入
  const BATCH_SIZE = 20
  for (let i = 0; i < selectedOrders.length; i += BATCH_SIZE) {
    const batch = selectedOrders.slice(i, i + BATCH_SIZE)

    for (const order of batch) {
      try {
        // 去重检测
        if (order.external_order_no && existingOrderNos.has(order.external_order_no)) {
          duplicate.push(order)
          continue
        }

        // 构建客户地址：优先使用完整地址，否则拼接省市区
        const customerAddress = order.customer_address
          || [order.province, order.city, order.district].filter(Boolean).join('')
          || ''

        // 构建备注
        const noteParts = []
        if (order.external_order_no) noteParts.push(`线上订单号：${order.external_order_no}`)
        if (order.internal_order_no) noteParts.push(`内部订单号：${order.internal_order_no}`)
        if (order.store_name) noteParts.push(`店铺：${order.store_name}`)
        if (order.brand) noteParts.push(`品牌：${order.brand}`)
        if (order.express_company) noteParts.push(`快递：${order.express_company}`)
        if (order.express_no) noteParts.push(`单号：${order.express_no}`)
        if (order.service_prefix) noteParts.push(`客服前缀：${order.service_prefix}`)
        if (order.daihuo_account) noteParts.push(`带货账号：${order.daihuo_account}`)
        if (order.payment_method) noteParts.push(`支付方式：${order.payment_method}`)
        const note = noteParts.join(' | ')

        // 产品分类自动识别
        const productCategory = guessProductCategory(order.product_name) || ''

        // 订单来源：根据平台判断
        // 有带货账号 → 销售引导（业绩归主播/销售）
        // 无带货账号 → 客服处理（电商客服）
        let orderSource = 'cs_service'
        if (order.daihuo_account || order._matched_referrer) {
          orderSource = 'sales_guided'
        }

        // 自动匹配收款账户：根据店铺名匹配同平台账户
        let matchedAccountId = null
        let matchedAccountCode = null
        const platform = order.platform || 'other'
        const storeName = order.store_name || ''
        // 平台映射到accounts表的platform字段
        const platformMap = {
          'douyin': 'douyin',
          'kuaishou': 'kuaishou',
          'weixin_video': 'wechat',
          'wechat': 'wechat',
          'taobao': 'taobao',
          'youzan': 'wechat',
        }
        const targetPlatform = platformMap[platform]
        if (targetPlatform && storeName) {
          const activeAccs = accountStore.getActiveAccounts()
          // 优先精确匹配店铺名
          const exactMatch = activeAccs.find(a => a.platform === targetPlatform && (a.short_name || '').includes(storeName.replace('店', '').replace('店铺', '')))
          if (exactMatch) {
            matchedAccountId = exactMatch.id
            matchedAccountCode = exactMatch.code
          } else {
            // 其次匹配同平台账户（优先平台专属账户）
            const platformAcc = activeAccs.find(a => a.platform === targetPlatform && !a.short_name.match(/^[东南西北]\d/))
            if (platformAcc) {
              matchedAccountId = platformAcc.id
              matchedAccountCode = platformAcc.code
            }
          }
        }

        // 创建订单
        const payload = {
          customer_name: order.customer_name || '电商客户',
          customer_phone: order.customer_phone || '',
          customer_address: customerAddress,
          product_category: productCategory || 'other',
          product_name: order.product_name || '未命名产品',
          amount: Number(order.amount) || 0,
          note: note,
          status: order.status,
          order_source: orderSource,
        }

        // 设置收款账户
        if (matchedAccountId) {
          payload.account_id = matchedAccountId
        }
        if (matchedAccountCode) {
          payload.account_code = matchedAccountCode
        }

        const created = await orderStore.createOrder(payload)

        if (created?.id) {
          // 创建 order_items
          try {
            const itemData = {
              order_id: created.id,
              product_name: order.product_name || '未命名产品',
              quantity: order.quantity || 1,
              unit_cost: Number(order.unit_cost) || 0,
              subtotal: (Number(order.unit_cost) || 0) * (order.quantity || 1),
            }
            // 如果匹配到产品库
            if (order._matchedProduct) {
              itemData.product_id = order._matchedProduct.id
              if (!itemData.unit_cost || itemData.unit_cost === 0) {
                itemData.unit_cost = Number(order._matchedProduct.cost_price) || 0
              }
              itemData.unit_price = Number(order._matchedProduct.retail_price) || 0
            }
            await supabase.from('order_items').insert(itemData)
          } catch (e) {
            console.warn('创建订单明细失败:', e)
          }

          // 自动创建平台手续费支出（如果有）
          const serviceCharge = Number(order.service_charge) || 0
          if (serviceCharge > 0 && created.id) {
            try {
              await supabase.from('expenses').insert({
                category: '平台手续费',
                amount: serviceCharge,
                account_id: matchedAccountId || null,
                note: `订单 ${created.order_no || order.external_order_no || ''} 平台服务费 | ${order.store_name || ''}`,
                status: 'approved',
                approval_required: false,
                expense_date: created.created_at ? created.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
                created_by: (await supabase.auth.getSession()).data.session?.user?.id,
              })
            } catch (feeErr) {
              console.warn('创建平台手续费支出失败:', feeErr)
            }
          }

          // 标记为已存在（防止同批次内重复）
          if (order.external_order_no) existingOrderNos.add(order.external_order_no)
          success.push(order)
        }
      } catch (e) {
        failures.push({
          row: order._rowIdx,
          product_name: order.product_name,
          customer_name: order.customer_name,
          message: e.message || '创建失败',
        })
      }
    }

    // 更新进度（每批次报告一次）
    importResult.value = {
      success: success.length,
      duplicate: duplicate.length,
      failures: [...failures],
    }
  }

  importResult.value = { success: success.length, duplicate: duplicate.length, failures }
  importStep.value = 'result'
  importing.value = false

  // 刷新数据
  loadStats()
  loadOrders()
}

// ---------- init ----------
onMounted(async () => {
  loadRole()
  await Promise.all([
    loadStats(),
    loadOrders(),
    loadServiceNumbers(),
    accountStore.fetchAccounts(),
    loadTodayOrdersData(),
  ])
  const allAccs = accountStore.getActiveAccounts()
  // 按订单中使用频率排序
  const usageCount = {}
  for (const o of orderStore.orders) {
    if (o.account_id) usageCount[o.account_id] = (usageCount[o.account_id] || 0) + 1
  }
  allAccs.sort((a, b) => (usageCount[b.id] || 0) - (usageCount[a.id] || 0))
  orderAccountOptions.value = allAccs.map(a => ({
    id: a.id,
    short_name: a.short_name || a.code,
    balance: a.balance,
  }))
})
</script>
