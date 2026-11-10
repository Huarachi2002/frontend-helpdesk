import * as React from 'react'

if (typeof window !== 'undefined') {
  window.React = React
}
if (typeof globalThis !== 'undefined') {
  globalThis.React = React
}

export { React }
