'use client'
import { useRef, useState, useCallback } from 'react'
import { Space } from '@/lib/supabase'

export type Point = { x: number; y: number }
export type AreaDef = {
  key: string
  x: number; y: number; w: number; h: number
  zIndex?: number
  fontSize?: number
  polygon?: Point[]
}
export type LineShape = {
  id: string
  x1: number; y1: number; x2: number; y2: number
  strokeWidth?: number
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
  lines: LineShape[]
  setLines: (l: LineShape[]) => void
  symbols: Symbol[]
  setSymbols: (s: Symbol[]) => void
  spaces: Space[]
  counts: Record<string, number>
  editMode: boolean
  setEditMode: (v: boolean) => void
  viewBox: string
  onSpaceClick: (space: Space) => void
  onAreaNameChange: (oldName: string, newName: string) => void
  onAreaAdd: (key: string, floor: number) => void
  onAreaDelete: (key: string) => void
  floor: number
  floorLabel: string
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
}

function getColor(name: string, spaces: Space[]) {
  if (!name || name === '未定' || name === '新スペース' || name === '新エリア') return '#6b7280'
  return spaces.find(s => s.name === name)?.color || '#6b7280'
}
function isUndef(name: string) {
  return !name || name === '未定' || name === '新スペース' || name === '新エリア'
}
function absPolygon(a: AreaDef): Point[] {
  if (a.polygon?.length) return a.polygon.map(p => ({ x: a.x + p.x, y: a.y + p.y }))
  return [{ x: a.x, y: a.y }, { x: a.x+a.w, y: a.y }, { x: a.x+a.w, y: a.y+a.h }, { x: a.x, y: a.y+a.h }]
}
function ptStr(pts: Point[]) { return pts.map(p => `${p.x},${p.y}`).join(' ') }
function centroid(pts: Point[]) {
  return { x: pts.reduce((s,p)=>s+p.x,0)/pts.length, y: pts.reduce((s,p)=>s+p.y,0)/pts.length }
}

