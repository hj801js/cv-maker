<script setup>
const props = defineProps({
  modelValue: { type: String, default: '' },
  section: { type: Object, required: true }
});
const emit = defineEmits(['update:modelValue']);

function onInput(e) {
  emit('update:modelValue', e.target.value);
}
</script>

<template>
  <div class="field">
    <textarea
      v-if="section.multiline"
      class="textarea"
      :value="modelValue"
      @input="onInput"
      rows="8"
    ></textarea>
    <input
      v-else
      class="input"
      type="text"
      :value="modelValue"
      @input="onInput"
    />
  </div>
</template>
