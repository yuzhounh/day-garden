<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    name: string
    color?: string
  }>(),
  {
    color: '#e4ba68',
  }
)

const plantKey = computed(() => {
  const n = props.name || ''
  if (n.includes('蜡梅')) return 'lamei'
  if (n.includes('水仙')) return 'shuixian'
  if (n.includes('迎春')) return 'yingchun'
  if (n.includes('梅花')) return 'meihua'
  if (n.includes('结香')) return 'jiexiang'
  if (n.includes('玉兰')) return 'yulan'
  if (n.includes('桃花')) return 'taohua'
  if (n.includes('梨花')) return 'lihua'
  if (n.includes('樱花') || n.includes('海棠')) return 'yinghua_haitang'
  if (n.includes('郁金香')) return 'yujinxiang'
  if (n.includes('连翘')) return 'lianqiao'
  if (n.includes('荷包牡丹')) return 'hebaomudan'
  if (n.includes('牡丹')) return 'mudan'
  if (n.includes('紫藤')) return 'ziteng'
  if (n.includes('杜鹃')) return 'dujuan'
  if (n.includes('芍药')) return 'shaoyao'
  if (n.includes('蔷薇')) return 'qiangwei'
  if (n.includes('石榴')) return 'shiliuhua'
  if (n.includes('栀子')) return 'zhizihua'
  if (n.includes('绣球')) return 'xiuqiuhua'
  if (n.includes('睡莲')) return 'shuilian'
  if (n.includes('荷花')) return 'hehua'
  if (n.includes('茉莉')) return 'moli'
  if (n.includes('紫薇')) return 'ziwei'
  if (n.includes('丹桂')) return 'dangui'
  if (n.includes('桂花')) return 'guihua'
  if (n.includes('栾树')) return 'luanshu'
  if (n.includes('菊花')) return 'juhua'
  if (n.includes('木芙蓉')) return 'mufurong'
  if (n.includes('银杏')) return 'yinxing'
  if (n.includes('枫')) return 'fengye'
  if (n.includes('芦苇')) return 'luwei'
  if (n.includes('茶梅')) return 'chamei'
  if (n.includes('山茶')) return 'shancha'
  if (n.includes('木槿')) return 'mujin'
  if (n.includes('金银花')) return 'jinyinhua'
  if (n.includes('凌霄')) return 'lingxiaohua'
  if (n.includes('美人蕉')) return 'meirenjiao'
  if (n.includes('合欢')) return 'hehuanhua'
  if (n.includes('蓝花楹')) return 'lanhuaying'
  if (n.includes('柿子')) return 'shizi'
  if (n.includes('菖蒲')) return 'changpu'
  if (n.includes('芭蕉')) return 'bajiao'
  if (n.includes('翠竹')) return 'cuizhu'
  if (n.includes('金边瑞香')) return 'jinbianruixiang'
  if (n.includes('风信子')) return 'fengxinzi'
  if (n.includes('天竹子')) return 'tianzhuzi'
  return 'default'
})
</script>

