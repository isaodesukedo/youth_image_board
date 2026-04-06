'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, Space, ImageItem } from '@/lib/supabase'
import PasswordGate from '@/components/PasswordGate'
import AddSpaceModal from '@/components/AddSpaceModal'
import EditSpaceModal from '@/components/EditSpaceModal'
import EditPasswordGate from '@/components/EditPasswordGate'
import AdminPasswordGate from '@/components/AdminPasswordGate'
import AddImageModal from '@/components/AddImageModal'
import EditImageModal from '@/components/EditImageModal'
import FloorPlanEditor, { AreaDef, Symbol, LineShape } from '@/components/FloorPlanEditor'

const INIT_1F: AreaDef[] = [{"h":20,"w":35,"x":22,"y":4,"key":"音楽スタジオ","zIndex":1,"fontSize":2},{"h":16,"w":18,"x":59,"y":4,"key":"ダンス・ジムスペース","zIndex":1,"fontSize":1.5},{"h":14,"w":19,"x":22,"y":26,"key":"カラオケ・フォトブース","zIndex":1,"fontSize":1.5},{"h":22,"w":54,"x":22,"y":42,"key":"コミュニティスペース","zIndex":1,"fontSize":2},{"h":76,"w":16,"x":4,"y":4,"key":"クラフトスペース","zIndex":1,"fontSize":2},{"h":9,"w":7,"x":61,"y":55,"key":"男子トイレ","zIndex":2,"fontSize":1},{"h":9,"w":8,"x":68,"y":55,"key":"洋式トイレ(1F)","zIndex":2,"fontSize":1},{"h":8,"w":8,"x":63,"y":66,"key":"階段横倉庫","zIndex":1,"fontSize":1},{"h":14,"w":39,"x":22,"y":66,"key":"入口スペース","zIndex":3,"fontSize":2},{"h":20,"w":16,"x":4,"y":4,"key":"巨大機械","zIndex":4,"fontSize":2},{"h":7,"w":7,"x":69,"y":42,"key":"倉庫","zIndex":5,"fontSize":1.5}]
const INIT_2F: AreaDef[] = [{"h":19,"w":16,"x":48,"y":4,"key":"未定","zIndex":1,"fontSize":2},{"h":28,"w":45,"x":4,"y":25,"key":"勉強・読書スペース","zIndex":1,"polygon":[{"x":0,"y":6},{"x":45,"y":6},{"x":45,"y":49},{"x":0,"y":49},{"x":0,"y":14}],"fontSize":2},{"h":22,"w":13,"x":51,"y":32,"key":"個室","zIndex":1,"fontSize":2},{"h":6,"w":13,"x":44,"y":31,"key":"洋式トイレ(2F)","zIndex":2,"fontSize":1},{"h":13,"w":6,"x":51,"y":61,"key":"洗面脱衣場","zIndex":1,"fontSize":1},{"h":13,"w":6,"x":58,"y":61,"key":"浴室","zIndex":1,"fontSize":1},{"h":15,"w":44,"x":4,"y":4,"key":"未定","zIndex":4,"fontSize":2},{"h":12,"w":10,"x":28,"y":19,"key":"ボールプール秘密基地","zIndex":4,"fontSize":1},{"h":26,"w":11,"x":4,"y":4,"key":"床危険","zIndex":5,"fontSize":2},{"h":5,"w":16,"x":48,"y":25,"key":"完全予約制防音小部屋","zIndex":6,"fontSize":1}]
const INIT_3F: AreaDef[] = [{"h":32,"w":42,"x":4,"y":5,"key":"事務所(3F)","zIndex":1,"fontSize":2},{"h":7,"w":22,"x":48,"y":30,"key":"キッチン","zIndex":1,"fontSize":2},{"h":28,"w":42,"x":4,"y":38,"key":"屋内ベランダ","zIndex":1,"fontSize":2},{"h":28,"w":22,"x":48,"y":38,"key":"機械置き場","zIndex":1,"fontSize":2},{"h":24,"w":22,"x":48,"y":5,"key":"畳の宿泊できる部屋","zIndex":2,"fontSize":1.5},{"h":12,"w":20,"x":4,"y":25,"key":"小上がり","zIndex":3,"fontSize":2}]
const INIT_SYMS_1F: Symbol[] = [{"h":14,"w":4,"x":72,"y":66,"id":"s1","type":"stairs","rotation":0},{"h":8,"w":4,"x":69,"y":35,"id":"s2","type":"stairs","rotation":90},{"h":8,"w":4,"x":44,"y":24,"id":"s3","type":"stairs","rotation":90},{"h":3,"w":13,"x":38,"y":63,"id":"s4","type":"window"},{"h":6,"w":13,"x":43,"y":39,"id":"s5","type":"window"},{"h":8,"w":8,"x":7,"y":76,"id":"s6","type":"window"},{"h":6,"w":14,"x":35,"y":77,"id":"s7","type":"window"}]
const INIT_SYMS_2F: Symbol[] = [{"h":7,"w":4,"x":33,"y":30,"id":"s8","type":"stairs","rotation":90},{"h":7,"w":3,"x":61,"y":58,"id":"s9","type":"stairs"},{"h":8,"w":3,"x":31,"y":13,"id":"s10","type":"stairs","rotation":90},{"h":3,"w":12,"x":34,"y":57,"id":"s11","type":"window"},{"h":11,"w":11,"x":34,"y":53,"id":"s12","type":"window","rotation":90}]
const INIT_SYMS_3F: Symbol[] = [{"h":7,"w":3,"x":12,"y":-1,"id":"s13","type":"stairs","rotation":90},{"h":4,"w":5,"x":40,"y":37,"id":"s14","type":"door","rotation":0}]

