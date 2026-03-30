<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-bold text-gray-800">📈 财务报表</h1>
      <button v-if="reportData" @click="exportExcel"
        class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 cursor-pointer">
        📥 导出Excel
      </button>
    </div>

    <!-- Report Type & Date Range -->
    <div class="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex gap-3 items-center flex-wrap">
      <select v-model="reportType" @change="loadReport"
        class="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
        <option value="income_expense">收支报表</option>
        <option value="product_sales">产品销售报表</option>
        <option value="sales_performance">销售业绩报表</option>
        <option value="account_balance">账户余额报表</option>
        <option value="commission">提成报表</option>
        <option value="cashflow">现金流报表</option>
      </select>
      <input v-model="startDate" type="date" @change="loadReport"
        class="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
      <span class="text-gray-400">—</span>
      <input v-model="endDate" type="date" @change="loadReport"
        class="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
      <div class="flex gap-1 ml-2">
        <button @click="setQuickRange('this_month')" class="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-blue-100 hover:text-blue-700 cursor-pointer">本月</button>
        <button @click="setQuickRange('last_month')" class="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-blue-100 hover:text-blue-700 cursor-pointer">上月</button>
        <button @click="setQuickRange('this_quarter')" class="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-blue-100 hover:text-blue-700 cursor-pointer">本季度</button>
      </div>
      <button @click="loadReport" class="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 cursor-pointer ml-auto">
        🔄 查询
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="bg-white rounded-xl border border-gray-100 p-12 text-center">
      <div class="text-2xl mb-2 animate-pulse">📊</div>
      <div class="text-gray-400 text-sm">加载报表数据...</div>
    </div>

    <template v-else-if="reportData">
      <!-- Summary Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div v-for="card in summaryCards" :key="card.label"
          class="bg-white rounded-xl border border-gray-100 p-5">
          <div class="text-sm text-gray-500 mb-1">{{ card.icon }} {{ card.label }}</div>
          <div class="text-2xl font-bold" :class="card.color">{{ card.value }}</div>
        </div>
      </div>

      <!-- Data Table -->
      <div v-if="tableColumns.length > 0" class="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-100">
          <h2 class="font-bold text-gray-700">{{ reportTitle }}</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 text-gray-600">
                <th v-for="col in tableColumns" :key="col.key"
                  class="px-4 py-3 font-medium text-left whitespace-nowrap"
                  :class="col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''">
                  {{ col.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in tableRows" :key="idx"
                class="border-t border-gray-50 hover:bg-gray-50/60 transition">
                <td v-for="col in tableColumns" :key="col.key"
                  class="px-4 py-3 whitespace-nowrap"
                  :class="col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''">
                  <template v-if="col.type === 'money'">{{ formatMoney(getNestedValue(row, col.key)) }}</template>
                  <template v-else-if="col.type === 'percent'">{{ getNestedValue(row, col.key) }}%</template>
                  <template v-else-if="col.type === 'status'">
                    <span :class="statusClass(getNestedValue(row, col.key))"
                      class="text-xs px-2 py-0.5 rounded-full font-medium">
                      {{ statusLabel(getNestedValue(row, col.key)) }}
                    </span>
                  </template>
                  <template v-else>{{ getNestedValue(row, col.key) }}</template>
                </td>
              </tr>
              <tr v-if="tableRows.length === 0">
                <td :colspan="tableColumns.length" class="px-4 py-12 text-center text-gray-400">暂无数据</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else class="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
        🔒 该报表数据仅管理员可见
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { formatMoney } from '../lib/utils'
import { usePermission } from '../composables/usePermission'

const { canSeeCost, loadRole } = usePermission()

const loading = ref(false)
const reportType = ref('income_expense')
const startDate = ref('')
const endDate = ref('')
const reportData = ref(null)

const reportTitles = {
  income_expense: '收支报表',
  product_sales: '产品销售报表',
  sales_performance: '销售业绩报表',
  account_balance: '账户余额报表',
  commission: '提成报表',
  cashflow: '现金流报表',
}

const reportTitle = computed(() => reportTitles[reportType.value])

function setQuickRange(range) {
  const now = new Date()
  let s, e
  if (range === 'this_month') {
    s = new Date(now.getFullYear(), now.getMonth(), 1)
    e = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  } else if (range === 'last_month') {
    s = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    e = new Date(now.getFullYear(), now.getMonth(), 0)
  } else {
    const q = Math.floor(now.getMonth() / 3)
    s = new Date(now.getFullYear(), q * 3, 1)
    e = new Date(now.getFullYear(), q * 3 + 3, 0)
  }
  startDate.value = formatDate(s)
  endDate.value = formatDate(e)
  loadReport()
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj) ?? '—'
}

// Summary cards based on report type
const summaryCards = computed(() => {
  if (!reportData.value) return []
  const d = reportData.value
  let cards = []
  switch (reportType.value) {
    case 'income_expense':
      cards = [
        { icon: '💰', label: '总收入', value: formatMoney(d.total_income), color: 'text-green-600' },
        ...(canSeeCost.value ? [
          { icon: '💸', label: '总支出', value: formatMoney(d.total_expense), color: 'text-red-600' },
          { icon: '📊', label: '净利润', value: formatMoney(d.net_profit ?? d.total_income - d.total_expense), color: 'text-blue-600' },
          { icon: '📈', label: '利润率', value: (d.profit_rate ?? 0) + '%', color: 'text-purple-600' },
        ] : []),
      ]
      break
    case 'product_sales':
      cards = [
        { icon: '📦', label: '总销量', value: d.total_quantity ?? d.total_sales ?? 0, color: 'text-blue-600' },
        { icon: '💰', label: '总营收', value: formatMoney(d.total_revenue), color: 'text-green-600' },
        ...(canSeeCost.value ? [
          { icon: '📉', label: '总成本', value: formatMoney(d.total_cost ?? 0), color: 'text-red-600' },
          { icon: '📊', label: '毛利率', value: (d.gross_margin ?? d.gross_profit ?? 0) + '%', color: 'text-purple-600' },
        ] : []),
      ]
      break
    case 'sales_performance':
      cards = [
        { icon: '📋', label: '总订单数', value: d.total_orders ?? 0, color: 'text-blue-600' },
        { icon: '💰', label: '总金额', value: formatMoney(d.total_amount), color: 'text-green-600' },
        { icon: '🎁', label: '总提成', value: formatMoney(d.total_commission ?? 0), color: 'text-orange-500' },
        { icon: '🏆', label: '最佳销售', value: d.best_performer ?? '—', color: 'text-purple-600' },
      ]
      break
    case 'account_balance':
      cards = [
        { icon: '🏦', label: '总余额', value: formatMoney(d.total_balance), color: 'text-green-600' },
        { icon: '📅', label: '截至日期', value: d.as_of_date ?? '—', color: 'text-blue-600' },
        { icon: '💳', label: '账户数', value: d.accounts?.length ?? 0, color: 'text-purple-600' },
        { icon: '📊', label: '平台数', value: d.platform_summary?.length ?? 0, color: 'text-orange-500' },
      ]
      break
    case 'commission':
      cards = [
        { icon: '💰', label: '总提成', value: formatMoney(d.total_commission), color: 'text-green-600' },
        { icon: '✅', label: '已确认', value: formatMoney(d.confirmed_commission ?? d.paid_commission ?? 0), color: 'text-blue-600' },
        { icon: '⏳', label: '待处理', value: formatMoney(d.pending_commission), color: 'text-orange-500' },
        { icon: '📋', label: '记录数', value: d.details?.length ?? d.summary?.length ?? 0, color: 'text-purple-600' },
      ]
      break
    case 'cashflow':
      cards = [
        ...(canSeeCost.value ? [
          { icon: '📥', label: '总流入', value: formatMoney(d.net_inflow ?? d.summary?.total_inflow ?? 0), color: 'text-green-600' },
          { icon: '📤', label: '总流出', value: formatMoney(d.net_outflow ?? d.summary?.total_outflow ?? 0), color: 'text-red-600' },
          { icon: '📊', label: '净现金流', value: formatMoney(d.net_cashflow ?? (d.summary?.total_inflow ?? 0) - (d.summary?.total_outflow ?? 0)), color: 'text-blue-600' },
          { icon: '📅', label: '天数', value: d.daily?.length ?? 0, color: 'text-purple-600' },
        ] : []),
      ]
      break
    default:
      return []
  }
  return cards
})

// Table columns and rows based on report type
const tableColumns = computed(() => {
  switch (reportType.value) {
    case 'income_expense':
      return [
        { key: 'date', label: '日期' },
        { key: 'income', label: '收入', type: 'money', align: 'right' },
        ...(canSeeCost.value ? [
          { key: 'expense', label: '支出', type: 'money', align: 'right' },
          { key: 'profit', label: '净利润', type: 'money', align: 'right' },
        ] : []),
      ]
    case 'product_sales':
      return [
        { key: 'product_name', label: '产品名称' },
        { key: 'product_category', label: '类别' },
        { key: 'quantity', label: '销量', align: 'right' },
        { key: 'revenue', label: '营收', type: 'money', align: 'right' },
        ...(canSeeCost.value ? [
          { key: 'profit', label: '利润', type: 'money', align: 'right' },
        ] : []),
      ]
    case 'sales_performance':
      return [
        { key: 'name', label: '姓名' },
        { key: 'order_count', label: '订单数', align: 'right' },
        { key: 'total_amount', label: '总金额', type: 'money', align: 'right' },
        { key: 'commission', label: '提成', type: 'money', align: 'right' },
      ]
    case 'account_balance':
      return [
        { key: 'code', label: '账户编号' },
        { key: 'platform', label: '平台' },
        { key: 'bank_name', label: '银行/持有人' },
        { key: 'owner_name', label: '所属人' },
        { key: 'balance', label: '余额', type: 'money', align: 'right' },
      ]
    case 'commission':
      return [
        { key: 'user_name', label: '姓名' },
        { key: 'period', label: '期间' },
        { key: 'source_type', label: '来源' },
        { key: 'base_amount', label: '基数', type: 'money', align: 'right' },
        { key: 'commission_amount', label: '提成', type: 'money', align: 'right' },
        { key: 'status', label: '状态', type: 'status', align: 'center' },
      ]
    case 'cashflow':
      return canSeeCost.value ? [
        { key: 'date', label: '日期' },
        { key: 'inflow', label: '流入', type: 'money', align: 'right' },
        { key: 'outflow', label: '流出', type: 'money', align: 'right' },
        { key: 'net', label: '净额', type: 'money', align: 'right' },
      ] : []
    default:
      return []
  }
})

const tableRows = computed(() => {
  if (!reportData.value) return []
  const d = reportData.value
  switch (reportType.value) {
    case 'income_expense':
      return d.daily ?? d.daily_data ?? []
    case 'product_sales':
      return d.products ?? d.top_products ?? []
    case 'sales_performance':
      return d.performers ?? d.team_data ?? []
    case 'account_balance':
      return d.accounts ?? []
    case 'commission':
      return d.details ?? []
    case 'cashflow':
      return d.daily ?? []
    default:
      return []
  }
})

function statusClass(status) {
  const map = {
    paid: 'bg-green-50 text-green-700',
    confirmed: 'bg-green-50 text-green-700',
    pending: 'bg-orange-50 text-orange-700',
    active: 'bg-green-50 text-green-700',
    cancelled: 'bg-red-50 text-red-700',
  }
  return map[status] || 'bg-gray-50 text-gray-500'
}

function statusLabel(status) {
  const map = {
    paid: '已支付',
    confirmed: '已确认',
    pending: '待处理',
    active: '活跃',
    cancelled: '已取消',
  }
  return map[status] || status || '—'
}

async function loadReport() {
  if (!startDate.value || !endDate.value) return
  loading.value = true
  reportData.value = null
  try {
    const { data, error } = await supabase.rpc(reportType.value + '_report', {
      start_date: startDate.value,
      end_date: endDate.value,
    })
    if (error) {
      console.error('报表RPC错误:', error)
      reportData.value = null
      return
    }
    console.log('报表RPC返回:', reportType.value, typeof data, Array.isArray(data), data)
    // Supabase RPC for single json may return object or array
    if (Array.isArray(data)) {
      reportData.value = data[0] || null
    } else {
      reportData.value = data
    }
  } catch (e) {
    console.error('报表加载失败:', e)
    reportData.value = null
  } finally {
    loading.value = false
  }
}

function exportExcel() {
  if (!reportData.value || !window.XLSX) {
    alert('导出功能不可用')
    return
  }
  try {
    const rows = tableRows.value
    const cols = tableColumns.value
    if (!rows.length) {
      alert('无数据可导出')
      return
    }

    const wsData = [cols.map(c => c.label)]
    rows.forEach(row => {
      wsData.push(cols.map(c => {
        const val = getNestedValue(row, c.key)
        if (c.type === 'money') return Number(val) || 0
        return val ?? ''
      }))
    })

    const ws = window.XLSX.utils.aoa_to_sheet(wsData)
    const wb = window.XLSX.utils.book_new()
    window.XLSX.utils.book_append_sheet(wb, ws, reportTitles[reportType.value])
    window.XLSX.writeFile(wb, `${reportTitles[reportType.value]}_${startDate.value}_${endDate.value}.xlsx`)
  } catch (e) {
    console.error('导出失败:', e)
    alert('导出失败')
  }
}

onMounted(() => {
  loadRole()
  setQuickRange('this_month')
})
</script>
