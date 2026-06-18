<script setup>
// Renders a single CV "block" (one atomic unit for pagination). Used both in the
// hidden measurer and in the visible page sheets, so heights stay consistent.
defineProps({
  block: { type: Object, required: true },
  p: { type: Object, default: () => ({}) }
});

function normalizeUrl(u) {
  const s = String(u || '').trim();
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}
function openExternal(url) {
  if (url && window.cvAPI?.openExternal) window.cvAPI.openExternal(url);
}
</script>

<template>
  <header v-if="block.kind === 'header'" class="cv-header">
    <div class="cv-header-left">
      <h1 class="cv-name">{{ block.name }}<span v-if="block.nameEn" class="cv-name-en"> · {{ block.nameEn }}</span></h1>
      <p class="cv-tagline" v-if="block.tagline">{{ block.tagline }}</p>
    </div>
    <div class="cv-header-right">
      <p v-if="block.citizenship">{{ block.citizenship }}</p>
      <p v-if="block.phone">☏ {{ block.phone }}</p>
      <p v-if="block.email">✉ <a class="cv-link" :href="`mailto:${block.email}`" @click.prevent="openExternal(`mailto:${block.email}`)">{{ block.email }}</a></p>
      <p v-if="block.address">{{ block.address }}</p>
    </div>
    <img v-if="block.photo" :src="block.photo" class="cv-photo" alt="" />
  </header>

  <h2 v-else-if="block.kind === 'h2'" class="cv-h2">{{ block.text }}</h2>

  <dl v-else-if="block.kind === 'infolist'" class="info-list">
    <template v-for="(row, idx) in block.rows" :key="idx">
      <dt>{{ row.dt }}</dt>
      <dd v-if="row.link"><a class="cv-link" :href="normalizeUrl(row.href)" @click.prevent="openExternal(normalizeUrl(row.href))">{{ row.dd }}</a></dd>
      <dd v-else>{{ row.dd }}</dd>
    </template>
  </dl>

  <p v-else-if="block.kind === 'para'" class="cv-para">{{ block.text }}</p>

  <div v-else-if="block.kind === 'rf'" class="cv-rf">
    <p v-if="block.title" class="cv-section-intro"><em>{{ block.title }}</em></p>
    <ul class="cv-bullets-inline"><li v-for="(it, i) in block.items" :key="i">{{ it }}</li></ul>
  </div>

  <ul v-else-if="block.kind === 'bullets'" class="cv-bullets-inline">
    <li v-for="(it, i) in block.items" :key="i">{{ it }}</li>
  </ul>

  <div v-else-if="block.kind === 'entry'" class="entry-row">
    <div class="entry-date">{{ block.date }}</div>
    <div class="entry-body">
      <strong>{{ block.title }}</strong><span class="entry-sub" v-if="block.sub"> · {{ block.sub }}</span><span class="entry-sub muted" v-if="block.sub2"> · {{ block.sub2 }}</span>
      <p v-for="(ln, i) in (block.lines || [])" :key="i"><span v-if="ln.label" class="meta-label">{{ ln.label }}:</span> {{ ln.text }}</p>
      <ul v-if="block.bullets && block.bullets.length" class="cv-bullets-inline"><li v-for="(b, i) in block.bullets" :key="i">{{ b }}</li></ul>
    </div>
  </div>

  <div v-else-if="block.kind === 'pub'" class="pub-item">
    <span class="pub-num">{{ block.n }}.</span>
    <span class="pub-text"><template v-if="block.authors">{{ block.authors }}, </template>&ldquo;{{ block.title }},&rdquo; <em>{{ block.venue }}</em><span v-if="block.date">, {{ block.date }}</span>.</span>
  </div>

  <div v-else-if="block.kind === 'patent'" class="pub-item">
    <span class="pub-num">{{ block.n }}.</span>
    <span class="pub-text"><template v-if="block.authors">{{ block.authors }}, </template>&ldquo;{{ block.title }},&rdquo;<template v-if="block.number"> {{ block.number }}</template><span v-if="block.year">, {{ block.year }}</span><span v-if="block.status"> ({{ block.status }})</span>.</span>
  </div>

  <div v-else-if="block.kind === 'thead'" class="cv-thead" :class="{ 'has-date': block.hasDate }">
    <span class="t-num">번호</span>
    <span class="t-content">내용</span>
    <span v-if="block.hasDate" class="t-date">{{ block.dateHeader }}</span>
  </div>

  <div v-else-if="block.kind === 'trow'" class="cv-trow" :class="{ 'has-date': block.hasDate }">
    <span class="t-num">{{ block.n }}</span>
    <div class="t-content">
      <span v-if="block.title"><strong>{{ block.title }}</strong><span class="entry-sub" v-if="block.sub"> · {{ block.sub }}</span><span class="entry-sub muted" v-if="block.sub2"> · {{ block.sub2 }}</span></span>
      <p v-for="(ln, i) in (block.lines || [])" :key="i" class="t-line"><span v-if="ln.label" class="meta-label">{{ ln.label }}:</span> {{ ln.text }}</p>
      <ul v-if="block.bullets && block.bullets.length" class="cv-bullets-inline"><li v-for="(b, i) in block.bullets" :key="i">{{ b }}</li></ul>
    </div>
    <span v-if="block.hasDate" class="t-date">{{ block.date }}</span>
  </div>
</template>
