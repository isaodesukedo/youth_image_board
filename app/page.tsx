'use client'
import { useEffect, useState } from 'react'
import { supabase, Space, ImageItem } from '@/lib/supabase'
import PasswordGate from '@/components/PasswordGate'
import AddSpaceModal from '@/components/AddSpaceModal'
import EditSpaceModal from '@/components/EditSpaceModal'
import AddImageModal from '@/components/AddImageModal'
import FloorPlanEditor, { AreaDef, Symbol } from '@/components/FloorPlanEditor'

const INIT_1F: AreaDef[] = [
  { key: '音楽スタジオ',          x:22, y:4,  w:28, h:20, zIndex:1, fontSize:2 },
  { key: 'ダンス・ジムスペース',   x:52, y:4,  w:24, h:20, zIndex:1, fontSize:2 },
  { key: 'カラオケ・フォトブース', x:22, y:26, w:28, h:14, zIndex:1, fontSize:2 },
  { key: 'コミュニティスペース',   x:22, y:42, w:54, h:22, zIndex:1, fontSize:2 },
  { key: 'クラフトスペース',       x:4,  y:4,  w:16, h:60, zIndex:1, fontSize:2 },
  { key: '男子トイレ',             x:52, y:26, w:12, h:14, zIndex:2, fontSize:1.8 },
  { key: '洋式トイレ(1F)',         x:65, y:26, w:11, h:14, zIndex:2, fontSize:1.8 },
  { key: '倉庫A',                  x:22, y:66, w:54, h:14, zIndex:1, fontSize:2 },
]
const INIT_2F: AreaDef[] = [
  { key: '音楽スタジオ(2F防音)', x:4,  y:4,  w:30, h:18, zIndex:1, fontSize:2 },
  { key: 'ダンススペース(2F)',    x:36, y:4,  w:28, h:18, zIndex:1, fontSize:2 },
  { key: '読書・勉強スペース',    x:4,  y:24, w:45, h:28, zIndex:1, fontSize:2 },
  { key: '個室・秘密基地',        x:51, y:24, w:13, h:28, zIndex:1, fontSize:2 },
  { key: '洋式トイレ(2F)',        x:36, y:24, w:13, h:12, zIndex:2, fontSize:1.8 },
  { key: 'ボルダリング',          x:4,  y:54, w:30, h:20, zIndex:1, fontSize:2 },
  { key: '洗面脱衣場',            x:36, y:54, w:14, h:20, zIndex:1, fontSize:2 },
  { key: '浴室',                  x:52, y:54, w:12, h:20, zIndex:1, fontSize:2 },
]
const INIT_3F: AreaDef[] = [
  { key: '事務所(3F)',    x:4,  y:4,  w:42, h:32, zIndex:1, fontSize:2 },
  { key: 'キッチン',     x:48, y:4,  w:22, h:32, zIndex:1, fontSize:2 },
  { key: '屋内ベランダ', x:4,  y:38, w:42, h:28, zIndex:1, fontSize:2 },
  { key: '機械置き場',   x:48, y:38, w:22, h:28, zIndex:1, fontSize:2 },
]

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
  const [editMode, setEditMode] = useState(false)
  const [areas1F, setAreas1F] = useState(INIT_1F)
  const [areas2F, setAreas2F] = useState(INIT_2F)
  const [areas3F, setAreas3F] = useState(INIT_3F)
  const [syms1F, setSyms1F] = useState<Symbol[]>([])
  const [syms2F, setSyms2F] = useState<Symbol[]>([])
  const [syms3F, setSyms3F] = useState<Symbol[]>([])

  const load = async () => {
    const { data: s } = await supabase.from('spaces').select('*').order('floor').order('created_at', { ascending: true })
    const { data: imgs } = await supabase.from('images').select('space_id')
    const c: Record<string, number> = {}
    imgs?.forEach(i => { c[i.space_id] = (c[i.space_id] || 0) + 1 })
    setSpaces(s || [])
    setCounts(c)
  }

  const openSpace = async (space: Space) => {
    setSelectedSpace(space)
    setLoadingImages(true)
    const { data } = await supabase.from('images').select('*').eq('space_id', space.id).order('created_at', { ascending: false })
    setSpaceImages(data || [])
    setLoadingImages(false)
  }

  // スペース編集保存後にマップも更新
  const handleSpaceSaved = () => {
    load()
  }

  const handleDeleteImage = async (imgId: string) => {
    if (!confirm('この画像を削除しますか？')) return
    await supabase.from('images').delete().eq('id', imgId)
    setDetailImage(null)
    if (selectedSpace) openSpace(selectedSpace)
    load()
  }

  useEffect(() => { load() }, [])

  return (
    <PasswordGate>
      <main style={{ minHeight: '100vh', background: '#0c0a09', color: 'white', paddingBottom: 80 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>

          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>🏠 場作りボード</h1>
            <p style={{ color: '#a8a29e', fontSize: 14 }}>スペースをタップしてイメージを共創しよう</p>
          </div>

          {/* 実際の図面 */}
          <div style={{ background: '#1c1917', borderRadius: 16, padding: 12, marginBottom: 16, border: '1px solid #292524' }}>
            <p style={{ color: '#78716c', fontSize: 11, marginBottom: 8 }}>📐 実際の図面</p>
            <img
              src="https://ogjcaupnyokrzgunwfbg.supabase.co/storage/v1/object/public/youth_image/floorplan.png"
              alt="図面"
              style={{ width: '100%', borderRadius: 8, display: 'block' }}
              onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
            />
          </div>

          {/* イメージボード図面 */}
          <div style={{ background: '#1c1917', borderRadius: 16, padding: 12, marginBottom: 24, border: '1px solid #292524' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <p style={{ color: '#78716c', fontSize: 11 }}>🎨 イメージボード図面</p>
              <button onClick={() => setEditMode(!editMode)}
                style={{ background: editMode ? '#f97316' : '#292524', border: 'none', color: 'white', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontWeight: editMode ? 600 : 400 }}>
                {editMode ? '✅ 編集完了' : '✏️ 配置を編集'}
              </button>
            </div>

            <p style={{ color: '#78716c', fontSize: 11, marginBottom: 6, textAlign: 'center' }}>1F オープン空間</p>
            <FloorPlanEditor areas={areas1F} setAreas={setAreas1F} symbols={syms1F} setSymbols={setSyms1F}
              spaces={spaces} counts={counts} editMode={editMode} viewBox="0 0 80 82" onSpaceClick={openSpace} floorLabel="1F" />

            <p style={{ color: '#78716c', fontSize: 11, margin: '10px 0 6px', textAlign: 'center' }}>2F 静かな空間</p>
            <FloorPlanEditor areas={areas2F} setAreas={setAreas2F} symbols={syms2F} setSymbols={setSyms2F}
              spaces={spaces} counts={counts} editMode={editMode} viewBox="0 0 66 76" onSpaceClick={openSpace} floorLabel="2F" />

            <p style={{ color: '#78716c', fontSize: 11, margin: '10px 0 6px', textAlign: 'center' }}>3F 事務所</p>
            <FloorPlanEditor areas={areas3F} setAreas={setAreas3F} symbols={syms3F} setSymbols={setSyms3F}
              spaces={spaces} counts={counts} editMode={editMode} viewBox="0 0 72 70" onSpaceClick={openSpace} floorLabel="3F" />
          </div>

          {/* スペース一覧 */}
          {[1,2,3].map(floor => {
            const fs = spaces.filter(s => s.floor === floor)
            if (fs.length === 0) return null
            const floorLabel: Record<number,string> = {1:'1F オープン空間', 2:'2F 静かな空間', 3:'3F 事務所'}
            const floorColor: Record<number,string> = {1:'#f97316', 2:'#3b82f6', 3:'#10b981'}
            return (
              <div key={floor} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 6, height: 20, borderRadius: 3, background: floorColor[floor] }} />
                  <span style={{ fontWeight: 500 }}>{floorLabel[floor]}</span>
                  <span style={{ color: '#78716c', fontSize: 13 }}>{fs.length}スペース</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {fs.map(space => (
                    <div key={space.id} style={{ position: 'relative' }}>
                      <button onClick={() => openSpace(space)}
                        style={{ width: '100%', borderRadius: 12, padding: 14, textAlign: 'left', cursor: 'pointer', background: space.color + '18', border: `1px solid ${space.color}50`, color: 'white' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: space.color, marginBottom: 6 }} />
                        <div style={{ fontWeight: 500, fontSize: 13, lineHeight: 1.3 }}>{space.name}</div>
                        {space.description && <div style={{ color: '#78716c', fontSize: 11, marginTop: 4 }}>{space.description}</div>}
                        <div style={{ color: space.color, fontSize: 12, marginTop: 6 }}>{counts[space.id] ? `📷 ${counts[space.id]}枚` : '画像なし'}</div>
                      </button>
                      <button onClick={e => { e.stopPropagation(); setEditSpace(space) }}
                        style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.4)', border: 'none', color: '#a8a29e', borderRadius: 6, width: 24, height: 24, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ✏️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          <button onClick={() => setAddSpaceOpen(true)}
            style={{ width: '100%', background: 'transparent', border: '1px dashed #57534e', color: '#78716c', borderRadius: 12, padding: 16, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>＋</span> スペースを追加
          </button>
        </div>

        {/* スペース詳細ポップアップ */}
        {selectedSpace && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setSelectedSpace(null)}>
            <div style={{ background: '#1c1917', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 640, border: '1px solid #44403c', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #292524', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: selectedSpace.color }} />
                      <h2 style={{ fontWeight: 500, fontSize: 18 }}>{selectedSpace.name}</h2>
                      <span style={{ color: '#78716c', fontSize: 12, background: '#292524', padding: '2px 8px', borderRadius: 99, border: '1px solid #44403c' }}>{selectedSpace.floor}F</span>
                    </div>
                    {selectedSpace.description && (
                      <p style={{ color: '#a8a29e', fontSize: 13, marginTop: 6, marginLeft: 24, lineHeight: 1.6 }}>{selectedSpace.description}</p>
                    )}
                  </div>
                  <button onClick={() => setSelectedSpace(null)} style={{ background: 'none', border: 'none', color: '#a8a29e', fontSize: 22, cursor: 'pointer' }}>×</button>
                </div>
              </div>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #292524', flexShrink: 0 }}>
                <button onClick={() => setAddImageOpen(true)}
                  style={{ width: '100%', background: 'transparent', border: '1px dashed #57534e', color: '#78716c', borderRadius: 10, padding: 10, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span>＋</span> イメージを追加
                </button>
              </div>
              <div style={{ overflowY: 'auto', padding: 16, flex: 1 }}>
                {loadingImages ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#78716c' }}>読み込み中...</div>
                ) : spaceImages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#57534e' }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>🖼️</div>
                    <p style={{ fontSize: 14 }}>まだ画像がありません</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    {spaceImages.map(img => (
                      <div key={img.id} onClick={() => setDetailImage(img)}
                        style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', border: '1px solid #292524' }}>
                        <img src={img.public_url} alt={img.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {img.title && (
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', padding: '16px 8px 8px' }}>
                            <p style={{ margin: 0, fontSize: 12, color: 'white', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{img.title}</p>
                          </div>
                        )}
                        <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', borderRadius: 99, padding: '2px 7px', fontSize: 11, color: '#d6d3d1' }}>{img.author_name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {detailImage && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setDetailImage(null)}>
            <div style={{ background: '#1c1917', borderRadius: 16, width: '100%', maxWidth: 400, border: '1px solid #44403c', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <img src={detailImage.public_url} alt="" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} />
              <div style={{ padding: 20 }}>
                {detailImage.title && <h3 style={{ fontWeight: 500, fontSize: 16, marginBottom: 12 }}>{detailImage.title}</h3>}
                {detailImage.reason && (
                  <div style={{ marginBottom: 10, background: 'rgba(109,40,217,0.15)', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600, marginBottom: 4 }}>✨ なぜいいか</div>
                    <p style={{ margin: 0, fontSize: 14, color: '#d6d3d1' }}>{detailImage.reason}</p>
                  </div>
                )}
                {detailImage.experience && (
                  <div style={{ marginBottom: 10, background: 'rgba(5,150,105,0.15)', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 12, color: '#34d399', fontWeight: 600, marginBottom: 4 }}>🌟 どんな体験ができるか</div>
                    <p style={{ margin: 0, fontSize: 14, color: '#d6d3d1' }}>{detailImage.experience}</p>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #292524' }}>
                  <span style={{ fontSize: 12, color: '#78716c' }}>by {detailImage.author_name}</span>
                  <button onClick={() => handleDeleteImage(detailImage.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>削除</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {addSpaceOpen && <AddSpaceModal onClose={() => setAddSpaceOpen(false)} onAdded={load} />}
        {editSpace && <EditSpaceModal space={editSpace} onClose={() => setEditSpace(null)} onSaved={handleSpaceSaved} />}
        {addImageOpen && selectedSpace && (
          <AddImageModal spaceId={selectedSpace.id} onClose={() => setAddImageOpen(false)} onAdded={() => { load(); if (selectedSpace) openSpace(selectedSpace) }} />
        )}
      </main>
    </PasswordGate>
  )
}
