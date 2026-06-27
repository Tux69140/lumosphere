import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// @testing-library/dom@10 detects fake timers via `typeof jest !== 'undefined'`.
// Vitest 4 does not inject `jest` as a global, so alias it here to make
// waitFor's fake-timer loop (jest.advanceTimersByTime) work with vi.useFakeTimers().
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).jest = vi

// jsdom does not implement window.matchMedia — stub it
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
}
