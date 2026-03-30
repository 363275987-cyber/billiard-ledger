<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-bold text-gray-800">🏦 账户管理</h1>
      <div class="flex gap-2">
        <button
          v-if="authStore.isAdmin"
          @click="showLogModal = true"
          class="text-gray-500 px-3 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50 transition cursor-pointer"
        >
          📜 余额日志
        </button>
        <button
          v-if="canManage"
          @click="openModal()"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition cursor-pointer"
        >
          ➕ 添加账户
        </button>
      </div>
    </div>

    <!-- 今日余额变动 -->
    <div v-if="todayTransferData.loaded" class="bg-white rounded-xl p-3 mb-4 border border-gray-100 flex items-center gap-3">
      <div class="w-1 h-8 rounded-full bg-blue-400"></div>
      <div class="text-sm">
        <span class="text-gray-400">今日转账</span>
        <span v-if="todayTransferData.count > 0" class="ml-2 font-semibold text-gray-800">{{ todayTransferData.count }} 笔</span>
        <span v-if="todayTransferData.count > 0" class="ml-2 text-blue-500">{{ '¥' + todayTransferData.total.toFixed(2) }}</span>
        <span v-else class="ml-2 text-gray-300">无</span>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-3 gap-4 mb-5">
      <div class="bg-white rounded-xl border border-gray-100 p-4">
        <div class="text-xs text-gray-400 mb-1">📂 账户总数</div>
        <div class="text-2xl font-bold text-gray-800">{{ stats.total }}</div>
      </div>
      <div class="bg-white rounded-xl border border-gray-100 p-4">
        <div class="text-xs text-gray-400 mb-1">✅ 活跃账户</div>
        <div class="text-2xl font-bold text-green-600">{{ stats.active }}</div>
      </div>
      <div class="bg-white rounded-xl border border-gray-100 p-4">
        <div class="text-xs text-gray-400 mb-1">💰 总余额</div>
        <div class="text-2xl font-bold" :class="stats.totalBalance >= 0 ? 'text-green-600' : 'text-red-500'">{{ formatMoney(stats.totalBalance) }}</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex gap-3 items-center flex-wrap">
      <input
        v-model="filters.keyword"
        placeholder="🔍 搜索账户简称..."
        class="px-3 py-2 border border-gray-200 rounded-lg text-sm w-56 outline-none focus:ring-2 focus:ring-blue-500"
      >
      <select
        v-model="filters.platform"
        class="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">全部平台</option>
        <option v-for="(label, key) in PLATFORM_LABELS" :key="key" :value="key">{{ platformIcon(key) }} {{ label }}</option>
      </select>
      <select
        v-model="filters.status"
        class="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">全部状态</option>
        <option value="active">✅ 活跃</option>
        <option value="frozen">🔒 停用</option>
      </select>
      <button
        @click="filters.hideZeroBalance = !filters.hideZeroBalance"
        :class="filters.hideZeroBalance ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'"
        class="px-3 py-2 border rounded-lg text-sm cursor-pointer transition"
      >
        {{ filters.hideZeroBalance ? '💰 显示零余额' : '💵 隐藏零余额' }}
      </button>
      <!-- View toggle -->
      <div class="flex border border-gray-200 rounded-lg overflow-hidden">
        <button
          @click="viewMode = 'card'"
          :class="viewMode === 'card' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'"
          class="px-2.5 py-2 text-sm cursor-pointer transition"
        >📐</button>
        <button
          @click="viewMode = 'list'"
          :class="viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'"
          class="px-2.5 py-2 text-sm cursor-pointer transition border-l border-gray-200"
        >📋</button>
      </div>
      <!-- Batch actions -->
      <template v-if="selectedIds.length > 0">
        <span class="text-sm text-blue-600 font-medium">已选 {{ selectedIds.length }} 项</span>
        <button @click="batchAction('freeze')" class="px-3 py-2 bg-orange-50 text-orange-600 border border-orange-200 rounded-lg text-sm cursor-pointer transition hover:bg-orange-100">🔒 批量停用</button>
        <button @click="batchAction('activate')" class="px-3 py-2 bg-green-50 text-green-600 border border-green-200 rounded-lg text-sm cursor-pointer transition hover:bg-green-100">🔓 批量启用</button>
        <button v-if="canDelete" @click="batchAction('delete')" class="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm cursor-pointer transition hover:bg-red-100">🗑️ 批量删除</button>
        <button @click="selectedIds = []" class="px-3 py-2 text-gray-400 border border-gray-200 rounded-lg text-sm cursor-pointer transition hover:bg-gray-50">✕ 取消</button>
      </template>
      <span class="text-sm text-gray-400 ml-auto">
        共 {{ filteredAccounts.length }} 个账户
      </span>
    </div>

    <!-- Loading -->
    <Skeleton v-if="loading" type="card" :count="6" card-grid-class="grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" />

    <!-- Select All -->
    <div v-if="viewMode === 'card' && !loading" class="flex items-center gap-2 mb-3 px-1">
      <input
        type="checkbox"
        :checked="selectedIds.length === filteredAccounts.length && filteredAccounts.length > 0"
        @change="selectedIds = $event.target.checked ? filteredAccounts.map(a => a.id) : []"
        class="rounded cursor-pointer"
      >
      <span class="text-xs text-gray-400">全选</span>
    </div>

    <!-- Account Cards Grid -->
    <div v-if="viewMode === 'card' && !loading" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      <div
        v-for="acc in filteredAccounts"
        :key="acc.id"
        class="flex items-start gap-2"
      >
        <input
          type="checkbox"
          :checked="selectedIds.includes(acc.id)"
          @change="toggleSelect(acc.id)"
          @click.stop
          class="mt-6 w-3.5 h-3.5 rounded cursor-pointer shrink-0 accent-blue-500"
        >
        <div class="account-card-container flex-1 group">
          <div @click="openModal(acc)" class="absolute inset-0 z-[5] cursor-pointer"></div>
          <div class="account-card-inner" :class="{ 'is-flipped': flippedCards[acc.id] }">
            <!-- Front -->
            <div class="account-card-front" :style="{ background: platformGradient(acc.platform) }">
              <!-- Flip button -->
              <button
                @click="flipCard(acc.id)"
                class="absolute top-2.5 right-2.5 w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/40 hover:text-white/80 text-xs transition z-10 cursor-pointer"
                title="查看详情"
              >↻</button>

              <!-- Main content -->
              <div class="flex flex-col justify-between p-4 h-full">
                <div class="flex items-center gap-2.5">
                  <!-- Platform logo (SVG) -->
                  <div class="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                    <!-- weixin_video (check first since wechat is more common) -->
                    <svg v-if="acc.ecommerce_platform === 'weixin_video'" viewBox="0 0 24 24" class="w-5 h-5"><path fill="white" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                    <!-- wechat -->
                    <svg v-else-if="acc.platform === 'wechat'" viewBox="0 0 24 24" class="w-5 h-5"><path fill="white" d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.493 4.016c-3.819 0-6.923 2.597-6.923 5.8 0 3.204 3.104 5.8 6.923 5.8.753 0 1.476-.107 2.157-.305a.65.65 0 0 1 .544.074l1.44.84a.248.248 0 0 0 .127.042.224.224 0 0 0 .22-.226c0-.054-.022-.108-.036-.16l-.295-1.117a.449.449 0 0 1 .162-.503c1.433-1.017 2.336-2.56 2.336-4.245 0-3.203-3.103-5.8-6.923-5.8h.168zm-2.2 3.545c.487 0 .882.4.882.894a.888.888 0 0 1-.882.893.888.888 0 0 1-.882-.893c0-.494.395-.894.882-.894zm4.4 0c.487 0 .882.4.882.894a.888.888 0 0 1-.882.893.888.888 0 0 1-.882-.893c0-.494.395-.894.882-.894z"/></svg>
                    <!-- alipay -->
                    <svg v-else-if="acc.platform === 'alipay'" viewBox="0 0 24 24" class="w-5 h-5"><path fill="white" d="M21.422 15.358c-3.32-1.326-6.092-2.774-6.092-2.774s1.387-3.286 1.73-5.39h-4.668V5.327h5.783V4.006h-5.783V1.063h-2.562c-.425 0-.425.424-.425.424v2.52H3.625v1.32h5.783v1.866H4.364v1.32h9.632a20.578 20.578 0 0 1-1.06 3.227s-4.248-1.63-7.46-1.63c-2.696 0-3.423 1.73-3.423 2.898 0 3.305 4.086 4.7 8.154 4.7 3.292 0 5.945-1.373 7.298-2.326 1.97 1.493 5.807 3.084 5.807 3.084V15.358zM6.016 19.49c-3.29 0-4.008-1.63-4.008-2.655 0-1.275.99-2.165 3.07-2.165 2.55 0 5.09 1.144 6.536 1.935-1.27 1.38-3.178 2.885-5.598 2.885z"/></svg>
                    <!-- douyin -->
                    <svg v-else-if="acc.platform === 'douyin'" viewBox="0 0 24 24" class="w-5 h-5"><path fill="white" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78 2.92 2.92 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 3.76.92V6.18a4.85 4.85 0 0 1-.03.51z"/></svg>
                    <!-- kuaishou -->
                    <svg v-else-if="acc.platform === 'kuaishou'" viewBox="0 0 24 24" class="w-5 h-5"><path fill="white" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2a7.2 7.2 0 0 1-6-3.22c.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08a7.2 7.2 0 0 1-6 3.22z"/></svg>
                    <!-- taobao -->
                    <svg v-else-if="acc.platform === 'taobao'" viewBox="0 0 24 24" class="w-5 h-5"><path fill="white" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 3a7 7 0 0 1 5.45 2.6L14 10.5l1 1 4.17-3.44A7 7 0 0 1 19 12a7 7 0 0 1-14 0 7 7 0 0 1 .83-3.3L9 11l1 1-2.33 3.88A7 7 0 0 1 12 5z"/></svg>
                    <!-- youzan -->
                    <svg v-else-if="acc.platform === 'youzan'" viewBox="0 0 24 24" class="w-5 h-5"><path fill="white" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    <!-- jd -->
                    <svg v-else-if="acc.platform === 'jd'" viewBox="0 0 24 24" class="w-5 h-5"><path fill="white" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    <!-- bank -->
                    <svg v-else-if="acc.platform === 'bank'" viewBox="0 0 24 24" class="w-5 h-5"><path fill="white" d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
                    <!-- cash -->
                    <svg v-else-if="acc.platform === 'cash'" viewBox="0 0 24 24" class="w-5 h-5"><path fill="white" d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
                    <!-- other fallback -->
                    <svg v-else viewBox="0 0 24 24" class="w-5 h-5"><path fill="white" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-white leading-tight truncate">{{ acc.short_name || acc.code }}</div>
                    <div class="text-[11px] text-white/50 mt-0.5">{{ platformLabel(acc.platform) }}</div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-xl font-bold text-white tracking-wide">{{ formatMoney(acc.balance) }}</div>
                </div>
              </div>

              <!-- Incomplete dot -->
              <span v-if="isIncomplete(acc)" class="absolute top-2.5 left-2.5 z-10 w-2 h-2 bg-yellow-400 rounded-full ring-2 ring-white/30"></span>

              <!-- Action buttons (hover only) -->
              <div v-if="canManage" class="absolute bottom-2.5 left-2.5 flex items-center gap-0.5 z-[15] opacity-0 group-hover:opacity-100 transition-opacity">
                <button @click.stop="toggleFreeze(acc)" class="text-[10px] text-white/30 hover:text-white/80 cursor-pointer" :title="acc.status === 'active' ? '停用' : '启用'">🔒</button>
                <button v-if="canDelete" @click.stop="handleDelete(acc)" class="text-[10px] text-white/30 hover:text-white/80 cursor-pointer" title="删除">🗑️</button>
              </div>
            </div>

            <!-- Back -->
            <div class="account-card-back">
            <button
              @click="flipCard(acc.id)"
              class="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 text-xs transition z-10 cursor-pointer"
            >
              ↩️
            </button>

            <div class="p-4 pt-8 space-y-2 text-sm">
              <!-- Platform -->
              <div class="flex items-center gap-2">
                <span class="text-gray-400 text-xs w-16 shrink-0">平台</span>
                <span>{{ platformIcon(acc.platform) }} {{ PLATFORM_LABELS[acc.platform] || acc.platform }}</span>
              </div>

              <!-- Real name certification -->
              <div class="flex items-center gap-2">
                <span class="text-gray-400 text-xs w-16 shrink-0">认证人</span>
                <span :class="acc.real_name ? 'text-gray-700' : 'text-gray-300'">{{ acc.real_name || '未填写' }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-gray-400 text-xs w-16 shrink-0">手机号</span>
                <span :class="acc.cert_phone ? 'text-gray-700' : 'text-gray-300'">{{ acc.cert_phone || '未填写' }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-gray-400 text-xs w-16 shrink-0">身份证</span>
                <span :class="acc.id_number ? 'text-gray-700' : 'text-gray-300'">{{ acc.id_number ? maskIdNumber(acc.id_number) : '未填写' }}</span>
              </div>

              <div class="flex items-center gap-2">
                <span class="text-gray-400 text-xs w-16 shrink-0">创建时间</span>
                <span class="text-gray-500 text-xs">{{ formatDate(acc.created_at, 'date') }}</span>
              </div>
              <div v-if="acc.payment_alias" class="flex items-center gap-2">
                <span class="text-gray-400 text-xs w-16 shrink-0">付款简称</span>
                <span class="text-blue-600 font-medium">{{ acc.payment_alias }}</span>
              </div>

              <!-- Manual balance edit -->
              <div v-if="canManage" class="pt-2 border-t border-gray-100 mt-2">
                <div class="flex items-center gap-1">
                  <span class="text-gray-400 text-xs w-16 shrink-0">余额</span>
                  <template v-if="editingBalanceId !== acc.id">
                    <span class="font-medium" :class="acc.balance >= 0 ? 'text-green-600' : 'text-red-500'">{{ formatMoney(acc.balance) }}</span>
                    <button @click="startEditBalance(acc)" class="text-gray-300 hover:text-blue-500 text-xs cursor-pointer">✏️</button>
                  </template>
                  <template v-else>
                    <input
                      v-model.number="editingBalanceVal"
                      type="number"
                      step="0.01"
                      class="w-24 px-2 py-0.5 border border-blue-300 rounded text-right text-xs outline-none focus:ring-2 focus:ring-blue-500"
                      @keyup.enter="saveBalanceEdit(acc)"
                      @keyup.escape="cancelBalanceEdit"
                    >
                    <button @click="saveBalanceEdit(acc)" class="text-green-500 hover:text-green-700 text-xs cursor-pointer">✅</button>
                    <button @click="cancelBalanceEdit" class="text-gray-300 hover:text-red-500 text-xs cursor-pointer">❌</button>
                  </template>
                </div>
              </div>

              <!-- Actions -->
              <div v-if="canManage" class="flex items-center gap-2 pt-2 border-t border-gray-100 mt-2">
                <button @click="viewTransactions(acc)" class="flex-1 text-center text-purple-600 hover:bg-purple-50 py-1.5 rounded-lg text-xs transition cursor-pointer">📊 明细</button>
                <button @click="openModal(acc)" class="flex-1 text-center text-blue-600 hover:bg-blue-50 py-1.5 rounded-lg text-xs transition cursor-pointer">✏️ 编辑</button>
                <button
                  @click="toggleFreeze(acc)"
                  class="flex-1 text-center py-1.5 rounded-lg text-xs transition cursor-pointer"
                  :class="acc.status === 'active' ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'"
                >
                  {{ acc.status === 'active' ? '🔒 停用' : '🔓 启用' }}
                </button>
                <button v-if="canDelete" @click="handleDelete(acc)" class="flex-1 text-center text-red-400 hover:bg-red-50 py-1.5 rounded-lg text-xs transition cursor-pointer">🗑️ 删除</button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>

    <!-- Account List View -->
    <div v-if="viewMode === 'list' && !loading" class="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="px-4 py-3 text-left w-8">
              <input
                type="checkbox"
                :checked="selectedIds.length === filteredAccounts.length && filteredAccounts.length > 0"
                @change="selectedIds = $event.target.checked ? filteredAccounts.map(a => a.id) : []"
                class="rounded cursor-pointer"
              >
            </th>
            <th class="px-4 py-3 text-left text-gray-500 font-medium">简称</th>
            <th class="px-4 py-3 text-left text-gray-500 font-medium">平台</th>
            <th class="px-4 py-3 text-right text-gray-500 font-medium">余额</th>
            <th class="px-4 py-3 text-center text-gray-500 font-medium">状态</th>
            <th class="px-4 py-3 text-center text-gray-500 font-medium">信息</th>
            <th class="px-4 py-3 text-right text-gray-500 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="acc in filteredAccounts"
            :key="acc.id"
            class="border-b border-gray-50 hover:bg-gray-50/60 transition cursor-pointer"
            @click="openModal(acc)"
          >
            <td class="px-4 py-3" @click.stop>
              <input
                type="checkbox"
                :checked="selectedIds.includes(acc.id)"
                @change="toggleSelect(acc.id)"
                class="rounded cursor-pointer"
              >
            </td>
            <td class="px-4 py-3 font-medium text-gray-800">{{ acc.short_name || acc.code }}</td>
            <td class="px-4 py-3">{{ platformIcon(acc.platform) }} {{ platformLabel(acc.platform) }}</td>
            <td class="px-4 py-3 text-right font-bold" :class="acc.balance >= 0 ? 'text-green-600' : 'text-red-500'">{{ formatMoney(acc.balance) }}</td>
            <td class="px-4 py-3 text-center">
              <span class="text-xs px-2 py-0.5 rounded-full" :class="acc.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'">
                {{ acc.status === 'active' ? '活跃' : '停用' }}
              </span>
            </td>
            <td class="px-4 py-3 text-center">
              <span v-if="isIncomplete(acc)" class="inline-block w-2 h-2 bg-red-500 rounded-full" title="信息不完整"></span>
              <span v-else class="inline-block w-2 h-2 bg-green-400 rounded-full" title="信息完整"></span>
            </td>
            <td class="px-4 py-3 text-right" @click.stop>
              <button @click="viewTransactions(acc)" class="text-gray-300 hover:text-purple-500 cursor-pointer" title="交易明细">📊</button>
              <button @click="toggleFreeze(acc)" class="text-gray-300 hover:text-orange-500 cursor-pointer ml-1" :title="acc.status === 'active' ? '停用' : '启用'">{{ acc.status === 'active' ? '🔒' : '🔓' }}</button>
              <button v-if="canDelete" @click="handleDelete(acc)" class="text-gray-300 hover:text-red-500 cursor-pointer ml-1" title="删除">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty State -->
    <div
      v-if="filteredAccounts.length === 0 && !loading"
      class="bg-white rounded-xl border border-gray-100 p-12 text-center"
    >
      <div class="text-4xl mb-4">📭</div>
      <div class="text-gray-500">暂无匹配的账户</div>
      <div class="text-sm text-gray-400 mt-1">尝试调整筛选条件</div>
    </div>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
        @click.self="closeModal"
      >
        <div class="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <!-- Modal Header -->
          <div class="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 class="text-lg font-bold text-gray-800">
              {{ isEditing ? '✏️ 编辑账户' : '➕ 添加账户' }}
            </h2>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600 text-xl cursor-pointer">✕</button>
          </div>

          <!-- Modal Body -->
          <div class="p-5 space-y-4">
            <!-- Platform Select -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">收款平台 <span class="text-red-400">*</span></label>
              <select
                v-model="form.platform"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择平台</option>
                <option v-for="(label, key) in PLATFORM_LABELS" :key="key" :value="key">
                  {{ platformIcon(key) }} {{ label }}
                </option>
              </select>
            </div>

            <!-- Short Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">账户简称 <span class="text-red-400">*</span></label>
              <input
                v-model="form.short_name"
                placeholder="如：南1微信、楠支付宝"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
              <p class="text-xs text-gray-400 mt-1">账户简称必须唯一，用于快速识别账户</p>
            </div>

            <!-- Real Name Certification (optional) -->
            <div class="border-t border-gray-100 pt-4">
              <div class="text-xs text-gray-400 mb-3">实名认证信息（选填）</div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">认证人姓名</label>
                  <input
                    v-model="form.real_name"
                    placeholder="选填"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">手机号</label>
                  <input
                    v-model="form.cert_phone"
                    placeholder="选填"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                </div>
              </div>
              <div class="mt-3">
                <label class="block text-xs font-medium text-gray-600 mb-1">身份证号</label>
                <input
                  v-model="form.id_number"
                  placeholder="选填"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
              </div>
            </div>

            <!-- Initial Balance (only for new accounts) -->
            <div v-if="!isEditing">
              <label class="block text-sm font-medium text-gray-700 mb-1">初始余额</label>
              <input
                v-model.number="form.balance"
                type="number"
                step="0.01"
                placeholder="默认 0"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
            </div>

            <!-- Payment Alias -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">💳 付款简称</label>
              <input
                v-model="form.payment_alias"
                placeholder="选填，如：南1（自动加'付'后缀）"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
              <p class="text-xs text-gray-400 mt-1">设置后，在支出管理文本模式中输入此简称即可匹配到此账户作为付款账户</p>
            </div>

            <!-- Note -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <textarea
                v-model="form.note"
                placeholder="选填"
                rows="2"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              ></textarea>
            </div>

            <!-- Balance method toggle (admin only, editing only) -->
            <div v-if="isEditing && authStore.isAdmin" class="border-t border-gray-100 pt-4">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-medium text-gray-700">余额计算方式</div>
                  <div class="text-xs text-gray-400 mt-0.5">{{ form.balance_method === 'auto' ? '系统根据收支自动计算' : '手动修改余额，操作会记录日志' }}</div>
                </div>
                <button
                  @click="form.balance_method = form.balance_method === 'auto' ? 'manual' : 'auto'"
                  :class="form.balance_method === 'auto' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'"
                  class="px-3 py-1.5 border rounded-lg text-sm cursor-pointer transition"
                >
                  {{ form.balance_method === 'auto' ? '🤖 自动' : '✋ 手动' }}
                </button>
              </div>
              <!-- Balance edit when manual -->
              <div v-if="form.balance_method === 'manual'" class="mt-3 flex items-center gap-2">
                <label class="text-xs text-gray-500 shrink-0">修改余额</label>
                <input
                  v-model.number="form.balance"
                  type="number"
                  step="0.01"
                  class="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="flex justify-end gap-3 p-5 border-t border-gray-100">
            <button
              @click="closeModal"
              class="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer"
            >
              取消
            </button>
            <button
              @click="saveAccount"
              :disabled="saving"
              class="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {{ saving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Balance Change Log Modal -->
    <Teleport to="body">
      <div
        v-if="showLogModal"
        class="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
        @click.self="showLogModal = false"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <h2 class="font-bold text-gray-800">📜 余额修改日志</h2>
            <button @click="showLogModal = false" class="text-gray-400 hover:text-gray-600 text-xl cursor-pointer">✕</button>
          </div>
          <div class="p-6 overflow-y-auto flex-1">
            <div v-if="loadingLogs" class="text-center text-gray-400 py-8">加载中...</div>
            <div v-else-if="balanceLogs.length === 0" class="text-center text-gray-400 py-8">暂无修改记录</div>
            <div v-else class="space-y-3">
              <div v-for="log in balanceLogs" :key="log.id" class="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div class="text-sm font-medium text-gray-800">{{ log.account_name }}</div>
                  <div class="text-xs text-gray-400 mt-0.5">
                    {{ formatDate(log.created_at, 'datetime') }} · {{ log.reason }}
                    <span v-if="log.requested_by_name"> · 发起人: {{ log.requested_by_name }}</span>
                    <span v-if="log.approved_by_name"> · 审核人: {{ log.approved_by_name }}</span>
                  </div>
                </div>
                <div class="text-right flex items-center gap-2">
                  <span
                    v-if="log.status === 'pending'"
                    class="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-50 text-yellow-600 shrink-0"
                  >⏳ 待审核</span>
                  <span
                    v-else-if="log.status === 'approved'"
                    class="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 shrink-0"
                  >✅ 已通过</span>
                  <span
                    v-else-if="log.status === 'rejected'"
                    class="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 shrink-0"
                  >❌ 已驳回</span>
                  <span class="text-sm text-gray-400 line-through">¥{{ Number(log.old_balance).toFixed(2) }}</span>
                  <span class="text-sm">→</span>
                  <span class="text-sm font-bold" :class="Number(log.new_balance) >= 0 ? 'text-green-600' : 'text-red-500'">¥{{ Number(log.new_balance).toFixed(2) }}</span>
                  <!-- admin审核按钮 -->
                  <template v-if="authStore.isAdmin && log.status === 'pending'">
                    <button @click="approveLog(log)" class="text-[10px] text-green-500 hover:text-green-700 cursor-pointer" title="通过">✅</button>
                    <button @click="rejectLog(log)" class="text-[10px] text-red-500 hover:text-red-700 cursor-pointer" title="驳回">❌</button>
                  </template>
                  <button
                    v-if="authStore.isAdmin"
                    @click="deleteLog(log.id)"
                    class="text-gray-300 hover:text-red-500 text-xs cursor-pointer"
                    title="删除日志"
                  >🗑️</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    <!-- Account Transactions Modal -->
    <AccountTransactions
      :visible="showTxn"
      :accountId="txnAccountId"
      :accountName="txnAccountName"
      :currentBalance="txnAccountBalance"
      @close="showTxn = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useAccountStore } from '../stores/accounts'
import { supabase } from '../lib/supabase'
import { formatMoney, PLATFORM_LABELS, toast, formatDate } from '../lib/utils'
import Skeleton from '../components/Skeleton.vue'
import AccountTransactions from '../components/AccountTransactions.vue'
import { usePermission } from '../composables/usePermission'

const { canDelete, isAdmin, loadRole } = usePermission()

const authStore = useAuthStore()
const accountStore = useAccountStore()

// --- State ---
const loading = ref(true)
const saving = ref(false)
const showModal = ref(false)
const viewMode = ref('card')
const selectedIds = ref([])
const showLogModal = ref(false)
const balanceLogs = ref([])
const loadingLogs = ref(false)
const showTxn = ref(false)
const txnAccountId = ref('')
const txnAccountName = ref('')
const txnAccountBalance = ref(0)
const isEditing = ref(false)
const editingId = ref(null)
const flippedCards = reactive({})
const editingBalanceId = ref(null)
const editingBalanceVal = ref(null)

// --- 今日转账数据 ---
const todayTransferData = reactive({ total: 0, count: 0, loaded: false })

async function loadTodayTransfers() {
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

    const { data } = await supabase
      .from('account_transfers')
      .select('amount')
      .gte('created_at', startISO)
      .lte('created_at', endISO)
    if (data && data.length > 0) {
      todayTransferData.total = data.reduce((s, r) => s + (Number(r.amount) || 0), 0)
      todayTransferData.count = data.length
    } else {
      todayTransferData.total = 0
      todayTransferData.count = 0
    }
    todayTransferData.loaded = true
  } catch (e) {
    console.error('加载今日转账失败:', e)
  }
}

const filters = reactive({
  keyword: '',
  platform: '',
  status: '',
  hideZeroBalance: false,
})

const defaultForm = () => ({
  platform: '',
  short_name: '',
  real_name: '',
  cert_phone: '',
  id_number: '',
  balance: 0,
  balance_method: 'auto',
  payment_alias: '',
  note: '',
})

const form = reactive(defaultForm())

// --- Platform helpers ---
const PLATFORM_ICONS = {
  wechat: '🟢',
  alipay: '🔵',
  youzan: '🟠',
  douyin: '⚫',
  taobao: '🟡',
  kuaishou: '🟣',
  weixin_video: '🟤',
  jd: '🟠',
  bank: '🏦',
  cash: '💵',
  other: '⚪',
}

function platformIcon(platform) {
  return PLATFORM_ICONS[platform] || '⚪'
}

function platformLabel(platform) {
  const labels = { wechat: '微信', alipay: '支付宝', youzan: '有赞', douyin: '抖音', taobao: '淘宝', kuaishou: '快手', weixin_video: '视频号', jd: '京东' }
  return labels[platform] || platform || '其他'
}

function platformIconBg(platform) {
  const map = {
    wechat: 'bg-green-500',
    alipay: 'bg-blue-500',
    douyin: 'bg-gray-800',
    taobao: 'bg-orange-400',
    kuaishou: 'bg-purple-500',
    weixin_video: 'bg-amber-500',
    bank: 'bg-slate-500',
    cash: 'bg-teal-400',
    youzan: 'bg-rose-400',
    other: 'bg-gray-400',
  }
  return map[platform] || map.other
}

function platformGradient(platform) {
  const map = {
    wechat: 'linear-gradient(135deg, #07c160, #06ad56)',
    alipay: 'linear-gradient(135deg, #1677ff, #0958d9)',
    douyin: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    taobao: 'linear-gradient(135deg, #ff6a00, #ee0979)',
    kuaishou: 'linear-gradient(135deg, #ff4906, #ff0000)',
    weixin_video: 'linear-gradient(135deg, #fa9d3b, #f27121)',
    bank: 'linear-gradient(135deg, #4a5568, #2d3748)',
    cash: 'linear-gradient(135deg, #38b2ac, #319795)',
    youzan: 'linear-gradient(135deg, #e11d48, #be123c)',
    jd: 'linear-gradient(135deg, #dc2626, #b91c1c)',
    other: 'linear-gradient(135deg, #94a3b8, #64748b)',
  }
  return map[platform] || map.other
}

// --- Computed ---
const canManage = computed(() => {
  const role = authStore.profile?.role
  return ['admin', 'finance'].includes(role)
})

const allAccounts = computed(() => accountStore.accounts)

const filteredAccounts = computed(() => {
  return allAccounts.value.filter(acc => {
    if (filters.platform && acc.platform !== filters.platform) return false
    if (filters.status && acc.status !== filters.status) return false
    if (filters.hideZeroBalance && Number(acc.balance || 0) === 0) return false
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase()
      const name = (acc.short_name || acc.code || '').toLowerCase()
      if (!name.includes(kw)) return false
    }
    return true
  })
})

