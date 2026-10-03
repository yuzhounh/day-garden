<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    name?: string
    color?: string
  }>(),
  {
    name: '桂花',
    color: '#e4ba68',
  }
)

const gradientId = useId()

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
  <svg viewBox="0 0 320 280" fill="none" aria-hidden="true" class="botanical-art">
    <defs>
      <linearGradient :id="gradientId" x1="70" y1="60" x2="250" y2="260" gradientUnits="userSpaceOnUse">
        <stop stop-color="#9eb698" />
        <stop offset="1" stop-color="#4d7965" />
      </linearGradient>
    </defs>

    <!-- 柔和氛围光晕底衬 -->
    <ellipse cx="160" cy="255" rx="85" ry="9" fill="#40634b" opacity=".06" />
    <circle cx="165" cy="130" r="92" :fill="color" opacity=".12" />

    <!-- 1. 蜡梅：折角老枝，蜡质透黄圆瓣带紫红心 -->
    <g v-if="plantKey === 'lamei'">
      <path d="M145 252C152 210 148 175 168 128M152 205C125 185 105 160 88 125M162 155C188 140 215 115 235 85M170 115C155 85 140 65 125 45" stroke="#685542" stroke-width="2.6" stroke-linecap="round" />
      <!-- 金黄蜡质圆润小花朵 -->
      <g :fill="color">
        <g v-for="(p, i) in [[168,126],[125,45],[88,125],[235,85],[152,175],[195,128],[138,85],[208,105]]" :key="i" :transform="`translate(${p[0]} ${p[1]})`">
          <circle cx="0" cy="-6" r="4.2" opacity="0.9" />
          <circle cx="5.5" cy="-2" r="4.2" opacity="0.9" />
          <circle cx="3.5" cy="5" r="4.2" opacity="0.9" />
          <circle cx="-3.5" cy="5" r="4.2" opacity="0.9" />
          <circle cx="-5.5" cy="-2" r="4.2" opacity="0.9" />
          <circle cx="0" cy="0" r="2.8" fill="#881337" />
        </g>
      </g>
    </g>

    <!-- 42. 芭蕉：雨打清韵，巨大宽展芭蕉叶面配风琴褶 -->
    <g v-else-if="plantKey === 'bajiao'">
      <path d="M135 252C145 180 170 120 220 70" stroke="#2d6a4f" stroke-width="3.5" />
      <path d="M135 230C110 160 145 90 235 60C250 110 235 170 190 220Z" :fill="color" opacity="0.85" />
      <!-- 撕裂风琴线 -->
      <path d="M165 180L135 165M185 140L155 125M205 105L180 90" stroke="#1b4332" stroke-width="1.6" opacity="0.6" />
      <path d="M190 252C210 200 230 160 240 110" stroke="#74c69d" stroke-width="2.5" stroke-linecap="round" />
    </g>

    <!-- 31. 茶梅：岁末花红，浅碗状粉瓣与散落落瓣 -->
    <g v-else-if="plantKey === 'chamei'">
      <path d="M155 252V150" stroke="#425845" stroke-width="2.6" />
      <ellipse cx="120" cy="180" rx="18" ry="9" fill="#2d4230" transform="rotate(-20 120 180)" />
      <g transform="translate(160 115)">
        <g :fill="color">
          <circle v-for="deg in [0, 72, 144, 216, 288]" :key="deg" :transform="`rotate(${deg})`" cy="-20" r="14" />
          <circle r="9" fill="#fbbf24" />
        </g>
      </g>
      <!-- 地面落瓣 -->
      <ellipse cx="125" cy="245" rx="8" ry="4" :fill="color" transform="rotate(-15 125 245)" opacity="0.8" />
      <ellipse cx="195" cy="248" rx="8" ry="4" :fill="color" transform="rotate(20 195 248)" opacity="0.8" />
    </g>

    <!-- 41. 菖蒲：幽涧仙草，丛生剑叶配肉穗花序 -->
    <g v-else-if="plantKey === 'changpu'">
      <g stroke="#3b7a57" stroke-linecap="round">
        <path d="M140 252C145 170 152 110 155 60" stroke-width="3" />
        <path d="M160 252C160 160 165 100 172 50" stroke-width="3.5" stroke="#2d6a4f" />
        <path d="M180 252C178 180 175 120 172 70" stroke-width="2.6" stroke="#52b788" />
      </g>
      <ellipse cx="172" cy="115" rx="3.5" ry="16" :fill="color" />
    </g>

    <!-- 43. 翠竹：虚怀劲节，青翠竹竿、竹节与飘逸竹叶 -->
    <g v-else-if="plantKey === 'cuizhu'">
      <line x1="150" y1="252" x2="150" y2="45" stroke="#2d6a4f" stroke-width="4.5" />
      <!-- 竹节环 -->
      <line x1="144" y1="185" x2="156" y2="185" stroke="#1b4332" stroke-width="2.5" />
      <line x1="144" y1="125" x2="156" y2="125" stroke="#1b4332" stroke-width="2.5" />
      <line x1="144" y1="65" x2="156" y2="65" stroke="#1b4332" stroke-width="2.5" />
      <!-- 竹叶串簇 -->
      <g :fill="color">
        <g transform="translate(150 125)">
          <path d="M0 0C15 4 30 0 42 -8C30 8 15 8 0 0Z" />
          <path d="M0 0C12 -12 24 -20 36 -32C28 -16 16 -8 0 0Z" />
          <path d="M0 0C4 12 8 28 8 40C4 28 0 16 0 0Z" />
        </g>
        <g transform="translate(150 65)">
          <path d="M0 0C-15 4 -30 0 -42 -8C-30 8 -15 8 0 0Z" />
          <path d="M0 0C-12 -12 -24 -20 -36 -32C-28 -16 -16 -8 0 0Z" />
        </g>
      </g>
    </g>

    <!-- 39. 丹桂：金粟飘香，叶腋密集朱砂橙红小花簇 -->
    <g v-else-if="plantKey === 'dangui'">
      <path d="M160 252V60" stroke="#2d4230" stroke-width="2.8" />
      <g fill="#1f3322">
        <ellipse cx="115" cy="180" rx="36" ry="15" transform="rotate(-25 115 180)" />
        <ellipse cx="205" cy="160" rx="36" ry="15" transform="rotate(25 205 160)" />
        <ellipse cx="120" cy="110" rx="30" ry="13" transform="rotate(-20 120 110)" />
        <ellipse cx="200" cy="95" rx="30" ry="13" transform="rotate(20 200 95)" />
      </g>
      <g :fill="color">
        <g v-for="(center, k) in [[160,170],[160,105],[160,65]]" :key="k" :transform="`translate(${center[0]} ${center[1]})`">
          <g v-for="(p, i) in [[-10,-8],[10,-6],[-8,8],[8,8],[0,-12],[0,12],[0,0],[-15,0],[15,0]]" :key="i" :transform="`translate(${p[0]} ${p[1]})`">
            <circle cx="-3" cy="0" r="2.2" />
            <circle cx="3" cy="0" r="2.2" />
            <circle cx="0" cy="-3" r="2.2" />
            <circle cx="0" cy="3" r="2.2" />
          </g>
        </g>
      </g>
    </g>

    <!-- 14. 杜鹃：漫山红遍，宽漏斗花冠配上瓣深红雀斑与上翘花蕊 -->
    <g v-else-if="plantKey === 'dujuan'">
      <path d="M155 252C158 215 155 180 162 145" stroke="#4d6950" stroke-width="2.6" stroke-linecap="round" />
      <g :fill="`url(#${gradientId})`" opacity="0.85">
        <ellipse cx="130" cy="180" rx="16" ry="8" transform="rotate(-25 130 180)" />
        <ellipse cx="195" cy="170" rx="16" ry="8" transform="rotate(25 195 170)" />
      </g>
      <!-- 漏斗大花 -->
      <g transform="translate(162 120)">
        <g :fill="color">
          <ellipse cx="0" cy="-20" rx="15" ry="12" />
          <ellipse cx="-22" cy="-6" rx="14" ry="12" />
          <ellipse cx="22" cy="-6" rx="14" ry="12" />
          <ellipse cx="-14" cy="14" rx="14" ry="12" />
          <ellipse cx="14" cy="14" rx="14" ry="12" />
        </g>
        <!-- 雀斑 -->
        <circle cx="0" cy="-16" r="1.6" fill="#7f1d1d" />
        <circle cx="-5" cy="-22" r="1.4" fill="#7f1d1d" />
        <circle cx="5" cy="-22" r="1.4" fill="#7f1d1d" />
        <!-- 上翘突出长蕊 -->
        <path d="M0 0C10 10 25 5 28 -8" stroke="#fecdd3" stroke-width="2" stroke-linecap="round" fill="none" />
      </g>
    </g>

    <!-- 45. 风信子：锦簇生辉，粗壮肉质花柱密布反卷蓝紫星花 -->
    <g v-else-if="plantKey === 'fengxinzi'">
      <path d="M160 252V140" stroke="#48684d" stroke-width="3" />
      <rect x="152" y="60" width="16" height="90" rx="8" fill="#3b5e43" />
      <g transform="translate(160 105)">
        <g v-for="(p, i) in [[-12,-35],[12,-35],[-16,-15],[0,-20],[16,-15],[-12,5],[12,5],[0,0],[-16,25],[16,25],[0,20]]" :key="i" :transform="`translate(${p[0]} ${p[1]})`">
          <circle r="8.5" :fill="color" />
          <circle r="3" fill="#f8fafc" />
        </g>
      </g>
    </g>

    <!-- 29. 枫叶 · 枫香：掌状五角鲜红枫叶与对生双翅果 -->
    <g v-else-if="plantKey === 'fengye'">
      <path d="M160 252L160 145" stroke="#713f12" stroke-width="2.6" />
      <!-- 主大红枫叶 -->
      <g transform="translate(160 115)" :fill="color">
        <polygon points="0,-48 8,-18 36,-25 18,2 38,18 12,14 8,32 0,20 -8,32 -12,14 -38,18 -18,2 -36,-25 -8,-18" />
      </g>
      <!-- 双翅果 -->
      <g transform="translate(205 160)">
        <path d="M0 0C8 8 18 10 24 6C20 4 12 2 0 0Z" fill="#b91c1c" />
        <path d="M0 0C-8 8 -18 10 -24 6C-20 4 -12 2 0 0Z" fill="#b91c1c" />
        <circle cx="0" cy="0" r="2.5" fill="#713f12" />
      </g>
    </g>

    <!-- 24. 桂花：秋日金粟，对生革质深绿叶，叶腋密集四裂微小金花簇 -->
    <g v-else-if="plantKey === 'guihua'">
      <path d="M160 252V60" stroke="#3b5e43" stroke-width="2.8" />
      <g fill="#2d4a34">
        <ellipse cx="115" cy="180" rx="36" ry="15" transform="rotate(-25 115 180)" />
        <ellipse cx="205" cy="160" rx="36" ry="15" transform="rotate(25 205 160)" />
        <ellipse cx="120" cy="110" rx="30" ry="13" transform="rotate(-20 120 110)" />
        <ellipse cx="200" cy="95" rx="30" ry="13" transform="rotate(20 200 95)" />
      </g>
      <!-- 叶腋簇生碎金小花 -->
      <g :fill="color">
        <g v-for="(center, k) in [[160,170],[160,105],[160,65]]" :key="k" :transform="`translate(${center[0]} ${center[1]})`">
          <g v-for="(p, i) in [[-10,-8],[10,-6],[-8,8],[8,8],[0,-12],[0,12],[0,0],[-15,0],[15,0]]" :key="i" :transform="`translate(${p[0]} ${p[1]})`">
            <circle cx="-3" cy="0" r="2.2" />
            <circle cx="3" cy="0" r="2.2" />
            <circle cx="0" cy="-3" r="2.2" />
            <circle cx="0" cy="3" r="2.2" />
            <circle cx="0" cy="0" r="1.4" fill="#ca8a04" />
          </g>
        </g>
      </g>
    </g>

    <!-- 46. 荷包牡丹：璎珞串心，拱轴整齐悬挂心形粉红荷包！ -->
    <g v-else-if="plantKey === 'hebaomudan'">
      <path d="M100 135C140 105 200 115 260 160" stroke="#48684d" stroke-width="2.6" stroke-linecap="round" fill="none" />
      <g v-for="(p, i) in [[135,130],[175,128],[215,142],[250,165]]" :key="i" :transform="`translate(${p[0]} ${p[1]})`">
        <!-- 悬垂小柄 -->
        <line x1="0" y1="-12" x2="0" y2="0" stroke="#48684d" stroke-width="1.6" />
        <!-- 心形荷包 -->
        <path d="M0 -3C-8 -12 -16 -4 -8 8C-4 12 0 16 0 20C0 16 4 12 8 8C16 -4 8 -12 0 -3Z" :fill="color" />
        <!-- 滴出纯白水滴花瓣 -->
        <ellipse cx="0" cy="22" rx="3" ry="4.5" fill="#f8fafc" />
      </g>
    </g>

    <!-- 20. 荷花：接天莲叶无穷碧，出水粉红大莲花与金黄莲蓬 -->
    <g v-else-if="plantKey === 'hehua'">
      <path d="M165 252L165 110" stroke="#3b7a57" stroke-width="3.2" stroke-linecap="round" />
      <!-- 圆盾大荷叶 -->
      <ellipse cx="115" cy="215" rx="55" ry="18" :fill="`url(#${gradientId})`" opacity=".8" />
      <!-- 莲花大瓣 -->
      <g transform="translate(165 95)" :fill="color">
        <path d="M0 -45C-28 -20 -30 15 0 28C30 15 28 -20 0 -45Z" opacity=".95" />
        <path d="M-22 -25C-42 -5 -35 20 -10 24C-24 6 -28 -10 -22 -25Z" opacity=".85" />
        <path d="M22 -25C42 -5 35 20 10 24C24 6 28 -10 22 -25Z" opacity=".85" />
        <!-- 莲蓬金杯 -->
        <circle cx="0" cy="5" r="9" fill="#eab308" />
      </g>
    </g>

    <!-- 37. 合欢花：细密羽叶上绽放的粉红丝绒扇面丝球 -->
    <g v-else-if="plantKey === 'hehuanhua'">
      <path d="M140 252C150 200 155 160 160 130" stroke="#48684d" stroke-width="2.6" />
      <g transform="translate(160 115)">
        <path v-for="deg in [-70, -50, -30, -10, 10, 30, 50, 70]" :key="deg"
              :transform="`rotate(${deg})`"
              d="M0 0L0 -35" stroke="#f472b6" stroke-width="2.2" stroke-linecap="round" />
        <circle v-for="deg in [-70, -50, -30, -10, 10, 30, 50, 70]" :key="'d'+deg"
                :transform="`rotate(${deg}) translate(0 -35)`" r="2.4" fill="#fdf2f8" />
      </g>
    </g>

    <!-- 5. 结香：打结柔韧褐色木枝，下垂伞状密集金黄头状花序 -->
    <g v-else-if="plantKey === 'jiexiang'">
      <path d="M140 252C145 200 170 195 170 155C170 130 145 115 135 140C125 165 155 185 185 180" stroke="#715339" stroke-width="3" stroke-linecap="round" fill="none" />
      <path d="M185 180C215 175 235 150 240 120" stroke="#715339" stroke-width="2.5" stroke-linecap="round" fill="none" />
      <!-- 下垂密集圆球金黄小花簇 -->
      <g :fill="color">
        <g transform="translate(185 180)">
          <circle cx="0" cy="8" r="14" opacity="0.3" />
          <circle v-for="(p, i) in [[-6,4],[0,2],[6,4],[-8,9],[-2,8],[4,8],[9,9],[-5,13],[1,13],[6,13],[0,17]]" :key="i" :cx="p[0]" :cy="p[1]" r="3.2" />
        </g>
        <g transform="translate(240 120)">
          <circle cx="0" cy="6" r="10" opacity="0.3" />
          <circle v-for="(p, i) in [[-4,3],[2,3],[-5,7],[0,7],[5,7],[-2,11],[3,11]]" :key="i" :cx="p[0]" :cy="p[1]" r="2.8" />
        </g>
      </g>
    </g>

    <!-- 44. 金边瑞香：墨绿厚叶镶嵌明亮金边，顶生紧密紫红花球 -->
    <g v-else-if="plantKey === 'jinbianruixiang'">
      <path d="M160 252V150" stroke="#48684d" stroke-width="2.8" />
      <g fill="#2d6a4f" stroke="#facc15" stroke-width="2">
        <ellipse cx="115" cy="180" rx="32" ry="14" transform="rotate(-25 115 180)" />
        <ellipse cx="205" cy="170" rx="32" ry="14" transform="rotate(25 205 170)" />
      </g>
      <g transform="translate(160 115)">
        <circle r="32" :fill="color" />
        <circle v-for="(p, i) in [[-10,-10],[10,-10],[-10,10],[10,10],[0,0],[0,-16],[0,16],[-16,0],[16,0]]" :key="i" :cx="p[0]" :cy="p[1]" r="4.5" fill="#fdf2f8" />
      </g>
    </g>

    <!-- 34. 金银花：并蒂二唇长蕊筒花（一金一银） -->
    <g v-else-if="plantKey === 'jinyinhua'">
      <path d="M135 252C145 190 185 160 215 110" stroke="#48684d" stroke-width="2.6" stroke-linecap="round" fill="none" />
      <!-- 银花 (白色) -->
      <g transform="translate(165 130)">
        <path d="M0 0C-8 -15 -12 -30 0 -35C8 -30 8 -15 0 0Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2" />
        <path d="M0 -35C-6 -45 -3 -52 4 -48" stroke="#facc15" stroke-width="1.8" fill="none" />
      </g>
      <!-- 金花 (黄色) -->
      <g transform="translate(205 110)">
        <path d="M0 0C-8 -15 -12 -30 0 -35C8 -30 8 -15 0 0Z" :fill="color" />
        <path d="M0 -35C-6 -45 -3 -52 4 -48" stroke="#ca8a04" stroke-width="1.8" fill="none" />
      </g>
    </g>

    <!-- 26. 菊花：秋色正好，经典细长丝状卷曲放射瓣，区别于桂花！ -->
    <g v-else-if="plantKey === 'juhua'">
      <path d="M160 252V145" stroke="#4a6850" stroke-width="3" />
      <!-- 深裂菊叶 -->
      <g fill="#3b5e43">
        <path d="M160 215C125 195 105 165 95 135C115 145 130 160 140 180C148 165 155 175 160 205Z" />
        <path d="M160 195C195 175 215 145 225 115C205 125 190 140 180 160C172 145 165 155 160 185Z" />
      </g>
      <!-- 放射丝状卷瓣菊花头 -->
      <g transform="translate(160 110)">
        <g stroke="currentColor" :style="{ color: color }" stroke-width="2.8" stroke-linecap="round" fill="none">
          <path v-for="deg in [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340]" :key="deg"
                :transform="`rotate(${deg})`"
                d="M0 0C-4 -12 6 -24 3 -36" />
        </g>
        <circle r="12" fill="#ca8a04" />
        <circle r="6" fill="#713f12" />
      </g>
    </g>

    <!-- 38. 蓝花楹：羽叶风铃，梦幻紫蓝吊钟花串 -->
    <g v-else-if="plantKey === 'lanhuaying'">
      <path d="M135 252C145 190 180 150 210 95" stroke="#4b5563" stroke-width="2.6" stroke-linecap="round" fill="none" />
      <g transform="translate(180 115)">
        <path d="M-10 -15C-14 0 -7 10 0 14C7 10 14 0 10 -15Z" :fill="color" />
        <circle cx="0" cy="4" r="3.5" fill="#ede9fe" />
      </g>
      <g transform="translate(210 95)">
        <path d="M-8 -12C-11 0 -5 8 0 11C5 8 11 0 8 -12Z" :fill="color" opacity="0.85" />
      </g>
    </g>

    <!-- 11. 连翘：挺拔拱形金条枝，四裂狭长金瓣四方展延 -->
    <g v-else-if="plantKey === 'lianqiao'">
      <path d="M135 252C145 200 140 150 175 95C200 60 235 50 260 55" stroke="#5a704a" stroke-width="2.6" stroke-linecap="round" fill="none" />
      <path d="M150 170C120 145 95 125 75 105" stroke="#5a704a" stroke-width="2.2" stroke-linecap="round" fill="none" />
      <g :fill="color">
        <g v-for="(p, i) in [[260,55],[225,60],[195,75],[175,95],[145,135],[110,120],[75,105],[215,110],[245,95]]" :key="i" :transform="`translate(${p[0]} ${p[1]})`">
          <ellipse v-for="deg in [0, 90, 180, 270]" :key="deg" :transform="`rotate(${deg})`" cy="-9" rx="3.2" ry="8" />
          <circle r="2.8" fill="#ca8a04" />
        </g>
      </g>
    </g>

    <!-- 8. 梨花：一树梨花白胜雪，伞房白花点缀深紫黑花药 -->
    <g v-else-if="plantKey === 'lihua'">
      <path d="M145 252C152 210 150 165 170 115M155 180C125 155 105 130 90 95M165 145C195 130 225 105 240 70" stroke="#526053" stroke-width="2.6" stroke-linecap="round" />
      <!-- 翠绿阔卵形叶 -->
      <g :fill="`url(#${gradientId})`" opacity="0.8">
        <ellipse cx="120" cy="140" rx="14" ry="7" transform="rotate(-30 120 140)" />
        <ellipse cx="205" cy="120" rx="14" ry="7" transform="rotate(25 205 120)" />
      </g>
      <!-- 雪白五瓣花带紫药 -->
      <g v-for="(p, i) in [[170,115],[90,95],[240,70],[135,160],[195,130],[120,65]]" :key="i" :transform="`translate(${p[0]} ${p[1]})`">
        <circle v-for="deg in [0, 72, 144, 216, 288]" :key="deg" :transform="`rotate(${deg})`" cy="-9" r="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.9" />
        <circle r="3.2" fill="#78350f" />
        <circle v-for="deg in [20, 60, 100, 140, 180, 220, 260, 300, 340]" :key="'d'+deg" :transform="`rotate(${deg}) translate(0 -5.5)`" r="1.1" fill="#4c0519" />
      </g>
    </g>

    <!-- 35. 凌霄花：攀援悬垂的大喇叭花，橙红热烈 -->
    <g v-else-if="plantKey === 'lingxiaohua'">
      <path d="M190 45C170 95 160 150 145 210" stroke="#524335" stroke-width="3" stroke-linecap="round" fill="none" />
      <g transform="translate(155 140)">
        <path d="M-25 -16L-4 -4L8 20L0 20L-16 0Z" fill="#ea580c" />
        <path d="M-8 16C8 16 24 0 24 -16C16 -12 8 -8 -8 16Z" :fill="color" />
        <circle cx="8" cy="-4" r="5" fill="#fef08a" />
      </g>
    </g>

    <!-- 25. 栾树：挂满小红灯笼！羽状复叶与悬垂三棱粉红纸灯笼蒴果 -->
    <g v-else-if="plantKey === 'luanshu'">
      <path d="M120 252C140 190 170 140 230 75" stroke="#684f3c" stroke-width="3" stroke-linecap="round" fill="none" />
      <path d="M165 145C135 125 105 105 85 85" stroke="#684f3c" stroke-width="2.2" stroke-linecap="round" fill="none" />
      <!-- 羽状复叶小叶片 -->
      <g fill="#4d7c58" opacity="0.85">
        <ellipse cx="140" cy="115" rx="14" ry="6" transform="rotate(-30 140 115)" />
        <ellipse cx="180" cy="95" rx="14" ry="6" transform="rotate(-25 180 95)" />
        <ellipse cx="105" cy="85" rx="12" ry="5" transform="rotate(-40 105 85)" />
      </g>
      <!-- 悬挂的粉红小纸灯笼果实群 (三棱中缝凹凸感) -->
      <g v-for="(p, i) in [[175,170],[215,120],[130,135],[95,115],[240,90]]" :key="i" :transform="`translate(${p[0]} ${p[1]})`">
        <!-- 果柄 -->
        <line x1="0" y1="-14" x2="0" y2="0" stroke="#684f3c" stroke-width="1.6" />
        <!-- 三棱灯笼囊状果实 -->
        <path d="M0 -10C-14 -4 -15 12 0 18C15 12 14 -4 0 -10Z" :fill="color" />
        <!-- 果瓣棱线 -->
        <line x1="0" y1="-10" x2="0" y2="18" stroke="#be123c" stroke-width="1.8" opacity="0.55" />
        <path d="M0 -10C-7 0 -7 10 0 18" stroke="#be123c" stroke-width="1.2" opacity="0.4" fill="none" />
        <path d="M0 -10C7 0 7 10 0 18" stroke="#be123c" stroke-width="1.2" opacity="0.4" fill="none" />
        <!-- 顶端小宿存花柱尖 -->
        <line x1="0" y1="18" x2="0" y2="21" stroke="#be123c" stroke-width="1.4" />
      </g>
      <!-- 零星晚开碎金黄花 -->
      <g fill="#facc15">
        <circle cx="215" cy="65" r="2.5" />
        <circle cx="225" cy="62" r="2.2" />
        <circle cx="232" cy="70" r="2.4" />
      </g>
    </g>

    <!-- 30. 芦苇：白羽随风，轻柔摇曳的修长羽状花穗 -->
    <g v-else-if="plantKey === 'luwei'">
      <path d="M135 252C145 190 175 130 235 65" stroke="#71806e" stroke-width="3" stroke-linecap="round" fill="none" />
      <g fill="#527056" opacity="0.8">
        <path d="M145 180C110 170 85 150 70 130C95 145 125 160 145 175Z" />
      </g>
      <!-- 蓬松羽状大穗 -->
      <g transform="translate(210 90) rotate(35)">
        <ellipse cx="0" cy="0" rx="14" ry="38" :fill="color" opacity="0.8" />
        <path d="M-12 -20C-5 -26 8 -28 16 -20M-16 0C-8 -6 8 -10 18 0M-12 20C-4 10 8 6 16 18" stroke="#f8fafc" stroke-width="1.8" />
      </g>
    </g>

    <!-- 4. 梅花：疏影横斜，老干生苍苔，五出绯红圆瓣配长蕊 -->
    <g v-else-if="plantKey === 'meihua'">
      <path d="M145 252C155 205 145 160 175 105M152 185C120 160 95 135 80 95M165 150C195 135 225 110 245 70M170 115C158 85 145 65 128 45" stroke="#5a4235" stroke-width="3" stroke-linecap="round" />
      <g :fill="color">
        <g v-for="(p, i) in [[175,105],[128,45],[80,95],[245,70],[170,145],[115,75],[210,95],[145,185],[200,120]]" :key="i" :transform="`translate(${p[0]} ${p[1]})`">
          <circle v-for="deg in [0, 72, 144, 216, 288]" :key="deg" :transform="`rotate(${deg})`" cy="-9" r="6" />
          <circle r="3.5" fill="#facc15" />
          <!-- 放射状花丝花药 -->
          <line v-for="deg in [18, 54, 90, 126, 162, 198, 234, 270, 306, 342]" :key="'l'+deg" :transform="`rotate(${deg})`" x1="0" y1="0" x2="0" y2="-6.5" stroke="#78350f" stroke-width="0.8" />
        </g>
      </g>
    </g>

    <!-- 36. 美人蕉：巨大芭蕉状阔叶与火焰不对称红瓣 -->
    <g v-else-if="plantKey === 'meirenjiao'">
      <path d="M135 252C135 180 160 120 200 90C180 150 170 210 165 252Z" fill="#2d6a4f" />
      <g transform="translate(200 90)" :fill="color">
        <path d="M-10 15C-15 -8 0 -24 12 -28C4 -12 12 0 0 15Z" />
        <path d="M-4 8C4 -4 16 -12 20 -20C16 -4 12 8 4 12Z" fill="#ef4444" />
      </g>
    </g>

    <!-- 22. 茉莉花：清雅素馨，对生翠绿小叶，星芒纯白小花 -->
    <g v-else-if="plantKey === 'moli'">
      <path d="M150 252C155 205 152 165 165 125" stroke="#3b6343" stroke-width="2.6" />
      <g fill="#3b6343" opacity="0.85">
        <ellipse cx="130" cy="185" rx="16" ry="8" transform="rotate(-25 130 185)" />
        <ellipse cx="190" cy="175" rx="16" ry="8" transform="rotate(25 190 175)" />
        <ellipse cx="135" cy="135" rx="14" ry="7" transform="rotate(-20 135 135)" />
        <ellipse cx="195" cy="125" rx="14" ry="7" transform="rotate(20 195 125)" />
      </g>
      <g transform="translate(165 105)">
        <circle v-for="deg in [0, 60, 120, 180, 240, 300]" :key="deg" :transform="`rotate(${deg})`" cy="-14" r="6.5" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.9" />
        <circle r="4" fill="#fef08a" />
      </g>
    </g>

    <!-- 12. 牡丹：国色天香，千层起伏大褶皱重瓣花冠与齿叶 -->
    <g v-else-if="plantKey === 'mudan'">
      <path d="M155 250C158 215 155 180 162 145M156 205C130 190 105 175 90 155M160 185C185 175 210 160 225 140" stroke="#5a826a" stroke-width="2.6" stroke-linecap="round" />
      <!-- 深绿锯齿复叶 -->
      <g :fill="`url(#${gradientId})`">
        <path d="M90 155C70 140 75 125 85 120C95 125 105 140 90 155Z" />
        <path d="M225 140C245 125 240 110 230 105C220 110 210 125 225 140Z" />
      </g>
      <!-- 层层富丽重瓣 -->
      <g transform="translate(162 115)" :fill="color">
        <circle r="44" opacity=".35" />
        <circle r="34" opacity=".6" />
        <path d="M0 -35C-24 -20 -26 15 0 28C26 15 24 -20 0 -35Z" opacity=".95" />
        <path d="M-24 -18C-40 -4 -36 18 -10 22C-22 6 -30 -6 -24 -18Z" opacity=".9" />
        <path d="M24 -18C40 -4 36 18 10 22C22 6 30 -6 24 -18Z" opacity=".9" />
        <circle r="7.5" fill="#facc15" />
      </g>
    </g>

    <!-- 27. 木芙蓉：秋波一日三变，大朵重瓣配掌状心形叶 -->
    <g v-else-if="plantKey === 'mufurong'">
      <path d="M155 252L160 150" stroke="#48684d" stroke-width="2.8" />
      <g fill="#3b5e43" opacity="0.85">
        <path d="M160 210C110 180 90 130 95 90C125 120 145 160 160 195Z" />
      </g>
      <g transform="translate(160 115)" :fill="color">
        <circle r="46" opacity=".35" />
        <circle r="34" opacity=".65" />
        <circle r="20" opacity=".95" />
        <circle r="6" fill="#fef08a" />
      </g>
    </g>

    <!-- 33. 木槿：直立钟状花，红心白蕊柱挺立 -->
    <g v-else-if="plantKey === 'mujin'">
      <path d="M160 252V145" stroke="#48684d" stroke-width="2.6" />
      <g transform="translate(160 115)">
        <g :fill="color">
          <circle v-for="deg in [0, 72, 144, 216, 288]" :key="deg" :transform="`rotate(${deg})`" cy="-22" r="14" />
          <circle r="11" fill="#991b1b" />
        </g>
        <line x1="0" y1="0" x2="0" y2="-24" stroke="#f8fafc" stroke-width="3.5" stroke-linecap="round" />
        <circle cx="0" cy="-24" r="3.5" fill="#facc15" />
      </g>
    </g>

    <!-- 16. 蔷薇：花墙蔓生带皮刺，小花伞房团簇 -->
    <g v-else-if="plantKey === 'qiangwei'">
      <path d="M135 252C145 195 185 170 195 120" stroke="#48684d" stroke-width="2.6" stroke-linecap="round" fill="none" />
      <!-- 皮刺 -->
      <path d="M148 215L140 212M172 180L178 175" stroke="#48684d" stroke-width="2" />
      <g :fill="color">
        <g v-for="(p, i) in [[195,115],[165,135],[225,125],[180,85],[215,90]]" :key="i" :transform="`translate(${p[0]} ${p[1]})`">
          <circle v-for="deg in [0, 72, 144, 216, 288]" :key="deg" :transform="`rotate(${deg})`" cy="-8" r="5" />
          <circle r="3" fill="#facc15" />
        </g>
      </g>
    </g>

    <!-- 32. 山茶：冬日正红，厚质深绿亮叶衬托端庄重瓣红花 -->
    <g v-else-if="plantKey === 'shancha'">
      <path d="M160 252V155" stroke="#2d4a34" stroke-width="3" />
      <g fill="#1b3820">
        <ellipse cx="110" cy="180" rx="30" ry="14" transform="rotate(-25 110 180)" />
        <ellipse cx="210" cy="165" rx="30" ry="14" transform="rotate(25 210 165)" />
      </g>
      <g transform="translate(160 110)" :fill="color">
        <circle r="42" opacity=".4" />
        <circle r="32" opacity=".75" />
        <circle r="20" opacity=".95" />
        <circle r="7" fill="#facc15" />
      </g>
    </g>

    <!-- 15. 芍药：五月花神，草本茎干托起丰满温润粉瓣 -->
    <g v-else-if="plantKey === 'shaoyao'">
      <path d="M160 252L160 140" stroke="#48684d" stroke-width="2.8" stroke-linecap="round" />
      <g :fill="`url(#${gradientId})`" opacity="0.85">
        <path d="M160 210C130 190 110 160 100 130C120 150 145 180 160 200Z" />
        <path d="M160 190C190 170 210 140 220 110C200 130 175 160 160 180Z" />
      </g>
      <g transform="translate(160 110)" :fill="color">
        <circle r="40" opacity=".35" />
        <circle r="30" opacity=".65" />
        <circle r="18" opacity=".9" />
        <circle r="6" fill="#f59e0b" />
      </g>
    </g>

    <!-- 17. 石榴花：肉质厚萼筒，顶端迸裂火红褶皱花冠 -->
    <g v-else-if="plantKey === 'shiliuhua'">
      <path d="M150 252C155 200 150 160 165 125" stroke="#5c4938" stroke-width="2.6" />
      <g fill="#48684d" opacity="0.85">
        <ellipse cx="135" cy="180" rx="14" ry="6" transform="rotate(-20 135 180)" />
        <ellipse cx="185" cy="165" rx="14" ry="6" transform="rotate(20 185 165)" />
      </g>
      <g transform="translate(165 110)">
        <!-- 钟状厚肉花萼 -->
        <path d="M-15 15L-6 -5L6 -5L15 15Z" fill="#b91c1c" />
        <!-- 褶皱火红大瓣 -->
        <g :fill="color">
          <ellipse cx="-12" cy="-18" rx="12" ry="16" transform="rotate(-20 -12 -18)" />
          <ellipse cx="12" cy="-18" rx="12" ry="16" transform="rotate(20 12 -18)" />
          <ellipse cx="0" cy="-24" rx="14" ry="18" fill="#ea580c" />
          <circle cx="0" cy="-10" r="4" fill="#fef08a" />
        </g>
      </g>
    </g>

    <!-- 40. 柿子挂枝：枯木逢秋，圆润橙红饱满果实配四裂黑绿萼 -->
    <g v-else-if="plantKey === 'shizi'">
      <path d="M110 130C150 120 200 135 250 115" stroke="#5c4436" stroke-width="4" stroke-linecap="round" fill="none" />
      <g v-for="(p, i) in [[150,155],[195,170],[235,145]]" :key="i" :transform="`translate(${p[0]} ${p[1]})`">
        <line x1="0" y1="-28" x2="0" y2="-12" stroke="#5c4436" stroke-width="2.5" />
        <ellipse cx="0" cy="0" rx="22" ry="18" :fill="color" />
        <ellipse cx="0" cy="-4" rx="16" ry="12" fill="#f97316" opacity="0.4" />
        <!-- 4裂大果萼 -->
        <polygon points="0,-20 -7,-14 0,-10 7,-14" fill="#365314" />
      </g>
    </g>

    <!-- 21. 睡莲：水面浮生，星芒尖细淡紫花瓣与缺角浮叶 -->
    <g v-else-if="plantKey === 'shuilian'">
      <!-- 缺角圆形浮叶 -->
      <path d="M90 220C90 195 130 180 175 180C220 180 255 195 255 220C255 245 220 260 175 260C130 260 90 245 90 220ZM175 220L215 185" fill="#3b6e4d" />
      <!-- 星芒状尖瓣花 -->
      <g transform="translate(175 160)">
        <polygon points="0,-48 8,-12 36,-18 18,6 36,28 8,18 0,46 -8,18 -36,28 -18,6 -36,-18 -8,-12" :fill="color" />
        <polygon points="0,-32 5,-8 24,-12 12,4 24,18 5,12 0,30 -5,12 -24,18 -12,4 -24,-12 -5,-8" fill="#e9d5ff" />
        <circle r="7" fill="#facc15" />
      </g>
    </g>

    <!-- 2. 水仙：玉台金盏，六出素白平展花冠与金黄杯副冠 -->
    <g v-else-if="plantKey === 'shuixian'">
      <!-- 直立带状扁平翠绿叶 -->
      <g :fill="`url(#${gradientId})`" opacity="0.85">
        <path d="M145 250C140 180 135 120 130 65C135 120 148 180 152 250Z" />
        <path d="M165 250C168 170 178 110 195 55C185 110 175 170 168 250Z" />
        <path d="M130 250C115 190 105 140 100 95C112 140 125 190 135 250Z" opacity="0.7" />
        <path d="M178 250C195 190 215 140 230 90C215 140 198 190 185 250Z" opacity="0.7" />
      </g>
      <!-- 花莛挺立 -->
      <path d="M158 250L158 95" stroke="#528362" stroke-width="2.6" stroke-linecap="round" />
      <!-- 玉台金盏花朵 (上、左、右) -->
      <g v-for="(p, i) in [[158,95],[135,130],[185,120]]" :key="i" :transform="`translate(${p[0]} ${p[1]})`">
        <!-- 6片洁白花被裂片 -->
        <ellipse v-for="deg in [0, 60, 120, 180, 240, 300]" :key="deg" :transform="`rotate(${deg})`" cy="-11" rx="4.8" ry="9" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.9" />
        <!-- 金黄杯状副花冠 -->
        <circle r="6.5" fill="#facc15" />
        <circle r="3" fill="#ca8a04" />
      </g>
    </g>

    <!-- 7. 桃花：红褐秀枝，夭夭绯红五瓣与初生细长柳叶 -->
    <g v-else-if="plantKey === 'taohua'">
      <path d="M140 252C150 205 145 160 170 105M150 185C125 160 100 135 85 95M160 145C190 130 220 105 240 68" stroke="#684838" stroke-width="2.6" stroke-linecap="round" />
      <!-- 初生细长嫩叶 -->
      <g fill="#5a826a" opacity="0.85">
        <path d="M125 140C110 130 105 115 108 95C118 115 125 130 125 140Z" />
        <path d="M185 120C200 110 205 95 202 75C192 95 185 110 185 120Z" />
      </g>
      <!-- 娇艳五瓣桃花 -->
      <g :fill="color">
        <g v-for="(p, i) in [[170,105],[85,95],[240,68],[135,160],[195,130],[120,70]]" :key="i" :transform="`translate(${p[0]} ${p[1]})`">
          <circle v-for="deg in [0, 72, 144, 216, 288]" :key="deg" :transform="`rotate(${deg})`" cy="-8.5" r="5.5" />
          <circle r="3.2" fill="#be123c" />
          <circle r="1.4" fill="#fde047" />
        </g>
      </g>
    </g>

    <!-- 47. 天竹子：冬日红珊瑚，直立枝头顶生繁密耀眼红珠冬果 -->
    <g v-else-if="plantKey === 'tianzhuzi'">
      <path d="M150 252L160 160L165 90" stroke="#5c483a" stroke-width="2.8" stroke-linecap="round" />
      <path d="M160 160L125 110M160 135L195 115" stroke="#5c483a" stroke-width="2" stroke-linecap="round" />
      <!-- 红珊瑚冬果球群 -->
      <g :fill="color">
        <circle v-for="(p, i) in [[165,85],[150,95],[180,92],[135,108],[195,112],[160,115],[145,130],[175,132],[155,145],[170,150],[130,120],[190,125],[162,100]]" :key="i" :cx="p[0]" :cy="p[1]" r="6.8" />
      </g>
    </g>

    <!-- 19. 绣球花：无尽夏光，硕大圆球状数十朵四裂十字小花 -->
    <g v-else-if="plantKey === 'xiuqiuhua'">
      <path d="M160 252L160 160" stroke="#48684d" stroke-width="3.5" stroke-linecap="round" />
      <g fill="#4d7965" opacity="0.85">
        <ellipse cx="120" cy="205" rx="25" ry="14" transform="rotate(-25 120 205)" />
        <ellipse cx="200" cy="195" rx="25" ry="14" transform="rotate(25 200 195)" />
      </g>
      <g transform="translate(160 110)">
        <circle r="52" :fill="color" opacity="0.3" />
        <!-- 十字萼片小花群 -->
        <g v-for="(p, i) in [[0,0],[-20,-20],[20,-20],[-25,10],[25,10],[0,-35],[-35,-5],[35,-5],[0,30],[-18,25],[18,25]]" :key="i" :transform="`translate(${p[0]} ${p[1]})`">
          <rect x="-8" y="-3" width="16" height="6" rx="1.5" :fill="color" />
          <rect x="-3" y="-8" width="6" height="16" rx="1.5" :fill="color" />
          <circle r="1.8" fill="#f8fafc" />
        </g>
      </g>
    </g>

    <!-- 3. 迎春花：拱形纤柔绿枝，明黄六裂花冠飘逸 -->
    <g v-else-if="plantKey === 'yingchun'">
      <path d="M140 252C145 200 135 150 170 95C195 60 235 50 260 55" stroke="#4d7c58" stroke-width="2.5" stroke-linecap="round" fill="none" />
      <path d="M150 170C120 145 95 125 75 105" stroke="#4d7c58" stroke-width="2.2" stroke-linecap="round" fill="none" />
      <path d="M165 125C185 105 210 95 240 85" stroke="#4d7c58" stroke-width="2" stroke-linecap="round" fill="none" />
      <!-- 六瓣明黄花朵 -->
      <g :fill="color">
        <g v-for="(p, i) in [[240,55],[205,65],[170,95],[140,135],[105,115],[75,105],[215,90],[240,85],[125,150]]" :key="i" :transform="`translate(${p[0]} ${p[1]})`">
          <ellipse v-for="deg in [0, 60, 120, 180, 240, 300]" :key="deg" :transform="`rotate(${deg})`" cy="-6" rx="2.5" ry="5.5" />
          <circle r="2.2" fill="#b45309" />
        </g>
      </g>
    </g>

    <!-- 9. 樱花 · 海棠：长花梗柔柔悬垂，花瓣顶端特征缺刻凹口 -->
    <g v-else-if="plantKey === 'yinghua_haitang'">
      <path d="M140 252C150 205 155 160 175 110M155 185C125 160 95 140 85 95M165 150C200 135 230 110 245 70" stroke="#685547" stroke-width="2.6" stroke-linecap="round" />
      <!-- 下垂细长花梗与缺刻花 -->
      <g v-for="(p, i) in [[175,110],[85,95],[245,70],[130,140],[205,120]]" :key="i" :transform="`translate(${p[0]} ${p[1]})`">
        <path d="M0 0C5 12 0 22 -5 32" stroke="#685547" stroke-width="1.4" fill="none" />
        <g transform="translate(-5 32)">
          <path v-for="deg in [0, 72, 144, 216, 288]" :key="deg" :transform="`rotate(${deg})`" d="M-5 -6C-7 -11 -3 -14 0 -12C3 -14 7 -11 5 -6Z" :fill="color" />
          <circle r="2.8" fill="#facc15" />
        </g>
      </g>
    </g>

    <!-- 28. 银杏：满树璀璨，扇形二裂金黄叶片与细密放射叶脉 -->
    <g v-else-if="plantKey === 'yinxing'">
      <path d="M155 250C158 200 162 150 178 95M160 170C140 145 125 125 105 105M168 135C185 120 205 110 220 95" stroke="#688772" stroke-width="2.4" stroke-linecap="round" />
      <g :fill="color">
        <!-- 顶扇叶 -->
        <path d="M178 95 C140 70, 145 35, 178 40 C195 43, 205 40, 215 48 C225 58, 220 78, 178 95 Z" opacity=".92" />
        <!-- 左扇叶 -->
        <path d="M105 105 C75 85, 78 55, 108 60 C122 62, 132 60, 140 70 C146 80, 138 98, 105 105 Z" opacity=".88" />
        <!-- 右扇叶 -->
        <path d="M220 95 C250 80, 252 50, 225 52 C212 53, 202 50, 192 60 C185 70, 192 88, 220 95 Z" opacity=".88" />
        <!-- 小侧叶 -->
        <path d="M165 145 C145 130, 148 110, 168 115 C178 117, 185 115, 190 122 C194 130, 188 140, 165 145 Z" opacity=".82" />
      </g>
      <!-- 叶脉细线 -->
      <path d="M178 95L178 48M178 95L165 52M178 95L192 50M178 95L205 58M105 105L108 68M105 105L95 72M105 105L122 72M220 95L225 60M220 95L210 65M220 95L238 65" stroke="#ffffff" stroke-width="1.2" opacity=".45" stroke-linecap="round" />
    </g>

    <!-- 10. 郁金香：灰绿抱茎大叶，直立挺拔典雅花盏 -->
    <g v-else-if="plantKey === 'yujinxiang'">
      <path d="M160 250L160 120" stroke="#58856a" stroke-width="3.5" stroke-linecap="round" />
      <!-- 环抱灰绿大叶 -->
      <g :fill="`url(#${gradientId})`">
        <path d="M160 240C125 195 110 145 120 90C132 145 146 190 160 220Z" opacity=".9" />
        <path d="M160 230C195 185 210 135 200 80C190 135 174 180 160 210Z" opacity=".85" />
      </g>
      <!-- 杯状花冠 -->
      <g transform="translate(160 100)" :fill="color">
        <path d="M0 -35C-22 -15 -22 20 0 28C22 20 22 -15 0 -35Z" opacity=".95" />
        <path d="M-18 -25C-32 -5 -28 20 -8 26C-18 10 -24 -8 -18 -25Z" opacity=".85" />
        <path d="M18 -25C32 -5 28 20 8 26C18 10 24 -8 18 -25Z" opacity=".85" />
      </g>
    </g>

    <!-- 6. 玉兰：木质苍劲枝条，托生挺拔傲立的白玉酒盏花冠 -->
    <g v-else-if="plantKey === 'yulan'">
      <path d="M150 252C155 200 150 160 165 110M155 175C135 145 120 125 105 100M160 140C180 120 205 105 225 80" stroke="#635243" stroke-width="2.8" stroke-linecap="round" />
      <!-- 茸毛花苞鳞托片 -->
      <ellipse cx="165" cy="110" rx="6" ry="4" fill="#586c50" />
      <ellipse cx="105" cy="100" rx="5" ry="3.5" fill="#586c50" />
      <ellipse cx="225" cy="80" rx="5" ry="3.5" fill="#586c50" />
      <!-- 直立玉盏花朵 -->
      <g transform="translate(165 110)">
        <path d="M0 -55C-18 -40 -20 -15 -10 0C-4 0 4 0 10 0C20 -15 18 -40 0 -55Z" fill="#fdfbf7" stroke="#cbd5e1" stroke-width="1.2" />
        <path d="M0 -50C-8 -35 -10 -15 -4 0C-1 0 1 0 4 0C10 -15 8 -35 0 -50Z" :fill="color" opacity="0.35" />
      </g>
      <g transform="translate(105 100) rotate(-18)">
        <path d="M0 -42C-14 -30 -16 -12 -8 0C-3 0 3 0 8 0C16 -12 14 -30 0 -42Z" fill="#fdfbf7" stroke="#cbd5e1" stroke-width="1.2" />
        <path d="M0 -38C-6 -26 -7 -12 -3 0C-1 0 1 0 3 0C7 -12 6 -26 0 -38Z" :fill="color" opacity="0.35" />
      </g>
      <g transform="translate(225 80) rotate(15)">
        <path d="M0 -40C-13 -28 -15 -12 -7 0C-3 0 3 0 7 0C15 -12 13 -28 0 -40Z" fill="#fdfbf7" stroke="#cbd5e1" stroke-width="1.2" />
        <path d="M0 -36C-6 -24 -7 -12 -3 0C-1 0 1 0 3 0C7 -12 6 -24 0 -36Z" :fill="color" opacity="0.35" />
      </g>
    </g>

    <!-- 18. 栀子花：革质油亮深绿对生叶，玉白厚质旋涡重瓣 -->
    <g v-else-if="plantKey === 'zhizihua'">
      <path d="M155 252L160 155" stroke="#2b4c30" stroke-width="3" />
      <!-- 深绿革质发亮羽状叶 -->
      <g fill="#1f3d23">
        <path d="M160 210C120 185 100 145 95 105C125 125 150 165 160 200Z" />
        <path d="M160 190C200 165 220 125 225 85C195 105 170 145 160 180Z" />
      </g>
      <!-- 旋涡状重瓣白花 -->
      <g transform="translate(160 115)">
        <circle r="38" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2" />
        <circle r="26" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="0.9" />
        <circle r="14" fill="#e2e8f0" />
        <circle r="4" fill="#fef08a" />
      </g>
    </g>

    <!-- 13. 紫藤：曲木悬帘，垂瀑般层层叠落的蝶形淡紫花序 -->
    <g v-else-if="plantKey === 'ziteng'">
      <path d="M110 45C160 40 210 50 250 45" stroke="#5a4235" stroke-width="3.5" stroke-linecap="round" fill="none" />
      <g fill="#5a826a" opacity="0.8">
        <ellipse cx="140" cy="40" rx="8" ry="4" transform="rotate(-15 140 40)" />
        <ellipse cx="220" cy="42" rx="8" ry="4" transform="rotate(15 220 42)" />
      </g>
      <!-- 下垂紫藤串 -->
      <g transform="translate(180 50)">
        <path d="M0 0V150" stroke="#5a4235" stroke-width="1.8" />
        <g :fill="color">
          <circle v-for="(p, i) in [[-12,20],[12,25],[-14,45],[14,50],[-12,70],[12,75],[-10,95],[10,100],[-8,120],[8,125],[0,140],[0,155]]" :key="i" :cx="p[0]" :cy="p[1]" :r="16 - i * 0.9" opacity="0.85" />
        </g>
      </g>
    </g>

    <!-- 23. 紫薇：百日红艳，绉纱波浪卷边花冠 -->
    <g v-else-if="plantKey === 'ziwei'">
      <path d="M145 252C152 205 155 160 170 115" stroke="#685547" stroke-width="2.6" />
      <g transform="translate(170 100)">
        <circle v-for="(p, i) in [[-16,-12],[14,-14],[-18,12],[16,10],[0,-24],[0,20]]" :key="i" :cx="p[0]" :cy="p[1]" r="15" :fill="color" opacity="0.85" />
        <circle r="6" fill="#facc15" />
      </g>
    </g>

    <!-- 兜底通用花木 -->
    <g v-else>
      <path d="M150 253C158 212 158 166 186 105" stroke="#668571" stroke-width="2.5" stroke-linecap="round" />
      <g :fill="color">
        <circle cx="186" cy="105" r="16" />
        <circle cx="186" cy="105" r="6" fill="#fef08a" />
      </g>
    </g>
  </svg>
</template>
