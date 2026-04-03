'use client'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function AddImageModal({ spaceId, onClose, onAdded }: { spaceId: string; onClose: () => void; onAdded: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [reason, setReason] = useState('')
  const [experience, setExperience] = useState('')
  const [author, setAuthor] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const inp: React.CSSProperties = {
    width: '100%', background: '#f8fafc', color: '#1e293b', borderRadius: 12,
    padding: '10px 16px', border: '1.5px solid #e2e8f0', outline: 'none',
    fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit'
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    setFile(f); setPreview(URL.createObjectURL(f))
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
    setLoading(false); onAdded(); onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 420, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 -4px 24px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e2e8f0' }} />
        </div>
        <div style={{ padding: '8px 20px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white' }}>
          <h2 style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', margin: 0 }}>📸 イメージを追加</h2>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', color: '#64748b', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div onClick={() => fileRef.current?.click()} style={{
            aspectRatio: '16/9', borderRadius: 14, border: `2px dashed ${preview ? 'transparent' : '#cbd5e1'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            background: '#f8fafc', overflow: 'hidden'
          }}>
            {preview ? <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 6 }}>📷</div>
                <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>タップして画像を選択</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
          <input style={inp} placeholder="タイトル（任意）" value={title} onChange={e => setTitle(e.target.value)} />
          <textarea style={{ ...inp, resize: 'none', lineHeight: 1.6 }} rows={2} placeholder="✨ なぜいいか（理由・好きなポイント）" value={reason} onChange={e => setReason(e.target.value)} />
          <textarea style={{ ...inp, resize: 'none', lineHeight: 1.6 }} rows={2} placeholder="🌟 どんな体験ができるか（想像・ビジョン）" value={experience} onChange={e => setExperience(e.target.value)} />
          <input style={inp} placeholder="あなたの名前（任意）" value={author} onChange={e => setAuthor(e.target.value)} />
          <div style={{ display: 'flex', gap: 8, paddingBottom: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 12, background: '#f8fafc', color: '#64748b', border: '1.5px solid #e2e8f0', cursor: 'pointer', fontSize: 14 }}>キャンセル</button>
            <button onClick={handleUpload} disabled={!file || loading} style={{
              flex: 2, padding: 12, borderRadius: 12, background: !file ? '#e2e8f0' : '#7c3aed',
              color: !file ? '#94a3b8' : 'white', border: 'none', cursor: file && !loading ? 'pointer' : 'default',
              fontSize: 14, fontWeight: 700
            }}>
              {loading ? 'アップロード中...' : '追加する'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
