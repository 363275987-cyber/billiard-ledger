<template>
  <div class="p-4 md:p-6 space-y-6">
    <!-- 顶部标题 + 操作栏 -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <h1 class="text-xl font-bold text-gray-800">🏪 电商店铺</h1>
      <div class="flex items-center gap-2">
        <input type="date" v-model="selectedDate" class="px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
        <button @click="activeTab = 'overview'" :class="tabClass('overview')">数据看板</button>
        <button @click="activeTab = 'stores'" :class="tabClass('stores')">店铺管理</button>
        <button @click="activeTab = 'withdrawals'" :class="tabClass('withdrawals')">提现记录</button>
        <button v-if="canEdit" @click="showAddStore = true" class="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition cursor-pointer">+ 新建店铺</button>
      </div>
    </div>

    <!-- ==================== 数据看板 ==================== -->
    <div v-if="activeTab === 'overview'">
      <!-- 汇总卡片 -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div class="text-xs text-gray-500 mb-1">今日销售额</div>
          <div class="text-lg font-bold text-blue-600">¥{{ formatNum(todayStats.total_sales) }}</div>
          <div class="text-xs text-gray-400">{{ todayStats.total_orders }} 单</div>
        </div>
        <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div class="text-xs text-gray-500 mb-1">今日退款</div>
          <div class="text-lg font-bold text-red-500">¥{{ formatNum(todayStats.total_refund) }}</div>
        </div>
        <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div class="text-xs text-gray-500 mb-1">今日净收入</div>
          <div class="text-lg font-bold text-green-600">¥{{ formatNum(todayStats.total_net) }}</div>
        </div>
        <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div class="text-xs text-gray-500 mb-1">可提现金额</div>
          <div class="text-lg font-bold text-purple-600">¥{{ formatNum(totalWithdrawable) }}</div>
          <div class="text-xs text-gray-400">已过结算周期</div>
        </div>
      </div>

      <!-- 按平台分组展示 -->
      <div v-for="(platformStores, platform) in storesByPlatform" :key="platform" class="mb-4">
        <div class="flex items-center justify-between bg-gray-50 rounded-t-lg px-4 py-2 cursor-pointer" @click="togglePlatform(platform)">
          <span class="font-medium text-sm text-gray-700">
            {{ platformLabel(platform) }}
            <span class="text-xs text-gray-400 ml-1">{{ platformStores.length }}个店铺 · T+{{ platformStores[0]?.settlement_days || 15 }}</span>
          </span>
          <span class="text-sm font-semibold text-gray-600">
            ¥{{ formatNum(platformStores.reduce((s, d) => s + getStoreDaySales(d.id), 0)) }}
          </span>
        </div>
        <div v-show="expandedPlatforms[platform]" class="border border-t-0 border-gray-200 rounded-b-lg overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 text-gray-500 text-xs">
                <th class="px-4 py-2 text-left">店铺</th>
                <th class="px-3 py-2 text-right">订单数</th>
                <th class="px-3 py-2 text-right">销售额</th>
                <th class="px-3 py-2 text-right">退款</th>
                <th class="px-3 py-2 text-right">净收入</th>
                <th class="px-3 py-2 text-right">店铺余额</th>
                <th class="px-3 py-2 text-right">可提现</th>
                <th class="px-3 py-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="store in platformStores" :key="store.id" class="border-t border-gray-100 hover:bg-gray-50">
                <td class="px-4 py-2.5">
                  <div class="font-medium text-gray-800">{{ store.short_name }}</div>
                  <div class="text-xs text-gray-400">{{ store.balance ? '余额 ¥' + formatNum(store.balance) : '' }}</div>
                </td>
                <td class="px-3 py-2.5 text-right">{{ getStoreDayStat(store.id, 'order_count') }}</td>
                <td class="px-3 py-2.5 text-right text-blue-600">{{ formatNum(getStoreDaySales(store.id)) }}</td>
                <td class="px-3 py-2.5 text-right text-red-400">{{ formatNum(getStoreDayStat(store.id, 'refund_amount')) }}</td>
                <td class="px-3 py-2.5 text-right font-medium text-green-600">{{ formatNum(getStoreDayStat(store.id, 'net_income')) }}</td>
                <td class="px-3 py-2.5 text-right text-gray-500">¥{{ formatNum(store.balance) }}</td>
                <td class="px-3 py-2.5 text-right">
                  <span :class="store.withdrawable_amount > 0 ? 'text-purple-600 font-medium' : 'text-gray-400'">
                    ¥{{ formatNum(store.withdrawable_amount) }}
                  </span>
                </td>
                <td class="px-3 py-2.5 text-right">
                  <button v-if="canEdit && store.withdrawable_amount > 0" @click="openWithdraw(store)" class="text-blue-600 text-xs px-2 py-1 rounded hover:bg-blue-50 transition cursor-pointer">提现</button>
                  <button v-if="canEdit" @click="openEditStore(store)" class="text-gray-400 text-xs px-2 py-1 rounded hover:bg-gray-100 transition cursor-pointer ml-1">编辑</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ==================== 店铺管理 ==================== -->
    <div v-if="activeTab === 'stores'">
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-gray-500 text-xs">
              <th class="px-4 py-3 text-left">店铺名称</th>
              <th class="px-4 py-3 text-left">平台</th>
              <th class="px-4 py-3 text-right">结算周期</th>
              <th class="px-4 py-3 text-right">店铺余额</th>
              <th class="px-4 py-3 text-left">提现到账账户</th>
              <th class="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="store in stores" :key="store.id" class="border-t border-gray-100 hover:bg-gray-50">
              <td class="px-4 py-3 font-medium text-gray-800">{{ store.short_name }}</td>
              <td class="px-4 py-3 text-gray-600">{{ platformLabel(store.ecommerce_platform) }}</td>
              <td class="px-4 py-3 text-right text-gray-600">T+{{ store.settlement_days || 15 }}天</td>
              <td class="px-4 py-3 text-right font-medium">¥{{ formatNum(store.balance) }}</td>
              <td class="px-4 py-3 text-gray-500 text-xs">{{ getWithdrawalAccountName(store.withdrawal_account_id) }}</td>
              <td class="px-4 py-3 text-right">
                <button v-if="canEdit" @click="openEditStore(store)" class="text-blue-600 text-xs px-2 py-1 rounded hover:bg-blue-50 cursor-pointer">编辑</button>
              </td>
            </tr>
            <tr v-if="!stores.length" class="text-center text-gray-400 py-8">
              <td colspan="6">暂无电商店铺</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ==================== 提现记录 ==================== -->
    <div v-if="activeTab === 'withdrawals'">
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-gray-500 text-xs">
              <th class="px-4 py-3 text-left">时间</th>
              <th class="px-4 py-3 text-left">店铺</th>
              <th class="px-4 py-3 text-right">提现金额</th>
              <th class="px-4 py-3 text-right">手续费</th>
              <th class="px-4 py-3 text-right">实际到账</th>
              <th class="px-4 py-3 text-left">到账账户</th>
              <th class="px-4 py-3 text-left">备注</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="w in withdrawals" :key="w.id" class="border-t border-gray-100 hover:bg-gray-50">
              <td class="px-4 py-3 text-gray-500 text-xs">{{ formatDate(w.withdrawn_at) }}</td>
              <td class="px-4 py-3 font-medium text-gray-800">{{ w.from_store?.short_name || '-' }}</td>
              <td class="px-4 py-3 text-right font-medium">¥{{ formatNum(w.amount) }}</td>
              <td class="px-4 py-3 text-right text-red-400">¥{{ formatNum(calcTotalFee(w.fee_detail)) }}</td>
              <td class="px-4 py-3 text-right font-medium text-green-600">¥{{ formatNum(w.actual_arrival) }}</td>
              <td class="px-4 py-3 text-gray-600 text-xs">{{ w.to_account?.short_name || '-' }}</td>
              <td class="px-4 py-3 text-gray-400 text-xs">{{ w.remark || '' }}</td>
            </tr>
            <tr v-if="!withdrawals.length" class="text-center text-gray-400 py-8">
              <td colspan="7">暂无提现记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ==================== 提现弹窗 ==================== -->
    <div v-if="showWithdrawModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="showWithdrawModal = false">
      <div class="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col overflow-hidden">
        <div class="shrink-0 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 class="font-bold text-gray-800">💰 提现 — {{ withdrawForm.storeName }}</h2>
          <button @click="showWithdrawModal = false" class="text-gray-400 hover:text-gray-600 cursor-pointer text-xl">&times;</button>
        </div>
        <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <!-- 可提现金额 -->
          <div class="bg-purple-50 rounded-lg p-3">
            <div class="text-xs text-purple-500">可提现金额（已过结算周期）</div>
            <div class="text-xl font-bold text-purple-700">¥{{ formatNum(withdrawForm.withdrawableAmount) }}</div>
          </div>

          <!-- 提现金额 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">提现金额</label>
            <input v-model.number="withdrawForm.amount" type="number" step="0.01" min="0"
              :max="withdrawForm.withdrawableAmount"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              placeholder="输入提现金额" @input="autoCalcWithdrawFees" />
          </div>

          <!-- 到账账户 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">到账账户</label>
            <select v-model="withdrawForm.toAccountId" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="">请选择</option>
              <option v-for="acc in cashAccounts" :key="acc.id" :value="acc.id">{{ acc.short_name }} (余额 ¥{{ formatNum(acc.balance) }})</option>
            </select>
          </div>

          <!-- 费用明细 -->
          <div v-if="withdrawForm.amount > 0" class="bg-gray-50 rounded-lg p-3 space-y-2">
            <div class="text-sm font-medium text-blue-800 mb-2">📋 {{ platformLabel(withdrawForm.platform) }}提现费用明细</div>
            <div class="flex justify-between text-xs">
              <span class="text-gray-500">技术费 ({{ withdrawFeeRates.technical }}%)</span>
              <span class="text-gray-700">¥{{ withdrawFees.technical_fee.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-gray-500">支付费 ({{ withdrawFeeRates.payment }}%)</span>
              <span class="text-gray-700">¥{{ withdrawFees.payment_fee.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-gray-500">提现费 ({{ withdrawFeeRates.withdraw }}%)</span>
              <span class="text-gray-700">¥{{ withdrawFees.withdraw_fee.toFixed(2) }}</span>
            </div>
            <div class="border-t border-gray-200 pt-2 flex justify-between text-sm font-medium">
              <span>实际到账</span>
              <span class="text-green-600">¥{{ withdrawFees.actual_arrival.toFixed(2) }}</span>
            </div>
          </div>

          <!-- 备注 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">备注（选填）</label>
            <input v-model="withdrawForm.remark" type="text" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="如：4月提现" />
          </div>
        </div>
        <div class="shrink-0 px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button @click="showWithdrawModal = false" class="px-4 py-2 text-gray-600 text-sm rounded-lg hover:bg-gray-100 cursor-pointer">取消</button>
          <button @click="doWithdraw" :disabled="!canSubmitWithdraw" class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">确认提现</button>
        </div>
      </div>
    </div>

    <!-- ==================== 新建/编辑店铺弹窗 ==================== -->
    <div v-if="showAddStore || showEditStoreModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="closeStoreModal">
      <div class="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col overflow-hidden">
        <div class="shrink-0 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 class="font-bold text-gray-800">{{ showEditStoreModal ? '编辑店铺' : '新建店铺' }}</h2>
          <button @click="closeStoreModal" class="text-gray-400 hover:text-gray-600 cursor-pointer text-xl">&times;</button>
        </div>
        <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">店铺名称</label>
            <input v-model="storeForm.name" type="text" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="如：抖店-王孟南台球教学店" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">平台</label>
            <select v-model="storeForm.ecommerce_platform" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="douyin">抖音</option>
              <option value="kuaishou">快手</option>
              <option value="shipinhao">视频号</option>
              <option value="taobao">淘宝</option>
              <option value="youzan">有赞</option>
              <option value="xiaohongshu">小红书</option>
              <option value="jd">京东</option>
              <option value="weidian">微店</option>
              <option value="other">其他</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">结算周期（天）</label>
            <input v-model.number="storeForm.settlement_days" type="number" min="0" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="如：15" />
            <div class="text-xs text-gray-400 mt-1">抖音/视频号通常 T+15，快手 T+7</div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">提现到账账户</label>
            <select v-model="storeForm.withdrawal_account_id" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="">暂不绑定</option>
              <option v-for="acc in cashAccounts" :key="acc.id" :value="acc.id">{{ acc.short_name }}</option>
            </select>
            <div class="text-xs text-gray-400 mt-1">提现时钱会转到这个账户</div>
          </div>
        </div>
        <div class="shrink-0 px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button @click="closeStoreModal" class="px-4 py-2 text-gray-600 text-sm rounded-lg hover:bg-gray-100 cursor-pointer">取消</button>
          <button @click="saveStore" :disabled="!storeForm.name" class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">{{ showEditStoreModal ? '保存' : '创建' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { logOperation } from '../utils/operationLogger'
import { PLATFORM_FEE_RATES, PLATFORM_LABELS, calcWithdrawFees } from '../lib/platformFees'

const auth = useAuthStore()
const role = computed(() => auth.profile?.role || '')
const canEdit = computed(() => ['admin', 'finance', 'manager'].includes(role.value))

// 状态
const activeTab = ref('overview')
const selectedDate = ref(new Date().toISOString().split('T')[0])
const stores = ref([])
const dailyStats = ref([])
const withdrawals = ref([])
const cashAccounts = ref([])
const expandedPlatforms = ref({ douyin: true, kuaishou: true, shipinhao: true })
const loading = ref(false)

// 提现弹窗
const showWithdrawModal = ref(false)
const withdrawForm = ref({ storeId: '', storeName: '', platform: '', withdrawableAmount: 0, amount: null, toAccountId: '', remark: '' })

// 店铺弹窗
const showAddStore = ref(false)
const showEditStoreModal = ref(false)
const editingStoreId = ref(null)
const storeForm = ref({ name: '', ecommerce_platform: 'douyin', settlement_days: 15, withdrawal_account_id: '' })

// 计算属性
const storesByPlatform = computed(() => {
  const groups = {}
  stores.value.forEach(s => {
    const key = s.ecommerce_platform || 'other'
    if (!groups[key]) groups[key] = []
    groups[key].push(s)
  })
  return groups
})

const todayStats = computed(() => {
  const date = selectedDate.value
  const dayStats = dailyStats.value.filter(d => d.order_date === date)
  return {
    total_orders: dayStats.reduce((sum, d) => sum + Number(d.order_count || 0), 0),
    total_sales: dayStats.reduce((sum, d) => sum + Number(d.sales_amount || 0), 0),
    total_refund: dayStats.reduce((sum, d) => sum + Number(d.refund_amount || 0), 0),
    total_net: dayStats.reduce((sum, d) => sum + Number(d.net_income || 0), 0),
  }
})

const totalWithdrawable = computed(() => stores.value.reduce((sum, s) => sum + Number(s.withdrawable_amount || 0), 0))

const withdrawFeeRates = computed(() => {
  const p = withdrawForm.value.platform
  return PLATFORM_FEE_RATES[p] || { technical: 0, payment: 0, withdraw: 0 }
})

const withdrawFees = computed(() => {
  return calcWithdrawFees(withdrawForm.value.amount || 0, withdrawForm.value.platform)
})

const canSubmitWithdraw = computed(() => {
  return withdrawForm.value.amount > 0
    && withdrawForm.value.amount <= withdrawForm.value.withdrawableAmount
    && withdrawForm.value.toAccountId
})

// 方法
function tabClass(tab) {
  return activeTab.value === tab
    ? 'px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white cursor-pointer'
    : 'px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer'
}

function platformLabel(key) {
  return PLATFORM_LABELS[key] || key || '未知'
}

function formatNum(n) {
  return Number(n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function togglePlatform(key) {
  expandedPlatforms.value[key] = !expandedPlatforms.value[key]
}

function getStoreDayStat(accountId, field) {
  const stat = dailyStats.value.find(d => d.account_id === accountId && d.order_date === selectedDate.value)
  return stat ? Number(stat[field] || 0) : 0
}

function getStoreDaySales(accountId) {
  return getStoreDayStat(accountId, 'sales_amount')
}

function calcTotalFee(feeDetail) {
  if (!feeDetail) return 0
  return Number(feeDetail.technical_fee || 0) + Number(feeDetail.payment_fee || 0) + Number(feeDetail.withdraw_fee || 0) + Number(feeDetail.other_fee || 0)
}

function getWithdrawalAccountName(id) {
  if (!id) return '未绑定'
  const acc = cashAccounts.value.find(a => a.id === id)
  return acc ? acc.short_name : '未找到'
}

function autoCalcWithdrawFees() {
  // 费用自动计算在 computed 里已处理
}

// 提现
function openWithdraw(store) {
  const feeConfig = PLATFORM_FEE_RATES[store.ecommerce_platform] || { settlement_days: 15 }
  withdrawForm.value = {
    storeId: store.id,
    storeName: store.short_name,
    platform: store.ecommerce_platform,
    withdrawableAmount: store.withdrawable_amount,
    amount: store.withdrawable_amount, // 默认全部提现
    toAccountId: store.withdrawal_account_id || '',
    remark: '',
  }
  showWithdrawModal.value = true
}

async function doWithdraw() {
  const f = withdrawForm.value
  const fees = calcWithdrawFees(f.amount, f.platform)

  const feeDetail = {
    technical_fee: fees.technical_fee,
    payment_fee: fees.payment_fee,
    withdraw_fee: fees.withdraw_fee,
    other_fee: 0,
  }

  try {
    const { data, error } = await supabase.rpc('execute_withdrawal', {
      p_account_id: f.storeId,
      p_to_account_id: f.toAccountId,
      p_amount: f.amount,
      p_fee_detail: feeDetail,
      p_remark: f.remark,
    })

    if (error) throw error

    // 记操作日志
    logOperation({
      action: 'ecommerce_withdrawal',
      account_id: f.storeId,
      description: `电商提现：${f.storeName} → 提现 ¥${f.amount.toFixed(2)}，手续费 ¥${fees.total.toFixed(2)}，实际到账 ¥${fees.actual_arrival.toFixed(2)}`,
    })

    showWithdrawModal.value = false
    toast(`提现成功！实际到账 ¥${fees.actual_arrival.toFixed(2)}`, 'success')
    await loadData()
  } catch (e) {
    toast('提现失败：' + (e.message || ''), 'error')
  }
}

// 店铺管理
function openEditStore(store) {
  editingStoreId.value = store.id
  storeForm.value = {
    name: store.short_name,
    ecommerce_platform: store.ecommerce_platform,
    settlement_days: store.settlement_days,
    withdrawal_account_id: store.withdrawal_account_id || '',
  }
  showEditStoreModal.value = true
}

function closeStoreModal() {
  showAddStore.value = false
  showEditStoreModal.value = false
  editingStoreId.value = null
  storeForm.value = { name: '', ecommerce_platform: 'douyin', settlement_days: 15, withdrawal_account_id: '' }
}

async function saveStore() {
  const f = storeForm.value
  if (!f.name) return

  try {
    if (showEditStore.value) {
      // 编辑
      const platform = f.ecommerce_platform === 'shipinhao' ? 'shipinhao' : f.ecommerce_platform
      const { error } = await supabase
        .from('accounts')
        .update({
          short_name: f.name,
          platform,
          ecommerce_platform: f.ecommerce_platform,
          settlement_days: f.settlement_days,
          withdrawal_account_id: f.withdrawal_account_id || null,
        })
        .eq('id', editingStoreId.value)
      if (error) throw error
      toast('店铺已更新', 'success')
    } else {
      // 新建
      const platform = f.ecommerce_platform === 'shipinhao' ? 'shipinhao' : f.ecommerce_platform
      const { error } = await supabase.from('accounts').insert({
        short_name: f.name,
        code: f.name,
        platform,
        ecommerce_platform: f.ecommerce_platform,
        settlement_days: f.settlement_days,
        balance: 0,
        opening_balance: 0,
        withdrawal_account_id: f.withdrawal_account_id || null,
        status: 'active',
        balance_method: 'auto',
      })
      if (error) throw error
      toast('店铺已创建', 'success')
    }
    closeStoreModal()
    await loadData()
  } catch (e) {
    toast('保存失败：' + (e.message || ''), 'error')
  }
}

const showEditStore = computed(() => !!editingStoreId.value)

// Toast
const toastMsg = ref('')
const toastType = ref('success')
const toastVisible = ref(false)
function toast(msg, type = 'success') {
  toastMsg.value = msg
  toastType.value = type
  toastVisible.value = true
  setTimeout(() => { toastVisible.value = false }, 3000)
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    // 并行加载
    const [storesRes, statsRes, cashRes, withdrawalsRes] = await Promise.all([
      // 电商店铺
      supabase
        .from('accounts')
        .select('id, short_name, platform, ecommerce_platform, settlement_days, balance, withdrawal_account_id, status')
        .eq('status', 'active')
        .not('ecommerce_platform', 'is', null)
        .order('ecommerce_platform'),
      // 日统计
      supabase
        .from('v_ecommerce_daily')
        .select('*')
        .eq('order_date', selectedDate.value),
      // 现金账户
      supabase
        .from('accounts')
        .select('id, short_name, platform, balance')
        .is('ecommerce_platform', null)
        .eq('status', 'active')
        .order('short_name'),
      // 提现记录
      supabase
        .from('withdrawals')
        .select('*, from_store:accounts!withdrawals_account_id_fkey(id, short_name), to_account:accounts!withdrawals_to_account_id_fkey(id, short_name)')
        .order('created_at', { ascending: false })
        .limit(100),
    ])

    cashAccounts.value = cashRes.data || []
    withdrawals.value = withdrawalsRes.data || []

    // 获取每个店铺的可提现金额
    const storeList = storesRes.data || []
    const storesWithWd = await Promise.all(
      storeList.map(async (store) => {
        const { data: wd } = await supabase.rpc('get_withdrawable_amount', { p_account_id: store.id })
        return { ...store, withdrawable_amount: Number(wd || 0) }
      })
    )
    stores.value = storesWithWd
    dailyStats.value = statsRes.data || []
  } catch (e) {
    console.error('加载电商数据失败:', e)
  } finally {
    loading.value = false
  }
}

// 监听日期变化
watch(selectedDate, async () => {
  const { data } = await supabase
    .from('v_ecommerce_daily')
    .select('*')
    .eq('order_date', selectedDate.value)
  dailyStats.value = data || []
})

onMounted(() => {
  if (auth.isAuthenticated) loadData()
})
</script>
