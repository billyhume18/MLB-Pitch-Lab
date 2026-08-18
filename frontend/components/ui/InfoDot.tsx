'use client'
import { useState } from 'react'
import { GLOSSARY } from '@/lib/glossary'

interface Props { term: string }

// Small inline "?" that shows the glossary definition for `term` on hover/focus.
// Renders nothing if the term isn't in the glossary, so it's safe to sprinkle
// on any stat label.
export default function InfoDot({ term }: Props) {
  const [open, setOpen] = useState(false)
  const def = GLOSSARY[term]
  if (!def) return null

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="ml-1 w-3.5 h-3.5 rounded-full border border-slate-600 text-slate-500 hover:text-white hover:border-slate-400 text-[9px] leading-[13px] text-center align-middle"
        aria-label={`Definition of ${term}`}
      >
        ?
      </button>
      {open && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 p-2 rounded bg-navy-900 border border-navy-600 text-xs text-slate-300 shadow-xl normal-case font-normal">
          <span className="block font-semibold text-white mb-0.5">{term}</span>
          {def}
        </span>
      )}
    </span>
  )
}
