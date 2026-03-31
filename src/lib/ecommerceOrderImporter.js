/**
 * 电商订单 Excel 导入器
 * 支持抖音、快手、视频号的销售订单和售后订单导入
 */

// ============ 平台识别 ============

/**
 * 根据 sheet 名称识别平台类型
 */
export function identifyPlatform(sheetName) {
  if (!sheetName) return null
  const name = sheetName.trim()
  if (name.includes('抖音') || name.includes('抖店')) return 'douyin'
  if (name.includes('快手')) return 'kuaishou'
  if (name.includes('视频号')) return 'shipinhao'
  return null
}

/**
 * 判断 sheet 是否为售后订单
 */
export function isAfterSalesSheet(sheetName) {
  if (!sheetName) return false
  return sheetName.includes('售后')
}

/**
 * 判断 sheet 是否为销售订单
 */
export function isSalesOrderSheet(sheetName) {
  if (!sheetName) return false
  return sheetName.includes('销售订单')
}

/**
 * 获取销售订单相关的 sheets（排除售后）
 */
export function getSalesSheets(sheetNames) {
  return sheetNames.filter(name =>
    !isAfterSalesSheet(name) && (
      isSalesOrderSheet(name) ||
      identifyPlatform(name) !== null
    )
  )
}

/**
 * 获取售后订单相关的 sheets
 */
export function getAfterSalesSheets(sheetNames) {
  return sheetNames.filter(name => isAfterSalesSheet(name))
}

// ============ 销售订单解析 ============

/**
 * 解析抖音销售订单
 * 列映射：
 * - F (index 5): 子订单编号 → external_order_no
 * - D (index 3): 店铺 → platform_store
 * - K (index 10): 商家编码 → sku_code
 * - L (index 11): 商品数量 → quantity
 * - M (index 12): 商品金额 → payment_amount
 * - W (index 22): 订单状态 → status
 * - C (index 2): 支付完成时间 → order_time
 */
function parseDouyinSalesRow(row, rowIdx) {
  const get = (idx) => String(row[idx] ?? '').trim()
  const getNum = (idx) => {
    const v = get(idx)
    if (!v) return 0
    const n = parseFloat(v.replace(/[,，\s]/g, ''))
    return isNaN(n) ? 0 : n
  }

  const status = get(22)
  // 跳过"已关闭"和"同意退款，退款成功"
  if (status === '已关闭' || status === '同意退款，退款成功') return null

  const paymentAmount = getNum(12)
  if (paymentAmount <= 0) return null

  return {
    _rowIdx: rowIdx,
    _selected: true,
    _type: 'sales',
    platform_type: 'douyin',
    external_order_no: get(5),  // F列 - 子订单编号
    platform_store: get(3),     // D列 - 店铺
    sku_code: get(10),          // K列 - 商家编码
    quantity: getNum(11),       // L列 - 商品数量
    payment_amount: paymentAmount, // M列 - 商品金额
    status: status,
    order_time: get(2),         // C列 - 支付完成时间
    _rawRow: row,
  }
}

/**
 * 解析快手销售订单
 * 列映射：
 * - E (index 4): 订单号 → external_order_no
 * - D (index 3): 店铺 → platform_store
 * - AF (index 32): SKU编码 → sku_code
 * - L (index 11): 实付款 → payment_amount
 * - K (index 10): 订单状态 → status
 * - C (index 2) 或 I (index 8): 支付完成时间 → order_time
 */
function parseKuaishouSalesRow(row, rowIdx) {
  const get = (idx) => String(row[idx] ?? '').trim()
  const getNum = (idx) => {
    const v = get(idx)
    if (!v) return 0
    const n = parseFloat(v.replace(/[,，\s]/g, ''))
    return isNaN(n) ? 0 : n
  }

  const status = get(10)
  // 跳过"交易关闭"
  if (status === '交易关闭') return null

  const paymentAmount = getNum(11)
  if (paymentAmount <= 0) return null

  // 支付完成时间：优先列C，空的话取列I
  const orderTime = get(2) || get(8)

  return {
    _rowIdx: rowIdx,
    _selected: true,
    _type: 'sales',
    platform_type: 'kuaishou',
    external_order_no: get(4),   // E列 - 订单号
    platform_store: get(3),      // D列 - 店铺
    sku_code: get(32),           // AF列 - SKU编码
    quantity: getNum(11),        // L列 - 实付款 (也作为数量占位)
    payment_amount: paymentAmount,
    status: status,
    order_time: orderTime,
    _rawRow: row,
  }
}

