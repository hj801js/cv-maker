<script setup>
import { labels } from '../../i18n/ko.js';

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  section: { type: Object, default: () => ({}) }
});
const emit = defineEmits(['update:modelValue']);

function update(idx, val) {
  const next = [...(props.modelValue || [])];
  next[idx] = val;
  emit('update:modelValue', next);
}

function add() {
  emit('update:modelValue', [...(props.modelValue || []), '']);
}

function remove(idx) {
  if (!confirm(labels.actions.confirmDelete)) return;
  const next = [...(props.modelValue || [])];
  next.splice(idx, 1);
  emit('update:modelValue', next);
}

function move(idx, delta) {
  const next = [...(props.modelValue || [])];
  const j = idx + delta;
  if (j < 0 || j >= next.length) return;
  [next[idx], next[j]] = [next[j], next[idx]];
  emit('update:modelValue', next);
}
</script>

<template>
  <div class="string-list">
    <div v-for="(item, idx) in modelValue" :key="idx" class="string-list-row">
      <textarea
        class="textarea string-list-input"
        :value="item"
        @input="(e) => update(idx, e.target.value)"
        rows="2"
      ></textarea>
      <div class="row-actions">
        <button class="btn btn-ghost" @click="move(idx, -1)" :disabled="idx === 0" :title="labels.actions.moveUp">▲</button>
        <button class="btn btn-ghost" @click="move(idx, 1)" :disabled="idx === modelValue.length - 1" :title="labels.actions.moveDown">▼</button>
        <button class="btn btn-danger" @click="remove(idx)">{{ labels.actions.deleteItem }}</button>
      </div>
    </div>
    <button class="btn btn-add" @click="add">+ {{ labels.actions.addItem }}</button>
  </div>
</template>