const LAYOUT_KEY = 'floor_layout_v1'
const MAX_HISTORY = 50
type LayoutState = { areas1F:AreaDef[];areas2F:AreaDef[];areas3F:AreaDef[];syms1F:Symbol[];syms2F:Symbol[];syms3F:Symbol[];lines1F:LineShape[];lines2F:LineShape[];lines3F:LineShape[] }

export default function Home() {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null)
  const [spaceImages, setSpaceImages] = useState<ImageItem[]>([])
  const [loadingImages, setLoadingImages] = useState(false)
  const [addSpaceOpen, setAddSpaceOpen] = useState(false)
  const [editSpace, setEditSpace] = useState<Space | null>(null)
  const [addImageOpen, setAddImageOpen] = useState(false)
  const [detailImage, setDetailImage] = useState<ImageItem | null>(null)
  const [editImage, setEditImage] = useState<ImageItem | null>(null)
  const [editPasswordPending, setEditPasswordPending] = useState<null | { floor: 1|2|3 }>(null)
  const [adminPasswordPending, setAdminPasswordPending] = useState<null | 'editSpace' | 'spaceList'>(null)
  const [pendingEditSpace, setPendingEditSpace] = useState<Space | null>(null)
  const [showSpaceList, setShowSpaceList] = useState(false)
  const [spaceListAuthed, setSpaceListAuthed] = useState(false)
  const [editMode1F, setEditMode1F] = useState(false)
  const [editMode2F, setEditMode2F] = useState(false)
  const [editMode3F, setEditMode3F] = useState(false)
  const [areas1F, setAreas1F] = useState(INIT_1F)
  const [areas2F, setAreas2F] = useState(INIT_2F)
  const [areas3F, setAreas3F] = useState(INIT_3F)
  const [syms1F, setSyms1F] = useState<Symbol[]>(INIT_SYMS_1F)
  const [syms2F, setSyms2F] = useState<Symbol[]>(INIT_SYMS_2F)
  const [syms3F, setSyms3F] = useState<Symbol[]>(INIT_SYMS_3F)
  const [lines1F, setLines1F] = useState<LineShape[]>([])
  const [lines2F, setLines2F] = useState<LineShape[]>([])
  const [lines3F, setLines3F] = useState<LineShape[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)

  const historyRef = useRef<LayoutState[]>([])
  const historyIdxRef = useRef(-1)
  const skipHistoryRef = useRef(false)

  const getState = useCallback((): LayoutState => ({
    areas1F, areas2F, areas3F, syms1F, syms2F, syms3F, lines1F, lines2F, lines3F
  }), [areas1F, areas2F, areas3F, syms1F, syms2F, syms3F, lines1F, lines2F, lines3F])

  const pushHistory = useCallback((state: LayoutState) => {
    if (skipHistoryRef.current) return
    const h = historyRef.current.slice(0, historyIdxRef.current + 1)
    h.push(JSON.parse(JSON.stringify(state)))
    if (h.length > MAX_HISTORY) h.shift()
    historyRef.current = h
    historyIdxRef.current = h.length - 1
    setHistoryIdx(h.length - 1)
  }, [])

  const applyState = useCallback((state: LayoutState) => {
    skipHistoryRef.current = true
    setAreas1F([...state.areas1F]); setAreas2F([...state.areas2F]); setAreas3F([...state.areas3F])
    setSyms1F([...state.syms1F]); setSyms2F([...state.syms2F]); setSyms3F([...state.syms3F])
    setLines1F([...state.lines1F]); setLines2F([...state.lines2F]); setLines3F([...state.lines3F])
    setTimeout(() => { skipHistoryRef.current = false }, 100)
  }, [])

  const undo = useCallback(() => {
    if (historyIdxRef.current <= 0) return
    historyIdxRef.current--
    setHistoryIdx(historyIdxRef.current)
    applyState(historyRef.current[historyIdxRef.current])
  }, [applyState])

  const redo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return
    historyIdxRef.current++
    setHistoryIdx(historyIdxRef.current)
    applyState(historyRef.current[historyIdxRef.current])
  }, [applyState])

  // ⌘+Z / ⌘+Shift+Z キーボードショートカット
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const ctrl = isMac ? e.metaKey : e.ctrlKey
      if (!ctrl) return
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (e.key === 'z' && e.shiftKey) { e.preventDefault(); redo() }
      if (e.key === 'y') { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  useEffect(() => {
    if (!skipHistoryRef.current) pushHistory(getState())
  }, [areas1F, areas2F, areas3F, syms1F, syms2F, syms3F, lines1F, lines2F, lines3F])

  const canUndo = historyIdx > 0
  const canRedo = historyIdx < historyRef.current.length - 1

  const saveLayout = async () => {
    const s = getState()
    await supabase.from('layouts').upsert({ id: LAYOUT_KEY, data: s, updated_at: new Date().toISOString() })
  }

  const handleEditDone = (floor: 1|2|3) => {
    saveLayout()
    if (floor===1) setEditMode1F(false)
    if (floor===2) setEditMode2F(false)
    if (floor===3) setEditMode3F(false)
  }

  const requestEdit = (floor: 1|2|3) => {
    if (sessionStorage.getItem('admin_authed') === 'true') {
      if (floor===1) setEditMode1F(true)
      if (floor===2) setEditMode2F(true)
      if (floor===3) setEditMode3F(true)
    } else {
      setEditPasswordPending({ floor })
    }
  }

  const handleEditPasswordSuccess = () => {
    if (!editPasswordPending) return
    const { floor } = editPasswordPending
    if (floor===1) setEditMode1F(true)
    if (floor===2) setEditMode2F(true)
    if (floor===3) setEditMode3F(true)
    setEditPasswordPending(null)
  }

  // スペース編集ボタン→管理者パスワード確認
  const requestEditSpace = (space: Space) => {
    if (sessionStorage.getItem('admin_authed') === 'true') {
      setEditSpace(space)
    } else {
      setPendingEditSpace(space)
      setAdminPasswordPending('editSpace')
    }
  }

  // スペース管理リスト表示→管理者パスワード確認
  const requestSpaceList = () => {
    if (sessionStorage.getItem('admin_authed') === 'true') {
      setSpaceListAuthed(true)
      setShowSpaceList(true)
    } else {
      setAdminPasswordPending('spaceList')
    }
  }

  const handleAdminPasswordSuccess = () => {
    if (adminPasswordPending === 'editSpace' && pendingEditSpace) {
      setEditSpace(pendingEditSpace)
      setPendingEditSpace(null)
    } else if (adminPasswordPending === 'spaceList') {
      setSpaceListAuthed(true)
      setShowSpaceList(true)
    }
    setAdminPasswordPending(null)
  }

  const load = async () => {
    const { data: s } = await supabase.from('spaces').select('*').order('floor').order('created_at', { ascending: true })
    const { data: imgs } = await supabase.from('images').select('space_id')
    const c: Record<string, number> = {}
    imgs?.forEach(i => { c[i.space_id] = (c[i.space_id] || 0) + 1 })
    setSpaces(s || []); setCounts(c)
  }

  const loadLayout = async () => {
    const { data } = await supabase.from('layouts').select('data').eq('id', LAYOUT_KEY).single()
    if (data?.data) {
      const d = data.data as any
      skipHistoryRef.current = true
      if (d.areas1F) setAreas1F(d.areas1F); if (d.areas2F) setAreas2F(d.areas2F); if (d.areas3F) setAreas3F(d.areas3F)
      if (d.syms1F) setSyms1F(d.syms1F); if (d.syms2F) setSyms2F(d.syms2F); if (d.syms3F) setSyms3F(d.syms3F)
      if (d.lines1F) setLines1F(d.lines1F); if (d.lines2F) setLines2F(d.lines2F); if (d.lines3F) setLines3F(d.lines3F)
      setTimeout(() => { skipHistoryRef.current = false }, 100)
    }
  }

  const openSpace = async (space: Space) => {
    setSelectedSpace(space); setLoadingImages(true)
    const { data } = await supabase.from('images').select('*').eq('space_id', space.id).order('created_at', { ascending: false })
    setSpaceImages(data || []); setLoadingImages(false)
  }

  const handleAreaNameChange = async (oldName: string, newName: string) => {
    if (!oldName || !newName || oldName === newName) return
    await supabase.from('spaces').update({ name: newName }).eq('name', oldName); load()
  }
  const handleAreaAdd = async (key: string, floor: number) => {
    await supabase.from('spaces').insert({ name: key, floor, color: '#6b7280' }); load()
  }
  const handleAreaDelete = async (key: string) => {
    if (!key) return
    await supabase.from('spaces').delete().eq('name', key); load()
  }
  const handleDeleteImage = async (imgId: string) => {
    if (!confirm('この画像を削除しますか？')) return
    await supabase.from('images').delete().eq('id', imgId)
    setDetailImage(null)
    if (selectedSpace) openSpace(selectedSpace); load()
  }

  useEffect(() => { load(); loadLayout() }, [])

  const editorProps = { spaces, counts, onSpaceClick: openSpace, onAreaNameChange: handleAreaNameChange, onAreaAdd: handleAreaAdd, onAreaDelete: handleAreaDelete, onUndo: undo, onRedo: redo, canUndo, canRedo }
  const floorColors: Record<number,string> = {1:'#f97316', 2:'#3b82f6', 3:'#10b981'}
  const floorLabels: Record<number,string> = {1:'1F オープン空間', 2:'2F 静かな空間', 3:'3F 事務所'}

  return (
    <PasswordGate>
      <main style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b', paddingBottom: 80 }}>
        {/* ヘッダー */}
        <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 30 }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #7c3aed, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🏠内装デザインボード</h1>
            <p style={{ color: '#94a3b8', fontSize: 12, margin: '2px 0 0' }}>みんなでイメージを共創しよう</p>
          </div>
        </div>

        <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px' }}>

          {/* 実際の図面 */}
          <div style={{ background: 'white', borderRadius: 16, padding: 14, marginBottom: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
            <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>📐 実際の図面</p>
            <img src="https://ogjcaupnyokrzgunwfbg.supabase.co/storage/v1/object/public/youth_image/floorplan.png" alt="図面" style={{ width: '100%', borderRadius: 10, display: 'block' }} onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}/>
          </div>

          {/* 使い方説明 */}
          <div style={{ background: 'linear-gradient(135deg, #f0f9ff, #faf5ff)', borderRadius: 16, padding: 18, marginBottom: 16, border: '1px solid #e0f2fe' }}>
            <div style={{ fontSize: 14, lineHeight: 1.9, color: '#334155' }}>
              <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: '#1e293b' }}>🎯 目的</p>
              <p style={{ margin: '0 0 14px', color: '#475569' }}>ユースセンターの内装デザインを写真でシェアしあって、実際のイメージをかためていく！</p>
              <div style={{ background: 'white', borderRadius: 12, padding: '12px 16px', marginBottom: 14, border: '1px solid #e2e8f0' }}>
                <p style={{ fontWeight: 700, color: '#7c3aed', margin: '0 0 4px', fontSize: 13 }}>🔑 パスワード</p>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 20, letterSpacing: '0.15em', color: '#1e293b' }}>1234</p>
              </div>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#1e293b' }}>【使い方】</p>
              <p style={{ margin: '0 0 4px' }}>① 「イメージボード図面」からスペース名をタッチ</p>
              <p style={{ margin: '0 0 4px' }}>② 「イメージを追加」</p>
              <p style={{ margin: '0 0 14px' }}>③ 詳細を記入して「追加する」</p>
              <div style={{ background: '#fff7ed', borderRadius: 10, padding: '10px 14px', border: '1px solid #fed7aa' }}>
                <p style={{ margin: 0, fontSize: 13, color: '#9a3412' }}>⚠️ 削除を押すと復元できないので、他の人の投稿を消さないように注意する！</p>
              </div>
            </div>
          </div>

          {/* イメージボード図面 */}
          <div style={{ background: 'white', borderRadius: 16, padding: 14, marginBottom: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
            <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>🎨 イメージボード図面</p>
            <FloorPlanEditor {...editorProps} floorId="1f" floor={1} floorLabel="1F オープン空間" areas={areas1F} setAreas={setAreas1F} lines={lines1F} setLines={setLines1F} symbols={syms1F} setSymbols={setSyms1F} editMode={editMode1F} setEditMode={v => v ? requestEdit(1) : handleEditDone(1)} viewBox="0 0 80 82"/>
            <FloorPlanEditor {...editorProps} floorId="2f" floor={2} floorLabel="2F 静かな空間" areas={areas2F} setAreas={setAreas2F} lines={lines2F} setLines={setLines2F} symbols={syms2F} setSymbols={setSyms2F} editMode={editMode2F} setEditMode={v => v ? requestEdit(2) : handleEditDone(2)} viewBox="0 0 66 76"/>
            <FloorPlanEditor {...editorProps} floorId="3f" floor={3} floorLabel="3F 事務所" areas={areas3F} setAreas={setAreas3F} lines={lines3F} setLines={setLines3F} symbols={syms3F} setSymbols={setSyms3F} editMode={editMode3F} setEditMode={v => v ? requestEdit(3) : handleEditDone(3)} viewBox="0 0 72 70"/>
          </div>

          {/* スペース管理リスト（折りたたみ・管理者限定） */}
          <button onClick={requestSpaceList} style={{ width: '100%', background: 'white', border: '1.5px solid #e2e8f0', color: '#64748b', borderRadius: 14, padding: '14px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showSpaceList && spaceListAuthed ? 0 : 16, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <span>🔒 スペース管理リスト（管理者）</span>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>{showSpaceList && spaceListAuthed ? '▲ 閉じる' : '▼ 開く'}</span>
          </button>

          {showSpaceList && spaceListAuthed && (
            <div style={{ background: 'white', borderRadius: '0 0 16px 16px', padding: '16px 14px', marginBottom: 16, border: '1px solid #e2e8f0', borderTop: 'none' }}>
              {[1,2,3].map(floor => {
                const fs = spaces.filter(s => s.floor === floor)
                if (fs.length === 0) return null
                return (
                  <div key={floor} style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: floorColors[floor] }} />
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#334155' }}>{floorLabels[floor]}</span>
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>{fs.length}スペース</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                      {fs.map(space => (
                        <div key={space.id} style={{ position: 'relative' }}>
                          <button onClick={() => openSpace(space)} style={{ width: '100%', borderRadius: 14, padding: 14, textAlign: 'left', cursor: 'pointer', background: 'white', border: `2px solid ${space.color}40`, boxShadow: `0 2px 8px ${space.color}20`, color: '#1e293b' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: space.color, marginBottom: 6 }} />
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{space.name}</div>
                            {space.description && <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4, lineHeight: 1.4 }}>{space.description}</div>}
                            <div style={{ color: space.color, fontSize: 12, marginTop: 6, fontWeight: 600 }}>{counts[space.id] ? `📷 ${counts[space.id]}枚` : '画像なし'}</div>
                          </button>
                          <button onClick={e => { e.stopPropagation(); requestEditSpace(space) }} style={{ position: 'absolute', top: 8, right: 8, background: '#f1f5f9', border: 'none', color: '#94a3b8', borderRadius: 8, width: 26, height: 26, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              <button onClick={() => setAddSpaceOpen(true)} style={{ width: '100%', background: '#f8fafc', border: '2px dashed #cbd5e1', color: '#94a3b8', borderRadius: 14, padding: 14, cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>＋</span> スペースを追加
              </button>
            </div>
          )}
        </div>

        {/* スペース詳細 */}
        {selectedSpace && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setSelectedSpace(null)}>
            <div style={{ background: 'white', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 640, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 32px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}><div style={{ width: 36, height: 4, borderRadius: 2, background: '#e2e8f0' }} /></div>
              <div style={{ padding: '8px 20px 14px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: selectedSpace.color, flexShrink: 0 }} />
                      <h2 style={{ fontWeight: 800, fontSize: 20, margin: 0, color: '#1e293b' }}>{selectedSpace.name}</h2>
                      <span style={{ color: '#94a3b8', fontSize: 12, background: '#f1f5f9', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>{selectedSpace.floor}F</span>
                    </div>
                    {selectedSpace.description && <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 0 24px', lineHeight: 1.6 }}>{selectedSpace.description}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                    <button onClick={() => { requestEditSpace(selectedSpace); setSelectedSpace(null) }} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#64748b', borderRadius: 10, padding: '6px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>✏️ 編集</button>
                    <button onClick={() => setSelectedSpace(null)} style={{ background: '#f1f5f9', border: 'none', color: '#94a3b8', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </div>
                </div>
              </div>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                <button onClick={() => setAddImageOpen(true)} style={{ width: '100%', background: `${selectedSpace.color}15`, border: `2px dashed ${selectedSpace.color}60`, color: selectedSpace.color, borderRadius: 12, padding: 12, cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span style={{ fontSize: 18 }}>＋</span> イメージを追加
                </button>
              </div>
              <div style={{ overflowY: 'auto', padding: 16, flex: 1 }}>
                {loadingImages ? <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>読み込み中...</div>
                : spaceImages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>🖼️</div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8' }}>まだ画像がありません</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    {spaceImages.map(img => (
                      <div key={img.id} onClick={() => setDetailImage(img)} style={{ position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                        <img src={img.public_url} alt={img.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {img.title && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)', padding: '18px 8px 8px' }}><p style={{ margin: 0, fontSize: 12, color: 'white', fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{img.title}</p></div>}
                        <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(255,255,255,0.85)', borderRadius: 99, padding: '2px 7px', fontSize: 10, color: '#64748b', fontWeight: 600 }}>{img.author_name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 画像詳細 */}
        {detailImage && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setDetailImage(null)}>
            <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 400, overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 16px 48px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
              <div style={{ position: 'relative' }}>
                <img src={detailImage.public_url} alt="" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} />
                <button onClick={() => { setEditImage(detailImage); setDetailImage(null) }}
                  style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.92)', border: 'none', color: '#64748b', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                  ✏️ 編集
                </button>
              </div>
              <div style={{ padding: 20 }}>
                {detailImage.title && <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 14, color: '#1e293b' }}>{detailImage.title}</h3>}
                {detailImage.reason && <div style={{ marginBottom: 10, background: '#f5f3ff', borderRadius: 12, padding: 14, border: '1px solid #e9d5ff' }}><div style={{ fontSize: 12, color: '#7c3aed', fontWeight: 700, marginBottom: 4 }}>✨ なぜいいか</div><p style={{ margin: 0, fontSize: 14, color: '#4c1d95', lineHeight: 1.6 }}>{detailImage.reason}</p></div>}
                {detailImage.experience && <div style={{ marginBottom: 10, background: '#ecfdf5', borderRadius: 12, padding: 14, border: '1px solid #a7f3d0' }}><div style={{ fontSize: 12, color: '#059669', fontWeight: 700, marginBottom: 4 }}>🌟 どんな体験ができるか</div><p style={{ margin: 0, fontSize: 14, color: '#065f46', lineHeight: 1.6 }}>{detailImage.experience}</p></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>by {detailImage.author_name}</span>
                  <button onClick={() => handleDeleteImage(detailImage.id)} style={{ background: '#fef2f2', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12, borderRadius: 8, padding: '4px 10px', fontWeight: 600 }}>削除</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 管理者パスワード確認 */}
        {adminPasswordPending && <AdminPasswordGate onSuccess={handleAdminPasswordSuccess} onCancel={() => { setAdminPasswordPending(null); setPendingEditSpace(null) }} />}
        {editPasswordPending && <EditPasswordGate onSuccess={handleEditPasswordSuccess} onCancel={() => setEditPasswordPending(null)} />}
        {addSpaceOpen && <AddSpaceModal onClose={() => setAddSpaceOpen(false)} onAdded={load} />}
        {editSpace && <EditSpaceModal space={editSpace} onClose={() => setEditSpace(null)} onSaved={load} />}
        {addImageOpen && selectedSpace && <AddImageModal spaceId={selectedSpace.id} onClose={() => setAddImageOpen(false)} onAdded={() => { load(); if (selectedSpace) openSpace(selectedSpace) }} />}
        {editImage && <EditImageModal image={editImage} onClose={() => setEditImage(null)} onSaved={() => { if (selectedSpace) openSpace(selectedSpace) }} />}
      </main>
    </PasswordGate>
  )
}