const stats = computed(() => {
  const all = allAccounts.value
  return {
    total: all.length,
    active: all.filter(a => a.status === 'active').length,
    totalBalance: all.reduce((sum, a) => sum + (Number(a.balance) || 0), 0),
  }
})

// --- Methods ---
function highlightKeyword(text) {
  if (!filters.keyword || !text) return text || ''
  const kw = filters.keyword.trim()
  const regex = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<span class="bg-yellow-200 rounded px-0.5">$1</span>')
}

// --- Balance Change Logs ---
watch(showLogModal, async (val) => {
  if (val) {
    loadingLogs.value = true
    const { data } = await supabase.from('balance_change_logs').select('*').order('created_at', { ascending: false }).limit(100)
    if (data && data.length > 0) {
      // 批量获取发起人和审核人姓名
      const userIds = [...new Set(data.map(l => [l.requested_by, l.approved_by]).flat())].filter(Boolean)
      const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', userIds)
      const nameMap = {}
      ;(profiles || []).forEach(p => { nameMap[p.id] = p.name })
      balanceLogs.value = data.map(l => ({
        ...l,
        requested_by_name: nameMap[l.requested_by] || '未知',
        approved_by_name: l.approved_by ? (nameMap[l.approved_by] || '未知') : null,
      }))
    } else {
      balanceLogs.value = []
    }
    loadingLogs.value = false
  }
})

