<script setup>
import { computed } from 'vue';
import { useCv } from '../composables/useCv.js';
import { sections, sectionLabel, getSectionPath, getAt, setAt } from '../schema.js';
import ObjectEditor from './editor/ObjectEditor.vue';
import ListEditor from './editor/ListEditor.vue';
import StringListEditor from './editor/StringListEditor.vue';
import TextEditor from './editor/TextEditor.vue';

const props = defineProps({
  sectionKey: { type: String, required: true }
});

const { state, active, lang } = useCv();

const section = computed(() => sections.find((s) => s.key === props.sectionKey));

const value = computed({
  get() {
    if (!state.data || !section.value) return null;
    return getAt(active.value, getSectionPath(section.value));
  },
  set(v) {
    if (!state.data || !section.value) return;
    setAt(active.value, getSectionPath(section.value), v);
  }
});

const editorComponent = computed(() => {
  if (!section.value) return null;
  switch (section.value.type) {
    case 'object':
      return ObjectEditor;
    case 'list':
      return ListEditor;
    case 'stringList':
      return StringListEditor;
    case 'text':
      return TextEditor;
    default:
      return null;
  }
});
</script>

<template>
  <div class="editor-pane" v-if="section">
    <h2 class="editor-title">{{ sectionLabel(section, lang) }}</h2>
    <component
      v-if="editorComponent"
      :is="editorComponent"
      v-model="value"
      :section="section"
    />
    <p v-else class="hint">지원되지 않는 섹션 유형: {{ section.type }}</p>
  </div>
</template>
