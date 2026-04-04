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

const btn: React.CSSProperties = { background:'#292524', border:'none', color:'white', borderRadius:6, padding:'5px 8px', fontSize:11, cursor:'pointer' }
const btnRed: React.CSSProperties = { ...btn, background:'#7f1d1d' }
const btnOrange: React.CSSProperties = { ...btn, background:'#c2410c' }

export default function FloorPlanEditor({
  floorId, areas, setAreas, lines, setLines, symbols, setSymbols,
  spaces, counts, editMode, setEditMode, viewBox,
  onSpaceClick, onAreaNameChange, onAreaAdd, onAreaDelete, floor, floorLabel
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
  const [editingAreaName, setEditingAreaName] = useState<string>('')

  const vbParts = viewBox.split(' ').map(Number)
  const vbW = vbParts[2], vbH = vbParts[3]

  const svgXY = useCallback((cx: number, cy: number) => {
    const svg = svgRef.current; if (!svg) return {x:0,y:0}
    const r = svg.getBoundingClientRect()
    return { x: Math.round(((cx-r.left)/r.width)*vbW*2)/2, y: Math.round(((cy-r.top)/r.height)*vbH*2)/2 }
  }, [vbW, vbH])

  const onAreaDown = (e: React.PointerEvent, i: number) => {
    if (!editMode) return; e.stopPropagation()
    const a = areas[i]
    setSelected({type:'area',index:i})
    setEditingAreaName(a.key)
    const {x,y} = svgXY(e.clientX,e.clientY)
    setDragging({type:'area',i,sx:x,sy:y,ox:a.x,oy:a.y})
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  const onVertexDown = (e: React.PointerEvent, ai: number, vi: number) => {
    if (!editMode) return; e.stopPropagation()
    const {x,y} = svgXY(e.clientX,e.clientY)
    const poly = areas[ai].polygon||[]
    setDragging({type:'vertex',ai,vi,sx:x,sy:y,origPoly:[...poly]})
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  const onResizeDown = (e: React.PointerEvent, i: number) => {
    if (!editMode) return; e.stopPropagation()
    const a = areas[i]; const {x,y} = svgXY(e.clientX,e.clientY)
    setResizing({type:'area',i,sx:x,sy:y,ow:a.w,oh:a.h})
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  const onSymDown = (e: React.PointerEvent, i: number) => {
    if (!editMode) return; e.stopPropagation()
    const s = symbols[i]; const {x,y} = svgXY(e.clientX,e.clientY)
    setSelected({type:'symbol',index:i})
    setDragging({type:'sym',i,sx:x,sy:y,ox:s.x,oy:s.y})
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  const onSymResizeDown = (e: React.PointerEvent, i: number) => {
    if (!editMode) return; e.stopPropagation()
    const s = symbols[i]; const {x,y} = svgXY(e.clientX,e.clientY)
    setResizing({type:'sym',i,sx:x,sy:y,ow:s.w,oh:s.h})
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
    if (!editMode||!dragging) return
    const {x,y} = svgXY(e.clientX,e.clientY)
    const dx = x-dragging.sx, dy = y-dragging.sy
    if (dragging.type==='area') {
      setAreas(areas.map((a,i)=>i===dragging.i?{...a,x:Math.max(0,Math.min(vbW-a.w,Math.round(dragging.ox+dx))),y:Math.max(0,Math.min(vbH-a.h,Math.round(dragging.oy+dy)))}:a))
    } else if (dragging.type==='vertex') {
      const np = dragging.origPoly.map((p:Point,i:number)=>i===dragging.vi?{x:Math.round(p.x+dx),y:Math.round(p.y+dy)}:p)
      setAreas(areas.map((a,i)=>i===dragging.ai?{...a,polygon:np}:a))
    } else if (dragging.type==='sym') {
      setSymbols(symbols.map((s,i)=>i===dragging.i?{...s,x:Math.round(dragging.ox+dx),y:Math.round(dragging.oy+dy)}:s))
    } else if (dragging.type==='lineEnd') {
      setLines(lines.map((l,i)=>i===dragging.li?dragging.end==='start'?{...l,x1:Math.round(dragging.ox+dx),y1:Math.round(dragging.oy+dy)}:{...l,x2:Math.round(dragging.ox+dx),y2:Math.round(dragging.oy+dy)}:l))
    } else if (dragging.type==='lineMid') {
      setLines(lines.map((l,i)=>i===dragging.li?{...l,x1:Math.round(dragging.ox1+dx),y1:Math.round(dragging.oy1+dy),x2:Math.round(dragging.ox2+dx),y2:Math.round(dragging.oy2+dy)}:l))
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
      else {
        setLines([...lines,{id:Date.now().toString(),x1:lineStart.x,y1:lineStart.y,x2:x,y2:y,strokeWidth:1}])
        setLineStart(null); setLineMode(false)
      }
      return
    }
    if (polyMode) { setPolyPts(prev=>[...prev,{x,y}]) }
  }
  const onSvgDblClick = (e: React.MouseEvent) => {
    if (!editMode||!polyMode||polyPts.length<3) return
    e.preventDefault()
    const minX=Math.min(...polyPts.map(p=>p.x)), minY=Math.min(...polyPts.map(p=>p.y))
    const maxX=Math.max(...polyPts.map(p=>p.x)), maxY=Math.max(...polyPts.map(p=>p.y))
    const rel = polyPts.map(p=>({x:p.x-minX,y:p.y-minY}))
    const newArea: AreaDef = {key:'新エリア',x:minX,y:minY,w:maxX-minX,h:maxY-minY,zIndex:1,fontSize:2,polygon:rel}
    setAreas([...areas,newArea])
    onAreaAdd('新エリア', floor)
    setPolyPts([]); setPolyMode(false)
    setSelected({type:'area',index:areas.length})
  }

  const addRect = () => {
    const maxZ = Math.max(0,...areas.map(a=>a.zIndex||0))
    const newArea: AreaDef = {key:'新エリア',x:10,y:10,w:20,h:15,zIndex:maxZ+1,fontSize:2}
    setAreas([...areas,newArea])
    onAreaAdd('新エリア', floor)
    setSelected({type:'area',index:areas.length})
    setEditingAreaName('新エリア')
  }

  const delSelected = () => {
    if (!selected) return
    if (selected.type==='area') {
      onAreaDelete(areas[selected.index]?.key)
      setAreas(areas.filter((_,i)=>i!==selected.index))
    } else if (selected.type==='symbol') setSymbols(symbols.filter((_,i)=>i!==selected.index))
    else if (selected.type==='line') setLines(lines.filter((_,i)=>i!==selected.index))
    setSelected(null)
  }

  const updateName = (name: string) => {
    if (!selected||selected.type!=='area') return
    const old = areas[selected.index].key
    setEditingAreaName(name)
    setAreas(areas.map((a,i)=>i===selected.index?{...a,key:name}:a))
    if (old !== name) onAreaNameChange(old, name)
  }

  const sortedAreas = [...areas].map((a,i)=>({...a,_i:i})).sort((a,b)=>(a.zIndex||0)-(b.zIndex||0))

  return (
    <div style={{marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
        <p style={{color:'#78716c',fontSize:11,margin:0}}>{floorLabel}</p>
        <button onClick={()=>{setEditMode(!editMode);setSelected(null);setPolyMode(false);setPolyPts([]);setLineMode(false);setLineStart(null)}}
          style={{background:editMode?'#f97316':'#292524',border:'none',color:'white',borderRadius:8,padding:'4px 10px',fontSize:11,cursor:'pointer',fontWeight:editMode?600:400}}>
          {editMode?'✅ 完了':'✏️ 編集'}
        </button>
      </div>

      {editMode && (
        <div style={{background:'#1c1917',borderRadius:10,padding:'10px 12px',marginBottom:8,border:'1px solid #44403c'}}>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
            <button onClick={addRect} style={{...btn,background:'#7c3aed'}}>＋長方形</button>
            <button onClick={()=>{setPolyMode(!polyMode);setPolyPts([])}} style={{...btn,background:polyMode?'#f97316':'#292524'}}>
              {polyMode?`⬡描画中(${polyPts.length}点)ダブルタップで確定`:'⬡自由形状'}
            </button>
            <button onClick={()=>{setLineMode(!lineMode);setLineStart(null)}} style={{...btn,background:lineMode?'#f97316':'#292524'}}>
              {lineMode?(lineStart?'終点をタップ':'始点をタップ'):'━ 直線追加'}
            </button>
            {(['door','window','stairs','arrow'] as Symbol['type'][]).map(t=>(
              <button key={t} onClick={()=>setAddSymType(addSymType===t?null:t)}
                style={{...btn,background:addSymType===t?'#f97316':'#292524'}}>
                {t==='door'?'🚪':t==='window'?'🪟':t==='stairs'?'🪜':'↑'}
              </button>
            ))}
          </div>

          {selected?.type==='area' && areas[selected.index] && (
            <div style={{borderTop:'1px solid #292524',paddingTop:8,display:'flex',flexDirection:'column',gap:8}}>
              <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                <span style={{color:'#a8a29e',fontSize:11}}>名前：</span>
                <input value={editingAreaName} onChange={e=>updateName(e.target.value)}
                  style={{background:'#292524',color:'white',border:'1px solid #57534e',borderRadius:6,padding:'4px 8px',fontSize:12,width:140}}
                  placeholder="スペース名"/>
                <span style={{color:'#57534e',fontSize:10}}>改行は\nで入力</span>
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                <button onClick={()=>setAreas(areas.map((a,i)=>i===selected.index?{...a,zIndex:(a.zIndex||0)+1}:a))} style={btn}>↑前面</button>
                <button onClick={()=>setAreas(areas.map((a,i)=>i===selected.index?{...a,zIndex:Math.max(0,(a.zIndex||0)-1)}:a))} style={btn}>↓背面</button>
                <button onClick={()=>setAreas(areas.map((a,i)=>i===selected.index?{...a,fontSize:Math.min(6,+((a.fontSize||2)+0.5).toFixed(1))}:a))} style={btn}>A+</button>
                <button onClick={()=>setAreas(areas.map((a,i)=>i===selected.index?{...a,fontSize:Math.max(1,+((a.fontSize||2)-0.5).toFixed(1))}:a))} style={btn}>A-</button>
                <button onClick={()=>{
                  if(!selected||selected.type!=='area') return
                  const a=areas[selected.index]
                  const poly=a.polygon||[{x:0,y:0},{x:a.w,y:0},{x:a.w,y:a.h},{x:0,y:a.h}]
                  const mid={x:(poly[poly.length-1].x+poly[0].x)/2,y:(poly[poly.length-1].y+poly[0].y)/2}
                  setAreas(areas.map((ar,i)=>i===selected.index?{...ar,polygon:[...poly,mid]}:ar))
                }} style={btn}>頂点追加</button>
                <button onClick={()=>setAreas(areas.map((a,i)=>i===selected.index?{...a,polygon:undefined}:a))} style={btn}>長方形に戻す</button>
                <button onClick={delSelected} style={btnRed}>🗑削除</button>
              </div>
            </div>
          )}
          {selected?.type==='symbol' && (
            <div style={{borderTop:'1px solid #292524',paddingTop:8,display:'flex',gap:6}}>
              <button onClick={()=>setSymbols(symbols.map((s,i)=>i===selected.index?{...s,rotation:((s.rotation||0)+90)%360}:s))} style={btn}>↻回転</button>
              <button onClick={delSelected} style={btnRed}>🗑削除</button>
            </div>
          )}
          {selected?.type==='line' && (
            <div style={{borderTop:'1px solid #292524',paddingTop:8,display:'flex',gap:6,alignItems:'center'}}>
              <span style={{color:'#a8a29e',fontSize:11}}>太さ：</span>
              <button onClick={()=>setLines(lines.map((l,i)=>i===selected.index?{...l,strokeWidth:Math.min(4,(l.strokeWidth||1)+0.5)}:l))} style={btn}>太+</button>
              <button onClick={()=>setLines(lines.map((l,i)=>i===selected.index?{...l,strokeWidth:Math.max(0.3,(l.strokeWidth||1)-0.5)}:l))} style={btn}>太-</button>
              <button onClick={delSelected} style={btnRed}>🗑削除</button>
            </div>
          )}
        </div>
      )}

      <svg ref={svgRef} viewBox={viewBox} width="100%"
        style={{display:'block',border:'1px solid #44403c',borderRadius:8,touchAction:editMode?'none':'auto',cursor:(addSymType||lineMode||polyMode)?'crosshair':'default'}}
        onPointerMove={onPointerMove} onPointerUp={onPointerUp} onClick={onSvgClick} onDoubleClick={onSvgDblClick}>
        <rect x="0" y="0" width={vbW} height={vbH} fill="#111" rx="2"/>

        {/* 直線 */}
        {lines.map((l,li)=>{
          const isSel = selected?.type==='line'&&selected.index===li
          return (
            <g key={l.id}>
              <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={isSel?'#f97316':'white'} strokeWidth={l.strokeWidth||1} strokeLinecap="round"
                style={{cursor:editMode?'grab':'default'}} onPointerDown={e=>onLineMidDown(e,li)}/>
              {editMode && <>
                <circle cx={l.x1} cy={l.y1} r="1.5" fill="#f97316" style={{cursor:'move'}} onPointerDown={e=>onLineEndDown(e,li,'start')}/>
                <circle cx={l.x2} cy={l.y2} r="1.5" fill="#f97316" style={{cursor:'move'}} onPointerDown={e=>onLineEndDown(e,li,'end')}/>
              </>}
            </g>
          )
        })}

        {/* ポリゴン描画プレビュー */}
        {polyMode&&polyPts.length>0&&(
          <>
            <polyline points={ptStr(polyPts)} fill="none" stroke="#f97316" strokeWidth="0.5" strokeDasharray="1 1"/>
            {polyPts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="1" fill="#f97316"/>)}
          </>
        )}
        {lineMode&&lineStart&&<circle cx={lineStart.x} cy={lineStart.y} r="1.5" fill="#3b82f6"/>}

        {/* エリア */}
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
          const lines2=a.key.split('\\n')
          return (
            <g key={idx}>
              <polygon points={ptStr(pts)}
                fill={undef?'#3f3f4633':(editMode?(isSel?color+'55':'#1c1917'):color+'33')}
                stroke={isSel?'#fff':(undef?'#6b7280':(editMode?'#f97316':color))}
                strokeWidth={isSel?0.8:0.5}
                strokeDasharray={undef?'2 1':'none'}
                style={{cursor:editMode?'grab':'pointer'}}
                onPointerDown={e=>onAreaDown(e,idx)}
                onClick={e=>{if(!editMode&&sp){e.stopPropagation();onSpaceClick(sp)}}}
              />
              {lines2.map((ln,li)=>(
                <text key={li} x={ctr.x} y={ctr.y+(li-(lines2.length-1)/2)*(fs*1.4)-(count>0&&!editMode?fs*0.7:0)}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={undef?'#9ca3af':(editMode?'#a8a29e':'white')}
                  fontSize={fs} fontWeight="500"
                  style={{pointerEvents:'none',userSelect:'none'}}>{ln}</text>
              ))}
              {count>0&&!editMode&&(
                <text x={ctr.x} y={ctr.y+(lines2.length*fs*0.8)} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize={fs*0.85} style={{pointerEvents:'none'}}>📷{count}</text>
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

        {/* シンボル */}
        {symbols.map((sym,idx)=>{
          const isSel=selected?.type==='symbol'&&selected.index===idx
          const cx=sym.x+sym.w/2, cy=sym.y+sym.h/2, rot=sym.rotation||0
          return (
            <g key={sym.id} transform={`rotate(${rot} ${cx} ${cy})`} onPointerDown={e=>onSymDown(e,idx)} style={{cursor:editMode?'grab':'default'}}>
              {sym.type==='door'&&<><rect x={sym.x} y={sym.y} width={sym.w} height={0.8} fill="white" opacity="0.9"/><path d={`M${sym.x} ${sym.y+0.8} Q${sym.x+sym.w} ${sym.y+0.8} ${sym.x+sym.w} ${sym.y+sym.h}`} fill="none" stroke="white" strokeWidth="0.5" opacity="0.7"/></>}
              {sym.type==='window'&&<><rect x={sym.x} y={sym.y+sym.h/2-0.5} width={sym.w} height={1} fill="white" opacity="0.9"/><line x1={sym.x+sym.w*0.33} y1={sym.y+sym.h/2-1.5} x2={sym.x+sym.w*0.33} y2={sym.y+sym.h/2+1.5} stroke="white" strokeWidth="0.5"/><line x1={sym.x+sym.w*0.66} y1={sym.y+sym.h/2-1.5} x2={sym.x+sym.w*0.66} y2={sym.y+sym.h/2+1.5} stroke="white" strokeWidth="0.5"/></>}
              {sym.type==='stairs'&&[0,1,2,3,4].map(i=><line key={i} x1={sym.x} y1={sym.y+sym.h*(i/4)} x2={sym.x+sym.w} y2={sym.y+sym.h*(i/4)} stroke="white" strokeWidth="0.5" opacity="0.6"/>)}
              {sym.type==='arrow'&&<path d={`M${cx} ${sym.y} L${sym.x+sym.w} ${sym.y+sym.h} L${cx} ${sym.y+sym.h*0.65} L${sym.x} ${sym.y+sym.h} Z`} fill="white" opacity="0.8"/>}
              {isSel&&editMode&&<rect x={sym.x-0.5} y={sym.y-0.5} width={sym.w+1} height={sym.h+1} fill="none" stroke="#fff" strokeWidth="0.5" strokeDasharray="1 1"/>}
              {editMode&&<rect x={sym.x+sym.w-2} y={sym.y+sym.h-2} width={3} height={3} fill="#f97316" rx="0.3" style={{cursor:'se-resize'}} onPointerDown={e=>onSymResizeDown(e,idx)}/>}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
