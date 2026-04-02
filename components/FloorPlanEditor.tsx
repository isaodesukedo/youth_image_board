'use client'
import { useRef, useState, useCallback } from 'react'
import { Space } from '@/lib/supabase'

export type AreaDef = { key: string; x: number; y: number; w: number; h: number }

type Props = {
  areas: AreaDef[]
  setAreas: (a: AreaDef[]) => void
  spaces: Space[]
  counts: Record<string, number>
  editMode: boolean
  viewBox: string
  onSpaceClick: (space: Space) => void
}

export default function FloorPlanEditor({ areas, setAreas, spaces, counts, editMode, viewBox, onSpaceClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState<{ index: number; startX: number; startY: number; origX: number; origY: number } | null>(null)
  const [resizing, setResizing] = useState<{ index: number; startX: number; startY: number; origW: number; origH: number } | null>(null)

  const vbParts = viewBox.split(' ').map(Number)
  const vbW = vbParts[2]
  const vbH = vbParts[3]

  const svgCoords = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return {
      x: ((clientX - rect.left) / rect.width) * vbW,
      y: ((clientY - rect.top) / rect.height) * vbH,
    }
  }, [vbW, vbH])

  const onMoveStart = (e: React.PointerEvent, index: number) => {
    if (!editMode) return
    e.stopPropagation()
    const { x, y } = svgCoords(e.clientX, e.clientY)
    setDragging({ index, startX: x, startY: y, origX: areas[index].x, origY: areas[index].y })
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const onResizeStart = (e: React.PointerEvent, index: number) => {
    if (!editMode) return
    e.stopPropagation()
    const { x, y } = svgCoords(e.clientX, e.clientY)
    setResizing({ index, startX: x, startY: y, origW: areas[index].w, origH: areas[index].h })
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!editMode) return
    const { x, y } = svgCoords(e.clientX, e.clientY)
    if (dragging) {
      const dx = x - dragging.startX
      const dy = y - dragging.startY
      const next = areas.map((a, i) => i === dragging.index
        ? { ...a, x: Math.max(0, Math.min(vbW - a.w, Math.round(dragging.origX + dx))), y: Math.max(0, Math.min(vbH - a.h, Math.round(dragging.origY + dy))) }
        : a)
      setAreas(next)
    }
    if (resizing) {
      const dx = x - resizing.startX
      const dy = y - resizing.startY
      const next = areas.map((a, i) => i === resizing.index
        ? { ...a, w: Math.max(8, Math.round(resizing.origW + dx)), h: Math.max(6, Math.round(resizing.origH + dy)) }
        : a)
      setAreas(next)
    }
  }

  const onPointerUp = () => {
    setDragging(null)
    setResizing(null)
  }

  const getSpace = (name: string) => spaces.find(s => s.name === name)

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      width="100%"
      style={{ display: 'block', border: '1px solid #44403c', borderRadius: 8, touchAction: editMode ? 'none' : 'auto' }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <rect x="0" y="0" width={vbW} height={vbH} fill="#111" rx="2"/>
      {areas.map((a, idx) => {
        const sp = getSpace(a.key)
        const count = sp ? (counts[sp.id] || 0) : 0
        const color = sp?.color || '#555'
        const isActive = dragging?.index === idx || resizing?.index === idx

        return (
          <g key={a.key}>
            {/* メインエリア */}
            <rect
              x={a.x} y={a.y} width={a.w} height={a.h}
              fill={editMode ? (isActive ? color + '55' : '#1c1917') : (color + '33')}
              stroke={editMode ? '#f97316' : color}
              strokeWidth={editMode ? 0.8 : 0.5}
              rx="1"
              style={{ cursor: editMode ? 'grab' : 'pointer' }}
              onPointerDown={e => editMode ? onMoveStart(e, idx) : undefined}
              onClick={() => { if (!editMode && sp) onSpaceClick(sp) }}
            />

            {/* テキスト（クリック透過） */}
            <text
              x={a.x + a.w / 2}
              y={a.y + a.h / 2 - (count > 0 && !editMode ? 2 : 0)}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={editMode ? '#a8a29e' : 'white'}
              fontSize="2"
              fontWeight="500"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {a.key}
            </text>

            {count > 0 && !editMode && (
              <text x={a.x + a.w/2} y={a.y + a.h/2 + 3.5} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="1.8" style={{ pointerEvents: 'none' }}>
                📷{count}
              </text>
            )}

            {/* リサイズハンドル（編集モード時のみ） */}
            {editMode && (
              <>
                {/* 右下コーナー：リサイズ */}
                <rect
                  x={a.x + a.w - 3} y={a.y + a.h - 3} width={4} height={4}
                  fill="#f97316" rx="0.5"
                  style={{ cursor: 'se-resize' }}
                  onPointerDown={e => onResizeStart(e, idx)}
                />
                {/* 移動アイコン表示 */}
                <text x={a.x + 1.5} y={a.y + 2.5} fill="#f97316" fontSize="2" style={{ pointerEvents: 'none' }}>✥</text>
              </>
            )}
          </g>
        )
      })}
    </svg>
  )
}
