'use client'
import { useEffect, useState } from 'react'
import { supabase, Space, ImageItem } from '@/lib/supabase'
import PasswordGate from '@/components/PasswordGate'
import AddImageModal from '@/components/AddImageModal'
import { useRouter, useParams } from 'next/navigation'

export default function SpacePage() {
  const params = useParams()
  const id = params.id as string
  const [space, setSpace] = useState<Space | null>(null)
  const [images, setImages] = useState<ImageItem[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [selected, setSelected] = useState<ImageItem | null>(null)
  const router = useRouter()

  const load = async () => {
    const { data: s } = await supabase.from('spaces').select('*').eq('id', id).single()
    const { data: imgs } = await supabase.from('images').select('*').eq('space_id', id).order('created_at', { ascending: false })
    setSpace(s)
    setImages(imgs || [])
  }

  useEffect(() => { load() }, [id])

  const handleDelete = async (imgId: string) => {
    if (!confirm('この画像を削除しますか？')) return
    await supabase.from('images').delete().eq('id', imgId)
    setSelected(null)
    load()
  }

  if (!space) return (
    <div style={{ minHeight: '100vh', background: '#0c0a09', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#78716c' }}>
      読み込み中...
    </div>
  )

  return (
    <PasswordGate>
      <main style={{ minHeight: '100vh', background: '#0c0a09', color: 'white', paddingBottom: '80px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 16px' }}>

          {/* Back */}
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: '#78716c', cursor: 'pointer', fontSize: '0.875rem', marginBottom: '16px', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
            ← 戻る
          </button>

          {/* Header */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: space.color, flexShrink: 0 }} />
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{space.name}</h1>
              <span style={{ color: '#78716c', fontSize: '0.875rem', background: '#1c1917', padding: '2px 10px', borderRadius: '99px', border: '1px solid #44403c' }}>{space.floor}F</span>
            </div>
            {space.description && <p style={{ color: '#a8a29e', fontSize: '0.875rem', margin: '0 0 0 28px' }}>{space.description}</p>}
          </div>

          {/* Add button */}
          <button
            onClick={() => setAddOpen(true)}
            style={{
              width: '100%', background: 'transparent', border: '1px dashed #57534e',
              color: '#78716c', borderRadius: '12px', padding: '16px', cursor: 'pointer',
              fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              marginBottom: '24px'
            }}
          >
            <span style={{ fontSize: '1.125rem' }}>＋</span> イメージを追加
          </button>

          {/* Image grid */}
          {images.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0', color: '#57534e' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🖼️</div>
              <p style={{ margin: '0 0 4px', fontSize: '0.875rem' }}>まだ画像がありません</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#44403c' }}>上のボタンから追加してみよう</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {images.map(img => (
                <div
                  key={img.id}
                  onClick={() => setSelected(img)}
                  style={{ position: 'relative', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', border: '1px solid #292524' }}
                >
                  <img src={img.public_url} alt={img.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {img.title && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', padding: '20px 8px 8px' }}>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'white', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{img.title}</p>
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', borderRadius: '99px', padding: '2px 8px', fontSize: '0.7rem', color: '#d6d3d1' }}>
                    {img.author_name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail modal */}
        {selected && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '16px' }} onClick={() => setSelected(null)}>
            <div style={{ background: '#1c1917', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: '400px', border: '1px solid #44403c', overflow: 'hidden', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <img src={selected.public_url} alt="" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} />
              <div style={{ padding: '20px' }}>
                {selected.title && <h3 style={{ fontWeight: 'bold', fontSize: '1rem', margin: '0 0 12px' }}>{selected.title}</h3>}
                {selected.reason && (
                  <div style={{ marginBottom: '12px', background: 'rgba(109,40,217,0.15)', borderRadius: '12px', padding: '12px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: '600', marginBottom: '4px' }}>✨ なぜいいか</div>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#d6d3d1' }}>{selected.reason}</p>
                  </div>
                )}
                {selected.experience && (
                  <div style={{ marginBottom: '12px', background: 'rgba(5,150,105,0.15)', borderRadius: '12px', padding: '12px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '600', marginBottom: '4px' }}>🌟 どんな体験ができるか</div>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#d6d3d1' }}>{selected.experience}</p>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #292524' }}>
                  <span style={{ fontSize: '0.75rem', color: '#78716c' }}>by {selected.author_name}</span>
                  <button onClick={() => handleDelete(selected.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }}>削除</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {addOpen && <AddImageModal spaceId={id} onClose={() => setAddOpen(false)} onAdded={load} />}
      </main>
    </PasswordGate>
  )
}
