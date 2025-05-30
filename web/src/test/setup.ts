import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import 'vitest-canvas-mock';

// Extend Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserver;

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});
