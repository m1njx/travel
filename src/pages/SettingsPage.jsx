import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Users, Key, Plus, Trash2, Info, Share2, Copy, LogOut, Wifi, WifiOff, Check, Calendar, Edit3, Flag } from 'lucide-react';

export default function SettingsPage({
  members, setMembers, apiKey, setApiKey, isEnvKey, roomCode, nickname, isOnline, onLeave, isAdmin, onChangeNickname, teams = [], setTeams
}) {
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberCode, setNewMemberCode] = useState('');
  const [newMemberTeamIds, setNewMemberTeamIds] = useState([]);
  
  const [showApiInput, setShowApiInput] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);
  const [copied, setCopied] = useState(false);

  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [tempNickname, setTempNickname] = useState(nickname);

  // States for dynamic Team Management
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamStartDate, setNewTeamStartDate] = useState('');
  const [newTeamEndDate, setNewTeamEndDate] = useState('');

  // States for inline member editing
  const [editingMemberName, setEditingMemberName] = useState(null);
  const [editMemberNameInput, setEditMemberNameInput] = useState('');
  const [editMemberCodeInput, setEditMemberCodeInput] = useState('');
  const [editMemberTeamIds, setEditMemberTeamIds] = useState([]);

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
    setMembers([...members, { name, inviteCode: code, teamIds: newMemberTeamIds }]);
    setNewMemberName('');
    setNewMemberCode('');
    setNewMemberTeamIds([]);
  };

  const removeMember = (m) => {
    if (!isAdmin) return;
    const targetName = typeof m === 'object' ? m.name : m;
    setMembers(members.filter(x => (typeof x === 'object' ? x.name : x) !== targetName));
  };

  const startEditMember = (m) => {
    const name = typeof m === 'object' ? m.name : m;
    const code = typeof m === 'object' ? m.inviteCode : '';
    const teamIds = typeof m === 'object' ? m.teamIds || [] : [];
    
    setEditingMemberName(name);
    setEditMemberNameInput(name);
    setEditMemberCodeInput(code);
    setEditMemberTeamIds(teamIds);
  };

  const saveMemberEdit = () => {
    const cleanName = editMemberNameInput.trim();
    const cleanCode = editMemberCodeInput.trim().toUpperCase();
    
    if (!cleanName) {
      alert("이름을 입력해주세요.");
      return;
    }
    if (!cleanCode) {
      alert("초대 코드를 입력해주세요.");
      return;
    }
    if (cleanCode.length !== 6 && cleanCode !== 'ADMIN') {
      alert("초대 코드는 6자리여야 합니다.");
      return;
    }

    // Check uniqueness excluding current member
    const nameExists = members.some(m => {
      const n = typeof m === 'object' ? m.name : m;
      return n !== editingMemberName && n === cleanName;
    });
    if (nameExists) {
      alert("이미 존재하는 이름입니다.");
      return;
    }

    const codeExists = members.some(m => {
      if (typeof m === 'object' && m.name !== editingMemberName) {
        return m.inviteCode === cleanCode;
      }
      return false;
    });
    if (codeExists && cleanCode !== 'ADMIN') {
      alert("이미 사용 중인 초대 코드입니다.");
      return;
    }

    const updatedMembers = members.map(m => {
      const currentName = typeof m === 'object' ? m.name : m;
      if (currentName === editingMemberName) {
        return {
          name: cleanName,
          inviteCode: cleanCode,
          teamIds: editMemberTeamIds
        };
      }
      return m;
    });

    setMembers(updatedMembers);
    setEditingMemberName(null);
  };

  // Team management functions
  const addTeam = () => {
    if (!isAdmin) return;
    const name = newTeamName.trim();
    const start = newTeamStartDate;
    const end = newTeamEndDate;

    if (!name) {
      alert("팀명을 입력해주세요.");
      return;
    }
    if (!start || !end) {
      alert("시작일과 종료일을 입력해주세요.");
      return;
    }
    if (new Date(start) > new Date(end)) {
      alert("시작일은 종료일보다 빨라야 합니다.");
      return;
    }

    const nameExists = (teams || []).some(t => t.name === name);
    if (nameExists) {
      alert("이미 존재하는 팀명입니다.");
      return;
    }

    const newTeam = {
      id: `team_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name,
      startDate: start,
      endDate: end
    };

    setTeams([...(teams || []), newTeam]);
    setNewTeamName('');
    setNewTeamStartDate('');
    setNewTeamEndDate('');
  };

  const removeTeam = (teamId) => {
    if (!isAdmin) return;
    if (!window.confirm("이 팀을 삭제하시겠습니까? 팀 삭제 시 소속된 멤버들의 팀 지정이 해제됩니다.")) return;
    
    // Remove team from teams
    const updatedTeams = (teams || []).filter(t => t.id !== teamId);
    setTeams(updatedTeams);

    // Remove this teamId from all members
    const updatedMembers = members.map(m => {
      if (typeof m === 'object' && m.teamIds) {
        return {
          ...m,
          teamIds: m.teamIds.filter(id => id !== teamId)
        };
      }
      return m;
    });
    setMembers(updatedMembers);
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
    <>
      {/* 🖥️ Desktop Viewport (100% Unchanged) */}
      <div className="hidden md:block pb-6">
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

            {!isAdmin && roomCode && (
              <div className="flex-[2] px-4 py-3.5 bg-toss-bg rounded-2xl">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-[12px] text-toss-text-secondary">내 초대 코드</p>
                    <p className="text-[20px] sm:text-[24px] font-extrabold text-toss-blue tracking-[0.2em] mt-0.5 tabular-nums">
                      {(() => {
                        const me = members.find(m => typeof m === 'object' && m.name === nickname);
                        return me?.inviteCode || '------';
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pt-2">
            <p className="text-[11px] sm:text-[12px] text-toss-text-tertiary">
              {isAdmin 
                ? '실시간 공유 모드로 팀원들과 일정을 실시간으로 공유하고 관리합니다.' 
                : '개인 초대 코드를 통해 로그인하여 개인 및 공통 데이터에 안전하게 접근할 수 있습니다.'}
            </p>
            <motion.button whileTap={{ scale: 0.97 }} onClick={onLeave}
              className="w-full md:w-auto px-4 py-2.5 rounded-xl text-[13px] font-medium text-toss-text-secondary bg-toss-bg flex items-center justify-center gap-1.5 whitespace-nowrap self-end">
              <LogOut className="w-4 h-4" /> 여행 나가기
            </motion.button>
          </div>
        </motion.div>

        {/* For non-admins, show assigned teams */}
        {!isAdmin && (
          <div className="mx-4 sm:mx-5 mb-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="toss-card">
              <div className="flex items-center gap-2 mb-4">
                <Flag className="w-5 h-5 text-toss-blue" />
                <span className="text-[15px] font-bold text-toss-text-primary">내 소속 팀 정보</span>
              </div>
              
              {(() => {
                const activeMember = members.find(m => typeof m === 'object' && m.name === nickname);
                const activeMemberTeamIds = activeMember?.teamIds || [];
                const activeMemberTeams = (teams || []).filter(t => activeMemberTeamIds.includes(t.id));

                if (activeMemberTeams.length === 0) {
                  return (
                    <div className="text-center py-6 px-4 bg-toss-bg rounded-2xl">
                      <p className="text-[14px] font-semibold text-toss-text-secondary">소속된 팀이 없습니다.</p>
                      <p className="text-[12px] text-toss-text-tertiary mt-1">관리자에게 문의하여 팀을 지정 받으세요.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    <p className="text-[12.5px] text-toss-text-secondary">
                      소속된 팀의 여행 기간에 등록된 일정만 홈 및 일정 화면에 표시됩니다.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeMemberTeams.map(t => (
                        <div key={t.id} className="p-4 bg-gradient-to-br from-toss-blue/5 to-indigo-50/30 border border-toss-blue/10 rounded-2xl flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-toss-blue text-white font-extrabold self-start mb-2 inline-block">
                              소속 팀
                            </span>
                            <h4 className="text-[15px] font-extrabold text-toss-text-primary mt-1">{t.name}</h4>
                          </div>
                          <div className="mt-3 pt-2.5 border-t border-toss-border/50">
                            <p className="text-[11px] text-toss-text-secondary font-medium">활동 기간</p>
                            <p className="text-[13px] font-bold text-toss-blue tracking-tight mt-0.5">
                              📅 {t.startDate} ~ {t.endDate}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}

        {/* If admin, render Team Management, Members Section, Gemini API, and Data Reset */}
        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4 sm:px-5">
            {/* Team Management Card */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="toss-card">
              <div className="flex items-center gap-2 mb-4">
                <Flag className="w-5 h-5 text-toss-blue" />
                <span className="text-[15px] font-bold text-toss-text-primary">팀 관리</span>
                <span className="text-[12px] text-toss-text-tertiary ml-auto">{(teams || []).length}개 팀</span>
              </div>

              <div className="space-y-2 mb-4 max-h-[220px] overflow-y-auto pr-1">
                <AnimatePresence mode="popLayout">
                  {(teams || []).map((t) => (
                    <motion.div key={t.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                      className="flex items-center justify-between px-3.5 py-2.5 bg-toss-bg rounded-xl">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] sm:text-[14px] font-bold text-toss-text-primary">{t.name}</span>
                        </div>
                        <span className="text-[11.5px] text-toss-blue font-semibold tracking-tight mt-0.5 block">
                          📅 {t.startDate} ~ {t.endDate}
                        </span>
                      </div>
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => removeTeam(t.id)} className="p-1.5 rounded-full hover:bg-red-50 btn-icon-sm">
                        <Trash2 className="w-4 h-4 text-toss-text-tertiary hover:text-toss-danger" />
                      </motion.button>
                    </motion.div>
                  ))}
                  {(teams || []).length === 0 && (
                    <div className="text-center py-8 text-toss-text-tertiary text-[13px]">
                      등록된 팀이 없습니다. 아래에서 팀을 생성하세요.
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-toss-border/60">
                <div className="space-y-2">
                  <input type="text" placeholder="팀명 (예: 런던팀)" value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-toss-bg rounded-xl text-[13px] border-0 outline-none focus:ring-2 focus:ring-toss-blue/20 transition-all" />
                  <div className="flex gap-2">
                    <div className="flex-1 min-w-0">
                      <label className="text-[10px] font-bold text-toss-text-secondary pl-1 block mb-0.5">시작일</label>
                      <input type="date" value={newTeamStartDate} onChange={e => setNewTeamStartDate(e.target.value)}
                        className="w-full min-w-0 px-2.5 py-2 bg-toss-bg rounded-xl text-[12px] border-0 outline-none focus:ring-2 focus:ring-toss-blue/20 transition-all block" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="text-[10px] font-bold text-toss-text-secondary pl-1 block mb-0.5">종료일</label>
                      <input type="date" value={newTeamEndDate} onChange={e => setNewTeamEndDate(e.target.value)}
                        className="w-full min-w-0 px-2.5 py-2 bg-toss-bg rounded-xl text-[12px] border-0 outline-none focus:ring-2 focus:ring-toss-blue/20 transition-all block" />
                    </div>
                  </div>
                </div>
                <motion.button whileTap={{ scale: 0.95 }} onClick={addTeam}
                  className="w-full py-2.5 bg-toss-blue rounded-xl text-white text-[13px] font-semibold flex items-center justify-center gap-1 shadow-sm shadow-toss-blue/10">
                  <Plus className="w-4 h-4" /> 팀 만들기
                </motion.button>
              </div>
            </motion.div>

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
                    const teamIds = typeof m === 'object' ? m.teamIds || [] : [];
                    
                    const isEditing = editingMemberName === name;

                    if (isEditing) {
                      return (
                        <motion.div key={name} layout className="p-3 bg-white border border-toss-blue/30 rounded-xl space-y-2.5 shadow-sm">
                          <div className="flex gap-2">
                            <input type="text" value={editMemberNameInput} onChange={e => setEditMemberNameInput(e.target.value)}
                              className="flex-1 px-3 py-2 bg-toss-bg rounded-lg text-[13px] border-0 outline-none" placeholder="이름" />
                            <input type="text" value={editMemberCodeInput} onChange={e => setEditMemberCodeInput(e.target.value.toUpperCase())}
                              maxLength={6} disabled={code === 'ADMIN'}
                              className="w-[100px] px-3 py-2 bg-toss-bg rounded-lg text-[13px] border-0 text-center font-bold tracking-wider outline-none disabled:opacity-55" placeholder="코드" />
                          </div>
                          {teams && teams.length > 0 && (
                            <div className="px-1">
                              <p className="text-[11px] font-bold text-toss-text-secondary mb-1">소속 팀 선택</p>
                              <div className="flex flex-wrap gap-1.5">
                                {teams.map(t => {
                                  const isSel = editMemberTeamIds.includes(t.id);
                                  return (
                                    <button key={t.id} type="button"
                                      onClick={() => {
                                        if (isSel) {
                                          setEditMemberTeamIds(editMemberTeamIds.filter(id => id !== t.id));
                                        } else {
                                          setEditMemberTeamIds([...editMemberTeamIds, t.id]);
                                        }
                                      }}
                                      className={`px-2 py-1 rounded-lg text-[10.5px] font-semibold border transition-all ${
                                        isSel ? 'bg-toss-blue/10 border-toss-blue text-toss-blue' : 'bg-toss-bg border-toss-border/40 text-toss-text-secondary'
                                      }`}>
                                      {t.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          <div className="flex gap-1.5">
                            <button onClick={() => setEditingMemberName(null)}
                              className="flex-1 py-1.5 rounded-lg text-[11.5px] font-medium text-toss-text-secondary bg-toss-bg">
                              취소
                            </button>
                            <button onClick={saveMemberEdit}
                              className="flex-1 py-1.5 rounded-lg text-[11.5px] font-semibold text-white bg-toss-blue">
                              저장
                            </button>
                          </div>
                        </motion.div>
                      );
                    }

                    const memberTeams = teamIds.map(id => (teams || []).find(t => t.id === id)).filter(Boolean);

                    return (
                      <motion.div key={name} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                        className="flex items-center justify-between px-3.5 py-2.5 bg-toss-bg rounded-xl">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-7 h-7 bg-gradient-to-br from-toss-blue to-blue-400 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-[11px] font-bold text-white">{name.charAt(0)}</span>
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[13px] sm:text-[14px] font-bold text-toss-text-primary truncate">{name}</span>
                              {name === nickname && <span className="text-[9px] text-toss-blue bg-toss-blue-light px-1.5 py-0.5 rounded-full font-semibold">나</span>}
                              {code === 'ADMIN' && <span className="text-[9px] text-indigo-650 bg-indigo-50 px-1.5 py-0.5 rounded-full font-semibold">👑 관리자</span>}
                            </div>
                            {code && code !== 'ADMIN' && (
                              <span className="text-[11px] text-toss-text-secondary font-mono tracking-wider mt-0.5">
                                코드: <span className="font-bold text-toss-blue">{code}</span>
                              </span>
                            )}
                            {memberTeams.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {memberTeams.map(t => (
                                  <span key={t.id} className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-toss-blue-light text-toss-blue font-extrabold border border-toss-blue/10">
                                    {t.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-0.5 ml-2">
                          {code !== 'ADMIN' && (
                            <motion.button whileTap={{ scale: 0.9 }} onClick={() => startEditMember(m)} className="p-1.5 rounded-full hover:bg-toss-bg btn-icon-sm">
                              <Edit3 className="w-3.5 h-3.5 text-toss-text-secondary" />
                            </motion.button>
                          )}
                          {name !== nickname && code !== 'ADMIN' && (
                            <motion.button whileTap={{ scale: 0.9 }} onClick={() => removeMember(m)} className="p-1.5 rounded-full hover:bg-red-50 btn-icon-sm">
                              <Trash2 className="w-4 h-4 text-toss-text-tertiary hover:text-toss-danger" />
                            </motion.button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
              
              <div className="space-y-2.5 pt-2 border-t border-toss-border/60">
                <input type="text" placeholder="이름" value={newMemberName} onChange={e => setNewMemberName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-toss-bg rounded-xl text-[13px] border-0 outline-none focus:ring-2 focus:ring-toss-blue/20 transition-all" />
                <input type="text" placeholder="초대 코드 (6자리)" value={newMemberCode} onChange={e => setNewMemberCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="w-full px-4 py-2.5 bg-toss-bg rounded-xl text-[13px] border-0 text-left font-bold tracking-wider uppercase outline-none focus:ring-2 focus:ring-toss-blue/20 transition-all text-toss-blue" />
                
                {teams && teams.length > 0 && (
                  <div className="px-1 py-1">
                    <p className="text-[11.5px] font-bold text-toss-text-secondary mb-1.5">소속 팀 선택</p>
                    <div className="flex flex-wrap gap-1.5">
                      {teams.map(t => {
                        const isSelected = newMemberTeamIds.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setNewMemberTeamIds(newMemberTeamIds.filter(id => id !== t.id));
                              } else {
                                setNewMemberTeamIds([...newMemberTeamIds, t.id]);
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all ${
                              isSelected
                                ? 'bg-toss-blue/10 border-toss-blue text-toss-blue'
                                : 'bg-toss-bg border-toss-border/40 text-toss-text-secondary hover:bg-toss-bg/85'
                            }`}
                          >
                            {t.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

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
                  {isEnvKey || apiKey
                    ? 'Gemini API 키가 연동되어 AI 서비스가 활성화되었습니다. (호출 모델: gemini-2.5-flash / gemini-1.5-flash)'
                    : 'AI 추천, 일정 최적화 및 영수증 OCR 스캔을 사용하려면 Gemini API 키를 등록해 주세요.'}
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

      {/* 📱 Mobile Viewport (Toss-style Redesign) */}
      <div className="block md:hidden bg-[#f4f6fa] min-h-screen pb-28 text-toss-text-primary">
        {/* Header Block (Toss-style blue gradient) */}
        <div className="bg-gradient-to-br from-[#1b64da] via-[#2563eb] to-[#1d4ed8] text-white rounded-b-[2.5rem] px-6 pt-8 pb-14 shadow-lg relative overflow-hidden">
          <div className="absolute -right-6 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="absolute -left-10 -top-10 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col gap-1.5">
            <span className="text-[12px] font-extrabold text-blue-200/90 tracking-wider uppercase flex items-center gap-1">
              <Settings className="w-3.5 h-3.5 stroke-[2.5]" /> User Settings
            </span>
            <h1 className="text-[26px] font-black tracking-tight leading-tight">설정</h1>
            <p className="text-[13px] text-blue-100/80 font-medium">실시간 동기화 정보 및 팀과 멤버 정보를 관리해 보세요.</p>
          </div>
        </div>

        {/* Main Content Cards */}
        <div className="relative z-20 mt-[-2rem] mx-4 space-y-4">
          {/* Shared Mode & Nickname Card */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100/80">
            <div className="flex items-center gap-2 mb-4">
              {isOnline ? (
                <div className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1 text-[11px] font-black">
                  <Wifi className="w-3 h-3 stroke-[3]" /> 실시간 동기화 중
                </div>
              ) : (
                <div className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1 text-[11px] font-black">
                  <WifiOff className="w-3 h-3 stroke-[3]" /> 오프라인 작동 중
                </div>
              )}
            </div>

            <div className="space-y-3.5">
              <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[11px] text-slate-400 font-extrabold">내 이름 (닉네임)</p>
                {isEditingNickname ? (
                  <div className="flex flex-col gap-2 mt-2">
                    <input
                      type="text"
                      value={tempNickname}
                      onChange={e => setTempNickname(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-blue-500/30 rounded-xl text-[14px] font-bold outline-none"
                      maxLength={10}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => { setIsEditingNickname(false); setTempNickname(nickname); }} 
                        className="flex-1 py-2 bg-slate-200 text-slate-650 rounded-xl text-[12px] font-extrabold">
                        취소
                      </button>
                      <button onClick={handleSaveNickname} 
                        className="flex-1 py-2 bg-[#2563eb] text-white rounded-xl text-[12px] font-extrabold">
                        저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[15px] font-black text-slate-800">{nickname || '나'}</span>
                    <button onClick={() => setIsEditingNickname(true)} className="text-[12px] text-[#2563eb] font-extrabold bg-blue-50 px-2.5 py-1 rounded-lg">
                      변경
                    </button>
                  </div>
                )}
              </div>

              {!isAdmin && roomCode && (
                <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[11px] text-slate-400 font-extrabold">내 초대 코드</p>
                  <p className="text-[20px] font-black text-[#2563eb] tracking-[0.15em] mt-1 tabular-nums">
                    {(() => {
                      const me = members.find(m => typeof m === 'object' && m.name === nickname);
                      return me?.inviteCode || '------';
                    })()}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col gap-3">
              <p className="text-[11.5px] text-slate-400 font-extrabold leading-relaxed">
                {isAdmin 
                  ? '👑 실시간 관리자 모드로 로그인되었습니다. 모든 팀원들의 일정을 수정하고 조율할 권한이 있습니다.' 
                  : '👤 개인 초대 코드로 로그인되었습니다. 관리자로부터 팀을 할당받으면 전용 일정이 노출됩니다.'}
              </p>
              
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onLeave}
                className="w-full py-3 rounded-2xl text-[13px] font-extrabold text-slate-500 bg-slate-100 hover:bg-slate-200/80 transition-colors flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-4 h-4 stroke-[2.5]" />
                <span>여행 나가기</span>
              </motion.button>
            </div>
          </div>

          {/* Non-Admin Assigned Teams Card */}
          {!isAdmin && (
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100/80">
              <div className="flex items-center gap-2 mb-3">
                <Flag className="w-5 h-5 text-[#2563eb]" />
                <span className="text-[15px] font-extrabold text-slate-800">내 소속 팀 정보</span>
              </div>
              
              {(() => {
                const activeMember = members.find(m => typeof m === 'object' && m.name === nickname);
                const activeMemberTeamIds = activeMember?.teamIds || [];
                const activeMemberTeams = (teams || []).filter(t => activeMemberTeamIds.includes(t.id));

                if (activeMemberTeams.length === 0) {
                  return (
                    <div className="text-center py-6 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-[13px] font-extrabold text-slate-500">소속된 팀이 없습니다.</p>
                      <p className="text-[11.5px] text-slate-400 mt-1">관리자에게 문의하여 여행 팀을 배정받으세요.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    <p className="text-[12px] text-slate-400 font-extrabold leading-normal">
                      소속된 팀의 여행 활동 기간에 등록된 일정들만 자동으로 필터링되어 화면에 노출됩니다.
                    </p>
                    <div className="space-y-2.5">
                      {activeMemberTeams.map(t => (
                        <div key={t.id} className="p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100/40 rounded-2xl">
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#2563eb] text-white font-black inline-block">
                            소속 팀
                          </span>
                          <h4 className="text-[15px] font-black text-slate-800 mt-1.5">{t.name}</h4>
                          <div className="mt-2.5 pt-2 border-t border-slate-100/60">
                            <p className="text-[10px] text-slate-400 font-extrabold">팀 활동 기간</p>
                            <p className="text-[12.5px] font-black text-[#2563eb] mt-0.5">
                              📅 {t.startDate} ~ {t.endDate}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Admin Team & Member Management Panels */}
          {isAdmin && (
            <div className="space-y-4">
              {/* Team Management Panel (FIXED Date overflow) */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100/80">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Flag className="w-5 h-5 text-[#2563eb]" />
                    <span className="text-[15px] font-extrabold text-slate-800">팀 관리</span>
                  </div>
                  <span className="text-[11.5px] bg-blue-50 text-[#2563eb] px-2 py-0.5 rounded-full font-black">
                    {(teams || []).length}개 팀
                  </span>
                </div>

                {/* Team Rows */}
                <div className="space-y-2 mb-4 max-h-[220px] overflow-y-auto pr-1">
                  <AnimatePresence mode="popLayout">
                    {(teams || []).map((t) => (
                      <motion.div key={t.id} layout className="flex items-center justify-between px-3.5 py-3 bg-slate-50 border border-slate-100 rounded-2xl">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[13.5px] font-black text-slate-800">{t.name}</h4>
                          <span className="text-[11px] text-[#2563eb] font-extrabold block mt-0.5">
                            📅 {t.startDate} ~ {t.endDate}
                          </span>
                        </div>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => removeTeam(t.id)} className="p-2 rounded-full hover:bg-red-50 text-slate-350 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </motion.div>
                    ))}
                    {(teams || []).length === 0 && (
                      <div className="text-center py-8 bg-slate-50 rounded-2xl text-slate-400 text-[12.5px] font-bold">
                        등록된 팀이 없습니다. 아래에서 팀을 생성하세요.
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Add Team Form (FIXED DATE OVERFLOW - STACKED FOR MOBILE) */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="space-y-2.5">
                    <input 
                      type="text" 
                      placeholder="팀명 (예: 런던팀, 유럽팀)" 
                      value={newTeamName} 
                      onChange={e => setNewTeamName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-transparent focus:border-blue-500/20 rounded-2xl text-[13.5px] outline-none transition-all font-bold" 
                    />
                    
                    {/* Date Pickers stacked vertically to prevent side overflows */}
                    <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-extrabold text-slate-400">시작일</label>
                        <input 
                          type="date" 
                          value={newTeamStartDate} 
                          onChange={e => setNewTeamStartDate(e.target.value)}
                          className="bg-transparent text-[13px] font-black text-slate-700 border-0 outline-none cursor-pointer" 
                        />
                      </div>
                      <div className="h-px bg-slate-200/60 my-1"></div>
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-extrabold text-slate-400">종료일</label>
                        <input 
                          type="date" 
                          value={newTeamEndDate} 
                          onChange={e => setNewTeamEndDate(e.target.value)}
                          className="bg-transparent text-[13px] font-black text-slate-700 border-0 outline-none cursor-pointer" 
                        />
                      </div>
                    </div>
                  </div>
                  
                  <motion.button 
                    whileTap={{ scale: 0.95 }} 
                    onClick={addTeam}
                    className="w-full py-3.5 bg-[#2563eb] text-white text-[13.5px] font-extrabold rounded-2xl flex items-center justify-center gap-1 shadow-md shadow-blue-100"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" /> 팀 만들기
                  </motion.button>
                </div>
              </div>

              {/* Members Management Panel */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100/80">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#2563eb]" />
                    <span className="text-[15px] font-extrabold text-slate-800">팀원 관리</span>
                  </div>
                  <span className="text-[11.5px] bg-blue-50 text-[#2563eb] px-2 py-0.5 rounded-full font-black">
                    {members.length}명
                  </span>
                </div>

                {/* Member Rows */}
                <div className="space-y-2 mb-4 max-h-[260px] overflow-y-auto pr-1">
                  <AnimatePresence mode="popLayout">
                    {members.map((m) => {
                      const name = typeof m === 'object' ? m.name : m;
                      const code = typeof m === 'object' ? m.inviteCode : null;
                      const teamIds = typeof m === 'object' ? m.teamIds || [] : [];
                      
                      const isEditing = editingMemberName === name;

                      if (isEditing) {
                        return (
                          <motion.div key={name} layout className="p-4 bg-white border-2 border-blue-500/20 rounded-2xl space-y-3 shadow-md">
                            <div className="flex flex-col gap-2">
                              <input 
                                type="text" 
                                value={editMemberNameInput} 
                                onChange={e => setEditMemberNameInput(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-[13.5px] font-bold outline-none" 
                                placeholder="이름" 
                              />
                              <input 
                                type="text" 
                                value={editMemberCodeInput} 
                                onChange={e => setEditMemberCodeInput(e.target.value.toUpperCase())}
                                maxLength={6} 
                                disabled={code === 'ADMIN'}
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-[13.5px] font-bold text-[#2563eb] text-left uppercase outline-none disabled:opacity-55" 
                                placeholder="초대 코드 (6자리)" 
                              />
                            </div>
                            
                            {teams && teams.length > 0 && (
                              <div className="p-1">
                                <p className="text-[11px] font-extrabold text-slate-400 mb-1.5">소속 팀 선택 (다중)</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {teams.map(t => {
                                    const isSel = editMemberTeamIds.includes(t.id);
                                    return (
                                      <button 
                                        key={t.id} 
                                        type="button"
                                        onClick={() => {
                                          if (isSel) {
                                            setEditMemberTeamIds(editMemberTeamIds.filter(id => id !== t.id));
                                          } else {
                                            setEditMemberTeamIds([...editMemberTeamIds, t.id]);
                                          }
                                        }}
                                        className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border transition-all ${
                                          isSel 
                                            ? 'bg-blue-50 border-[#2563eb] text-[#2563eb]' 
                                            : 'bg-slate-50 border-slate-200/50 text-slate-500'
                                        }`}
                                      >
                                        {t.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            <div className="flex gap-2 pt-1">
                              <button onClick={() => setEditingMemberName(null)}
                                className="flex-1 py-2.5 rounded-xl text-[12.5px] font-extrabold text-slate-500 bg-slate-100">
                                취소
                              </button>
                              <button onClick={saveMemberEdit}
                                className="flex-1 py-2.5 rounded-xl text-[12.5px] font-extrabold text-white bg-[#2563eb]">
                                저장
                              </button>
                            </div>
                          </motion.div>
                        );
                      }

                      const memberTeams = teamIds.map(id => (teams || []).find(t => t.id === id)).filter(Boolean);

                      return (
                        <motion.div key={name} layout className="flex items-center justify-between px-3.5 py-3 bg-slate-50 border border-slate-100 rounded-2xl">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-8 h-8 bg-gradient-to-br from-[#2563eb] to-blue-400 rounded-2xl flex items-center justify-center shrink-0 shadow-sm shadow-blue-100">
                              <span className="text-[11px] font-black text-white">{name.charAt(0)}</span>
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[13.5px] font-black text-slate-800 truncate">{name}</span>
                                {name === nickname && <span className="text-[9px] text-[#2563eb] bg-blue-50 px-1.5 py-0.5 rounded-full font-black">나</span>}
                                {code === 'ADMIN' && <span className="text-[9px] text-indigo-650 bg-indigo-50 px-1.5 py-0.5 rounded-full font-black">👑 관리자</span>}
                              </div>
                              {code && code !== 'ADMIN' && (
                                <span className="text-[10.5px] text-slate-400 font-mono font-extrabold mt-0.5">
                                  CODE: <span className="text-[#2563eb] font-black">{code}</span>
                                </span>
                              )}
                              {memberTeams.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {memberTeams.map(t => (
                                    <span key={t.id} className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-50 text-[#2563eb] font-black">
                                      {t.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 ml-2">
                            {code !== 'ADMIN' && (
                              <motion.button whileTap={{ scale: 0.9 }} onClick={() => startEditMember(m)} className="p-2 rounded-full hover:bg-slate-200/50 text-slate-400 transition-colors">
                                <Edit3 className="w-3.8 h-3.8" />
                              </motion.button>
                            )}
                            {name !== nickname && code !== 'ADMIN' && (
                              <motion.button whileTap={{ scale: 0.9 }} onClick={() => removeMember(m)} className="p-2 rounded-full hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Add Member Form */}
                <div className="pt-4 border-t border-slate-100 space-y-2.5">
                  <input 
                    type="text" 
                    placeholder="팀원 이름" 
                    value={newMemberName} 
                    onChange={e => setNewMemberName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-transparent focus:border-blue-500/20 rounded-2xl text-[13.5px] font-bold outline-none transition-all" 
                  />
                  <input 
                    type="text" 
                    placeholder="초대 코드 (6자리)" 
                    value={newMemberCode} 
                    onChange={e => setNewMemberCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-transparent focus:border-blue-500/20 rounded-2xl text-[13.5px] font-bold text-[#2563eb] tracking-wide outline-none transition-all uppercase" 
                  />
                  
                  {teams && teams.length > 0 && (
                    <div className="px-1 py-1">
                      <p className="text-[11px] font-extrabold text-slate-400 mb-1.5">소속 팀 할당 (다중 가능)</p>
                      <div className="flex flex-wrap gap-1.5">
                        {teams.map(t => {
                          const isSelected = newMemberTeamIds.includes(t.id);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                  if (isSelected) {
                                    setNewMemberTeamIds(newMemberTeamIds.filter(id => id !== t.id));
                                  } else {
                                    setNewMemberTeamIds([...newMemberTeamIds, t.id]);
                                  }
                              }}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border transition-all ${
                                isSelected
                                  ? 'bg-blue-50 border-[#2563eb] text-[#2563eb]'
                                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              {t.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <motion.button 
                    whileTap={{ scale: 0.95 }} 
                    onClick={addMember}
                    className="w-full py-3.5 bg-[#2563eb] text-white text-[13.5px] font-extrabold rounded-2xl flex items-center justify-center gap-1 shadow-md shadow-blue-100"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" /> 팀원 추가
                  </motion.button>
                </div>
              </div>
            </div>
          )}

          {/* Gemini AI Settings Card */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100/80">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-[#2563eb]" />
              <span className="text-[15px] font-extrabold text-slate-800">Gemini AI 설정</span>
            </div>

            <div className="flex items-start gap-2.5 mb-3.5 p-3.5 bg-blue-50 rounded-2xl border border-blue-100/30">
              <Info className="w-4.5 h-4.5 text-[#2563eb] mt-0.5 flex-shrink-0 stroke-[2.5]" />
              <p className="text-[11.5px] text-[#2563eb] font-extrabold leading-normal">
                {isEnvKey || apiKey
                  ? 'Gemini API 키가 연동되어 AI 서비스가 활성화되었습니다. (호출 모델: gemini-2.5-flash / gemini-1.5-flash)'
                  : 'AI 비서 혜택을 이용하려면 Gemini API 키를 등록하세요.'}
              </p>
            </div>

            {isEnvKey ? (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                <p className="text-[13.5px] font-black text-emerald-600">✅ 시스템 자동 연동됨 (.env)</p>
                <p className="text-[11.5px] text-emerald-500 font-extrabold mt-0.5">서버 환경 변수에서 안전하게 연동되었습니다.</p>
              </div>
            ) : apiKey ? (
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13.5px] font-black text-slate-700">연동된 개인 API 키</p>
                    <p className="text-[12px] text-slate-400 font-mono mt-0.5">...{apiKey.slice(-8)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setShowApiInput(true); setTempKey(apiKey); }}
                    className="flex-1 py-2 bg-white border border-slate-200 text-slate-650 rounded-xl text-[12px] font-extrabold shadow-sm">
                    수정
                  </button>
                  <button onClick={() => setApiKey('')}
                    className="flex-1 py-2 bg-red-50 text-red-500 rounded-xl text-[12px] font-extrabold">
                    삭제
                  </button>
                </div>
              </div>
            ) : (
              <motion.button 
                whileTap={{ scale: 0.97 }} 
                onClick={() => setShowApiInput(true)}
                className="w-full py-3.5 bg-[#2563eb] text-white text-[14px] font-extrabold rounded-2xl"
              >
                API 키 등록하기
              </motion.button>
            )}

            <AnimatePresence>
              {showApiInput && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                  <input 
                    type="password" 
                    placeholder="Gemini API Key" 
                    value={tempKey} 
                    onChange={e => setTempKey(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-500/20 rounded-2xl text-[13.5px] outline-none font-bold mb-2.5" 
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowApiInput(false)} className="flex-1 py-2.5 rounded-xl text-[12.5px] font-extrabold text-slate-500 bg-slate-100">취소</button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={saveApiKey} className="flex-1 py-2.5 rounded-xl text-[12.5px] font-extrabold text-white bg-[#2563eb]">저장</motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Admin Database Reset Card */}
          {isAdmin && (
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100/80">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-5 h-5 text-red-500" />
                <span className="text-[15px] font-extrabold text-slate-800">데이터 초기화</span>
              </div>
              <motion.button 
                whileTap={{ scale: 0.97 }}
                onClick={() => { if (window.confirm('모든 로컬 설정 및 멤버 데이터가 지워집니다. 계속하시겠습니까?')) { localStorage.clear(); window.location.reload(); } }}
                className="w-full py-3.5 bg-red-50 text-red-500 rounded-2xl text-[13.5px] font-extrabold border border-red-100/30"
              >
                모든 로컬 데이터 초기화
              </motion.button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pt-10 text-center pb-6">
          <p className="text-[12px] text-slate-400 font-extrabold">TripSync v2.0</p>
          <p className="text-[10.5px] text-slate-300 font-black mt-1">Made with ❤️ for Europe Trip</p>
        </div>
      </div>
    </>
  );
}
