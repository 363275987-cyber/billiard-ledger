# 台球账目系统 — 完整需求文档

> 版本：v2.0
> 日期：2026-04-01
> 用途：交给开发agent重建项目

---

## 一、项目概述

台球教学的财务记账系统。核心场景：记录线下私域收入 + 电商（抖音/快手/视频号）销量，管理资金流转。

**核心原则：电商的钱只有提现到银行卡才算收入。**

```
订单成交 → 待结算（店铺钱包） → 已提现（到银行卡） → 算收入
```

**页面清单（7个）：**
1. Dashboard（首页）— 经营概览
2. 订单管理 — 私域+电商统一入口
3. 支出管理 — 支出登记
4. 产品库 — 产品/SKU参考库
5. 电商销量 — 电商独立看板
6. 账户管理 — 资金账户
7. 转账提现 — 资金转移

---

## 二、技术栈

**前端：**
- Vue 3 + Vite
- Vue Router 4
- Pinia（状态管理）
- Tailwind CSS 4
- ECharts + vue-echarts（图表）

**后端：**
- Supabase（PostgreSQL + Auth + REST API）
- Row Level Security（RLS）

**依赖：**
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.100.1",
    "echarts": "^6.0.0",
    "pinia": "^3.0.4",
    "tailwindcss": "^4.2.2",
    "vue": "^3.5.30",
    "vue-echarts": "^8.0.1",
    "vue-router": "^4.6.4",
    "xlsx": "^0.18.5"
  }
}
```

---

## 三、UI风格指南（Keep运动风格）

**配色：**
- 主色：运动绿 `#2ecc71`（用于Tab激活态、确认按钮、正向数字）
- 操作蓝：`#3b82f6`（用于链接、编辑按钮）
- 背景：`#f5f5f5`（页面背景）
- 卡片：白色 `#ffffff` + 大圆角 `rounded-xl` 或 `rounded-2xl`
- 文字：标题 `#111827`（gray-800），辅助 `#9ca3af`（gray-400）

