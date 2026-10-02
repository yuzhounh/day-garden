<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Cloud, Check, RefreshCw, LogOut, User as UserIcon } from 'lucide-vue-next'
import DetailModal from './DetailModal.vue'
import {
  account,
  signIn,
  signOut,
  refreshCloud,
  loginWithOAuth,
  loginWithMock,
  authProviders,
  legacyCustomEvents,
  recoverLegacyEvents,
} from '../services/sync'

const emit = defineEmits<{ close: [] }>()
const loginMethod = ref<'google' | 'email'>('google')
const register = ref(false)
const username = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const formError = ref('')
const mergeGuest = ref(true)
const submitted = ref(false)

const message = computed(() => {
  if (account.status === 'synced') return '收藏、打卡和重要日子已同步到云端。'
  if (account.status === 'syncing') return '正在同步你的花园…'
  return '内容已保存在本机，等待云端同步。'
})

const hasGoogle = computed(() => account.user?.providers?.includes('google'))
const avatarFailed = ref(false)
watch(() => account.user?.avatarUrl, () => { avatarFailed.value = false })
watch([loginMethod, register], () => {
  submitted.value = false
  formError.value = ''
  account.error = ''
  password.value = ''
  passwordConfirmation.value = ''
})

async function submit() {
  submitted.value = true
  formError.value = ''
  if (register.value && password.value !== passwordConfirmation.value) {
    formError.value = '两次输入的密码不一致，请重新确认。'
    return
  }
  try {
    await signIn(username.value, password.value, register.value, mergeGuest.value)
    register.value = false
    password.value = ''
    passwordConfirmation.value = ''
  } catch {
    /* The account error is displayed below */
  }
}

function handleOAuth() {
  submitted.value = true
  loginWithOAuth('google', mergeGuest.value)
}

function handleMock() {
  void loginWithMock('google', mergeGuest.value)
}
</script>

<template>
  <DetailModal class="account-modal" :title="account.user ? '我的花园账户' : '登录我的花园'" subtitle="DAY GARDEN" @close="emit('close')">
    <div class="account-intro">
      <span class="icon-tile sage"><Cloud :size="19" /></span>
      <p>登录后，诗词收藏、每日打卡和重要日子会在你的设备间同步。</p>
    </div>

    <!-- 登录后账户概览 -->
    <template v-if="account.user">
      <div class="account-summary">
        <div class="account-summary-main">
          <div class="account-user-card">
            <img
              v-if="account.user.avatarUrl && !avatarFailed"
              :src="account.user.avatarUrl"
              class="user-avatar-img"
              alt="用户头像"
              referrerpolicy="no-referrer"
              @error="avatarFailed = true"
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
              </div>
            </div>
          </div>
          <p>{{ message }}</p>
        </div>

        <div class="account-actions">
          <button class="soft-button" :disabled="account.busy || account.status === 'syncing'" @click="refreshCloud()">
            <RefreshCw :size="14" :class="{ 'spin-active': account.status === 'syncing' }" />同步一下
          </button>
          <button class="soft-button" :disabled="account.busy" @click="signOut()">
            <LogOut :size="14" />退出账户
          </button>
        </div>
      </div>

      <p v-if="account.error" class="account-error" role="status">{{ account.error }}</p>
      <div v-if="legacyCustomEvents.length" class="account-backup">
        <p>本机保留了 {{ legacyCustomEvents.length }} 条旧日程备份。合并仅补回云端缺少的日程；已有日程保留云端内容。</p>
        <button class="soft-button" :disabled="account.busy" @click="recoverLegacyEvents">合并旧本机日程</button>
      </div>
    </template>

    <!-- 未登录：一次只显示一种登录方式 -->
    <template v-else>
      <div class="login-methods" role="group" aria-label="登录方式">
        <button type="button" :aria-pressed="loginMethod === 'google'" :disabled="account.busy" @click="loginMethod = 'google'">Google 登录</button>
        <button type="button" :aria-pressed="loginMethod === 'email'" :disabled="account.busy" @click="loginMethod = 'email'">邮箱与密码</button>
      </div>

      <div v-if="loginMethod === 'google'" class="oauth-options">
        <div class="auth-panel-copy">
          <h3>用 Google 账户直接登录</h3>
          <p>无需单独注册，首次登录会自动创建账户。</p>
        </div>
        <label class="merge-choice">
          <input v-model="mergeGuest" type="checkbox" />合并此浏览器里的收藏、打卡和重要日子
        </label>
        <div class="oauth-grid">
          <!-- Google 登录按钮 -->
          <button
            class="oauth-btn google-oauth-btn"
            type="button"
            :disabled="account.busy || !authProviders.google"
            aria-label="使用 Google 账户登录"
            @click="handleOAuth()"
          >
            <svg class="oauth-icon" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>使用 Google 账户登录</span>
          </button>
        </div>

        <p v-if="!authProviders.google" class="auth-hint">Google 登录暂不可用，请选择邮箱与密码。</p>
        <p v-if="submitted && account.error" class="account-error" role="alert">{{ account.error }}</p>

        <!-- 本地调试免配置模拟体验 -->
        <div v-if="authProviders.dev" class="oauth-mock-banner">
          <span>🛠️ 本地开发模拟体验：</span>
          <button class="oauth-mock-btn" type="button" @click="handleMock()">模拟 Google 登录</button>
        </div>
      </div>

      <form v-else class="account-form" @submit.prevent="submit">
        <div class="auth-panel-copy">
          <h3>{{ register ? '创建邮箱账户' : '登录邮箱账户' }}</h3>
          <p>{{ register ? '使用邮箱和密码注册，创建后即可登录并同步。' : '使用已注册的邮箱和密码登录。' }}</p>
        </div>
        <label for="garden-username">{{ register ? '邮箱' : '邮箱或用户名' }}</label>
        <input
          id="garden-username"
          v-model="username"
          name="username"
          :type="register ? 'email' : 'text'"
          autocomplete="username"
          minlength="3"
          maxlength="64"
          required
          placeholder="yourname@example.com"
        />

        <label for="garden-password">密码<small v-if="register">至少 10 位</small></label>
        <input
          id="garden-password"
          v-model="password"
          name="password"
          type="password"
          :autocomplete="register ? 'new-password' : 'current-password'"
          minlength="10"
          maxlength="128"
          required
          :placeholder="register ? '设置登录密码' : '输入登录密码'"
        />

        <template v-if="register">
          <label for="garden-password-confirmation">确认密码</label>
          <input id="garden-password-confirmation" v-model="passwordConfirmation" name="password-confirmation" type="password" autocomplete="new-password" minlength="10" maxlength="128" required placeholder="再次输入密码" />
          <p class="auth-hint">暂不提供密码找回，请妥善保存密码。</p>
        </template>
        <label class="merge-choice">
          <input v-model="mergeGuest" type="checkbox" />合并此浏览器里的收藏、打卡和重要日子
        </label>
        <p v-if="formError || (submitted && account.error)" class="account-error" role="alert">{{ formError || account.error }}</p>
        <button class="soft-button account-submit" :disabled="account.busy">
          {{ account.busy ? '正在连接…' : register ? '创建账户并登录' : '登录并同步' }}
        </button>
        <p class="auth-switch">
          {{ register ? '已有账户？' : '还没有账户？' }}
          <button type="button" :disabled="account.busy" @click="register = !register">{{ register ? '返回登录' : '创建账户' }}</button>
        </p>
      </form>

      <p class="auth-local-note">城市、主题与随笔仅保存在当前浏览器。</p>
    </template>

  </DetailModal>
</template>
