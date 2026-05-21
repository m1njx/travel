import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, Edit3, Save, Clipboard, Check, RefreshCw, Plus, Trash2, PinOff, X, StickyNote } from 'lucide-react';

const STORAGE_KEY = 'tripsync_memos_list';

const loadNotes = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveNotes = (notes) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    console.error(e);
  }
};

const genId = () => `memo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

const NOTE_COLORS = [
  { bg: 'bg-blue-50', border: 'border-blue-100', pin: 'text-blue-500', fill: 'fill-blue-500' },
  { bg: 'bg-amber-50', border: 'border-amber-100', pin: 'text-amber-500', fill: 'fill-amber-500' },
  { bg: 'bg-emerald-50', border: 'border-emerald-100', pin: 'text-emerald-500', fill: 'fill-emerald-500' },
  { bg: 'bg-purple-50', border: 'border-purple-100', pin: 'text-purple-500', fill: 'fill-purple-500' },
  { bg: 'bg-rose-50', border: 'border-rose-100', pin: 'text-rose-500', fill: 'fill-rose-500' },
];

export default function MemoPage({ memo, updateMemo, nickname }) {
  const [memoText, setMemoText] = useState(memo || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  // Individual notes state
  const [notes, setNotes] = useState(loadNotes);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null); // null = creating new
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteColorIdx, setNoteColorIdx] = useState(0);

  useEffect(() => {
    if (!isEditing) setMemoText(memo || '');
  }, [memo, isEditing]);

  const handleSave = () => {
    updateMemo(memoText);
    setIsEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(memoText);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = memoText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    alert('메모 내용이 클립보드에 복사되었습니다.');
  };

  // --- Individual Notes CRUD ---
  const openNewNote = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteColorIdx(0);
    setShowNoteModal(true);
  };

  const openEditNote = (note) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteColorIdx(note.colorIdx ?? 0);
    setShowNoteModal(true);
  };

  const saveNote = () => {
    if (!noteContent.trim()) return;
    let updated;
    if (editingNote) {
      updated = notes.map(n =>
        n.id === editingNote.id
          ? { ...n, title: noteTitle.trim(), content: noteContent.trim(), colorIdx: noteColorIdx, updatedAt: Date.now() }
          : n
      );
    } else {
      const newNote = {
        id: genId(),
        title: noteTitle.trim() || '새 메모',
        content: noteContent.trim(),
        colorIdx: noteColorIdx,
        isPinned: false,
        author: nickname || '나',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      updated = [newNote, ...notes];
    }
    setNotes(updated);
    saveNotes(updated);
    setShowNoteModal(false);
  };

  const deleteNote = (id) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    saveNotes(updated);
  };

  const togglePin = (id) => {
    const updated = notes.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n);
    setNotes(updated);
    saveNotes(updated);
  };

  // Sorted: pinned first, then by createdAt desc
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.createdAt - a.createdAt;
  });

  const formatDate = (ts) => {
    return new Date(ts).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* 🖥️ Desktop Viewport */}
      <div className="hidden md:block pb-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-4 sm:px-5 pt-2 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-[24px] sm:text-[26px] md:text-[28px] font-bold text-toss-text-primary tracking-tight">공지 및 메모</h1>
            <p className="text-[13px] sm:text-[14px] text-toss-text-secondary mt-1">팀원들과 실시간으로 여행 메모를 공유하세요 📌</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {memoText.trim() && (
              <motion.button whileTap={{ scale: 0.95 }} onClick={copyToClipboard}
                className="p-2.5 rounded-xl bg-toss-bg text-toss-text-secondary hover:bg-toss-border/60 transition-colors shrink-0">
                <Clipboard className="w-4 h-4" />
              </motion.button>
            )}
            {!isEditing ? (
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setIsEditing(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-toss-blue text-white rounded-xl text-[14px] font-semibold shadow-sm hover:bg-toss-blue-dark shrink-0 whitespace-nowrap">
                <Edit3 className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">공지 수정</span>
              </motion.button>
            ) : (
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleSave}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-toss-success text-white rounded-xl text-[14px] font-semibold shadow-sm hover:bg-green-600 shrink-0 whitespace-nowrap">
                <Save className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">저장 완료</span>
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Shared board */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="mx-4 sm:mx-5 mb-6 bg-white rounded-3xl border border-toss-border p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-toss-bg">
            <Pin className="w-5 h-5 fill-amber-500 text-amber-500" />
            <span className="text-[14px] font-bold text-toss-text-primary">실시간 공통 보드</span>
            {saved && (
              <span className="text-[11px] text-toss-success ml-auto flex items-center gap-1 font-semibold animate-pulse">
                <Check className="w-3.5 h-3.5" /> 저장됨
              </span>
            )}
          </div>
          <div className="flex-1 flex flex-col">
            {isEditing ? (
              <textarea value={memoText} onChange={(e) => setMemoText(e.target.value)}
                placeholder="호텔 체크인 시간, 와이파이 비밀번호, 하루 예산 가이드라인 등 중요 정보를 입력하세요."
                className="w-full bg-toss-bg/30 p-4 rounded-2xl text-[15px] text-toss-text-primary border-0 focus:outline-none focus:ring-2 focus:ring-toss-blue/30 resize-none leading-relaxed min-h-[200px]"
                autoFocus />
            ) : (
              <div className="whitespace-pre-wrap text-[15px] text-toss-text-primary leading-relaxed font-medium min-h-[100px] px-1">
                {memo ? memo : (
                  <div className="flex flex-col items-center justify-center text-center text-toss-text-tertiary py-10">
                    <Pin className="w-10 h-10 text-toss-text-tertiary/30 mb-2" />
                    <p className="text-[14px] font-semibold">비어 있는 공통 보드</p>
                    <p className="text-[12px] mt-1">공지 수정을 눌러 첫 공지를 등록해 보세요.</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-toss-bg flex items-center justify-between text-[11px] text-toss-text-tertiary">
            <span>마지막 작성자: {nickname || '나'}</span>
            <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3 text-toss-success" /> 실시간 자동 동기화 됨</span>
          </div>
        </motion.div>

        {/* Individual notes section */}
        <div className="mx-4 sm:mx-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[16px] font-bold text-toss-text-primary">개인 메모장</h2>
              <p className="text-[12px] text-toss-text-secondary mt-0.5">핀으로 고정한 메모가 상단에 표시됩니다</p>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={openNewNote}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-toss-blue text-white rounded-xl text-[13px] font-semibold shadow-sm hover:bg-toss-blue-dark">
              <Plus className="w-4 h-4" /> 메모 추가
            </motion.button>
          </div>

          {sortedNotes.length === 0 ? (
            <div className="flex flex-col items-center py-16 bg-white rounded-2xl border border-toss-border/60 text-center">
              <StickyNote className="w-12 h-12 text-toss-text-tertiary/30 mb-3" />
              <p className="text-[14px] font-semibold text-toss-text-primary">개인 메모가 없어요</p>
              <p className="text-[12px] text-toss-text-secondary mt-1">메모 추가 버튼을 눌러 첫 메모를 남겨보세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              <AnimatePresence>
                {sortedNotes.map(note => {
                  const color = NOTE_COLORS[note.colorIdx ?? 0];
                  return (
                    <motion.div key={note.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={`${color.bg} border ${color.border} rounded-2xl p-4 flex flex-col gap-2 relative group shadow-sm hover:shadow-md transition-shadow`}>
                      {note.isPinned && (
                        <div className="absolute top-3 right-3">
                          <Pin className={`w-4 h-4 ${color.pin} ${color.fill}`} />
                        </div>
                      )}
                      {note.title && (
                        <p className="text-[13px] font-extrabold text-toss-text-primary pr-6 truncate">{note.title}</p>
                      )}
                      <p className="text-[13px] text-toss-text-primary leading-relaxed whitespace-pre-wrap flex-1">{note.content}</p>
                      <div className="pt-2 border-t border-black/5 flex items-center justify-between">
                        <span className="text-[10px] text-toss-text-tertiary">{note.author} · {formatDate(note.updatedAt)}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => togglePin(note.id)}
                            className={`p-1.5 rounded-lg hover:bg-black/5 transition-colors ${note.isPinned ? color.pin : 'text-toss-text-tertiary'}`}
                            title={note.isPinned ? '핀 해제' : '상단 고정'}>
                            {note.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => openEditNote(note)}
                            className="p-1.5 rounded-lg hover:bg-black/5 text-toss-text-tertiary transition-colors" title="수정">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteNote(note.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-toss-text-tertiary hover:text-toss-danger transition-colors" title="삭제">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* 📱 Mobile Viewport */}
      <div className="block md:hidden bg-[#f4f6fa] min-h-screen pb-24 text-toss-text-primary">
        {/* Header Block */}
        <div className="bg-gradient-to-br from-[#1b64da] via-[#2563eb] to-[#1d4ed8] text-white rounded-b-[2.5rem] px-6 pt-8 pb-12 shadow-lg relative overflow-hidden">
          <div className="absolute -right-6 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="absolute -left-10 -top-10 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col gap-1.5">
            <span className="text-[12px] font-extrabold text-blue-200/90 tracking-wider uppercase">Memo & Notice</span>
            <h1 className="text-[26px] font-black tracking-tight leading-tight">공지 및 메모</h1>
            <p className="text-[13px] text-blue-100/80 font-medium">실시간으로 중요한 공지와 메모를 팀원들과 공유하세요.</p>
          </div>
        </div>

        {/* Shared Board Card */}
        <div className="relative z-20 mt-[-2rem] mx-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl p-5 shadow-md border border-slate-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Pin className="w-5 h-5 fill-amber-500 text-amber-500" />
                <span className="text-[15px] font-extrabold text-slate-800">실시간 공통 보드</span>
              </div>
              <div className="flex gap-1.5 shrink-0">
                {memoText.trim() && (
                  <motion.button whileTap={{ scale: 0.95 }} onClick={copyToClipboard}
                    className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0">
                    <Clipboard className="w-4 h-4" />
                  </motion.button>
                )}
                {!isEditing ? (
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-[#2563eb] text-white rounded-xl text-[13px] font-extrabold shadow-sm inline-flex items-center justify-center gap-1 shrink-0 whitespace-nowrap">
                    <Edit3 className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                    <span className="whitespace-nowrap">공지 수정</span>
                  </motion.button>
                ) : (
                  <motion.button whileTap={{ scale: 0.95 }} onClick={handleSave}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[13px] font-extrabold shadow-sm inline-flex items-center justify-center gap-1 shrink-0 whitespace-nowrap">
                    <Save className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                    <span className="whitespace-nowrap">저장 완료</span>
                  </motion.button>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col">
              {isEditing ? (
                <textarea value={memoText} onChange={(e) => setMemoText(e.target.value)}
                  placeholder="호텔 체크인 시간, 와이파이 비밀번호, 하루 예산 가이드라인 등 중요 정보를 입력하고 저장해 보세요. 모든 팀원에게 즉시 공유됩니다."
                  className="w-full bg-slate-50 p-4 rounded-2xl text-[14px] text-slate-800 border-0 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none leading-relaxed min-h-[180px] font-bold"
                  autoFocus />
              ) : (
                <div className="whitespace-pre-wrap text-[14px] text-slate-700 leading-relaxed font-semibold min-h-[80px] px-1">
                  {memo ? memo : (
                    <div className="flex flex-col items-center justify-center text-center text-slate-400 py-8">
                      <Pin className="w-10 h-10 text-slate-200 mb-2" />
                      <p className="text-[14px] font-extrabold text-slate-700">비어 있는 공통 보드</p>
                      <p className="text-[12px] text-slate-400 mt-1">공지 수정을 눌러 첫 공지를 등록해 보세요.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-extrabold">
              <span>마지막 작성자: {nickname || '나'}</span>
              <span className="flex items-center gap-1 text-emerald-600">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-500" /> 실시간 동기화 완료
              </span>
            </div>
          </motion.div>
        </div>

        {/* Individual Notes Section */}
        <div className="mx-4 mt-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-extrabold text-slate-800">개인 메모장</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">핀 고정 메모가 상단에 뜹니다</p>
            </div>
            <button onClick={openNewNote}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2563eb] text-white rounded-xl text-[13px] font-extrabold shadow-sm active:scale-95 transition-transform">
              <Plus className="w-3.5 h-3.5" /> 메모 추가
            </button>
          </div>

          {sortedNotes.length === 0 ? (
            <div className="flex flex-col items-center py-14 bg-white rounded-2xl border border-slate-100 text-center shadow-sm">
              <StickyNote className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-[14px] font-extrabold text-slate-700">개인 메모가 없어요</p>
              <p className="text-[12px] text-slate-400 mt-1">메모 추가 버튼을 눌러 첫 메모를 남겨보세요.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <AnimatePresence>
                {sortedNotes.map(note => {
                  const color = NOTE_COLORS[note.colorIdx ?? 0];
                  return (
                    <motion.div key={note.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      className={`${color.bg} border ${color.border} rounded-2xl p-4 shadow-sm`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {note.isPinned && <Pin className={`w-4 h-4 shrink-0 ${color.pin} ${color.fill}`} />}
                          {note.title && (
                            <p className="text-[13px] font-extrabold text-toss-text-primary truncate">{note.title}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => togglePin(note.id)}
                            className={`p-1.5 rounded-lg active:scale-90 transition-transform ${note.isPinned ? color.pin : 'text-slate-400'}`}>
                            {note.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => openEditNote(note)}
                            className="p-1.5 rounded-lg text-slate-400 active:scale-90 transition-transform">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteNote(note.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 active:scale-90 transition-transform">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                      <p className="text-[10px] text-slate-400 mt-2">{note.author} · {formatDate(note.updatedAt)}</p>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Note Modal (shared for Desktop + Mobile) */}
      <AnimatePresence>
        {showNoteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[100] flex items-end md:items-center justify-center p-0 md:p-4"
            onClick={() => setShowNoteModal(false)}>
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-t-3xl md:rounded-3xl p-5 pb-8 sm:p-6 md:p-8 safe-bottom">
              <div className="w-10 h-1 bg-toss-border rounded-full mx-auto mb-5 md:hidden" />
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[18px] font-bold text-toss-text-primary">
                  {editingNote ? '메모 수정' : '새 메모'}
                </h2>
                <button onClick={() => setShowNoteModal(false)} className="p-2 rounded-xl hover:bg-toss-bg">
                  <X className="w-5 h-5 text-toss-text-secondary" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[13px] font-semibold text-toss-text-secondary mb-1.5 block">제목 (선택)</label>
                  <input type="text" value={noteTitle} onChange={e => setNoteTitle(e.target.value)}
                    placeholder="제목을 입력하세요"
                    className="w-full px-4 py-3 bg-toss-bg rounded-2xl text-[14px] text-toss-text-primary focus:outline-none focus:ring-2 focus:ring-toss-blue/30" />
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-toss-text-secondary mb-1.5 block">내용</label>
                  <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)}
                    placeholder="메모 내용을 입력하세요"
                    rows={5}
                    autoFocus
                    className="w-full px-4 py-3 bg-toss-bg rounded-2xl text-[14px] text-toss-text-primary resize-none leading-relaxed focus:outline-none focus:ring-2 focus:ring-toss-blue/30" />
                </div>
                {/* Color picker */}
                <div>
                  <label className="text-[13px] font-semibold text-toss-text-secondary mb-1.5 block">색상</label>
                  <div className="flex gap-2">
                    {NOTE_COLORS.map((c, i) => (
                      <button key={i} onClick={() => setNoteColorIdx(i)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${c.bg} ${noteColorIdx === i ? 'border-toss-blue scale-110 shadow-md' : 'border-transparent'}`} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowNoteModal(false)}
                  className="flex-1 py-3.5 rounded-2xl text-[15px] font-semibold text-toss-text-secondary bg-toss-bg">
                  취소
                </button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={saveNote}
                  disabled={!noteContent.trim()}
                  className="flex-1 py-3.5 rounded-2xl text-[15px] font-semibold text-white bg-toss-blue disabled:opacity-40">
                  {editingNote ? '수정 완료' : '메모 저장'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