**布局：**
- 页面容器：`max-w-5xl mx-auto` 或全宽
- 卡片：`bg-white rounded-xl border border-gray-100 shadow-sm p-4`
- 间距：`gap-3` 或 `gap-4`，`space-y-4`
- 响应式：`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

**组件：**
- 按钮：
  - 主按钮：`bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700`
  - 次按钮：`bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50`
  - Tab按钮激活：`bg-green-50 text-green-700 border-green-300 font-medium`
  - Tab按钮非激活：`bg-white text-gray-500 border-gray-200`

- 输入框：`border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500`

- 标签（Tag）：
  - 抖音：`bg-pink-100 text-pink-700`
  - 快手：`bg-orange-100 text-orange-700`
  - 视频号：`bg-green-100 text-green-700`

**数字显示：**
- 大数字：`text-xl font-bold` 或 `text-2xl font-bold`
- 正数（收入）：`text-green-600`
- 负数（支出）：`text-red-500`
- 格式化：千分位 + 2位小数，如 `¥12,345.00`

---

## 四、页面详细需求

### 4.1 Dashboard（首页）

**路由：** `/`

**权限：** 仅财务角色可见（admin/finance）

**顶部3卡片：**
```
┌──────────────────┬──────────────────┬──────────────────┐
│ 💰 今日销售额     │ 📦 今日订单数     │ 📈 本月利润       │
│   ¥12,345.00     │    28 笔         │   ¥8,900.00      │
│ 线下+电商合计     │  线下+电商合计    │ 收入-支出         │
└──────────────────┴──────────────────┴──────────────────┘
```

**数据来源：**
- 今日销售额：`orders` 表全部订单的 `payment_amount` 之和（不区分 `platform_type`，线下+电商都算）
- 今日订单数：`orders` 表全部订单数量
- 本月利润：线下收入（`platform_type IS NULL` 的订单金额）+ 转账中电商→现金的到账金额 - 本月支出（`expenses` 表）

**下方两栏：**
- 左边：最近10笔订单（全部，线下+电商混合）
  - 显示：客户名/店铺名、商品名、金额、平台标签（电商订单显示抖音/快手/视频号）、时间
  - 底部链接："查看全部 → /orders"
- 右边：账户余额总览
  - 显示：个人账户总余额、企业账户总余额（不含电商账户）
  - 底部链接："管理账户 → /accounts"

**不需要的东西：**
- 异常提醒、大额款项、待审批、退款率、产品利润、Top5账户、销售/客服视图

---

### 4.2 订单管理

**路由：** `/orders`

**顶部Tab筛选：**
- 全部订单（默认）
- 私域订单（`platform_type IS NULL`）
- 电商订单（`platform_type IS NOT NULL`）

**列表列头（根据Tab不同）：**

私域订单Tab：
| 时间 | 客服号 | 收款账户 | 客户(姓名+电话) | 商品 | 金额 | 订单类型 | 操作 |

电商订单Tab：
| 时间 | 店铺账户 | 商品(SKU) | 金额 | 平台 | 状态 | 操作 |

全部Tab：
| 时间 | 账户 | 客户/商品 | 金额 | 平台 | 状态 | 操作 |

**电商订单显示平台标签：**
- 抖音：粉色小标签 `bg-pink-100 text-pink-700`
- 快手：橙色小标签 `bg-orange-100 text-orange-700`
- 视频号：绿色小标签 `bg-green-100 text-green-700`

**操作：**
- 新建私域订单（手动填写）
- 导入电商Excel（按钮在页面顶部）
- 查看/编辑订单
- 确认收款（私域订单 pending 状态）
- 删除订单（仅 pending 状态）

**电商Excel导入功能：**

支持3个平台的销售订单 + 售后订单导入。导入时：
1. 解析Excel，识别平台（根据Sheet名包含"抖音"/"快手"/"视频号"）
2. 每行解析成订单对象
3. 去重检查（`external_order_no` + `platform_type` 唯一）
4. 匹配或创建店铺账户（`findOrCreateEcommerceAccount`）
5. 匹配产品（通过 `sku_code` 调用 `match_product_by_sku_code` RPC）
6. 如果SKU不存在，自动创建新产品（用Excel里的商品名+价格）
7. 插入 `orders` 表
8. 调用 `increment_balance` RPC 增加店铺余额
9. 售后订单：匹配原订单，插入 `refunds` 表，扣减店铺余额

**列映射（关键！）：**

抖音销售订单（Sheet名含"抖音"或"抖店"）：
| 列 | Index | 字段 |
|----|-------|------|
| C | 2 | order_time（支付完成时间）|
| D | 3 | platform_store（店铺）|
| F | 5 | external_order_no（子订单编号）|
| K | 10 | sku_code（商家编码）|
| L | 11 | quantity（商品数量）|
| M | 12 | payment_amount（商品金额）|
| W | 22 | status（订单状态）|

跳过：`status === '已关闭' || status === '同意退款，退款成功'`

快手销售订单（Sheet名含"快手"）：
| 列 | Index | 字段 |
|----|-------|------|
| C 或 I | 2 或 8 | order_time（支付完成时间，优先C列）|
| D | 3 | platform_store（店铺）|
| E | 4 | external_order_no（订单号）|
| AF | 32 | sku_code（SKU编码）|
| L | 11 | payment_amount（实付款）|
| K | 10 | status（订单状态）|

跳过：`status === '交易关闭'`

视频号销售订单（Sheet名含"视频号"）：
| 列 | Index | 字段 |
|----|-------|------|
| F | 5 | order_time（下单时间）|
| D | 3 | platform_store（店铺）|
| E | 4 | external_order_no（订单号）|
| AV | 47 | sku_code（SKU编码-自定义）|
| V | 21 | payment_amount（订单实际支付金额）|
| J | 9 | status（订单状态）|

跳过：`status === '已取消'`
quantity 固定为 1（视频号无单独数量列）

抖音售后订单（Sheet名含"售后"且含"抖音"）：
| 列 | Index | 字段 |
|----|-------|------|
| B | 1 | refund_no（售后单号）|
| C | 2 | external_order_no（订单号，用于匹配原订单）|
| A | 0 | platform_store（店铺）|
| M | 12 | refund_amount（退商品金额）|
| Q | 16 | status（售后状态）|

仅导入：`status === '退款成功' || status === '同意退款，退款成功'`

快手售后订单：
| 列 | Index | 字段 |
|----|-------|------|
| B | 1 | refund_no |
| C | 2 | external_order_no |
| P | 15 | refund_amount |
| Q | 16 | status |

仅导入：`status === '售后成功'`

视频号售后订单：
| 列 | Index | 字段 |
|----|-------|------|
| B | 1 | refund_no |
| J | 9 | external_order_no |
| W | 22 | refund_amount |
| X | 23 | status |

仅导入：`status === '退款成功'`

**退款归属：** 退款金额归属到**原订单的成交日**（`order_time`），不是退款操作日。查询某日销售额时：当天成交额 - 这批订单的所有退款（不管哪天退的）= 净营业额。

---

### 4.3 支出管理

**路由：** `/expenses`

**功能：**
- 手动登记支出（房租、工资、材料、物流、广告、平台费、退款、其他）
- 支出分类管理
- 按分类/日期筛选
- 列表：日期、分类、金额、备注、账户（从哪个账户扣的钱）
- 支持编辑和删除

**支出分类预设：**
- salary（工资）
- rent（房租）
- equipment（设备）
- marketing（营销/广告）
- tax（税费）
- daily（日常）
- shipping（物流）
- platform_fee（平台费）
- refund（退款）
- other（其他）

---

### 4.4 产品库

**路由：** `/products`

**定位：** 不是"严格管理的主数据"，而是"自动积累的参考库"。核心价值：订单列表显示产品名称、核对销量。

**功能：**
- 产品列表：名称、SKU编码、分类、品牌、成本价、零售价
- 搜索（按名称或SKU）
- 按分类/品牌筛选
- 新建/编辑产品
- 从飞书表格同步（批量）

**自动创建：**
- 电商导入时，遇到未知SKU自动创建新产品
- 用Excel里的商品名称 + 价格
- 不需要数据清理（去重、标准化）

**数据模型：**
- `products` 表：SPU（产品）层
- `product_skus` 表：SKU（规格编码）层
- 一个产品可有多个SKU

---

### 4.5 电商销量

**路由：** `/ecommerce-sales`

**数据来源：**
- 通过电商店铺账户关联：一个账户 = 一个店铺
- 订单的 `account_id` 决定归属哪个店铺
- 销售额按 `order_time`（成交日）统计
- 退款归属原订单成交日

**顶部汇总卡片（3个）：**
| 💰 销售额 | ↩️ 退款 | 📈 净营业额 |
|-----------|---------|-------------|
| ¥XX,XXX   | ¥X,XXX  | ¥XX,XXX     |
| XX 单     |         |             |

**筛选：**
- 平台Tab：全部平台 / 抖音 / 快手 / 视频号
- 店铺筛选下拉（列出所有电商店铺）
- 日期快捷选择：今日 / 近7天 / 近30天 / 本月
- 自定义日期范围（起始 ~ 结束）

**待结算资金（分店铺显示）：**
```
🛒 待结算资金
┌──────────────────────────────────┐
│ 抖店-靓仔甄选台球店    ¥12,500  │
│ 抖店-王孟南台球教学店    ¥8,300  │
│ 快手-王孟南台球教学      ¥5,200  │
│ 视频号-靓仔台球          ¥3,800  │
│ ─────────────────────────────── │
│ 合计                     ¥29,800 │
└──────────────────────────────────┘
```

**图表：**
- 日趋势折线图（全宽，按平台分色，可叠加对比）

**店铺明细表格：**
| 日期 | 店铺 | 平台 | 订单数 | 销售额 | 退款 | 净营业额 |

不需要订单明细。

---

### 4.6 账户管理

**路由：** `/accounts`

**三板块统计卡片：**
| 👤 个人账户 | 🏢 企业账户 | 🛒 电商待结算 |
|-------------|-------------|----------------|
| ¥XX,XXX     | ¥XX,XXX     | ¥XX,XXX        |
| X 个账户    | X 个账户    | X 个店铺       |

点击卡片自动筛选对应分类。默认显示个人账户。

**列表：**
- 账户名称、余额、平台、状态
- 支持新建/编辑/停用

**分类逻辑：**
- 个人账户：`category = 'personal'` 或通过平台判断（微信、支付宝、银行卡等）
- 企业账户：`category = 'company'`
- 电商账户：`ecommerce_platform IS NOT NULL`（抖音、快手、视频号等）

**电商账户余额显示为"待结算资金"，不计入现金总余额。**

---

### 4.7 转账提现

**路由：** `/transfers`

**功能：**
- 账户间转账（现金→现金）
- 电商提现（电商店铺→现金账户），自动计算平台手续费

**平台费率：**
| 平台 | 技术服务费 | 支付通道费 | 提现手续费 |
|------|-----------|-----------|-----------|
| 抖音 | 5%        | 0.6%      | 0.6%      |
| 快手 | 5%        | 0.6%      | 0.3%      |
| 视频号 | 2%      | 0.6%      | 0.1%      |

**费用明细面板：**
当转出账户为电商店铺时，自动弹出费用明细面板：
- 技术服务费 = 金额 × 技术费率
- 支付通道费 = 金额 × 支付费率
- 提现手续费 = 金额 × 提现费率
- 其他费用（手动输入）
- 费用合计

**扣费方式：**
- 内扣：从本笔金额中扣除费用
- 外扣：从账户余额中另扣费用

**实际到账 = 金额 - 费用合计**

---

## 五、数据模型

### 核心表

**accounts（账户）：**
```sql
id UUID PRIMARY KEY
code TEXT UNIQUE NOT NULL           -- 账户标识
short_name TEXT                     -- 简称
real_name TEXT                      -- 全称
platform TEXT                       -- 平台（wechat/alipay/douyin/kuaishou/shipinhao等）
category TEXT                       -- 分类（personal/company/ecommerce）
ecommerce_platform TEXT             -- 电商平台标识（douyin/kuaishou/shipinhao）
balance NUMERIC DEFAULT 0           -- 余额
opening_balance NUMERIC DEFAULT 0   -- 期初余额
status TEXT DEFAULT 'active'        -- 状态（active/frozen）
settlement_days INTEGER             -- 结算周期（抖音15，快手7）
withdrawal_account_id UUID          -- 提现到账账户
```

**orders（订单）：**
```sql
id UUID PRIMARY KEY
order_no TEXT UNIQUE NOT NULL       -- 订单号
account_id UUID REFERENCES accounts -- 关联账户
account_code TEXT NOT NULL          -- 账户编码
customer_name TEXT                  -- 客户姓名
customer_phone TEXT                 -- 客户电话
product_name TEXT                   -- 产品名称
product_category TEXT               -- 产品分类
amount NUMERIC NOT NULL             -- 订单金额
payment_amount NUMERIC              -- 实付金额（电商）
status TEXT DEFAULT 'pending'       -- 状态（pending/completed/cancelled/partially_refunded/refunded）
order_source TEXT                   -- 订单来源（organic/sales_guided/shared）
service_number_code TEXT            -- 客服号
sales_name TEXT                     -- 业绩归属
created_at TIMESTAMPTZ DEFAULT NOW()
-- 电商字段
platform_type TEXT                  -- 平台类型（douyin/kuaishou/shipinhao）
platform_store TEXT                 -- 店铺名称
external_order_no TEXT              -- 外部订单号
sku_code TEXT                       -- SKU编码
order_time TIMESTAMPTZ              -- 订单成交时间
actual_income NUMERIC               -- 实际收入（扣除退款后）
```

**expenses（支出）：**
```sql
id UUID PRIMARY KEY
category TEXT NOT NULL              -- 分类
amount NUMERIC NOT NULL             -- 金额
payee TEXT                          -- 收款方
note TEXT                           -- 备注
account_id UUID REFERENCES accounts -- 关联账户
status TEXT DEFAULT 'pending'       -- 状态（pending/approved/rejected）
created_at TIMESTAMPTZ DEFAULT NOW()
```

**refunds（退款）：**
```sql
id UUID PRIMARY KEY
order_id UUID REFERENCES orders     -- 关联原订单
refund_no TEXT UNIQUE               -- 退款单号
refund_amount NUMERIC NOT NULL      -- 退款金额
status TEXT DEFAULT 'pending'       -- 状态
platform_type TEXT                  -- 平台类型
external_order_no TEXT              -- 外部订单号
created_at TIMESTAMPTZ DEFAULT NOW()
```

**products（产品）：**
```sql
id UUID PRIMARY KEY
name TEXT NOT NULL                  -- 产品名称
category TEXT                       -- 分类
brand TEXT                          -- 品牌
cost_price NUMERIC                  -- 成本价
retail_price NUMERIC               -- 零售价
status TEXT DEFAULT 'active'
```

**product_skus（SKU）：**
```sql
id UUID PRIMARY KEY
product_id UUID REFERENCES products -- 关联产品
sku_code TEXT UNIQUE NOT NULL       -- SKU编码
name TEXT                           -- SKU名称
cost_price NUMERIC                  -- 成本价
retail_price NUMERIC               -- 零售价
```

**account_transfers（转账）：**
```sql
id UUID PRIMARY KEY
from_account_id UUID REFERENCES accounts
to_account_id UUID REFERENCES accounts
amount NUMERIC NOT NULL             -- 转账金额
fee NUMERIC DEFAULT 0               -- 手续费
note TEXT                           -- 备注
created_at TIMESTAMPTZ DEFAULT NOW()
```

---

## 六、关键RPC函数

**increment_balance(acct_id, delta)：**
- 原子操作：`UPDATE accounts SET balance = balance + delta WHERE id = acct_id`
- 返回更新后的余额

**match_product_by_sku_code(sku_code)：**
- 根据 SKU 编码匹配产品
- 返回：`product_id`, `product_name`, `cost_price`, `retail_price`

**findOrCreateEcommerceAccount(platform_store, platform_type)：**
- 查找或创建电商店铺账户
- 创建时设置：
  - `short_name = platform_store`
  - `platform = platform_type`
  - `ecommerce_platform = platform_type`
  - `settlement_days = 7`（快手）或 `15`（其他）
  - `category = 'ecommerce'`
  - `status = 'active'`

---

## 七、数据流

```
                    ┌─────────────┐
                    │  飞书Excel   │
                    └──────┬──────┘
                           │  导入
                           ▼
