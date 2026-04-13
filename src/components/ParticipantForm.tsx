'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
interface ParticipantFormProps { transcriptId: string; onClose: () => void; onSubmit: () => void; }
export default function ParticipantForm({ transcriptId, onClose, onSubmit }: ParticipantFormProps) {
  const [participants, setParticipants] = useState<string[]>(['']);
  const [inputValue, setInputValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();
  const handleAdd = () => { if (inputValue.trim()) { setParticipants([...participants.filter(p => p.trim()), inputValue.trim()]); setInputValue(''); } };
  const handleRemove = (index: number) => { setParticipants(participants.filter((_, i) => i !== index)); };
  const handleSave = async () => { setIsSaving(true); try { await supabase.from('transcripts').update({ participants: participants.filter(p => p.trim()), participants_confirmed: true }).eq('id', transcriptId); onSubmit(); } catch (err) { console.error(err); } finally { setIsSaving(false); } };
  const handleSkip = async () => { setIsSaving(true); try { await supabase.from('transcripts').update({ participants_confirmed: true }).eq('id', transcriptId); onSubmit(); } catch (err) { console.error(err); } finally { setIsSaving(false); } };
  return (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6"><h2 className="text-2xl font-bold mb-1" style={{ color: '#1672A7' }}>Who(ttended?</h2><p className="text-sm mb-6" style={{ color: '#525252' }}>Enter participant names or skip.</p>{participants.filter(p => p.trim()).length > 0 && (<div className="flex flex-wrap gap-2 mb-4">{participants.filter(p => p.trim()).map((p, i) => (<span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm" style={{ backgroundColor: '#EBF4FA', color: '#1672A7' }}>{p}<button onClick={() => handleRemove(i)}>&times;</button></span>))}</div>)}<div className="flex gap-2 mb-6"><input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())} placeholder="Type a name, press Enter" className="flex-1 px-4 py-2.5 rounded-lg border-2 text-sm" style={{ borderColor: '#EFEFEF', color: '#262626' }} /><button onClick={handleAdd} className="px-5 py-2.5 rounded-full text-sm font-medium text-white" style={{ backgroundColor: '#1672A7' }}>Add</button></div><div className="flex justify-end gap-3"><button onClick={handleSkip} disabled={isSaving} className="px-5 py-2.5 rounded-full text-sm font-medium border-2" style={{ borderColor: '#1672A7', color: '#1672A7' }}>Skip</button><button onClick={handleSave} disabled={isSaving} className="px-6 py-2.5 rounded-full text-sm font-medium" style={{ backgroundColor: '#F4C436', color: '#262626' }}>{isSaving ? 'Saving...' : 'Continue'}</button></div></div></div>);
}
