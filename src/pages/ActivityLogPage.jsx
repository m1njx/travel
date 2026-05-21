import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit3, Trash2, Shield, FileText, RotateCcw, Calendar, Wallet, Backpack, Filter } from 'lucide-react';

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

const COLLECTION_LABELS = {
  schedules: { label: '일정', icon: Calendar, color: 'text-toss-blue', bg: 'bg-toss-blue-light' },
  expenses: { label: '지출', icon: Wallet, color: 'text-amber-600', bg: 'bg-amber-50' },
  checklists: { label: '준비물', icon: Backpack, color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

const ACTION_STYLES = {
  add: { label: '추가', icon: Plus, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  edit: { label: '수정', icon: Edit3, color: 'text-amber-600', bg: 'bg-amber-50' },
  delete: { label: '삭제', icon: Trash2, color: 'text-red-500', bg: 'bg-red-50' },
};

const FILTER_TABS = [
  { key: 'all', label: '전체' },
  { key: 'schedules', label: '일정' },
  { key: 'expenses', label: '지출' },
  { key: 'checklists', label: '준비물' },
];

export default function ActivityLogPage({ logs = [], onRestore, roomCode }) {
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredLogs = (activeFilter === 'all'
    ? logs
    : logs.filter((log) => log.collection === activeFilter)
  )
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp);

  return (
    <>
      {/* 🖥️ Desktop Viewport (100% Unchanged) */}
      <div className="hidden md:block pb-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 sm:px-5 pt-2 pb-4"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-toss-blue" />
            <h1 className="text-[24px] sm:text-[26px] md:text-[28px] font-bold text-toss-text-primary tracking-tight">
              활동 로그
            </h1>
          </div>
          <p className="text-[13px] sm:text-[14px] text-toss-text-secondary mt-1">
            모든 변경 이력을 확인하세요 🔍
          </p>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mx-4 sm:mx-5 mb-5"
        >
          <div className="flex bg-toss-bg p-1 rounded-xl">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold rounded-lg transition-all ${
                  activeFilter === tab.key
                    ? 'bg-white text-toss-blue shadow-sm'
                    : 'text-toss-text-secondary'
                }`}
              >
                {tab.key === 'all' && <Filter className="w-3.5 h-3.5" />}
                {tab.key === 'schedules' && <Calendar className="w-3.5 h-3.5" />}
                {tab.key === 'expenses' && <Wallet className="w-3.5 h-3.5" />}
                {tab.key === 'checklists' && <Backpack className="w-3.5 h-3.5" />}
                {tab.label}
                {tab.key !== 'all' && (
                  (() => {
                    const count = logs.filter((l) => l.collection === tab.key).length;
                    return count > 0 ? (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          activeFilter === tab.key
                            ? 'bg-toss-blue-light text-toss-blue'
                            : 'bg-toss-border text-toss-text-tertiary'
                        }`}
                      >
                        {count}
                      </span>
                    ) : null;
                  })()
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Log List */}
        <div className="px-4 sm:px-5">
          <AnimatePresence mode="popLayout">
            {filteredLogs.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="toss-card"
              >
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 bg-toss-blue-light rounded-full flex items-center justify-center mb-3">
                    <FileText className="w-7 h-7 text-toss-blue" />
                  </div>
                  <p className="text-[15px] font-semibold text-toss-text-primary mb-1">
                    활동 기록이 없습니다
                  </p>
                  <p className="text-[13px] text-toss-text-secondary">
                    일정, 지출, 준비물을 변경하면 여기에 기록됩니다
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log, index) => {
                  const actionStyle = ACTION_STYLES[log.action] || ACTION_STYLES.edit;
                  const collectionInfo = COLLECTION_LABELS[log.collection] || COLLECTION_LABELS.schedules;
                  const ActionIcon = actionStyle.icon;
                  const canRestore = log.action === 'delete' || log.action === 'edit';

                  return (
                    <motion.div
                      key={log.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.03, duration: 0.3 }}
                      className="toss-card"
                    >
                      <div className="flex items-start gap-3">
                        {/* Action Icon */}
                        <div
                          className={`w-9 h-9 ${actionStyle.bg} rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5`}
                        >
                          <ActionIcon className={`w-4.5 h-4.5 ${actionStyle.color}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium text-toss-text-primary leading-snug">
                            {log.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {/* Collection Badge */}
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${collectionInfo.bg} ${collectionInfo.color}`}
                            >
                              {collectionInfo.label}
                            </span>
                            {/* Action Badge */}
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${actionStyle.bg} ${actionStyle.color}`}
                            >
                              {actionStyle.label}
                            </span>
                            {/* Performer Badge */}
                            {log.performedBy && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                {log.performedBy}
                              </span>
                            )}
                            {/* Relative Time */}
                            <span className="text-[11px] text-toss-text-tertiary ml-auto flex-shrink-0">
                              {getRelativeTime(log.timestamp)}
                            </span>
                          </div>
                        </div>

                        {/* Restore Button */}
                        {canRestore && (
                          <div className="flex-shrink-0 ml-1">
                            {log.restored ? (
                              <span className="text-[11px] font-medium text-toss-text-tertiary bg-toss-bg px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                                복구됨
                              </span>
                            ) : (
                              <motion.button
                                whileTap={{ scale: 0.92 }}
                                onClick={() => onRestore && onRestore(log)}
                                className="flex items-center gap-1 text-[12px] font-semibold text-toss-blue bg-toss-blue-light px-2.5 py-1.5 rounded-lg whitespace-nowrap hover:bg-blue-100 transition-colors"
                              >
                                <RotateCcw className="w-3 h-3" />
                                복구
                              </motion.button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Summary */}
        {filteredLogs.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="px-5 pt-6 text-center"
          >
            <p className="text-[12px] text-toss-text-tertiary">
              총 {filteredLogs.length}개의 활동 기록
              {roomCode && <span> · 방 코드: {roomCode}</span>}
            </p>
          </motion.div>
        )}
      </div>

      {/* 📱 Mobile Viewport (Toss-style Redesign) */}
      <div className="block md:hidden bg-[#f4f6fa] min-h-screen pb-28 text-toss-text-primary">
        {/* Header Block (Toss-style blue gradient) */}
        <div className="bg-gradient-to-br from-[#1b64da] via-[#2563eb] to-[#1d4ed8] text-white rounded-b-[2.5rem] px-6 pt-8 pb-14 shadow-lg relative overflow-hidden">
          <div className="absolute -right-6 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="absolute -left-10 -top-10 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col gap-1.5">
            <span className="text-[12px] font-extrabold text-blue-200/90 tracking-wider uppercase flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 stroke-[2.5]" /> Activity Logs
            </span>
            <h1 className="text-[26px] font-black tracking-tight leading-tight">활동 로그</h1>
            <p className="text-[13px] text-blue-100/80 font-medium">여행 중 발생한 모든 일정, 가계부, 준비물의 변경 이력입니다.</p>
          </div>
        </div>

        {/* Filter Tab Switcher (iOS Segment Control) */}
        <div className="mx-4 mt-[-2rem] relative z-20 mb-4 bg-white/95 rounded-2xl shadow-md p-1 border border-slate-100 flex overflow-x-auto scrollbar-none">
          {FILTER_TABS.map((tab) => {
            const count = logs.filter((l) => l.collection === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`relative flex-1 min-w-[70px] flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-300 ${
                  activeFilter === tab.key
                    ? 'bg-blue-50 text-[#2563eb] font-extrabold shadow-sm border border-blue-100/20'
                    : 'text-slate-500 font-bold hover:text-slate-700'
                }`}
              >
                <span className="text-[13px] tracking-tight">{tab.label}</span>
                {tab.key !== 'all' && count > 0 && (
                  <span className={`text-[9px] mt-0.5 px-1.5 py-0.2 rounded-full font-black ${
                    activeFilter === tab.key ? 'bg-[#2563eb] text-white' : 'bg-slate-150 text-slate-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Dynamic Activity Logs list */}
        <div className="mx-4 space-y-2.5">
          <AnimatePresence mode="popLayout">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-slate-100/80 shadow-sm text-center">
                <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                  <FileText className="w-7 h-7 text-[#2563eb]" />
                </div>
                <p className="text-[15px] font-extrabold text-slate-800 mb-1">활동 기록이 없습니다</p>
                <p className="text-[12px] text-slate-400">여행 데이터를 변경하면 이곳에 시간 순서대로 기록됩니다.</p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const actionStyle = ACTION_STYLES[log.action] || ACTION_STYLES.edit;
                const collectionInfo = COLLECTION_LABELS[log.collection] || COLLECTION_LABELS.schedules;
                const ActionIcon = actionStyle.icon;
                const canRestore = log.action === 'delete' || log.action === 'edit';

                return (
                  <motion.div
                    key={log.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="bg-white rounded-3xl p-4.5 shadow-sm border border-slate-100 flex items-start gap-3"
                  >
                    {/* Circle Icon Badge */}
                    <div className={`w-10 h-10 ${actionStyle.bg} rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <ActionIcon className={`w-5 h-5 ${actionStyle.color} stroke-[2.5]`} />
                    </div>

                    {/* Content Detail */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-extrabold text-slate-800 leading-snug break-all">
                        {log.description}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {/* Type badge */}
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${collectionInfo.bg} ${collectionInfo.color}`}>
                          {collectionInfo.label}
                        </span>
                        
                        {/* Action badge */}
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${actionStyle.bg} ${actionStyle.color}`}>
                          {actionStyle.label}
                        </span>

                        {/* Nickname badge */}
                        {log.performedBy && (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-150 text-slate-500">
                            {log.performedBy}
                          </span>
                        )}

                        {/* Relative time */}
                        <span className="text-[10px] text-slate-400 font-extrabold ml-auto flex-shrink-0">
                          {getRelativeTime(log.timestamp)}
                        </span>
                      </div>
                    </div>

                    {/* Mobile Restore Action */}
                    {canRestore && (
                      <div className="flex-shrink-0 ml-1.5">
                        {log.restored ? (
                          <span className="text-[10.5px] font-extrabold text-slate-400 bg-slate-100 px-2.5 py-1.5 rounded-xl whitespace-nowrap inline-block">
                            복구됨
                          </span>
                        ) : (
                          <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={() => onRestore && onRestore(log)}
                            className="inline-flex items-center justify-center gap-1 text-[11px] font-black text-[#2563eb] bg-blue-50 border border-blue-100/50 px-3 py-1.5 rounded-xl whitespace-nowrap hover:bg-blue-100 transition-colors"
                          >
                            <RotateCcw className="w-3 h-3 stroke-[2.5]" />
                            <span>복구</span>
                          </motion.button>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Footer Info */}
        {filteredLogs.length > 0 && (
          <div className="text-center pt-8 px-6 pb-4">
            <p className="text-[12px] text-slate-400 font-extrabold">
              총 {filteredLogs.length}개의 기록이 보관되어 있습니다.
            </p>
            {roomCode && (
              <p className="text-[10.5px] text-slate-300 font-black mt-0.5">
                ROOM: {roomCode}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
