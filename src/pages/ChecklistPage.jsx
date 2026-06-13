import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, CheckSquare, Square, Backpack, Package, User, Sparkles, Loader, X, AlertCircle, Bookmark, Compass } from 'lucide-react';
import { getAIPackingRecommendations } from '../utils/gemini';

const genId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const getRelativeTime = (timestamp) => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return new Date(timestamp).toLocaleDateString('ko-KR');
};

function getLevenshteinDistance(a, b) {
  const tmp = [];
  let i, j;
  for (i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (i = 1; i <= a.length; i++) {
    for (j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}

function checkSimilarity(a, b) {
  const cleanA = a.trim().toLowerCase();
  const cleanB = b.trim().toLowerCase();
  
  if (cleanA === cleanB) return 'exact';
  
  const minLen = Math.min(cleanA.length, cleanB.length);
  if (minLen >= 2 && (cleanA.includes(cleanB) || cleanB.includes(cleanA))) {
    return 'similar';
  }
  
  const distance = getLevenshteinDistance(cleanA, cleanB);
  const maxLen = Math.max(cleanA.length, cleanB.length);
  if (maxLen >= 4 && distance <= 2) {
    return 'similar';
  }
  if (maxLen < 4 && distance === 1) {
    return 'similar';
  }
  
  return 'none';
}

const TEMPLATES = {
  essential: { label: '필수품', items: ['여권', '보조배터리', '유심칩', '멀티어댑터', '비상금'] },
  clothing: { label: '의류', items: ['슬리퍼', '편한 운동화', '선글라스', '돗자리', '따뜻한 외투'] },
  medicine: { label: '비상약', items: ['종합감기약', '소화제', '대일밴드', '물갈이약(지알디아)'] },
  etc: { label: '기타', items: ['지퍼백', '손소독제', '동전지갑', '물티슈', '휴대용 우산'] },
};

export default function ChecklistPage({ checklistsSync, members, nickname, logAction, apiKey, schedules = [], logs = [] }) {
  const { items: checklists = [], addItem, updateItem, removeItem } = checklistsSync || { items: [], addItem: () => {}, updateItem: () => {}, removeItem: () => {} };

  const [checklistTab, setChecklistTab] = useState('personal');
  const [newPackName, setNewPackName] = useState('');
  const [packAssignee, setPackAssignee] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'completed'
  const [selectedTemplateCat, setSelectedTemplateCat] = useState('essential');

  // AI 추천 관련 상태
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiDest, setAiDest] = useState('');
  const [aiWeather, setAiWeather] = useState('봄/가을');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [selectedAiItems, setSelectedAiItems] = useState({}); // { index: boolean }

  // 첫 일정이 있을 때 AI 추천 대상 여행지 자동 지정
  useEffect(() => {
    if (schedules.length > 0 && !aiDest) {
      const firstSchedule = schedules.find(s => s.title && s.title !== '날짜 미정');
      if (firstSchedule) {
        setAiDest(firstSchedule.title);
      }
    }
  }, [schedules, aiDest]);

  const handleTabChange = (tab) => {
    setChecklistTab(tab);
    setStatusFilter('all');
  };

  const handleAddTemplateItem = async (itemName) => {
    const trimmedName = itemName.trim();
    if (!trimmedName) return;

    let exactMatch = null;
    let similarMatch = null;

    for (const item of checklists) {
      if (item.type !== checklistTab) continue;
      if (checklistTab === 'personal' && item.assignedTo !== nickname) continue;

      const similarity = checkSimilarity(item.name, trimmedName);
      if (similarity === 'exact') {
        exactMatch = item;
        break;
      } else if (similarity === 'similar' && !similarMatch) {
        similarMatch = item;
      }
    }

    if (exactMatch) {
      alert('이미 있는 품목입니다');
      return;
    }

    if (similarMatch) {
      const confirmRegister = window.confirm(
        `'${similarMatch.name}' 품목이 이미 등록되어 있습니다.\n이미 비슷한 품목이 있습니다. 그래도 등록하시겠습니까?`
      );
      if (!confirmRegister) {
        return;
      }
    }

    const newItem = {
      id: genId(),
      name: trimmedName,
      type: checklistTab,
      completed: false,
      assignedTo: checklistTab === 'common' ? (packAssignee || '공통') : nickname,
      createdBy: nickname,
      createdAt: Date.now(),
    };
    await addItem(newItem);
    if (logAction) {
      await logAction('add', 'checklists', newItem, nickname);
    }
  };

  const handleAddPack = async () => {
    const trimmedName = newPackName.trim();
    if (!trimmedName) return;

    let exactMatch = null;
    let similarMatch = null;

    for (const item of checklists) {
      if (item.type !== checklistTab) continue;
      if (checklistTab === 'personal' && item.assignedTo !== nickname) continue;

      const similarity = checkSimilarity(item.name, trimmedName);
      if (similarity === 'exact') {
        exactMatch = item;
        break; // Exact match has highest priority
      } else if (similarity === 'similar' && !similarMatch) {
        similarMatch = item;
      }
    }

    if (exactMatch) {
      alert('이미 있는 품목입니다');
      return;
    }

    if (similarMatch) {
      const confirmRegister = window.confirm(
        `'${similarMatch.name}' 품목이 이미 등록되어 있습니다.\n이미 비슷한 품목이 있습니다. 그래도 등록하시겠습니까?`
      );
      if (!confirmRegister) {
        return;
      }
    }

    const newItem = {
      id: genId(),
      name: trimmedName,
      type: checklistTab,
      completed: false,
      assignedTo: checklistTab === 'common' ? (packAssignee || '공통') : nickname,
      createdBy: nickname,
      createdAt: Date.now(),
    };
    await addItem(newItem);
    if (logAction) {
      await logAction('add', 'checklists', newItem, nickname);
    }
    setNewPackName('');
    setPackAssignee('');
  };

  const handleTogglePack = async (item) => {
    const newCompleted = !item.completed;
    await updateItem({ ...item, completed: newCompleted });
    if (logAction) {
      const actionMsg = newCompleted ? '챙김 완료' : '미완료로 변경';
      await logAction('edit', 'checklists', { ...item, name: `${item.name} (${actionMsg})` }, nickname, item);
    }
  };

  const handleRemovePack = async (id) => {
    const itemToDelete = checklists.find(x => x.id === id);
    await removeItem(id);
    if (logAction && itemToDelete) {
      await logAction('delete', 'checklists', itemToDelete, nickname);
    }
  };

  // AI 추천 가져오기 실행
  const handleFetchAiRecommendations = async () => {
    if (!aiDest.trim()) {
      alert('여행지를 입력해 주세요.');
      return;
    }
    setAiLoading(true);
    setAiRecommendations([]);
    setSelectedAiItems({});
    try {
      const data = await getAIPackingRecommendations(aiDest, aiWeather, apiKey);
      if (data && Array.isArray(data)) {
        setAiRecommendations(data);
        // 기본적으로 전체 선택
        const defaultSelected = {};
        data.forEach((_, idx) => {
          defaultSelected[idx] = true;
        });
        setSelectedAiItems(defaultSelected);
      } else {
        alert('추천 리스트를 가공하지 못했습니다. 다시 시도해 주세요.');
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'AI 추천을 가져오는 중 오류가 발생했습니다.');
    } finally {
      setAiLoading(false);
    }
  };

  // AI 추천 아이템 일괄 등록
  const handleAddSelectedAiItems = async () => {
    const itemsToAdd = aiRecommendations.filter((_, idx) => selectedAiItems[idx]);
    if (itemsToAdd.length === 0) {
      alert('선택된 품목이 없습니다.');
      return;
    }

    let addedCount = 0;
    let skipCount = 0;

    for (const recommended of itemsToAdd) {
      const trimmedName = recommended.name.trim();
      
      // 완전히 겹치는 품목 검사
      const alreadyExists = checklists.some(item => {
        if (item.type !== checklistTab) return false;
        if (checklistTab === 'personal' && item.assignedTo !== nickname) return false;
        return item.name.trim().toLowerCase() === trimmedName.toLowerCase();
      });

      if (alreadyExists) {
        skipCount++;
        continue;
      }

      const newItem = {
        id: genId(),
        name: trimmedName,
        type: checklistTab,
        completed: false,
        assignedTo: checklistTab === 'common' ? (packAssignee || '공통') : nickname,
        createdBy: nickname,
        createdAt: Date.now() + addedCount, // 생성 시간 미세한 차이를 두어 정렬 보장
      };

      await addItem(newItem);
      if (logAction) {
        await logAction('add', 'checklists', newItem, nickname);
      }
      addedCount++;
    }

    alert(`추천 품목 ${addedCount}개가 추가되었습니다.${skipCount > 0 ? ` (중복 품목 ${skipCount}개 제외)` : ''}`);
    setIsAiModalOpen(false);
    setAiRecommendations([]);
  };

  const filteredPackList = checklists
    .filter(item => {
      if (item.type === 'personal') {
        return item.assignedTo === nickname;
      }
      return item.type === 'common';
    })
    .filter(item => {
      if (statusFilter === 'active') return !item.completed;
      if (statusFilter === 'completed') return item.completed;
      return true;
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  const totalPersonal = checklists.filter(i => i.type === 'personal' && i.assignedTo === nickname).length;
  const donePersonal = checklists.filter(i => i.type === 'personal' && i.assignedTo === nickname && i.completed).length;
  const totalCommon = checklists.filter(i => i.type === 'common').length;
  const doneCommon = checklists.filter(i => i.type === 'common' && i.completed).length;
  const totalAll = totalPersonal + totalCommon;
  const doneAll = donePersonal + doneCommon;
  const progressRate = totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : 0;

  const activeTabTotal = checklistTab === 'personal' ? totalPersonal : totalCommon;
  const activeTabDone = checklistTab === 'personal' ? donePersonal : doneCommon;
  const activeTabActive = activeTabTotal - activeTabDone;

  const commonChecklistLogs = (logs || [])
    .filter(log => log.collection === 'checklists' && (log.itemSnapshot?.type === 'common' || (log.description && log.description.includes('공동'))))
    .sort((a, b) => b.timestamp - a.timestamp);
  const latestCommonLog = commonChecklistLogs[0];

  return (
    <>
      {/* 🖥️ Desktop Viewport (100% Unchanged) */}
      <div className="hidden md:block pb-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-4 sm:px-5 pt-2 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-[24px] sm:text-[26px] md:text-[28px] font-bold text-toss-text-primary tracking-tight">준비물</h1>
            <p className="text-[13px] sm:text-[14px] text-toss-text-secondary mt-1">빠뜨리는 것 없이 꼼꼼하게 챙겨보세요 🎒</p>
          </div>
          {apiKey && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsAiModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl text-[13px] font-bold flex items-center gap-1.5 shadow-sm shrink-0"
            >
              <Sparkles className="w-4 h-4" /> AI 추천 받기
            </motion.button>
          )}
        </motion.div>

        {/* Progress Summary */}
        {totalAll > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="mx-4 sm:mx-5 mb-6 toss-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[14px] font-semibold text-toss-text-primary">전체 준비 진행률</span>
              <span className="text-[14px] font-bold text-toss-blue">{progressRate}%</span>
            </div>
            <div className="w-full h-2.5 bg-toss-bg rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressRate}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-toss-blue rounded-full"
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-[12px] text-toss-text-secondary">
              <span>내 준비물 {donePersonal}/{totalPersonal}</span>
              <span>공동 준비물 {doneCommon}/{totalCommon}</span>
            </div>
          </motion.div>
        )}

        {/* Tab Switcher */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="mx-4 sm:mx-5 mb-5">
          <div className="flex bg-toss-bg p-1 rounded-xl">
            <button
              onClick={() => handleTabChange('personal')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold rounded-lg transition-all ${
                checklistTab === 'personal' ? 'bg-white text-toss-blue shadow-sm' : 'text-toss-text-secondary'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              내 준비물
              {totalPersonal > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  checklistTab === 'personal' ? 'bg-toss-blue-light text-toss-blue' : 'bg-toss-border text-toss-text-tertiary'
                }`}>{donePersonal}/{totalPersonal}</span>
              )}
            </button>
            <button
              onClick={() => handleTabChange('common')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold rounded-lg transition-all ${
                checklistTab === 'common' ? 'bg-white text-toss-blue shadow-sm' : 'text-toss-text-secondary'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              공동 준비물
              {totalCommon > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  checklistTab === 'common' ? 'bg-toss-blue-light text-toss-blue' : 'bg-toss-border text-toss-text-tertiary'
                }`}>{doneCommon}/{totalCommon}</span>
              )}
            </button>
          </div>
        </motion.div>

        {/* 최근 공동 준비물 현황 배너 */}
        {checklistTab === 'common' && latestCommonLog && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 sm:mx-5 mb-4 px-4 py-3 bg-slate-50 border border-toss-border rounded-2xl flex items-center gap-2.5 shadow-sm"
          >
            <span className="text-[15px]">📢</span>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold text-toss-text-primary truncate">
                최근 공동 활동: <span className="font-medium text-toss-text-secondary">{latestCommonLog.description}</span>
              </p>
            </div>
            <span className="text-[11px] text-toss-text-tertiary whitespace-nowrap">
              {getRelativeTime(latestCommonLog.timestamp)}
            </span>
          </motion.div>
        )}

        {/* Items List */}
        <div className="px-4 sm:px-5">
          <div className="bg-white rounded-2xl border border-toss-border p-4 sm:p-5 shadow-sm">
            {/* Status Filter Tabs (Desktop) */}
            <div className="flex gap-1.5 mb-4 bg-toss-bg p-1 rounded-xl w-fit">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 text-[12px] font-bold rounded-lg transition-all ${
                  statusFilter === 'all'
                    ? 'bg-white text-toss-blue shadow-sm'
                    : 'text-toss-text-secondary hover:text-toss-text-primary'
                }`}
              >
                전체 ({activeTabTotal})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-4 py-2 text-[12px] font-bold rounded-lg transition-all ${
                  statusFilter === 'active'
                    ? 'bg-white text-toss-blue shadow-sm'
                    : 'text-toss-text-secondary hover:text-toss-text-primary'
                }`}
              >
                챙겨야 할 것 ({activeTabActive})
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-4 py-2 text-[12px] font-bold rounded-lg transition-all ${
                  statusFilter === 'completed'
                    ? 'bg-white text-toss-blue shadow-sm'
                    : 'text-toss-text-secondary hover:text-toss-text-primary'
                }`}
              >
                챙긴 것 ({activeTabDone})
              </button>
            </div>

            {/* Item List */}
            <div className="space-y-2 mb-4 max-h-[400px] overflow-y-auto pr-1">
              <AnimatePresence mode="popLayout">
                {filteredPackList.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className={`flex items-center justify-between px-3.5 py-3 rounded-xl transition-colors ${
                      item.completed ? 'bg-green-50/50' : 'bg-toss-bg'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => handleTogglePack(item)}
                        className="flex-shrink-0 btn-icon-sm"
                      >
                        {item.completed ? (
                          <CheckSquare className="w-5 h-5 text-toss-success" />
                        ) : (
                          <Square className="w-5 h-5 text-toss-text-secondary" />
                        )}
                      </motion.button>
                      <div className="min-w-0">
                        <span className={`text-[14px] font-medium block truncate ${
                          item.completed ? 'line-through text-toss-text-tertiary' : 'text-toss-text-primary'
                        }`}>
                          {item.name}
                        </span>
                        {checklistTab === 'common' && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {item.assignedTo && (
                              <span className="text-[10px] bg-toss-blue-light text-toss-blue px-1.5 py-0.5 rounded font-semibold inline-block">
                                담당: {item.assignedTo}
                              </span>
                            )}
                            {item.createdBy && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold inline-block">
                                등록: {item.createdBy}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleRemovePack(item.id)}
                      className="p-1.5 rounded-full hover:bg-red-50 flex-shrink-0 btn-icon-sm"
                    >
                      <Trash2 className="w-4 h-4 text-toss-text-tertiary" />
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {filteredPackList.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 bg-toss-blue-light rounded-full flex items-center justify-center mb-3">
                    <Backpack className="w-7 h-7 text-toss-blue" />
                  </div>
                  <p className="text-[15px] font-semibold text-toss-text-primary mb-1">
                    {activeTabTotal === 0 ? (
                      checklistTab === 'personal' ? '내 준비물이 비어있어요' : '공동 준비물이 비어있어요'
                    ) : statusFilter === 'active' ? (
                      '챙겨야 할 준비물이 없어요!'
                    ) : (
                      '아직 챙긴 준비물이 없어요'
                    )}
                  </p>
                  <p className="text-[13px] text-toss-text-secondary">
                    {activeTabTotal === 0 ? (
                      checklistTab === 'personal' ? '개인적으로 챙길 물건을 등록해 보세요' : '팀원 모두가 챙겨야 할 물건을 등록해 보세요'
                    ) : statusFilter === 'active' ? (
                      '모든 준비물을 다 챙기셨네요 ✨'
                    ) : (
                      '챙긴 물품의 체크박스를 눌러 완료 처리해 보세요 🎒'
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* 추천 템플릿 ⚡ */}
            <div className="mb-4 pt-3 border-t border-toss-bg">
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <span className="text-[12px] font-bold text-toss-text-secondary flex items-center gap-1">
                  ⚡ 추천 템플릿
                </span>
                <div className="flex gap-1.5 ml-auto">
                  {Object.entries(TEMPLATES).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedTemplateCat(key)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                        selectedTemplateCat === key
                          ? 'bg-toss-blue-light text-toss-blue'
                          : 'bg-toss-bg text-toss-text-secondary hover:text-toss-text-primary'
                      }`}
                    >
                      {value.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 px-1">
                {TEMPLATES[selectedTemplateCat].items.map((item) => (
                  <button
                    key={item}
                    onClick={() => handleAddTemplateItem(item)}
                    className="px-2.5 py-1.5 bg-toss-bg hover:bg-toss-border rounded-xl text-[12px] font-medium text-toss-text-primary transition-colors flex items-center gap-1"
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Add Item Form */}
            <div className="pt-3 border-t border-toss-bg space-y-2.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={checklistTab === 'personal' ? '예: 여권, 상비약, 어댑터' : '예: 렌터카 서류, 유심, 라면'}
                  value={newPackName}
                  onChange={e => setNewPackName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddPack()}
                  className="flex-1 px-4 py-3 bg-toss-bg rounded-xl text-[14px] border-0"
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddPack}
                  disabled={!newPackName.trim()}
                  className="px-5 py-3 bg-toss-blue rounded-xl text-white text-[14px] font-semibold flex items-center gap-1.5 disabled:opacity-40 shrink-0 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" /> 등록
                </motion.button>
              </div>
              {checklistTab === 'common' && (
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[12px] text-toss-text-secondary font-medium whitespace-nowrap">담당자:</span>
                  <select
                    value={packAssignee}
                    onChange={e => setPackAssignee(e.target.value)}
                    className="flex-1 px-3 py-2 bg-toss-bg rounded-lg text-[13px] border-0 outline-none cursor-pointer"
                  >
                    <option value="">공통 (미지정)</option>
                    {members.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 📱 Mobile Viewport (Toss-style Redesign) */}
      <div className="block md:hidden bg-[#f4f6fa] min-h-screen pb-28 text-toss-text-primary">
        {/* Header Block (Toss-style blue gradient) */}
        <div className="bg-gradient-to-br from-[#1b64da] via-[#2563eb] to-[#1d4ed8] text-white rounded-b-[2.5rem] px-6 pt-8 pb-14 shadow-lg relative overflow-hidden">
          <div className="absolute -right-6 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="absolute -left-10 -top-10 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-extrabold text-blue-200/90 tracking-wider uppercase">Checklist Hub</span>
              <h1 className="text-[26px] font-black tracking-tight leading-tight">준비물 리스트</h1>
              <p className="text-[13px] text-blue-100/80 font-medium">여행 전 필요한 물건들을 실시간으로 체크해보세요.</p>
            </div>
            {apiKey && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsAiModalOpen(true)}
                className="px-3 py-1.5 bg-white/15 backdrop-blur-md border border-white/20 text-white rounded-2xl text-[12px] font-black flex items-center gap-1 shrink-0 mt-1 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" /> AI 추천
              </motion.button>
            )}
          </div>
        </div>

        {/* Progress Card Overlay */}
        {totalAll > 0 && (
          <div className="relative z-20 mt-[-2rem] mx-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-3xl p-5 shadow-md border border-slate-100/80"
            >
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[14px] font-extrabold text-slate-800">전체 준비 진행률</span>
                <span className="text-[15px] font-black text-[#2563eb]">{progressRate}%</span>
              </div>
              
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressRate}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-blue-500 to-[#2563eb] rounded-full"
                />
              </div>

              <div className="flex items-center justify-between px-1 text-[12px] text-slate-400 font-extrabold">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span>내 준비물: {donePersonal} / {totalPersonal}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                  <span>공동 준비물: {doneCommon} / {totalCommon}</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Tab Switcher (iOS Segment Control) */}
        <div className="mx-4 mt-5 mb-4">
          <div className="flex bg-slate-200/60 p-1 rounded-2xl relative">
            <button
              onClick={() => handleTabChange('personal')}
              className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-black rounded-xl transition-all duration-300 ${
                checklistTab === 'personal' ? 'text-[#2563eb] font-black' : 'text-slate-500 font-bold'
              }`}
            >
              <User className="w-4 h-4 stroke-[2.5]" />
              <span>내 준비물</span>
              {totalPersonal > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  checklistTab === 'personal' ? 'bg-blue-50 text-[#2563eb]' : 'bg-slate-200 text-slate-500'
                }`}>{donePersonal}/{totalPersonal}</span>
              )}
            </button>
            <button
              onClick={() => handleTabChange('common')}
              className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-black rounded-xl transition-all duration-300 ${
                checklistTab === 'common' ? 'text-[#2563eb] font-black' : 'text-slate-500 font-bold'
              }`}
            >
              <Package className="w-4 h-4 stroke-[2.5]" />
              <span>공동 준비물</span>
              {totalCommon > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  checklistTab === 'common' ? 'bg-blue-50 text-[#2563eb]' : 'bg-slate-200 text-slate-500'
                }`}>{doneCommon}/{totalCommon}</span>
              )}
            </button>

            {/* Sliding background pill */}
            <motion.div
              layout
              className="absolute top-1 bottom-1 left-1 bg-white rounded-xl shadow-sm z-0 border border-slate-100"
              style={{
                width: 'calc(50% - 4px)',
                x: checklistTab === 'personal' ? 0 : '100%'
              }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            />
          </div>
        </div>

        {/* 최근 공동 준비물 현황 배너 */}
        {checklistTab === 'common' && latestCommonLog && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 mb-4 p-4 bg-white rounded-3xl border border-slate-100 flex items-center gap-3 shadow-sm"
          >
            <span className="text-[16px]">📢</span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-extrabold text-slate-700 leading-snug">
                최근 공동 활동: <span className="font-bold text-slate-500">{latestCommonLog.description}</span>
              </p>
            </div>
            <span className="text-[10px] font-black text-slate-400 whitespace-nowrap">
              {getRelativeTime(latestCommonLog.timestamp)}
            </span>
          </motion.div>
        )}

        {/* Status Filter (Sub-tab Mobile) */}
        <div className="mx-4 mb-4 flex bg-slate-200/40 p-0.5 rounded-xl">
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex-1 py-2 text-[11px] font-black rounded-lg transition-all ${
              statusFilter === 'all'
                ? 'bg-white text-[#2563eb] shadow-sm font-black'
                : 'text-slate-500 font-bold'
            }`}
          >
            전체 ({activeTabTotal})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`flex-1 py-2 text-[11px] font-black rounded-lg transition-all ${
              statusFilter === 'active'
                ? 'bg-white text-[#2563eb] shadow-sm font-black'
                : 'text-slate-500 font-bold'
            }`}
          >
            챙겨야 할 것 ({activeTabActive})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`flex-1 py-2 text-[11px] font-black rounded-lg transition-all ${
              statusFilter === 'completed'
                ? 'bg-white text-[#2563eb] shadow-sm font-black'
                : 'text-slate-500 font-bold'
            }`}
          >
            챙긴 것 ({activeTabDone})
          </button>
        </div>

        {/* Dynamic Checklist Content */}
        <div className="mx-4 space-y-3">
          {/* Add Item Widget */}
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3">
            <div className="flex gap-2 w-full min-w-0">
              <input
                type="text"
                placeholder={checklistTab === 'personal' ? '예: 여권, 상비약, 어댑터' : '예: 렌터카 서류, 유심, 라면'}
                value={newPackName}
                onChange={e => setNewPackName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddPack()}
                className="flex-1 min-w-0 px-4 py-3 bg-slate-50 focus:bg-white border border-transparent focus:border-blue-500/30 rounded-2xl text-[14px] outline-none transition-all font-bold"
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleAddPack}
                disabled={!newPackName.trim()}
                className="px-4 py-3 bg-[#2563eb] text-white text-[14px] font-extrabold rounded-2xl flex items-center gap-1 shadow-md shadow-blue-100 disabled:opacity-40 disabled:shadow-none shrink-0 whitespace-nowrap"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" /> 등록
              </motion.button>
            </div>
            
            {checklistTab === 'common' && (
              <div className="flex items-center gap-3 bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-100/60">
                <span className="text-[12px] text-slate-400 font-extrabold whitespace-nowrap">담당 팀원</span>
                <select
                  value={packAssignee}
                  onChange={e => setPackAssignee(e.target.value)}
                  className="flex-1 bg-transparent text-[13px] font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="">공통 (미지정)</option>
                  {members.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 추천 템플릿 ⚡ */}
            <div className="pt-2.5 border-t border-slate-100/60">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] font-extrabold text-slate-400 flex items-center gap-1">
                  ⚡ 추천 템플릿
                </span>
                <div className="flex gap-1.5">
                  {Object.entries(TEMPLATES).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedTemplateCat(key)}
                      className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all ${
                        selectedTemplateCat === key
                          ? 'bg-blue-50 text-[#2563eb]'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {value.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 px-1 max-h-[85px] overflow-y-auto">
                {TEMPLATES[selectedTemplateCat].items.map((item) => (
                  <button
                    key={item}
                    onClick={() => handleAddTemplateItem(item)}
                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-150 rounded-xl text-[11px] font-extrabold text-slate-700 transition-colors flex items-center gap-0.5 border border-slate-100"
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Checklist rows */}
          <div className="space-y-2.5">
            <AnimatePresence mode="popLayout">
              {filteredPackList.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`bg-white rounded-3xl p-4 shadow-sm border flex items-center justify-between gap-3 transition-colors ${
                    item.completed ? 'border-emerald-100 bg-emerald-50/20' : 'border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => handleTogglePack(item)}
                      className="flex-shrink-0"
                    >
                      {item.completed ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm shadow-emerald-100">
                          <svg className="w-3.5 h-3.5 stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-slate-300 bg-white"></div>
                      )}
                    </motion.button>

                    <div className="min-w-0 flex flex-col gap-0.5">
                      <span className={`text-[14px] font-extrabold block truncate leading-snug ${
                        item.completed ? 'line-through text-slate-400' : 'text-slate-800'
                      }`}>
                        {item.name}
                      </span>
                      {checklistTab === 'common' && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {item.assignedTo && (
                            <span className="text-[9px] bg-blue-50 text-[#2563eb] px-1.5 py-0.5 rounded-full font-black">
                              담당: {item.assignedTo}
                            </span>
                          )}
                          {item.createdBy && (
                            <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-black">
                              등록: {item.createdBy}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleRemovePack(item.id)}
                    className="p-2 rounded-full hover:bg-red-50 text-slate-300 hover:text-red-500 flex-shrink-0 transition-colors"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredPackList.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-slate-100/80 shadow-sm text-center">
                <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                  <Backpack className="w-7 h-7 text-[#2563eb]" />
                </div>
                <p className="text-[15px] font-extrabold text-slate-800 mb-1">
                  {activeTabTotal === 0 ? (
                    checklistTab === 'personal' ? '내 준비물이 비어있어요' : '공동 준비물이 비어있어요'
                  ) : statusFilter === 'active' ? (
                    '챙겨야 할 준비물이 없어요!'
                  ) : (
                    '아직 챙긴 준비물이 없어요'
                  )}
                </p>
                <p className="text-[12px] text-slate-400">
                  {activeTabTotal === 0 ? (
                    checklistTab === 'personal' ? '개인적으로 챙길 물품을 등록해 보세요.' : '팀원들과 같이 챙길 공통 물품을 등록해 보세요.'
                  ) : statusFilter === 'active' ? (
                    '모든 준비물을 다 챙기셨네요 ✨'
                  ) : (
                    '챙긴 물품의 체크박스를 눌러 완료 처리해 보세요 🎒'
                  )}
                </p>
              </div>
            )}
          </div>
      </div>

      {/* AI 추천 모달 */}
      <AnimatePresence>
        {isAiModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !aiLoading && setIsAiModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden relative z-10 flex flex-col max-h-[85vh] border border-toss-border"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-toss-bg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                  <span className="text-[17px] font-bold text-toss-text-primary">AI 맞춤 준비물 추천</span>
                </div>
                <button
                  disabled={aiLoading}
                  onClick={() => setIsAiModalOpen(false)}
                  className="p-1 rounded-full hover:bg-toss-bg transition-colors disabled:opacity-30"
                >
                  <X className="w-5 h-5 text-toss-text-secondary" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {!aiRecommendations || aiRecommendations.length === 0 ? (
                  <>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[12px] font-bold text-toss-text-secondary block mb-1.5">
                          여행지
                        </label>
                        <input
                          type="text"
                          placeholder="예: 파리, 런던, 오사카"
                          value={aiDest}
                          onChange={(e) => setAiDest(e.target.value)}
                          disabled={aiLoading}
                          className="w-full px-4 py-3 bg-toss-bg focus:bg-white border border-transparent focus:border-toss-blue/30 rounded-xl text-[14px] outline-none transition-all font-medium text-toss-text-primary"
                        />
                      </div>

                      <div>
                        <label className="text-[12px] font-bold text-toss-text-secondary block mb-1.5">
                          날씨 및 여행 테마
                        </label>
                        <select
                          value={aiWeather}
                          onChange={(e) => setAiWeather(e.target.value)}
                          disabled={aiLoading}
                          className="w-full px-4 py-3 bg-toss-bg border-0 outline-none rounded-xl text-[14px] font-medium text-toss-text-primary cursor-pointer"
                        >
                          <option value="봄/가을">봄/가을 (선선함)</option>
                          <option value="여름">여름 (더움, 반소매)</option>
                          <option value="겨울">겨울 (추움, 외투 필수)</option>
                          <option value="비오는 기간">비오는 기간 (우산, 우비)</option>
                          <option value="물놀이/수영">물놀이 / 해변 / 온천</option>
                          <option value="치안 불안 지역">치안 취약 지역 (도난 방지 필요)</option>
                          <option value="도보 이동이 많은 여행">도보 이동이 많은 뚜벅이 여행</option>
                        </select>
                      </div>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={handleFetchAiRecommendations}
                      disabled={aiLoading || !aiDest.trim()}
                      className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-40"
                    >
                      {aiLoading ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          <span>AI 추천 목록 분석 중...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>AI 추천 시작하기</span>
                        </>
                      )}
                    </motion.button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-toss-bg">
                      <span className="text-[12px] text-toss-text-secondary font-bold">
                        추천된 준비물 ({aiRecommendations.length}개)
                      </span>
                      <button
                        onClick={() => {
                          const allSelected = Object.keys(selectedAiItems).length === aiRecommendations.length;
                          const nextSelected = {};
                          if (!allSelected) {
                            aiRecommendations.forEach((_, idx) => {
                              nextSelected[idx] = true;
                            });
                          }
                          setSelectedAiItems(nextSelected);
                        }}
                        className="text-[11px] font-bold text-toss-blue hover:underline"
                      >
                        {Object.keys(selectedAiItems).length === aiRecommendations.length
                          ? '전체 해제'
                          : '전체 선택'}
                      </button>
                    </div>

                    <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                      {aiRecommendations.map((rec, idx) => {
                        const isSelected = !!selectedAiItems[idx];
                        const catLabels = {
                          essential: '필수',
                          clothing: '의류',
                          medicine: '비상약',
                          etc: '기타'
                        };
                        const catColors = {
                          essential: 'bg-red-50 text-red-600',
                          clothing: 'bg-blue-50 text-blue-600',
                          medicine: 'bg-green-50 text-green-600',
                          etc: 'bg-slate-100 text-slate-600'
                        };

                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              setSelectedAiItems(prev => ({
                                ...prev,
                                [idx]: !prev[idx]
                              }));
                            }}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                              isSelected
                                ? 'border-indigo-100 bg-indigo-50/20'
                                : 'border-toss-border bg-white hover:bg-toss-bg/30'
                            }`}
                          >
                            <div className="mt-0.5">
                              {isSelected ? (
                                <div className="w-5 h-5 rounded-md bg-indigo-500 text-white flex items-center justify-center">
                                  <svg className="w-3.5 h-3.5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-md border-2 border-slate-350 bg-white" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[13.5px] font-bold text-slate-800">
                                  {rec.name}
                                </span>
                                <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${catColors[rec.category] || catColors.etc}`}>
                                  {catLabels[rec.category] || '기타'}
                                </span>
                              </div>
                              {rec.reason && (
                                <p className="text-[11.5px] text-slate-400 mt-0.5 leading-snug">
                                  {rec.reason}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex gap-2.5 pt-2 border-t border-toss-bg">
                      <button
                        onClick={() => setAiRecommendations([])}
                        className="flex-1 py-3 bg-toss-bg text-toss-text-secondary rounded-xl text-[13.5px] font-bold"
                      >
                        이전 단계
                      </button>
                      <button
                        onClick={handleAddSelectedAiItems}
                        className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl text-[13.5px] font-bold shadow-md shadow-indigo-100"
                      >
                        선택한 품목 추가
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </>
  );
}