/**
 * 解析视频号销售订单
 * 列映射：
 * - E (index 4): 订单号 → external_order_no
 * - D (index 3): 店铺 → platform_store
 * - AV (index 47): SKU编码(自定义) → sku_code
 * - V (index 21): 订单实际支付金额 → payment_amount
 * - J (index 9): 订单状态 → status
 * - F (index 5): 订单下单时间 → order_time
 */
function parseShipinhaoSalesRow(row, rowIdx) {
  const get = (idx) => String(row[idx] ?? '').trim()
  const getNum = (idx) => {
    const v = get(idx)
    if (!v) return 0
    const n = parseFloat(v.replace(/[,，\s]/g, ''))
    return isNaN(n) ? 0 : n
  }

  const status = get(9)
  // 跳过"已取消"
  if (status === '已取消') return null

  const paymentAmount = getNum(21)
  if (paymentAmount <= 0) return null

  return {
    _rowIdx: rowIdx,
    _selected: true,
    _type: 'sales',
    platform_type: 'shipinhao',
    external_order_no: get(4),    // E列 - 订单号
    platform_store: get(3),       // D列 - 店铺
    sku_code: get(47),            // AV列 - SKU编码(自定义)
    quantity: 1,                  // 视频号无单独数量列
    payment_amount: paymentAmount,
    status: status,
    order_time: get(5),           // F列 - 订单下单时间
    _rawRow: row,
  }
}

// ============ 售后订单解析 ============

/**
 * 解析抖音售后订单
 * 列映射：
 * - B (index 1): 售后单号 → refund_no
 * - C (index 2): 订单号 → external_order_no（用于匹配）
 * - A (index 0): 店铺 → platform_store
 * - L (index 12): 退商品金额 → refund_amount
 * - Q (index 16): 售后状态 → status
 */
function parseDouyinAfterSalesRow(row, rowIdx) {
  const get = (idx) => String(row[idx] ?? '').trim()
  const getNum = (idx) => {
    const v = get(idx)
    if (!v) return 0
    const n = parseFloat(v.replace(/[,，\s]/g, ''))
    return isNaN(n) ? 0 : n
  }

  const status = get(16)
  // 只处理"退款成功"或"同意退款，退款成功"
  if (status !== '退款成功' && status !== '同意退款，退款成功') return null

  const refundAmount = getNum(12)
  if (refundAmount <= 0) return null

  return {
    _rowIdx: rowIdx,
    _selected: true,
    _type: 'aftersales',
    platform_type: 'douyin',
    refund_no: get(1),           // B列 - 售后单号
    external_order_no: get(2),   // C列 - 订单号
    platform_store: get(0),      // A列 - 店铺
    refund_amount: refundAmount, // L列 - 退商品金额
    status: status,
    _rawRow: row,
  }
}

/**
 * 解析快手售后订单
 * 列映射：
 * - B (index 1): 售后单号 → refund_no
 * - C (index 2): 订单编号 → external_order_no
 * - A (index 0): 店铺 → platform_store
 * - O (index 15): 退款金额 → refund_amount
 * - P (index 16): 售后状态 → status
 */
function parseKuaishouAfterSalesRow(row, rowIdx) {
  const get = (idx) => String(row[idx] ?? '').trim()
  const getNum = (idx) => {
    const v = get(idx)
    if (!v) return 0
    const n = parseFloat(v.replace(/[,，\s]/g, ''))
    return isNaN(n) ? 0 : n
  }

  const status = get(16)
  // 只处理"售后成功"
  if (status !== '售后成功') return null

  const refundAmount = getNum(15)
  if (refundAmount <= 0) return null

  return {
    _rowIdx: rowIdx,
    _selected: true,
    _type: 'aftersales',
    platform_type: 'kuaishou',
    refund_no: get(1),           // B列 - 售后单号
    external_order_no: get(2),   // C列 - 订单编号
    platform_store: get(0),      // A列 - 店铺
    refund_amount: refundAmount, // O列 - 退款金额
    status: status,
    _rawRow: row,
  }
}

/**
 * 解析视频号售后订单
 * 列映射：
 * - B (index 1): 售后单号 → refund_no
 * - J (index 9): 订单编号 → external_order_no
 * - A (index 0): 店铺 → platform_store
 * - W (index 22): 退款金额 → refund_amount
 * - X (index 23): 售后状态 → status
 */
