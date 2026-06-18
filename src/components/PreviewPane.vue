<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useCv } from '../composables/useCv.js';
import { previewLabels } from '../i18n/preview.js';
import CvBlock from './CvBlock.vue';

const { state, lang, active, isSectionVisible, order, isTableOn, styleVars } = useCv();
const cv = computed(() => active.value || {});
const P = computed(() => previewLabels[lang.value] || previewLabels.en);
const vis = (k) => isSectionVisible(k);

function rng(s, e) {
  if (!s && !e) return '';
  if (s && !e) return `${s} – ${P.value.present}`;
  if (!s && e) return String(e);
  return `${s} – ${e}`;
}

// Plain-text citation for the table "내용" cell.
function pubText(x) {
  return `${x.authors ? x.authors + ', ' : ''}“${x.title},” ${x.venue || ''}`.trim();
}
function patentText(x) {
  return `${x.authors ? x.authors + ', ' : ''}“${x.title},”${x.number ? ' ' + x.number : ''}${x.status ? ' (' + x.status + ')' : ''}`.trim();
}

// ----- Build the ordered list of atomic blocks from the active CV -----
const flow = computed(() => {
  const c = cv.value;
  const p = P.value;
  const out = [];
  let id = 0;
  const B = (o) => out.push({ id: id++, ...o });
  const bi = c.basicInfo || {};

  // Korean version: name (native) with its English form alongside.
  // English version: the English name (nameEn) only, shown once.
  const isKo = lang.value === 'ko';
  B({
    kind: 'header',
    name: isKo ? bi.name : (bi.nameEn || bi.name),
    nameEn: isKo ? bi.nameEn : '',
    tagline: bi.tagline,
    photo: bi.photo,
    citizenship: bi.citizenship,
    phone: bi.phone,
    email: bi.email,
    address: bi.address
  });

  if (vis('basicInfo')) {
    const rows = [];
    if (bi.affiliation || bi.title) rows.push({ dt: p.affiliationTitle, dd: [bi.affiliation, bi.title].filter(Boolean).join(' / ') });
    if (bi.dateOfBirth) rows.push({ dt: p.dob, dd: bi.dateOfBirth });
    if (bi.citizenship) rows.push({ dt: p.citizenship, dd: bi.citizenship });
    const cert = (c.certifications || []).join(', ');
    if (cert && vis('certifications')) rows.push({ dt: p.certifications, dd: cert });
    const langs = (c.skills?.languages || []).map((l) => `${l.name} (${l.level})`).join(', ');
    if (langs && vis('skills.languages')) rows.push({ dt: p.languages, dd: langs });
    const mem = (c.memberships || []).join(', ');
    if (mem && vis('memberships')) rows.push({ dt: p.memberships, dd: mem });
    if (bi.orcid) rows.push({ dt: 'ORCID', dd: bi.orcid, link: true, href: `https://orcid.org/${bi.orcid}` });
    if (bi.website) rows.push({ dt: p.website, dd: bi.website, link: true, href: bi.website });
    if (bi.linkedin) rows.push({ dt: 'LinkedIn', dd: bi.linkedin, link: true, href: bi.linkedin });
    if (bi.github) rows.push({ dt: 'GitHub', dd: bi.github, link: true, href: bi.github });
    if (rows.length) {
      B({ kind: 'h2', text: p.personalInfo });
      B({ kind: 'infolist', rows });
    }
  }

  // Big sections render in the user-controlled order. In Korean, sections flagged
  // for table style become numbered rows (번호·내용·날짜); a column with no data is dropped.
  const asTable = (key) => lang.value === 'ko' && isTableOn(key);
  const emitRows = (rows, dateHeader) => {
    const hasDate = rows.some((r) => r.date != null && String(r.date).trim() !== '');
    B({ kind: 'thead', hasDate, dateHeader });
    for (const r of rows) {
      B({ kind: 'trow', hasDate, n: r.n, title: r.title, sub: r.sub, sub2: r.sub2, lines: r.lines || [], bullets: r.bullets || [], date: r.date });
    }
  };

  const builders = {
    summary: () => {
      if (c.summary && vis('summary')) {
        B({ kind: 'h2', text: p.summary });
        B({ kind: 'para', text: c.summary });
      }
    },
    researchField: () => {
      if (c.researchField?.items?.length && vis('researchField')) {
        B({ kind: 'h2', text: p.researchField });
        B({ kind: 'rf', title: c.researchField.title, items: c.researchField.items });
      }
    },
    education: () => {
      if (!(c.education?.length && vis('education'))) return;
      B({ kind: 'h2', text: p.education });
      const mk = (ed, i) => {
        const lines = [];
        if (ed.dissertation) lines.push({ label: p.dissertation, text: ed.dissertation });
        if (ed.supervisor) lines.push({ label: p.supervisor, text: ed.supervisor });
        if (ed.researchInterests?.length) lines.push({ label: p.researchInterests, text: ed.researchInterests.join(', ') });
        return { n: i + 1, title: ed.degree, sub: ed.university, sub2: ed.location, lines, bullets: ed.extras, date: ed.year };
      };
      if (asTable('education')) emitRows(c.education.map(mk), '연도');
      else c.education.forEach((ed, i) => { const r = mk(ed, i); B({ kind: 'entry', date: r.date, title: r.title, sub: r.sub, sub2: r.sub2, lines: r.lines, bullets: r.bullets }); });
    },
    experiences: () => {
      if (!(c.experiences?.length && vis('experiences'))) return;
      B({ kind: 'h2', text: p.experience });
      const mk = (e, i) => ({ n: i + 1, title: e.role, sub: e.company, sub2: e.location, bullets: e.responsibilities, date: rng(e.startDate, e.endDate) });
      if (asTable('experiences')) emitRows(c.experiences.map(mk), '기간');
      else c.experiences.forEach((e, i) => { const r = mk(e, i); B({ kind: 'entry', date: r.date, title: r.title, sub: r.sub, sub2: r.sub2, bullets: r.bullets }); });
    },
    projects: () => {
      if (!(c.projects?.length && vis('projects'))) return;
      B({ kind: 'h2', text: p.projects });
      const mk = (pr, i) => {
        const lines = [];
        if (pr.description) lines.push({ text: pr.description });
        if (pr.partner) lines.push({ label: p.partner, text: pr.partner });
        if (pr.achievement) lines.push({ label: p.achievement, text: pr.achievement });
        return { n: i + 1, title: pr.title, lines, date: rng(pr.startYear, pr.endYear) };
      };
      if (asTable('projects')) emitRows(c.projects.map(mk), '기간');
      else c.projects.forEach((pr, i) => { const r = mk(pr, i); B({ kind: 'entry', date: r.date, title: r.title, lines: r.lines }); });
    },
    'publications.journals': () => {
      if (!(c.publications?.journals?.length && vis('publications.journals'))) return;
      B({ kind: 'h2', text: p.journals });
      if (asTable('publications.journals')) emitRows(c.publications.journals.map((x, i) => ({ n: i + 1, lines: [{ text: pubText(x) }], date: x.date })), '날짜');
      else c.publications.journals.forEach((x, i) => B({ kind: 'pub', n: i + 1, authors: x.authors, title: x.title, venue: x.venue, date: x.date }));
    },
    'publications.conferences': () => {
      if (!(c.publications?.conferences?.length && vis('publications.conferences'))) return;
      B({ kind: 'h2', text: p.conferences });
      if (asTable('publications.conferences')) emitRows(c.publications.conferences.map((x, i) => ({ n: i + 1, lines: [{ text: pubText(x) }], date: x.date })), '날짜');
      else c.publications.conferences.forEach((x, i) => B({ kind: 'pub', n: i + 1, authors: x.authors, title: x.title, venue: x.venue, date: x.date }));
    },
    patents: () => {
      if (!(c.patents?.length && vis('patents'))) return;
      B({ kind: 'h2', text: p.patents });
      if (asTable('patents')) emitRows(c.patents.map((x, i) => ({ n: i + 1, lines: [{ text: patentText(x) }], date: x.year })), '연도');
      else c.patents.forEach((x, i) => B({ kind: 'patent', n: i + 1, authors: x.authors, title: x.title, number: x.number, year: x.year, status: x.status }));
    },
    hardwareExperiences: () => {
      if (!(c.hardwareExperiences?.length && vis('hardwareExperiences'))) return;
      B({ kind: 'h2', text: p.hardware });
      const mk = (h, i) => ({ n: i + 1, title: h.title, bullets: h.details, date: rng(h.startYear, h.endYear) });
      if (asTable('hardwareExperiences')) emitRows(c.hardwareExperiences.map(mk), '기간');
      else c.hardwareExperiences.forEach((h, i) => { const r = mk(h, i); B({ kind: 'entry', date: r.date, title: r.title, bullets: r.bullets }); });
    },
    specialties: () => {
      if (!(c.specialties?.length && vis('specialties'))) return;
      B({ kind: 'h2', text: p.specialties });
      if (asTable('specialties')) emitRows(c.specialties.map((s, i) => ({ n: i + 1, title: s })), '');
      else B({ kind: 'bullets', items: c.specialties });
    },
    'skills.technical': () => {
      if (!(c.skills?.technical?.length && vis('skills.technical'))) return;
      B({ kind: 'h2', text: p.technicalSkills });
      if (asTable('skills.technical')) emitRows(c.skills.technical.map((s, i) => ({ n: i + 1, title: s })), '');
      else B({ kind: 'bullets', items: c.skills.technical });
    }
  };

  for (const key of order.value) {
    if (builders[key]) builders[key]();
  }

  return out;
});

