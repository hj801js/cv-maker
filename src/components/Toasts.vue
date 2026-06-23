<script setup>
import { useToast } from '../composables/useToast.js';
const { toasts, dismiss } = useToast();
</script>

<template>
  <div class="toasts no-print" aria-live="polite">
    <div
      v-for="t in toasts"
      :key="t.id"
      class="toast"
      :class="'toast-' + t.type"
      role="status"
      title="클릭하여 닫기"
      @click="dismiss(t.id)"
    >
      {{ t.message }}
    </div>
  </div>
</template>