const btn: React.CSSProperties = { background:'#f1f5f9', border:'1px solid #e2e8f0', color:'#475569', borderRadius:8, padding:'5px 10px', fontSize:11, cursor:'pointer', fontWeight:500 }
const btnActive: React.CSSProperties = { ...btn, background:'#fff7ed', border:'1px solid #fed7aa', color:'#ea580c' }
const btnRed: React.CSSProperties = { ...btn, background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626' }
const btnPurple: React.CSSProperties = { ...btn, background:'#f5f3ff', border:'1px solid #ddd6fe', color:'#7c3aed' }

export default function FloorPlanEditor({
  floorId, areas, setAreas, lines, setLines, symbols, setSymbols,
  spaces, counts, editMode, setEditMode, viewBox,
  onSpaceClick, onAreaNameChange, onAreaAdd, onAreaDelete, floor, floorLabel,
  onUndo, onRedo, canUndo, canRedo
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState<any>(null)
  const [resizing, setResizing] = useState<any>(null)
  const [selected, setSelected] = useState<{type:'area'|'symbol'|'line', index:number}|null>(null)
  const [addSymType, setAddSymType] = useState<Symbol['type']|null>(null)
  const [polyMode, setPolyMode] = useState(false)
  const [polyPts, setPolyPts] = useState<Point[]>([])
  const [lineMode, setLineMode] = useState(false)
  const [lineStart, setLineStart] = useState<Point|null>(null)
  const [editingName, setEditingName] = useState('')

  const vbParts = viewBox.split(' ').map(Number)
  const vbW = vbParts[2], vbH = vbParts[3]

  const svgXY = useCallback((cx: number, cy: number) => {
    const svg = svgRef.current; if (!svg) return {x:0,y:0}
    const r = svg.getBoundingClientRect()
    return { x: Math.round(((cx-r.left)/r.width)*vbW*2)/2, y: Math.round(((cy-r.top)/r.height)*vbH*2)/2 }
  }, [vbW, vbH])

  const onAreaDown = (e: React.PointerEvent, i: number) => {
    if (!editMode) return; e.stopPropagation()
    setSelected({type:'area',index:i}); setEditingName(areas[i].key)
    const {x,y} = svgXY(e.clientX,e.clientY)
    setDragging({type:'area',i,sx:x,sy:y,ox:areas[i].x,oy:areas[i].y})
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  const onVertexDown = (e: React.PointerEvent, ai: number, vi: number) => {
    if (!editMode) return; e.stopPropagation()
    const {x,y} = svgXY(e.clientX,e.clientY)
    setDragging({type:'vertex',ai,vi,sx:x,sy:y,origPoly:[...(areas[ai].polygon||[])]})
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  const onResizeDown = (e: React.PointerEvent, i: number) => {
    if (!editMode) return; e.stopPropagation()
    const {x,y} = svgXY(e.clientX,e.clientY)
    setResizing({type:'area',i,sx:x,sy:y,ow:areas[i].w,oh:areas[i].h})
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  const onSymDown = (e: React.PointerEvent, i: number) => {
    if (!editMode) return; e.stopPropagation()
    setSelected({type:'symbol',index:i})
    const {x,y} = svgXY(e.clientX,e.clientY)
    setDragging({type:'sym',i,sx:x,sy:y,ox:symbols[i].x,oy:symbols[i].y})
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  const onSymResizeDown = (e: React.PointerEvent, i: number) => {
    if (!editMode) return; e.stopPropagation()
    const {x,y} = svgXY(e.clientX,e.clientY)
    setResizing({type:'sym',i,sx:x,sy:y,ow:symbols[i].w,oh:symbols[i].h})
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  const onLineEndDown = (e: React.PointerEvent, li: number, end: 'start'|'end') => {
    if (!editMode) return; e.stopPropagation()
    const l = lines[li]; const {x,y} = svgXY(e.clientX,e.clientY)
    setDragging({type:'lineEnd',li,end,sx:x,sy:y,ox:end==='start'?l.x1:l.x2,oy:end==='start'?l.y1:l.y2})
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  const onLineMidDown = (e: React.PointerEvent, li: number) => {
    if (!editMode) return; e.stopPropagation()
    const l = lines[li]; const {x,y} = svgXY(e.clientX,e.clientY)
    setSelected({type:'line',index:li})
    setDragging({type:'lineMid',li,sx:x,sy:y,ox1:l.x1,oy1:l.y1,ox2:l.x2,oy2:l.y2})
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!editMode) return
    const {x,y} = svgXY(e.clientX,e.clientY)
    if (dragging) {
      const dx = x-dragging.sx, dy = y-dragging.sy
      if (dragging.type==='area') setAreas(areas.map((a,i)=>i===dragging.i?{...a,x:Math.max(0,Math.min(vbW-a.w,Math.round(dragging.ox+dx))),y:Math.max(0,Math.min(vbH-a.h,Math.round(dragging.oy+dy)))}:a))
      else if (dragging.type==='vertex') setAreas(areas.map((a,i)=>i===dragging.ai?{...a,polygon:dragging.origPoly.map((p:Point,j:number)=>j===dragging.vi?{x:Math.round(p.x+dx),y:Math.round(p.y+dy)}:p)}:a))
      else if (dragging.type==='sym') setSymbols(symbols.map((s,i)=>i===dragging.i?{...s,x:Math.round(dragging.ox+dx),y:Math.round(dragging.oy+dy)}:s))
      else if (dragging.type==='lineEnd') setLines(lines.map((l,i)=>i===dragging.li?dragging.end==='start'?{...l,x1:Math.round(dragging.ox+dx),y1:Math.round(dragging.oy+dy)}:{...l,x2:Math.round(dragging.ox+dx),y2:Math.round(dragging.oy+dy)}:l))
      else if (dragging.type==='lineMid') setLines(lines.map((l,i)=>i===dragging.li?{...l,x1:Math.round(dragging.ox1+dx),y1:Math.round(dragging.oy1+dy),x2:Math.round(dragging.ox2+dx),y2:Math.round(dragging.oy2+dy)}:l))
    }
    if (resizing) {
      const rdx = x-resizing.sx, rdy = y-resizing.sy
      if (resizing.type==='area') setAreas(areas.map((a,i)=>i===resizing.i?{...a,w:Math.max(6,Math.round(resizing.ow+rdx)),h:Math.max(5,Math.round(resizing.oh+rdy))}:a))
      else setSymbols(symbols.map((s,i)=>i===resizing.i?{...s,w:Math.max(3,Math.round(resizing.ow+rdx)),h:Math.max(3,Math.round(resizing.oh+rdy))}:s))
    }
  }
  const onPointerUp = () => { setDragging(null); setResizing(null) }

  const onSvgClick = (e: React.MouseEvent) => {
    if (!editMode) return
    const {x,y} = svgXY(e.clientX,e.clientY)
    if (addSymType) {
      setSymbols([...symbols,{id:Date.now().toString(),type:addSymType,x:Math.round(x-4),y:Math.round(y-4),w:8,h:8}])
      setAddSymType(null); return
    }
    if (lineMode) {
      if (!lineStart) { setLineStart({x,y}) }
      else { setLines([...lines,{id:Date.now().toString(),x1:lineStart.x,y1:lineStart.y,x2:x,y2:y,strokeWidth:1}]); setLineStart(null); setLineMode(false) }
      return
    }
    if (polyMode) setPolyPts(prev=>[...prev,{x,y}])
  }
  const onSvgDblClick = (e: React.MouseEvent) => {
    if (!editMode||!polyMode||polyPts.length<3) return
    e.preventDefault()
    const minX=Math.min(...polyPts.map(p=>p.x)),minY=Math.min(...polyPts.map(p=>p.y))
    const maxX=Math.max(...polyPts.map(p=>p.x)),maxY=Math.max(...polyPts.map(p=>p.y))
    const rel=polyPts.map(p=>({x:p.x-minX,y:p.y-minY}))
    const newArea: AreaDef={key:'新エリア',x:minX,y:minY,w:maxX-minX,h:maxY-minY,zIndex:1,fontSize:2,polygon:rel}
    setAreas([...areas,newArea]); onAreaAdd('新エリア',floor)
    setPolyPts([]); setPolyMode(false); setSelected({type:'area',index:areas.length})
  }

  const addRect = () => {
    const maxZ=Math.max(0,...areas.map(a=>a.zIndex||0))
    setAreas([...areas,{key:'新エリア',x:10,y:10,w:20,h:15,zIndex:maxZ+1,fontSize:2}])
    onAreaAdd('新エリア',floor); setSelected({type:'area',index:areas.length}); setEditingName('新エリア')
  }
  const delSelected = () => {
    if (!selected) return
    if (selected.type==='area') { onAreaDelete(areas[selected.index]?.key); setAreas(areas.filter((_,i)=>i!==selected.index)) }
    else if (selected.type==='symbol') setSymbols(symbols.filter((_,i)=>i!==selected.index))
    else setLines(lines.filter((_,i)=>i!==selected.index))
    setSelected(null)
  }
  const updateName = (name: string) => {
    if (!selected||selected.type!=='area') return
    const old=areas[selected.index].key
    setEditingName(name)
    setAreas(areas.map((a,i)=>i===selected.index?{...a,key:name}:a))
    if (old!==name) onAreaNameChange(old,name)
  }

  const sortedAreas=[...areas].map((a,i)=>({...a,_i:i})).sort((a,b)=>(a.zIndex||0)-(b.zIndex||0))

  return (
    <div style={{marginBottom:20}}>
      {/* フロアヘッダー */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <span style={{fontSize:12,fontWeight:700,color:'#64748b'}}>{floorLabel}</span>
        <button
          onClick={()=>{setEditMode(!editMode);setSelected(null);setPolyMode(false);setPolyPts([]);setLineMode(false);setLineStart(null)}}
          style={{
            background: editMode ? '#fff7ed' : '#f8fafc',
            border: editMode ? '1.5px solid #fed7aa' : '1.5px solid #e2e8f0',
            color: editMode ? '#ea580c' : '#64748b',
            borderRadius:10, padding:'5px 12px', fontSize:12, cursor:'pointer', fontWeight:600,
            display:'flex', alignItems:'center', gap:4
          }}>
          {editMode ? '✅ 完了' : '✏️ 編集'}
        </button>
      </div>

      {/* 編集パネル */}
      {editMode && (
        <div style={{background:'#f8fafc',borderRadius:14,padding:14,marginBottom:10,border:'1px solid #e2e8f0'}}>

          {/* Undo/Redo + ツール */}
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10,paddingBottom:10,borderBottom:'1px solid #e2e8f0'}}>
            {/* 戻す・進む */}
            <div style={{display:'flex',gap:4,marginRight:4}}>
              <button onClick={onUndo} disabled={!canUndo}
                style={{...btn, opacity:canUndo?1:0.35, display:'flex', alignItems:'center', gap:3, padding:'5px 10px'}}>
                ↩ <span style={{fontSize:10}}>戻す</span>
              </button>
              <button onClick={onRedo} disabled={!canRedo}
                style={{...btn, opacity:canRedo?1:0.35, display:'flex', alignItems:'center', gap:3, padding:'5px 10px'}}>
                ↪ <span style={{fontSize:10}}>進む</span>
              </button>
            </div>
            {/* 追加系 */}
            <button onClick={addRect} style={btnPurple}>＋ 長方形</button>
            <button onClick={()=>{setPolyMode(!polyMode);setPolyPts([])}}
              style={polyMode ? btnActive : btn}>
              {polyMode ? `⬡ ${polyPts.length}点(ダブルタップで確定)` : '⬡ 自由形状'}
            </button>
            <button onClick={()=>{setLineMode(!lineMode);setLineStart(null)}}
              style={lineMode ? btnActive : btn}>
              {lineMode ? (lineStart ? '終点をタップ' : '始点をタップ') : '━ 直線'}
            </button>
            {(['door','window','stairs','arrow'] as Symbol['type'][]).map(t=>(
              <button key={t} onClick={()=>setAddSymType(addSymType===t?null:t)}
                style={addSymType===t ? btnActive : btn}>
                {t==='door'?'🚪':t==='window'?'🪟':t==='stairs'?'🪜':'↑'}
              </button>
            ))}
          </div>

          {/* 選択中エリアの操作 */}
          {selected?.type==='area' && areas[selected.index] && (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <span style={{color:'#94a3b8',fontSize:11,flexShrink:0}}>名前</span>
                <input value={editingName} onChange={e=>updateName(e.target.value)}
                  style={{flex:1,background:'white',color:'#1e293b',border:'1.5px solid #e2e8f0',borderRadius:8,padding:'5px 10px',fontSize:12,outline:'none'}}
                  placeholder="スペース名"/>
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                <button onClick={()=>setAreas(areas.map((a,i)=>i===selected.index?{...a,zIndex:(a.zIndex||0)+1}:a))} style={btn}>↑前面</button>
                <button onClick={()=>setAreas(areas.map((a,i)=>i===selected.index?{...a,zIndex:Math.max(0,(a.zIndex||0)-1)}:a))} style={btn}>↓背面</button>
                <button onClick={()=>setAreas(areas.map((a,i)=>i===selected.index?{...a,fontSize:Math.min(6,+((a.fontSize||2)+0.5).toFixed(1))}:a))} style={btn}>A＋</button>
                <button onClick={()=>setAreas(areas.map((a,i)=>i===selected.index?{...a,fontSize:Math.max(0.8,+((a.fontSize||2)-0.5).toFixed(1))}:a))} style={btn}>A－</button>
                <button onClick={()=>{
                  const a=areas[selected.index]
                  const poly=a.polygon||[{x:0,y:0},{x:a.w,y:0},{x:a.w,y:a.h},{x:0,y:a.h}]
                  const mid={x:(poly[poly.length-1].x+poly[0].x)/2,y:(poly[poly.length-1].y+poly[0].y)/2}
                  setAreas(areas.map((ar,i)=>i===selected.index?{...ar,polygon:[...poly,mid]}:ar))
                }} style={btn}>頂点追加</button>
                <button onClick={()=>setAreas(areas.map((a,i)=>i===selected.index?{...a,polygon:undefined}:a))} style={btn}>長方形に戻す</button>
                <button onClick={delSelected} style={btnRed}>🗑 削除</button>
              </div>
            </div>
          )}
          {selected?.type==='symbol' && (
            <div style={{display:'flex',gap:6}}>
              <button onClick={()=>setSymbols(symbols.map((s,i)=>i===selected.index?{...s,rotation:((s.rotation||0)+90)%360}:s))} style={btn}>↻ 回転</button>
              <button onClick={delSelected} style={btnRed}>🗑 削除</button>
            </div>
          )}
          {selected?.type==='line' && (
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <span style={{color:'#94a3b8',fontSize:11}}>太さ</span>
              <button onClick={()=>setLines(lines.map((l,i)=>i===selected.index?{...l,strokeWidth:Math.min(4,(l.strokeWidth||1)+0.5)}:l))} style={btn}>太＋</button>
              <button onClick={()=>setLines(lines.map((l,i)=>i===selected.index?{...l,strokeWidth:Math.max(0.3,(l.strokeWidth||1)-0.5)}:l))} style={btn}>太－</button>
              <button onClick={delSelected} style={btnRed}>🗑 削除</button>
            </div>
          )}
          {!selected && (
            <p style={{color:'#94a3b8',fontSize:11,margin:0,textAlign:'center'}}>図面内のスペースをタップして選択</p>
          )}
        </div>
      )}

      {/* SVG */}
      <svg ref={svgRef} viewBox={viewBox} width="100%"
        style={{display:'block',border:'1px solid #e2e8f0',borderRadius:12,touchAction:editMode?'none':'auto',cursor:(addSymType||lineMode||polyMode)?'crosshair':'default',background:editMode?'#fafafa':'white',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}
        onPointerMove={onPointerMove} onPointerUp={onPointerUp} onClick={onSvgClick} onDoubleClick={onSvgDblClick}>
        <rect x="0" y="0" width={vbW} height={vbH} fill={editMode?'#fafafa':'#f8fafc'} rx="2"/>

        {lines.map((l,li)=>{
          const isSel=selected?.type==='line'&&selected.index===li
          return (
            <g key={l.id}>
              <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={isSel?'#f97316':'#334155'} strokeWidth={l.strokeWidth||1} strokeLinecap="round"
                style={{cursor:editMode?'grab':'default'}} onPointerDown={e=>onLineMidDown(e,li)}/>
              {editMode&&<><circle cx={l.x1} cy={l.y1} r="1.5" fill="#f97316" style={{cursor:'move'}} onPointerDown={e=>onLineEndDown(e,li,'start')}/><circle cx={l.x2} cy={l.y2} r="1.5" fill="#f97316" style={{cursor:'move'}} onPointerDown={e=>onLineEndDown(e,li,'end')}/></>}
            </g>
          )
        })}

        {polyMode&&polyPts.length>0&&(
          <><polyline points={ptStr(polyPts)} fill="none" stroke="#f97316" strokeWidth="0.5" strokeDasharray="1 1"/>
          {polyPts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="1" fill="#f97316"/>)}</>
        )}
        {lineMode&&lineStart&&<circle cx={lineStart.x} cy={lineStart.y} r="1.5" fill="#3b82f6"/>}

        {sortedAreas.map(a=>{
          const idx=a._i
          const sp=spaces.find(s=>s.name===a.key)
          const count=sp?(counts[sp.id]||0):0
          const color=getColor(a.key,spaces)
          const undef=isUndef(a.key)
          const isSel=selected?.type==='area'&&selected.index===idx
          const fs=a.fontSize||2
          const pts=absPolygon(a)
          const ctr=centroid(pts)
          const textLines=a.key.split('\\n')
          return (
            <g key={idx}>
              <polygon points={ptStr(pts)}
                fill={undef?'#f1f5f9':(editMode?(isSel?color+'44':'#f8fafc'):color+'22')}
                stroke={isSel?color:(undef?'#cbd5e1':(editMode?'#94a3b8':color))}
                strokeWidth={isSel?0.8:0.5}
                strokeDasharray={undef?'2 1':'none'}
                style={{cursor:editMode?'grab':'pointer'}}
                onPointerDown={e=>onAreaDown(e,idx)}
                onClick={e=>{if(!editMode&&sp){e.stopPropagation();onSpaceClick(sp)}}}
              />
              {textLines.map((ln,li)=>(
                <text key={li} x={ctr.x} y={ctr.y+(li-(textLines.length-1)/2)*(fs*1.4)-(count>0&&!editMode?fs*0.7:0)}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={undef?'#94a3b8':(editMode?'#64748b':color+'dd')}
                  fontSize={fs} fontWeight="600"
                  style={{pointerEvents:'none',userSelect:'none'}}>{ln}</text>
              ))}
              {count>0&&!editMode&&(
                <text x={ctr.x} y={ctr.y+(textLines.length*fs*0.8)} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize={fs*0.85} style={{pointerEvents:'none'}}>📷{count}</text>
              )}
              {editMode&&!a.polygon&&(
                <rect x={a.x+a.w-3} y={a.y+a.h-3} width={4} height={4} fill="#f97316" rx="0.5" style={{cursor:'se-resize'}} onPointerDown={e=>onResizeDown(e,idx)}/>
              )}
              {editMode&&isSel&&a.polygon&&pts.map((p,vi)=>(
                <circle key={vi} cx={p.x} cy={p.y} r="1.5" fill="#f97316" stroke="white" strokeWidth="0.3" style={{cursor:'move'}} onPointerDown={e=>onVertexDown(e,idx,vi)}/>
              ))}
            </g>
          )
        })}

        {symbols.map((sym,idx)=>{
          const isSel=selected?.type==='symbol'&&selected.index===idx
          const cx=sym.x+sym.w/2,cy=sym.y+sym.h/2,rot=sym.rotation||0
          return (
            <g key={sym.id} transform={`rotate(${rot} ${cx} ${cy})`} onPointerDown={e=>onSymDown(e,idx)} style={{cursor:editMode?'grab':'default'}}>
              {sym.type==='door'&&<><rect x={sym.x} y={sym.y} width={sym.w} height={0.8} fill="#334155" opacity="0.8"/><path d={`M${sym.x} ${sym.y+0.8} Q${sym.x+sym.w} ${sym.y+0.8} ${sym.x+sym.w} ${sym.y+sym.h}`} fill="none" stroke="#334155" strokeWidth="0.5" opacity="0.6"/></>}
              {sym.type==='window'&&<><rect x={sym.x} y={sym.y+sym.h/2-0.5} width={sym.w} height={1} fill="#334155" opacity="0.8"/><line x1={sym.x+sym.w*0.33} y1={sym.y+sym.h/2-1.5} x2={sym.x+sym.w*0.33} y2={sym.y+sym.h/2+1.5} stroke="#334155" strokeWidth="0.5"/><line x1={sym.x+sym.w*0.66} y1={sym.y+sym.h/2-1.5} x2={sym.x+sym.w*0.66} y2={sym.y+sym.h/2+1.5} stroke="#334155" strokeWidth="0.5"/></>}
              {sym.type==='stairs'&&[0,1,2,3,4].map(i=><line key={i} x1={sym.x} y1={sym.y+sym.h*(i/4)} x2={sym.x+sym.w} y2={sym.y+sym.h*(i/4)} stroke="#334155" strokeWidth="0.5" opacity="0.7"/>)}
              {sym.type==='arrow'&&<path d={`M${cx} ${sym.y} L${sym.x+sym.w} ${sym.y+sym.h} L${cx} ${sym.y+sym.h*0.65} L${sym.x} ${sym.y+sym.h} Z`} fill="#334155" opacity="0.7"/>}
              {isSel&&editMode&&<rect x={sym.x-0.5} y={sym.y-0.5} width={sym.w+1} height={sym.h+1} fill="none" stroke="#f97316" strokeWidth="0.5" strokeDasharray="1 1"/>}
              {editMode&&<rect x={sym.x+sym.w-2} y={sym.y+sym.h-2} width={3} height={3} fill="#f97316" rx="0.3" style={{cursor:'se-resize'}} onPointerDown={e=>onSymResizeDown(e,idx)}/>}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
