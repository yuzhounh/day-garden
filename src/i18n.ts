// Lightweight bilingual (Simplified Chinese / English) runtime for Day Garden.
// Vue is component-based, so instead of editing every .vue file this installs a
// DOM overlay: it translates matching Chinese text nodes and attributes at
// runtime (and via MutationObserver for dynamic content), and restores the
// original Chinese when switching back. Default Simplified Chinese; choice is
// stored in localStorage and switched from the Settings modal.

const STORAGE_KEY = 'day_garden_lang';

const DICT: Record<string, string> = {
  '语言 / Language': 'Language',
  '界面语言': 'Language',
  '切换为英文': 'Switch to English',
  '切换为中文': 'Switch to Chinese',
  '切换为英文 / Switch to English': 'Switch to English',
  '切换为中文 / Switch to Chinese': 'Switch to Chinese',
  'Switch to English': 'Switch to English',
  '听见花园 · 放松轻音': 'Garden sounds · Relaxing tones',
  '自然白噪音': 'White noise',
  '舒缓轻电台': 'Relaxing music',
  '随机切换': 'Shuffle',
  '上一曲': 'Previous track',
  '下一曲': 'Next track',
  '播放': 'Play',
  '暂停': 'Pause',
  '调节音量': 'Adjust volume',
  '收起音量': 'Hide volume',
  '静音': 'Mute',
  '取消静音': 'Unmute',
  '定时关闭': 'Sleep timer',
  '后静止': 'remaining',
  '分': 'm',
  '关': 'Off',
  '开启排序模式': 'Enter reorder mode',
  '退出排序模式': 'Exit reorder mode',
  '卡片排序模式': 'Card order mode',
  '排序中': 'Reordering',
  '点击开启': 'Tap to reorder',
  '选择或搜索城市': 'Select or search city',
  '搜索任意城市（如：苏州、三亚、青岛…）': 'Search any city (e.g., Suzhou, Sanya...)',
  '搜索城市': 'Search city',
  '清空输入': 'Clear input',
  '正在寻找城市定位…': 'Locating city...',
  '搜索结果': 'Search results',
  '未找到匹配城市。可尝试输入汉字、地名或拼音。': 'No matching city found.',
  '最近使用': 'Recent',
  '常用热门城市': 'Popular cities',
  '选择城市定位': 'Select city location',
  '展开导航菜单': 'Open menu',
  '关闭导航菜单': 'Close menu',
  '我的花园 · 账户与云端同步': 'My garden · Account & sync',
  '云端已同步': 'Synced to cloud',
  '同步中': 'Syncing',
  '本机已保存': 'Saved locally',
  '布置我的花园 · 设置与个性化': 'Set up my garden · Settings',
  '布置我的花园 · 设置': 'Set up my garden · Settings',
  '布置我的花园': 'Set up my garden',
  '设置': 'Settings',
  '账户与同步': 'Account & sync',
  '已登录': 'Signed in',
  '本地使用': 'Local only',
  // Settings modal
  '布置你的今日花园': 'Set up your garden today',
  '模块开关': 'Modules',
  '提醒与数据备份': 'Reminders & backup',
  '修改实时自动保存': 'Changes save automatically',
  '极简原则：建议首页启用不超过 6 个模块，确保每天 30 秒内扫视完毕，绝不变成让人刷屏的信息流。':
    'Keep it minimal: enable no more than 6 modules on the home page so you can scan it within 30 seconds — never a doom-scroll feed.',
  '7天天气时间轴': '7-day weather timeline',
  '月历与休班节气': 'Calendar & holidays',
  '片刻随想 · 所思所想便签': 'Quick notes · fleeting thoughts',
  '岁月里程 · 重要日子与日程': 'Milestones · key dates & schedule',
  '听见花园 · 放松轻音与白噪音': 'Garden sounds · relaxing tones & white noise',
  '华夏胜景 · 中国旅游景点': 'China sights · travel attractions',
  '四时花信 · 物候与花期': 'Seasonal blooms · phenology & bloom times',
  '生活有方 · 循证生活锦囊': 'Living well · evidence-based tips',
  '动健身心 · 运动项目指南': 'Fitness · activity guides',
  '今日诗笺 · 今日一页诗词': 'Daily poem · a poem a day',
  '名言语录 · 积极励志语录': 'Quotes · uplifting sayings',
  '底部健康微提醒': 'Bottom health tip',
  '卡片排版顺序': 'Card layout order',
  '恢复默认排序': 'Restore default order',
  '桌面与 PWA 系统级提醒': 'Desktop & PWA system reminders',
  '当命中 14天前/3天前/当天 阈值时触发系统弹窗通知。': 'Triggers a system notification at 14 days / 3 days / on the day.',
  '授权并测试推送': 'Authorize & test push',
  '测试通知已发送': 'Test notification sent',
  '权限已被禁止，请在地址栏开启': 'Permission blocked; enable it in the address bar',
  '数据备份与迁移': 'Backup & migration',
  '将所有自定义生日、偏好导出为 JSON 文件，随时导入到手机或其他电脑。':
    'Export all custom birthdays and preferences to a JSON file, and import anytime on your phone or another computer.',
  '导出备份': 'Export backup',
  '导入备份': 'Import backup',
  '备份文件过大，请选择不超过 1 MB 的配置文件。': 'Backup file too large; choose a config file up to 1 MB.',
  '配置与生活记事导入成功！': 'Configuration and life notes imported successfully!',
  '导入失败：': 'Import failed: ',
  '文件格式有误。': 'Invalid file format.',
  '备份文件读取失败。': 'Failed to read the backup file.',
  'Day Garden 生日提前预警': 'Day Garden birthday reminder',
  '🎂 妈妈生日还有 12 天 · 建议提前准备礼物': '🎂 Mom birthday in 12 days · consider preparing a gift',
  // App shell
  '月历': 'Calendar',
  '片刻随想': 'Quick notes',
  '岁月里程': 'Milestones',
  '听见花园': 'Garden sounds',
  '华夏胜景': 'China sights',
  '四时花信': 'Seasonal blooms',
  '生活有方': 'Living well',
  '动健身心': 'Fitness',
  '今日诗笺': 'Daily poem',
  '名言语录': 'Quotes',
  '排序模式已开启：拖拽卡片，或使用上移、下移按钮调整位置': 'Sort mode on: drag cards, or use the Move up / Move down buttons',
  '恢复默认排序 ': 'Restore default order ',
  '完成排序': 'Done sorting',
  '上移': 'Move up',
  '下移': 'Move down',
  '核心生活卡片': 'Core life cards',
  '好好照顾自己': 'Take good care of yourself',
  '花园留白，随你安排。': 'Your garden is blank — arrange it your way.',
  '选择想看的内容': 'Choose what to see',
  'Day Garden · 今日花园': 'Day Garden · Today',
  '心有闲田，日有花开。': 'A quiet field in the heart, a flower each day.',
  // HeaderHero / Weather / Account / Audio
  '查看更晚的天气': 'View later weather',
  '查看更早的天气': 'View earlier weather',
  '城市、收藏、打卡和重要日子已同步到云端。': 'Cities, favorites, check-ins and important dates synced to the cloud.',
  '城市定位': 'City location',
  '城市选择、诗词收藏、每日打卡和重要日子会在你的设备间同步。': 'City choice, poem favorites, daily check-ins and important dates sync across your devices.',
  '出门记得带伞，给雨天留一点从容。': 'Take an umbrella — leave a little ease for rainy days.',
  '出门前看一眼天气，从容安排今天。': 'Check the weather before heading out and plan your day with ease.',
  '创建账户': 'Create account',
  '创建账户并登录': 'Create account and sign in',
  '当前为示例数据，不能作为出行依据。': 'This is sample data and not for travel decisions.',
  '导航与功能菜单': 'Navigation & menu',
  '登录并同步': 'Sign in & sync',
  '登录方式': 'Sign-in method',
  '登录我的花园': 'Sign in to my garden',
  '返回登录': 'Back to sign in',
  '访问 Open-Meteo 官方网站': 'Visit the official Open-Meteo site',
  '感受四时流转，照顾日常，也收藏一点诗意。': 'Feel the seasons turn, care for the everyday, and keep a little poetry.',
  '关闭': 'Close',
  '关闭菜单': 'Close menu',
  '还没有账户？': 'No account yet?',
  '合并旧本机日程': 'Merge old local schedule',
  '后天': 'Day after tomorrow',
  '缓存天气': 'Cached weather',
  '降水概率': 'Chance of rain',
  '今 日 花 园': 'TODAY GARDEN',
  '今日花园': 'Today garden',
  '今日日期与节气时序': 'Today date & solar terms',
  '今天': 'Today',
  '历史天气供回顾参考。': 'Historical weather is for reference.',
  '两次输入的密码不一致，请重新确认。': 'The passwords do not match; please re-enter.',
  '密码': 'Password',
  '明天': 'Tomorrow',
  '内容已保存在本机，等待云端同步。': 'Saved on this device, waiting to sync to the cloud.',
  '农历': 'Lunar',
  '气温流转趋势': 'Temperature trend',
  '前两天': 'Two days ago',
  '前天': 'Day before yesterday',
  '切换浅色模式': 'Switch to light mode',
  '切换深色模式': 'Switch to dark mode',
  '轻音白噪音': 'Soft white noise',
  '清空搜索': 'Clear search',
  '确认密码': 'Confirm password',
  '热门城市': 'Popular cities',
  '设置登录密码': 'Set a login password',
  '使用 Google 账户登录': 'Sign in with Google',
  '示例天气': 'Sample weather',
  '输入登录密码': 'Enter login password',
  '数据来源于 Open-Meteo 气象预报服务（点击访问官方网站）': 'Data from the Open-Meteo weather forecast service (click to visit the official site)',
  '搜索城市（如：杭州、拉萨、tokyo）': 'Search city (e.g. Hangzhou, Lhasa, tokyo)',
  '体感温度': 'Feels like',
  '天气 · 刚刚好': 'Weather · just right',
  '天气趋势': 'Weather trend',
  '天气暂不可用': 'Weather unavailable',
  '同步一下': 'Sync now',
  '退出账户': 'Sign out',
  '外观主题': 'Theme',
  '晚上好，把日子过成诗。': 'Good evening — turn the day into poetry.',
  '未来 2 天': 'Next 2 days',
  '未找到匹配的城市': 'No matching city',
  '我的花园账户': 'My Garden account',
  '无需单独注册，首次登录会自动创建账户。': 'No separate sign-up — your account is created automatically on first sign-in.',
  '无需登录即可浏览和使用花园。登录后可收藏诗词，城市、收藏、打卡和重要日子会在你的设备间同步。': 'Browse and use the garden without signing in. After signing in you can favorite poems, and cities, favorites, check-ins and important dates sync across your devices.',
  '无雨': 'No rain',
  '午安，留一点时间给自己。': 'Good afternoon — leave a little time for yourself.',
  '下午好，日子正在发光。': 'Good afternoon — the day is glowing.',
  '夜深了，给自己一点安静。': 'Late at night — give yourself some quiet.',
  '已同步': 'Synced',
  '已有账户？': 'Already have an account?',
  '音量调节': 'Volume',
  '用户头像': 'User avatar',
  '邮箱': 'Email',
  '邮箱或用户名': 'Email or username',
  '邮箱与密码': 'Email & password',
  '预报供出行参考，实际天气可能变化；两小时降水为模式预报，并非雷达实测。出行建议由天气数据按规则推算。': 'Forecast for reference only; actual weather may change. The 2-hour precipitation is model-based, not radar. Travel advice is derived from weather data by rule.',
  '再次输入密码': 'Re-enter password',
  '暂不提供密码找回，请妥善保存密码。': 'Password recovery is not available; please keep your password safe.',
  '早安，让美好慢慢发生。': 'Good morning — let good things unfold slowly.',
  '早晚温差较大，带一件薄外套。': 'Big day-night temperature gap — bring a light jacket.',
  '正在播放': 'Now playing',
  '正在播放：': 'Now playing: ',
  '正在感受城市的天气…': 'Feeling the city weather…',
  '正在更新天气': 'Updating weather',
  '正在加载': 'Loading',
  '正在检索城市...': 'Searching cities...',
  '正在连接…': 'Connecting…',
  '正在同步你的花园…': 'Syncing your garden…',
  '紫外线指数': 'UV index',
  '最高体感温度': 'Max feels-like',
  '最近访问': 'Recently visited',
  '昨天': 'Yesterday',
  '左右滚动查看全部日期的天气': 'Scroll left/right to see all dates',
  'Day Garden 首页': 'Day Garden home',
  'Google 绑定': 'Google linked',
  'Google 登录': 'Google sign-in',
  'Google 登录暂不可用，请选择邮箱与密码。': 'Google sign-in unavailable; please use email and password.',
};