async function deleteLog(logId) {
  if (!confirm('确定要删除这条日志吗？')) return
  await supabase.from('balance_change_logs').delete().eq('id', logId)
  balanceLogs.value = balanceLogs.value.filter(l => l.id !== logId)
  toast('日志已删除', 'success')
}

async function approveLog(log) {
  // 审核通过：更新余额 + 更新日志状态
  await supabase.from('accounts').update({ balance: Number(log.new_balance) }).eq('id', log.account_id)
  await supabase.from('balance_change_logs').update({
    status: 'approved',
    approved_by: authStore.profile?.id,
    approved_at: new Date().toISOString(),
  }).eq('id', log.id)
  // 操作日志
  try {
    const { logOperation } = await import('../utils/operationLogger')
    const diff = Number(log.new_balance) - Number(log.old_balance)
    const sign = diff >= 0 ? '+' : ''
    logOperation({
      action: 'manual_balance',
      module: '账户',
      description: `审批余额修改，${log.account_name}，余额 ${Number(log.old_balance).toFixed(2)} ${sign}${diff.toFixed(2)} → ${Number(log.new_balance).toFixed(2)}，发起人：${log.requested_by_name || ''}`,
      detail: { account_id: log.account_id, account_name: log.account_name, old_balance: log.old_balance, new_balance: log.new_balance, requested_by: log.requested_by, approved_by: authStore.profile?.id, log_id: log.id },
      amount: Math.abs(diff),
      accountId: log.account_id,
      accountName: log.account_name,
    })
  } catch (_) {}
  // 刷新列表
  await accountStore.fetchAccounts()
  log.status = 'approved'
  log.approved_by_name = authStore.profile?.name || '管理员'
  toast('审核通过，余额已更新', 'success')
}

