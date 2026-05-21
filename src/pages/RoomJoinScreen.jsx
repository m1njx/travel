import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plane, Users, Plus, LogIn, Wifi, WifiOff } from 'lucide-react';
import { generateRoomCode, isFirebaseConfigured } from '../utils/firebase';

export default function RoomJoinScreen({ onJoin }) {
  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const firebaseReady = isFirebaseConfigured();

  const handleCreate = () => {
    if (!nickname.trim()) return;
    const roomCode = generateRoomCode();
    onJoin(roomCode, nickname.trim(), true);
  };

  const handleJoin = () => {
    if (!nickname.trim() || code.trim().length < 4) return;
    onJoin(code.trim().toUpperCase(), nickname.trim(), false);
  };

  const handleOffline = () => {
    onJoin('', nickname.trim() || '나', false);
  };

  return (
    <div className="min-h-screen min-h-dvh bg-white flex flex-col items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}
            className="w-20 h-20 bg-toss-blue rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-toss-blue/20">
            <Plane className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-[28px] font-extrabold text-toss-text-primary tracking-tight">TripSync</h1>
          <p className="text-[14px] text-toss-text-secondary mt-1">함께 떠나는 유럽 여행 플래너</p>
        </div>

        {!mode ? (
          /* Initial selection */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="space-y-3">
            <div className="mb-4">
              <label className="text-xs md:text-sm font-semibold text-toss-text-secondary mb-2 block">내 이름</label>
              <input type="text" placeholder="닉네임을 입력하세요" value={nickname}
                onChange={e => setNickname(e.target.value)}
                className="w-full px-4 py-3.5 bg-toss-bg rounded-2xl text-base" />
            </div>

            {firebaseReady && (
              <>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => nickname.trim() ? setMode('create') : null}
                  disabled={!nickname.trim()}
                  className="w-full py-4 rounded-2xl bg-toss-blue text-white text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-40">
                  <Plus className="w-5 h-5" /> 새 여행 만들기
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => nickname.trim() ? setMode('join') : null}
                  disabled={!nickname.trim()}
                  className="w-full py-4 rounded-2xl bg-toss-bg text-toss-text-primary text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-40">
                  <LogIn className="w-5 h-5" /> 초대 코드로 참여
                </motion.button>
              </>
            )}

            <motion.button whileTap={{ scale: 0.97 }} onClick={handleOffline}
              className="w-full py-4 rounded-2xl border border-toss-border text-toss-text-secondary text-sm font-medium flex items-center justify-center gap-2">
              {firebaseReady ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
              {firebaseReady ? '오프라인 모드 (혼자 쓰기)' : '시작하기'}
            </motion.button>

            {!firebaseReady && (
              <p className="text-xs text-toss-text-tertiary text-center mt-2 leading-relaxed">
                실시간 공유를 사용하려면 .env 파일에<br/>Firebase 설정을 추가하세요
              </p>
            )}
          </motion.div>
        ) : mode === 'create' ? (
          /* Create room */
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="text-center mb-2">
              <p className="text-base md:text-lg font-semibold text-toss-text-primary">새 여행을 만들까요?</p>
              <p className="text-xs md:text-sm text-toss-text-secondary mt-1">초대 코드가 생성되어 팀원을 초대할 수 있어요</p>
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleCreate}
              className="w-full py-4 rounded-2xl bg-toss-blue text-white text-base font-semibold">
              여행 만들기 ✈️
            </motion.button>
            <button onClick={() => setMode(null)}
              className="w-full py-3 text-sm text-toss-text-secondary font-medium">뒤로</button>
          </motion.div>
        ) : (
          /* Join room */
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div>
              <label className="text-xs md:text-sm font-semibold text-toss-text-secondary mb-2 block">초대 코드</label>
              <input type="text" placeholder="6자리 코드 입력" value={code}
                onChange={e => setCode(e.target.value.toUpperCase())} maxLength={6}
                className="w-full px-4 py-3.5 bg-toss-bg rounded-2xl text-xl md:text-2xl font-bold text-center tracking-[0.3em]" autoFocus />
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleJoin}
              disabled={code.trim().length < 4}
              className="w-full py-4 rounded-2xl bg-toss-blue text-white text-[15px] font-semibold disabled:opacity-40">
              참여하기
            </motion.button>
            <button onClick={() => setMode(null)}
              className="w-full py-3 text-[14px] text-toss-text-secondary font-medium">뒤로</button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
