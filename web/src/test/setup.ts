/* global Element */
import '@testing-library/jest-dom';
import { expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import 'vitest-canvas-mock';
import React from 'react';

// Extend Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserver;

// Robust mock for getClientRects for all elements
Object.defineProperty(Element.prototype, 'getClientRects', {
  configurable: true,
  value: () => [],
});

// Mock @uiw/react-codemirror to avoid jsdom errors in tests
vi.mock('@uiw/react-codemirror', () => ({
  __esModule: true,
  default: () => React.createElement('div', { className: 'cm-editor' }),
}));

// Cleanup before each test case
beforeEach(() => {
  vi.clearAllMocks();
});

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});