<template>
  <span class="botanical-icon-wrap" :style="{ '--icon-tint': color }">
    <svg viewBox="0 0 40 40" fill="none" class="botanical-icon-svg" aria-hidden="true">
      <!-- 柔和背景圆角底衬 -->
      <rect width="40" height="40" rx="11" :fill="color" opacity="0.14" />
      <rect width="40" height="40" rx="11" stroke="currentColor" stroke-opacity="0.08" fill="none" />

      <!-- 1. 蜡梅：老枝凌寒，蜡质浅金杯花带深红心 -->
      <g v-if="plantKey === 'lamei'">
        <path d="M12 30L20 22L28 14" stroke="#715c48" stroke-width="2" stroke-linecap="round" />
        <path d="M20 22L26 26" stroke="#715c48" stroke-width="1.8" stroke-linecap="round" />
        <circle cx="20" cy="21" r="5.5" :fill="color" opacity="0.95" />
        <circle cx="20" cy="21" r="2.2" fill="#8f2d38" />
        <circle cx="27" cy="13" r="4.2" :fill="color" opacity="0.9" />
        <circle cx="27" cy="13" r="1.6" fill="#8f2d38" />
        <circle cx="14" cy="28" r="3" :fill="color" opacity="0.8" />
      </g>

      <!-- 2. 水仙：玉台金盏，六出白瓣配金黄杯冠 -->
      <g v-else-if="plantKey === 'shuixian'">
        <path d="M16 32V24M24 32V20" stroke="#528362" stroke-width="2" stroke-linecap="round" />
        <!-- 6片洁白花瓣 -->
        <g transform="translate(20 17)">
          <ellipse v-for="deg in [0, 60, 120, 180, 240, 300]" :key="deg" :transform="`rotate(${deg})`" cy="-7" rx="3.2" ry="5.5" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.7" />
          <!-- 金盏副冠 -->
          <circle r="4" fill="#eab308" />
          <circle r="1.6" fill="#ca8a04" />
        </g>
      </g>

      <!-- 3. 迎春花：拱形绿枝，明黄六裂花冠 -->
      <g v-else-if="plantKey === 'yingchun'">
        <path d="M10 32C12 24 16 16 28 13" stroke="#4d7c58" stroke-width="2.2" stroke-linecap="round" />
        <g transform="translate(22 17)">
          <circle v-for="deg in [0, 60, 120, 180, 240, 300]" :key="deg" :transform="`rotate(${deg})`" cy="-5" r="2.8" :fill="color" />
          <circle r="2" fill="#b45309" />
        </g>
        <circle cx="15" cy="22" r="3" :fill="color" />
        <circle cx="27" cy="14" r="2.5" :fill="color" />
      </g>

      <!-- 4. 梅花：铁骨疏影，五出红润圆瓣与放射金蕊 -->
      <g v-else-if="plantKey === 'meihua'">
        <path d="M12 31C16 26 18 21 21 17M21 17L28 12" stroke="#634839" stroke-width="2.2" stroke-linecap="round" />
        <g transform="translate(21 17)">
          <circle v-for="deg in [0, 72, 144, 216, 288]" :key="deg" :transform="`rotate(${deg})`" cy="-6" r="3.6" :fill="color" />
          <circle r="2.4" fill="#eab308" />
          <circle r="1" fill="#713f12" />
        </g>
        <circle cx="14" cy="26" r="2.5" :fill="color" />
        <circle cx="28" cy="12" r="2.8" :fill="color" />
      </g>

      <!-- 5. 结香：打结柔枝，下垂金黄蜂窝头状花序 -->
      <g v-else-if="plantKey === 'jiexiang'">
        <path d="M14 31C14 22 22 22 22 15C22 12 18 10 16 14C15 16 16 19 20 20" stroke="#78593c" stroke-width="2.2" stroke-linecap="round" />
        <!-- 下垂黄色绣球小花簇 -->
        <g transform="translate(24 23)" :fill="color">
          <circle cx="0" cy="0" r="5.5" />
          <circle cx="-3" cy="2" r="2.2" fill="#b45309" />
          <circle cx="2" cy="2" r="2.2" fill="#d97706" />
          <circle cx="0" cy="-2" r="2.2" fill="#fde047" />
        </g>
      </g>

      <!-- 6. 玉兰：木质枝头，傲然挺立的白玉酒盏花冠 -->
      <g v-else-if="plantKey === 'yulan'">
        <path d="M16 32V23" stroke="#685648" stroke-width="2.2" stroke-linecap="round" />
        <ellipse cx="16" cy="22" rx="3.5" ry="2" fill="#586c50" />
        <!-- 杯状挺拔花瓣 -->
        <path d="M20 7C14 11 12 17 15 22C17 22 23 22 25 22C28 17 26 11 20 7Z" fill="#fdfbf7" stroke="#cbd5e1" stroke-width="0.8" />
        <path d="M20 9C17 13 16 17 17 22C20 22 20 22 23 22C24 17 23 13 20 9Z" :fill="color" opacity="0.4" />
      </g>

      <!-- 7. 桃花：夭夭桃枝，娇艳五瓣伴随初生细叶 -->
      <g v-else-if="plantKey === 'taohua'">
        <path d="M12 30C16 26 19 22 22 17L28 13" stroke="#6c4d3b" stroke-width="2" stroke-linecap="round" />
        <!-- 细嫩柳叶 -->
        <path d="M17 25C13 23 11 19 12 16C15 18 17 22 17 25Z" fill="#699274" />
        <!-- 桃花朵 -->
        <g transform="translate(22 17)">
          <circle v-for="deg in [0, 72, 144, 216, 288]" :key="deg" :transform="`rotate(${deg})`" cy="-5.5" r="3.4" :fill="color" />
          <circle r="2.2" fill="#dc2626" />
          <circle r="1" fill="#fef08a" />
        </g>
      </g>

      <!-- 8. 梨花：雪白五瓣，核心深紫黑花药点睛 -->
      <g v-else-if="plantKey === 'lihua'">
        <path d="M15 32V24" stroke="#64748b" stroke-width="1.8" stroke-linecap="round" />
        <g transform="translate(20 18)">
          <circle v-for="deg in [0, 72, 144, 216, 288]" :key="deg" :transform="`rotate(${deg})`" cy="-6" r="3.8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.8" />
          <circle r="2.2" fill="#78350f" />
          <circle v-for="deg in [30, 90, 150, 210, 270, 330]" :key="deg" :transform="`rotate(${deg})`" cy="-3.5" r="0.9" fill="#581c87" />
        </g>
      </g>

      <!-- 9. 樱花 · 海棠：长梗悬垂，花瓣顶端特征缺刻凹口 -->
      <g v-else-if="plantKey === 'yinghua_haitang'">
        <path d="M25 8C23 15 18 19 18 24" stroke="#6b7280" stroke-width="1.6" stroke-linecap="round" fill="none" />
        <g transform="translate(18 24)">
          <path v-for="deg in [0, 72, 144, 216, 288]" :key="deg" :transform="`rotate(${deg})`" d="M-3 -4C-4 -7 -2 -9 0 -8C2 -9 4 -7 3 -4Z" :fill="color" />
          <circle r="1.8" fill="#eab308" />
        </g>
      </g>

      <!-- 10. 郁金香：灰绿抱茎叶，亭亭玉立的明艳花盏 -->
      <g v-else-if="plantKey === 'yujinxiang'">
        <path d="M20 32V18" stroke="#477a56" stroke-width="2.5" stroke-linecap="round" />
        <path d="M20 30C14 26 12 18 14 12C16 18 18 24 20 28Z" fill="#5b8c6b" />
        <path d="M20 29C25 25 27 18 25 13C23 18 21 24 20 27Z" fill="#5b8c6b" opacity="0.85" />
        <!-- 花盏 -->
        <g transform="translate(20 14)">
          <path d="M-6 -2C-6 6 6 6 6 -2C3 1 0 0 -2 -6C-4 0 -5 1 -6 -2Z" :fill="color" />
          <path d="M-2 -6C-1 -1 1 -1 2 -6C0 -4 -1 -4 -2 -6Z" fill="#be123c" />
        </g>
      </g>

      <!-- 11. 连翘：拱形黄绿枝，四裂狭长金条四方伸展 -->
      <g v-else-if="plantKey === 'lianqiao'">
        <path d="M12 30C16 23 22 17 28 11" stroke="#5a704a" stroke-width="2" stroke-linecap="round" />
        <g transform="translate(20 18)">
          <ellipse v-for="deg in [0, 90, 180, 270]" :key="deg" :transform="`rotate(${deg})`" cy="-6" rx="1.8" ry="4.5" :fill="color" />
          <circle r="1.6" fill="#ca8a04" />
        </g>
        <ellipse cx="14" cy="24" rx="1.4" ry="3.5" :fill="color" />
        <ellipse cx="26" cy="12" rx="1.4" ry="3.5" :fill="color" />
      </g>

      <!-- 12. 牡丹：国色天香，千层卷褶华丽大花冠 -->
      <g v-else-if="plantKey === 'mudan'">
        <path d="M14 31C16 25 18 20 20 16" stroke="#486950" stroke-width="2" />
        <g transform="translate(20 17)">
          <circle r="9" :fill="color" opacity="0.3" />
          <circle r="7.2" :fill="color" opacity="0.6" />
          <circle r="5" :fill="color" />
          <circle r="2.2" fill="#fbbf24" />
        </g>
        <path d="M12 24C9 21 10 18 12 17C14 18 15 21 12 24Z" fill="#4d7c58" />
        <path d="M26 23C29 20 28 17 26 16C24 17 23 20 26 23Z" fill="#4d7c58" />
      </g>

      <!-- 13. 紫藤：垂藤瀑布，渐变串叠蝶形花穗 -->
      <g v-else-if="plantKey === 'ziteng'">
        <path d="M12 10C18 10 21 14 21 18" stroke="#5c483a" stroke-width="2" stroke-linecap="round" />
        <g transform="translate(21 14)">
          <circle cx="0" cy="0" r="3.2" :fill="color" />
          <circle cx="-2" cy="4" r="3" :fill="color" />
          <circle cx="2" cy="5" r="2.8" :fill="color" />
          <circle cx="-1" cy="9" r="2.5" :fill="color" />
          <circle cx="1" cy="12" r="2.2" :fill="color" />
          <circle cx="0" cy="15" r="1.6" :fill="color" />
        </g>
      </g>

      <!-- 14. 杜鹃：喇叭漏斗花，上唇暗红雀斑斑驳 -->
      <g v-else-if="plantKey === 'dujuan'">
        <path d="M16 32V22" stroke="#526b48" stroke-width="2" />
        <g transform="translate(20 17)">
          <!-- 喇叭花冠 -->
          <path d="M-8 -6C-6 -2 0 0 4 2C2 -4 0 -6 -2 -8C-5 -8 -7 -7 -8 -6Z" :fill="color" />
          <path d="M8 -6C6 -2 0 0 -4 2C-2 -4 0 -6 2 -8C5 -8 7 -7 8 -6Z" :fill="color" />
          <circle cx="0" cy="1" r="5" :fill="color" />
          <!-- 雀斑 -->
          <circle cx="0" cy="-3" r="0.7" fill="#7f1d1d" />
          <circle cx="-2" cy="-2" r="0.7" fill="#7f1d1d" />
          <circle cx="2" cy="-2" r="0.7" fill="#7f1d1d" />
          <!-- 伸出的长花蕊 -->
          <path d="M0 2C3 4 8 2 9 -1" stroke="#fecdd3" stroke-width="1.2" stroke-linecap="round" fill="none" />
        </g>
      </g>

      <!-- 15. 芍药：五月花神，草木柔润重瓣花 -->
      <g v-else-if="plantKey === 'shaoyao'">
        <path d="M20 32V20" stroke="#4b7858" stroke-width="2" />
        <g transform="translate(20 17)">
          <circle r="8.5" :fill="color" opacity="0.35" />
          <ellipse cx="0" cy="1" rx="6.5" ry="5.5" :fill="color" opacity="0.7" />
          <circle r="4" :fill="color" />
          <circle r="1.6" fill="#f59e0b" />
        </g>
      </g>

      <!-- 16. 蔷薇：花墙成诗，蔓生刺枝小粉花簇 -->
      <g v-else-if="plantKey === 'qiangwei'">
        <path d="M11 31C14 24 20 20 28 14" stroke="#48684d" stroke-width="2" stroke-linecap="round" />
        <!-- 尖刺 -->
        <path d="M15 25L13 24M22 18L24 17" stroke="#48684d" stroke-width="1.5" />
        <g transform="translate(24 14)">
          <circle v-for="deg in [0, 72, 144, 216, 288]" :key="deg" :transform="`rotate(${deg})`" cy="-4" r="2.5" :fill="color" />
          <circle r="1.5" fill="#facc15" />
        </g>
        <circle cx="15" cy="21" r="3" :fill="color" />
      </g>

      <!-- 17. 石榴花：肉质厚萼，迸发烈火般褶皱红绸瓣 -->
      <g v-else-if="plantKey === 'shiliuhua'">
        <path d="M15 32V23" stroke="#685642" stroke-width="2" />
        <!-- 肉质筒萼 -->
        <path d="M15 24L18 20L22 20L25 24Z" fill="#b91c1c" />
        <!-- 褶皱火红花瓣 -->
        <g transform="translate(20 14)">
          <path d="M-5 2C-7 -3 -4 -7 0 -6C4 -7 7 -3 5 2Z" :fill="color" />
          <path d="M-3 -4C-5 -8 0 -9 3 -8C4 -5 1 -2 -3 -4Z" fill="#ea580c" />
          <circle cx="0" cy="-2" r="1.2" fill="#fef08a" />
        </g>
      </g>

      <!-- 18. 栀子花：墨绿油亮叶，雪白旋涡重瓣幽香 -->
      <g v-else-if="plantKey === 'zhizihua'">
        <path d="M12 25C15 22 20 22 24 26" stroke="#2d5236" stroke-width="2" />
        <ellipse cx="14" cy="22" rx="4.5" ry="2.5" fill="#2d5236" />
        <ellipse cx="26" cy="21" rx="4.5" ry="2.5" fill="#2d5236" />
        <!-- 旋涡状白花 -->
        <g transform="translate(20 16)">
          <circle r="7.5" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.8" />
          <path d="M-3 -4C-1 -6 4 -4 5 -1C4 3 -1 4 -3 2C-5 0 -4 -3 -3 -4Z" fill="#f1f5f9" />
          <circle r="2" fill="#fef08a" />
        </g>
      </g>

      <!-- 19. 绣球花：无尽夏光，数十朵十字小萼紧密成球 -->
      <g v-else-if="plantKey === 'xiuqiuhua'">
        <path d="M20 32V23" stroke="#48684d" stroke-width="2" />
        <g transform="translate(20 16)">
          <circle r="9" :fill="color" opacity="0.3" />
          <!-- 4片一组的小十字花 -->
          <g v-for="(p, i) in [[-3,-3],[3,-3],[-3,3],[3,3],[0,0]]" :key="i" :transform="`translate(${p[0]} ${p[1]})`">
            <rect x="-2.2" y="-0.8" width="4.4" height="1.6" rx="0.5" :fill="color" />
            <rect x="-0.8" y="-2.2" width="1.6" height="4.4" rx="0.5" :fill="color" />
          </g>
        </g>
      </g>

      <!-- 20. 荷花：出水芙蓉，宽粉花瓣托起金黄莲蓬 -->
      <g v-else-if="plantKey === 'hehua'">
        <!-- 荷叶小圆顶 -->
        <ellipse cx="14" cy="26" rx="6" ry="2.5" fill="#3b7a57" />
        <!-- 荷花茎与花 -->
        <path d="M22 32V19" stroke="#3b7a57" stroke-width="2" stroke-linecap="round" />
        <g transform="translate(22 14)">
          <path d="M-7 4C-6 -2 -2 -7 0 -7C2 -7 6 -2 7 4Z" :fill="color" />
          <path d="M-4 4C-3 0 0 -5 0 -5C0 -5 3 0 4 4Z" fill="#f472b6" opacity="0.7" />
          <circle cx="0" cy="1" r="2.2" fill="#eab308" />
        </g>
      </g>

      <!-- 21. 睡莲：水上清梦，星芒尖瓣与缺角浮叶 -->
      <g v-else-if="plantKey === 'shuilian'">
        <!-- 缺口睡莲浮叶 -->
        <path d="M12 25C12 22 17 20 22 20C27 20 31 22 31 25C31 28 27 30 22 30C17 30 12 28 12 25ZM22 25L26 21" fill="#407758" />
        <!-- 尖芒睡莲 -->
        <g transform="translate(21 16)">
          <polygon points="0,-7 2,-2 7,-3 3,1 6,5 1,3 0,8 -2,3 -6,4 -3,0 -7,-2 -2,-2" :fill="color" />
          <circle r="1.6" fill="#facc15" />
        </g>
      </g>

      <!-- 22. 茉莉花：清雅素馨，对生绿叶衬托星芒白花 -->
      <g v-else-if="plantKey === 'moli'">
        <path d="M16 29C17 24 19 21 21 18" stroke="#3d6d48" stroke-width="1.8" />
        <ellipse cx="14" cy="23" rx="4" ry="2" fill="#3d6d48" />
        <ellipse cx="26" cy="22" rx="4" ry="2" fill="#3d6d48" />
        <g transform="translate(20 15)">
          <circle v-for="deg in [0, 60, 120, 180, 240, 300]" :key="deg" :transform="`rotate(${deg})`" cy="-4.8" r="2.4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.7" />
          <circle r="1.6" fill="#fef08a" />
        </g>
      </g>

      <!-- 23. 紫薇：百日红艳，如绉纱波浪卷边的轻盈紫红 -->
      <g v-else-if="plantKey === 'ziwei'">
        <path d="M15 31C17 26 20 22 22 18" stroke="#715c48" stroke-width="2" />
        <g transform="translate(21 15)">
          <circle cx="-4" cy="-3" r="3.2" :fill="color" opacity="0.85" />
          <circle cx="3" cy="-4" r="3.2" :fill="color" opacity="0.85" />
          <circle cx="0" cy="3" r="3.2" :fill="color" opacity="0.85" />
          <circle cx="4" cy="1" r="2.8" :fill="color" opacity="0.85" />
          <circle cx="-3" cy="2" r="2.8" :fill="color" opacity="0.85" />
          <circle r="1.6" fill="#fde047" />
        </g>
      </g>

      <!-- 24. 桂花：秋日金粟，对生革质叶间簇拥密集四裂碎金 -->
      <g v-else-if="plantKey === 'guihua'">
        <path d="M20 32V10" stroke="#3b5e43" stroke-width="2" />
        <ellipse cx="13" cy="22" rx="6" ry="3" fill="#3b5e43" transform="rotate(-20 13 22)" />
        <ellipse cx="27" cy="18" rx="6" ry="3" fill="#3b5e43" transform="rotate(20 27 18)" />
        <!-- 叶腋间碎金小四出花 -->
        <g transform="translate(20 20)">
          <g v-for="(p, i) in [[-2,-4],[2,-3],[-2,3],[3,3],[0,0]]" :key="i" :transform="`translate(${p[0]} ${p[1]})`">
            <circle cx="-1" cy="0" r="1.1" :fill="color" />
            <circle cx="1" cy="0" r="1.1" :fill="color" />
            <circle cx="0" cy="-1" r="1.1" :fill="color" />
            <circle cx="0" cy="1" r="1.1" :fill="color" />
          </g>
        </g>
      </g>

      <!-- 25. 栾树：秋风灯笼果，逼真三棱粉红纸灯笼与羽状复叶！ -->
      <g v-else-if="plantKey === 'luanshu'">
        <path d="M12 12C16 14 20 18 24 24" stroke="#684f3c" stroke-width="2" stroke-linecap="round" />
        <!-- 小羽叶 -->
        <ellipse cx="14" cy="10" rx="3.5" ry="1.5" fill="#4d7c58" transform="rotate(-30 14 10)" />
        <ellipse cx="19" cy="13" rx="3.5" ry="1.5" fill="#4d7c58" transform="rotate(-20 19 13)" />
        <!-- 悬垂三棱灯笼果 1 -->
        <path d="M18 16L16 20" stroke="#684f3c" stroke-width="1.2" />
        <g transform="translate(16 23)">
          <path d="M0 -4C-4 -2 -4 3 0 5C4 3 4 -2 0 -4Z" :fill="color" />
          <!-- 三棱果瓣中缝纹理 -->
          <line x1="0" y1="-4" x2="0" y2="5" stroke="#be123c" stroke-width="0.8" opacity="0.6" />
        </g>
        <!-- 悬垂灯笼果 2 -->
        <path d="M23 21L25 24" stroke="#684f3c" stroke-width="1.2" />
        <g transform="translate(25 28)">
          <path d="M0 -3.5C-3.5 -1.5 -3.5 2.5 0 4.5C3.5 2.5 3.5 -1.5 0 -3.5Z" :fill="color" />
          <line x1="0" y1="-3.5" x2="0" y2="4.5" stroke="#be123c" stroke-width="0.7" opacity="0.6" />
        </g>
      </g>

      <!-- 26. 菊花：重阳金秋，纤细丝状卷曲放射瓣！区别于桂花 -->
      <g v-else-if="plantKey === 'juhua'">
        <path d="M16 32C18 26 19 22 20 18" stroke="#48684d" stroke-width="2" />
        <g transform="translate(20 16)">
          <!-- 菊花卷瓣（丝状放射线） -->
          <path v-for="deg in [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]" :key="deg"
                :transform="`rotate(${deg})`"
                d="M0 0C-1 -4 2 -7 1 -9"
                stroke="currentColor" :style="{ color: color }" stroke-width="1.5" stroke-linecap="round" fill="none" />
          <circle r="3.2" fill="#ca8a04" />
        </g>
      </g>

      <!-- 27. 木芙蓉：霜降三变，多层饱满花瓣与掌状裂叶 -->
      <g v-else-if="plantKey === 'mufurong'">
        <path d="M16 32V23" stroke="#4a6850" stroke-width="2" />
        <g transform="translate(20 16)">
          <circle r="8.5" :fill="color" opacity="0.4" />
          <circle r="6.5" :fill="color" opacity="0.7" />
          <circle r="4.2" :fill="color" />
          <circle r="1.8" fill="#fef08a" />
        </g>
        <path d="M11 26C8 23 8 20 11 19C13 21 14 24 11 26Z" fill="#3b5e43" />
      </g>

      <!-- 28. 银杏：满树璀璨，扇形波缘双生金黄叶 -->
      <g v-else-if="plantKey === 'yinxing'">
        <path d="M15 32C17 25 18 20 19 16" stroke="#5d7256" stroke-width="1.8" />
        <!-- 扇叶 1 -->
        <g transform="translate(19 14)">
          <path d="M0 2C-6 -2 -7 -8 0 -7C7 -8 6 -2 0 2Z" :fill="color" />
          <path d="M0 2L0 -7M0 2L-3 -6M0 2L3 -6" stroke="#fef08a" stroke-width="0.7" opacity="0.6" />
        </g>
        <!-- 扇叶 2 -->
        <g transform="translate(24 20) rotate(35)">
          <path d="M0 1.5C-4.5 -1.5 -5 -6 0 -5C5 -6 4.5 -1.5 0 1.5Z" :fill="color" opacity="0.85" />
        </g>
      </g>

      <!-- 29. 枫叶 · 枫香：层林尽染，掌状五角鲜红枫叶 -->
      <g v-else-if="plantKey === 'fengye'">
        <path d="M20 32V21" stroke="#713f12" stroke-width="1.8" />
        <!-- 掌状五裂叶 -->
        <g transform="translate(20 16)" :fill="color">
          <polygon points="0,-10 2,-4 8,-6 4,-1 9,3 3,3 2,7 0,4 -2,7 -3,3 -9,3 -4,-1 -8,-6 -2,-4" />
        </g>
      </g>

      <!-- 30. 芦苇：白羽随风，柔和穗毛斜摇 -->
      <g v-else-if="plantKey === 'luwei'">
        <path d="M12 32C15 24 19 16 26 10" stroke="#71806e" stroke-width="2" stroke-linecap="round" />
        <!-- 柔和羽状花穗 -->
        <g transform="translate(22 13) rotate(35)">
          <ellipse cx="0" cy="0" rx="3.5" ry="7" :fill="color" opacity="0.8" />
          <path d="M-3 -4C-1 -6 2 -7 4 -5M-4 0C-2 -2 2 -3 5 0M-3 4C-1 2 2 1 4 4" stroke="#f8fafc" stroke-width="0.8" />
        </g>
      </g>

      <!-- 31. 茶梅：岁末花红，平展碗状单瓣配落英 -->
      <g v-else-if="plantKey === 'chamei'">
        <path d="M16 32V22" stroke="#425845" stroke-width="2" />
        <ellipse cx="13" cy="23" rx="4" ry="2" fill="#2d4230" />
        <g transform="translate(21 16)">
          <circle v-for="deg in [0, 72, 144, 216, 288]" :key="deg" :transform="`rotate(${deg})`" cy="-5" r="3.4" :fill="color" />
          <circle r="2.4" fill="#fbbf24" />
        </g>
      </g>

      <!-- 32. 山茶：冬日重瓣深红茶花，富贵沉稳 -->
      <g v-else-if="plantKey === 'shancha'">
        <ellipse cx="14" cy="24" rx="5" ry="3" fill="#1e3a24" />
        <ellipse cx="26" cy="23" rx="5" ry="3" fill="#1e3a24" />
        <g transform="translate(20 16)">
          <circle r="8.5" :fill="color" opacity="0.4" />
          <circle r="6.8" :fill="color" opacity="0.75" />
          <circle r="4.6" :fill="color" />
          <circle r="1.8" fill="#facc15" />
        </g>
      </g>

      <!-- 33. 木槿：钟状淡紫粉花，中间伸出白色花蕊柱 -->
      <g v-else-if="plantKey === 'mujin'">
        <path d="M17 32V22" stroke="#48684d" stroke-width="2" />
        <g transform="translate(20 16)">
          <circle v-for="deg in [0, 72, 144, 216, 288]" :key="deg" :transform="`rotate(${deg})`" cy="-5.5" r="3.6" :fill="color" />
          <circle r="2.8" fill="#991b1b" />
          <!-- 伸出的白蕊柱 -->
          <line x1="0" y1="0" x2="0" y2="-6" stroke="#f8fafc" stroke-width="1.4" stroke-linecap="round" />
          <circle cx="0" cy="-6" r="1" fill="#facc15" />
        </g>
      </g>

      <!-- 34. 金银花：金银相映，并蒂二唇长蕊筒花 -->
      <g v-else-if="plantKey === 'jinyinhua'">
        <path d="M12 30C16 26 19 22 24 16" stroke="#48684d" stroke-width="2" stroke-linecap="round" />
        <!-- 银花（白） -->
        <g transform="translate(17 17)">
          <path d="M0 0C-2 -4 -3 -7 0 -8C2 -7 2 -4 0 0Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.8" />
          <path d="M0 -8C-2 -10 -1 -12 1 -11" stroke="#facc15" stroke-width="0.8" fill="none" />
        </g>
        <!-- 金花（黄） -->
        <g transform="translate(23 15)">
          <path d="M0 0C-2 -4 -3 -7 0 -8C2 -7 2 -4 0 0Z" :fill="color" />
          <path d="M0 -8C-2 -10 -1 -12 1 -11" stroke="#ca8a04" stroke-width="0.8" fill="none" />
        </g>
      </g>

      <!-- 35. 凌霄花：攀云攀翠，下垂橙红大喇叭花 -->
      <g v-else-if="plantKey === 'lingxiaohua'">
        <path d="M24 10C21 16 19 21 17 28" stroke="#524335" stroke-width="2" stroke-linecap="round" />
        <g transform="translate(19 22)">
          <path d="M-6 -4L-1 -1L2 5L0 5L-4 0Z" fill="#ea580c" />
          <path d="M-2 4C2 4 6 0 6 -4C4 -3 2 -2 -2 4Z" :fill="color" />
          <circle cx="2" cy="-1" r="1.5" fill="#fef08a" />
        </g>
      </g>

      <!-- 36. 美人蕉：宽阔蕉叶，火焰不对称红瓣 -->
      <g v-else-if="plantKey === 'meirenjiao'">
        <!-- 大芭蕉叶 -->
        <path d="M12 32C12 22 17 14 24 11C20 18 19 26 18 32Z" fill="#2d6a4f" />
        <!-- 火焰红瓣 -->
        <g transform="translate(23 14)">
          <path d="M-3 4C-4 -2 0 -6 3 -7C1 -3 3 0 0 4Z" :fill="color" />
          <path d="M-1 2C1 -1 4 -3 5 -5C4 -1 3 2 1 3Z" fill="#ef4444" />
        </g>
      </g>

      <!-- 37. 合欢花：羽状细叶，扇形粉红毛绒丝球 -->
      <g v-else-if="plantKey === 'hehuanhua'">
        <path d="M14 30C16 24 18 20 20 18" stroke="#48684d" stroke-width="1.8" />
        <!-- 扇面丝状花丝 -->
        <g transform="translate(20 16)">
          <path v-for="deg in [-60, -40, -20, 0, 20, 40, 60]" :key="deg"
                :transform="`rotate(${deg})`"
                d="M0 0L0 -8" stroke="#f472b6" stroke-width="1.3" stroke-linecap="round" />
          <circle v-for="deg in [-60, -40, -20, 0, 20, 40, 60]" :key="'d'+deg"
                  :transform="`rotate(${deg}) translate(0 -8)`" r="0.9" fill="#fdf2f8" />
        </g>
      </g>

      <!-- 38. 蓝花楹：梦幻蓝紫，羽叶风铃吊钟花 -->
      <g v-else-if="plantKey === 'lanhuaying'">
        <path d="M14 12C18 15 21 20 24 26" stroke="#4b5563" stroke-width="1.8" stroke-linecap="round" />
        <g transform="translate(18 19)">
          <path d="M-3 -4C-4 0 -2 3 0 4C2 3 4 0 3 -4Z" :fill="color" />
          <circle cx="0" cy="1" r="1.2" fill="#ede9fe" />
        </g>
        <g transform="translate(24 23)">
          <path d="M-2.5 -3C-3 0 -1.5 2 0 3C1.5 2 3 0 2.5 -3Z" :fill="color" opacity="0.8" />
        </g>
      </g>

      <!-- 39. 丹桂：朱砂橙红，叶腋浓艳四裂小花 -->
      <g v-else-if="plantKey === 'dangui'">
        <path d="M20 32V10" stroke="#2d4230" stroke-width="2" />
        <ellipse cx="13" cy="22" rx="6" ry="3" fill="#2d4230" transform="rotate(-20 13 22)" />
        <ellipse cx="27" cy="18" rx="6" ry="3" fill="#2d4230" transform="rotate(20 27 18)" />
        <g transform="translate(20 20)">
          <g v-for="(p, i) in [[-2,-4],[2,-3],[-2,3],[3,3],[0,0]]" :key="i" :transform="`translate(${p[0]} ${p[1]})`">
            <circle cx="-1" cy="0" r="1.1" :fill="color" />
            <circle cx="1" cy="0" r="1.1" :fill="color" />
            <circle cx="0" cy="-1" r="1.1" :fill="color" />
            <circle cx="0" cy="1" r="1.1" :fill="color" />
          </g>
        </g>
      </g>

      <!-- 40. 柿子挂枝：枯枝红柿，圆润晶莹四裂黑绿萼冠 -->
      <g v-else-if="plantKey === 'shizi'">
        <path d="M10 18C15 17 21 19 28 17" stroke="#5c4436" stroke-width="2.4" stroke-linecap="round" />
        <path d="M19 18V21" stroke="#5c4436" stroke-width="1.8" />
        <!-- 红透大柿子 -->
        <g transform="translate(19 24)">
          <ellipse cx="0" cy="0" rx="6.5" ry="5.5" :fill="color" />
          <ellipse cx="0" cy="-1" rx="5" ry="4" fill="#f97316" opacity="0.4" />
          <!-- 4裂果萼 -->
          <polygon points="0,-6 -2,-4 0,-3 2,-4" fill="#365314" />
        </g>
      </g>

      <!-- 41. 菖蒲：清逸幽草，挺立剑叶配肉穗花序 -->
      <g v-else-if="plantKey === 'changpu'">
        <path d="M14 32C15 22 17 15 18 8" stroke="#3b7a57" stroke-width="2" stroke-linecap="round" />
        <path d="M20 32C20 20 21 13 23 9" stroke="#2d6a4f" stroke-width="2.2" stroke-linecap="round" />
        <path d="M26 32C25 24 24 17 24 12" stroke="#52b788" stroke-width="1.8" stroke-linecap="round" />
        <!-- 肉穗花序柱 -->
        <ellipse cx="23" cy="19" rx="1.5" ry="4.5" :fill="color" />
      </g>

      <!-- 42. 芭蕉：雨打清韵，宽展折扇蕉叶与初卷嫩芯 -->
      <g v-else-if="plantKey === 'bajiao'">
        <path d="M14 32C15 24 18 16 23 10" stroke="#2d6a4f" stroke-width="2.2" />
        <!-- 宽大芭蕉叶面 -->
        <path d="M14 30C12 20 16 12 25 8C27 15 25 22 20 28Z" :fill="color" opacity="0.85" />
        <path d="M17 23L13 21M19 18L15 16M21 14L18 12" stroke="#1b4332" stroke-width="0.8" opacity="0.6" />
        <!-- 侧旁初生嫩卷 -->
        <path d="M21 32C23 26 25 21 26 15" stroke="#74c69d" stroke-width="1.5" stroke-linecap="round" />
      </g>

      <!-- 43. 翠竹：虚怀劲节，青翠竹节与飞扬竹叶 -->
      <g v-else-if="plantKey === 'cuizhu'">
        <!-- 主竹竿与竹节 -->
        <line x1="16" y1="32" x2="16" y2="8" stroke="#2d6a4f" stroke-width="2.4" />
        <line x1="14" y1="23" x2="18" y2="23" stroke="#1b4332" stroke-width="1.2" />
        <line x1="14" y1="15" x2="18" y2="15" stroke="#1b4332" stroke-width="1.2" />
        <!-- 竹叶簇 -->
        <g transform="translate(16 15)">
          <path d="M0 0C4 1 8 0 11 -2C8 2 4 2 0 0Z" :fill="color" />
          <path d="M0 0C3 -3 6 -5 9 -8C7 -4 4 -2 0 0Z" :fill="color" />
          <path d="M0 0C1 3 2 7 2 10C1 7 0 4 0 0Z" :fill="color" />
        </g>
      </g>

      <!-- 44. 金边瑞香：墨绿叶片金边镶嵌，顶生紫红小球簇 -->
      <g v-else-if="plantKey === 'jinbianruixiang'">
        <path d="M16 32V24" stroke="#48684d" stroke-width="2" />
        <!-- 金边叶 -->
        <ellipse cx="13" cy="22" rx="5" ry="2.6" fill="#2d6a4f" stroke="#facc15" stroke-width="1" />
        <ellipse cx="27" cy="22" rx="5" ry="2.6" fill="#2d6a4f" stroke="#facc15" stroke-width="1" />
        <g transform="translate(20 16)">
          <circle r="6" :fill="color" />
          <circle cx="-2" cy="-2" r="1.5" fill="#fdf2f8" />
          <circle cx="2" cy="-2" r="1.5" fill="#fdf2f8" />
          <circle cx="0" cy="2" r="1.5" fill="#fdf2f8" />
        </g>
      </g>

      <!-- 45. 风信子：锦簇生辉，圆柱形紧凑反卷蓝紫星花穗 -->
      <g v-else-if="plantKey === 'fengxinzi'">
        <path d="M15 32V26M25 32V26" stroke="#48684d" stroke-width="2" />
        <rect x="18" y="10" width="4" height="20" rx="2" stroke="#48684d" stroke-width="1.5" fill="#48684d" />
        <g transform="translate(20 16)">
          <g v-for="(p, i) in [[-3,-5],[3,-5],[-4,-1],[0,-2],[4,-1],[-3,3],[3,3],[0,2]]" :key="i" :transform="`translate(${p[0]} ${p[1]})`">
            <circle r="2.2" :fill="color" />
            <circle r="0.8" fill="#f8fafc" />
          </g>
        </g>
      </g>

      <!-- 46. 荷包牡丹：璎珞串心，拱枝整齐垂挂粉红心形荷包！ -->
      <g v-else-if="plantKey === 'hebaomudan'">
        <path d="M10 16C15 13 22 14 29 19" stroke="#48684d" stroke-width="1.8" stroke-linecap="round" fill="none" />
        <!-- 荷包 1 -->
        <g transform="translate(15 20)">
          <path d="M0 -1C-2 -3 -4 -1 -2 2C-1 3 0 4 0 5C0 4 1 3 2 2C4 -1 2 -3 0 -1Z" :fill="color" />
          <circle cx="0" cy="5.5" r="0.9" fill="#f8fafc" />
        </g>
        <!-- 荷包 2 -->
        <g transform="translate(21 21)">
          <path d="M0 -1C-2 -3 -4 -1 -2 2C-1 3 0 4 0 5C0 4 1 3 2 2C4 -1 2 -3 0 -1Z" :fill="color" />
          <circle cx="0" cy="5.5" r="0.9" fill="#f8fafc" />
        </g>
        <!-- 荷包 3 -->
        <g transform="translate(27 24)">
          <path d="M0 -1C-1.8 -2.5 -3.5 -0.8 -1.8 1.8C-0.8 2.5 0 3.5 0 4.2C0 3.5 0.8 2.5 1.8 1.8C3.5 -0.8 1.8 -2.5 0 -1Z" :fill="color" />
          <circle cx="0" cy="4.6" r="0.7" fill="#f8fafc" />
        </g>
      </g>

      <!-- 47. 天竹子：冬日红珊瑚，直立枝头密生圆润红珠浆果 -->
      <g v-else-if="plantKey === 'tianzhuzi'">
        <path d="M16 32L20 20L22 12" stroke="#5c483a" stroke-width="2" stroke-linecap="round" />
        <path d="M20 20L15 14M20 17L25 15" stroke="#5c483a" stroke-width="1.5" stroke-linecap="round" />
        <!-- 红果球簇 -->
        <g :fill="color">
          <circle cx="22" cy="11" r="2.4" />
          <circle cx="18" cy="13" r="2.2" />
          <circle cx="24" cy="14" r="2.2" />
          <circle cx="15" cy="13" r="2" />
          <circle cx="21" cy="16" r="2.4" />
          <circle cx="18" cy="18" r="2.2" />
          <circle cx="25" cy="17" r="2" />
        </g>
      </g>

      <!-- 兜底通用自然花苞 -->
      <g v-else>
        <path d="M20 32V18" stroke="#48684d" stroke-width="2" stroke-linecap="round" />
        <circle cx="20" cy="15" r="6" :fill="color" />
        <circle cx="20" cy="15" r="2.5" fill="#fef08a" />
      </g>
    </svg>
  </span>
</template>

<style scoped>
.botanical-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 11px;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}
.botanical-icon-wrap:hover {
  transform: scale(1.06);
}
.botanical-icon-svg {
  width: 40px;
  height: 40px;
  display: block;
}
</style>