async function rejectLog(log) {
  await supabase.from('balance_change_logs').update({
    status: 'rejected',
    approved_by: authStore.profile?.id,
    approved_at: new Date().toISOString(),
  }).eq('id', log.id)
  log.status = 'rejected'
  log.approved_by_name = authStore.profile?.name || '管理员'
  toast('已驳回', 'success')
}

function maskIdNumber(id) {
  if (!id || id.length < 8) return id || ''
  return id.substring(0, 4) + '****' + id.substring(id.length - 4)
}

function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

async function batchAction(action) {
  if (!confirm(`确定要对 ${selectedIds.value.length} 个账户执行此操作吗？`)) return
  const ids = [...selectedIds.value]
  try {
    if (action === 'freeze') {
      await supabase.from('accounts').update({ status: 'frozen' }).in('id', ids)
      toast(`已停用 ${ids.length} 个账户`, 'success')
    } else if (action === 'activate') {
      await supabase.from('accounts').update({ status: 'active' }).in('id', ids)
      toast(`已启用 ${ids.length} 个账户`, 'success')
    } else if (action === 'delete') {
      await supabase.from('accounts').update({ status: 'deleted' }).in('id', ids)
      toast(`已删除 ${ids.length} 个账户`, 'success')
    }
    await accountStore.fetchAccounts()
    selectedIds.value = []
  } catch (e) {
    toast('操作失败: ' + (e.message || ''), 'error')
  }
}

