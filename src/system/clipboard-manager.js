import { kernel } from './kernel.js';

/**
 * Legacy clipboardManager proxying to ClipboardService in Kernel.
 * @deprecated Use kernel.use('clipboard') instead.
 */
const clipboardManager = {
  get items() { return kernel.use('clipboard').items; },
  set items(val) { kernel.use('clipboard').items = val; },
  get operation() { return kernel.use('clipboard').operation; },
  set operation(val) { kernel.use('clipboard').operation = val; },

  set(items, operation) {
    return kernel.use('clipboard').set(items, operation);
  },

  get() {
    return kernel.use('clipboard').get();
  },

  clear() {
    return kernel.use('clipboard').clear();
  },

  isEmpty() {
    return kernel.use('clipboard').isEmpty();
  },
};

export default clipboardManager;
