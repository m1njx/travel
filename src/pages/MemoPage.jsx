import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, Edit3, Save, Share2, Clipboard, Check, RefreshCw } from 'lucide-react';

export default function MemoPage({ memo, updateMemo, nickname }) {
  const [memoText, setMemoText] = useState(memo || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Sync with external updates unless currently editing
    if (!isEditing) {
      setMemoText(memo || '');
    }
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
      alert('메모 내용이 클립보드에 복사되었습니다.');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = memoText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      alert('메모 내용이 클립보드에 복사되었습니다.');
    }
  };

  return (
    <>
      {/* 🖥️ Desktop Viewport (100% Unchanged, with shrink fix) */}
      <div className="hidden md:block pb-6 h-full flex flex-col">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-4 sm:px-5 pt-2 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-[24px] sm:text-[26px] md:text-[28px] font-bold text-toss-text-primary tracking-tight">공지 및 메모</h1>
            <p className="text-[13px] sm:text-[14px] text-toss-text-secondary mt-1">팀원들과 실시간으로 여행 메모를 공유하세요 📌</p>
          </div>
          
          <div className="flex gap-2 shrink-0">
            {memoText.trim() && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={copyToClipboard}
                className="p-2.5 rounded-xl bg-toss-bg text-toss-text-secondary hover:bg-toss-border/60 transition-colors btn-icon-sm shrink-0"
                title="메모 전체 복사"
              >
                <Clipboard className="w-4 h-4" />
              </motion.button>
            )}
            {!isEditing ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-toss-blue text-white rounded-xl text-[14px] font-semibold shadow-sm hover:bg-toss-blue-dark shrink-0 whitespace-nowrap w-auto"
              >
                <Edit3 className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">메모 수정</span>
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSave}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-toss-success text-white rounded-xl text-[14px] font-semibold shadow-sm hover:bg-green-600 shrink-0 whitespace-nowrap w-auto"
              >
                <Save className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">저장 완료</span>
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Main Memo Content Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex-1 mx-4 sm:mx-5 bg-white rounded-3xl border border-toss-border p-5 sm:p-6 md:p-8 shadow-sm flex flex-col min-h-[400px]"
        >
          <div className="flex items-center gap-2 mb-4 text-amber-500 pb-3 border-b border-toss-bg">
            <Pin className="w-5 h-5 fill-amber-500" />
            <span className="text-[14px] font-bold text-toss-text-primary">실시간 공통 보드</span>
            {saved && (
              <span className="text-[11px] text-toss-success ml-auto flex items-center gap-1 font-semibold animate-pulse">
                <Check className="w-3.5 h-3.5" /> 저장됨
              </span>
            )}
          </div>

          <div className="flex-1 flex flex-col">
            {isEditing ? (
              <textarea
                value={memoText}
                onChange={(e) => setMemoText(e.target.value)}
                placeholder="호텔 체크인 시간, 와이파이 비밀번호, 하루 예산 가이드라인 등 중요 정보를 입력하고 저장해 보세요. 모든 팀원에게 즉시 공유됩니다."
                className="flex-1 w-full bg-toss-bg/30 p-4 rounded-2xl text-[15px] sm:text-[16px] text-toss-text-primary border-0 focus:outline-none focus:ring-2 focus:ring-toss-blue/30 resize-none leading-relaxed min-h-[300px]"
                autoFocus
              />
            ) : (
              <div className="flex-1 whitespace-pre-wrap text-[15px] sm:text-[16px] text-toss-text-primary leading-relaxed font-medium min-h-[300px] overflow-y-auto px-1">
                {memo ? (
                  memo
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-toss-text-tertiary py-20">
                    <Pin className="w-12 h-12 text-toss-text-tertiary/40 mb-3" />
                    <p className="text-[15px] font-semibold">비어 있는 메모장</p>
                    <p className="text-[13px] mt-1">상단의 [메모 수정]을 눌러 여행 첫 공지를 등록해 보세요.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer info inside Card */}
          <div className="mt-4 pt-4 border-t border-toss-bg flex items-center justify-between text-[11px] text-toss-text-tertiary">
            <span>마지막 작성자: {nickname || '나'}</span>
            <span className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3 text-toss-success" />
              실시간 자동 동기화 됨
            </span>
          </div>
        </motion.div>
      </div>

      {/* 📱 Mobile Viewport (Toss-style Redesign) */}
      <div className="block md:hidden bg-[#f4f6fa] min-h-screen pb-20 text-toss-text-primary">
        {/* Header Block (Toss-style blue gradient) */}
        <div className="bg-gradient-to-br from-[#1b64da] via-[#2563eb] to-[#1d4ed8] text-white rounded-b-[2.5rem] px-6 pt-8 pb-14 shadow-lg relative overflow-hidden">
          <div className="absolute -right-6 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="absolute -left-10 -top-10 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col gap-1.5">
            <span className="text-[12px] font-extrabold text-blue-200/90 tracking-wider uppercase">Shared Memo Board</span>
            <h1 className="text-[26px] font-black tracking-tight leading-tight">공지 및 메모</h1>
            <p className="text-[13px] text-blue-100/80 font-medium">실시간으로 중요한 공지와 메모를 팀원들과 공유하세요.</p>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="relative z-20 mt-[-2rem] mx-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl p-5 shadow-md border border-slate-100 flex flex-col min-h-[420px]"
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Pin className="w-5 h-5 fill-amber-500 text-amber-500" />
                <span className="text-[15px] font-extrabold text-slate-800">실시간 공통 보드</span>
              </div>
              
              <div className="flex gap-1.5 shrink-0">
                {memoText.trim() && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={copyToClipboard}
                    className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0"
                  >
                    <Clipboard className="w-4 h-4" />
                  </motion.button>
                )}
                {!isEditing ? (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-[#2563eb] text-white rounded-xl text-[13px] font-extrabold shadow-sm inline-flex items-center justify-center gap-1 shrink-0 whitespace-nowrap w-auto"
                  >
                    <Edit3 className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                    <span className="whitespace-nowrap">메모 수정</span>
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSave}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[13px] font-extrabold shadow-sm inline-flex items-center justify-center gap-1 shrink-0 whitespace-nowrap w-auto"
                  >
                    <Save className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                    <span className="whitespace-nowrap">저장 완료</span>
                  </motion.button>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col">
              {isEditing ? (
                <textarea
                  value={memoText}
                  onChange={(e) => setMemoText(e.target.value)}
                  placeholder="호텔 체크인 시간, 와이파이 비밀번호, 하루 예산 가이드라인 등 중요 정보를 입력하고 저장해 보세요. 모든 팀원에게 즉시 공유됩니다."
                  className="flex-1 w-full bg-slate-50 p-4 rounded-2xl text-[14px] text-slate-800 border-0 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none leading-relaxed min-h-[250px] font-bold"
                  autoFocus
                />
              ) : (
                <div className="flex-1 whitespace-pre-wrap text-[14px] text-slate-700 leading-relaxed font-semibold min-h-[250px] overflow-y-auto px-1">
                  {memo ? (
                    memo
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-14">
                      <Pin className="w-12 h-12 text-slate-200 mb-3" />
                      <p className="text-[14px] font-extrabold text-slate-700">비어 있는 메모장</p>
                      <p className="text-[12px] text-slate-400 mt-1">상단의 [메모 수정]을 눌러 여행 첫 공지를 등록해 보세요.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer info inside Card */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-extrabold">
              <span>마지막 작성자: {nickname || '나'}</span>
              <span className="flex items-center gap-1 text-emerald-600">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
                실시간 동기화 완료
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
