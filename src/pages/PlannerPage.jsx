import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ChevronDown, ChevronUp, Calendar, Trash2, Edit3, CheckCircle2, Circle, Link2, ExternalLink, Compass, Sparkles, Map, List, AlertCircle, Download, Loader } from 'lucide-react';
import { createPortal } from 'react-dom';
import TravelMap from '../components/TravelMap';
import { optimizeScheduleWithGemini } from '../utils/gemini';

const genId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const getDatesInRange = (startDate, endDate) => {
  if (!startDate) return [];
  if (!endDate || startDate === endDate) return [startDate];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates = [];
  let current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const formatDateLabel = (dateStr) => {
  if (!dateStr || dateStr === '날짜 미정') return '날짜 미정';
  const dt = new Date(dateStr);
  const wk = ['일', '월', '화', '수', '목', '금', '토'];
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일 (${wk[dt.getDay()]})`;
};

export default function PlannerPage({
  sync, nickname, apiKey, initialExpandedDate, clearInitialExpandedDate, logAction, activeMemberTeams = [], isAdmin = false
}) {
  const { items: schedules, addItem, updateItem, removeItem } = sync;
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    const element = document.getElementById('print-itinerary-area');
    if (!element) {
      setIsDownloading(false);
      return;
    }
    
    const originalDisplay = element.style.display;
    const originalPosition = element.style.position;
    const originalLeft = element.style.left;
    const originalTop = element.style.top;
    const originalWidth = element.style.width;

    element.style.display = 'block';
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.top = '0';
    element.style.width = '800px';

    const opt = {
      margin:       [0.5, 0.5],
      filename:     `TripSync_Itinerary_${new Date().toISOString().split('T')[0]}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true,
        logging: false,
        letterRendering: true
      },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
      const html2pdf = (await import('html2pdf.js/dist/html2pdf.min.js')).default;
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF Download Error:', error);
      alert('PDF 다운로드 중 오류가 발생했습니다.');
    } finally {
      element.style.display = originalDisplay;
      element.style.position = originalPosition;
      element.style.left = originalLeft;
      element.style.top = originalTop;
      element.style.width = originalWidth;
      setIsDownloading(false);
    }
  };

  const updatePlacesList = async (sid, newPlaces) => {
    const s = schedules.find(x => x.id === sid);
    if (!s) return;
    const allCompleted = newPlaces.length > 0 ? newPlaces.every(p => p.completed) : s.completed;
    await updateItem({ ...s, completed: allCompleted, places: newPlaces });
  };
  
  // Track which dates are expanded
  const [expandedDates, setExpandedDates] = useState([]);

  useEffect(() => {
    if (initialExpandedDate) {
      setExpandedDates(prev => prev.includes(initialExpandedDate) ? prev : [...prev, initialExpandedDate]);
      setTimeout(() => {
        const el = document.getElementById(`date-section-${initialExpandedDate}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
      if (clearInitialExpandedDate) {
        clearInitialExpandedDate();
      }
    }
  }, [initialExpandedDate]);

  const handleAdd = async (s) => {
    // Check team period constraint for members
    if (!isAdmin && activeMemberTeams && activeMemberTeams.length > 0) {
      if (s.date && s.date !== '날짜 미정') {
        const scheduleStart = new Date(s.date);
        const scheduleEnd = new Date(s.endDate || s.date);
        scheduleStart.setHours(0, 0, 0, 0);
        scheduleEnd.setHours(0, 0, 0, 0);

        const isValid = activeMemberTeams.some(team => {
          const start = new Date(team.startDate);
          const end = new Date(team.endDate);
          start.setHours(0, 0, 0, 0);
          end.setHours(0, 0, 0, 0);
          return scheduleStart >= start && scheduleEnd <= end;
        });

        if (!isValid) {
          const dateText = s.endDate && s.endDate !== s.date ? `${s.date} ~ ${s.endDate}` : s.date;
          alert(`선택한 기간(${dateText})은 소속된 팀의 여행 기간에 포함되지 않아 일정을 등록할 수 없습니다.\n\n* 소속 팀 기간:\n${activeMemberTeams.map(t => `- ${t.name}: ${t.startDate} ~ ${t.endDate}`).join('\n')}`);
          return;
        }
      }
    }

    let formattedUrl = s.url?.trim() || '';
    if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }
    
    const newItem = {
      ...s,
      url: formattedUrl,
      id: genId(),
      places: [],
      createdAt: Date.now(),
      createdBy: nickname
    };
    
    await addItem(newItem);
    if (logAction) {
      await logAction('add', 'schedules', newItem, nickname);
    }
    setShowAdd(false);
  };

  const handleUpdate = async (u) => {
    // Check team period constraint for members
    if (!isAdmin && activeMemberTeams && activeMemberTeams.length > 0) {
      if (u.date && u.date !== '날짜 미정') {
        const scheduleStart = new Date(u.date);
        const scheduleEnd = new Date(u.endDate || u.date);
        scheduleStart.setHours(0, 0, 0, 0);
        scheduleEnd.setHours(0, 0, 0, 0);

        const isValid = activeMemberTeams.some(team => {
          const start = new Date(team.startDate);
          const end = new Date(team.endDate);
          start.setHours(0, 0, 0, 0);
          end.setHours(0, 0, 0, 0);
          return scheduleStart >= start && scheduleEnd <= end;
        });

        if (!isValid) {
          const dateText = u.endDate && u.endDate !== u.date ? `${u.date} ~ ${u.endDate}` : u.date;
          alert(`선택한 기간(${dateText})은 소속된 팀의 여행 기간에 포함되지 않아 일정을 수정할 수 없습니다.\n\n* 소속 팀 기간:\n${activeMemberTeams.map(t => `- ${t.name}: ${t.startDate} ~ ${t.endDate}`).join('\n')}`);
          return;
        }
      }
    }

    let formattedUrl = u.url?.trim() || '';
    if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }
    const oldItem = schedules.find(x => x.id === u.id);
    const updatedItem = { ...u, url: formattedUrl };
    await updateItem(updatedItem);
    if (logAction) {
      await logAction('edit', 'schedules', updatedItem, nickname, oldItem);
    }
    setEditing(null);
  };

  const handleDelete = async (id) => {
    const itemToDelete = schedules.find(x => x.id === id);
    await removeItem(id);
    if (logAction && itemToDelete) {
      await logAction('delete', 'schedules', itemToDelete, nickname);
    }
  };

  const addPlace = async (sid, place) => {
    const s = schedules.find(x => x.id === sid);
    if (!s) return;
    const newPlaces = [...(s.places || []), { ...place, id: genId(), completed: false }];
    await updateItem({ ...s, completed: false, places: newPlaces });
  };
  const togglePlace = async (sid, pid) => {
    const s = schedules.find(x => x.id === sid);
    if (!s) return;
    const newPlaces = s.places.map(p => p.id === pid ? { ...p, completed: !p.completed } : p);
    const allCompleted = newPlaces.every(p => p.completed);
    await updateItem({ ...s, completed: allCompleted, places: newPlaces });
  };
  const deletePlace = async (sid, pid) => {
    const s = schedules.find(x => x.id === sid);
    if (!s) return;
    const newPlaces = s.places.filter(p => p.id !== pid);
    const allCompleted = newPlaces.length > 0 ? newPlaces.every(p => p.completed) : s.completed;
    await updateItem({ ...s, completed: allCompleted, places: newPlaces });
  };
  const updatePlace = async (sid, pid, updatedFields) => {
    const s = schedules.find(x => x.id === sid);
    if (!s) return;
    const newPlaces = s.places.map(p => p.id === pid ? { ...p, ...updatedFields } : p);
    const allCompleted = newPlaces.length > 0 ? newPlaces.every(p => p.completed) : s.completed;
    await updateItem({
      ...s,
      completed: allCompleted,
      places: newPlaces
    });
  };

  const toggleSchedule = async (sid) => {
    const s = schedules.find(x => x.id === sid);
    if (!s) return;
    const total = s.places?.length || 0;
    const done = s.places?.filter(p => p.completed).length || 0;
    const currentlyDone = total > 0 ? done === total : !!s.completed;
    const newCompleted = !currentlyDone;
    const newPlaces = (s.places || []).map(p => ({ ...p, completed: newCompleted }));
    await updateItem({ ...s, completed: newCompleted, places: newPlaces });
  };

  // Group schedules by date
  const groupedSchedules = schedules.reduce((acc, s) => {
    const dateStr = s.date || '날짜 미정';
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(s);
    return acc;
  }, {});

  // Sorted unique dates
  const sortedDates = Object.keys(groupedSchedules).sort((a, b) => {
    if (a === '날짜 미정') return 1;
    if (b === '날짜 미정') return -1;
    return new Date(a) - new Date(b);
  });

  // Automatically expand the first date if none are explicitly expanded
  useEffect(() => {
    if (sortedDates.length > 0 && expandedDates.length === 0) {
      setExpandedDates([sortedDates[0]]);
    }
  }, [schedules]);

  const toggleDateExpand = (dateStr) => {
    setExpandedDates(prev =>
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    );
  };

  const totalP = schedules.reduce((a, s) => a + (s.places?.length || 0), 0);
  const doneP = schedules.reduce((a, s) => a + (s.places?.filter(p => p.completed).length || 0), 0);
  const rate = totalP > 0 ? Math.round((doneP / totalP) * 100) : 0;

  const getDayNumber = (dateStr) => {
    if (dateStr === '날짜 미정' || sortedDates.length === 0) return '';
    const validDates = sortedDates.filter(d => d !== '날짜 미정');
    if (validDates.length === 0) return '';
    const startDate = new Date(validDates[0]);
    const currDate = new Date(dateStr);
    const diffTime = Math.abs(currDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `Day ${diffDays + 1}`;
  };

  return (
    <div className="pb-6">
      {/* ==================== DESKTOP UI ==================== */}
      <div className="hidden md:block">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-4 sm:px-5 pt-2 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-[24px] sm:text-[26px] md:text-[28px] font-bold text-toss-text-primary tracking-tight">여행 일정</h1>
            <p className="text-[13px] sm:text-[14px] text-toss-text-secondary mt-1">일자별 일정을 한눈에 관리해보세요 🗓️</p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button 
              whileTap={{ scale: 0.95 }} 
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-toss-border text-toss-text-primary rounded-xl text-[14px] font-semibold shadow-sm hover:bg-toss-bg/50 disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader className="w-4 h-4 text-toss-text-secondary animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-toss-text-secondary" />
              )}
              <span>{isDownloading ? '다운로드 중...' : 'PDF 다운로드'}</span>
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-toss-blue text-white rounded-xl text-[14px] font-semibold shadow-sm hover:bg-toss-blue-dark">
              <Plus className="w-4 h-4" /> 일정 추가
            </motion.button>
          </div>
        </motion.div>

        {/* Progress Bar */}
        {totalP > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mx-4 sm:mx-5 mb-6 toss-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[14px] font-semibold text-toss-text-primary">전체 방문 진행률</span>
              <span className="text-[14px] font-bold text-toss-blue">{rate}%</span>
            </div>
            <div className="w-full h-2.5 bg-toss-bg rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${rate}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className="h-full bg-toss-blue rounded-full" />
            </div>
            <p className="text-[12px] text-toss-text-secondary mt-2">{doneP}/{totalP}개 방문 완료</p>
          </motion.div>
        )}

        {/* Accordion Group by Date */}
        <div className="px-4 sm:px-5 space-y-4">
          {sortedDates.map((dateStr) => {
            const dayLabel = getDayNumber(dateStr);
            const isExpanded = expandedDates.includes(dateStr);
            const daySchedules = groupedSchedules[dateStr].sort((a, b) => a.createdAt - b.createdAt);

            return (
              <div key={dateStr} id={`date-section-${dateStr}`} className="bg-white rounded-2xl border border-toss-border overflow-hidden shadow-sm scroll-mt-6">
                {/* Date Header Accordion Trigger */}
                <button
                  onClick={() => toggleDateExpand(dateStr)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 bg-white text-left hover:bg-toss-bg/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {dayLabel && (
                      <span className="text-[11px] sm:text-[12px] font-bold bg-toss-blue text-white px-2 py-0.8 rounded-lg">
                        {dayLabel}
                      </span>
                    )}
                    <div>
                      <h3 className="text-[16px] sm:text-[17px] font-bold text-toss-text-primary">
                        {formatDateLabel(dateStr)}
                      </h3>
                      <p className="text-[12px] text-toss-text-secondary mt-0.5">
                        일정 {daySchedules.length}개
                      </p>
                    </div>
                  </div>
                  <div className="p-1 rounded-full bg-toss-bg">
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-toss-text-secondary" /> : <ChevronDown className="w-4 h-4 text-toss-text-secondary" />}
                  </div>
                </button>

                {/* Schedules in Date */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="p-4 sm:p-5 border-t border-toss-border/60 bg-toss-bg/20 space-y-4">
                        {daySchedules.map((schedule, idx) => (
                          <ScheduleCard
                            key={schedule.id}
                            schedule={schedule}
                            index={idx}
                            apiKey={apiKey}
                            onEdit={() => setEditing(schedule)}
                            onDelete={() => handleDelete(schedule.id)}
                            onAddPlace={(p) => addPlace(schedule.id, p)}
                            onTogglePlace={(pid) => togglePlace(schedule.id, pid)}
                            onDeletePlace={(pid) => deletePlace(schedule.id, pid)}
                            onUpdatePlace={(pid, fields) => updatePlace(schedule.id, pid, fields)}
                            onUpdatePlacesList={(newPlaces) => updatePlacesList(schedule.id, newPlaces)}
                            onToggleSchedule={() => toggleSchedule(schedule.id)}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {sortedDates.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-toss-border/60">
              <div className="w-16 h-16 bg-toss-blue-light rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-toss-blue" />
              </div>
              <p className="text-[16px] font-semibold text-toss-text-primary mb-1">일정이 없어요</p>
              <p className="text-[14px] text-toss-text-secondary">새 일정을 추가해서 여행 계획을 세워보세요</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* ==================== MOBILE UI ==================== */}
      <div className="block md:hidden -mx-4 -mt-6 pb-12 flex flex-col bg-slate-50 min-h-screen text-toss-text-primary">
        {/* Mobile Header Banner */}
        <div className="bg-gradient-to-b from-toss-blue via-toss-blue to-indigo-650 text-white pt-6 pb-8 px-5 rounded-b-[36px] shadow-lg shadow-toss-blue/15 relative overflow-hidden flex flex-col gap-4">
          <div className="absolute right-[-20px] bottom-[-20px] opacity-10 pointer-events-none">
            <Compass className="w-40 h-40 rotate-12" />
          </div>

          <div className="relative z-10 flex flex-col gap-1.5">
            <div className="flex flex-wrap gap-1.5">
              {activeMemberTeams.map(team => (
                <span key={team.id} className="inline-flex items-center gap-1 bg-white/20 border border-white/30 text-white text-[11px] font-bold px-2.5 py-0.8 rounded-xl backdrop-blur-md shadow-sm">
                  ✈️ {team.name}
                </span>
              ))}
            </div>
            <h2 className="text-[23px] sm:text-[25px] font-extrabold tracking-tight mt-1.5">
              {nickname}님의 여행 일정 🗓️
            </h2>
            <p className="text-[12.5px] font-semibold text-white/80">
              TripSync와 함께 일정을 스마트하게 관리해 보세요!
            </p>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-2 mt-2.5 relative z-10">
            <div className="bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-md rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1">
              <span className="text-[9.5px] font-bold opacity-80 leading-none">등록 일정</span>
              <span className="text-[14px] font-extrabold tracking-tight pt-1 leading-none">{schedules.length}개</span>
            </div>
            <div className="bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-md rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1">
              <span className="text-[9.5px] font-bold opacity-80 leading-none">총 방문지</span>
              <span className="text-[14px] font-extrabold tracking-tight pt-1 leading-none">{totalP}곳</span>
            </div>
            <div className="bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-md rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1">
              <span className="text-[9.5px] font-bold opacity-80 leading-none">방문 진행률</span>
              <span className="text-[14px] font-extrabold tracking-tight pt-1 leading-none">{rate}%</span>
            </div>
          </div>

          {/* PDF Download Button for Mobile */}
          <motion.button 
            whileTap={{ scale: 0.97 }} 
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="relative z-10 w-full flex items-center justify-center gap-2 py-3 bg-white/20 hover:bg-white/25 border border-white/20 text-white font-bold rounded-2xl text-[13.5px] backdrop-blur-md shadow-md mt-1 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isDownloading ? (
              <Loader className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-white" />
            )}
            <span>{isDownloading ? 'PDF 다운로드 준비 중...' : '전체 일정 PDF 다운로드'}</span>
          </motion.button>
        </div>

        {/* Mobile Visit Progress Bar */}
        {totalP > 0 && (
          <div className="mx-5 mt-5 bg-white border border-toss-border/55 rounded-2xl p-4.5 shadow-sm">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[13px] font-bold text-toss-text-secondary">전체 방문 진행 상황</span>
              <span className="text-[13px] font-extrabold text-toss-blue">{doneP}/{totalP}개 완료</span>
            </div>
            <div className="w-full h-2.5 bg-toss-bg rounded-full overflow-hidden">
              <div className="h-full bg-toss-blue rounded-full transition-all duration-700" style={{ width: `${rate}%` }} />
            </div>
          </div>
        )}

        {/* Accordion Group by Date for Mobile */}
        <div className="px-5 mt-5 space-y-4">
          {sortedDates.map((dateStr) => {
            const dayLabel = getDayNumber(dateStr);
            const isExpanded = expandedDates.includes(dateStr);
            const daySchedules = groupedSchedules[dateStr].sort((a, b) => a.createdAt - b.createdAt);

            return (
              <div key={dateStr} id={`date-section-${dateStr}`} className="bg-white rounded-2xl border border-toss-border/55 overflow-hidden shadow-sm">
                <button
                  onClick={() => toggleDateExpand(dateStr)}
                  className="w-full flex items-center justify-between p-4 bg-white text-left active:bg-toss-bg/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {dayLabel && (
                      <span className="text-[10.5px] font-extrabold bg-toss-blue text-white px-2 py-0.5 rounded-lg">
                        {dayLabel}
                      </span>
                    )}
                    <div>
                      <h3 className="text-[15px] font-extrabold text-toss-text-primary">
                        {formatDateLabel(dateStr)}
                      </h3>
                      <p className="text-[11.5px] text-toss-text-secondary mt-0.5 font-semibold">
                        일정 {daySchedules.length}개
                      </p>
                    </div>
                  </div>
                  <div className="p-1 rounded-full bg-toss-bg">
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-toss-text-secondary" /> : <ChevronDown className="w-4 h-4 text-toss-text-secondary" />}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="p-4 border-t border-toss-border/40 bg-toss-bg/10 space-y-4">
                        {daySchedules.map((schedule, idx) => (
                          <ScheduleCard
                            key={schedule.id}
                            schedule={schedule}
                            index={idx}
                            apiKey={apiKey}
                            onEdit={() => setEditing(schedule)}
                            onDelete={() => handleDelete(schedule.id)}
                            onAddPlace={(p) => addPlace(schedule.id, p)}
                            onTogglePlace={(pid) => togglePlace(schedule.id, pid)}
                            onDeletePlace={(pid) => deletePlace(schedule.id, pid)}
                            onUpdatePlace={(pid, fields) => updatePlace(schedule.id, pid, fields)}
                            onUpdatePlacesList={(newPlaces) => updatePlacesList(schedule.id, newPlaces)}
                            onToggleSchedule={() => toggleSchedule(schedule.id)}
                            isMobile={true}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {sortedDates.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-toss-border/50 text-center">
              <div className="w-14 h-14 bg-toss-blue-light rounded-full flex items-center justify-center mb-3">
                <Calendar className="w-7 h-7 text-toss-blue" />
              </div>
              <p className="text-[15px] font-bold text-toss-text-primary mb-0.5">등록된 일정이 없습니다</p>
              <p className="text-[12.5px] text-toss-text-secondary">새 일정을 추가하여 여행 계획을 세워보세요</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Add Button for Mobile */}
      <motion.button whileTap={{ scale: 0.92 }} onClick={() => setShowAdd(true)}
        className="md:hidden fixed bottom-24 right-4 sm:right-5 w-14 h-14 bg-toss-blue rounded-full flex items-center justify-center shadow-lg shadow-toss-blue/30 z-40">
        <Plus className="w-6 h-6 text-white" />
      </motion.button>

      <AnimatePresence>
        {(showAdd || editing) && (
          <ScheduleModal
            schedule={editing}
            onSave={editing ? handleUpdate : handleAdd}
            onClose={() => { setShowAdd(false); setEditing(null); }}
          />
        )}
      </AnimatePresence>

      {/* PDF Export Portal */}
      {createPortal(
        <div id="print-itinerary-area" style={{ display: 'none' }} className="bg-white text-[#191F28] p-8 max-w-4xl mx-auto font-sans leading-relaxed">
          <style>{`
            .print-card {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .print-divider {
              border-bottom: 1px dashed #E5E8EB;
            }
          `}</style>
          
          {/* Header Banner */}
          <div className="border-b-4 border-toss-blue pb-6 mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-extrabold text-toss-blue tracking-tight">✈️ TripSync 여행 일정표</h1>
              <p className="text-sm text-toss-text-secondary mt-1.5">팀원들과 함께 계획한 유럽 여행 일정의 상세 내역입니다.</p>
            </div>
            <div className="text-right text-xs text-toss-text-secondary font-medium leading-5">
              <p>출력 회원: <span className="font-semibold text-toss-text-primary">{nickname}</span></p>
              <p>다운로드 일시: {new Date().toLocaleString('ko-KR')}</p>
            </div>
          </div>
          
          {/* Quick Summary Grid */}
          <div className="grid grid-cols-3 gap-4 p-5 bg-toss-bg/50 rounded-2xl border border-toss-border/60 mb-8 text-center text-sm">
            <div>
              <p className="text-toss-text-secondary font-semibold mb-1">총 일정 일수</p>
              <p className="text-xl font-extrabold text-toss-text-primary">{sortedDates.filter(d => d !== '날짜 미정').length}일</p>
            </div>
            <div>
              <p className="text-toss-text-secondary font-semibold mb-1">등록 일정 개수</p>
              <p className="text-xl font-extrabold text-toss-text-primary">{schedules.length}개</p>
            </div>
            <div>
              <p className="text-toss-text-secondary font-semibold mb-1">총 방문 예정지</p>
              <p className="text-xl font-extrabold text-toss-text-primary">{totalP}곳 ({doneP}곳 완료)</p>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="space-y-8">
            {sortedDates.map((dateStr) => {
              const dayLabel = getDayNumber(dateStr);
              const daySchedules = groupedSchedules[dateStr].sort((a, b) => a.createdAt - b.createdAt);
              
              return (
                <div key={dateStr} className="print-card border border-toss-border/70 rounded-2xl p-6 bg-white shadow-sm space-y-4">
                  {/* Day Date Title */}
                  <div className="flex items-center gap-3 border-b border-toss-border pb-3">
                    {dayLabel && (
                      <span className="text-xs font-extrabold bg-toss-blue text-white px-2.5 py-1 rounded-lg">
                        {dayLabel}
                      </span>
                    )}
                    <h2 className="text-lg font-bold text-toss-text-primary">
                      {formatDateLabel(dateStr)}
                    </h2>
                    <span className="text-xs text-toss-text-secondary font-bold ml-auto">
                      일정 {daySchedules.length}개
                    </span>
                  </div>
                  
                  {/* Schedules in this Day */}
                  <div className="space-y-6">
                    {daySchedules.map((schedule, idx) => {
                      const sortedPls = [...(schedule.places || [])].sort((a, b) => {
                        const dateA = a.date || schedule.date;
                        const dateB = b.date || schedule.date;
                        if (dateA !== dateB) return dateA.localeCompare(dateB);
                        if (!a.time && !b.time) return 0;
                        if (!a.time) return 1;
                        if (!b.time) return -1;
                        return a.time.localeCompare(b.time);
                      });

                      return (
                        <div key={schedule.id} className="relative pl-6 border-l-2 border-toss-blue/15 last:border-l-0 pb-1">
                          {/* Timeline dot */}
                          <div className="absolute left-[-6px] top-[6px] w-2.5 h-2.5 rounded-full bg-toss-blue border-2 border-white" />
                          
                          <div className="flex items-baseline justify-between flex-wrap gap-2">
                            <h3 className="text-base font-bold text-toss-text-primary flex items-center gap-2">
                              {schedule.title}
                              {schedule.completed && (
                                <span className="text-[10px] bg-green-50 text-toss-success font-extrabold px-1.5 py-0.5 rounded">
                                  완료
                                </span>
                              )}
                            </h3>
                            {schedule.time && (
                              <span className="text-xs font-semibold text-toss-blue font-mono bg-toss-blue-light px-2.5 py-0.5 rounded">
                                {schedule.time}
                              </span>
                            )}
                          </div>
                          
                          {schedule.memo && (
                            <p className="text-xs text-toss-text-secondary mt-1.5 whitespace-pre-wrap leading-relaxed">
                              {schedule.memo}
                            </p>
                          )}
                          
                          {/* Places checklist inside this schedule */}
                          {sortedPls.length > 0 && (
                            <div className="mt-3.5 bg-toss-bg/30 border border-toss-border/40 rounded-xl p-4 space-y-2.5">
                              <p className="text-[11px] font-bold text-toss-text-secondary uppercase tracking-wider">세부 방문지 ({sortedPls.length})</p>
                              {sortedPls.map((pl) => (
                                <div key={pl.id} className="text-xs flex items-start gap-2.5 border-b border-toss-border/20 last:border-0 pb-2.5 last:pb-0">
                                  <span className="text-xs font-semibold text-toss-blue mt-0.5">
                                    {pl.completed ? '☑' : '☐'}
                                  </span>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`font-bold ${pl.completed ? 'line-through text-toss-text-tertiary' : 'text-toss-text-primary'}`}>
                                        {pl.name}
                                      </span>
                                      {pl.time && (
                                        <span className="text-[9.5px] text-toss-blue font-semibold font-mono bg-toss-blue-light/60 px-1.5 py-0.2 rounded">
                                          {pl.time}
                                        </span>
                                      )}
                                    </div>
                                    {pl.memo && (
                                      <p className="text-[11px] text-toss-text-secondary mt-0.5 whitespace-pre-wrap leading-relaxed">
                                        {pl.memo}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

const parseTime24 = (timeStr) => {
  if (!timeStr) return { ampm: '오전', hour: '09', minute: '00' };
  const [hStr, mStr] = timeStr.split(':');
  const h24 = parseInt(hStr, 10);
  const minute = mStr || '00';
  if (isNaN(h24)) return { ampm: '오전', hour: '09', minute: '00' };
  
  let ampm = '오전';
  let h12 = h24;
  if (h24 >= 12) {
    ampm = '오후';
    h12 = h24 === 12 ? 12 : h24 - 12;
  } else if (h24 === 0) {
    h12 = 12;
  }
  const hour = h12.toString().padStart(2, '0');
  return { ampm, hour, minute };
};

const formatTime24 = (ampm, hour, minute) => {
  let h12 = parseInt(hour, 10) || 9;
  let h24 = h12;
  if (ampm === '오후') {
    h24 = h12 === 12 ? 12 : h12 + 12;
  } else { // 오전
    h24 = h12 === 12 ? 0 : h12;
  }
  const hStr = h24.toString().padStart(2, '0');
  const mStr = minute.toString().padStart(2, '0');
  return `${hStr}:${mStr}`;
};

function AmPmDropdown({ value, onChange, isOpen, onToggle, dropdownId }) {
  return (
    <div className="relative shrink-0 select-none">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(isOpen ? null : dropdownId);
        }}
        className="px-1.5 py-0.5 min-w-0 min-h-0 bg-transparent hover:bg-toss-bg/85 rounded text-[13px] font-extrabold text-toss-text-primary flex items-center gap-0.5 transition-all active:scale-95 animate-fade-in"
      >
        <span>{value}</span>
        <ChevronDown className="w-3 h-3 text-toss-text-secondary shrink-0 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 mt-1.5 z-[999] bg-white border border-toss-border/60 shadow-xl rounded-xl py-1 min-w-[76px] flex flex-col text-left overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                onChange('오전');
                onToggle(null);
              }}
              className={`px-3 py-1.8 text-[12px] font-semibold transition-colors hover:bg-toss-blue/5 text-left ${value === '오전' ? 'text-toss-blue bg-toss-blue/5 font-extrabold' : 'text-toss-text-primary'}`}
            >
              오전
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('오후');
                onToggle(null);
              }}
              className={`px-3 py-1.8 text-[12px] font-semibold transition-colors hover:bg-toss-blue/5 text-left ${value === '오후' ? 'text-toss-blue bg-toss-blue/5 font-extrabold' : 'text-toss-text-primary'}`}
            >
              오후
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TimeInputGroup({ label, value, onChange, onClear, dropdownId, activeDropdown, onToggleDropdown }) {
  const parsed = parseTime24(value);
  const [localHour, setLocalHour] = useState(parsed.hour);
  const [localMin, setLocalMin] = useState(parsed.minute);

  useEffect(() => {
    setLocalHour(parsed.hour);
    setLocalMin(parsed.minute);
  }, [value]);

  const handleHourChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    if (val !== '') {
      const num = parseInt(val, 10);
      if (num > 12) val = '12';
    }
    setLocalHour(val);
  };

  const handleMinChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    if (val !== '') {
      const num = parseInt(val, 10);
      if (num > 59) val = '59';
    }
    setLocalMin(val);
  };

  const handleHourBlur = () => {
    let h = localHour;
    if (!h || h === '0' || h === '00') h = '12';
    else h = h.padStart(2, '0');
    setLocalHour(h);
    onChange(formatTime24(parsed.ampm, h, localMin || '00'));
  };

  const handleMinBlur = () => {
    let m = localMin;
    if (!m) m = '00';
    else m = m.padStart(2, '0');
    setLocalMin(m);
    onChange(formatTime24(parsed.ampm, localHour || '12', m));
  };

  const handleAmPmChange = (newAmPm) => {
    onChange(formatTime24(newAmPm, localHour || '12', localMin || '00'));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  const isDropdownOpen = activeDropdown === dropdownId;

  return (
    <div className={`flex items-center justify-between gap-1 w-full bg-white px-3 py-1.5 rounded-xl border transition-all h-[38px] shadow-sm animate-fade-in ${isDropdownOpen ? 'border-toss-blue ring-[1px] ring-toss-blue' : 'border-toss-border focus-within:border-toss-blue focus-within:ring-[1px] focus-within:ring-toss-blue'}`}>
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <span className="text-[11px] text-toss-text-secondary font-semibold whitespace-nowrap shrink-0">{label}</span>
        <div className="h-3 w-[1px] bg-toss-border shrink-0 mx-0.5" />
        <div className="flex items-center gap-1 min-w-0 flex-1 pl-0.5">
          <AmPmDropdown 
            value={parsed.ampm} 
            onChange={handleAmPmChange} 
            isOpen={isDropdownOpen}
            onToggle={onToggleDropdown}
            dropdownId={dropdownId}
          />
          <div className="flex items-center gap-0.5 text-toss-text-primary">
            <input 
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              placeholder="09"
              value={localHour}
              onChange={handleHourChange}
              onBlur={handleHourBlur}
              onKeyDown={handleKeyDown}
              className="w-[20px] text-center font-extrabold text-[13px] text-toss-text-primary bg-transparent border-0 p-0 focus:ring-0 outline-none select-all"
            />
            <span className="text-[12px] text-toss-text-tertiary font-bold shrink-0 mx-0.5">:</span>
            <input 
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              placeholder="00"
              value={localMin}
              onChange={handleMinChange}
              onBlur={handleMinBlur}
              onKeyDown={handleKeyDown}
              className="w-[20px] text-center font-extrabold text-[13px] text-toss-text-primary bg-transparent border-0 p-0 focus:ring-0 outline-none select-all"
            />
          </div>
        </div>
      </div>
      <button 
        type="button" 
        onClick={onClear} 
        className="text-toss-text-tertiary hover:text-toss-text-secondary shrink-0 p-0.5 transition-colors btn-icon-sm" 
        title="시간 제거"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ScheduleCard({ schedule, index, onEdit, onDelete, onAddPlace, onTogglePlace, onDeletePlace, onUpdatePlace, apiKey, onUpdatePlacesList, onToggleSchedule, isMobile }) {
  const [showAdd, setShowAdd] = useState(false);
  const [pName, setPName] = useState('');
  const [pMemo, setPMemo] = useState('');
  const [pStartTime, setPStartTime] = useState('');
  const [pEndTime, setPEndTime] = useState('');
  const [pUrl, setPUrl] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const [useEndTime, setUseEndTime] = useState(false);
  const [useEditEndTime, setUseEditEndTime] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveDropdown(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // States for map and AI features
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedPreview, setOptimizedPreview] = useState(null);
  const [optimizeError, setOptimizeError] = useState(null);

  // States for inline editing of a place
  const [editingPlaceId, setEditingPlaceId] = useState(null);
  const [editPName, setEditPName] = useState('');
  const [editPMemo, setEditPMemo] = useState('');
  const [editPStartTime, setEditPStartTime] = useState('');
  const [editPEndTime, setEditPEndTime] = useState('');
  const [editPUrl, setEditPUrl] = useState('');

  // Date selection states for places
  const [pDate, setPDate] = useState(schedule?.date || '');
  const [editPDate, setEditPDate] = useState('');

  useEffect(() => {
    if (schedule?.date) {
      setPDate(schedule.date);
    }
  }, [schedule]);

  const done = schedule.places?.filter(p => p.completed).length || 0;
  const total = schedule.places?.length || 0;
  const allDone = total > 0 ? done === total : !!schedule.completed;

  const handleAdd = () => {
    if (!pName.trim()) return;
    
    let formattedUrl = pUrl.trim();
    if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    let combinedTime = '';
    if (pStartTime && pEndTime) {
      combinedTime = `${pStartTime} ~ ${pEndTime}`;
    } else if (pStartTime) {
      combinedTime = pStartTime;
    } else if (pEndTime) {
      combinedTime = `~ ${pEndTime}`;
    }

    onAddPlace({
      name: pName.trim(),
      memo: pMemo.trim(),
      time: combinedTime,
      url: formattedUrl,
      date: pDate || schedule.date
    });
    setPName('');
    setPMemo('');
    setPStartTime('');
    setPEndTime('');
    setPUrl('');
    setPDate(schedule.date);
    setShowAdd(false);
  };

  const startEditPlace = (pl) => {
    setEditingPlaceId(pl.id);
    setEditPName(pl.name);
    setEditPMemo(pl.memo || '');
    setEditPUrl(pl.url || '');
    setEditPDate(pl.date || schedule.date);
    
    let startTime = '';
    let endTime = '';
    if (pl.time) {
      if (pl.time.includes('~')) {
        const parts = pl.time.split('~');
        startTime = parts[0].trim();
        endTime = parts[1] ? parts[1].trim() : '';
      } else {
        startTime = pl.time.trim();
      }
    }
    setEditPStartTime(startTime);
    setEditPEndTime(endTime);
  };

  const handleSaveEditPlace = async (pid) => {
    if (!editPName.trim()) return;
    
    let formattedUrl = editPUrl.trim();
    if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    let combinedTime = '';
    if (editPStartTime && editPEndTime) {
      combinedTime = `${editPStartTime} ~ ${editPEndTime}`;
    } else if (editPStartTime) {
      combinedTime = editPStartTime;
    } else if (editPEndTime) {
      combinedTime = `~ ${editPEndTime}`;
    }

    await onUpdatePlace(pid, {
      name: editPName.trim(),
      memo: editPMemo.trim(),
      time: combinedTime,
      url: formattedUrl,
      date: editPDate || schedule.date
    });
    setEditingPlaceId(null);
  };

  const cancelEditPlace = () => {
    setEditingPlaceId(null);
  };

  const handleLinkClick = (e, url) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleGoogleMapsSearch = (e, placeName) => {
    e.stopPropagation();
    const query = encodeURIComponent(placeName);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener,noreferrer');
  };

  const handleAIOptimize = async () => {
    if (!apiKey) {
      setOptimizeError('설정 탭에서 Gemini API Key를 먼저 등록해주세요!');
      return;
    }
    if (!schedule.places || schedule.places.length === 0) {
      setOptimizeError('최적화할 방문 장소가 없습니다. 먼저 장소를 추가해주세요.');
      return;
    }
    setIsOptimizing(true);
    setOptimizeError(null);
    try {
      const result = await optimizeScheduleWithGemini(schedule.title, sortedPlaces, apiKey);
      if (result && Array.isArray(result)) {
        const mappedPlaces = result.map(p => {
          const original = schedule.places.find(op => op.id === p.id || op.name.includes(p.name) || p.name.includes(op.name));
          return {
            id: original?.id || p.id || genId(),
            name: p.name,
            time: p.time || '',
            memo: p.memo || '',
            url: p.url || original?.url || '',
            completed: original?.completed || false
          };
        });
        setOptimizedPreview(mappedPlaces);
      } else {
        throw new Error('올바르지 않은 응답 형식입니다.');
      }
    } catch (e) {
      console.error(e);
      setOptimizeError(e.message || 'AI 동선 최적화 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApplyOptimization = () => {
    if (optimizedPreview) {
      onUpdatePlacesList(optimizedPreview);
      setOptimizedPreview(null);
    }
  };

  // Sort places by date first, then by time chronologically
  const sortedPlaces = [...(schedule.places || [])].sort((a, b) => {
    const dateA = a.date || schedule.date;
    const dateB = b.date || schedule.date;
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });

  const isMultiDay = schedule.endDate && schedule.endDate !== schedule.date;
  const rangeDates = getDatesInRange(schedule.date, schedule.endDate);

  const placesByDate = sortedPlaces.reduce((acc, p) => {
    const d = p.date || schedule.date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(p);
    return acc;
  }, {});

  const allDates = Array.from(new Set([...rangeDates, ...Object.keys(placesByDate)]))
    .sort((a, b) => a.localeCompare(b));

  const renderMobilePlaceRow = (pl) => {
    if (pl.id === editingPlaceId) {
      return (
        <motion.div
          key={pl.id}
          layout
          className="p-3 bg-toss-bg rounded-xl space-y-2 border border-toss-blue/20"
        >
          {isMultiDay && rangeDates.length > 1 && (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-toss-text-secondary">방문 일자</label>
              <select 
                value={editPDate} 
                onChange={e => setEditPDate(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl text-[12px] border border-toss-border outline-none focus:border-toss-blue font-semibold"
              >
                {rangeDates.map((d, i) => (
                  <option key={d} value={d}>
                    {i + 1}일차 - {formatDateLabel(d)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-toss-text-secondary">방문 시간</span>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={useEditEndTime} 
                onChange={e => {
                  setUseEditEndTime(e.target.checked);
                  if (!e.target.checked) setEditPEndTime('');
                  else {
                    let defaultEnd = '10:00';
                    if (editPStartTime) {
                      const [h, m] = editPStartTime.split(':').map(Number);
                      defaultEnd = `${((h + 1) % 24).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                    }
                    setEditPEndTime(defaultEnd);
                  }
                }} 
                className="w-3.5 h-3.5 rounded border-toss-border text-toss-blue"
              />
              <span className="text-[10px] font-bold text-toss-text-secondary">종료 시간 포함</span>
            </label>
          </div>

          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-12">
              {!editPStartTime ? (
                <button 
                  type="button" 
                  onClick={() => setEditPStartTime('09:00')}
                  className="w-full h-[36px] bg-white rounded-xl text-[11px] font-bold text-toss-text-secondary flex items-center justify-center gap-1 border border-toss-border/50"
                >
                  ⏰ 시작 시간
                </button>
              ) : (
                <TimeInputGroup
                  label="시작"
                  value={editPStartTime}
                  onChange={setEditPStartTime}
                  onClear={() => setEditPStartTime('')}
                  dropdownId="editStartAmPmMobile"
                  activeDropdown={activeDropdown}
                  onToggleDropdown={setActiveDropdown}
                />
              )}
            </div>

            {useEditEndTime && (
              <div className="col-span-12">
                {!editPEndTime ? (
                  <button 
                    type="button" 
                    onClick={() => setEditPEndTime('10:00')}
                    className="w-full h-[36px] bg-white rounded-xl text-[11px] font-bold text-toss-text-secondary flex items-center justify-center gap-1 border border-toss-border/50"
                  >
                    ⏰ 종료 시간
                  </button>
                ) : (
                  <TimeInputGroup
                    label="종료"
                    value={editPEndTime}
                    onChange={setEditPEndTime}
                    onClear={() => {
                      setEditPEndTime('');
                      setUseEditEndTime(false);
                    }}
                    dropdownId="editEndAmPmMobile"
                    activeDropdown={activeDropdown}
                    onToggleDropdown={setActiveDropdown}
                  />
                )}
              </div>
            )}
          </div>
          <input type="text" placeholder="방문지 이름" value={editPName} onChange={e => setEditPName(e.target.value)}
            className="w-full px-3 py-2 bg-white rounded-xl text-[12px] border border-toss-border outline-none focus:border-toss-blue" autoFocus />
          <input type="text" placeholder="메모" value={editPMemo} onChange={e => setEditPMemo(e.target.value)}
            className="w-full px-3 py-2 bg-white rounded-xl text-[12px] border border-toss-border outline-none focus:border-toss-blue" />
          <input type="text" placeholder="참고 URL" value={editPUrl} onChange={e => setEditPUrl(e.target.value)}
            className="w-full px-3 py-2 bg-white rounded-xl text-[12px] border border-toss-border outline-none focus:border-toss-blue" />
          <div className="flex gap-2 pt-1">
            <button onClick={cancelEditPlace} className="flex-1 py-1.8 rounded-xl text-[11px] font-bold text-toss-text-secondary bg-white border border-toss-border">취소</button>
            <button onClick={() => handleSaveEditPlace(pl.id)} disabled={!editPName.trim()} className="flex-1 py-1.8 rounded-xl text-[11px] font-extrabold text-white bg-toss-blue disabled:opacity-40">저장</button>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        key={pl.id}
        layout
        className={`flex flex-col gap-2 p-3 rounded-2xl border border-toss-border/30 bg-white ${pl.completed ? 'bg-green-50/10 border-l-4 border-l-toss-success' : 'shadow-sm'}`}
      >
        <div className="flex items-start gap-2.5">
          <button onClick={() => onTogglePlace(pl.id)} className="mt-0.5 flex-shrink-0 text-toss-blue">
            {pl.completed ? (
              <CheckCircle2 className="w-5 h-5 text-toss-success" />
            ) : (
              <Circle className="w-5 h-5 text-toss-text-tertiary" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-1">
              {pl.time && (
                <div className="self-start flex flex-col gap-0.5">
                  {pl.time.includes('~') ? (
                    <>
                      <span className="inline-flex items-center gap-0.5 text-[9.5px] font-extrabold bg-toss-blue/5 text-toss-blue px-2 py-0.5 rounded-md">
                        ⏰ 시작 {pl.time.split('~')[0].trim()}
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-[9.5px] font-extrabold bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-md">
                        ⏰ 종료 {pl.time.split('~')[1].trim()}
                      </span>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[9.5px] font-extrabold bg-toss-blue/5 text-toss-blue px-2 py-0.5 rounded-md">
                      ⏰ {pl.time}
                    </span>
                  )}
                </div>
              )}
              <p className={`text-[13px] font-bold tracking-tight leading-snug break-all ${pl.completed ? 'line-through text-toss-text-tertiary' : 'text-toss-text-primary'}`}>
                {pl.name}
              </p>
            </div>
            {pl.memo && (
              <p className={`text-[11px] mt-1 leading-snug break-all ${pl.completed ? 'text-toss-text-tertiary' : 'text-toss-text-secondary font-medium'}`}>
                {pl.memo}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-toss-border/30">
          <button
            onClick={(e) => handleGoogleMapsSearch(e, pl.name)}
            className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-toss-bg text-[10.5px] font-bold text-toss-blue"
          >
            <Compass className="w-3 h-3" />
            <span>길찾기</span>
          </button>
          {pl.url && (
            <button
              onClick={(e) => handleLinkClick(e, pl.url)}
              className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-toss-bg text-[10.5px] font-bold text-toss-blue"
            >
              <Link2 className="w-3 h-3" />
              <span>링크</span>
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); startEditPlace(pl); }}
            className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-toss-bg text-[10.5px] font-bold text-toss-text-secondary"
          >
            <Edit3 className="w-3 h-3" />
            <span>수정</span>
          </button>
          <button
            onClick={() => onDeletePlace(pl.id)}
            className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-red-50 text-[10.5px] font-bold text-toss-danger"
          >
            <X className="w-3 h-3" />
            <span>삭제</span>
          </button>
        </div>
      </motion.div>
    );
  };

  const renderDesktopPlaceRow = (pl) => {
    if (pl.id === editingPlaceId) {
      return (
        <motion.div
          key={pl.id}
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="p-3 bg-toss-bg rounded-xl space-y-2 border border-toss-blue/20"
        >
          {isMultiDay && rangeDates.length > 1 && (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-toss-text-secondary">방문 일자</label>
              <select 
                value={editPDate} 
                onChange={e => setEditPDate(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl text-[13px] border border-toss-border outline-none focus:border-toss-blue font-semibold"
              >
                {rangeDates.map((d, i) => (
                  <option key={d} value={d}>
                    {i + 1}일차 - {formatDateLabel(d)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-toss-text-secondary">방문 시간</span>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={useEditEndTime} 
                onChange={e => {
                  setUseEditEndTime(e.target.checked);
                  if (!e.target.checked) {
                    setEditPEndTime('');
                  } else {
                    let defaultEnd = '10:00';
                    if (editPStartTime) {
                      const [h, m] = editPStartTime.split(':').map(Number);
                      defaultEnd = `${((h + 1) % 24).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                    }
                    setEditPEndTime(defaultEnd);
                  }
                }} 
                className="w-3.5 h-3.5 rounded border-toss-border text-toss-blue focus:ring-toss-blue"
              />
              <span className="text-[10.5px] font-semibold text-toss-text-secondary">종료 시간 포함</span>
            </label>
          </div>

          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-12">
              {!editPStartTime ? (
                <button 
                  type="button" 
                  onClick={() => setEditPStartTime('09:00')}
                  className="w-full h-[38px] bg-toss-bg hover:bg-toss-border/40 rounded-xl text-[12px] font-semibold text-toss-text-secondary flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] border border-toss-border/50"
                >
                  ⏰ 시작 시간 지정
                </button>
              ) : (
                <TimeInputGroup
                  label="시작"
                  value={editPStartTime}
                  onChange={setEditPStartTime}
                  onClear={() => setEditPStartTime('')}
                  dropdownId="editStartAmPm"
                  activeDropdown={activeDropdown}
                  onToggleDropdown={setActiveDropdown}
                />
              )}
            </div>

            {useEditEndTime && (
              <div className="col-span-12">
                {!editPEndTime ? (
                  <button 
                    type="button" 
                    onClick={() => setEditPEndTime('10:00')}
                    className="w-full h-[38px] bg-toss-bg hover:bg-toss-border/40 rounded-xl text-[12px] font-semibold text-toss-text-secondary flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] border border-toss-border/50"
                  >
                    ⏰ 종료 시간 지정
                  </button>
                ) : (
                  <TimeInputGroup
                    label="종료"
                    value={editPEndTime}
                    onChange={setEditPEndTime}
                    onClear={() => {
                      setEditPEndTime('');
                      setUseEditEndTime(false);
                    }}
                    dropdownId="editEndAmPm"
                    activeDropdown={activeDropdown}
                    onToggleDropdown={setActiveDropdown}
                  />
                )}
              </div>
            )}
          </div>
          <input type="text" placeholder="방문지 이름" value={editPName} onChange={e => setEditPName(e.target.value)}
            className="w-full px-3 py-2 bg-white rounded-xl text-[13px] border border-toss-border focus:border-toss-blue outline-none" autoFocus />
          <input type="text" placeholder="메모" value={editPMemo} onChange={e => setEditPMemo(e.target.value)}
            className="w-full px-3 py-2 bg-white rounded-xl text-[13px] border border-toss-border focus:border-toss-blue outline-none" />
          <input type="text" placeholder="참고 URL" value={editPUrl} onChange={e => setEditPUrl(e.target.value)}
            className="w-full px-3 py-2 bg-white rounded-xl text-[13px] border border-toss-border focus:border-toss-blue outline-none" />
          <div className="flex gap-2 pt-1">
            <button onClick={cancelEditPlace} className="flex-1 py-2 rounded-xl text-[12px] font-medium text-toss-text-secondary bg-white border border-toss-border">취소</button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleSaveEditPlace(pl.id)} disabled={!editPName.trim()} className="flex-1 py-2 rounded-xl text-[12px] font-semibold text-white bg-toss-blue disabled:opacity-40">저장</motion.button>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        key={pl.id}
        layout
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 10 }}
        className={`flex items-start gap-3 p-2.5 rounded-xl ${pl.completed ? 'bg-green-50/50' : 'bg-toss-bg'}`}
      >
        <motion.button whileTap={{ scale: 0.8 }} onClick={() => onTogglePlace(pl.id)} className="mt-0.5 flex-shrink-0 btn-icon-sm">
          {pl.completed ? (
            <CheckCircle2 className="w-5 h-5 text-toss-success" />
          ) : (
            <Circle className="w-5 h-5 text-toss-text-tertiary" />
          )}
        </motion.button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {pl.time && (
              <div className="flex flex-wrap gap-1">
                {pl.time.includes('~') ? (
                  <>
                    <span className="text-[10px] sm:text-[11px] font-bold bg-toss-blue/10 text-toss-blue px-2 py-0.5 rounded-md flex items-center gap-0.5">
                      ⏰ 시작 {pl.time.split('~')[0].trim()}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-bold bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                      ⏰ 종료 {pl.time.split('~')[1].trim()}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] sm:text-[11px] font-bold bg-toss-blue/10 text-toss-blue px-2 py-0.5 rounded-md flex items-center gap-0.5">
                    ⏰ {pl.time}
                  </span>
                )}
              </div>
            )}
            <p className={`text-[13px] sm:text-[14px] font-medium ${pl.completed ? 'line-through text-toss-text-tertiary' : 'text-toss-text-primary'}`}>
              {pl.name}
            </p>
          </div>
          {pl.memo && (
            <p className={`text-[11px] sm:text-[12px] mt-0.5 ${pl.completed ? 'text-toss-text-tertiary' : 'text-toss-text-secondary'}`}>
              {pl.memo}
            </p>
          )}
        </div>
        
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => handleGoogleMapsSearch(e, pl.name)}
          className="p-1.5 rounded-full hover:bg-toss-blue-light flex-shrink-0 btn-icon-sm text-toss-blue"
          title="구글맵 길찾기"
        >
          <Compass className="w-4 h-4" />
        </motion.button>
        
        {pl.url && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => handleLinkClick(e, pl.url)}
            className="p-1.5 rounded-full hover:bg-toss-blue-light flex-shrink-0 btn-icon-sm text-toss-blue"
            title="관련 링크 바로가기"
          >
            <Link2 className="w-4 h-4" />
          </motion.button>
        )}
        
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => { e.stopPropagation(); startEditPlace(pl); }}
          className="p-1.5 rounded-full hover:bg-toss-bg flex-shrink-0 btn-icon-sm text-toss-text-secondary"
          title="수정"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => onDeletePlace(pl.id)} className="p-1.5 rounded-full hover:bg-red-50 flex-shrink-0 btn-icon-sm">
          <X className="w-3.5 h-3.5 text-toss-text-tertiary" />
        </motion.button>
      </motion.div>
    );
  };

  if (isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`bg-white rounded-2xl p-4 border border-toss-border/55 shadow-sm transition-all duration-200 ${allDone ? 'border-l-4 border-toss-success bg-green-50/5 font-semibold' : ''}`}
      >
        {/* Mobile Schedule Header */}
        <div className="flex items-start justify-between">
          {/* Toggle complete checkbox */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSchedule && onToggleSchedule(); }}
            className="mt-0.5 shrink-0 mr-2.5 text-toss-blue"
            title={allDone ? '완료 취소' : '완료 처리'}
          >
            {allDone ? (
              <CheckCircle2 className="w-5 h-5 text-toss-success" />
            ) : (
              <Circle className="w-5 h-5 text-toss-text-tertiary" />
            )}
          </button>

          <div className="flex-1 min-w-0 active:opacity-75" onClick={() => setIsExpanded(!isExpanded)}>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {allDone && (
                <span className="text-[10px] font-extrabold text-toss-success bg-green-50 px-2 py-0.5 rounded-full">
                  전부 완료 ✓
                </span>
              )}
              {schedule.endDate && schedule.endDate !== schedule.date ? (
                <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                  📅 {formatDateLabel(schedule.date)} ~ {formatDateLabel(schedule.endDate)}
                </span>
              ) : (
                <span className="text-[10px] font-extrabold text-toss-text-tertiary bg-toss-bg px-2 py-0.5 rounded-full whitespace-nowrap">
                  📅 {formatDateLabel(schedule.date)}
                </span>
              )}
            </div>
            {/* 제목과 수정/삭제 버튼을 같은 줄에 나란히 배치 */}
            <div className="flex items-center justify-between mt-1.5 gap-3">
              <h4 className={`text-[16.5px] font-extrabold tracking-tight leading-snug break-words flex-1 ${allDone ? 'line-through text-toss-text-tertiary' : 'text-toss-text-primary'}`}>
                {schedule.title}
              </h4>
              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={onEdit} 
                  className="w-[30px] h-[30px] rounded-xl bg-toss-bg hover:bg-toss-border/40 active:scale-95 flex items-center justify-center text-toss-text-secondary transition-all"
                  title="일정 수정"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={onDelete} 
                  className="w-[30px] h-[30px] rounded-xl bg-red-50 hover:bg-red-100 active:scale-95 flex items-center justify-center text-toss-danger transition-all"
                  title="일정 삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {schedule.url && (
              <button
                onClick={(e) => handleLinkClick(e, schedule.url)}
                className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 bg-toss-blue/5 text-toss-blue text-[11px] font-bold rounded-lg active:bg-toss-blue/10 transition-colors"
              >
                <Link2 className="w-3.5 h-3.5" />
                참고 링크
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </button>
            )}

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {total > 0 && (
                <p className="text-[11.5px] font-semibold text-toss-text-secondary">📍 코스 {done}/{total}개</p>
              )}
              {schedule.createdBy && (
                <p className="text-[11px] font-bold text-toss-text-tertiary bg-toss-bg px-2 py-0.5 rounded-full">
                  👤 {schedule.createdBy}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center shrink-0 ml-2">
            <button 
              onClick={() => setIsExpanded(!isExpanded)} 
              className="w-8 h-8 rounded-full hover:bg-toss-bg active:bg-toss-bg flex items-center justify-center text-toss-text-secondary"
            >
              {isExpanded ? <ChevronUp className="w-4.5 h-4.5" /> : <ChevronDown className="w-4.5 h-4.5" />}
            </button>
          </div>
        </div>

        {/* Places List Accordion */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-toss-border/40">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <p className="text-[11.5px] font-extrabold text-toss-text-secondary m-0">방문 코스 상세</p>
                  <div className="flex items-center gap-1.5">
                    {/* View Mode Toggle Buttons */}
                    <div className="flex bg-toss-bg p-0.5 rounded-xl border border-toss-border/40">
                      <button
                        onClick={() => setViewMode('list')}
                        className={`flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'list' ? 'bg-white text-toss-blue shadow-sm' : 'text-toss-text-secondary'}`}
                      >
                        <List className="w-3 h-3" /> 리스트
                      </button>
                      <button
                        onClick={() => setViewMode('map')}
                        disabled={!schedule.places || schedule.places.length === 0}
                        className={`flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'map' ? 'bg-white text-toss-blue shadow-sm' : 'text-toss-text-secondary disabled:opacity-40'}`}
                      >
                        <Map className="w-3 h-3" /> 지도
                      </button>
                    </div>

                    {/* AI Optimize Button */}
                    <button
                      onClick={handleAIOptimize}
                      disabled={isOptimizing || !schedule.places || schedule.places.length === 0}
                      className="flex items-center gap-0.5 px-2 py-1 bg-gradient-to-r from-toss-blue to-purple-600 text-white rounded-xl text-[10px] font-extrabold shadow-sm active:opacity-90 disabled:opacity-40"
                    >
                      {isOptimizing ? (
                        <div className="w-2.5 h-2.5 border-[2px] border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      AI 최적화
                    </button>
                  </div>
                </div>

                {optimizeError && (
                  <div className="mb-3 p-3 bg-red-50 text-red-600 rounded-xl text-[11px] font-semibold flex items-start gap-1.5 border border-red-100">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div className="flex-1">{optimizeError}</div>
                    <button onClick={() => setOptimizeError(null)} className="text-[13px] font-bold opacity-75">&times;</button>
                  </div>
                )}

                {viewMode === 'list' ? (
                  <div className="space-y-4 pr-0.5 max-h-[350px] overflow-y-auto">
                    {isMultiDay ? (
                      allDates.map((d) => {
                        const dayPlaces = placesByDate[d] || [];
                        const dayNum = rangeDates.indexOf(d) !== -1 ? rangeDates.indexOf(d) + 1 : null;
                        const dayLabel = dayNum ? `${dayNum}일차 - ` : '';
                        const dateLabel = formatDateLabel(d);

                        return (
                          <div key={d} className="space-y-2">
                            <div className="pt-2 pb-1 bg-white z-10 flex items-center">
                              <span className="text-[10px] font-extrabold text-toss-blue bg-toss-blue-light/70 px-2 py-0.5 rounded-lg shadow-sm">
                                {dayLabel}{dateLabel}
                              </span>
                            </div>
                            {dayPlaces.length > 0 ? (
                              <div className="space-y-2.5 pl-1.5 border-l-2 border-toss-border/60 ml-2 pt-1">
                                {dayPlaces.map((pl) => renderMobilePlaceRow(pl))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-toss-text-tertiary italic pl-4 py-1">방문 장소가 없습니다.</p>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      sortedPlaces.map((pl) => renderMobilePlaceRow(pl))
                    )}
                    {sortedPlaces.length === 0 && !isMultiDay && (
                      <p className="text-[12px] text-toss-text-tertiary italic text-center py-4">방문지가 없습니다. 아래 버튼으로 추가해보세요!</p>
                    )}
                  </div>
                ) : (
                  <TravelMap places={sortedPlaces} dateLabel={schedule.title} />
                )}

                {showAdd ? (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 p-3 bg-toss-bg rounded-xl space-y-2">
                    {isMultiDay && rangeDates.length > 1 && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-toss-text-secondary">방문 일자</label>
                        <select 
                          value={pDate} 
                          onChange={e => setPDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white rounded-xl text-[12px] border border-toss-border outline-none focus:border-toss-blue font-semibold"
                        >
                          {rangeDates.map((d, i) => (
                            <option key={d} value={d}>
                              {i + 1}일차 - {formatDateLabel(d)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-toss-text-secondary">방문 시간</span>
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={useEndTime} 
                          onChange={e => {
                            setUseEndTime(e.target.checked);
                            if (!e.target.checked) setPEndTime('');
                            else {
                              let defaultEnd = '10:00';
                              if (pStartTime) {
                                const [h, m] = pStartTime.split(':').map(Number);
                                defaultEnd = `${((h + 1) % 24).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                              }
                              setPEndTime(defaultEnd);
                            }
                          }} 
                          className="w-3.5 h-3.5 rounded border-toss-border text-toss-blue"
                        />
                        <span className="text-[10px] font-bold text-toss-text-secondary">종료 시간 포함</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                      <div className={useEndTime ? "col-span-6" : "col-span-12"}>
                        {!pStartTime ? (
                          <button 
                            type="button" 
                            onClick={() => setPStartTime('09:00')}
                            className="w-full h-[36px] bg-white rounded-xl text-[11px] font-bold text-toss-text-secondary flex items-center justify-center gap-1 border border-toss-border/50"
                          >
                            ⏰ 시작 시간
                          </button>
                        ) : (
                          <TimeInputGroup
                            label="시작"
                            value={pStartTime}
                            onChange={setPStartTime}
                            onClear={() => setPStartTime('')}
                            dropdownId="addStartAmPm"
                            activeDropdown={activeDropdown}
                            onToggleDropdown={setActiveDropdown}
                          />
                        )}
                      </div>

                      {useEndTime && (
                        <div className="col-span-6">
                          {!pEndTime ? (
                            <button 
                              type="button" 
                              onClick={() => setPEndTime('10:00')}
                              className="w-full h-[36px] bg-white rounded-xl text-[11px] font-bold text-toss-text-secondary flex items-center justify-center gap-1 border border-toss-border/50"
                            >
                              ⏰ 종료 시간
                            </button>
                          ) : (
                            <TimeInputGroup
                              label="종료"
                              value={pEndTime}
                              onChange={setPEndTime}
                              onClear={() => {
                                setPEndTime('');
                                setUseEndTime(false);
                              }}
                              dropdownId="addEndAmPm"
                              activeDropdown={activeDropdown}
                              onToggleDropdown={setActiveDropdown}
                            />
                          )}
                        </div>
                      )}
                    </div>
                    <input type="text" placeholder="방문지 이름 (예: 에펠탑)" value={pName} onChange={e => setPName(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl text-[12px] border border-toss-border outline-none focus:border-toss-blue" autoFocus />
                    <input type="text" placeholder="메모 (예: 뮤지엄패스 지참)" value={pMemo} onChange={e => setPMemo(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl text-[12px] border border-toss-border outline-none focus:border-toss-blue" />
                    <input type="text" placeholder="참고 URL (선택)" value={pUrl} onChange={e => setPUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl text-[12px] border border-toss-border outline-none focus:border-toss-blue" />
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-xl text-[12px] font-bold text-toss-text-secondary bg-white border border-toss-border">취소</button>
                      <button onClick={handleAdd} disabled={!pName.trim()} className="flex-1 py-2 rounded-xl text-[12px] font-extrabold text-white bg-toss-blue disabled:opacity-40">추가</button>
                    </div>
                  </motion.div>
                ) : (
                  <button onClick={() => setShowAdd(true)}
                    className="w-full mt-3 py-2 rounded-xl border border-dashed border-toss-border/70 text-[12px] font-bold text-toss-text-secondary hover:border-toss-blue hover:text-toss-blue active:bg-toss-bg flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />방문지 추가
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Optimization Preview Modal for Mobile */}
        <AnimatePresence>
          {optimizedPreview && (
            <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[9999] flex items-end justify-center">
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                className="bg-white rounded-t-3xl p-5 w-full max-h-[85vh] flex flex-col shadow-2xl border border-toss-border/55">
                <div className="w-10 h-1 bg-toss-border rounded-full mx-auto mb-3" />
                <div className="flex items-center gap-2 mb-3 shrink-0">
                  <div className="w-7 h-7 bg-toss-blue/10 rounded-xl flex items-center justify-center text-toss-blue">
                    <Sparkles className="w-3.5 h-3.5" strokeWidth={2.2} />
                  </div>
                  <h3 className="text-[16px] font-extrabold text-toss-text-primary">AI 동선 최적화 제안</h3>
                </div>
                
                <p className="text-[12px] text-toss-text-secondary leading-relaxed mb-3 shrink-0">
                  Gemini AI가 제안한 동선과 추천 시간 및 팁입니다.
                </p>

                <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 mb-4">
                  {optimizedPreview.map((pl, idx) => (
                    <div key={idx} className="flex gap-2.5 p-3 bg-toss-bg rounded-xl border border-toss-border/60">
                      <span className="w-5 h-5 rounded-full bg-toss-blue text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {pl.time && (
                            <span className="text-[9.5px] font-extrabold bg-toss-blue/10 text-toss-blue px-1.5 py-0.5 rounded">
                              ⏰ {pl.time}
                            </span>
                          )}
                          <p className="text-[12px] font-bold text-toss-text-primary">{pl.name}</p>
                        </div>
                        {pl.memo && <p className="text-[11px] text-toss-text-secondary mt-1 leading-normal">{pl.memo}</p>}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-auto shrink-0 pb-safe">
                  <button onClick={() => setOptimizedPreview(null)}
                    className="flex-1 py-3 rounded-2xl text-[13px] font-bold text-toss-text-secondary bg-toss-bg">
                    취소
                  </button>
                  <button onClick={handleApplyOptimization}
                    className="flex-1 py-3 rounded-2xl text-[13px] font-extrabold text-white bg-toss-blue shadow-md shadow-toss-blue/20">
                    적용하기
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-white rounded-xl p-4 sm:p-5 border border-toss-border/80 shadow-sm transition-all duration-200 ${allDone ? 'border-l-4 border-toss-success bg-green-50/10' : ''}`}
    >
      <div className="flex items-start justify-between">
        {/* Toggle complete checkbox (Desktop) */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => { e.stopPropagation(); onToggleSchedule && onToggleSchedule(); }}
          className="mt-1 shrink-0 mr-3 text-toss-blue"
          title={allDone ? '완료 취소' : '완료 처리'}
        >
          {allDone ? (
            <CheckCircle2 className="w-5 h-5 text-toss-success" />
          ) : (
            <Circle className="w-5 h-5 text-toss-text-tertiary" />
          )}
        </motion.button>

        <div className="flex-1 cursor-pointer active:opacity-75" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {allDone && (
              <span className="text-[10px] sm:text-[11px] font-medium text-toss-success bg-green-50 px-2 py-0.5 rounded-full">
                전부 완료 ✓
              </span>
            )}
            {schedule.endDate && schedule.endDate !== schedule.date ? (
              <span className="text-[10px] sm:text-[11px] font-medium bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                📅 {formatDateLabel(schedule.date)} ~ {formatDateLabel(schedule.endDate)}
              </span>
            ) : (
              <span className="text-[10px] sm:text-[11px] font-medium text-toss-text-tertiary bg-toss-bg px-2 py-0.5 rounded-full whitespace-nowrap">
                📅 {formatDateLabel(schedule.date)}
              </span>
            )}
          </div>
          <h4 className={`text-[15px] sm:text-[16px] font-bold ${allDone ? 'line-through text-toss-text-tertiary' : 'text-toss-text-primary'}`}>{schedule.title}</h4>


          {/* Reference Link Button if URL exists */}
          {schedule.url && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={(e) => handleLinkClick(e, schedule.url)}
              className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-toss-blue-light text-toss-blue text-[11px] sm:text-[12px] font-semibold rounded-lg hover:bg-toss-blue/10 transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              참고 링크 바로가기
              <ExternalLink className="w-3 h-3 opacity-60" />
            </motion.button>
          )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {total > 0 && (
              <p className="text-[11px] sm:text-[12px] text-toss-text-tertiary">📍 세부 장소 {done}/{total}개</p>
            )}
            {schedule.createdBy && (
              <p className="text-[11px] text-toss-text-tertiary bg-toss-bg px-2 py-0.5 rounded-full">
                👤 {schedule.createdBy}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 ml-2">
          <motion.button whileTap={{ scale: 0.9 }} onClick={onEdit} className="p-2 rounded-full hover:bg-toss-bg btn-icon-sm">
            <Edit3 className="w-4 h-4 text-toss-text-secondary" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onDelete} className="p-2 rounded-full hover:bg-red-50 btn-icon-sm">
            <Trash2 className="w-4 h-4 text-toss-danger" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsExpanded(!isExpanded)} className="p-2 rounded-full hover:bg-toss-bg btn-icon-sm">
            {isExpanded ? <ChevronUp className="w-4 h-4 text-toss-text-secondary" /> : <ChevronDown className="w-4 h-4 text-toss-text-secondary" />}
          </motion.button>
        </div>
      </div>

      {/* Places List Accordion */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-toss-border/60">
              <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
                <p className="text-[12px] font-bold text-toss-text-secondary m-0">방문 상세 코스</p>
                <div className="flex items-center gap-2">
                  {/* View Mode Toggle Buttons */}
                  <div className="flex bg-toss-bg p-0.5 rounded-xl border border-toss-border/40">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${viewMode === 'list' ? 'bg-white text-toss-blue shadow-sm' : 'text-toss-text-secondary hover:text-toss-text-primary'}`}
                    >
                      <List className="w-3.5 h-3.5" /> 리스트
                    </button>
                    <button
                      onClick={() => setViewMode('map')}
                      disabled={!schedule.places || schedule.places.length === 0}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${viewMode === 'map' ? 'bg-white text-toss-blue shadow-sm' : 'text-toss-text-secondary hover:text-toss-text-primary disabled:opacity-40 disabled:pointer-events-none'}`}
                    >
                      <Map className="w-3.5 h-3.5" /> 지도
                    </button>
                  </div>

                  {/* AI Optimize Button */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAIOptimize}
                    disabled={isOptimizing || !schedule.places || schedule.places.length === 0}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-toss-blue to-purple-600 text-white rounded-xl text-[11px] font-bold shadow-sm shadow-toss-blue/10 hover:opacity-90 transition-all disabled:opacity-40"
                  >
                    {isOptimizing ? (
                      <div className="w-3 h-3 border-[2px] border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    AI 최적화
                  </motion.button>
                </div>
              </div>

              {optimizeError && (
                <div className="mb-3 p-3 bg-red-50 text-red-600 rounded-xl text-[11px] sm:text-[12px] font-medium flex items-start gap-1.5 border border-red-100">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    {optimizeError}
                  </div>
                  <button onClick={() => setOptimizeError(null)} className="text-[14px] font-bold opacity-70 hover:opacity-100">&times;</button>
                </div>
              )}

              {viewMode === 'list' ? (
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {isMultiDay ? (
                    allDates.map((d) => {
                      const dayPlaces = placesByDate[d] || [];
                      const dayNum = rangeDates.indexOf(d) !== -1 ? rangeDates.indexOf(d) + 1 : null;
                      const dayLabel = dayNum ? `${dayNum}일차 - ` : '';
                      const dateLabel = formatDateLabel(d);

                      return (
                        <div key={d} className="space-y-2">
                          <div className="pt-2 pb-1 bg-white z-10 flex items-center">
                            <span className="text-[10px] font-extrabold text-toss-blue bg-toss-blue-light/70 px-2 py-0.5 rounded-lg shadow-sm">
                              {dayLabel}{dateLabel}
                            </span>
                          </div>
                          {dayPlaces.length > 0 ? (
                            <div className="space-y-2.5 pl-2 border-l-2 border-toss-border/60 ml-2 pt-1">
                              {dayPlaces.map((pl) => renderDesktopPlaceRow(pl))}
                            </div>
                          ) : (
                            <p className="text-[11.5px] text-toss-text-tertiary italic pl-4 py-1">방문 장소가 없습니다.</p>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    sortedPlaces.map((pl) => renderDesktopPlaceRow(pl))
                  )}
                  {sortedPlaces.length === 0 && !isMultiDay && (
                    <p className="text-[13px] text-toss-text-tertiary italic text-center py-4">방문지가 없습니다. 아래 버튼으로 추가해보세요!</p>
                  )}
                </div>
              ) : (
                <TravelMap places={sortedPlaces} dateLabel={schedule.title} />
              )}

              {showAdd ? (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 p-3.5 bg-toss-bg rounded-xl space-y-2.5">
                  {isMultiDay && rangeDates.length > 1 && (
                    <div className="flex flex-col gap-1 mb-2">
                      <label className="text-[11px] font-bold text-toss-text-secondary">방문 일자</label>
                      <select 
                        value={pDate} 
                        onChange={e => setPDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white rounded-xl text-[12px] border border-toss-border outline-none focus:border-toss-blue font-semibold"
                      >
                        {rangeDates.map((d, i) => (
                          <option key={d} value={d}>
                            {i + 1}일차 - {formatDateLabel(d)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-toss-text-secondary">방문 시간</span>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={useEndTime} 
                        onChange={e => {
                          setUseEndTime(e.target.checked);
                          if (!e.target.checked) {
                            setPEndTime('');
                          } else {
                            let defaultEnd = '10:00';
                            if (pStartTime) {
                              const [h, m] = pStartTime.split(':').map(Number);
                              defaultEnd = `${((h + 1) % 24).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                            }
                            setPEndTime(defaultEnd);
                          }
                        }} 
                        className="w-3.5 h-3.5 rounded border-toss-border text-toss-blue focus:ring-toss-blue"
                      />
                      <span className="text-[10.5px] font-semibold text-toss-text-secondary">종료 시간 포함</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-12 gap-2">
                    <div className={useEndTime ? "col-span-6" : "col-span-12"}>
                      {!pStartTime ? (
                        <button 
                          type="button" 
                          onClick={() => setPStartTime('09:00')}
                          className="w-full h-[38px] bg-toss-bg hover:bg-toss-border/40 rounded-xl text-[12px] font-semibold text-toss-text-secondary flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] border border-toss-border/50"
                        >
                          ⏰ 시작 시간 지정
                        </button>
                      ) : (
                        <TimeInputGroup
                          label="시작"
                          value={pStartTime}
                          onChange={setPStartTime}
                          onClear={() => setPStartTime('')}
                          dropdownId="addStartAmPm"
                          activeDropdown={activeDropdown}
                          onToggleDropdown={setActiveDropdown}
                        />
                      )}
                    </div>

                    {useEndTime && (
                      <div className="col-span-6">
                        {!pEndTime ? (
                          <button 
                            type="button" 
                            onClick={() => setPEndTime('10:00')}
                            className="w-full h-[38px] bg-toss-bg hover:bg-toss-border/40 rounded-xl text-[12px] font-semibold text-toss-text-secondary flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] border border-toss-border/50"
                          >
                            ⏰ 종료 시간 지정
                          </button>
                        ) : (
                          <TimeInputGroup
                            label="종료"
                            value={pEndTime}
                            onChange={setPEndTime}
                            onClear={() => {
                              setPEndTime('');
                              setUseEndTime(false);
                            }}
                            dropdownId="addEndAmPm"
                            activeDropdown={activeDropdown}
                            onToggleDropdown={setActiveDropdown}
                          />
                        )}
                      </div>
                    )}
                  </div>
                  <input type="text" placeholder="방문지 이름 (예: 루브르)" value={pName} onChange={e => setPName(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-xl text-[13px] border border-toss-border focus:border-toss-blue outline-none" autoFocus />
                  <input type="text" placeholder="메모 (예: 뮤지엄패스 전용줄 이용)" value={pMemo} onChange={e => setPMemo(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-xl text-[13px] border border-toss-border focus:border-toss-blue outline-none" />
                  <input type="text" placeholder="참고 URL (선택, 예: 예약 링크)" value={pUrl} onChange={e => setPUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-xl text-[13px] border border-toss-border focus:border-toss-blue outline-none" />
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl text-[13px] font-medium text-toss-text-secondary bg-white border border-toss-border">취소</button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleAdd} disabled={!pName.trim()} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-toss-blue disabled:opacity-40">추가</motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowAdd(true)}
                  className="w-full mt-3 py-2.5 rounded-xl border border-dashed border-toss-border text-[13px] font-medium text-toss-text-secondary hover:border-toss-blue hover:text-toss-blue active:bg-toss-bg flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />방문지 추가
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Optimization Preview Modal */}
      <AnimatePresence>
        {optimizedPreview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[9999] flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div initial={{ scale: 0.95, y: '100%' }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: '100%' }}
              className="bg-white rounded-t-3xl md:rounded-3xl p-6 sm:p-7 max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-toss-border modal-sheet">
              <div className="w-10 h-1 bg-toss-border rounded-full mx-auto mb-4 md:hidden" />
              <div className="flex items-center gap-2 mb-4 shrink-0">
                <div className="w-8 h-8 bg-toss-blue/10 rounded-xl flex items-center justify-center text-toss-blue">
                  <Sparkles className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <h3 className="text-[17px] font-bold text-toss-text-primary">AI 동선 최적화 제안</h3>
              </div>
              
              <p className="text-[12px] sm:text-[13px] text-toss-text-secondary leading-relaxed mb-4 shrink-0">
                Gemini AI가 지리적 효율성 및 이동 동선을 파악하여 시간대별 코스를 짜고, 유용한 여행 팁을 추가했습니다. 적용 버튼을 누르면 이 제안으로 업데이트됩니다.
              </p>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-6">
                {optimizedPreview.map((pl, idx) => (
                  <div key={idx} className="flex gap-3 p-3 bg-toss-bg rounded-xl border border-toss-border/60">
                    <span className="w-6 h-6 rounded-full bg-toss-blue text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {pl.time && (
                          <span className="text-[10px] font-bold bg-toss-blue/10 text-toss-blue px-1.5 py-0.5 rounded">
                            ⏰ {pl.time}
                          </span>
                        )}
                        <p className="text-[13px] font-bold text-toss-text-primary">{pl.name}</p>
                      </div>
                      {pl.memo && <p className="text-[11.5px] text-toss-text-secondary mt-1 leading-relaxed">{pl.memo}</p>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-auto shrink-0 pb-safe">
                <button onClick={() => setOptimizedPreview(null)}
                  className="flex-1 py-3.5 rounded-2xl text-[14px] font-semibold text-toss-text-secondary bg-toss-bg hover:bg-toss-border/30 transition-colors">
                  취소
                </button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleApplyOptimization}
                  className="flex-1 py-3.5 rounded-2xl text-[14px] font-semibold text-white bg-toss-blue hover:bg-toss-blue-dark shadow-md shadow-toss-blue/20 transition-colors">
                  적용하기
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ScheduleModal({ schedule, onSave, onClose }) {
  const [title, setTitle] = useState(schedule?.title || '');
  const [date, setDate] = useState(schedule?.date || '');
  const [isPeriod, setIsPeriod] = useState(() => {
    if (schedule?.endDate && schedule?.endDate !== schedule?.date) return true;
    return false;
  });
  const [endDate, setEndDate] = useState(schedule?.endDate || schedule?.date || '');
  const [url, setUrl] = useState(schedule?.url || '');

  const handleDateChange = (val) => {
    setDate(val);
    if (!isPeriod || !endDate || endDate < val) {
      setEndDate(val);
    }
  };

  const save = () => {
    if (!title.trim() || !date) return;
    onSave({
      ...(schedule || {}),
      title: title.trim(),
      date,
      endDate: isPeriod ? endDate : date,
      url: url.trim()
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-[100] flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <motion.div initial={{ y: '100%', scale: 1 }} animate={{ y: 0, scale: 1 }} exit={{ y: '100%', scale: 0.95 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()} 
        className="w-full max-w-lg bg-white rounded-t-3xl md:rounded-3xl p-4 pb-8 sm:p-5 sm:pb-10 md:p-8 safe-bottom modal-sheet md:my-auto max-h-[72dvh] md:max-h-[85vh] overflow-y-auto"
      >
        <div className="w-10 h-1 bg-toss-border rounded-full mx-auto mb-4 md:hidden" />
        
        {/* Header with Title and Action buttons on top right */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] sm:text-[20px] font-extrabold text-toss-text-primary tracking-tight">
            {schedule ? '일정 수정' : '새 일정 추가'}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 rounded-xl text-[12.5px] font-bold text-toss-text-secondary bg-toss-bg hover:bg-toss-border/40 transition-colors">
              취소
            </button>
            <motion.button 
              whileTap={{ scale: 0.95 }} 
              onClick={save} 
              disabled={!title.trim() || !date || (isPeriod && !endDate)}
              className="px-3.5 py-1.5 rounded-xl text-[12.5px] font-bold text-white bg-toss-blue hover:bg-toss-blue-dark disabled:opacity-40 shadow-sm transition-colors"
            >
              {schedule ? '수정' : '추가'}
            </motion.button>
          </div>
        </div>

        {/* Form Body */}
        <div className="space-y-3">
          <div>
            <label className="text-[12px] font-semibold text-toss-text-secondary mb-1 block">일정 제목</label>
            <input type="text" placeholder="예: 파리 에펠탑 투어" value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-toss-bg rounded-xl text-[14px] border-0 outline-none focus:ring-2 focus:ring-toss-blue/20 transition-all" autoFocus />
          </div>
          
          <div>
            <label className="text-[12px] font-semibold text-toss-text-secondary mb-1 block">일정 유형</label>
            <div className="flex bg-toss-bg p-1 rounded-2xl border border-toss-border/40">
              <button
                type="button"
                onClick={() => {
                  setIsPeriod(false);
                  setEndDate(date);
                }}
                className={`flex-1 py-2 rounded-xl text-[13px] font-bold transition-all ${!isPeriod ? 'bg-white text-toss-blue shadow-sm' : 'text-toss-text-secondary hover:text-toss-text-primary'}`}
              >
                하루 (1일)
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPeriod(true);
                  if (!endDate || endDate < date) {
                    setEndDate(date);
                  }
                }}
                className={`flex-1 py-2 rounded-xl text-[13px] font-bold transition-all ${isPeriod ? 'bg-white text-toss-blue shadow-sm' : 'text-toss-text-secondary hover:text-toss-text-primary'}`}
              >
                기간 선택 (1일 이상)
              </button>
            </div>
          </div>

          {isPeriod ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-semibold text-toss-text-secondary mb-1 block">시작일</label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={e => handleDateChange(e.target.value)} 
                  className="w-full px-3.5 py-2.5 bg-toss-bg rounded-xl text-[14px] border-0 outline-none focus:ring-2 focus:ring-toss-blue/20 transition-all" 
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-toss-text-secondary mb-1 block">종료일</label>
                <input 
                  type="date" 
                  value={endDate} 
                  min={date}
                  onChange={e => setEndDate(e.target.value)} 
                  className="w-full px-3.5 py-2.5 bg-toss-bg rounded-xl text-[14px] border-0 outline-none focus:ring-2 focus:ring-toss-blue/20 transition-all" 
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-[12px] font-semibold text-toss-text-secondary mb-1 block">날짜</label>
              <input 
                type="date" 
                value={date} 
                onChange={e => handleDateChange(e.target.value)} 
                className="w-full px-3.5 py-2.5 bg-toss-bg rounded-xl text-[14px] border-0 outline-none focus:ring-2 focus:ring-toss-blue/20 transition-all" 
              />
            </div>
          )}

          <div>
            <label className="text-[12px] font-semibold text-toss-text-secondary mb-1 block">참고 URL (선택)</label>
            <input type="text" placeholder="예: google.com 또는 https://maps.google.com" value={url} onChange={e => setUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-toss-bg rounded-xl text-[14px] border-0 outline-none focus:ring-2 focus:ring-toss-blue/20 transition-all" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
