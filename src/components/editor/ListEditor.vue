<script setup>
import { ref, computed, watch } from 'vue';
import ObjectEditor from './ObjectEditor.vue';
import { labels } from '../../i18n/ko.js';

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  section: { type: Object, required: true }
});
const emit = defineEmits(['update:modelValue']);

const selectedIdx = ref(0);

watch(
  () => (props.modelValue || []).length,
  (len) => {
    if (selectedIdx.value >= len) selectedIdx.value = Math.max(0, len - 1);
  }
);

const currentItem = computed(() => {
  const list = props.modelValue || [];
  return list[selectedIdx.value] || null;
});

function labelFor(item) {
  if (!item) return '';
  if (typeof props.section.itemLabel === 'function') {
    return props.section.itemLabel(item) || '(빈 항목)';
  }
  return JSON.stringify(item).slice(0, 60);
}

function add() {
  const factory = props.section.factory || (() => ({}));
  const next = [...(props.modelValue || []), factory()];
  emit('update:modelValue', next);
  selectedIdx.value = next.length - 1;
}

function remove(idx) {
  if (!confirm(labels.actions.confirmDelete)) return;
  const next = [...(props.modelValue || [])];
  next.splice(idx, 1);
  emit('update:modelValue', next);
  if (selectedIdx.value >= next.length) selectedIdx.value = Math.max(0, next.length - 1);
}

function move(idx, delta) {
  const next = [...(props.modelValue || [])];
  const j = idx + delta;
  if (j < 0 || j >= next.length) return;
  [next[idx], next[j]] = [next[j], next[idx]];
  emit('update:modelValue', next);
  if (selectedIdx.value === idx) selectedIdx.value = j;
  else if (selectedIdx.value === j) selectedIdx.value = idx;
}

function updateCurrent(updated) {
  const next = [...(props.modelValue || [])];
  next[selectedIdx.value] = updated;
  emit('update:modelValue', next);
}
</script>

<template>
  <div class="list-editor">
    <div class="list-sidebar">
      <ol class="list-items">
        <li
          v-for="(item, idx) in modelValue"
          :key="idx"
          :class="{ active: idx === selectedIdx }"
          @click="selectedIdx = idx"
        >
          <span class="item-index">{{ idx + 1 }}.</span>
          <span class="item-label">{{ labelFor(item) }}</span>
          <span class="item-actions">
            <button class="icon-btn" @click.stop="move(idx, -1)" :disabled="idx === 0">▲</button>
            <button class="icon-btn" @click.stop="move(idx, 1)" :disabled="idx === modelValue.length - 1">▼</button>
            <button class="icon-btn danger" @click.stop="remove(idx)">×</button>
          </span>
        </li>
      </ol>
      <button class="btn btn-add" @click="add">+ {{ labels.actions.addItem }}</button>
    </div>
    <div class="list-detail">
      <ObjectEditor
        v-if="currentItem"
        :model-value="currentItem"
        :section="section"
        @update:model-value="updateCurrent"
      />
      <p v-else class="hint">항목이 없습니다. + {{ labels.actions.addItem }} 버튼을 눌러 추가하세요.</p>
    </div>
  </div>
</template>
