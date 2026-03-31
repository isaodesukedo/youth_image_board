'use client'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const inp = { width: '100%', background: '#292524', color: 'white', borderRadius: 12, padding: '10px 16px', border: '1px solid #57534e', outline: 'none', fontSize: 14, boxSizing: 'border-box' as const }

export default function AddImageModal({ spaceId, onClose, onAdded }: { spaceId: string; onClose: () => void; onAdded: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [reason, setReason] = useState('')
  const [experience, setExperience] = useState('')
  const [author, setAuthor] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    const ext = file.name.split('.').pop()
    const path = `${spaceId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('youth_image').upload(path, file, { upsert: true })
    if (error) { alert('アップロード失敗: ' + error.message); setLoading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('youth_image').getPublicUrl(path)
    await supabase.from('images').insert({
      space_id: spaceId, storage_path: path, public_url: publicUrl,
      title: title || null, reason: reason || null, experience: experience || null,
      author_name: author.trim() || '名無し',
    })
    setLoading(false)
    onAdded()
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#1c1917', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 400, border: '1px solid #44403c', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #292524', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#1c1917' }}>
          <h2 style={{ fontWeight: 500, fontSize: 16 }}>イメージを追加</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#a8a29e', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div onClick={() => fileRef.current?.click()} style={{ aspectRatio: '16/9', borderRadius: 12, border: '2px dashed #57534e', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#292524', overflow: 'hidden' }}>
            {preview ? <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 4 }}>📷</div>
                <p style={{ color: '#a8a29e', fontSize: 14 }}>タップして画像を選択</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
          <input style={inp} placeholder="タイトル（任意）" value={title} onChange={e => setTitle(e.target.value)} />
          <textarea style={{ ...inp, resize: 'none' }} rows={2} placeholder="✨ なぜいいか（理由・好きなポイント）" value={reason} onChange={e => setReason(e.target.value)} />
          <textarea style={{ ...inp, resize: 'none' }} rows={2} placeholder="🌟 どんな体験ができるか（想像・ビジョン）" value={experience} onChange={e => setExperience(e.target.value)} />
          <input style={inp} placeholder="あなたの名前（任意）" value={author} onChange={e => setAuthor(e.target.value)} />
          <div style={{ display: 'flex', gap: 8, paddingBottom: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 12, background: 'transparent', color: 'white', border: '1px solid #57534e', cursor: 'pointer', fontSize: 14 }}>キャンセル</button>
            <button onClick={handleUpload} disabled={!file || loading} style={{ flex: 1, padding: 12, borderRadius: 12, background: '#7c3aed', color: 'white', border: 'none', cursor: file && !loading ? 'pointer' : 'default', fontSize: 14, fontWeight: 600, opacity: !file ? 0.5 : 1 }}>
              {loading ? 'アップロード中...' : '追加する'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