┌──────────────────────────────────────────────────┐
│                  订单管理 (/orders)                 │
│                                                    │
│  输入：飞书Excel(电商) / 手动填写(私域)            │
│  输出：                                        │
│    → orders 表（payment_amount, status,           │
│       platform_type, account_id, sku_code）       │
│    → accounts.balance += payment_amount            │
│    → products 表（未知SKU自动创建）               │
│    → product_skus 关联（SKU匹配）                 │
│    → refunds 表（售后Excel导入时）               │
└──────────────┬──────────────┬───────────────────┘
               │              │
               ▼              ▼
        ┌──────────┐   ┌──────────────┐
        │ Dashboard│   │ 电商销量     │
        └──────────┘   └──────────────┘
             │              │
             ▼              ▼
      ┌─────────────────────────────┐
      │        账户管理 (/accounts)  │
      └──────────────┬─────────────┘
                     │
                     ▼
           ┌──────────────────┐
           │  转账提现        │
           │  电商店铺 → 现金   │
           │  自动算平台手续费    │
           └──────────────────┘
                     │
                     ▼
           ┌──────────────────┐
           │   支出管理       │
           └──────────────────┘
```

---

## 八、已知问题和注意事项

1. **电商订单和私域订单混在一张表**：用 `platform_type IS NULL` 区分，查询时记得加过滤条件
2. **退款归属原订单日**：查询时通过 `orders.order_time` 分组，不是 `refunds.created_at`
3. **电商余额不算收入**：只有提现到现金账户才算
4. **部分退款订单**：状态 `partially_refunded` 也要算入收入统计
5. **平台命名统一**：视频号统一用 `shipinhao`，不用 `weixin_video`
6. **SKU缓存**：导入时同一SKU只查一次数据库，结果缓存复用

---

## 九、侧边栏结构

```
✏️ 业务登记
   订单管理
   支出管理

📦 产品与电商
   产品库
   电商销量

💰 资金管理
   账户管理
   转账提现

⚙️ 系统（仅财务角色）
   用户管理
   系统设置
```

---

## 十、开发顺序建议

1. **基础层**：数据库 schema + Supabase 配置 + RLS 策略
2. **工具层**：stores（accounts/orders/products）+ 工具函数（formatMoney等）
3. **页面层**（可并行）：
   - Dashboard
   - 账户管理
   - 转账提现
   - 支出管理
   - 产品库
   - 电商销量
   - 订单管理（最复杂，放最后）
4. **电商导入逻辑**：Excel解析 + 列映射 + 导入流程
5. **联调测试**

---

**文档结束。**
