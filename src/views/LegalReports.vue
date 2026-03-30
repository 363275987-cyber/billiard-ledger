<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-bold text-gray-800">📋 法定财务报表</h1>
      <button v-if="currentData" @click="exportExcel"
        class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 cursor-pointer">
        📥 导出Excel
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg">
      <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key; currentData = null"
        class="flex-1 px-4 py-2 text-sm rounded-md transition-all cursor-pointer"
        :class="activeTab === tab.key ? 'bg-white text-blue-600 font-semibold shadow-sm' : 'text-gray-500 hover:text-gray-700'">
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>

    <!-- Date Filters -->
    <div class="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex gap-3 items-center flex-wrap">
      <template v-if="activeTab !== 'balance'">
        <label class="text-sm text-gray-500">起始日期：</label>
        <input v-model="startDate" type="date" @change="loadReport"
          class="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
        <span class="text-gray-400">—</span>
      </template>
      <label class="text-sm text-gray-500">{{ activeTab === 'balance' ? '截止' : '截止' }}日期：</label>
      <input v-model="endDate" type="date" @change="loadReport"
        class="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
      <div class="flex gap-1 ml-2">
        <button @click="setQuickRange('this_month')" class="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-blue-100 hover:text-blue-700 cursor-pointer">本月</button>
        <button @click="setQuickRange('last_month')" class="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-blue-100 hover:text-blue-700 cursor-pointer">上月</button>
        <button @click="setQuickRange('this_quarter')" class="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-blue-100 hover:text-blue-700 cursor-pointer">本季度</button>
        <button @click="setQuickRange('this_year')" class="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-blue-100 hover:text-blue-700 cursor-pointer">本年</button>
      </div>
      <button @click="loadReport" class="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 cursor-pointer ml-auto">
        🔄 查询
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="bg-white rounded-xl border border-gray-100 p-12 text-center">
      <div class="text-2xl mb-2 animate-pulse">📋</div>
      <div class="text-gray-400 text-sm">加载报表数据...</div>
    </div>

    <!-- Balance Sheet -->
    <template v-else-if="activeTab === 'balance' && currentData">
      <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
          <h2 class="text-lg font-bold text-gray-800">资产负债表</h2>
          <p class="text-sm text-gray-500">截止日期：{{ currentData.as_of }}</p>
          <span v-if="currentData.check" class="inline-block mt-1 px-2 py-0.5 text-xs rounded-full"
            :class="currentData.check.balanced ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'">
            {{ currentData.check.balanced ? '✅ 平衡验证通过' : 'ℹ️ 仅统计了现金及已录入项目，资产=负债+权益暂不完全匹配' }}
          </span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm" id="balance-table">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left font-semibold text-gray-600 w-16">项目</th>
                <th class="px-6 py-3 text-left font-semibold text-gray-600">行次</th>
                <th class="px-6 py-3 text-right font-semibold text-gray-600">期末余额</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr class="bg-blue-50/50"><td colspan="3" class="px-6 py-2 font-bold text-blue-800">资产</td></tr>
              <tr>
                <td class="px-6 py-2 text-gray-500">1</td>
                <td class="px-6 py-2">货币资金（现金）</td>
                <td class="px-6 py-2 text-right font-mono">{{ fmt(currentData.assets.cash) }}</td>
              </tr>
              <tr>
                <td class="px-6 py-2 text-gray-500">2</td>
                <td class="px-6 py-2">应收账款</td>
                <td class="px-6 py-2 text-right font-mono">{{ fmt(currentData.assets.receivables) }}</td>
              </tr>
              <tr class="bg-gray-50 font-bold">
                <td class="px-6 py-2"></td>
                <td class="px-6 py-2">资产合计</td>
                <td class="px-6 py-2 text-right font-mono text-blue-700">{{ fmt(currentData.assets.total) }}</td>
              </tr>
              <tr class="bg-orange-50/50"><td colspan="3" class="px-6 py-2 font-bold text-orange-800">负债</td></tr>
              <tr>
                <td class="px-6 py-2 text-gray-500">3</td>
                <td class="px-6 py-2">应付账款</td>
                <td class="px-6 py-2 text-right font-mono">{{ fmt(currentData.liabilities.payables) }}</td>
              </tr>
              <tr>
                <td class="px-6 py-2 text-gray-500">4</td>
                <td class="px-6 py-2">股东垫资</td>
                <td class="px-6 py-2 text-right font-mono">{{ fmt(currentData.liabilities.shareholder_loans) }}</td>
              </tr>
              <tr class="bg-gray-50 font-bold">
                <td class="px-6 py-2"></td>
                <td class="px-6 py-2">负债合计</td>
                <td class="px-6 py-2 text-right font-mono text-orange-700">{{ fmt(currentData.liabilities.total) }}</td>
              </tr>
              <tr class="bg-green-50/50"><td colspan="3" class="px-6 py-2 font-bold text-green-800">所有者权益</td></tr>
              <tr>
                <td class="px-6 py-2 text-gray-500">5</td>
                <td class="px-6 py-2">留存收益（累计利润）</td>
                <td class="px-6 py-2 text-right font-mono">{{ fmt(currentData.equity.retained_earnings) }}</td>
              </tr>
              <tr class="bg-gray-50 font-bold">
                <td class="px-6 py-2"></td>
                <td class="px-6 py-2">所有者权益合计</td>
                <td class="px-6 py-2 text-right font-mono text-green-700">{{ fmt(currentData.equity.total) }}</td>
              </tr>
              <tr class="bg-blue-50 font-bold text-lg">
                <td class="px-6 py-3"></td>
                <td class="px-6 py-3">负债及所有者权益合计</td>
                <td class="px-6 py-3 text-right font-mono text-blue-700">{{ fmt(currentData.liabilities.total + currentData.equity.total) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <!-- Detail cards -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div v-if="currentData.assets.cash_detail?.length" class="bg-white rounded-xl border border-gray-100 p-4">
          <h3 class="font-semibold text-sm text-gray-700 mb-3">💰 账户余额明细</h3>
          <table class="w-full text-xs">
            <thead><tr class="text-gray-400"><th class="text-left pb-2">账户</th><th class="text-left pb-2">平台</th><th class="text-right pb-2">余额</th></tr></thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="item in currentData.assets.cash_detail" :key="item.account_name">
                <td class="py-1.5">{{ item.account_name }}</td>
                <td class="py-1.5 text-gray-400">{{ item.platform }}</td>
                <td class="py-1.5 text-right font-mono">{{ fmt(item.balance) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="currentData.liabilities.loans_detail?.length" class="bg-white rounded-xl border border-gray-100 p-4">
          <h3 class="font-semibold text-sm text-gray-700 mb-3">🏦 股东垫资明细</h3>
          <table class="w-full text-xs">
            <thead><tr class="text-gray-400"><th class="text-left pb-2">股东</th><th class="text-right pb-2">垫资额</th><th class="text-right pb-2">已还</th><th class="text-right pb-2">剩余</th></tr></thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="item in currentData.liabilities.loans_detail" :key="item.shareholder_name">
                <td class="py-1.5">{{ item.shareholder_name }}</td>
                <td class="py-1.5 text-right font-mono">{{ fmt(item.loan_amount) }}</td>
                <td class="py-1.5 text-right font-mono text-green-600">{{ fmt(item.repaid_principal) }}</td>
                <td class="py-1.5 text-right font-mono text-red-600">{{ fmt(item.remaining_principal) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Income Statement -->
    <template v-else-if="activeTab === 'income' && currentData">
      <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
          <h2 class="text-lg font-bold text-gray-800">利润表</h2>
          <p class="text-sm text-gray-500">{{ currentData.period_start }} 至 {{ currentData.period_end }}</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm" id="income-table">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left font-semibold text-gray-600 w-16">行次</th>
                <th class="px-6 py-3 text-left font-semibold text-gray-600">项目</th>
                <th class="px-6 py-3 text-right font-semibold text-gray-600">金额</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr>
                <td class="px-6 py-2 text-gray-500">1</td>
                <td class="px-6 py-2 font-semibold">一、营业收入</td>
                <td class="px-6 py-2 text-right font-mono text-blue-700">{{ fmt(currentData.revenue) }}</td>
              </tr>
              <tr>
                <td class="px-6 py-2 text-gray-500">2</td>
                <td class="px-6 py-2 pl-10">减：营业成本</td>
                <td class="px-6 py-2 text-right font-mono text-red-600">-{{ fmt(currentData.cost) }}</td>
              </tr>
              <tr class="bg-blue-50/50 font-bold">
                <td class="px-6 py-2 text-gray-500">3</td>
                <td class="px-6 py-2">二、毛利润</td>
                <td class="px-6 py-2 text-right font-mono" :class="currentData.gross_profit >= 0 ? 'text-blue-700' : 'text-red-600'">{{ fmt(currentData.gross_profit) }}</td>
              </tr>
              <tr>
                <td class="px-6 py-2 text-gray-500">4</td>
                <td class="px-6 py-2 font-semibold">减：营业费用合计</td>
                <td class="px-6 py-2 text-right font-mono text-red-600">-{{ fmt(currentData.expenses) }}</td>
              </tr>
              <tr v-for="(exp, idx) in (currentData.expenses_detail || [])" :key="idx">
                <td></td>
                <td class="px-6 py-1.5 pl-10 text-xs text-gray-500">{{ expenseLabel(exp.category) }}</td>
                <td class="px-6 py-1.5 text-right font-mono text-xs text-gray-500">{{ fmt(exp.amount) }}</td>
              </tr>
              <tr>
                <td class="px-6 py-2 text-gray-500">5</td>
                <td class="px-6 py-2 pl-10">减：退款金额</td>
                <td class="px-6 py-2 text-right font-mono text-red-600">-{{ fmt(currentData.refunds) }}</td>
              </tr>
              <tr class="bg-gradient-to-r from-green-50 to-emerald-50 font-bold text-lg">
                <td class="px-6 py-3 text-gray-500">6</td>
                <td class="px-6 py-3">三、净利润</td>
                <td class="px-6 py-3 text-right font-mono" :class="currentData.net_profit >= 0 ? 'text-green-700' : 'text-red-700'">{{ fmt(currentData.net_profit) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Cash Flow Statement -->
    <template v-else-if="activeTab === 'cashflow' && currentData">
      <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
          <h2 class="text-lg font-bold text-gray-800">现金流量表</h2>
          <p class="text-sm text-gray-500">{{ currentData.period_start }} 至 {{ currentData.period_end }}</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm" id="cashflow-table">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left font-semibold text-gray-600 w-16">行次</th>
                <th class="px-6 py-3 text-left font-semibold text-gray-600">项目</th>
                <th class="px-6 py-3 text-right font-semibold text-gray-600">金额</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr class="bg-blue-50/50"><td colspan="3" class="px-6 py-2 font-bold text-blue-800">一、经营活动产生的现金流量</td></tr>
              <tr>
                <td class="px-6 py-2 text-gray-500">1</td>
                <td class="px-6 py-2">销售商品、提供劳务收到的现金</td>
                <td class="px-6 py-2 text-right font-mono text-green-600">{{ fmt(currentData.operating.cash_in_orders) }}</td>
              </tr>
              <tr>
                <td class="px-6 py-2 text-gray-500">2</td>
                <td class="px-6 py-2">购买商品、接受劳务支付的现金</td>
                <td class="px-6 py-2 text-right font-mono text-red-600">{{ fmt(-currentData.operating.cash_out_expenses) }}</td>
              </tr>
              <tr>
                <td class="px-6 py-2 text-gray-500">3</td>
                <td class="px-6 py-2">支付退款</td>
                <td class="px-6 py-2 text-right font-mono text-red-600">{{ fmt(-currentData.operating.cash_out_refunds) }}</td>
              </tr>
              <tr class="bg-gray-50 font-bold">
                <td class="px-6 py-2"></td>
                <td class="px-6 py-2">经营活动现金流量净额</td>
                <td class="px-6 py-2 text-right font-mono" :class="currentData.operating.net >= 0 ? 'text-green-700' : 'text-red-700'">{{ fmt(currentData.operating.net) }}</td>
              </tr>
              <tr class="bg-purple-50/50"><td colspan="3" class="px-6 py-2 font-bold text-purple-800">二、投资活动产生的现金流量</td></tr>
              <tr>
                <td class="px-6 py-2 text-gray-500">4</td>
                <td class="px-6 py-2">购建固定资产、设备支付的现金</td>
                <td class="px-6 py-2 text-right font-mono text-red-600">{{ fmt(currentData.investing.net) }}</td>
              </tr>
              <tr class="bg-gray-50 font-bold">
                <td class="px-6 py-2"></td>
                <td class="px-6 py-2">投资活动现金流量净额</td>
                <td class="px-6 py-2 text-right font-mono" :class="currentData.investing.net >= 0 ? 'text-green-700' : 'text-red-700'">{{ fmt(currentData.investing.net) }}</td>
              </tr>
              <tr class="bg-orange-50/50"><td colspan="3" class="px-6 py-2 font-bold text-orange-800">三、筹资活动产生的现金流量</td></tr>
              <tr>
                <td class="px-6 py-2 text-gray-500">5</td>
                <td class="px-6 py-2">股东垫资收到的现金</td>
                <td class="px-6 py-2 text-right font-mono text-green-600">{{ fmt(currentData.financing.loan_new) }}</td>
              </tr>
              <tr>
                <td class="px-6 py-2 text-gray-500">6</td>
                <td class="px-6 py-2">偿还股东垫资支付的现金</td>
                <td class="px-6 py-2 text-right font-mono text-red-600">{{ fmt(-currentData.financing.loan_repay) }}</td>
              </tr>
              <tr class="bg-gray-50 font-bold">
                <td class="px-6 py-2"></td>
                <td class="px-6 py-2">筹资活动现金流量净额</td>
                <td class="px-6 py-2 text-right font-mono" :class="currentData.financing.net >= 0 ? 'text-green-700' : 'text-red-700'">{{ fmt(currentData.financing.net) }}</td>
              </tr>
              <tr class="bg-gradient-to-r from-blue-50 to-indigo-50 font-bold text-lg">
                <td class="px-6 py-3 text-gray-500">7</td>
                <td class="px-6 py-3">四、现金及现金等价物净增加额</td>
                <td class="px-6 py-3 text-right font-mono" :class="currentData.net_change >= 0 ? 'text-green-700' : 'text-red-700'">{{ fmt(currentData.net_change) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Equity Statement -->
    <template v-else-if="activeTab === 'equity' && currentData">
      <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
          <h2 class="text-lg font-bold text-gray-800">所有者权益变动表</h2>
          <p class="text-sm text-gray-500">{{ currentData.period_start }} 至 {{ currentData.period_end }}</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm" id="equity-table">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left font-semibold text-gray-600 w-16">行次</th>
                <th class="px-6 py-3 text-left font-semibold text-gray-600">项目</th>
                <th class="px-6 py-3 text-right font-semibold text-gray-600">金额</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr>
                <td class="px-6 py-2 text-gray-500">1</td>
                <td class="px-6 py-2">期初所有者权益余额</td>
                <td class="px-6 py-2 text-right font-mono">{{ fmt(currentData.beginning_equity) }}</td>
              </tr>
              <tr class="bg-blue-50/50">
                <td class="px-6 py-2 text-gray-500">2</td>
                <td class="px-6 py-2">加：本期净利润</td>
                <td class="px-6 py-2 text-right font-mono" :class="currentData.net_income >= 0 ? 'text-green-600' : 'text-red-600'">{{ fmt(currentData.net_income) }}</td>
              </tr>
              <tr class="bg-orange-50/50">
                <td class="px-6 py-2 text-gray-500">3</td>
                <td class="px-6 py-2">加：本期垫资净变动</td>
                <td class="px-6 py-2 text-right font-mono" :class="currentData.loan_changes >= 0 ? 'text-green-600' : 'text-red-600'">{{ fmt(currentData.loan_changes) }}</td>
              </tr>
              <tr class="bg-gradient-to-r from-green-50 to-emerald-50 font-bold text-lg">
                <td class="px-6 py-3 text-gray-500">4</td>
                <td class="px-6 py-3">期末所有者权益余额</td>
                <td class="px-6 py-3 text-right font-mono text-blue-700">{{ fmt(currentData.ending_equity) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <!-- Shareholder Allocation -->
      <div class="bg-white rounded-xl border border-gray-100 mt-4 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100">
          <h3 class="font-bold text-gray-800">👥 股东权益分配</h3>
          <p class="text-xs text-gray-400 mt-1">任凯智 60%（董事长） / 王孟南 40%（IP）</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm" id="equity-share-table">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left font-semibold text-gray-600">股东</th>
                <th class="px-6 py-3 text-left font-semibold text-gray-600">持股比例</th>
                <th class="px-6 py-3 text-right font-semibold text-gray-600">权益份额</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="s in (currentData.shareholders || [])" :key="s.name">
                <td class="px-6 py-3 font-semibold">{{ s.name }}</td>
                <td class="px-6 py-3">{{ s.share }}</td>
                <td class="px-6 py-3 text-right font-mono text-lg" :class="s.equity >= 0 ? 'text-blue-700' : 'text-red-700'">{{ fmt(s.equity) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Empty State -->
    <div v-if="!loading && !currentData" class="bg-white rounded-xl border border-gray-100 p-12 text-center">
      <div class="text-4xl mb-3">📋</div>
      <div class="text-gray-500">请选择日期后点击「查询」生成法定财务报表</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

const tabs = [
  { key: 'balance', icon: '📊', label: '资产负债表' },
  { key: 'income', icon: '📈', label: '利润表' },
  { key: 'cashflow', icon: '💰', label: '现金流量表' },
  { key: 'equity', icon: '👥', label: '权益变动表' },
]

const activeTab = ref('balance')
const loading = ref(false)
const currentData = ref(null)

const today = new Date()
const fmtDate = (d) => d.toISOString().split('T')[0]
const endDate = ref(fmtDate(today))
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
const startDate = ref(fmtDate(firstOfMonth))

function setQuickRange(range) {
  const now = new Date()
  let start, end
  end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (range) {
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      end = new Date(now.getFullYear(), now.getMonth(), 0)
      break
    case 'this_quarter': {
      const q = Math.floor(now.getMonth() / 3)
      start = new Date(now.getFullYear(), q * 3, 1)
      break
    }
    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1)
      break
  }
  startDate.value = fmtDate(start)
  endDate.value = fmtDate(end)
  loadReport()
}

const EXPENSE_LABELS = {
  salary: '工资薪酬',
  rent: '场地租金',
  equipment: '设备采购',
  marketing: '营销推广',
  logistics: '物流快递',
  office: '办公费用',
  tax: '税费',
  insurance: '保险',
  water_electric: '水电费',
  travel: '差旅费用',
  meal: '餐费',
  commission: '提成支出',
  platform_fee: '平台费用',
  maintenance: '维修保养',
  material: '原材料',
  packaging: '包装费用',
  storage: '仓储费用',
  other: '其他费用',
}

function expenseLabel(cat) {
  if (!cat) return '其他费用'
  // 如果已经是中文（直接来自数据库的中文名），直接返回
  if (/^[\u4e00-\u9fff]/.test(cat) && !EXPENSE_LABELS[cat]) return cat
  return EXPENSE_LABELS[cat] || cat
}

function fmt(val) {
  if (val == null) return '¥0.00'
  const num = parseFloat(val)
  return '¥' + num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function loadReport() {
  loading.value = true
  currentData.value = null
  try {
    let result
    if (activeTab.value === 'balance') {
      const { data, error } = await supabase.rpc('balance_sheet_report', { p_as_of: endDate.value })
      if (error) throw error
      result = data
    } else if (activeTab.value === 'income') {
      const { data, error } = await supabase.rpc('income_statement_report', { p_start: startDate.value, p_end: endDate.value })
      if (error) throw error
      result = data
    } else if (activeTab.value === 'cashflow') {
      const { data, error } = await supabase.rpc('cash_flow_report_formal', { p_start: startDate.value, p_end: endDate.value })
      if (error) throw error
      result = data
    } else if (activeTab.value === 'equity') {
      const { data, error } = await supabase.rpc('equity_statement_report', { p_start: startDate.value, p_end: endDate.value })
      if (error) throw error
      result = data
    }
    currentData.value = result
  } catch (err) {
    console.error('报表加载失败:', err)
    alert('报表加载失败: ' + err.message)
  } finally {
    loading.value = false
  }
}

function exportExcel() {
  if (!currentData.value || typeof XLSX === 'undefined') {
    alert('SheetJS未加载或无数据')
    return
  }

  const wb = XLSX.utils.book_new()
  const d = currentData.value

  if (activeTab.value === 'balance') {
    const wsData = [
      ['资产负债表', '', ''],
      ['截止日期: ' + d.as_of, '', ''],
      ['', '', ''],
      ['项目', '行次', '期末余额'],
      ['资产', '', ''],
      ['  货币资金（现金）', '1', d.assets.cash],
      ['  应收账款', '2', d.assets.receivables],
      ['资产合计', '', d.assets.total],
      ['', '', ''],
      ['负债', '', ''],
      ['  应付账款', '3', d.liabilities.payables],
      ['  股东垫资', '4', d.liabilities.shareholder_loans],
      ['负债合计', '', d.liabilities.total],
      ['', '', ''],
      ['所有者权益', '', ''],
      ['  留存收益（累计利润）', '5', d.equity.retained_earnings],
      ['所有者权益合计', '', d.equity.total],
      ['', '', ''],
      ['负债及所有者权益合计', '', d.liabilities.total + d.equity.total],
      ['', '', ''],
      ['平衡验证: ' + (d.check.balanced ? '通过' : '不通过'), '', ''],
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = [{ wch: 30 }, { wch: 8 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, ws, '资产负债表')
  } else if (activeTab.value === 'income') {
    const wsData = [
      ['利润表', '', ''],
      ['期间: ' + d.period_start + ' 至 ' + d.period_end, '', ''],
      ['', '', ''],
      ['项目', '行次', '金额'],
      ['一、营业收入', '1', d.revenue],
      ['减：营业成本', '2', -d.cost],
      ['二、毛利润', '3', d.gross_profit],
      ['减：营业费用合计', '4', -d.expenses],
      ['减：退款金额', '5', -d.refunds],
      ['三、净利润', '6', d.net_profit],
    ]
    if (d.expenses_detail?.length) {
      wsData.push(['', '', ''], ['费用明细:', '', ''])
      d.expenses_detail.forEach(e => wsData.push(['  ' + expenseLabel(e.category), '', e.amount]))
    }
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = [{ wch: 30 }, { wch: 8 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, ws, '利润表')
  } else if (activeTab.value === 'cashflow') {
    const wsData = [
      ['现金流量表', '', ''],
      ['期间: ' + d.period_start + ' 至 ' + d.period_end, '', ''],
      ['', '', ''],
      ['项目', '行次', '金额'],
      ['一、经营活动产生的现金流量', '', ''],
      ['  销售商品、提供劳务收到的现金', '1', d.operating.cash_in_orders],
      ['  购买商品、接受劳务支付的现金', '2', -d.operating.cash_out_expenses],
      ['  支付退款', '3', -d.operating.cash_out_refunds],
      ['经营活动现金流量净额', '', d.operating.net],
      ['', '', ''],
      ['二、投资活动产生的现金流量', '', ''],
      ['  购建固定资产、设备支付的现金', '4', d.investing.net],
      ['投资活动现金流量净额', '', d.investing.net],
      ['', '', ''],
      ['三、筹资活动产生的现金流量', '', ''],
      ['  股东垫资收到的现金', '5', d.financing.loan_new],
      ['  偿还股东垫资支付的现金', '6', -d.financing.loan_repay],
      ['筹资活动现金流量净额', '', d.financing.net],
      ['', '', ''],
      ['四、现金及现金等价物净增加额', '7', d.net_change],
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = [{ wch: 35 }, { wch: 8 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, ws, '现金流量表')
  } else if (activeTab.value === 'equity') {
    const wsData = [
      ['所有者权益变动表', '', ''],
      ['期间: ' + d.period_start + ' 至 ' + d.period_end, '', ''],
      ['', '', ''],
      ['项目', '行次', '金额'],
      ['期初所有者权益余额', '1', d.beginning_equity],
      ['加：本期净利润', '2', d.net_income],
      ['加：本期垫资净变动', '3', d.loan_changes],
      ['期末所有者权益余额', '4', d.ending_equity],
      ['', '', ''],
      ['股东权益分配', '持股比例', '权益份额'],
      ...d.shareholders.map(s => [s.name, s.share, s.equity]),
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, ws, '所有者权益变动表')
  }

  const nameMap = {
    balance: '资产负债表',
    income: '利润表',
    cashflow: '现金流量表',
    equity: '所有者权益变动表',
  }
  const period = activeTab.value === 'balance'
    ? d.as_of
    : d.period_start + '_' + d.period_end
  XLSX.writeFile(wb, `${nameMap[activeTab.value]}_${period}.xlsx`)
}
</script>