// ----- Paginate: measure each block, pack into A4-content-height pages -----
const MM = 96 / 25.4;
const PAGE_H = (297 - 28 - 6) * MM; // A4 minus 14mm top/bottom padding, minus safety
const measureEl = ref(null);
const pages = ref([]);

function paginate() {
  const el = measureEl.value;
  if (!el) return;
  // Measure each block's effective height via offsetTop deltas, which naturally
  // account for collapsed margins between adjacent blocks (accurate packing).
  const items = Array.from(el.querySelectorAll('[data-bi]'));
  if (!items.length) {
    pages.value = [];
    return;
  }
  const tops = items.map((n) => n.offsetTop);
  const total = el.scrollHeight;
  const heights = [];
  for (let i = 0; i < items.length; i++) {
    heights[i] = (i < items.length - 1 ? tops[i + 1] : total) - tops[i];
  }
  const f = flow.value;
  const result = [[]];
  let cur = 0;
  for (let i = 0; i < f.length; i++) {
    const h = heights[i] || 0;
    let newPage = cur > 0 && cur + h > PAGE_H;
    // Avoid leaving a section heading orphaned at the bottom of a page.
    if (!newPage && f[i].kind === 'h2' && cur > 0) {
      const nextH = heights[i + 1] || 0;
      if (cur + h + Math.min(nextH, 80) > PAGE_H) newPage = true;
    }
    if (newPage) {
      result.push([]);
      cur = 0;
    }
    result[result.length - 1].push(i);
    cur += h;
  }
  pages.value = result;
}

let raf = 0;
function schedule() {
  if (raf) cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    raf = 0;
    paginate();
  });
}

onMounted(() => {
  schedule();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
});
watch(flow, () => schedule(), { flush: 'post' });
// Font-size / line-height / rule-width changes alter measured heights, so
// re-paginate when the document style changes (flow itself is unchanged).
watch(() => state.data && state.data.style, () => schedule(), { deep: true, flush: 'post' });
onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf);
});
</script>

<template>
  <div class="cv-preview" :style="styleVars">
    <!-- Hidden measurer: all blocks at page content width, for height measurement -->
    <div class="cv-measure" ref="measureEl" aria-hidden="true">
      <CvBlock v-for="(b, i) in flow" :key="b.id" :block="b" :p="P" :data-bi="i" />
    </div>

    <!-- Visible A4 sheets -->
    <div v-for="(pg, pi) in pages" :key="pi" class="cv-sheet">
      <CvBlock v-for="i in pg" :key="flow[i].id" :block="flow[i]" :p="P" />
      <div class="cv-sheet-num no-print">{{ pi + 1 }} / {{ pages.length }}</div>
    </div>
  </div>
</template>
