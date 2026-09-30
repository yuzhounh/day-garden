<script setup lang="ts">
import { ref } from 'vue'
import { Sprout, ArrowUpRight, ShieldCheck, RefreshCw } from 'lucide-vue-next'
import type { EvidenceGuide } from '../types'
import DetailModal from './DetailModal.vue'
defineProps<{ guide: EvidenceGuide }>()
const emit = defineEmits<{ 'next-guide': [] }>()
const showDetail = ref(false)
</script>

<template>
  <article class="glass-panel dashboard-card evidence-card">
    <header class="card-heading"><div class="section-label"><span class="icon-tile sage"><Sprout :size="17" /></span><h2>生活有方</h2><span class="eyebrow">LIVE A LITTLE BETTER</span></div><button class="icon-button small" aria-label="换一个生活建议" @click="emit('next-guide')"><RefreshCw :size="14" /></button></header>
    <div class="guide-body"><span class="pill sage">{{ guide.category }}</span><h3>{{ guide.title }}</h3><p>{{ guide.coreAction }}</p><div class="guide-action"><ShieldCheck :size="15" /><span>{{ guide.roi }}</span></div></div>
    <footer class="card-footer"><a class="source-name" :href="guide.sourceUrl" target="_blank" rel="noopener noreferrer">{{ guide.source }}<ArrowUpRight :size="12" /></a><button class="text-button" @click="showDetail = true">了解更多<ArrowUpRight :size="14" /></button></footer>
    <DetailModal v-if="showDetail" :title="guide.title" :subtitle="guide.category" @close="showDetail = false">
      <div class="reading-note"><span class="eyebrow">从今天开始</span><p>{{ guide.coreAction }}</p></div><p class="guide-details">{{ guide.details }}</p><a class="source-link" :href="guide.sourceUrl" target="_blank" rel="noopener noreferrer">{{ guide.source }} · 查看原文<ArrowUpRight :size="15" /></a>
    </DetailModal>
  </article>
</template>
