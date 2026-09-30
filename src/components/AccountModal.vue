<script setup lang="ts">
import { ref, computed } from 'vue'
import { Cloud, Check, Download, RefreshCw, LogOut } from 'lucide-vue-next'
import DetailModal from './DetailModal.vue'
import { account, signIn, signOut, refreshCloud, exportGardenData } from '../services/sync'
const emit = defineEmits<{ close: [] }>()
const register = ref(false)
const username = ref('')
const password = ref('')
const mergeGuest = ref(true)
const submitted = ref(false)
const message = computed(() => account.status === 'synced' ? '收藏和打卡已同步到云端。' : account.status === 'syncing' ? '正在同步你的花园…' : '内容已保存在本机，等待云端同步。')
async function submit() {
  submitted.value = true
  try { await signIn(username.value, password.value, register.value, mergeGuest.value); password.value = '' }
  catch { /* The account error is displayed below. */ }
}
</script>

<template>
  <DetailModal title="让花园，与你同行" subtitle="YOUR GARDEN, EVERYWHERE" @close="emit('close')">
    <div class="account-intro"><span class="icon-tile sage"><Cloud :size="19" /></span><p>本地保存一直可用。登录同一个账户，让诗词收藏与每日打卡在不同设备间同步。</p></div>
    <template v-if="account.user">
      <div class="account-summary"><strong>{{ account.user.username }}</strong><span class="pill sage"><Check :size="12" />{{ account.status === 'synced' ? '已同步' : account.status === 'syncing' ? '同步中' : '本机已保存' }}</span><p>{{ message }}</p></div>
      <p v-if="account.error" class="account-error" role="status">{{ account.error }}</p>
      <div class="account-actions"><button class="soft-button" :disabled="account.busy || account.status === 'syncing'" @click="refreshCloud()"><RefreshCw :size="14" />同步一下</button><button class="soft-button" :disabled="account.busy" @click="signOut()"><LogOut :size="14" />退出账户</button></div>
    </template>
    <template v-else>
      <div class="filter-pills"><button :class="{ active: !register }" :aria-pressed="!register" @click="register = false">登录</button><button :class="{ active: register }" :aria-pressed="register" @click="register = true">创建账户</button></div>
      <form class="account-form" @submit.prevent="submit">
        <label for="garden-username">用户名<small>3—32 位字母、数字或下划线</small></label><input id="garden-username" v-model="username" name="username" autocomplete="username" pattern="[A-Za-z0-9_]{3,32}" minlength="3" maxlength="32" required placeholder="给花园取一个名字" />
        <label for="garden-password">密码<small>至少 10 位，请妥善保存</small></label><input id="garden-password" v-model="password" name="password" type="password" :autocomplete="register ? 'new-password' : 'current-password'" minlength="10" maxlength="128" required placeholder="你的花园钥匙" />
        <label class="merge-choice"><input v-model="mergeGuest" type="checkbox" />合并本机未登录时的收藏与打卡</label>
        <p v-if="submitted && account.error" class="account-error" role="alert">{{ account.error }}</p>
        <button class="soft-button account-submit" :disabled="account.busy">{{ account.busy ? '正在连接…' : register ? '创建我的花园账户' : '登录并同步' }}</button>
      </form>
      <p class="content-footnote">账户用于同步收藏与打卡，目前不提供邮件找回密码；请使用密码管理器保存。城市与自定义日程仍保存在本机。</p>
    </template>
    <div class="account-backup"><button class="text-button" @click="exportGardenData()"><Download :size="14" />导出收藏与打卡备份</button><span class="muted">为喜欢的日常，留一份副本。</span></div>
  </DetailModal>
</template>
