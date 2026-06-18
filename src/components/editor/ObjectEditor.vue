<script setup>
import StringListEditor from './StringListEditor.vue';

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  section: { type: Object, required: true }
});
const emit = defineEmits(['update:modelValue']);

function updateField(key, val) {
  emit('update:modelValue', { ...(props.modelValue || {}), [key]: val });
}

function inputFor(f, val) {
  return val == null ? '' : val;
}

function parseValue(field, raw) {
  if (field.type === 'number') {
    if (raw === '' || raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return raw;
}

// Read a picked image, downscale to ~400px wide JPEG, store as a base64 data URL.
function onPickImage(field, e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const maxW = 400;
      const scale = Math.min(1, maxW / (img.width || maxW));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      updateField(field.key, canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => updateField(field.key, String(reader.result || ''));
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}
</script>

<template>
  <div class="object-editor">
    <div v-for="field in section.fields" :key="field.key" class="field">
      <label class="field-label">{{ field.label }}</label>

      <template v-if="field.type === 'textarea'">
        <textarea
          class="textarea"
          :value="inputFor(field, modelValue?.[field.key])"
          @input="(e) => updateField(field.key, e.target.value)"
          rows="4"
        ></textarea>
      </template>

      <template v-else-if="field.type === 'stringList'">
        <StringListEditor
          :model-value="modelValue?.[field.key] || []"
          @update:model-value="(v) => updateField(field.key, v)"
        />
      </template>

      <template v-else-if="field.type === 'number'">
        <input
          class="input"
          type="number"
          :value="inputFor(field, modelValue?.[field.key])"
          @input="(e) => updateField(field.key, parseValue(field, e.target.value))"
        />
      </template>

      <template v-else-if="field.type === 'image'">
        <div class="image-field">
          <img v-if="modelValue?.[field.key]" :src="modelValue[field.key]" class="image-preview" alt="" />
          <div class="image-actions">
            <label class="btn btn-ghost image-pick">
              사진 선택
              <input type="file" accept="image/*" @change="(e) => onPickImage(field, e)" hidden />
            </label>
            <button v-if="modelValue?.[field.key]" class="btn btn-danger" @click="updateField(field.key, '')">제거</button>
          </div>
        </div>
      </template>

      <template v-else>
        <input
          class="input"
          type="text"
          :placeholder="field.placeholder || ''"
          :value="inputFor(field, modelValue?.[field.key])"
          @input="(e) => updateField(field.key, e.target.value)"
        />
      </template>
    </div>
  </div>
</template>
