import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, CheckSquare, Square, Backpack, Package, User } from 'lucide-react';

const genId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function ChecklistPage({ checklistsSync, members, nickname, logAction }) {
  const { items: checklists = [], addItem, updateItem, removeItem } = checklistsSync || { items: [], addItem: () => {}, updateItem: () => {}, removeItem: () => {} };

  const [checklistTab, setChecklistTab] = useState('personal');
  const [newPackName, setNewPackName] = useState('');
  const [packAssignee, setPackAssignee] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'completed'

  const handleTabChange = (tab) => {
    setChecklistTab(tab);
    setStatusFilter('all');
  };

  const handleAddPack = async () => {
    const trimmedName = newPackName.trim();
    if (!trimmedName) return;

    // 중복 검사
    const isDuplicate = checklists.some(item => {
      if (item.type !== checklistTab) return false;
      if (checklistTab === 'personal' && item.assignedTo !== nickname) return false;
      return item.name.trim().toLowerCase() === trimmedName.toLowerCase();
    });

    if (isDuplicate) {
      alert('이미 있는 품목입니다');
      return;
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
    await updateItem({ ...item, completed: !item.completed });
  };

  const handleRemovePack = async (id) => {
    const itemToDelete = checklists.find(x => x.id === id);
    await removeItem(id);
    if (logAction && itemToDelete) {
      await logAction('delete', 'checklists', itemToDelete, nickname);
    }
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

  return (
    <>
      {/* 🖥️ Desktop Viewport (100% Unchanged) */}
      <div className="hidden md:block pb-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-4 sm:px-5 pt-2 pb-4">
          <h1 className="text-[24px] sm:text-[26px] md:text-[28px] font-bold text-toss-text-primary tracking-tight">준비물</h1>
          <p className="text-[13px] sm:text-[14px] text-toss-text-secondary mt-1">빠뜨리는 것 없이 꼼꼼하게 챙겨보세요 🎒</p>
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
          <div className="relative z-10 flex flex-col gap-1.5">
            <span className="text-[12px] font-extrabold text-blue-200/90 tracking-wider uppercase">Checklist Hub</span>
            <h1 className="text-[26px] font-black tracking-tight leading-tight">준비물 리스트</h1>
            <p className="text-[13px] text-blue-100/80 font-medium">여행 전 필요한 물건들을 실시간으로 체크해보세요.</p>
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
      </div>
    </>
  );
}