function normalizePaymentAlias(val) {
  const v = (val || '').trim()
  if (!v) return null
  return v.endsWith('付') ? v : v + '付'
}

function isIncomplete(acc) {
  return !acc.short_name || !acc.real_name || !acc.cert_phone || !acc.id_number
}

function viewTransactions(account) {
  txnAccountId.value = account.id
  txnAccountName.value = account.short_name || account.code
  txnAccountBalance.value = account.balance || 0
  showTxn.value = true
}

function flipCard(id) {
  flippedCards[id] = !flippedCards[id]
}

function openModal(acc = null) {
  if (acc) {
    isEditing.value = true
    editingId.value = acc.id
    Object.assign(form, {
      platform: acc.platform || '',
      short_name: acc.short_name || acc.code || '',
      real_name: acc.real_name || '',
      cert_phone: acc.cert_phone || '',
      id_number: acc.id_number || '',
      balance: acc.balance || 0,
      balance_method: acc.balance_method || 'auto',
      payment_alias: acc.payment_alias ? acc.payment_alias.replace(/付$/, '') : '',
      note: acc.note || '',
    })
  } else {
    isEditing.value = false
    editingId.value = null
    Object.assign(form, defaultForm())
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  isEditing.value = false
  editingId.value = null
  Object.assign(form, defaultForm())
}

async function saveAccount() {
  if (!form.platform) {
    toast('请选择收款平台', 'warning')
    return
  }
  if (!form.short_name?.trim()) {
    toast('请填写账户简称', 'warning')
    return
  }

  saving.value = true
  try {
    if (isEditing.value) {
      const payload = {
        platform: form.platform,
        short_name: form.short_name.trim(),
        real_name: form.real_name?.trim() || null,
        cert_phone: form.cert_phone?.trim() || null,
        id_number: form.id_number?.trim() || null,
        balance_method: form.balance_method,
        payment_alias: normalizePaymentAlias(form.payment_alias),
        note: form.note?.trim() || null,
      }
      // 手动模式下余额有变化，记录日志
      const oldAcc = allAccounts.value.find(a => a.id === editingId.value)
      if (oldAcc && form.balance_method === 'manual' && Number(oldAcc.balance) !== Number(form.balance)) {
        const isAdmin = authStore.isAdmin
        if (isAdmin) {
          // admin直接改余额
          payload.balance = Number(form.balance)
          await supabase.from('balance_change_logs').insert({
            account_id: editingId.value,
            account_name: form.short_name.trim(),
            old_balance: Number(oldAcc.balance),
            new_balance: Number(form.balance),
            requested_by: authStore.profile?.id,
            approved_by: authStore.profile?.id,
            status: 'approved',
            reason: '管理员直接修改',
            approved_at: new Date().toISOString(),
          })
          // 操作日志
          try {
            const { logOperation } = await import('../utils/operationLogger')
            const diff = Number(form.balance) - Number(oldAcc.balance)
            const sign = diff >= 0 ? '+' : ''
            logOperation({
              action: 'manual_balance',
              module: '账户',
              description: `手动修改余额，${form.short_name.trim()}，余额 ${Number(oldAcc.balance).toFixed(2)} ${sign}${diff.toFixed(2)} → ${Number(form.balance).toFixed(2)}`,
              detail: { account_id: editingId.value, account_name: form.short_name.trim(), old_balance: Number(oldAcc.balance), new_balance: Number(form.balance), reason: '管理员直接修改' },
              amount: Math.abs(diff),
              accountId: editingId.value,
              accountName: form.short_name.trim(),
            })
          } catch (_) {}
        } else {
          // finance发起审核请求，余额不改
          await supabase.from('balance_change_logs').insert({
            account_id: editingId.value,
            account_name: form.short_name.trim(),
            old_balance: Number(oldAcc.balance),
            new_balance: Number(form.balance),
            requested_by: authStore.profile?.id,
            status: 'pending',
            reason: '财务申请修改',
          })
          toast('余额修改申请已提交，等待审核', 'success')
          closeModal()
          saving.value = false
          return
        }
      }
      await accountStore.updateAccount(editingId.value, payload)
      toast('账户已更新', 'success')
    } else {
      const payload = {
        platform: form.platform,
        short_name: form.short_name.trim(),
        code: form.short_name.trim(),
        real_name: form.real_name?.trim() || null,
        cert_phone: form.cert_phone?.trim() || null,
        id_number: form.id_number?.trim() || null,
        balance: Number(form.balance) || 0,
        opening_balance: Number(form.balance) || 0,
        balance_method: 'manual',
        status: 'active',
        payment_alias: normalizePaymentAlias(form.payment_alias),
        note: form.note?.trim() || null,
      }
      await accountStore.createAccount(payload)
      toast('账户已添加', 'success')
    }
    closeModal()
    // Force refresh to get latest data
    accountStore._forceRefresh = true
    await accountStore.fetchAccounts()
  } catch (e) {
    console.error(e)
    if (e.message?.includes('unique') || e.message?.includes('duplicate')) {
      toast('账户简称已存在，请使用其他名称', 'warning')
    } else {
      toast(e.message || '保存失败', 'error')
    }
  } finally {
    saving.value = false
  }
}

async function toggleFreeze(acc) {
  const newStatus = acc.status === 'active' ? 'frozen' : 'active'
  const action = newStatus === 'frozen' ? '停用' : '启用'
  try {
    await accountStore.updateAccount(acc.id, { status: newStatus })
    toast(`账户已${action}`, 'success')
  } catch (e) {
    console.error(e)
    toast(`${action}失败: ${e.message}`, 'error')
  }
}

async function handleDelete(acc) {
  if (!confirm(`确定要删除账户「${acc.short_name || acc.code}」吗？`)) return
  try {
    await accountStore.deleteAccount(acc.id)
    toast('账户已删除', 'success')
  } catch (e) {
    toast(e.message || '删除失败', 'error')
  }
}

function startEditBalance(acc) {
  editingBalanceId.value = acc.id
  editingBalanceVal.value = acc.balance || 0
}

function cancelBalanceEdit() {
  editingBalanceId.value = null
  editingBalanceVal.value = null
}

async function saveBalanceEdit(acc) {
  try {
    await accountStore.updateAccount(acc.id, { balance: Number(editingBalanceVal.value) || 0 })
    toast('余额已更新', 'success')
    cancelBalanceEdit()
  } catch (e) {
    console.error(e)
    toast('余额更新失败: ' + (e.message || ''), 'error')
  }
}

async function toggleBalanceMethod(acc) {
  const newMethod = acc.balance_method === 'auto' ? 'manual' : 'auto'
  const label = newMethod === 'auto' ? '自动' : '手动'
  try {
    await accountStore.updateAccount(acc.id, { balance_method: newMethod })
    toast(`已切换为${label}计算`, 'success')
  } catch (e) {
    console.error(e)
    toast('切换失败: ' + (e.message || ''), 'error')
  }
}

// --- Init ---
onMounted(async () => {
  loadRole()
  loading.value = true
  try {
    accountStore._forceRefresh = true
    await Promise.all([
      accountStore.fetchAccounts(),
      loadTodayTransfers(),
    ])
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
/* Card flip container */
.account-card-container {
  perspective: 800px;
  height: 150px;
}

.account-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.7s cubic-bezier(0.4, 0.0, 0.2, 1);
  transform-style: preserve-3d;
}

.account-card-inner.is-flipped {
  transform: rotateY(180deg);
}

.account-card-front,
.account-card-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  background: white;
  border-radius: 16px;
  overflow: hidden;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.account-card-front {
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.account-card-back {
  border: 1px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transform: rotateY(180deg);
}

.account-card-container:hover .account-card-front {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
}

.account-card-container:hover .is-flipped {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
</style>
