// This file is used to polyfill features that are not available in all browser
// environments. It is imported at the top of main.tsx to ensure that the
// polyfills are available before any other code is executed.

import { Buffer } from 'buffer';

// The 'buffer' and 'global' modules are required by some of the packages used
// in this project, but they are not available in the browser by default. This
// polyfill makes them available in the browser.
if (typeof window.global === 'undefined') {
  (window as any).global = window;
}
if (typeof window.Buffer === 'undefined') {
  (window as any).Buffer = Buffer;
}