function parseShipinhaoAfterSalesRow(row, rowIdx) {
  const get = (idx) => String(row[idx] ?? '').trim()
  const getNum = (idx) => {
    const v = get(idx)
    if (!v) return 0
    const n = parseFloat(v.replace(/[,，\s]/g, ''))
    return isNaN(n) ? 0 : n
  }

  const status = get(23)
  // 只处理"退款成功"
  if (status !== '退款成功') return null

  const refundAmount = getNum(22)
  if (refundAmount <= 0) return null

  return {
    _rowIdx: rowIdx,
    _selected: true,
    _type: 'aftersales',
    platform_type: 'shipinhao',
    refund_no: get(1),           // B列 - 售后单号
    external_order_no: get(9),   // J列 - 订单编号
    platform_store: get(0),      // A列 - 店铺
    refund_amount: refundAmount, // W列 - 退款金额
    status: status,
    _rawRow: row,
  }
}

// ============ 主解析入口 ============

/**
 * 解析 Excel workbook，返回销售订单和售后订单
 * @param {Object} workbook - XLSX workbook
 * @param {Object} options - { autoDetect: boolean, forcePlatform: string|null }
 * @returns {{ salesOrders: Array, afterSalesOrders: Array, skipped: number, errors: string[] }}
 */
export function parseEcommerceExcel(workbook, options = {}) {
  const { autoDetect = true, forcePlatform = null } = options
  const sheetNames = workbook.SheetNames

  const salesOrders = []
  const afterSalesOrders = []
  let skipped = 0
  const errors = []
  const seenExternalNos = new Set()
  const seenRefundNos = new Set()

  // 处理每个 sheet
  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) continue

    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
    if (jsonData.length < 2) continue

    // 跳过表头行
    const rows = jsonData.slice(1).filter(row =>
      row.some(cell => cell !== '' && cell !== null && cell !== undefined)
    )

    // 确定平台
    let platform = null
    if (forcePlatform) {
      platform = forcePlatform
    } else if (autoDetect) {
      platform = identifyPlatform(sheetName)
    }

    if (!platform) {
      errors.push(`Sheet "${sheetName}" 无法识别平台，已跳过`)
      continue
    }

    const isAfterSales = isAfterSalesSheet(sheetName)

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowIdx = i + 2 // +2: +1 for 0-index, +1 for header

      try {
        if (isAfterSales) {
          // 售后订单
          let parsed = null
          if (platform === 'douyin') parsed = parseDouyinAfterSalesRow(row, rowIdx)
          else if (platform === 'kuaishou') parsed = parseKuaishouAfterSalesRow(row, rowIdx)
          else if (platform === 'shipinhao') parsed = parseShipinhaoAfterSalesRow(row, rowIdx)

          if (!parsed) { skipped++; continue }

          // 售后去重
          if (parsed.refund_no && seenRefundNos.has(parsed.refund_no)) {
            skipped++
            continue
          }
          if (parsed.refund_no) seenRefundNos.add(parsed.refund_no)

          afterSalesOrders.push(parsed)
        } else {
          // 销售订单
          let parsed = null
          if (platform === 'douyin') parsed = parseDouyinSalesRow(row, rowIdx)
          else if (platform === 'kuaishou') parsed = parseKuaishouSalesRow(row, rowIdx)
          else if (platform === 'shipinhao') parsed = parseShipinhaoSalesRow(row, rowIdx)

          if (!parsed) { skipped++; continue }

          // 销售去重
          if (parsed.external_order_no) {
            const dedupKey = `${parsed.platform_type}:${parsed.external_order_no}`
            if (seenExternalNos.has(dedupKey)) {
              skipped++
              continue
            }
            seenExternalNos.add(dedupKey)
          }

          salesOrders.push(parsed)
        }
      } catch (e) {
        errors.push(`Sheet "${sheetName}" 第 ${rowIdx} 行解析错误: ${e.message}`)
        skipped++
      }
    }
  }

  return { salesOrders, afterSalesOrders, skipped, errors }
}

// ============ 数据库操作 ============

/**
 * 执行电商订单导入（销售+售后）
 * @param {Object} params
 * @param {Array} params.salesOrders - 销售订单列表
 * @param {Array} params.afterSalesOrders - 售后订单列表
 * @param {Function} params.supabase - supabase client
 * @param {Function} params.onProgress - 进度回调
 * @returns {{ success: number, duplicate: number, failures: Array }}
 */
