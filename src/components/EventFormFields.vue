<script setup lang="ts">
defineProps<{ type: 'birthday' | 'anniversary' | 'schedule'; isLunar: boolean; editing?: boolean; error: string; errorId: string; invalidField: string | null }>()
const title = defineModel<string>('title', { required: true })
const date = defineModel<string>('date', { required: true })
const startDate = defineModel<string>('startDate', { required: true })
const role = defineModel<string>('role', { required: true })
const advice = defineModel<string>('advice', { required: true })
</script>

<template>
  <div class="space-y-2.5 event-form-fields">
    <div class="grid grid-cols-2 gap-2.5">
      <label class="event-field">
        <span>名称（必填）</span>
        <input v-model="title" type="text" aria-required="true" :aria-invalid="invalidField === 'title'" :aria-describedby="error ? errorId : undefined"
          :placeholder="editing ? '事件名' : type === 'schedule' ? '日程事项 (如: 车辆年检到期 / 考试)' : type === 'anniversary' ? '纪念事件 (如: 结婚纪念日)' : '寿星姓名/事件 (如: 妈妈生日)'" />
      </label>
      <label class="event-field">
        <span>{{ type === 'schedule' ? '截止／到期日期' : type === 'birthday' ? '出生日期' : '纪念日期' }}（{{ type === 'schedule' || !isLunar ? '公历' : '农历' }}）</span>
        <input v-model="date" type="text" aria-required="true" :aria-invalid="invalidField === 'date'" :aria-describedby="error ? errorId : undefined"
          :placeholder="editing ? type === 'schedule' ? '截止/到期日期' : '日期 (如: 1990-10-08)' : type === 'schedule' ? '截止/到期日期 MM-DD 或 YYYY-MM-DD' : '日期 MM-DD 或 YYYY-MM-DD'" />
      </label>
    </div>
    <div class="grid grid-cols-2 gap-2.5">
      <label v-if="type === 'schedule'" class="event-field">
        <span>创建／起始日期（选填）</span>
        <input v-model="startDate" type="text" :aria-invalid="invalidField === 'startDate'" :aria-describedby="error ? errorId : undefined" :placeholder="editing ? '创建/起始日期 (选填)' : '创建/起始日期 (选填，如: 10-01)'" />
      </label>
      <label v-else class="event-field">
        <span>关系／角色（选填）</span>
        <input v-model="role" type="text" :placeholder="editing ? '角色备注 (选填)' : '角色备注 (选填，如: 母亲 / 伴侣)'" />
      </label>
      <label class="event-field">
        <span>{{ type === 'birthday' ? '备礼／心愿' : '事项备忘' }}（选填）</span>
        <input v-model="advice" type="text" :placeholder="editing ? type === 'birthday' ? '备礼建议 (选填)' : '事项备忘 (选填)' : type === 'birthday' ? '备礼/心愿建议 (选填，如: 订花)' : '事项备忘 (选填，如: 提前比价)'" />
      </label>
    </div>
    <p class="text-[11px] text-slate-500">日期格式：MM-DD 或 YYYY-MM-DD<span v-if="type !== 'schedule'">；切换历法不换算已填日期</span>。</p>
  </div>
</template>

<style scoped>
.event-field { min-width: 0; display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--secondary); }
.event-field input { width: 100%; min-width: 0; min-height: 40px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); color: var(--ink); }
.event-field input:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.event-field input[aria-invalid="true"] { border-color: #dc2626; }
</style>
