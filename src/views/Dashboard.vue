<template>
  <div class="max-w-5xl mx-auto pb-20">
    <h1 class="text-xl font-bold text-gray-800 mb-6">📊 收支总览</h1>

    <!-- 数据库连接错误提示 -->
    <div v-if="dbError" class="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 text-sm text-orange-700">
      ⚠️ {{ dbError }}
    </div>

    <!-- ========== 今日数据 ========== -->
    <div v-if="authStore.isFinance" class="bg-white rounded-2xl p-4 md:p-5 mb-4 border border-gray-100 shadow-sm">
      <div class="flex items-center gap-1 text-xs text-gray-400 mb-3">{{ todayLabel }}</div>
      <div class="grid grid-cols-5 gap-3">
        <div class="text-center">
          <div class="text-xs text-gray-400 mb-1">收入</div>
          <div class="text-lg md:text-xl font-bold text-green-600">{{ todayStats.income !== null ? formatMoney(todayStats.income) : '--' }}</div>
        </div>
        <div class="text-center">
          <div class="text-xs text-gray-400 mb-1">支出</div>
          <div class="text-lg md:text-xl font-bold text-red-500">{{ todayStats.expense !== null ? formatMoney(todayStats.expense) : '--' }}</div>
        </div>
        <div class="text-center">
          <div class="text-xs text-gray-400 mb-1">退款</div>
          <div class="text-lg md:text-xl font-bold text-orange-500">{{ todayStats.refund !== null ? formatMoney(todayStats.refund) : '--' }}</div>
        </div>
        <div class="text-center">
          <div class="text-xs text-gray-400 mb-1">利润</div>
          <div class="text-lg md:text-xl font-bold" :class="(todayStats.profit || 0) >= 0 ? 'text-green-600' : 'text-red-500'">{{ todayStats.profit !== null ? formatMoney(todayStats.profit) : '--' }}</div>
        </div>
        <div class="text-center">
          <div class="text-xs text-gray-400 mb-1">订单</div>
          <div class="text-lg md:text-xl font-bold text-indigo-600">{{ todayStats.newOrders !== null ? todayStats.newOrders + ' 笔' : '--' }}</div>
        </div>
      </div>
    </div>

    <!-- 非财务人员提示 -->
    <div v-if="!authStore.isFinance" class="text-center py-16 text-gray-400">
      <div class="text-4xl mb-2">🔒</div>
      <div class="text-sm">收支总览仅对管理员和财务人员开放</div>
    </div>

    <!-- ========== 财务视角 ========== -->
    <template v-if="authStore.isFinance">

      <!-- 核心利润区 -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
        <div class="p-4 md:p-5 bg-gradient-to-r from-emerald-500 to-teal-500">
          <div class="text-white/80 text-xs mb-0.5">本月到手利润</div>
          <div v-if="loading" class="h-9 w-40 bg-white/20 rounded animate-pulse"></div>
          <div v-else-if="stats.profit !== null" class="text-3xl md:text-4xl font-bold text-white">{{ formatMoney(stats.profit, true) }}</div>
          <div v-else class="text-3xl md:text-4xl font-bold text-white/30">--</div>
          <div v-if="stats.profit !== null && !loading" class="flex gap-4 mt-2 text-xs text-white/70">
            <span>收入 {{ formatMoney(stats.totalIncome) }}</span>
            <span>·</span>
            <span>支出 {{ formatMoney(stats.totalExpense) }}</span>
            <span v-if="stats.totalRefunds > 0">·</span>
            <span v-if="stats.totalRefunds > 0">退款 {{ formatMoney(stats.totalRefunds) }}</span>
          </div>
        </div>
        <!-- 收支构成 -->
        <div class="grid grid-cols-3 divide-x divide-gray-100">
          <div class="p-4 text-center">
            <div class="text-xs text-gray-400 mb-1">💰 收入</div>
            <div v-if="loading" class="h-7 w-20 bg-gray-100 rounded animate-pulse"></div>
            <div v-else class="text-lg md:text-xl font-bold text-green-600">{{ stats.totalIncome !== null ? formatMoney(stats.totalIncome) : '--' }}</div>
          </div>
          <div class="p-4 text-center">
            <div class="text-xs text-gray-400 mb-1">💸 支出</div>
            <div v-if="loading" class="h-7 w-20 bg-gray-100 rounded animate-pulse"></div>
            <div v-else class="text-lg md:text-xl font-bold text-red-500">{{ stats.totalExpense !== null ? formatMoney(stats.totalExpense) : '--' }}</div>
          </div>
          <div class="p-4 text-center">
            <div class="text-xs text-gray-400 mb-1">↩️ 退款</div>
            <div v-if="loading" class="h-7 w-20 bg-gray-100 rounded animate-pulse"></div>
            <div v-else class="text-lg md:text-xl font-bold text-orange-500">{{ stats.totalRefunds !== null ? formatMoney(stats.totalRefunds) : '--' }}</div>
          </div>
        </div>
      </div>

      <!-- 第二行：产品利润 + 待审批 + 退款率 -->
      <div class="grid grid-cols-3 gap-3 md:gap-4 mb-4">
        <!-- 本月产品利润 -->
        <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div class="text-xs text-gray-400 mb-1">📦 产品利润</div>
          <div v-if="profitLoading" class="h-7 w-24 bg-gray-100 rounded animate-pulse"></div>
          <div v-else class="text-xl font-bold" :class="profitStats.grossProfit >= 0 ? 'text-green-600' : 'text-red-500'">
            {{ profitStats.grossProfit !== null ? formatMoney(profitStats.grossProfit) : '--' }}
          </div>
          <div v-if="profitStats.grossProfit !== null && !profitLoading" class="flex items-center justify-between text-xs text-gray-400 mt-1">
            <span>利润率 {{ profitStats.profitMargin }}%</span>
            <span>成本 {{ formatMoney(profitStats.totalCost) }}</span>
          </div>
        </div>

        <!-- 待审批 -->
        <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm cursor-pointer hover:bg-amber-50 hover:border-amber-200 transition-colors"
             @click="$router.push('/expenses?status=pending')">
          <div class="text-xs text-gray-400 mb-1">🔔 待审批</div>
          <div v-if="loading" class="h-7 w-24 bg-gray-100 rounded animate-pulse"></div>
          <div v-else class="text-xl font-bold" :class="stats.pendingCount > 0 ? 'text-amber-500' : 'text-gray-800'">
            {{ stats.pendingCount !== null ? stats.pendingCount + ' 笔' : '--' }}
          </div>
          <div v-if="stats.pendingCount > 0" class="text-xs text-amber-400 mt-1">点击处理 →</div>
        </div>

        <!-- 本月退款率 -->
        <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div class="text-xs text-gray-400 mb-1">📉 退款率</div>
          <div v-if="loading" class="h-7 w-24 bg-gray-100 rounded animate-pulse"></div>
          <div v-else class="text-xl font-bold" :class="refundRate > 5 ? 'text-red-500' : 'text-gray-800'">
            {{ refundRate }}%
          </div>
          <div v-if="!loading" class="text-xs text-gray-400 mt-1">
            {{ refundCount }}笔 · {{ formatMoney(stats.totalRefunds) }}
          </div>
        </div>
      </div>

      <!-- ========== 异常提醒区域 ========== -->
      <div v-if="authStore.isFinance && (anomalies.large_expenses?.length > 0 || anomalies.large_income?.length > 0 || anomalies.audit_anomalies?.length > 0)" class="mb-3 md:mb-6">
        <h2 class="font-semibold text-gray-800 mb-3 text-sm md:text-base">⚠️ 异常提醒</h2>
        <div class="space-y-3">
          <!-- 大额支出 -->
          <div v-if="anomalies.large_expenses?.length > 0" class="bg-red-50 rounded-xl p-4 border border-red-200">
            <div class="text-sm font-medium text-red-700 mb-2">🚨 今日大额支出（≥10万）</div>
            <div class="space-y-2">
              <div v-for="item in anomalies.large_expenses" :key="item.id" class="flex items-center justify-between text-sm">
                <div>
                  <span class="text-gray-700">{{ item.payee || '未知' }}</span>
                  <span class="text-gray-400 text-xs ml-2">{{ item.category || '' }} · {{ formatDate(item.created_at) }}</span>
                </div>
                <span class="font-bold text-red-600">{{ formatMoney(item.amount) }}</span>
              </div>
            </div>
          </div>
          <!-- 异常大额收入 -->
          <div v-if="anomalies.large_income?.length > 0" class="bg-orange-50 rounded-xl p-4 border border-orange-200">
            <div class="text-sm font-medium text-orange-700 mb-2">📈 异常大额收入（超出均值3倍）</div>
            <div class="space-y-2">
              <div v-for="item in anomalies.large_income" :key="item.id" class="flex items-center justify-between text-sm">
                <div>
                  <span class="text-gray-700">{{ item.customer_name || '未知客户' }}</span>
                  <span class="text-gray-400 text-xs ml-2">{{ item.product_category || '' }} · {{ formatDate(item.created_at) }}</span>
                </div>
                <span class="font-bold text-orange-600">{{ formatMoney(item.amount) }}</span>
              </div>
            </div>
          </div>
          <!-- 审计异常 -->
          <div v-if="anomalies.audit_anomalies?.length > 0" class="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <div class="text-sm font-medium text-amber-700 mb-2">🔒 近3天敏感操作</div>
            <div class="space-y-2">
              <div v-for="item in anomalies.audit_anomalies" :key="item.id" class="flex items-center justify-between text-sm">
                <div>
                  <span class="font-medium" :class="item.action === 'DELETE' ? 'text-red-600' : 'text-amber-600'">{{ item.action === 'DELETE' ? '删除' : '修改' }}</span>
                  <span class="text-gray-500 ml-1">{{ item.table_name }}</span>
                </div>
                <span class="text-gray-400 text-xs">{{ formatDate(item.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 大额款项提醒 -->
      <div v-if="largeExpenses.length > 0" class="mb-3 md:mb-6">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-gray-800 text-sm md:text-base">🚨 大额款项提醒（≥10万）</h2>
          <router-link to="/expenses" class="text-sm text-blue-600 hover:underline">查看全部</router-link>
        </div>
        <div class="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3" :class="largeExpenses.length <= 2 ? 'md:grid-cols-2' : 'lg:grid-cols-3'">
          <div v-for="exp in largeExpenses" :key="exp.id"
               class="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 border border-red-200 hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-medium px-2 py-0.5 rounded-full"
                    :class="exp.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'">
                {{ EXPENSE_STATUS[exp.status]?.label || exp.status }}
              </span>
              <span class="text-lg font-bold text-red-600">{{ formatMoney(exp.amount) }}</span>
            </div>
            <div class="text-sm text-gray-700 font-medium truncate">{{ exp.payee || '--' }}</div>
            <div class="text-xs text-gray-400 mt-1">
              {{ EXPENSE_CATEGORIES[exp.category] || exp.category || '其他' }}
              · {{ formatDate(exp.created_at) }}
            </div>
            <div v-if="exp.note" class="text-xs text-gray-500 mt-1 truncate">{{ exp.note }}</div>
          </div>
        </div>
      </div>

      <!-- 下方两列 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-6">
        <!-- 账户余额 Top5 -->
        <div class="bg-white rounded-xl border border-gray-100 p-4 md:p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-gray-800 text-sm md:text-base">💰 账户余额 Top5</h2>
            <router-link to="/accounts" class="text-sm text-blue-600 hover:underline">管理</router-link>
          </div>
          <div v-if="loading" class="space-y-3">
            <div v-for="i in 5" :key="i" class="h-8 bg-gray-100 rounded animate-pulse"></div>
          </div>
          <div v-else class="space-y-3">
            <div v-for="acc in topAccounts" :key="acc.id" class="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <div class="text-sm font-medium text-gray-800">{{ acc.code || '--' }}</div>
                <div class="text-xs text-gray-400">{{ PLATFORM_LABELS[acc.platform] || acc.platform || '' }}</div>
              </div>
              <div class="text-sm font-semibold text-blue-600">{{ formatMoney(acc.balance || 0) }}</div>
            </div>
            <div v-if="topAccounts.length === 0" class="text-sm text-gray-400 text-center py-4">暂无账户数据</div>
          </div>
        </div>

        <!-- 最新订单 -->
        <div class="bg-white rounded-xl border border-gray-100 p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-gray-800">🧾 最新订单</h2>
            <router-link to="/orders" class="text-sm text-blue-600 hover:underline">查看全部</router-link>
          </div>
          <div v-if="loading" class="space-y-3">
            <div v-for="i in 5" :key="i" class="flex justify-between">
              <div class="flex-1 space-y-1">
                <div class="h-4 w-24 bg-gray-100 rounded animate-pulse"></div>
                <div class="h-3 w-36 bg-gray-50 rounded animate-pulse"></div>
              </div>
              <div class="h-4 w-16 bg-gray-100 rounded animate-pulse mt-1"></div>
            </div>
          </div>
          <div v-else class="space-y-3">
            <div v-for="order in recentOrders" :key="order.id" class="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <div class="text-sm font-medium text-gray-800">{{ order.customer_name || order.customer || '--' }}</div>
                <div class="text-xs text-gray-400">{{ PRODUCT_CATEGORIES[order.product_category] || order.product_category || '' }} · {{ formatDate(order.created_at) }}</div>
              </div>
              <div class="text-sm font-semibold text-green-600">{{ formatMoney(order.amount) }}</div>
            </div>
            <div v-if="recentOrders.length === 0" class="text-sm text-gray-400 text-center py-4">暂无订单数据</div>
          </div>
        </div>
      </div>
    </template>

    <!-- ========== 销售/客服视图 ========== -->
    <template v-else>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-3 md:mb-6">
        <!-- 我的本月收入 -->
        <div class="bg-white rounded-xl p-4 md:p-5 border border-gray-100">
          <div class="text-xs md:text-sm text-gray-500 mb-1">我的本月收入</div>
          <div v-if="loading" class="h-8 w-28 bg-gray-100 rounded animate-pulse"></div>
          <div v-else class="text-xl md:text-2xl font-bold text-green-600">{{ stats.totalIncome !== null ? formatMoney(stats.totalIncome) : '--' }}</div>
        </div>

        <!-- 我的本月订单数 -->
        <div class="bg-white rounded-xl p-4 md:p-5 border border-gray-100">
          <div class="text-xs md:text-sm text-gray-500 mb-1">我的本月订单数</div>
          <div v-if="loading" class="h-8 w-28 bg-gray-100 rounded animate-pulse"></div>
          <div v-else class="text-xl md:text-2xl font-bold text-blue-600">{{ stats.myOrderCount !== null ? stats.myOrderCount + ' 笔' : '--' }}</div>
        </div>

        <!-- 快速操作 -->
        <router-link to="/orders" class="bg-white rounded-xl p-4 md:p-5 border border-gray-100 flex flex-col items-center justify-center hover:bg-blue-50 hover:border-blue-200 transition-colors hidden md:flex">
          <span class="text-3xl mb-1">📝</span>
          <span class="text-sm font-medium text-gray-700">新建订单</span>
        </router-link>

        <router-link to="/orders" class="bg-white rounded-xl p-4 md:p-5 border border-gray-100 flex flex-col items-center justify-center hover:bg-blue-50 hover:border-blue-200 transition-colors hidden md:flex">
          <span class="text-3xl mb-1">📋</span>
          <span class="text-sm font-medium text-gray-700">查看订单</span>
        </router-link>

        <!-- 客服号 -->
        <div class="bg-white rounded-xl p-4 md:p-5 border border-gray-100 hidden md:block">
          <div class="text-xs md:text-sm text-gray-500 mb-1">📱 客服号</div>
          <div v-if="loading" class="h-8 w-28 bg-gray-100 rounded animate-pulse"></div>
          <div v-else class="text-xl md:text-2xl font-bold text-purple-500">{{ stats.serviceCount || 0 }}</div>
        </div>
      </div>

      <!-- 最新订单 -->
      <div class="bg-white rounded-xl border border-gray-100 p-4 md:p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-gray-800 text-sm md:text-base">🧾 最新订单</h2>
          <router-link to="/orders" class="text-sm text-blue-600 hover:underline">查看全部</router-link>
        </div>
        <div v-if="loading" class="space-y-3">
          <div v-for="i in 5" :key="i" class="flex justify-between">
            <div class="flex-1 space-y-1">
              <div class="h-4 w-24 bg-gray-100 rounded animate-pulse"></div>
              <div class="h-3 w-36 bg-gray-50 rounded animate-pulse"></div>
            </div>
            <div class="h-4 w-16 bg-gray-100 rounded animate-pulse mt-1"></div>
          </div>
        </div>
        <div v-else class="space-y-3">
          <div v-for="order in recentOrders" :key="order.id" class="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <div>
              <div class="text-sm font-medium text-gray-800">{{ order.customer_name || order.customer || '--' }}</div>
              <div class="text-xs text-gray-400">{{ PRODUCT_CATEGORIES[order.product_category] || order.product_category || '' }} · {{ formatDate(order.created_at) }}</div>
            </div>
            <div class="text-sm font-semibold text-green-600">{{ formatMoney(order.amount) }}</div>
          </div>
          <div v-if="recentOrders.length === 0" class="text-sm text-gray-400 text-center py-4">暂无订单数据</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { formatMoney, formatDate, PLATFORM_LABELS, PRODUCT_CATEGORIES, EXPENSE_STATUS, EXPENSE_CATEGORIES } from '../lib/utils'

const authStore = useAuthStore()

// --- 状态 ---
const loading = ref(true)
const dbError = ref(null)

const stats = ref({
  totalIncome: null,       // 本月已到账收入
  totalExpense: null,      // 本月已审批/已付支出
  totalRefunds: null,      // 本月已退款金额
  profit: null,            // 到手利润 = 收入 - 支出 - 退款
  pendingCount: null,      // 待审批笔数
  myOrderCount: null,      // 销售/客服: 我的本月订单数
  serviceCount: 0,         // 客服号
})

// --- 产品利润 ---
const profitStats = ref({
  totalRevenue: null,
  totalCost: null,
  grossProfit: null,
  profitMargin: null,
})
const profitLoading = ref(false)

const recentOrders = ref([])
const topAccounts = ref([])
const largeExpenses = ref([]) // 大额款项提醒
const anomalies = ref({ large_expenses: [], large_income: [], audit_anomalies: [] }) // 异常提醒数据

// --- 今日数据 ---
const todayStats = ref({
  income: null,        // 今日收入
  expense: null,       // 今日支出
  refund: null,        // 今日退款
  newCustomers: null,  // 今日新增客户
  newOrders: null,     // 今日订单数
  profit: null,        // 今日利润 = 收入 - 支出 - 退款
})

// --- 今日标签（含日期） ---
const todayLabel = computed(() => {
  const now = new Date()
  const h = now.getHours()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const prefix = h < 6 ? '昨日' : '今日'
  return `${prefix}数据（6:00起算）`
})

// --- 退款率 ---
const refundRate = computed(() => {
  if (!stats.value.totalIncome || stats.value.totalIncome === 0) return '0.0'
  const rate = (stats.value.totalRefunds || 0) / stats.value.totalIncome * 100
  return rate.toFixed(1)
})
const refundCount = computed(() => {
  return stats.value.refundCount || 0
})

// --- 本月时间范围 ---
function getMonthRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

// --- 数据加载 ---
async function loadDashboard() {
  loading.value = true
  dbError.value = null
  const uid = authStore.user

  try {
    // 今日数据（所有角色都加载）
    await loadTodayData()

    if (authStore.isFinance) {
      await loadFinanceDashboard()
    } else {
      await loadSalesDashboard(uid)
    }
  } catch (err) {
    console.error('加载仪表盘失败:', err)
    dbError.value = '数据库未连接，部分数据加载失败'
  } finally {
    loading.value = false
  }
}

// --- 今日数据加载 ---
async function loadTodayData() {
  try {
    const now = new Date()
    // 以早上6点为"今日"起算点：如果当前时间<6点，今日=昨天6点到今天6点
    let dayStart, dayEnd
    if (now.getHours() < 6) {
      // 凌晨0-6点，算昨天的"今日"
      dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 6, 0, 0)
    } else {
      dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0)
    }
    dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1) // 6点到次日6点
    const startISO = dayStart.toISOString()
    const endISO = dayEnd.toISOString()

    const [ordersRes, expRes, refundRes, custRes, orderCountRes] = await Promise.all([
      // 今日收入（今天创建的订单总金额）
      supabase
        .from('orders')
        .select('amount')
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .is('deleted_at', null),
      // 今日支出（今天已付款的支出）
      supabase
        .from('expenses')
        .select('amount')
        .eq('status', 'paid')
        .gte('paid_at', startISO)
        .lte('paid_at', endISO),
      // 今日退款
      supabase
        .from('refunds')
        .select('refund_amount')
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .is('deleted_at', null),
      // 今日新增客户
      supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startISO)
        .lte('created_at', endISO),
      // 今日订单数
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .is('deleted_at', null),
    ])

    const income = ordersRes.data?.reduce((s, r) => s + (Number(r.amount) || 0), 0) || 0
    const expense = expRes.data?.reduce((s, r) => s + (Number(r.amount) || 0), 0) || 0
    const refund = refundRes.data?.reduce((s, r) => s + (Number(r.refund_amount) || 0), 0) || 0
    const profit = income - expense - refund

    todayStats.value = {
      income: income > 0 ? income : null,
      expense: expense > 0 ? expense : null,
      refund: refund > 0 ? refund : null,
      newCustomers: (custRes.count ?? 0) > 0 ? custRes.count : null,
      newOrders: (orderCountRes.count ?? 0) > 0 ? orderCountRes.count : null,
      profit: profit !== 0 ? profit : null,
    }
  } catch (e) {
    console.error('加载今日数据失败:', e)
  }
}