export async function importEcommerceOrders({ salesOrders, afterSalesOrders, supabase: sb, onProgress }) {
  const result = { success: 0, duplicate: 0, failures: [] }

  // 预加载已有订单的外部订单号（去重）
  const existingExternalNos = new Set()
  const existingRefundNos = new Set()

  if (salesOrders.length > 0) {
    try {
      const { data: existing } = await sb
        .from('orders')
        .select('external_order_no, platform_type')
        .not('external_order_no', 'is', null)
        .limit(100000)

      for (const row of (existing || [])) {
        if (row.external_order_no && row.platform_type) {
          existingExternalNos.add(`${row.platform_type}:${row.external_order_no}`)
        }
      }
    } catch (e) {
      console.warn('去重查询失败:', e)
    }
  }

  if (afterSalesOrders.length > 0) {
    try {
      const { data: existing } = await sb
        .from('refunds')
        .select('refund_no')
        .not('refund_no', 'is', null)
        .limit(100000)

      for (const row of (existing || [])) {
        if (row.refund_no) existingRefundNos.add(row.refund_no)
      }
    } catch (e) {
      console.warn('售后去重查询失败:', e)
    }
  }

  // ========== 导入销售订单 ==========
  for (let i = 0; i < salesOrders.length; i++) {
    const order = salesOrders[i]
    onProgress?.({ type: 'sales', current: i, total: salesOrders.length })

    try {
      // 去重
      if (order.external_order_no) {
        const dedupKey = `${order.platform_type}:${order.external_order_no}`
        if (existingExternalNos.has(dedupKey)) {
          result.duplicate++
          continue
        }
      }

      // 匹配/创建账户
      const accountId = await findOrCreateEcommerceAccount(sb, order.platform_type, order.platform_store)

      // 解析时间
      const orderTime = parseOrderTime(order.order_time)

      // 构建订单数据
      const payload = {
        customer_name: '电商客户',
        customer_phone: '',
        customer_address: '',
        product_name: '',
        product_category: 'other',
        amount: order.payment_amount,
        status: 'completed',
        order_source: 'cs_service',
        external_order_no: order.external_order_no,
        platform_type: order.platform_type,
        platform_store: order.platform_store,
        sku_code: order.sku_code || null,
        payment_amount: order.payment_amount,
        order_time: orderTime,
      }

      if (accountId) {
        payload.account_id = accountId
      }

      // 如果有 SKU 编码，尝试匹配产品
      if (order.sku_code) {
        try {
          const { data: productMatch } = await sb.rpc('match_product_by_sku_code', {
            p_sku_code: order.sku_code.trim()
          })
          if (productMatch && productMatch.sku_id) {
            payload.product_name = productMatch.product_name || ''
            // product_id 通过 order_items 关联
          }
        } catch (_) {
          // SKU 匹配失败不影响导入
        }
      }

      const { data: created, error } = await sb
        .from('orders')
        .insert(payload)
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          result.duplicate++
        } else {
          result.failures.push({
            row: order._rowIdx,
            external_order_no: order.external_order_no,
            message: error.message,
          })
        }
        continue
      }

      // 标记为已存在
      if (order.external_order_no) {
        existingExternalNos.add(`${order.platform_type}:${order.external_order_no}`)
      }

      // 创建 order_items（如果有产品匹配）
      if (order.sku_code) {
        try {
          const { data: productMatch } = await sb.rpc('match_product_by_sku_code', {
            p_sku_code: order.sku_code.trim()
          })
          if (productMatch && productMatch.sku_id) {
            await sb.from('order_items').insert({
              order_id: created.id,
              product_name: productMatch.product_name || '',
              quantity: order.quantity || 1,
              product_id: productMatch.product_id || null,
            })
          }
        } catch (_) {}
      }

      // 更新账户余额
      if (accountId && order.payment_amount > 0) {
        try {
          await sb.rpc('increment_balance', {
            acct_id: accountId,
            delta: order.payment_amount
          })
        } catch (e) {
          console.warn('余额更新失败:', e)
        }
      }

      result.success++
    } catch (e) {
      result.failures.push({
        row: order._rowIdx,
        external_order_no: order.external_order_no,
        message: e.message || '创建失败',
      })
    }
  }

  // ========== 导入售后订单 ==========
  for (let i = 0; i < afterSalesOrders.length; i++) {
    const refund = afterSalesOrders[i]
    onProgress?.({ type: 'aftersales', current: i, total: afterSalesOrders.length })

    try {
      // 售后去重
      if (refund.refund_no && existingRefundNos.has(refund.refund_no)) {
        result.duplicate++
        continue
      }

      // 匹配原始订单
      const { data: matchedOrder, error: matchError } = await sb
        .from('orders')
        .select('id, account_id, payment_amount')
        .eq('external_order_no', refund.external_order_no)
        .eq('platform_type', refund.platform_type)
        .maybeSingle()

      if (matchError || !matchedOrder) {
        result.failures.push({
          row: refund._rowIdx,
          refund_no: refund.refund_no,
          message: `未找到匹配的原始订单: ${refund.external_order_no}`,
        })
        continue
      }

      // 创建退款记录
      const refundPayload = {
        order_id: matchedOrder.id,
        refund_no: refund.refund_no,
        refund_amount: refund.refund_amount,
        reason: `${refund.platform_type} 售后退款`,
        status: 'completed',
        refund_to_account_id: matchedOrder.account_id,
        platform_type: refund.platform_type,
      }

      const { data: createdRefund, error: refundError } = await sb
        .from('refunds')
        .insert(refundPayload)
        .select()
        .single()

      if (refundError) {
        if (refundError.code === '23505') {
          result.duplicate++
        } else {
          result.failures.push({
            row: refund._rowIdx,
            refund_no: refund.refund_no,
            message: refundError.message,
          })
        }
        continue
      }

      // 标记售后去重
      if (refund.refund_no) existingRefundNos.add(refund.refund_no)

      // 减少账户余额
      if (matchedOrder.account_id && refund.refund_amount > 0) {
        try {
          await sb.rpc('increment_balance', {
            acct_id: matchedOrder.account_id,
            delta: -refund.refund_amount
          })
        } catch (e) {
          console.warn('售后余额扣减失败:', e)
        }
      }

      // 更新订单的实际收入
      try {
        const { data: refundSum } = await sb
          .from('refunds')
          .select('refund_amount')
          .eq('order_id', matchedOrder.id)
          .eq('status', 'completed')

        const totalRefund = (refundSum || []).reduce((s, r) => s + Number(r.refund_amount || 0), 0)
        const actualIncome = (Number(matchedOrder.payment_amount) || 0) - totalRefund

        await sb
          .from('orders')
          .update({ actual_income: actualIncome })
          .eq('id', matchedOrder.id)
      } catch (e) {
        console.warn('更新实际收入失败:', e)
      }

      result.success++
    } catch (e) {
      result.failures.push({
        row: refund._rowIdx,
        refund_no: refund.refund_no,
        message: e.message || '导入售后失败',
      })
    }
  }

  return result
}