const origText = new WeakMap<Text, string>();
const origAttr = new WeakMap<Element, Map<string, string>>();

export function getLang(): 'zh' | 'en' {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'zh';
  } catch {
    return 'zh';
  }
}

function pad(original: string, replacement: string) {
  const lead = (original.match(/^\s*/) || [''])[0];
  const trail = (original.match(/\s*$/) || [''])[0];
  return lead + replacement + trail;
}

function processText(node: Text, en: boolean) {
  const parent = node.parentNode;
  if (parent) {
    const tag = parent.nodeName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return;
  }
  if (origText.has(node)) {
    const original = origText.get(node) as string;
    if (en) {
      const key = original.trim();
      if (Object.prototype.hasOwnProperty.call(DICT, key)) node.nodeValue = pad(original, DICT[key]);
    } else {
      node.nodeValue = original;
      origText.delete(node);
    }
    return;
  }
  if (!en) return;
  const current = node.nodeValue;
  const key = current ? current.trim() : '';
  if (!key || !Object.prototype.hasOwnProperty.call(DICT, key)) return;
  origText.set(node, current as string);
  node.nodeValue = pad(current as string, DICT[key]);
}

function processAttr(el: Element, en: boolean) {
  ['placeholder', 'title', 'aria-label', 'alt'].forEach((attr) => {
    if (!el.hasAttribute(attr)) return;
    let map = origAttr.get(el);
    if (!map) {
      map = new Map();
      origAttr.set(el, map);
    }
    if (!map.has(attr)) map.set(attr, el.getAttribute(attr) || '');
    const original = map.get(attr) || '';
    const key = original.trim();
    if (en && Object.prototype.hasOwnProperty.call(DICT, key)) el.setAttribute(attr, DICT[key]);
    else el.setAttribute(attr, original);
  });
}

