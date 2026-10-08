import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(cleanup)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
window.scrollTo = vi.fn()
// JSDOM não gerencia a top layer; o comportamento real de foco é verificado no Playwright.
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute('open')
}
