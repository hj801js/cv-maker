import { reactive } from 'vue';

// Minimal non-blocking notification queue (replaces blocking alert()).
const state = reactive({ items: [] });
let seq = 0;

export function useToast() {
  function notify(message, type = 'info', timeout = 4000) {
    const id = ++seq;
    state.items.push({ id, message: String(message), type });
    if (timeout) setTimeout(() => dismiss(id), timeout);
    return id;
  }
  function dismiss(id) {
    const i = state.items.findIndex((t) => t.id === id);
    if (i >= 0) state.items.splice(i, 1);
  }
  return { toasts: state.items, notify, dismiss };
}
