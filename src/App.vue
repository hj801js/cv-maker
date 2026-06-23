<script setup>
import { ref, computed, nextTick, onMounted } from 'vue';
import { useCv } from './composables/useCv.js';
import { sections, sectionLabel, PINNED_SECTION_KEYS, TABLE_SECTION_KEYS } from './schema.js';
import { labels } from './i18n/ko.js';
import EditorPane from './components/EditorPane.vue';
import PreviewPane from './components/PreviewPane.vue';
import Toasts from './components/Toasts.vue';
import { useToast } from './composables/useToast.js';

const { state, lang, active, setLang, isSectionVisible, toggleSection, order, moveSection, isTableOn, toggleTable, setStyle, resetStyle, THEMES, themeId, setTheme, save, exportPdf, pickDataDir, syncOrcid, importData, exportData, switchProfile, saveAsProfile, renameProfile, deleteProfile } =
  useCv();
const { notify } = useToast();

const mode = ref('editor'); // 'editor' | 'preview'
const activeSection = ref(sections[0].key);

const sectionByKey = Object.fromEntries(sections.map((s) => [s.key, s]));
const pinnedSections = PINNED_SECTION_KEYS.map((k) => sectionByKey[k]).filter(Boolean);
const orderedMainSections = computed(() => order.value.map((k) => sectionByKey[k]).filter(Boolean));
const tableAble = (key) => TABLE_SECTION_KEYS.includes(key);

const dirtyMark = computed(() => (state.dirty ? '*' : ''));
const statusText = computed(() => {
  if (state.error) return `${labels.status.error}: ${state.error}`;
  if (state.syncing) return labels.actions.syncing;
  if (state.saving) return labels.actions.saving;
  if (state.dirty) return labels.actions.dirty;
  if (state.lastSavedAt) {
    const t = state.lastSavedAt;
    return `${labels.actions.saved} (${t.getHours().toString().padStart(2, '0')}:${t
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${t.getSeconds().toString().padStart(2, '0')})`;
  }
  return '';
});

async function onExport() {
  // The CV document (.cv-page) is only mounted in preview mode, so force
  // preview and let it render before printing — otherwise the PDF captures
  // the editor form instead of the CV.
  const prevMode = mode.value;
  mode.value = 'preview';
  await nextTick();
  try {
    const res = await exportPdf();
    if (res.ok) {
      notify(`PDF 저장됨: ${res.path}`, 'success');
    } else if (!res.canceled) {
      notify(`내보내기 실패: ${res.error || '알 수 없는 오류'}`, 'error');
    }
  } finally {
    mode.value = prevMode;
  }
}

async function onPickDir() {
  const res = await pickDataDir();
  if (res.ok) {
    notify(`데이터 폴더가 변경되었습니다: ${res.path}`, 'success');
  }
}

async function onImport() {
  const res = await importData();
  if (res.ok) {
    notify(`${res.lang === 'ko' ? '한글' : '영문'} 이력서를 불러왔습니다.`, 'success');
  } else if (!res.canceled) {
    notify(`불러오기 실패: ${res.error || '알 수 없는 오류'}`, 'error');
  }
}

async function onExportData() {
  const res = await exportData();
  if (res.ok) notify(`JSON으로 내보냈습니다: ${res.path}`, 'success');
  else if (!res.canceled) notify(`내보내기 실패: ${res.error || '알 수 없는 오류'}`, 'error');
}

// ----- Profiles -----
const profilePrompt = ref({ mode: null, value: '' });
function startNewProfile() { profilePrompt.value = { mode: 'new', value: '' }; }
function startRenameProfile() { profilePrompt.value = { mode: 'rename', value: state.activeProfile }; }
function cancelProfilePrompt() { profilePrompt.value = { mode: null, value: '' }; }
async function confirmProfilePrompt() {
  const { mode, value } = profilePrompt.value;
  const name = (value || '').trim();
  if (!name) return;
  const res = mode === 'new' ? await saveAsProfile(name) : await renameProfile(state.activeProfile, name);
  if (res && !res.ok) { notify(res.error || '실패했습니다.', 'error'); return; }
  cancelProfilePrompt();
}
async function onSwitchProfile(name) {
  const res = await switchProfile(name);
  if (res && !res.ok) notify(res.error || '프로필 전환 실패', 'error');
}
async function onDeleteProfile() {
  if (!state.activeProfile) return;
  if ((state.profiles || []).length <= 1) { notify('마지막 프로필은 삭제할 수 없습니다.', 'error'); return; }
  if (!confirm(`'${state.activeProfile}' 프로필을 삭제할까요?`)) return;
  const res = await deleteProfile(state.activeProfile);
  if (res && !res.ok) notify(res.error || '삭제 실패', 'error');
}