// --- 管理员/财务视图 ---
async function loadFinanceDashboard() {
  const { start, end } = getMonthRange()

  // 并行查询所有数据
  const [incRes, expRes, refundRes, pendingRes, topAccRes, recentRes] = await Promise.all([
    // 本月已到账收入
    supabase
      .from('orders')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', start)
      .lt('created_at', end),
    // 本月已审批/已付支出
    supabase
      .from('expenses')
      .select('amount')
      .in('status', ['approved', 'paid'])
      .gte('created_at', start)
      .lt('created_at', end),
    // 本月已退款金额
    supabase
      .from('refunds')
      .select('refund_amount')
      .eq('status', 'completed')
      .gte('created_at', start)
      .lt('created_at', end),
    // 待审批笔数
    supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    // Top5 账户
    supabase
      .from('accounts')
      .select('id, code, platform, balance')
      .eq('status', 'active')
      .order('balance', { ascending: false })
      .limit(5),
    // 最新订单
    supabase
      .from('orders')
      .select('id, amount, customer_name, product_category, created_at, customer, account_code')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // 汇总统计
  const totalIncome = incRes.data?.reduce((s, r) => s + (Number(r.amount) || 0), 0) ?? 0
  const totalExpense = expRes.data?.reduce((s, r) => s + (Number(r.amount) || 0), 0) ?? 0
  const totalRefunds = refundRes.data?.reduce((s, r) => s + (Number(r.refund_amount) || 0), 0) ?? 0

  stats.value.totalIncome = totalIncome
  stats.value.totalExpense = totalExpense
  stats.value.totalRefunds = totalRefunds
  stats.value.profit = totalIncome - totalExpense - totalRefunds
  stats.value.pendingCount = pendingRes.count ?? 0

  topAccounts.value = topAccRes.data || []
  recentOrders.value = recentRes.data || []

  // 大额款项提醒（≥10万，待审批或已批准未付）
  await loadLargeExpenses()

  // 异常交易检测
  await loadAnomalies()

  // 产品利润统计
  await loadProfitStats()
}

// --- 产品利润统计 ---
async function loadProfitStats() {
  profitLoading.value = true
  try {
    const { start, end } = getMonthRange()
    const { data, error } = await supabase.rpc('get_profit_stats', { start_date: start, end_date: end })
    if (!error && data) {
      profitStats.value = {
        totalRevenue: Number(data.total_revenue) || 0,
        totalCost: Number(data.total_cost) || 0,
        grossProfit: Number(data.gross_profit) || 0,
        profitMargin: Number(data.profit_margin) || 0,
      }
    }
  } catch (e) {
    console.error('加载产品利润失败:', e)
  } finally {
    profitLoading.value = false
  }
}

// --- 大额款项提醒 ---
async function loadLargeExpenses() {
  const { data } = await supabase
    .from('expenses')
    .select('id, amount, payee, category, status, note, created_at')
    .in('status', ['pending', 'approved'])
    .gte('amount', 100000)
    .is('deleted_at', null)
    .order('amount', { ascending: false })
    .limit(10)
  largeExpenses.value = data || []
}

// --- 异常交易检测 ---
async function loadAnomalies() {
  try {
    const { data, error } = await supabase.rpc('detect_anomalies')
    if (!error && data) {
      anomalies.value = {
        large_expenses: data.large_expenses || [],
        large_income: data.large_income || [],
        audit_anomalies: data.audit_anomalies || [],
      }
    }
  } catch (e) {
    console.error('异常检测失败:', e)
  }
}

// --- 销售/客服视图 ---
async function loadSalesDashboard(uid) {
  const { start, end } = getMonthRange()

  const [incRes, countRes, recentRes, sharedRes] = await Promise.all([
    // 我的本月收入（非平分单）
    supabase
      .from('orders')
      .select('amount')
      .eq('status', 'completed')
      .neq('order_source', 'shared')
      .or(`sales_id.eq.${uid},creator_id.eq.${uid}`)
      .gte('created_at', start)
      .lt('created_at', end),
    // 我的本月订单数
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .or(`sales_id.eq.${uid},creator_id.eq.${uid},shared_sales_id.eq.${uid}`)
      .gte('created_at', start)
      .lt('created_at', end),
    // 最新订单
    supabase
      .from('orders')
      .select('id, amount, customer_name, product_category, created_at, customer, account_code')
      .or(`sales_id.eq.${uid},creator_id.eq.${uid},shared_sales_id.eq.${uid}`)
      .order('created_at', { ascending: false })
      .limit(5),
    // 平分单收入（金额按50%计）
    supabase
      .from('orders')
      .select('amount')
      .eq('status', 'completed')
      .eq('order_source', 'shared')
      .or(`sales_id.eq.${uid},shared_sales_id.eq.${uid}`)
      .gte('created_at', start)
      .lt('created_at', end),
  ])

  const normalIncome = incRes.data?.reduce((s, r) => s + (Number(r.amount) || 0), 0) ?? 0
  const sharedIncome = (sharedRes.data?.reduce((s, r) => s + (Number(r.amount) || 0), 0) ?? 0) / 2
  stats.value.totalIncome = normalIncome + sharedIncome || null
  stats.value.myOrderCount = countRes.count ?? 0
  recentOrders.value = recentRes.data || []
}

onMounted(() => {
  loadDashboard()
})
</script>
