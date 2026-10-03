import { Component, type ReactNode } from 'react'

export const captured: { error: string | null } = { error: null }

window.addEventListener('error', (e) => {
  captured.error ??= e.message || String(e.error)
})
window.addEventListener('unhandledrejection', (e) => {
  captured.error ??= String((e.reason as Error)?.message ?? e.reason)
})

export class SceneBoundary extends Component<{ onError: (msg: string) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    captured.error ??= error.message
    this.props.onError(error.message)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
