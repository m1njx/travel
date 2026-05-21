import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, CheckSquare, Square, Backpack, Package, User } from 'lucide-react';

const genId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function ChecklistPage({ checklistsSync, members, nickname }) {
  const { items: checklists = [], addItem, updateItem, removeItem } = checklistsSync || { items: [], addItem: () => {}, updateItem: () => {}, removeItem: () => {} };

  const [checklistTab, setChecklistTab] = useState('personal');
  const [newPackName, setNewPackName] = useState('');
  const [packAssignee, setPackAssignee] = useState('');

  const handleAddPack = async () => {
    if (!newPackName.trim()) return;
    await addItem({
      id: genId(),
      name: newPackName.trim(),
      type: checklistTab,
      completed: false,
      assignedTo: checklistTab === 'common' ? (packAssignee || '공통') : nickname,
      createdBy: nickname,
      createdAt: Date.now(),
    });
    setNewPackName('');
    setPackAssignee('');
  };

  const handleTogglePack = async (item) => {
    await updateItem({ ...item, completed: !item.completed });
  };

  const handleRemovePack = async (id) => {
    await removeItem(id);
  };

  const filteredPackList = checklists
    .filter(item => {
      if (item.type === 'personal') {
        return item.assignedTo === nickname;
      }
      return item.type === 'common';
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  const totalPersonal = checklists.filter(i => i.type === 'personal' && i.assignedTo === nickname).length;
  const donePersonal = checklists.filter(i => i.type === 'personal' && i.assignedTo === nickname && i.completed).length;
  const totalCommon = checklists.filter(i => i.type === 'common').length;
  const doneCommon = checklists.filter(i => i.type === 'common' && i.completed).length;
  const totalAll = totalPersonal + totalCommon;
  const doneAll = donePersonal + doneCommon;
  const progressRate = totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : 0;

  return (
    <div className="pb-6">
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
            onClick={() => setChecklistTab('personal')}
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
            onClick={() => setChecklistTab('common')}
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
                  {checklistTab === 'personal' ? '내 준비물이 비어있어요' : '공동 준비물이 비어있어요'}
                </p>
                <p className="text-[13px] text-toss-text-secondary">
                  {checklistTab === 'personal' ? '개인적으로 챙길 물건을 등록해 보세요' : '팀원 모두가 챙겨야 할 물건을 등록해 보세요'}
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
                className="px-5 py-3 bg-toss-blue rounded-xl text-white text-[14px] font-semibold flex items-center gap-1.5 disabled:opacity-40"
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
  );
}
