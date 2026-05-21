'use client'

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BracketMatch } from './BracketMatch'
import type { BracketMatch as BracketMatchType, BracketResponse } from '@/types/api'

/* ─────────────────────────────────────────────────────────────────────────────
   Public component
   ───────────────────────────────────────────────────────────────────────────── */

interface NbaBracketViewProps {
  bracket: BracketResponse
  selectedMatchId: string | null
  accentColor: string
  onSelect: (match: BracketMatchType) => void
}

export function NbaBracketView({ bracket, selectedMatchId, accentColor, onSelect }: NbaBracketViewProps) {
  const isEmpty =
    bracket.left.round1.length === 0 &&
    bracket.right.round1.length === 0 &&
    !bracket.finals

  if (isEmpty) {
    return (
      <div
        className="px-8 py-16 text-center text-sm"
        style={{ color: '#9a9894', fontFamily: 'var(--font-dm-sans), sans-serif' }}
      >
        Bracket data unavailable for this season.
      </div>
    )
  }

  const desktopCols: (BracketMatchType | null)[][] = [
    bracket.left.round1,
    bracket.left.semis,
    [bracket.left.final],
    [bracket.finals],
    [bracket.right.final],
    bracket.right.semis,
    bracket.right.round1,
  ]
  const colLabels = [
    `${bracket.left.label} ${bracket.left.round1Label}`,
    `${bracket.left.label} ${bracket.left.semisLabel}`,
    `${bracket.left.label} ${bracket.left.finalLabel}`,
    bracket.finalsLabel,
    `${bracket.right.label} ${bracket.right.finalLabel}`,
    `${bracket.right.label} ${bracket.right.semisLabel}`,
    `${bracket.right.label} ${bracket.right.round1Label}`,
  ]

  return (
    <>
      {/* Desktop: 7-column horizontal bracket */}
      <div className="hidden overflow-x-auto px-8 py-6 lg:block">
        <BracketGrid
          desktopCols={desktopCols}
          colLabels={colLabels}
          selectedMatchId={selectedMatchId}
          accentColor={accentColor}
          onSelect={onSelect}
        />
      </div>

      {/* Mobile: stacked conferences */}
      <div className="space-y-6 px-4 py-4 lg:hidden">
        <BracketHalf
          title={bracket.left.label}
          rounds={[
            { label: bracket.left.round1Label, matches: bracket.left.round1 },
            { label: bracket.left.semisLabel, matches: bracket.left.semis },
            { label: bracket.left.finalLabel, matches: [bracket.left.final] },
          ]}
          selectedMatchId={selectedMatchId}
          accentColor={accentColor}
          onSelect={onSelect}
        />
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.12em] text-center pb-2"
            style={{ color: '#9a9894', fontFamily: 'var(--font-dm-mono), monospace' }}
          >
            {bracket.finalsLabel}
          </div>
          {bracket.finals ? (
            <BracketMatch
              match={bracket.finals}
              isSelected={bracket.finals.id === selectedMatchId}
              accentColor={accentColor}
              onSelect={onSelect}
            />
          ) : null}
        </div>
        <BracketHalf
          title={bracket.right.label}
          rounds={[
            { label: bracket.right.round1Label, matches: bracket.right.round1 },
            { label: bracket.right.semisLabel, matches: bracket.right.semis },
            { label: bracket.right.finalLabel, matches: [bracket.right.final] },
          ]}
          selectedMatchId={selectedMatchId}
          accentColor={accentColor}
          onSelect={onSelect}
        />
      </div>
    </>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Types for the connector system
   ───────────────────────────────────────────────────────────────────────────── */

/** A structural connection: 1 or 2 source matches feed into 1 target match. */
type Connector = {
  sourceIds: string[]  // 1 or 2 source match IDs
  targetId: string     // 1 target match ID
  goingRight: boolean  // left side flows right → center; right side flows left ← center
}

/** An SVG path segment to render. */
type SvgLine = {
  d: string
  key: string
  arrow: 'right' | 'left' | null
}

function targetContainsWinner(source: BracketMatchType, target: BracketMatchType) {
  if (!source.winnerTeamId) return false
  return target.team1.id === source.winnerTeamId || target.team2.id === source.winnerTeamId
}

function connectRoundSets(
  fromMatches: BracketMatchType[],
  toMatches: BracketMatchType[],
  goingRight: boolean,
): Connector[] {
  const connectors: Connector[] = []

  for (const target of toMatches) {
    const sourceIds = fromMatches
      .filter(source => targetContainsWinner(source, target))
      .map(source => source.id)

    if (sourceIds.length > 0) {
      connectors.push({
        sourceIds,
        targetId: target.id,
        goingRight,
      })
    }
  }

  return connectors
}

/* ─────────────────────────────────────────────────────────────────────────────
   BracketGrid — desktop 7-column layout with SVG connectors
   ───────────────────────────────────────────────────────────────────────────── */

function BracketGrid({
  desktopCols,
  colLabels,
  selectedMatchId,
  accentColor,
  onSelect,
}: {
  desktopCols: (BracketMatchType | null)[][]
  colLabels: string[]
  selectedMatchId: string | null
  accentColor: string
  onSelect: (m: BracketMatchType) => void
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const matchRefs = useRef(new Map<string, HTMLDivElement>())
  const [lines, setLines] = useState<SvgLine[]>([])
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 })
  const arrowRId = useId().replace(/:/g, '_') + '_r'
  const arrowLId = useId().replace(/:/g, '_') + '_l'
  const rafRef = useRef<number | null>(null)

  const setMatchRef = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      if (el) matchRefs.current.set(id, el)
      else matchRefs.current.delete(id)
    },
    [],
  )

  /* ── Build structural connectors from the column layout (preserving indices) ── */
  const connectors = useMemo(() => {
    const result: Connector[] = []

    result.push(...connectRoundSets(desktopCols[0].filter(Boolean) as BracketMatchType[], desktopCols[1].filter(Boolean) as BracketMatchType[], true))
    result.push(...connectRoundSets(desktopCols[1].filter(Boolean) as BracketMatchType[], desktopCols[2].filter(Boolean) as BracketMatchType[], true))
    result.push(...connectRoundSets(desktopCols[2].filter(Boolean) as BracketMatchType[], desktopCols[3].filter(Boolean) as BracketMatchType[], true))
    result.push(...connectRoundSets(desktopCols[4].filter(Boolean) as BracketMatchType[], desktopCols[3].filter(Boolean) as BracketMatchType[], false))
    result.push(...connectRoundSets(desktopCols[5].filter(Boolean) as BracketMatchType[], desktopCols[4].filter(Boolean) as BracketMatchType[], false))
    result.push(...connectRoundSets(desktopCols[6].filter(Boolean) as BracketMatchType[], desktopCols[5].filter(Boolean) as BracketMatchType[], false))

    return result
  }, [desktopCols])

  /* ── Compute SVG paths from DOM positions ── */
  const recompute = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const wrapper = wrapperRef.current
      if (!wrapper) {
        rafRef.current = null
        return
      }
      const wr = wrapper.getBoundingClientRect()
      setSvgSize({ w: wr.width, h: wr.height })

      const ARROW_GAP = 2
      const result: SvgLine[] = []

      for (const conn of connectors) {
        const tEl = matchRefs.current.get(conn.targetId)
        if (!tEl) continue
        const tR = tEl.getBoundingClientRect()
        const tCY = tR.top + tR.height / 2 - wr.top

        // Resolve source elements
        const srcs: { id: string; rect: DOMRect; cy: number }[] = []
        for (const id of conn.sourceIds) {
          const el = matchRefs.current.get(id)
          if (!el) continue
          const r = el.getBoundingClientRect()
          srcs.push({ id, rect: r, cy: r.top + r.height / 2 - wr.top })
        }
        if (srcs.length === 0) continue
        srcs.sort((a, b) => a.cy - b.cy)

        const right = conn.goingRight

        if (srcs.length === 1) {
          /* ── Single source → target: straight or L-shaped line ── */
          const s = srcs[0]
          const x1 = right ? s.rect.right - wr.left : s.rect.left - wr.left
          const x2 = right ? tR.left - wr.left - ARROW_GAP : tR.right - wr.left + ARROW_GAP
          const barX = (x1 + x2) / 2

          if (Math.abs(s.cy - tCY) < 2) {
            // Horizontal
            result.push({
              d: `M${x1} ${s.cy} L${x2} ${s.cy}`,
              key: `ln-${s.id}->${conn.targetId}`,
              arrow: right ? 'right' : 'left',
            })
          } else {
            // L-shape with middle turning point
            result.push({
              d: `M${x1} ${s.cy} L${barX} ${s.cy} L${barX} ${tCY} L${x2} ${tCY}`,
              key: `ln-${s.id}->${conn.targetId}`,
              arrow: right ? 'right' : 'left',
            })
          }
        } else {
          /* ── Two sources → one target: classic bracket shape ──
           *
           *  Going right:           Going left:
           *  src1 ───┐              ┌─── src1
           *          ├──▸ tgt  tgt ◂──┤
           *  src2 ───┘              └─── src2
           */
          const s1 = srcs[0]
          const s2 = srcs[1]

          const x1 = right ? s1.rect.right - wr.left : s1.rect.left - wr.left
          const x2 = right ? tR.left - wr.left - ARROW_GAP : tR.right - wr.left + ARROW_GAP
          const barX = (x1 + x2) / 2

          // Generate a single path for stubs, vertical bar, and merge line
          const pathD = [
            // Stub 1
            `M${x1} ${s1.cy} L${barX} ${s1.cy}`,
            // Stub 2
            `M${x1} ${s2.cy} L${barX} ${s2.cy}`,
            // Vertical connection bar
            `M${barX} ${s1.cy} L${barX} ${s2.cy}`,
            // Horizontal merge line (starting from the bar X aligned at target Y center)
            `M${barX} ${tCY} L${x2} ${tCY}`
          ].join(' ')

          result.push({
            d: pathD,
            key: `bracket-${conn.targetId}`,
            arrow: right ? 'right' : 'left',
          })
        }
      }

      setLines(result)
      rafRef.current = null
    })
  }, [connectors])

  useLayoutEffect(() => {
    recompute()
  }, [recompute])

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const ro = new ResizeObserver(() => recompute())
    ro.observe(wrapper)
    
    const container = containerRef.current
    let mo: MutationObserver | null = null
    if (container) {
      mo = new MutationObserver(() => recompute())
      mo.observe(container, { childList: true, subtree: true })
    }

    window.addEventListener('resize', recompute)
    document.fonts?.ready?.then(recompute).catch(() => {})
    return () => {
      ro.disconnect()
      mo?.disconnect()
      window.removeEventListener('resize', recompute)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [recompute])

  return (
    <div ref={wrapperRef} className="sv-editorial-surface relative mx-auto rounded-[8px] p-4" style={{ minWidth: 980, maxWidth: 1400 }}>
      {/* Match cards in a 7-column grid */}
      <div
        ref={containerRef}
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(7, minmax(140px, 1fr))' }}
      >
        {desktopCols.map((col, i) => (
          <BracketColumn
            key={i}
            label={colLabels[i]}
            matches={col}
            selectedMatchId={selectedMatchId}
            accentColor={accentColor}
            onSelect={onSelect}
            setMatchRef={setMatchRef}
          />
        ))}
      </div>

      {/* SVG overlay for connector lines */}
      {svgSize.w > 0 && (
        <svg
          className="absolute inset-0 pointer-events-none"
          width={svgSize.w}
          height={svgSize.h}
          style={{ zIndex: 5 }}
        >
          <defs>
            <marker id={arrowRId} markerWidth="6" markerHeight="6" refX="6" refY="3" orient="0">
              <path d="M0 0 L6 3 L0 6 Z" fill="#b8b6b1" />
            </marker>
            <marker id={arrowLId} markerWidth="6" markerHeight="6" refX="0" refY="3" orient="0">
              <path d="M6 0 L0 3 L6 6 Z" fill="#b8b6b1" />
            </marker>
          </defs>
          {lines.map(l => (
            <path
              key={l.key}
              d={l.d}
              stroke="#d4d2cd"
              strokeWidth="1.35"
              fill="none"
              markerEnd={
                l.arrow === 'right'
                  ? `url(#${arrowRId})`
                  : l.arrow === 'left'
                    ? `url(#${arrowLId})`
                    : undefined
              }
            />
          ))}
        </svg>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Column + Half helpers
   ───────────────────────────────────────────────────────────────────────────── */

function BracketColumn({
  label,
  matches,
  selectedMatchId,
  accentColor,
  onSelect,
  setMatchRef,
}: {
  label: string
  matches: (BracketMatchType | null)[]
  selectedMatchId: string | null
  accentColor: string
  onSelect: (m: BracketMatchType) => void
  setMatchRef?: (id: string) => (el: HTMLDivElement | null) => void
}) {
  return (
    <div className="flex min-w-[140px] flex-col justify-around gap-3">
      <div
        className="pb-1 text-center text-[10px] uppercase tracking-[0.12em]"
        style={{ color: '#9a9894', fontFamily: 'var(--font-dm-mono), monospace' }}
      >
        {label}
      </div>
      {matches.map((m, i) =>
        m ? (
          <div key={m.id} ref={setMatchRef ? setMatchRef(m.id) : undefined}>
            <BracketMatch
              match={m}
              isSelected={m.id === selectedMatchId}
              accentColor={accentColor}
              onSelect={onSelect}
            />
          </div>
        ) : (
          <div key={i} style={{ minHeight: 56 }} />
        ),
      )}
    </div>
  )
}

function BracketHalf({
  title,
  rounds,
  selectedMatchId,
  accentColor,
  onSelect,
}: {
  title: string
  rounds: { label: string; matches: (BracketMatchType | null)[] }[]
  selectedMatchId: string | null
  accentColor: string
  onSelect: (m: BracketMatchType) => void
}) {
  return (
    <div className="rounded-[8px] border border-sv-divider bg-sv-surface p-3">
      <div
        className="text-[11px] uppercase tracking-[0.12em] pb-3"
        style={{ color: '#1a1a1a', fontFamily: 'var(--font-dm-mono), monospace', fontWeight: 600 }}
      >
        {title}
      </div>
      <div className="grid gap-3 overflow-x-auto" style={{ gridTemplateColumns: 'repeat(3, minmax(130px, 1fr))' }}>
        {rounds.map(r => (
          <BracketColumn
            key={r.label}
            label={r.label}
            matches={r.matches}
            selectedMatchId={selectedMatchId}
            accentColor={accentColor}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}
