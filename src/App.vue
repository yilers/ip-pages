<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { fields, isIPv4, loadBrowserDb } from './services/ip-query';
const input = ref(''), current = ref<string | null>(null), currentStatus = ref('正在获取…'), error = ref(''), result = ref<{ip:string; region:string} | null>(null), busy = ref(false), copied = ref('');
const dark = ref(false);
const details = computed(() => fields(result.value?.region || ''));
async function query(ip: string) {
  error.value = ''; if (!isIPv4(ip)) { error.value = '请输入有效的 IPv4 地址，例如 114.114.114.114'; return; }
  busy.value = true;
  try { const db = await loadBrowserDb(); result.value = { ip, region: db.search(ip) }; }
  catch { error.value = '数据库暂时不可用，请稍后再试。'; }
  finally { busy.value = false; }
}
async function copy(text: string, label: string) { try { await navigator.clipboard.writeText(text); copied.value = label + '已复制'; setTimeout(() => copied.value = '', 2000); } catch { copied.value = '复制失败，请手动选择文本'; } }
function toggleTheme() { dark.value = !dark.value; document.documentElement.dataset.theme = dark.value ? 'dark' : 'light'; localStorage.setItem('theme', dark.value ? 'dark' : 'light'); }
onMounted(async () => {
  dark.value = (localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
  document.documentElement.dataset.theme = dark.value ? 'dark' : 'light';
  try { const response = await fetch('/api/me'); if (!response.ok) throw new Error(); const body = await response.json() as { data?: { ip?: string | null } }; current.value = body.data?.ip || null; currentStatus.value = current.value ? '已获取当前 IPv4' : '当前连接未提供公网 IPv4'; if (current.value) await query(current.value); }
  catch { currentStatus.value = '无法获取当前 IP，请手动查询'; }
});
</script>
<template>
  <div class="page"><header><a class="brand" href="/" aria-label="IP 查询首页"><span class="mark">◎</span> IP<span> / </span>LOOKUP</a><button class="theme" @click="toggleTheme" :aria-label="dark ? '切换到浅色主题' : '切换到深色主题'">{{ dark ? '☀' : '☾' }}</button></header>
    <main><div class="eyebrow"><span></span> IP2REGION · IPV4</div><h1>找到 IP 地址的<br><em>归属地。</em></h1><p class="intro">简单、快速地查询 IPv4 地址信息。<br>数据来自开源 ip2region 离线数据库。</p>
      <section class="card"><div class="card-head"><div><span class="label">你的网络</span><h2>{{ current || '暂无 IPv4 地址' }}</h2><p class="hint"><span class="dot"></span>{{ currentStatus }}</p></div><button v-if="current" class="icon-btn" @click="copy(current, 'IP')">复制 IP ↗</button></div>
        <div class="divider"></div><form @submit.prevent="query(input.trim())"><label for="ip">查询其他 IPv4 地址</label><div class="search"><span class="search-icon">⌕</span><input id="ip" v-model="input" placeholder="例如 114.114.114.114" autocomplete="off" spellcheck="false"><button :disabled="busy">{{ busy ? '查询中…' : '查询地址' }} <span>→</span></button></div><p v-if="error" class="error" role="alert">{{ error }}</p></form>
      </section>
      <section v-if="result" class="results"><div class="result-heading"><div><span class="label">查询结果</span><h2>{{ result.ip }}</h2></div><button class="icon-btn" @click="copy(result.ip + '  ' + result.region, '结果')">复制结果 ↗</button></div><div class="grid"><div><span>国家 / 地区</span><strong>{{ details.country }}</strong></div><div><span>省份</span><strong>{{ details.province }}</strong></div><div><span>城市</span><strong>{{ details.city }}</strong></div><div><span>运营商</span><strong>{{ details.isp }}</strong></div></div><div class="raw"><span>原始数据</span><code>{{ result.region || '未找到匹配记录' }}</code></div></section><p v-if="copied" class="toast" role="status">{{ copied }}</p>
    </main><footer><span>IP LOOKUP <b>·</b> 简单了解你的网络</span><a href="https://github.com/lionsoul2014/ip2region" target="_blank" rel="noreferrer">数据来源 ip2region ↗</a></footer></div>
</template>
