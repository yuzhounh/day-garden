<script setup lang="ts">
import { ref, computed } from 'vue'
import { Cloud, Check, Download, RefreshCw, LogOut, User as UserIcon, Link2, Unlink } from 'lucide-vue-next'
import DetailModal from './DetailModal.vue'
import {
  account,
  signIn,
  signOut,
  refreshCloud,
  exportGardenData,
  loginWithOAuth,
  loginWithMock,
  authProviders,
  unlinkProvider,
} from '../services/sync'

const emit = defineEmits<{ close: [] }>()
const register = ref(false)
const username = ref('')
const password = ref('')
const mergeGuest = ref(true)
const submitted = ref(false)

const message = computed(() => {
  if (account.status === 'synced') return '收藏和打卡已同步到云端。'
  if (account.status === 'syncing') return '正在同步你的花园…'
  return '内容已保存在本机，等待云端同步。'
})

const hasGoogle = computed(() => account.user?.providers?.includes('google'))
const hasGitHub = computed(() => account.user?.providers?.includes('github'))

async function submit() {
  submitted.value = true
  try {
    await signIn(username.value, password.value, register.value, mergeGuest.value)
    password.value = ''
  } catch {
    /* The account error is displayed below */
  }
}

function handleOAuth(provider: 'google' | 'github') {
  loginWithOAuth(provider, mergeGuest.value)
}

function handleMock(provider: 'google' | 'github') {
  void loginWithMock(provider, mergeGuest.value)
}

async function handleUnlink(provider: 'google' | 'github') {
  if (!confirm(`确定要解除与 ${provider === 'google' ? 'Google' : 'GitHub'} 账户的关联吗？`)) return
  try {
    await unlinkProvider(provider)
  } catch {
    /* error handled in sync.ts */
  }
}
</script>

