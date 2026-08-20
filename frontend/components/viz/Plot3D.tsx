'use client'
import dynamic from 'next/dynamic'

// plotly.js touches `window` on load, so it can only run client-side; the
// factory pattern here pulls in plotly.js-dist-min (a pre-built browser
// bundle) instead of the full plotly.js package to keep the dependency small.
const Plot = dynamic(async () => {
  const Plotly = (await import('plotly.js-dist-min')).default
  const createPlotlyComponent = (await import('react-plotly.js/factory')).default
  return createPlotlyComponent(Plotly)
}, { ssr: false })

export default Plot