onMounted(() => {
  // Keyboard shortcuts come from the app menu (Ctrl+S save, Ctrl+P export PDF).
  window.cvAPI?.onMenu?.((action) => {
    if (action === 'save') save();
    else if (action === 'export') onExport();
  });
});

const orcidPresent = computed(() => !!active.value?.basicInfo?.orcid);

async function onSyncOrcid() {
  if (!orcidPresent.value) {
    notify('기본 정보에 ORCID ID를 먼저 입력하세요.', 'info');
    return;
  }
  const res = await syncOrcid();
  if (!res.ok) {
    notify(`ORCID 동기화 실패: ${res.error}`, 'error');
    return;
  }
  const s = res.summary;
  notify(
    `ORCID 동기화 완료 — 저널 +${s.addedJournals}, 학회 +${s.addedConferences}, 특허 +${s.addedPatents} (중복 ${s.skippedDuplicates}건 건너뜀, 총 ${s.total}건 조회). 논문은 최신순 정렬됨.`,
    'success',
    6000
  );
}
</script>

<template>
  <div class="app-shell" :class="{ 'is-preview': mode === 'preview' }">
    <header class="app-header no-print">
      <div class="brand">
        <span class="brand-name">{{ labels.app.title }}</span>
        <span class="brand-dirty">{{ dirtyMark }}</span>
        <select
          v-if="state.profiles && state.profiles.length"
          class="profile-select"
          :value="state.activeProfile"
          @change="onSwitchProfile($event.target.value)"
          title="프로필 선택"
        >
          <option v-for="p in state.profiles" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>

      <nav class="mode-tabs">
        <button :class="{ active: mode === 'editor' }" @click="mode = 'editor'">
          {{ labels.app.editor }}
        </button>
        <button :class="{ active: mode === 'preview' }" @click="mode = 'preview'">
          {{ labels.app.preview }}
        </button>
      </nav>

      <div class="header-actions">
        <div class="lang-switch" role="group" aria-label="언어 / Language">
          <button :class="{ active: lang === 'ko' }" @click="setLang('ko')">한국어</button>
          <button :class="{ active: lang === 'en' }" @click="setLang('en')">EN</button>
        </div>
        <select class="theme-select" :value="themeId" @change="setTheme($event.target.value)" title="테마">
          <option v-if="!THEMES.some(t => t.id === themeId)" value="">사용자 설정</option>
          <option v-for="t in THEMES" :key="t.id" :value="t.id">{{ t.nameKo }}</option>
        </select>
        <span class="status">{{ statusText }}</span>
        <button class="btn" @click="save" :disabled="!state.dirty || state.saving || state.syncing">
          {{ labels.actions.save }}
        </button>
        <button class="btn" @click="onSyncOrcid" :disabled="!orcidPresent || state.saving || state.syncing">
          {{ labels.actions.syncOrcid }}
        </button>
        <button class="btn btn-primary" @click="onExport">
          {{ labels.actions.exportPdf }}
        </button>
      </div>
    </header>

    <main class="app-main" v-if="state.data">
      <template v-if="mode === 'editor'">
        <aside class="section-nav no-print">
          <p class="section-nav-hint">☑ 출력 포함 · ▲▼ 순서 변경 ({{ lang === 'ko' ? '한글' : '영문' }})</p>
          <!-- Pinned: basic info group (not reorderable) -->
          <div
            v-for="sec in pinnedSections"
            :key="sec.key"
            class="nav-item"
            :class="{ excluded: !isSectionVisible(sec.key) }"
          >
            <button
              class="nav-label"
              :class="{ active: activeSection === sec.key }"
              @click="activeSection = sec.key"
            >
              {{ sectionLabel(sec, lang) }}
            </button>
            <span class="nav-controls">
              <input
                class="nav-check"
                type="checkbox"
                :checked="isSectionVisible(sec.key)"
                @change="toggleSection(sec.key)"
                :title="isSectionVisible(sec.key) ? '출력에 포함됨' : '출력에서 제외됨'"
              />
            </span>
          </div>
          <div class="nav-divider"></div>
          <!-- Reorderable big sections (output order follows this list) -->
          <div
            v-for="(sec, idx) in orderedMainSections"
            :key="sec.key"
            class="nav-item"
            :class="{ excluded: !isSectionVisible(sec.key) }"
          >
            <button
              class="nav-label"
              :class="{ active: activeSection === sec.key }"
              @click="activeSection = sec.key"
            >
              {{ sectionLabel(sec, lang) }}
            </button>
            <span class="nav-controls">
              <button
                v-if="lang === 'ko' && tableAble(sec.key)"
                class="icon-btn tbl-btn"
                :class="{ on: isTableOn(sec.key) }"
                @click="toggleTable(sec.key)"
                :title="isTableOn(sec.key) ? '표 스타일 켜짐 (클릭하여 끄기)' : '표 스타일로 (한글 전용)'"
              >표</button>
              <button class="icon-btn" @click="moveSection(sec.key, -1)" :disabled="idx === 0" title="위로">▲</button>
              <button class="icon-btn" @click="moveSection(sec.key, 1)" :disabled="idx === orderedMainSections.length - 1" title="아래로">▼</button>
              <input
                class="nav-check"
                type="checkbox"
                :checked="isSectionVisible(sec.key)"
                @change="toggleSection(sec.key)"
                :title="isSectionVisible(sec.key) ? '출력에 포함됨' : '출력에서 제외됨'"
              />
            </span>
          </div>
          <div class="section-nav-footer">
            <div class="profile-box">
              <div class="profile-actions" v-if="!profilePrompt.mode">
                <button class="btn btn-ghost" @click="startNewProfile">+ 새 프로필</button>
                <button class="btn btn-ghost" @click="startRenameProfile">이름변경</button>
                <button class="btn btn-ghost profile-del" @click="onDeleteProfile">삭제</button>
              </div>
              <div class="profile-prompt" v-else>
                <input
                  class="input"
                  v-model="profilePrompt.value"
                  :placeholder="profilePrompt.mode === 'new' ? '새 프로필 이름' : '새 이름'"
                  @keyup.enter="confirmProfilePrompt"
                />
                <div class="profile-prompt-actions">
                  <button class="btn btn-primary" @click="confirmProfilePrompt">확인</button>
                  <button class="btn btn-ghost" @click="cancelProfilePrompt">취소</button>
                </div>
              </div>
            </div>
            <button class="btn btn-ghost" @click="onImport" title="언어별 데이터 파일 불러오기 (파일명 끝 KR/EN으로 판별)">
              {{ labels.actions.load }}
            </button>
            <button class="btn btn-ghost" @click="onExportData" title="현재 언어 데이터를 JSON 파일로 내보내기">
              {{ labels.actions.exportJson }}
            </button>
            <button class="btn btn-ghost" @click="onPickDir" :title="state.dataPath">
              {{ labels.actions.pickDataDir }}
            </button>
            <p class="data-path" :title="state.dataPath">{{ state.dataPath }}</p>
          </div>
        </aside>
        <section class="editor-area">
          <EditorPane :section-key="activeSection" />
        </section>
      </template>

      <template v-else>
        <div class="preview-scroll"><PreviewPane /></div>
        <aside class="style-nav no-print" v-if="state.data.style">
          <p class="style-nav-title">스타일</p>
          <label class="style-row">
            <span>이름 크기 <em>{{ state.data.style.nameSize }}</em></span>
            <input type="range" min="18" max="40" step="1" :value="state.data.style.nameSize" @input="setStyle('nameSize', +$event.target.value)" />
          </label>
          <label class="style-row">
            <span>섹션 제목 크기 <em>{{ state.data.style.headingSize }}</em></span>
            <input type="range" min="10" max="20" step="0.5" :value="state.data.style.headingSize" @input="setStyle('headingSize', +$event.target.value)" />
          </label>
          <label class="style-row">
            <span>본문 크기 <em>{{ state.data.style.bodySize }}</em></span>
            <input type="range" min="9" max="16" step="0.5" :value="state.data.style.bodySize" @input="setStyle('bodySize', +$event.target.value)" />
          </label>
          <label class="style-row">
            <span>줄 간격 <em>{{ state.data.style.lineHeight }}</em></span>
            <input type="range" min="1.2" max="2" step="0.05" :value="state.data.style.lineHeight" @input="setStyle('lineHeight', +$event.target.value)" />
          </label>
          <label class="style-row">
            <span>선 굵기 <em>{{ state.data.style.ruleWidth }}</em></span>
            <input type="range" min="0.5" max="4" step="0.5" :value="state.data.style.ruleWidth" @input="setStyle('ruleWidth', +$event.target.value)" />
          </label>
          <label class="style-row">
            <span>강조 색</span>
            <input type="color" :value="state.data.style.accent" @input="setStyle('accent', $event.target.value)" />
          </label>
          <label class="style-row">
            <span>글꼴</span>
            <select :value="state.data.style.font" @change="setStyle('font', $event.target.value)">
              <option value="sans">산세리프</option>
              <option value="serif">세리프</option>
            </select>
          </label>
          <button class="btn btn-ghost style-reset" @click="resetStyle">기본값으로 초기화</button>
          <p class="style-hint">미리보기·PDF에 바로 반영됩니다.</p>
        </aside>
      </template>
    </main>

    <div v-else-if="state.loading" class="loading">{{ labels.status.loading }}</div>
    <div v-else class="loading error">{{ labels.status.error }}: {{ state.error }}</div>

    <Toasts />
  </div>
</template>
