'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import { Space } from '@/lib/supabase'

export type AreaDef = {
  key: string
  x: number; y: number; w: number; h: number
  zIndex?: number
  fontSize?: number
  shape?: 'rect' | 'L' | 'T'
  // L字型用
  cutX?: number; cutY?: number; cutW?: number; cutH?: number
}

export type Symbol = {
  id: string
  type: 'door' | 'window' | 'stairs' | 'arrow'
  x: number; y: number; w: number; h: number; rotation?: number
}

type Props = {
  areas: AreaDef[]
  setAreas: (a: AreaDef[]) => void
  symbols: Symbol[]
  setSymbols: (s: Symbol[]) => void
  spaces: Space[]
  counts: Record<string, number>
  editMode: boolean
  viewBox: string
  onSpaceClick: (space: Space) => void
  floorLabel: string
}

const SYMBOL_ICONS: Record<Symbol['type'], string> = {
  door: '🚪', window: '🪟', stairs: '🪜', arrow: '↑'
}

export default function FloorPlanEditor({
  areas, setAreas, symbols, setSymbols,
  spaces, counts, editMode, viewBox, onSpaceClick, floorLabel
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState<{type:'area'|'symbol', index:number, startX:number, startY:number, origX:number, origY:number}|null>(null)
  const [resizing, setResizing] = useState<{type:'area'|'symbol', index:number, startX:number, startY:number, origW:number, origH:number}|null>(null)
  const [selected, setSelected] = useState<{type:'area'|'symbol', index:number}|null>(null)
  const [addSymbolType, setAddSymbolType] = useState<Symbol['type']|null>(null)

  const vbParts = viewBox.split(' ').map(Number)
  const vbW = vbParts[2], vbH = vbParts[3]

  const svgCoords = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return {
      x: ((clientX - rect.left) / rect.width) * vbW,
      y: ((clientY - rect.top) / rect.height) * vbH,
    }
  }, [vbW, vbH])

  const onAreaPointerDown = (e: React.PointerEvent, index: number) => {
    if (!editMode) return
    e.stopPropagation()
    setSelected({type:'area', index})
    const { x, y } = svgCoords(e.clientX, e.clientY)
    setDragging({ type:'area', index, startX: x, startY: y, origX: areas[index].x, origY: areas[index].y })
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const onAreaResizeDown = (e: React.PointerEvent, index: number) => {
    if (!editMode) return
    e.stopPropagation()
    const { x, y } = svgCoords(e.clientX, e.clientY)
    setResizing({ type:'area', index, startX: x, startY: y, origW: areas[index].w, origH: areas[index].h })
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const onSymbolPointerDown = (e: React.PointerEvent, index: number) => {
    if (!editMode) return
    e.stopPropagation()
    setSelected({type:'symbol', index})
    const { x, y } = svgCoords(e.clientX, e.clientY)
    setDragging({ type:'symbol', index, startX: x, startY: y, origX: symbols[index].x, origY: symbols[index].y })
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!editMode) return
    const { x, y } = svgCoords(e.clientX, e.clientY)
    if (dragging) {
      const dx = x - dragging.startX, dy = y - dragging.startY
      if (dragging.type === 'area') {
        setAreas(areas.map((a, i) => i === dragging.index
          ? { ...a, x: Math.max(0, Math.min(vbW - a.w, Math.round(dragging.origX + dx))), y: Math.max(0, Math.min(vbH - a.h, Math.round(dragging.origY + dy))) }
          : a))
      } else {
        setSymbols(symbols.map((s, i) => i === dragging.index
          ? { ...s, x: Math.round(dragging.origX + dx), y: Math.round(dragging.origY + dy) }
          : s))
      }
    }
    if (resizing) {
      const dx = x - resizing.startX, dy = y - resizing.startY
      if (resizing.type === 'area') {
        setAreas(areas.map((a, i) => i === resizing.index
          ? { ...a, w: Math.max(6, Math.round(resizing.origW + dx)), h: Math.max(5, Math.round(resizing.origH + dy)) }
          : a))
      } else {
        setSymbols(symbols.map((s, i) => i === resizing.index
          ? { ...s, w: Math.max(3, Math.round(resizing.origW + dx)), h: Math.max(3, Math.round(resizing.origH + dy)) }
          : s))
      }
    }
  }

  const onPointerUp = () => { setDragging(null); setResizing(null) }

  const onSvgClick = (e: React.MouseEvent) => {
    if (!editMode || !addSymbolType) return
    const { x, y } = svgCoords(e.clientX, e.clientY)
    setSymbols([...symbols, { id: Date.now().toString(), type: addSymbolType, x: Math.round(x - 4), y: Math.round(y - 4), w: 8, h: 8 }])
    setAddSymbolType(null)
  }

  const addNewArea = () => {
    const maxZ = Math.max(0, ...areas.map(a => a.zIndex || 0))
    setAreas([...areas, { key: '新スペース', x: 10, y: 10, w: 20, h: 15, zIndex: maxZ + 1, fontSize: 2 }])
    setSelected({ type: 'area', index: areas.length })
  }

  const deleteSelected = () => {
    if (!selected) return
    if (selected.type === 'area') {
      setAreas(areas.filter((_, i) => i !== selected.index))
    } else {
      setSymbols(symbols.filter((_, i) => i !== selected.index))
    }
    setSelected(null)
  }

  const bringForward = () => {
    if (!selected || selected.type !== 'area') return
    const cur = areas[selected.index].zIndex || 0
    setAreas(areas.map((a, i) => i === selected.index ? { ...a, zIndex: cur + 1 } : a))
  }

  const sendBackward = () => {
    if (!selected || selected.type !== 'area') return
    const cur = areas[selected.index].zIndex || 0
    setAreas(areas.map((a, i) => i === selected.index ? { ...a, zIndex: Math.max(0, cur - 1) } : a))
  }

  const changeFontSize = (delta: number) => {
    if (!selected || selected.type !== 'area') return
    const cur = areas[selected.index].fontSize || 2
    setAreas(areas.map((a, i) => i === selected.index ? { ...a, fontSize: Math.max(1, Math.min(5, cur + delta)) } : a))
  }

  const updateSelectedName = (name: string) => {
    if (!selected || selected.type !== 'area') return
    setAreas(areas.map((a, i) => i === selected.index ? { ...a, key: name } : a))
  }

  const rotateSymbol = () => {
    if (!selected || selected.type !== 'symbol') return
    setSymbols(symbols.map((s, i) => i === selected.index ? { ...s, rotation: ((s.rotation || 0) + 90) % 360 } : s))
  }

  const getSpace = (name: string) => spaces.find(s => s.name === name)
  const sortedAreas = [...areas].map((a, i) => ({ ...a, _origIdx: i })).sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))

  return (
    <div>
      {/* 編集ツールバー */}
      {editMode && (
        <div style={{ background: '#1c1917', borderRadius: 10, padding: '10px 12px', marginBottom: 8, border: '1px solid #44403c' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            <button onClick={addNewArea}
              style={{ background: '#7c3aed', border: 'none', color: 'white', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>
              ＋ スペース追加
            </button>
            {(['door','window','stairs','arrow'] as Symbol['type'][]).map(t => (
              <button key={t} onClick={() => setAddSymbolType(addSymbolType === t ? null : t)}
                style={{ background: addSymbolType === t ? '#f97316' : '#292524', border: 'none', color: 'white', borderRadius: 6, padding: '5px 8px', fontSize: 12, cursor: 'pointer' }}>
                {SYMBOL_ICONS[t]}追加
              </button>
            ))}
          </div>
          {addSymbolType && (
            <p style={{ color: '#f97316', fontSize: 11, margin: '0 0 8px' }}>図面内をタップして{SYMBOL_ICONS[addSymbolType]}を配置</p>
          )}
          {/* 選択中の操作 */}
          {selected?.type === 'area' && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                value={areas[selected.index]?.key || ''}
                onChange={e => updateSelectedName(e.target.value)}
                style={{ background: '#292524', color: 'white', border: '1px solid #57534e', borderRadius: 6, padding: '4px 8px', fontSize: 12, width: 120 }}
                placeholder="スペース名"
              />
              <button onClick={bringForward} style={{ background: '#292524', border: 'none', color: 'white', borderRadius: 6, padding: '5px 8px', fontSize: 11, cursor: 'pointer' }}>↑前面</button>
              <button onClick={sendBackward} style={{ background: '#292524', border: 'none', color: 'white', borderRadius: 6, padding: '5px 8px', fontSize: 11, cursor: 'pointer' }}>↓背面</button>
              <button onClick={() => changeFontSize(0.3)} style={{ background: '#292524', border: 'none', color: 'white', borderRadius: 6, padding: '5px 8px', fontSize: 11, cursor: 'pointer' }}>A+</button>
              <button onClick={() => changeFontSize(-0.3)} style={{ background: '#292524', border: 'none', color: 'white', borderRadius: 6, padding: '5px 8px', fontSize: 11, cursor: 'pointer' }}>A-</button>
              <button onClick={deleteSelected} style={{ background: '#7f1d1d', border: 'none', color: 'white', borderRadius: 6, padding: '5px 8px', fontSize: 11, cursor: 'pointer' }}>🗑削除</button>
            </div>
          )}
          {selected?.type === 'symbol' && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={rotateSymbol} style={{ background: '#292524', border: 'none', color: 'white', borderRadius: 6, padding: '5px 8px', fontSize: 11, cursor: 'pointer' }}>↻回転</button>
              <button onClick={deleteSelected} style={{ background: '#7f1d1d', border: 'none', color: 'white', borderRadius: 6, padding: '5px 8px', fontSize: 11, cursor: 'pointer' }}>🗑削除</button>
            </div>
          )}
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={viewBox}
        width="100%"
        style={{ display: 'block', border: '1px solid #44403c', borderRadius: 8, touchAction: editMode ? 'none' : 'auto', cursor: addSymbolType ? 'crosshair' : 'default' }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onSvgClick}
      >
        <rect x="0" y="0" width={vbW} height={vbH} fill="#111" rx="2"/>

        {/* エリア（zIndex順に描画） */}
        {sortedAreas.map((a) => {
          const idx = a._origIdx
          const sp = getSpace(a.key)
          const count = sp ? (counts[sp.id] || 0) : 0
          const color = sp?.color || '#6b7280'
          const isSelected = selected?.type === 'area' && selected.index === idx
          const fs = a.fontSize || 2

          return (
            <g key={idx}>
              <rect
                x={a.x} y={a.y} width={a.w} height={a.h}
                fill={editMode ? (isSelected ? color + '66' : '#1c1917') : (color + '33')}
                stroke={isSelected ? '#fff' : (editMode ? '#f97316' : color)}
                strokeWidth={isSelected ? 1 : 0.5}
                rx="1"
                style={{ cursor: editMode ? 'grab' : 'pointer' }}
                onPointerDown={e => onAreaPointerDown(e, idx)}
                onClick={e => { if (!editMode && sp) { e.stopPropagation(); onSpaceClick(sp) } }}
              />
              {/* テキスト */}
              <text
                x={a.x + a.w/2} y={a.y + a.h/2 - (count>0&&!editMode ? fs*0.8 : 0)}
                textAnchor="middle" dominantBaseline="middle"
                fill={editMode ? '#a8a29e' : 'white'}
                fontSize={fs} fontWeight="500"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >{a.key}</text>
              {count > 0 && !editMode && (
                <text x={a.x+a.w/2} y={a.y+a.h/2+fs*1.4} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize={fs*0.85} style={{ pointerEvents:'none' }}>📷{count}</text>
              )}
              {/* リサイズハンドル */}
              {editMode && (
                <rect x={a.x+a.w-3} y={a.y+a.h-3} width={4} height={4} fill="#f97316" rx="0.5"
                  style={{ cursor: 'se-resize' }} onPointerDown={e => onAreaResizeDown(e, idx)} />
              )}
            </g>
          )
        })}

        {/* シンボル */}
        {symbols.map((sym, idx) => {
          const isSelected = selected?.type === 'symbol' && selected.index === idx
          const cx = sym.x + sym.w/2, cy = sym.y + sym.h/2
          const rot = sym.rotation || 0
          return (
            <g key={sym.id} transform={`rotate(${rot} ${cx} ${cy})`}
              onPointerDown={e => onSymbolPointerDown(e, idx)}
              style={{ cursor: editMode ? 'grab' : 'default' }}>
              {sym.type === 'door' && (
                <>
                  <rect x={sym.x} y={sym.y} width={sym.w} height={1} fill="white" opacity="0.8"/>
                  <path d={`M${sym.x} ${sym.y+1} Q${sym.x+sym.w} ${sym.y+1} ${sym.x+sym.w} ${sym.y+sym.h}`} fill="none" stroke="white" strokeWidth="0.5" opacity="0.6"/>
                </>
              )}
              {sym.type === 'window' && (
                <>
                  <rect x={sym.x} y={sym.y+sym.h/2-0.5} width={sym.w} height={1} fill="white" opacity="0.8"/>
                  <line x1={sym.x+sym.w*0.33} y1={sym.y+sym.h/2-1.5} x2={sym.x+sym.w*0.33} y2={sym.y+sym.h/2+1.5} stroke="white" strokeWidth="0.5" opacity="0.6"/>
                  <line x1={sym.x+sym.w*0.66} y1={sym.y+sym.h/2-1.5} x2={sym.x+sym.w*0.66} y2={sym.y+sym.h/2+1.5} stroke="white" strokeWidth="0.5" opacity="0.6"/>
                </>
              )}
              {sym.type === 'stairs' && (
                [0,1,2,3].map(i => (
                  <line key={i} x1={sym.x} y1={sym.y+sym.h*(i/4)} x2={sym.x+sym.w} y2={sym.y+sym.h*(i/4)} stroke="white" strokeWidth="0.5" opacity="0.6"/>
                ))
              )}
              {sym.type === 'arrow' && (
                <path d={`M${cx} ${sym.y} L${sym.x+sym.w} ${sym.y+sym.h} L${cx} ${sym.y+sym.h*0.7} L${sym.x} ${sym.y+sym.h} Z`} fill="white" opacity="0.7"/>
              )}
              {isSelected && editMode && (
                <rect x={sym.x-0.5} y={sym.y-0.5} width={sym.w+1} height={sym.h+1} fill="none" stroke="#fff" strokeWidth="0.5" strokeDasharray="1 1"/>
              )}
              {/* シンボルリサイズハンドル */}
              {editMode && (
                <rect x={sym.x+sym.w-2} y={sym.y+sym.h-2} width={3} height={3} fill="#f97316" rx="0.3"
                  style={{ cursor: 'se-resize' }}
                  onPointerDown={e => {
                    e.stopPropagation()
                    const {x,y} = svgCoords(e.clientX, e.clientY)
                    setResizing({type:'symbol', index:idx, startX:x, startY:y, origW:sym.w, origH:sym.h})
                    ;(e.target as Element).setPointerCapture(e.pointerId)
                  }}
                />
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
