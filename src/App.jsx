import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Wallet, Users, Settings, Pin, Backpack, LayoutDashboard } from 'lucide-react';
import DashboardPage from './pages/DashboardPage';
import PlannerPage from './pages/PlannerPage';
import ExpensePage from './pages/ExpensePage';
import SettlePage from './pages/SettlePage';
import SettingsPage from './pages/SettingsPage';
import MemoPage from './pages/MemoPage';
import ChecklistPage from './pages/ChecklistPage';
import RoomJoinScreen from './pages/RoomJoinScreen';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from './utils/storage';
import { isFirebaseConfigured, saveRoomMeta, getRoomMeta, generateRoomCode } from './utils/firebase';
import { useSyncedList, useSyncedMeta } from './utils/useSync';

const TABS = [
  { id: 'dashboard', label: '홈', icon: LayoutDashboard },
  { id: 'planner', label: '일정', icon: Calendar },
  { id: 'expense', label: '가계부', icon: Wallet },
  { id: 'settle', label: '정산', icon: Users },
  { id: 'checklist', label: '준비물', icon: Backpack },
  { id: 'memo', label: '메모', icon: Pin },
  { id: 'settings', label: '설정', icon: Settings },
];

export default function App() {
  const [isBrowserOnline, setIsBrowserOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Room state
  const [roomCode, setRoomCode] = useState(() => loadFromStorage('tripsync_room') || '');
  const [nickname, setNickname] = useState(() => loadFromStorage('tripsync_nickname') || '');
  const [joined, setJoined] = useState(() => !!loadFromStorage('tripsync_joined'));

  const [activeTab, setActiveTab] = useState('dashboard');
  const [initialExpandedDate, setInitialExpandedDate] = useState(null);
  const [isAdmin, setIsAdmin] = useState(() => loadFromStorage('tripsync_is_admin') || false);

  const FIXED_ROOM_CODE = 'EUROPE_2026_MAIN';

  // Synced members list
  const { meta, updateMeta, isOnline } = useSyncedMeta(roomCode);
  const [localMembers, setLocalMembers] = useState(() => loadFromStorage(STORAGE_KEYS.MEMBERS) || []);

  // Members: use Firestore meta if online, otherwise local
  const members = (isOnline && meta?.members) ? meta.members : localMembers;

  const setMembers = (newMembers) => {
    if (isOnline) {
      updateMeta({ members: newMembers });
    }
    setLocalMembers(newMembers);
    saveToStorage(STORAGE_KEYS.MEMBERS, newMembers);
  };

  // Synced data via hooks (used in child pages via props)
  const schedulesSync = useSyncedList(roomCode, 'schedules', STORAGE_KEYS.SCHEDULES);
  const expensesSync = useSyncedList(roomCode, 'expenses', STORAGE_KEYS.EXPENSES);
  const checklistsSync = useSyncedList(roomCode, 'checklists', STORAGE_KEYS.CHECKLISTS);

  // Shared Memo: use Firestore meta if online, otherwise local
  const [localMemo, setLocalMemo] = useState(() => loadFromStorage(STORAGE_KEYS.MEMO) || '');
  const memo = (isOnline && meta?.memo) ? meta.memo : localMemo;
  
  const updateMemo = (newMemo) => {
    if (isOnline) {
      updateMeta({ memo: newMemo });
    }
    setLocalMemo(newMemo);
    saveToStorage(STORAGE_KEYS.MEMO, newMemo);
  };

  const handleGenerateInviteCode = async () => {
    if (isOnline) {
      const newCode = generateRoomCode();
      await updateMeta({ inviteCode: newCode });
      alert(`새 초대 코드가 생성되었습니다: ${newCode}`);
    }
  };

  // API key (still local per device)
  const [apiKey, setApiKey] = useState(() => {
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (envKey) return envKey;
    const saved = loadFromStorage(STORAGE_KEYS.SETTINGS);
    return saved?.apiKey || '';
  });
  const isEnvKey = !!import.meta.env.VITE_GEMINI_API_KEY;

  useEffect(() => { saveToStorage(STORAGE_KEYS.SETTINGS, { apiKey }); }, [apiKey]);

  // Handle room join
  const handleJoinRoom = (code, name, isCreator, adminFlag) => {
    setRoomCode(code);
    setNickname(name);
    setIsAdmin(adminFlag);
    setJoined(true);
    saveToStorage('tripsync_room', code);
    saveToStorage('tripsync_nickname', name);
    saveToStorage('tripsync_is_admin', adminFlag);
    saveToStorage('tripsync_joined', true);

    // If offline, set local members
    if (!code) {
      setLocalMembers([name]);
      saveToStorage(STORAGE_KEYS.MEMBERS, [name]);
    }
  };

  // Member Login Verification
  const handleJoinMember = async (name, enteredCode) => {
    if (!isFirebaseConfigured()) {
      handleJoinRoom(FIXED_ROOM_CODE, name, false, false);
      return true;
    }
    try {
      const metaData = await getRoomMeta(FIXED_ROOM_CODE);
      if (!metaData || !metaData.inviteCode) {
        alert("현재 생성된 활성 초대 코드가 없습니다. 관리자에게 초대 코드 생성을 요청하세요.");
        return false;
      }
      if (metaData.inviteCode.toUpperCase() !== enteredCode.trim().toUpperCase()) {
        alert("입력한 초대 코드가 올바르지 않습니다.");
        return false;
      }
      
      // Auto add member to list if not present
      const currentMembers = metaData.members || [];
      if (!currentMembers.includes(name.trim())) {
        const newMembers = [...currentMembers, name.trim()];
        await saveRoomMeta(FIXED_ROOM_CODE, { members: newMembers });
      }

      handleJoinRoom(FIXED_ROOM_CODE, name.trim(), false, false);
      return true;
    } catch (err) {
      console.error(err);
      alert("연결 중 오류가 발생했습니다. 네트워크 설정을 확인하세요.");
      return false;
    }
  };

  // Admin Login Verification
  const handleJoinAdmin = async (name, password) => {
    if (password !== '040831') {
      alert("비밀번호가 일치하지 않습니다.");
      return false;
    }
    if (isFirebaseConfigured()) {
      try {
        const metaData = await getRoomMeta(FIXED_ROOM_CODE);
        const currentMembers = metaData?.members || [];
        if (!currentMembers.includes(name.trim())) {
          const newMembers = [...currentMembers, name.trim()];
          await saveRoomMeta(FIXED_ROOM_CODE, { 
            members: newMembers,
            inviteCode: metaData?.inviteCode || generateRoomCode(),
            createdAt: metaData?.createdAt || Date.now(),
            createdBy: metaData?.createdBy || name.trim()
          });
        }
      } catch (err) {
        console.error("Admin init error:", err);
      }
    }
    handleJoinRoom(FIXED_ROOM_CODE, name.trim(), true, true);
    return true;
  };

  const handleLeaveRoom = () => {
    setJoined(false);
    setRoomCode('');
    setNickname('');
    setIsAdmin(false);
    saveToStorage('tripsync_room', '');
    saveToStorage('tripsync_nickname', '');
    saveToStorage('tripsync_is_admin', false);
    saveToStorage('tripsync_joined', false);
  };

  // Show room join screen if not joined
  if (!joined) {
    return (
      <RoomJoinScreen 
        onJoinMember={handleJoinMember} 
        onJoinAdmin={handleJoinAdmin} 
      />
    );
  }

  const pageVariants = {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
  };

  return (
    <div className="w-full min-h-screen min-h-dvh bg-toss-bg flex flex-col md:flex-row">
      {!isBrowserOnline && (
        <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="fixed top-0 left-0 right-0 bg-red-500 text-white py-2.5 px-4 text-center text-[12px] sm:text-[13px] font-semibold z-[9999] flex items-center justify-center gap-1.5 shadow-md">
          <span>🔌</span>
          오프라인 모드입니다. 데이터는 안전하게 로컬에 보관되며 온라인 시 자동 동기화됩니다.
        </motion.div>
      )}
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex w-64 bg-white border-r border-toss-border flex-col p-6 sticky top-0 h-screen shrink-0 justify-between">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 bg-toss-blue rounded-xl flex items-center justify-center shadow-md shadow-toss-blue/20">
              <span className="text-xl">✈️</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-toss-text-primary tracking-tight">TripSync</h1>
              <p className="text-[11px] text-toss-text-secondary">유럽 여행 플래너</p>
            </div>
          </div>

          {/* Room Metadata */}
          {roomCode && (
            <div className="p-3.5 bg-toss-bg rounded-2xl space-y-2.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] text-toss-text-secondary font-medium">초대 코드</p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${isAdmin ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-toss-blue'}`}>
                    {isAdmin ? '👑 관리자' : '👤 일반 멤버'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-lg font-bold text-toss-blue tracking-wider font-mono">
                    {meta?.inviteCode || '------'}
                  </span>
                  {isAdmin && isOnline && (
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={handleGenerateInviteCode}
                      className="text-[9.5px] font-bold bg-toss-blue text-white px-2 py-1 rounded-md shrink-0 hover:bg-toss-blue/90"
                    >
                      갱신
                    </motion.button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-toss-border/50 pt-2 text-[11px]">
                <span className="text-toss-text-tertiary">내 이름: <span className="font-semibold text-toss-text-secondary">{nickname}</span></span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${isOnline ? 'bg-green-50 text-toss-success' : 'bg-toss-text-tertiary text-white'}`}>
                  {isOnline ? '온라인' : '오프라인'}
                </span>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-left font-semibold text-[14px] ${
                    isActive
                      ? 'bg-toss-blue-light text-toss-blue'
                      : 'text-toss-text-secondary hover:bg-toss-bg hover:text-toss-text-primary'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info */}
        <div className="px-2 pt-4 border-t border-toss-border">
          <p className="text-[11px] text-toss-text-tertiary font-medium">TripSync v2.0</p>
          <p className="text-[10px] text-toss-text-tertiary mt-0.5">유럽 여행을 동기화하다</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <main className="flex-1 px-4 sm:px-6 md:px-10 py-6 md:py-8 max-w-5xl w-full mx-auto pb-24 md:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {activeTab === 'dashboard' && (
                <DashboardPage
                  schedulesSync={schedulesSync}
                  checklistsSync={checklistsSync}
                  expensesSync={expensesSync}
                  members={members}
                  nickname={nickname}
                  apiKey={apiKey}
                  onNavigateToSchedule={(date) => {
                    setInitialExpandedDate(date);
                    setActiveTab('planner');
                  }}
                />
              )}
              {activeTab === 'planner' && (
                <PlannerPage
                  sync={schedulesSync}
                  nickname={nickname}
                  apiKey={apiKey}
                  initialExpandedDate={initialExpandedDate}
                  clearInitialExpandedDate={() => setInitialExpandedDate(null)}
                />
              )}
              {activeTab === 'expense' && (
                <ExpensePage members={members} sync={expensesSync} apiKey={apiKey} />
              )}
              {activeTab === 'settle' && (
                <SettlePage members={members} expenses={expensesSync.items} nickname={nickname} />
              )}
              {activeTab === 'checklist' && (
                <ChecklistPage checklistsSync={checklistsSync} members={members} nickname={nickname} />
              )}
              {activeTab === 'memo' && (
                <MemoPage memo={memo} updateMemo={updateMemo} nickname={nickname} />
              )}
              {activeTab === 'settings' && (
                <SettingsPage
                  members={members}
                  setMembers={setMembers}
                  apiKey={apiKey}
                  setApiKey={setApiKey}
                  isEnvKey={isEnvKey}
                  roomCode={roomCode}
                  nickname={nickname}
                  isOnline={isOnline}
                  onLeave={handleLeaveRoom}
                  isAdmin={isAdmin}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (hidden on desktop) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-toss-border safe-bottom z-50">
        <div className="flex">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.92 }}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex flex-col items-center py-3 relative"
              >
                <div className="relative">
                  <Icon
                    className={`w-6 h-6 transition-colors duration-200 ${
                      isActive ? 'text-toss-blue' : 'text-toss-text-tertiary'
                    }`}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                  {isActive && (
                    <motion.div
                      layoutId="tab-dot"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-toss-blue rounded-full"
                    />
                  )}
                </div>
                <span
                  className={`text-[10px] mt-1 font-medium transition-colors duration-200 ${
                    isActive ? 'text-toss-blue' : 'text-toss-text-tertiary'
                  }`}
                >
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
