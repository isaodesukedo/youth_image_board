'use client'
import { useState } from 'react'
import { supabase, ImageItem } from '@/lib/supabase'

export default function EditImageModal({ image, onClose, onSaved }: { image: ImageItem; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(image.title || '')
  const [reason, setReason] = useState(image.reason || '')
  const [experience, setExperience] = useState(image.experience || '')
  const [author, setAuthor] = useState(image.author_name || '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const inp: React.CSSProperties = {
    width: '100%', background: '#f8fafc', color: '#1e293b', borderRadius: 12,
    padding: '10px 16px', border: '1.5px solid #e2e8f0', outline: 'none',
    fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit'
  }

  const handleSave = async () => {
    setLoading(true)
    const { error } = await supabase.from('images').update({
      title: title || null,
      reason: reason || null,
      experience: experience || null,
      author_name: author.trim() || '名無し',
    }).eq('id', image.id)
    setLoading(false)
    if (error) { alert('保存失敗: ' + error.message); return }
    setSaved(true)
    onSaved()
    setTimeout(() => { setSaved(false); onClose() }, 800)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 70, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 420, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 -4px 24px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e2e8f0' }} />
        </div>
        <div style={{ padding: '8px 20px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white' }}>
          <h2 style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', margin: 0 }}>✏️ 投稿を編集</h2>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', color: '#64748b', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <div style={{ padding: '8px 20px 12px' }}>
          <img src={image.public_url} alt="" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 12, marginBottom: 16 }} />
        </div>
        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input style={inp} placeholder="タイトル（任意）" value={title} onChange={e => setTitle(e.target.value)} />
          <textarea style={{ ...inp, resize: 'none', lineHeight: 1.6 }} rows={2} placeholder="✨ なぜいいか" value={reason} onChange={e => setReason(e.target.value)} />
          <textarea style={{ ...inp, resize: 'none', lineHeight: 1.6 }} rows={2} placeholder="🌟 どんな体験ができるか" value={experience} onChange={e => setExperience(e.target.value)} />
          <input style={inp} placeholder="投稿者名" value={author} onChange={e => setAuthor(e.target.value)} />
          <div style={{ display: 'flex', gap: 8, paddingBottom: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 12, background: '#f8fafc', color: '#64748b', border: '1.5px solid #e2e8f0', cursor: 'pointer', fontSize: 14 }}>キャンセル</button>
            <button onClick={handleSave} disabled={loading} style={{
              flex: 2, padding: 12, borderRadius: 12,
              background: saved ? '#10b981' : (loading ? '#94a3b8' : '#7c3aed'),
              color: 'white', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700
            }}>
              {saved ? '✅ 保存完了！' : loading ? '保存中...' : '保存する'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