// ============ 辅助函数 ============

/**
 * 查找或创建电商账户
 */
async function findOrCreateEcommerceAccount(sb, platformType, storeName) {
  if (!storeName) return null

  // 先尝试精确匹配
  const { data: existing } = await sb
    .from('accounts')
    .select('id, short_name, platform')
    .eq('status', 'active')
    .limit(500)

  if (existing) {
    // 精确匹配店铺名
    const exactMatch = existing.find(a =>
      (a.short_name || '').includes(storeName)
    )
    if (exactMatch) return exactMatch.id

    // 匹配同平台账户
    const platformMatch = existing.find(a => a.platform === platformType)
    if (platformMatch) return platformMatch.id
  }

  // 自动创建新账户
  try {
    const { data: newAccount, error } = await sb
      .from('accounts')
      .insert({
        short_name: storeName,
        code: storeName,
        platform: platformType,
        balance: 0,
        opening_balance: 0,
        status: 'active',
      })
      .select()
      .single()

    if (error) throw error
    return newAccount?.id
  } catch (e) {
    console.warn('自动创建账户失败:', storeName, e)
    return null
  }
}

/**
 * 解析各种时间格式
 */
function parseOrderTime(dateStr) {
  if (!dateStr) return null
  if (typeof dateStr === 'number') {
    // Excel serial date
    const d = new Date((dateStr - 25569) * 86400 * 1000)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }
  const str = String(dateStr).trim()
  const d = new Date(str)
  if (!isNaN(d.getTime())) return d.toISOString()
  // 尝试常见格式: 2026-01-01 12:00:00, 2026/1/1 12:00
  const match = str.match(/(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/)
  if (match) {
    const [, y, m, d2, h, min, s] = match
    const isoStr = `${y}-${m.padStart(2, '0')}-${d2.padStart(2, '0')}T${(h || '00').padStart(2, '0')}:${(min || '00').padStart(2, '0')}:${(s || '00').padStart(2, '0')}+08:00`
    const parsed = new Date(isoStr)
    if (!isNaN(parsed.getTime())) return parsed.toISOString()
  }
  return null
}

/**
 * 平台中文名
 */
export function platformTypeName(type) {
  const map = { douyin: '抖音', kuaishou: '快手', shipinhao: '视频号' }
  return map[type] || type || ''
}