function walk(root: Node | null, en: boolean) {
  if (!root) return;
  if (root.nodeType === 3) {
    processText(root as Text, en);
    return;
  }
  if (root.nodeType !== 1 && root.nodeType !== 11) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) processText(n as Text, en);
  if (root.nodeType === 1) processAttr(root as Element, en);
  const els = (root as Element).querySelectorAll?.('[placeholder],[title],[aria-label],[alt]');
  if (els) els.forEach((el) => processAttr(el, en));
}

function applyAll() {
  if (typeof document === 'undefined' || !document.body) return;
  walk(document.body, getLang() === 'en');
}

export function setLang(lang: 'zh' | 'en') {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined') document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  applyAll();
  window.dispatchEvent(new CustomEvent('daygarden:lang-changed', { detail: lang }));
}

let started = false;
function start() {
  if (started || typeof document === 'undefined' || !document.body) return;
  started = true;
  applyAll();
  document.documentElement.lang = getLang() === 'en' ? 'en' : 'zh-CN';
  const observer = new MutationObserver((mutations) => {
    const en = getLang() === 'en';
    for (const mutation of mutations) {
      if (mutation.type === 'childList') mutation.addedNodes.forEach((node) => walk(node as Node, en));
      else if (mutation.type === 'characterData') processText(mutation.target as Text, en);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();

(window as unknown as { DayGardenI18N: unknown }).DayGardenI18N = { getLang, setLang };
