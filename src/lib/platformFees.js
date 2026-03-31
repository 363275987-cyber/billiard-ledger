// 平台提现费率配置
export const PLATFORM_FEE_RATES = {
  douyin:       { technical: 5, payment: 0.6, withdraw: 0.6, label: '抖音电商', settlement_days: 15 },
  kuaishou:     { technical: 5, payment: 0.6, withdraw: 0.3, label: '快手电商', settlement_days: 7 },
  shipinhao:    { technical: 2, payment: 0.6, withdraw: 0.1, label: '视频号',   settlement_days: 15 },
  taobao:       { technical: 5, payment: 0.6, withdraw: 0.1, label: '淘宝',     settlement_days: 15 },
  weixin_video: { technical: 2, payment: 0.6, withdraw: 0.1, label: '视频号',   settlement_days: 15 },
}

// 平台中文名映射
export const PLATFORM_LABELS = {
  douyin: '抖音',
  kuaishou: '快手',
  shipinhao: '视频号',
  taobao: '淘宝',
  youzan: '有赞',
  xiaohongshu: '小红书',
  jd: '京东',
  weidian: '微店',
  other: '其他',
}

// 根据费率自动计算提现费用明细
export function calcWithdrawFees(amount, platformKey) {
  const rates = PLATFORM_FEE_RATES[platformKey]
  if (!rates || amount <= 0) return { technical_fee: 0, payment_fee: 0, withdraw_fee: 0, other_fee: 0, total: 0, actual_arrival: amount }

  const technical_fee = Math.round(amount * rates.technical / 100 * 100) / 100
  const payment_fee   = Math.round(amount * rates.payment / 100 * 100) / 100
  const withdraw_fee  = Math.round(amount * rates.withdraw / 100 * 100) / 100
  const other_fee     = 0
  const total         = technical_fee + payment_fee + withdraw_fee + other_fee
  const actual_arrival = Math.round((amount - total) * 100) / 100

  return { technical_fee, payment_fee, withdraw_fee, other_fee, total, actual_arrival }
}
