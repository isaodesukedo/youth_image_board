'use client'
import { useRef, useState, useCallback } from 'react'
import { Space } from '@/lib/supabase'

export type Point = { x: number; y: number }

export type AreaDef = {
  key: string
  x: number; y: number; w: number; h: number
  zIndex?: number
  fontSize?: number
  // ポリゴン形状（設定されていれば長方形の代わりに使用）
  // 座標はエリアのx,y基準の相対座標
  polygon?: Point[]
}

export type Symbol = {
  id: string
  type: 'door' | 'window' | 'stairs' | 'arrow'
  x: number; y: number; w: number; h: number; rotation?: number
}

type Props = {
  floorId: string
  areas: AreaDef[]
  setAreas: (a: AreaDef[]) => void
  symbols: Symbol[]
  setSymbols: (s: Symbol[]) => void
  spaces: Space[]
  counts: Record<string, number>
  editMode: boolean
  setEditMode: (v: boolean) => void
  viewBox: string
  onSpaceClick: (space: Space) => void
  floorLabel: string
}

const SYMBOL_ICONS: Record<Symbol['type'], string> = {
  door: '🚪', window: '🪟', stairs: '🪜', arrow: '↑'
}

function getAreaColor(name: string, spaces: Space[]) {
  if (name === '未定' || name === '' || name === '新スペース') return '#6b7280'
  const sp = spaces.find(s => s.name === name)
  return sp?.color || '#6b7280'
}

function isUndefined(name: string) {
  return name === '未定' || name === '' || name === '新スペース'
}

// ポリゴンの絶対座標を生成
function absPolygon(a: AreaDef): Point[] {
  if (a.polygon && a.polygon.length > 0) {
    return a.polygon.map(p => ({ x: a.x + p.x, y: a.y + p.y }))
  }
  return [
    { x: a.x, y: a.y },
    { x: a.x + a.w, y: a.y },
    { x: a.x + a.w, y: a.y + a.h },
    { x: a.x, y: a.y + a.h },
  ]
}

function pointsToStr(pts: Point[]) {
  return pts.map(p => `${p.x},${p.y}`).join(' ')
}

function centroid(pts: Point[]) {
  const x = pts.reduce((s, p) => s + p.x, 0) / pts.length
  const y = pts.reduce((s, p) => s + p.y, 0) / pts.length
  return { x, y }
}

