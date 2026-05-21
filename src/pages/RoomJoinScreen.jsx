import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, Lock, Users, LogIn, ChevronRight, Sparkles } from 'lucide-react';

export default function RoomJoinScreen({ onJoinMember, onJoinAdmin }) {
  const [role, setRole] = useState('member'); // 'member' | 'admin'
  const [nickname, setNickname] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) {
      alert('이름을 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      if (role === 'member') {
        if (!inviteCode.trim()) {
          alert('초대 코드를 입력해 주세요.');
          setLoading(false);
          return;
        }
        const success = await onJoinMember(nickname, inviteCode);
        if (!success) setLoading(false);
      } else {
        if (!password) {
          alert('비밀번호를 입력해 주세요.');
          setLoading(false);
          return;
        }
        const success = await onJoinAdmin(nickname, password);
        if (!success) setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-dvh bg-white flex flex-col items-center justify-center px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-9">
          <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            transition={{ type: 'spring', delay: 0.1 }}
            className="w-18 h-18 bg-toss-blue rounded-[24px] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-toss-blue/20"
          >
            <Plane className="w-9 h-9 text-white" />
          </motion.div>
          <h1 className="text-[26px] font-extrabold text-toss-text-primary tracking-tight">TripSync</h1>
          <p className="text-[13.5px] text-toss-text-secondary mt-1">유럽 여행 일정 실시간 동기화 플래너</p>
        </div>

        {/* Toss style card */}
        <div className="bg-toss-bg/30 border border-toss-border/50 rounded-3xl p-5.5 shadow-sm mb-6">
          <div className="flex gap-2.5 mb-5 p-1 bg-toss-bg rounded-xl">
            <button
              type="button"
              onClick={() => { setRole('member'); setNickname(''); setInviteCode(''); setPassword(''); }}
              className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition-all ${
                role === 'member' 
                  ? 'bg-white text-toss-blue shadow-sm' 
                  : 'text-toss-text-secondary hover:text-toss-text-primary'
              }`}
            >
              👤 멤버 로그인
            </button>
            <button
              type="button"
              onClick={() => { setRole('admin'); setNickname(''); setInviteCode(''); setPassword(''); }}
              className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition-all ${
                role === 'admin' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-toss-text-secondary hover:text-toss-text-primary'
              }`}
            >
              👑 관리자 로그인
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {role === 'member' ? (
                <motion.div
                  key="member"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-[12px] font-bold text-toss-text-secondary mb-1.5 block">내 이름</label>
                    <input
                      type="text"
                      placeholder="이름을 입력해 주세요"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-toss-border/80 focus:border-toss-blue rounded-xl text-[14.5px] outline-none transition-all shadow-inner-sm"
                      maxLength={10}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-bold text-toss-text-secondary mb-1.5 block">초대 코드</label>
                    <input
                      type="text"
                      placeholder="6자리 코드 입력"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="w-full px-4 py-3 bg-white border border-toss-border/80 focus:border-toss-blue rounded-xl text-[18px] font-bold tracking-[0.3em] text-center uppercase outline-none transition-all shadow-inner-sm"
                      required
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-[12px] font-bold text-toss-text-secondary mb-1.5 block">관리자 이름</label>
                    <input
                      type="text"
                      placeholder="이름을 입력해 주세요"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-toss-border/80 focus:border-indigo-500 rounded-xl text-[14.5px] outline-none transition-all shadow-inner-sm"
                      maxLength={10}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-bold text-toss-text-secondary mb-1.5 block">관리자 비밀번호</label>
                    <input
                      type="password"
                      placeholder="관리자 비밀번호 입력"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-toss-border/80 focus:border-indigo-500 rounded-xl text-[14.5px] outline-none transition-all shadow-inner-sm"
                      required
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-2xl text-[14.5px] font-bold text-white shadow-md flex items-center justify-center gap-1.5 transition-all ${
                role === 'member' 
                  ? 'bg-toss-blue hover:bg-toss-blue/95 shadow-toss-blue/10' 
                  : 'bg-indigo-600 hover:bg-indigo-650 shadow-indigo-600/10'
              } disabled:opacity-50`}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4.5 h-4.5" />
                  {role === 'member' ? '여행 플래너 합류하기' : '관리자로 입장하기'}
                </>
              )}
            </motion.button>
          </form>
        </div>

        {/* Small premium hint info */}
        <div className="flex items-center gap-1.5 justify-center text-[11px] text-toss-text-tertiary">
          <Sparkles className="w-3.5 h-3.5 text-toss-text-tertiary" />
          <span>노트북, 컴퓨터 및 모바일 기기 모두 실시간 동기화 지원</span>
        </div>
      </motion.div>
    </div>
  );
}
