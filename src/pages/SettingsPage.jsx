import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Users, Key, Plus, Trash2, Info, Share2, Copy, LogOut, Wifi, WifiOff, Check } from 'lucide-react';

export default function SettingsPage({
  members, setMembers, apiKey, setApiKey, isEnvKey, roomCode, nickname, isOnline, onLeave, isAdmin, onChangeNickname
}) {
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberCode, setNewMemberCode] = useState('');
  const [showApiInput, setShowApiInput] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);
  const [copied, setCopied] = useState(false);

  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [tempNickname, setTempNickname] = useState(nickname);

  const handleSaveNickname = async () => {
    if (tempNickname.trim() === nickname) {
      setIsEditingNickname(false);
      return;
    }
    const success = await onChangeNickname(tempNickname);
    if (success) {
      setIsEditingNickname(false);
    }
  };

  const addMember = () => {
    if (!isAdmin) return;
    const name = newMemberName.trim();
    const code = newMemberCode.trim().toUpperCase();
    if (!name) {
      alert("이름을 입력해주세요.");
      return;
    }
    if (!code) {
      alert("초대 코드를 입력해주세요.");
      return;
    }
    if (code.length !== 6) {
      alert("초대 코드는 6자리여야 합니다.");
      return;
    }
    const nameExists = members.some(m => (typeof m === 'object' ? m.name : m) === name);
    if (nameExists) {
      alert("이미 존재하는 이름입니다.");
      return;
    }
    const codeExists = members.some(m => typeof m === 'object' && m.inviteCode === code);
    if (codeExists) {
      alert("이미 사용 중인 초대 코드입니다.");
      return;
    }
    setMembers([...members, { name, inviteCode: code }]);
    setNewMemberName('');
    setNewMemberCode('');
  };

  const removeMember = (m) => {
    if (!isAdmin) return;
    const targetName = typeof m === 'object' ? m.name : m;
    setMembers(members.filter(x => (typeof x === 'object' ? x.name : x) !== targetName));
  };

  const saveApiKey = () => {
    setApiKey(tempKey.trim());
    setShowApiInput(false);
  };

  const copyCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = roomCode; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareCode = async () => {
    if (!roomCode) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'TripSync 초대', text: `TripSync 여행에 참여하세요!\n초대 코드: ${roomCode}` });
      } catch {}
    } else {
      copyCode();
    }
  };

  return (
    <div className="pb-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-4 sm:px-5 pt-2 pb-4">
        <h1 className="text-[24px] sm:text-[26px] md:text-[28px] font-bold text-toss-text-primary tracking-tight">설정</h1>
        <p className="text-[13px] sm:text-[14px] text-toss-text-secondary mt-1">앱 설정을 관리하세요 ⚙️</p>
      </motion.div>

      {/* Room Info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mx-4 sm:mx-5 mb-6 toss-card">
        <div className="flex items-center gap-2 mb-4">
          {isOnline ? <Wifi className="w-5 h-5 text-toss-success" /> : <WifiOff className="w-5 h-5 text-toss-text-tertiary" />}
          <span className="text-[15px] font-bold text-toss-text-primary">{isOnline ? '실시간 공유 모드' : '오프라인 모드'}</span>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 flex items-center justify-between px-4 py-3.5 bg-toss-bg rounded-2xl">
            <div className="w-full">
              <p className="text-[12px] text-toss-text-secondary">내 이름 (닉네임)</p>
              {isEditingNickname ? (
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={tempNickname}
                    onChange={e => setTempNickname(e.target.value)}
                    className="flex-1 px-3 py-1 bg-white border border-toss-border rounded-lg text-[14px]"
                    maxLength={10}
                  />
                  <button onClick={handleSaveNickname} className="px-3 py-1 bg-toss-blue text-white rounded-lg text-[12px] font-semibold">
                    저장
                  </button>
                  <button onClick={() => { setIsEditingNickname(false); setTempNickname(nickname); }} className="px-3 py-1 bg-white border border-toss-border rounded-lg text-[12px]">
                    취소
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-[15px] font-semibold text-toss-text-primary">{nickname || '나'}</p>
                  <button onClick={() => setIsEditingNickname(true)} className="text-[12px] text-toss-blue font-semibold hover:underline">
                    변경
                  </button>
                </div>
              )}
            </div>
          </div>

          {roomCode && (
            <div className="flex-[2] px-4 py-3.5 bg-toss-bg rounded-2xl">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-[12px] text-toss-text-secondary">
                    {isAdmin ? '방 초대 코드' : '내 초대 코드'}
                  </p>
                  <p className="text-[20px] sm:text-[24px] font-extrabold text-toss-blue tracking-[0.2em] mt-0.5 tabular-nums">
                    {isAdmin ? roomCode : (() => {
                      const me = members.find(m => typeof m === 'object' && m.name === nickname);
                      return me?.inviteCode || '------';
                    })()}
                  </p>
                </div>
                {isAdmin && (
                  <div className="flex gap-1.5 ml-auto">
                    <motion.button whileTap={{ scale: 0.9 }} onClick={copyCode}
                      className="p-2.5 rounded-xl bg-white border border-toss-border btn-icon-sm">
                      {copied ? <Check className="w-4 h-4 text-toss-success" /> : <Copy className="w-4 h-4 text-toss-text-secondary" />}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={shareCode}
                      className="p-2.5 rounded-xl bg-toss-blue btn-icon-sm">
                      <Share2 className="w-4 h-4 text-white" />
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pt-2">
          <p className="text-[11px] sm:text-[12px] text-toss-text-tertiary">
            {isAdmin 
              ? '이 방 초대 코드를 관리자에 등록하여 팀원을 추가할 수 있습니다.' 
              : '개인 초대 코드를 통해 로그인하여 개인 및 공통 데이터에 안전하게 접근할 수 있습니다.'}
          </p>
          <motion.button whileTap={{ scale: 0.97 }} onClick={onLeave}
            className="w-full md:w-auto px-4 py-2.5 rounded-xl text-[13px] font-medium text-toss-text-secondary bg-toss-bg flex items-center justify-center gap-1.5 whitespace-nowrap self-end">
            <LogOut className="w-4 h-4" /> 여행 나가기
          </motion.button>
        </div>
      </motion.div>

      {/* If admin, render Team Management, Gemini API, and Data Reset */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4 sm:px-5">
          {/* Members Section */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="toss-card">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-toss-blue" />
              <span className="text-[15px] font-bold text-toss-text-primary">팀원 관리</span>
              <span className="text-[12px] text-toss-text-tertiary ml-auto">{members.length}명</span>
            </div>
            <div className="space-y-2 mb-4 max-h-[220px] overflow-y-auto pr-1">
              <AnimatePresence mode="popLayout">
                {members.map((m) => {
                  const name = typeof m === 'object' ? m.name : m;
                  const code = typeof m === 'object' ? m.inviteCode : null;
                  return (
                    <motion.div key={name} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                      className="flex items-center justify-between px-3.5 py-2.5 bg-toss-bg rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-gradient-to-br from-toss-blue to-blue-400 rounded-full flex items-center justify-center">
                          <span className="text-[11px] font-bold text-white">{name.charAt(0)}</span>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] sm:text-[14px] font-bold text-toss-text-primary">{name}</span>
                            {name === nickname && <span className="text-[9px] text-toss-blue bg-toss-blue-light px-1.5 py-0.5 rounded-full">나</span>}
                            {code === 'ADMIN' && <span className="text-[9px] text-indigo-650 bg-indigo-50 px-1.5 py-0.5 rounded-full">👑 관리자</span>}
                          </div>
                          {code && code !== 'ADMIN' && (
                            <span className="text-[11.5px] text-toss-text-secondary font-mono tracking-wider mt-0.5">
                              코드: <span className="font-bold text-toss-blue">{code}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      {name !== nickname && code !== 'ADMIN' && (
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => removeMember(m)} className="p-1.5 rounded-full hover:bg-red-50 btn-icon-sm">
                          <Trash2 className="w-4 h-4 text-toss-text-tertiary" />
                        </motion.button>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            
            <div className="space-y-2">
              <div className="flex gap-2">
                <input type="text" placeholder="이름" value={newMemberName} onChange={e => setNewMemberName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-toss-bg rounded-xl text-[13px] border-0 outline-none" />
                <input type="text" placeholder="초대 코드 (6자리)" value={newMemberCode} onChange={e => setNewMemberCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="w-[140px] px-3 py-2 bg-toss-bg rounded-xl text-[13px] border-0 text-center font-bold tracking-wider uppercase outline-none" />
              </div>
              <motion.button whileTap={{ scale: 0.95 }} onClick={addMember}
                className="w-full py-2.5 bg-toss-blue rounded-xl text-white text-[13px] font-semibold flex items-center justify-center gap-1 shadow-sm shadow-toss-blue/10">
                <Plus className="w-4 h-4" /> 팀원 추가
              </motion.button>
            </div>
          </motion.div>

          {/* API Settings Section */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="toss-card">
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-5 h-5 text-toss-blue" />
              <span className="text-[15px] font-bold text-toss-text-primary">Gemini API 설정</span>
            </div>
            <div className="flex items-start gap-2 mb-3.5 px-3 py-2.5 bg-toss-blue-light rounded-xl">
              <Info className="w-4.5 h-4.5 text-toss-blue mt-0.5 flex-shrink-0" />
              <p className="text-[11.5px] sm:text-[12px] text-toss-blue leading-relaxed">
                {isEnvKey 
                  ? '.env 파일에서 API 키가 연동되어 영수증 스캔 기능이 활성화되었습니다.' 
                  : '영수증 OCR AI 스캔 기능을 사용하려면 Gemini API 키를 입력해 주세요.'}
              </p>
            </div>
            {isEnvKey ? (
              <div className="flex items-center justify-between px-4 py-3 bg-green-50 rounded-xl">
                <div>
                  <p className="text-[14px] font-medium text-toss-success">✅ .env 파일에서 자동 적용됨</p>
                  <p className="text-[12px] text-toss-text-secondary mt-0.5">...{apiKey.slice(-8)}</p>
                </div>
              </div>
            ) : apiKey ? (
              <div className="flex items-center justify-between px-4 py-3 bg-toss-bg rounded-xl">
                <div>
                  <p className="text-[14px] font-medium text-toss-text-primary">API 키 설정됨</p>
                  <p className="text-[12px] text-toss-text-secondary mt-0.5">...{apiKey.slice(-8)}</p>
                </div>
                <div className="flex gap-2">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setShowApiInput(true); setTempKey(apiKey); }}
                    className="px-3 py-2 rounded-xl text-[13px] font-medium bg-white border border-toss-border text-toss-text-secondary">수정</motion.button>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => setApiKey('')}
                    className="px-3 py-2 rounded-xl text-[13px] font-medium bg-red-50 text-toss-danger">삭제</motion.button>
                </div>
              </div>
            ) : (
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowApiInput(true)}
                className="w-full py-3 rounded-xl bg-toss-blue text-white text-[14px] font-semibold">API 키 등록하기</motion.button>
            )}
            <AnimatePresence>
              {showApiInput && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                  <input type="password" placeholder="Gemini API 키" value={tempKey} onChange={e => setTempKey(e.target.value)}
                    className="w-full px-4 py-3 bg-toss-bg rounded-xl text-[14px] mb-2" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowApiInput(false)} className="flex-1 py-2 rounded-xl text-[13px] font-medium text-toss-text-secondary bg-toss-bg">취소</button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={saveApiKey} className="flex-1 py-2 rounded-xl text-[13px] font-semibold text-white bg-toss-blue">저장</motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Data Management */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="toss-card">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-toss-blue" />
              <span className="text-[15px] font-bold text-toss-text-primary">데이터 관리</span>
            </div>
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => { if (window.confirm('모든 데이터를 삭제하시겠습니까?')) { localStorage.clear(); window.location.reload(); } }}
              className="w-full py-3 rounded-xl bg-red-50 text-toss-danger text-[14px] font-semibold">
              모든 데이터 초기화
            </motion.button>
          </motion.div>
        </div>
      )}

      <div className="px-5 pt-10 text-center">
        <p className="text-[12px] text-toss-text-tertiary">TripSync v2.0</p>
        <p className="text-[11px] text-toss-text-tertiary mt-1">Made with ❤️ for Europe Trip</p>
      </div>
    </div>
  );
}