export default function FloorPlanEditor({
  floorId, areas, setAreas, symbols, setSymbols,
  spaces, counts, editMode, setEditMode, viewBox, onSpaceClick, floorLabel
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState<{type:'area'|'symbol'|'vertex', index:number, vertexIdx?:number, startX:number, startY:number, origX:number, origY:number, origPolygon?:Point[]}|null>(null)
  const [resizing, setResizing] = useState<{type:'area'|'symbol', index:number, startX:number, startY:number, origW:number, origH:number}|null>(null)
  const [selected, setSelected] = useState<{type:'area'|'symbol', index:number}|null>(null)
  const [addSymbolType, setAddSymbolType] = useState<Symbol['type']|null>(null)
  const [polygonMode, setPolygonMode] = useState(false)
  const [polyPoints, setPolyPoints] = useState<Point[]>([])

  const vbParts = viewBox.split(' ').map(Number)
  const vbW = vbParts[2], vbH = vbParts[3]

  const svgCoords = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return {
      x: Math.round(((clientX - rect.left) / rect.width) * vbW * 2) / 2,
      y: Math.round(((clientY - rect.top) / rect.height) * vbH * 2) / 2,
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

  const onVertexPointerDown = (e: React.PointerEvent, areaIdx: number, vertexIdx: number) => {
    if (!editMode) return
    e.stopPropagation()
    const { x, y } = svgCoords(e.clientX, e.clientY)
    const poly = areas[areaIdx].polygon || []
    setDragging({ type:'vertex', index: areaIdx, vertexIdx, startX: x, startY: y, origX: x, origY: y, origPolygon: [...poly] })
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
      } else if (dragging.type === 'symbol') {
        setSymbols(symbols.map((s, i) => i === dragging.index
          ? { ...s, x: Math.round(dragging.origX + dx), y: Math.round(dragging.origY + dy) }
          : s))
      } else if (dragging.type === 'vertex' && dragging.vertexIdx !== undefined && dragging.origPolygon) {
        const newPoly = dragging.origPolygon.map((p, i) =>
          i === dragging.vertexIdx ? { x: Math.round(p.x + dx), y: Math.round(p.y + dy) } : p
        )
        setAreas(areas.map((a, i) => i === dragging.index ? { ...a, polygon: newPoly } : a))
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
    if (!editMode) return
    const { x, y } = svgCoords(e.clientX, e.clientY)
    if (addSymbolType) {
      setSymbols([...symbols, { id: Date.now().toString(), type: addSymbolType, x: Math.round(x - 4), y: Math.round(y - 4), w: 8, h: 8 }])
      setAddSymbolType(null)
      return
    }
    if (polygonMode) {
      setPolyPoints(prev => [...prev, { x, y }])
    }
  }

  const onSvgDblClick = (e: React.MouseEvent) => {
    if (!editMode || !polygonMode || polyPoints.length < 3) return
    e.preventDefault()
    // ポリゴンを相対座標に変換
    const minX = Math.min(...polyPoints.map(p => p.x))
    const minY = Math.min(...polyPoints.map(p => p.y))
    const maxX = Math.max(...polyPoints.map(p => p.x))
    const maxY = Math.max(...polyPoints.map(p => p.y))
    const relPoly = polyPoints.map(p => ({ x: p.x - minX, y: p.y - minY }))
    const newArea: AreaDef = {
      key: '新スペース', x: minX, y: minY,
      w: maxX - minX, h: maxY - minY,
      zIndex: 1, fontSize: 2, polygon: relPoly
    }
    setAreas([...areas, newArea])
    setPolyPoints([])
    setPolygonMode(false)
    setSelected({ type: 'area', index: areas.length })
  }

  const addNewArea = () => {
    const maxZ = Math.max(0, ...areas.map(a => a.zIndex || 0))
    setAreas([...areas, { key: '新スペース', x: 10, y: 10, w: 20, h: 15, zIndex: maxZ + 1, fontSize: 2 }])
    setSelected({ type: 'area', index: areas.length })
  }

  const deleteSelected = () => {
    if (!selected) return
    if (selected.type === 'area') setAreas(areas.filter((_, i) => i !== selected.index))
    else setSymbols(symbols.filter((_, i) => i !== selected.index))
    setSelected(null)
  }

  const addVertex = () => {
    if (!selected || selected.type !== 'area') return
    const a = areas[selected.index]
    const poly = a.polygon || [
      {x:0,y:0},{x:a.w,y:0},{x:a.w,y:a.h},{x:0,y:a.h}
    ]
    // 最後の頂点と最初の頂点の中間に追加
    const mid = { x: (poly[poly.length-1].x + poly[0].x)/2, y: (poly[poly.length-1].y + poly[0].y)/2 }
    setAreas(areas.map((ar, i) => i === selected.index ? { ...ar, polygon: [...poly, mid] } : ar))
  }

  const resetToRect = () => {
    if (!selected || selected.type !== 'area') return
    setAreas(areas.map((a, i) => i === selected.index ? { ...a, polygon: undefined } : a))
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
    setAreas(areas.map((a, i) => i === selected.index ? { ...a, fontSize: Math.max(1, Math.min(6, +(cur + delta).toFixed(1))) } : a))
  }

  const updateSelectedName = (name: string) => {
    if (!selected || selected.type !== 'area') return
    setAreas(areas.map((a, i) => i === selected.index ? { ...a, key: name } : a))
  }

  const rotateSymbol = () => {
    if (!selected || selected.type !== 'symbol') return
    setSymbols(symbols.map((s, i) => i === selected.index ? { ...s, rotation: ((s.rotation || 0) + 90) % 360 } : s))
  }

  const sortedAreas = [...areas].map((a, i) => ({ ...a, _origIdx: i })).sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))

  const getSpace = (name: string) => spaces.find(s => s.name === name)

  return (
    <div style={{ marginBottom: 16 }}>
      {/* フロアヘッダー + 編集ボタン */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <p style={{ color: '#78716c', fontSize: 11 }}>{floorLabel}</p>
        <button onClick={() => { setEditMode(!editMode); setSelected(null); setPolygonMode(false); setPolyPoints([]) }}
          style={{ background: editMode ? '#f97316' : '#292524', border: 'none', color: 'white', borderRadius: 8, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: editMode ? 600 : 400 }}>
          {editMode ? '✅ 完了' : '✏️ 編集'}
        </button>
      </div>

      {/* 編集ツールバー */}
      {editMode && (
        <div style={{ background: '#1c1917', borderRadius: 10, padding: '10px 12px', marginBottom: 8, border: '1px solid #44403c' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            <button onClick={addNewArea}
              style={{ background: '#7c3aed', border: 'none', color: 'white', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>
              ＋ 長方形追加
            </button>
            <button onClick={() => { setPolygonMode(!polygonMode); setPolyPoints([]) }}
              style={{ background: polygonMode ? '#f97316' : '#292524', border: 'none', color: 'white', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>
              {polygonMode ? '⬡ 描画中（ダブルタップで確定）' : '⬡ 自由形状追加'}
            </button>
            {(['door','window','stairs','arrow'] as Symbol['type'][]).map(t => (
              <button key={t} onClick={() => setAddSymbolType(addSymbolType === t ? null : t)}
                style={{ background: addSymbolType === t ? '#f97316' : '#292524', border: 'none', color: 'white', borderRadius: 6, padding: '5px 8px', fontSize: 12, cursor: 'pointer' }}>
                {SYMBOL_ICONS[t]}
              </button>
            ))}
          </div>

          {polygonMode && polyPoints.length > 0 && (
            <p style={{ color: '#f97316', fontSize: 11, margin: '0 0 8px' }}>
              {polyPoints.length}点追加済み。ダブルタップで確定（3点以上必要）
            </p>
          )}

          {/* 選択中エリアの操作 */}
          {selected?.type === 'area' && areas[selected.index] && (
            <div style={{ borderTop: '1px solid #292524', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ color: '#a8a29e', fontSize: 11, flexShrink: 0 }}>名前：</span>
                <input
                  value={areas[selected.index].key}
                  onChange={e => updateSelectedName(e.target.value)}
                  style={{ background: '#292524', color: 'white', border: '1px solid #57534e', borderRadius: 6, padding: '4px 8px', fontSize: 12, width: 130 }}
                  placeholder="スペース名（改行: ↵）"
                />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={bringForward} style={btnStyle}>↑前面</button>
                <button onClick={sendBackward} style={btnStyle}>↓背面</button>
                <button onClick={() => changeFontSize(0.5)} style={btnStyle}>A+</button>
                <button onClick={() => changeFontSize(-0.5)} style={btnStyle}>A-</button>
                <button onClick={addVertex} style={btnStyle}>頂点追加</button>
                <button onClick={resetToRect} style={btnStyle}>長方形に戻す</button>
                <button onClick={deleteSelected} style={{ ...btnStyle, background: '#7f1d1d' }}>🗑削除</button>
              </div>
            </div>
          )}
          {selected?.type === 'symbol' && (
            <div style={{ borderTop: '1px solid #292524', paddingTop: 8, display: 'flex', gap: 6 }}>
              <button onClick={rotateSymbol} style={btnStyle}>↻回転</button>
              <button onClick={deleteSelected} style={{ ...btnStyle, background: '#7f1d1d' }}>🗑削除</button>
            </div>
          )}
        </div>
      )}

      {/* SVG */}
      <svg
        ref={svgRef}
        viewBox={viewBox}
        width="100%"
        style={{ display: 'block', border: '1px solid #44403c', borderRadius: 8, touchAction: editMode ? 'none' : 'auto', cursor: (addSymbolType || polygonMode) ? 'crosshair' : 'default' }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onSvgClick}
        onDoubleClick={onSvgDblClick}
      >
        <rect x="0" y="0" width={vbW} height={vbH} fill="#111" rx="2"/>

        {/* ポリゴン描画中のプレビュー */}
        {polygonMode && polyPoints.length > 0 && (
          <>
            <polyline points={pointsToStr(polyPoints)} fill="none" stroke="#f97316" strokeWidth="0.5" strokeDasharray="1 1"/>
            {polyPoints.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="1" fill="#f97316"/>
            ))}
          </>
        )}

        {/* エリア（zIndex順） */}
        {sortedAreas.map((a) => {
          const idx = a._origIdx
          const sp = getSpace(a.key)
          const count = sp ? (counts[sp.id] || 0) : 0
          const color = getAreaColor(a.key, spaces)
          const undef = isUndefined(a.key)
          const isSelected = selected?.type === 'area' && selected.index === idx
          const fs = a.fontSize || 2
          const pts = absPolygon(a)
          const ctr = centroid(pts)
          // 改行対応：\nで分割
          const lines = a.key.split('\n')

          return (
            <g key={idx}>
              <polygon
                points={pointsToStr(pts)}
                fill={undef ? '#3f3f46' : (editMode ? (isSelected ? color+'55' : '#1c1917') : color+'33')}
                stroke={isSelected ? '#fff' : (undef ? '#6b7280' : (editMode ? '#f97316' : color))}
                strokeWidth={isSelected ? 0.8 : 0.5}
                strokeDasharray={undef ? '2 1' : 'none'}
                style={{ cursor: editMode ? 'grab' : 'pointer' }}
                onPointerDown={e => onAreaPointerDown(e, idx)}
                onClick={e => { if (!editMode && sp) { e.stopPropagation(); onSpaceClick(sp) } }}
              />
              {/* テキスト（改行対応） */}
              {lines.map((line, li) => (
                <text
                  key={li}
                  x={ctr.x}
                  y={ctr.y + (li - (lines.length-1)/2) * (fs * 1.4) - (count>0&&!editMode ? fs*0.7 : 0)}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={undef ? '#9ca3af' : (editMode ? '#a8a29e' : 'white')}
                  fontSize={fs} fontWeight="500"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >{line}</text>
              ))}
              {count > 0 && !editMode && (
                <text x={ctr.x} y={ctr.y + (lines.length * fs * 0.8)}
                  textAnchor="middle" dominantBaseline="middle" fill={color} fontSize={fs*0.85}
                  style={{ pointerEvents:'none' }}>📷{count}</text>
              )}
              {/* リサイズハンドル（長方形のみ） */}
              {editMode && !a.polygon && (
                <rect x={a.x+a.w-3} y={a.y+a.h-3} width={4} height={4} fill="#f97316" rx="0.5"
                  style={{ cursor: 'se-resize' }} onPointerDown={e => onAreaResizeDown(e, idx)} />
              )}
              {/* ポリゴン頂点ハンドル */}
              {editMode && isSelected && a.polygon && pts.map((p, vi) => (
                <circle key={vi} cx={p.x} cy={p.y} r="1.5" fill="#f97316" stroke="white" strokeWidth="0.3"
                  style={{ cursor: 'move' }}
                  onPointerDown={e => onVertexPointerDown(e, idx, vi)} />
              ))}
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
                  <rect x={sym.x} y={sym.y} width={sym.w} height={0.8} fill="white" opacity="0.9"/>
                  <path d={`M${sym.x} ${sym.y+0.8} Q${sym.x+sym.w} ${sym.y+0.8} ${sym.x+sym.w} ${sym.y+sym.h}`} fill="none" stroke="white" strokeWidth="0.5" opacity="0.7"/>
                </>
              )}
              {sym.type === 'window' && (
                <>
                  <rect x={sym.x} y={sym.y+sym.h/2-0.5} width={sym.w} height={1} fill="white" opacity="0.9"/>
                  <line x1={sym.x+sym.w*0.33} y1={sym.y+sym.h/2-1.5} x2={sym.x+sym.w*0.33} y2={sym.y+sym.h/2+1.5} stroke="white" strokeWidth="0.5" opacity="0.7"/>
                  <line x1={sym.x+sym.w*0.66} y1={sym.y+sym.h/2-1.5} x2={sym.x+sym.w*0.66} y2={sym.y+sym.h/2+1.5} stroke="white" strokeWidth="0.5" opacity="0.7"/>
                </>
              )}
              {sym.type === 'stairs' && (
                [0,1,2,3,4].map(i => (
                  <line key={i} x1={sym.x} y1={sym.y+sym.h*(i/4)} x2={sym.x+sym.w} y2={sym.y+sym.h*(i/4)} stroke="white" strokeWidth="0.5" opacity="0.6"/>
                ))
              )}
              {sym.type === 'arrow' && (
                <path d={`M${cx} ${sym.y} L${sym.x+sym.w} ${sym.y+sym.h} L${cx} ${sym.y+sym.h*0.65} L${sym.x} ${sym.y+sym.h} Z`} fill="white" opacity="0.8"/>
              )}
              {isSelected && editMode && (
                <rect x={sym.x-0.5} y={sym.y-0.5} width={sym.w+1} height={sym.h+1} fill="none" stroke="#fff" strokeWidth="0.5" strokeDasharray="1 1"/>
              )}
              {editMode && (
                <rect x={sym.x+sym.w-2} y={sym.y+sym.h-2} width={3} height={3} fill="#f97316" rx="0.3"
                  style={{ cursor: 'se-resize' }}
                  onPointerDown={e => {
                    e.stopPropagation()
                    const {x,y} = svgCoords(e.clientX, e.clientY)
                    setResizing({type:'symbol', index:idx, startX:x, startY:y, origW:sym.w, origH:sym.h})
                    ;(e.target as Element).setPointerCapture(e.pointerId)
                  }} />
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  background: '#292524', border: 'none', color: 'white',
  borderRadius: 6, padding: '5px 8px', fontSize: 11, cursor: 'pointer'
}