<template>
  <DetailModal title="让花园，与你同行" subtitle="YOUR GARDEN, EVERYWHERE" @close="emit('close')">
    <div class="account-intro">
      <span class="icon-tile sage"><Cloud :size="19" /></span>
      <p>本地保存一直可用。登录同一个账户，让诗词收藏与每日打卡在不同设备间安心同步。</p>
    </div>

    <!-- 登录后账户概览 -->
    <template v-if="account.user">
      <div class="account-summary">
        <div class="account-user-card">
          <img
            v-if="account.user.avatarUrl"
            :src="account.user.avatarUrl"
            class="user-avatar-img"
            alt="用户头像"
            referrerpolicy="no-referrer"
          />
          <div v-else class="user-avatar-fallback">
            <UserIcon :size="22" />
          </div>
          <div class="account-meta">
            <strong>{{ account.user.displayName || account.user.username }}</strong>
            <small>用户名：@{{ account.user.username }}</small>
            <div class="account-tag-row">
              <span class="pill sage">
                <Check :size="12" />{{ account.status === 'synced' ? '已同步' : account.status === 'syncing' ? '同步中' : '本机已保存' }}
              </span>
              <span v-if="hasGoogle" class="pill lavender">Google 绑定</span>
              <span v-if="hasGitHub" class="pill lavender">GitHub 绑定</span>
            </div>
          </div>
        </div>

        <p>{{ message }}</p>

        <!-- 关联/解绑第三方快捷方式 -->
        <div class="account-link-row">
          <span>第三方快捷登录：</span>
          <button
            v-if="!hasGoogle"
            class="oauth-mock-btn"
            :disabled="account.busy"
            @click="handleOAuth('google')"
          >
            <Link2 :size="12" /> 关联 Google
          </button>
          <button
            v-else-if="(account.user.providers && account.user.providers.length > 1)"
            class="oauth-mock-btn"
            :disabled="account.busy"
            @click="handleUnlink('google')"
          >
            <Unlink :size="12" /> 解绑 Google
          </button>

          <button
            v-if="!hasGitHub"
            class="oauth-mock-btn"
            :disabled="account.busy"
            @click="handleOAuth('github')"
          >
            <Link2 :size="12" /> 关联 GitHub
          </button>
          <button
            v-else-if="(account.user.providers && account.user.providers.length > 1)"
            class="oauth-mock-btn"
            :disabled="account.busy"
            @click="handleUnlink('github')"
          >
            <Unlink :size="12" /> 解绑 GitHub
          </button>
        </div>
      </div>

      <p v-if="account.error" class="account-error" role="status">{{ account.error }}</p>

      <div class="account-actions">
        <button class="soft-button" :disabled="account.busy || account.status === 'syncing'" @click="refreshCloud()">
          <RefreshCw :size="14" />同步一下
        </button>
        <button class="soft-button" :disabled="account.busy" @click="signOut()">
          <LogOut :size="14" />退出账户
        </button>
      </div>
    </template>

    <!-- 未登录：快捷社交登录与密码登录 -->
    <template v-else>
      <div class="oauth-options">
        <div class="oauth-grid">
          <!-- Google 登录按钮 -->
          <button
            class="oauth-btn"
            type="button"
            :disabled="account.busy"
            aria-label="使用 Google 账户登录"
            @click="handleOAuth('google')"
          >
            <svg class="oauth-icon" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Google 登录</span>
          </button>

          <!-- GitHub 登录按钮 -->
          <button
            class="oauth-btn"
            type="button"
            :disabled="account.busy"
            aria-label="使用 GitHub 账户登录"
            @click="handleOAuth('github')"
          >
            <svg class="oauth-icon" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            <span>GitHub 登录</span>
          </button>
        </div>

        <label class="merge-choice">
          <input v-model="mergeGuest" type="checkbox" />合并本机未登录时的收藏与打卡
        </label>

        <!-- 本地调试免配置模拟体验 -->
        <div v-if="authProviders.dev" class="oauth-mock-banner">
          <span>🛠️ 本地开发模拟体验：</span>
          <div style="display: flex; gap: 6px;">
            <button class="oauth-mock-btn" type="button" @click="handleMock('google')">模拟 Google</button>
            <button class="oauth-mock-btn" type="button" @click="handleMock('github')">模拟 GitHub</button>
          </div>
        </div>
      </div>

      <div class="oauth-divider"><span>或使用用户名与密码</span></div>

      <div class="filter-pills">
        <button :class="{ active: !register }" :aria-pressed="!register" @click="register = false">登录</button>
        <button :class="{ active: register }" :aria-pressed="register" @click="register = true">创建账户</button>
      </div>

      <form class="account-form" @submit.prevent="submit">
        <label for="garden-username">用户名<small>3—32 位字母、数字或下划线</small></label>
        <input
          id="garden-username"
          v-model="username"
          name="username"
          autocomplete="username"
          pattern="[A-Za-z0-9_]{3,32}"
          minlength="3"
          maxlength="32"
          required
          placeholder="给花园取一个名字"
        />

        <label for="garden-password">密码<small>至少 10 位，请妥善保存</small></label>
        <input
          id="garden-password"
          v-model="password"
          name="password"
          type="password"
          :autocomplete="register ? 'new-password' : 'current-password'"
          minlength="10"
          maxlength="128"
          required
          placeholder="你的花园钥匙"
        />

        <p v-if="submitted && account.error" class="account-error" role="alert">{{ account.error }}</p>
        <button class="soft-button account-submit" :disabled="account.busy">
          {{ account.busy ? '正在连接…' : register ? '创建我的花园账户' : '登录并同步' }}
        </button>
      </form>

      <p class="content-footnote">账户用于同步收藏与打卡。支持通过 Google 或 GitHub 快捷登录；使用密码注册请妥善保管。城市与自定义日程仍保存在本机。</p>
    </template>

    <div class="account-backup">
      <button class="text-button" @click="exportGardenData()">
        <Download :size="14" />导出收藏与打卡备份
      </button>
      <span class="muted">为喜欢的日常，留一份副本。</span>
    </div>
  </DetailModal>
</template>
