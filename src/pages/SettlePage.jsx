import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ArrowRight, BarChart3, Receipt, CheckCircle, ArrowUpRight, ArrowDownLeft, Smile, X, Calendar } from 'lucide-react';
import { convertToKRW, formatKRW } from '../utils/exchangeRate';
import { fetchExchangeRates } from '../utils/exchangeRate';

// ─── localStorage helpers ─────────────────────────────────────────────────────
const COMPLETED_KEY = 'tripsync_completed_transfers_v2';

const loadCompleted = () => {
  try {
    const raw = localStorage.getItem(COMPLETED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveCompleted = (list) => {
  try { localStorage.setItem(COMPLETED_KEY, JSON.stringify(list)); }
  catch (e) { console.error(e); }
};

const genId = () => `ct_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function SettlePage({ members, expenses = [], nickname }) {
  const [currentRates, setCurrentRates] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedDateKey, setSelectedDateKey] = useState('all');

  // completedTransfers: Array of { id, from, to, amount, completedAt, dateKey }
  const [completedTransfers, setCompletedTransfers] = useState(loadCompleted);

  useEffect(() => {
    fetchExchangeRates().then(r => setCurrentRates(r.rates));
  }, []);

  // ── Mark a pending transfer as completed ───────────────────────────────────
  const markComplete = (from, to, amount) => {
    const entry = {
      id: genId(),
      from,
      to,
      amount,
      completedAt: Date.now(),
      dateKey: selectedDateKey,
    };
    const next = [...completedTransfers, entry];
    setCompletedTransfers(next);
    saveCompleted(next);
  };

  // ── Undo a completed transfer ──────────────────────────────────────────────
  const undoComplete = (id) => {
    const next = completedTransfers.filter(ct => ct.id !== id);
    setCompletedTransfers(next);
    saveCompleted(next);
  };

  // ── Date options ───────────────────────────────────────────────────────────
  const dateOptions = useMemo(() => {
    const datesMap = {};
    expenses.forEach(e => {
      const d = new Date(e.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const label = d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
      datesMap[key] = label;
    });
    return [
      { key: 'all', label: '전체 정산' },
      ...Object.keys(datesMap).sort().map(k => ({ key: k, label: datesMap[k] }))
    ];
  }, [expenses]);

  // ── Filter expenses by selected date ─────────────────────────────────────
  const filteredExpenses = useMemo(() => {
    if (selectedDateKey === 'all') return expenses;
    return expenses.filter(e => {
      const d = new Date(e.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      return key === selectedDateKey;
    });
  }, [expenses, selectedDateKey]);

  // ── Gross settlement calculation (ignoring completed transfers) ───────────
  //    This is the "full picture" of what's owed based on filtered expenses
  const grossSettlements = useMemo(() => {
    if (members.length === 0) return { balances: {}, transfers: [], memberStats: {} };
    const balances = {};
    const memberStats = {};
    members.forEach(m => { balances[m] = 0; memberStats[m] = { paid: 0, actual: 0 }; });

    filteredExpenses.forEach(e => {
      const r = e.rateSnapshot || currentRates;
      const krw = r ? convertToKRW(e.amount, e.currency, r) : 0;
      if (balances[e.paidBy] !== undefined) {
        balances[e.paidBy] += krw;
        memberStats[e.paidBy].paid += krw;
      }
      const targets = e.splitWith || members;
      const count = targets.length;
      if (count > 0) {
        const perPerson = krw / count;
        targets.forEach(target => {
          if (balances[target] !== undefined) {
            balances[target] -= perPerson;
            memberStats[target].actual += perPerson;
          }
        });
      }
    });
    return { balances, memberStats };
  }, [members, filteredExpenses, currentRates]);

  // ── Net settlement calculation ────────────────────────────────────────────
  //    Gross balances MINUS already-completed transfer amounts
  const settlements = useMemo(() => {
    const { balances: grossBalances, memberStats } = grossSettlements;
    const netBalances = { ...grossBalances };

    // Subtract all completed transfers that apply to current filter
    completedTransfers.forEach(ct => {
      const applies = selectedDateKey === 'all'
        ? true                               // show all completions in "전체" mode
        : ct.dateKey === selectedDateKey;    // show only this-date completions
      if (applies) {
        if (netBalances[ct.from] !== undefined) netBalances[ct.from] += ct.amount; // sender's debt reduced
        if (netBalances[ct.to] !== undefined) netBalances[ct.to] -= ct.amount;     // receiver's credit reduced
      }
    });

    // Greedy algorithm on net balances → outstanding transfers
    const activeBalances = { ...netBalances };
    const transfers = [];
    const threshold = 1;
    while (true) {
      let maxDebtor = null;
      let maxCreditor = null;
      members.forEach(m => {
        const bal = activeBalances[m];
        if (bal < -threshold) { if (!maxDebtor || bal < activeBalances[maxDebtor]) maxDebtor = m; }
        else if (bal > threshold) { if (!maxCreditor || bal > activeBalances[maxCreditor]) maxCreditor = m; }
      });
      if (!maxDebtor || !maxCreditor) break;
      const amt = Math.round(Math.min(-activeBalances[maxDebtor], activeBalances[maxCreditor]));
      transfers.push({ from: maxDebtor, to: maxCreditor, amount: amt });
      activeBalances[maxDebtor] += amt;
      activeBalances[maxCreditor] -= amt;
    }

    return { balances: netBalances, transfers, memberStats };
  }, [grossSettlements, completedTransfers, selectedDateKey, members]);

  // ── Completed transfers (filtered) ───────────────────────────────────────
  const filteredCompleted = useMemo(() => {
    return completedTransfers.filter(ct =>
      selectedDateKey === 'all' || ct.dateKey === selectedDateKey
    );
  }, [completedTransfers, selectedDateKey]);

  // ── My pending/completed ──────────────────────────────────────────────────
  const myPendingToPay = settlements.transfers.filter(t => t.from === nickname);
  const myPendingToReceive = settlements.transfers.filter(t => t.to === nickname);
  const myCompletedToPay = filteredCompleted.filter(ct => ct.from === nickname);
  const myCompletedToReceive = filteredCompleted.filter(ct => ct.to === nickname);

  // ── Summary amounts ───────────────────────────────────────────────────────
  const totalKRW = filteredExpenses.reduce((a, e) => {
    const r = e.rateSnapshot || currentRates;
    return a + (r ? convertToKRW(e.amount, e.currency, r) : 0);
  }, 0);
  const averageKRW = members.length > 0 ? Math.round(totalKRW / members.length) : 0;

  const pendingToPay = myPendingToPay.reduce((s, t) => s + t.amount, 0);
  const pendingToReceive = myPendingToReceive.reduce((s, t) => s + t.amount, 0);
  const completedAmountToPay = myCompletedToPay.reduce((s, t) => s + t.amount, 0);
  const completedAmountToReceive = myCompletedToReceive.reduce((s, t) => s + t.amount, 0);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getGradient = (name) => {
    const g = ['from-[#3b82f6] to-[#1d4ed8]','from-[#10b981] to-[#047857]','from-[#8b5cf6] to-[#6d28d9]','from-[#ec4899] to-[#be185d]','from-[#f59e0b] to-[#b45309]','from-[#06b6d4] to-[#0891b2]'];
    let s = 0; for (let i = 0; i < name.length; i++) s += name.charCodeAt(i);
    return g[s % g.length];
  };

  const handleCopyAmount = (amount, toName) => {
    navigator.clipboard.writeText(amount.toString());
    alert(`₩${formatKRW(amount)}원이 복사되었습니다! ${toName}님에게 송금해주세요.`);
  };

  const mobileActiveTeams = useMemo(() => {
    try {
      const teams = JSON.parse(localStorage.getItem('tripsync_teams') || '[]');
      const storedMembers = JSON.parse(localStorage.getItem('tripsync_members') || '[]');
      const activeMember = storedMembers.find(m => typeof m === 'object' && m.name === nickname);
      const ids = activeMember?.teamIds || [];
      return teams.filter(t => ids.includes(t.id));
    } catch { return []; }
  }, [nickname]);

  // ── Member details modal ───────────────────────────────────────────────────
  const selectedMemberDetails = useMemo(() => {
    if (!selectedMember) return null;
    const paidList = expenses.filter(e => e.paidBy === selectedMember).map(e => {
      const r = e.rateSnapshot || currentRates;
      return { ...e, krw: r ? convertToKRW(e.amount, e.currency, r) : 0 };
    });
    const sharedList = expenses.filter(e => (e.splitWith || members).includes(selectedMember)).map(e => {
      const r = e.rateSnapshot || currentRates;
      const krw = r ? convertToKRW(e.amount, e.currency, r) : 0;
      const targets = e.splitWith || members;
      const count = targets.length;
      return { ...e, krw, count, shareKrw: count > 0 ? krw/count : 0 };
    });
    const stats = settlements.memberStats[selectedMember] || { paid: 0, actual: 0 };
    const bal = settlements.balances[selectedMember] || 0;
    return { paidList, sharedList, stats, bal };
  }, [selectedMember, expenses, members, currentRates, settlements]);

  // ── Date selector bar (shared) ─────────────────────────────────────────────
  const DateBar = ({ mobile }) => (
    <div className={mobile
      ? "relative z-10 mt-5 flex gap-2 overflow-x-auto scrollbar-hide pb-2"
      : "mx-4 sm:mx-5 mb-6 overflow-x-auto scrollbar-hide flex gap-2 border-b border-toss-border pb-3"}>
      {dateOptions.map(opt => (
        <button key={opt.key} onClick={() => setSelectedDateKey(opt.key)}
          className={`px-4 py-2 text-[12.5px] font-bold rounded-full transition-all shrink-0 ${
            mobile
              ? selectedDateKey === opt.key ? 'bg-white text-[#2563eb] shadow-md' : 'bg-white/15 text-white/90 border border-white/20 backdrop-blur-sm'
              : selectedDateKey === opt.key ? 'bg-toss-blue text-white shadow-sm' : 'bg-white border border-toss-border text-toss-text-secondary hover:bg-toss-bg'
          }`}>
          {opt.label}
        </button>
      ))}
    </div>
  );

  // ── Pending Transfer Card ─────────────────────────────────────────────────
  const PendingCard = ({ t, desktop }) => (
    <div className={desktop
      ? "toss-card border bg-toss-blue-light/30 border-toss-blue/10 transition-all"
      : "bg-white rounded-3xl p-4 shadow-sm border border-slate-100"}>
      {/* Row 1: From avatar + name → To avatar + name */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${getGradient(t.from)} flex items-center justify-center font-bold text-white text-[11px] shrink-0`}>
          {t.from.charAt(0)}
        </div>
        <span className="text-[13px] font-bold text-toss-text-primary truncate">{t.from}</span>
        <ArrowRight className="w-3.5 h-3.5 text-toss-blue shrink-0" />
        <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${getGradient(t.to)} flex items-center justify-center font-bold text-white text-[11px] shrink-0`}>
          {t.to.charAt(0)}
        </div>
        <span className="text-[13px] font-bold text-toss-text-primary truncate">{t.to}</span>
      </div>
      {/* Row 2: Amount + Copy button (no 완료 처리 — handled above) */}
      <div className="flex items-center justify-between pl-9">
        <div>
          <p className="text-[17px] font-black tabular-nums text-toss-blue">₩{formatKRW(t.amount)}</p>
          <p className="text-[10px] text-toss-blue/60 mt-0.5">송금 대기</p>
        </div>
        <button onClick={() => handleCopyAmount(t.amount, t.to)}
          className="px-3 py-1.5 text-[11px] font-bold rounded-xl bg-white border border-toss-border text-toss-text-secondary hover:bg-toss-bg transition-colors shrink-0">
          금액 복사
        </button>
      </div>
    </div>
  );

  // ── Completed Transfer Card ────────────────────────────────────────────────
  const CompletedCard = ({ ct, desktop }) => (
    <div className={desktop
      ? "toss-card border bg-emerald-50/30 border-toss-success/20 opacity-80"
      : "bg-emerald-50/40 rounded-3xl p-4 shadow-sm border border-emerald-200/50 opacity-85"}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${getGradient(ct.from)} flex items-center justify-center font-bold text-white text-[11px] shrink-0 opacity-60`}>
            {ct.from.charAt(0)}
          </div>
          <span className="text-[12px] font-bold text-toss-text-tertiary shrink-0 max-w-[52px] truncate line-through">{ct.from}</span>
          <ArrowRight className="w-3.5 h-3.5 text-toss-success shrink-0" />
          <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${getGradient(ct.to)} flex items-center justify-center font-bold text-white text-[11px] shrink-0 opacity-60`}>
            {ct.to.charAt(0)}
          </div>
          <span className="text-[12px] font-bold text-toss-text-tertiary shrink-0 max-w-[52px] truncate line-through">{ct.to}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className="text-[14px] font-black tabular-nums text-toss-success line-through">₩{formatKRW(ct.amount)}</p>
            <p className="text-[10px] text-toss-success font-semibold">
              {new Date(ct.completedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 완료
            </p>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => undoComplete(ct.id)}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg shrink-0 bg-toss-success text-white hover:bg-green-600 transition-colors">
            취소
          </motion.button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ================================================================ */}
      {/* 🖥️ Desktop Viewport                                              */}
      {/* ================================================================ */}
      <div className="hidden md:block pb-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-4 sm:px-5 pt-2 pb-4">
          <h1 className="text-[24px] sm:text-[26px] md:text-[28px] font-bold text-toss-text-primary tracking-tight">정산</h1>
          <p className="text-[13px] sm:text-[14px] text-toss-text-secondary mt-1">공정하게 나누어 정산해요 🤝</p>
        </motion.div>

        {/* Date Selector */}
        <DateBar mobile={false} />

        {/* My Settlement Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="mx-4 sm:mx-5 mb-6 bg-white rounded-3xl border border-toss-border p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-toss-bg">
            <span className="text-[15px] font-extrabold text-toss-text-primary">🙋‍♂️ 나의 정산 현황 ({nickname || '나'})</span>
            <span className="text-[11px] text-toss-blue bg-toss-blue-light px-2 py-0.5 rounded-full font-bold">실시간 계산</span>
          </div>

          {/* Pay direction */}
          {(pendingToPay > 0 || completedAmountToPay > 0) && (
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-3 text-toss-danger">
                <ArrowUpRight className="w-5 h-5 shrink-0" />
                <div>
                  <p className="text-[13px] font-semibold">보내야 할 금액</p>
                  <p className="text-[20px] font-extrabold tabular-nums">
                    ₩{formatKRW(pendingToPay)}
                    {pendingToPay === 0 && completedAmountToPay > 0 && (
                      <span className="text-[12px] text-toss-success bg-green-50 px-2 py-0.5 rounded-full font-bold ml-2 inline-block align-middle">송금 완료! 🎉</span>
                    )}
                  </p>
                </div>
              </div>
              {completedAmountToPay > 0 && (
                <p className="text-[12px] text-toss-text-secondary pl-8">이미 완료된 금액: <strong className="text-toss-success">₩{formatKRW(completedAmountToPay)}</strong></p>
              )}
              <div className="bg-toss-bg/50 p-3 rounded-2xl space-y-2">
                <p className="text-[11px] font-extrabold text-toss-text-secondary">송금 대기</p>
                {myPendingToPay.map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[13px] p-1.5 rounded-xl">
                    <span className="text-toss-text-secondary"><strong className="text-toss-text-primary">{t.to}</strong>님에게</span>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold tabular-nums">₩{formatKRW(t.amount)}</span>
                      <button onClick={() => handleCopyAmount(t.amount, t.to)} className="px-2 py-1 bg-white border border-toss-border text-[10px] font-bold rounded-lg">복사</button>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => markComplete(t.from, t.to, t.amount)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-toss-blue text-white">완료 처리</motion.button>
                    </div>
                  </div>
                ))}
                {myPendingToPay.length === 0 && <p className="text-[11px] text-toss-text-tertiary text-center py-2">대기 중인 송금이 없어요 ✅</p>}
              </div>
              {myCompletedToPay.length > 0 && (
                <div className="bg-emerald-50/50 p-3 rounded-2xl space-y-2">
                  <p className="text-[11px] font-extrabold text-toss-success">완료된 송금</p>
                  {myCompletedToPay.map((ct) => (
                    <div key={ct.id} className="flex items-center justify-between text-[12px] p-1.5 rounded-xl opacity-75">
                      <span className="text-toss-text-secondary line-through"><strong>{ct.to}</strong>님에게</span>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold line-through text-toss-text-tertiary">₩{formatKRW(ct.amount)}</span>
                        <button onClick={() => undoComplete(ct.id)} className="px-2 py-1 bg-toss-success text-white text-[10px] font-bold rounded-lg">취소</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Receive direction */}
          {(pendingToReceive > 0 || completedAmountToReceive > 0) && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-toss-success">
                <ArrowDownLeft className="w-5 h-5 shrink-0" />
                <div>
                  <p className="text-[13px] font-semibold">받아야 할 금액</p>
                  <p className="text-[20px] font-extrabold tabular-nums">
                    ₩{formatKRW(pendingToReceive)}
                    {pendingToReceive === 0 && completedAmountToReceive > 0 && (
                      <span className="text-[12px] text-toss-success bg-green-50 px-2 py-0.5 rounded-full font-bold ml-2 inline-block align-middle">수령 완료! 🎉</span>
                    )}
                  </p>
                </div>
              </div>
              {completedAmountToReceive > 0 && (
                <p className="text-[12px] text-toss-text-secondary pl-8">이미 받은 금액: <strong className="text-toss-success">₩{formatKRW(completedAmountToReceive)}</strong></p>
              )}
              <div className="bg-toss-bg/50 p-3 rounded-2xl space-y-2">
                <p className="text-[11px] font-extrabold text-toss-text-secondary">입금 대기</p>
                {myPendingToReceive.map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[13px] p-1.5 rounded-xl">
                    <span className="text-toss-text-secondary"><strong className="text-toss-text-primary">{t.from}</strong>님으로부터</span>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold tabular-nums text-toss-success">₩{formatKRW(t.amount)}</span>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => markComplete(t.from, t.to, t.amount)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-toss-success text-white">받음 처리</motion.button>
                    </div>
                  </div>
                ))}
                {myPendingToReceive.length === 0 && <p className="text-[11px] text-toss-text-tertiary text-center py-2">대기 중인 입금이 없어요 ✅</p>}
              </div>
            </div>
          )}

          {pendingToPay === 0 && pendingToReceive === 0 && completedAmountToPay === 0 && completedAmountToReceive === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
                <CheckCircle className="w-6 h-6 text-toss-success" />
              </div>
              <p className="text-[15px] font-bold text-toss-text-primary">보낼 돈도, 받을 돈도 없어요!</p>
              <p className="text-[12px] text-toss-text-secondary mt-1">모든 차액이 깔끔하게 상쇄되었습니다 ☺️</p>
            </div>
          )}
        </motion.div>

        {/* Summary */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mx-4 sm:mx-5 mb-6 toss-card">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-toss-blue" />
            <span className="text-[15px] font-bold text-toss-text-primary">팀 지출 요약</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-toss-bg p-4 rounded-2xl">
              <span className="text-[12px] text-toss-text-secondary">총 지출 금액</span>
              <p className="text-[18px] sm:text-[20px] font-extrabold text-toss-text-primary mt-1 tabular-nums">₩{formatKRW(totalKRW)}</p>
            </div>
            <div className="bg-toss-bg p-4 rounded-2xl">
              <span className="text-[12px] text-toss-text-secondary">1인당 평균 지출</span>
              <p className="text-[18px] sm:text-[20px] font-extrabold text-toss-blue mt-1 tabular-nums">₩{formatKRW(averageKRW)}</p>
            </div>
          </div>
        </motion.div>

        {/* Member Stats + Full Flow */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4 sm:px-5">
          {/* Member Stats */}
          <div className="space-y-3">
            <h3 className="text-[15px] sm:text-[16px] font-bold text-toss-text-primary flex items-center gap-2">
              <Users className="w-4 h-4 text-toss-blue" /> 팀원별 현황
            </h3>
            <div className="space-y-2.5">
              {members.map((m, i) => {
                const stats = settlements.memberStats[m] || { paid: 0, actual: 0 };
                const bal = settlements.balances[m] || 0;
                const isPositive = bal >= 0;
                return (
                  <motion.div key={m} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.012 }} whileTap={{ scale: 0.988 }}
                    onClick={() => setSelectedMember(m)}
                    className="toss-card border border-toss-border/40 cursor-pointer hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-toss-blue-light rounded-full flex items-center justify-center font-bold text-toss-blue text-[13px]">{m.charAt(0)}</div>
                        <div>
                          <p className="text-[14px] font-bold text-toss-text-primary flex items-center gap-1">
                            {m} {m === nickname && <span className="text-[9px] text-toss-blue bg-toss-blue-light px-1 rounded-full font-bold">나</span>}
                          </p>
                          <p className="text-[11px] text-toss-text-secondary">결제 ₩{formatKRW(stats.paid)} · 소비 ₩{formatKRW(stats.actual)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-[14px] font-bold tabular-nums ${isPositive ? 'text-toss-success' : 'text-toss-danger'}`}>
                          {isPositive ? '+' : ''}₩{formatKRW(bal)}
                        </p>
                        <p className="text-[10px] text-toss-text-tertiary">{isPositive ? '돌려받기' : '보내기'}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Full Settlement Flow */}
          <div className="space-y-4">
            <h3 className="text-[15px] sm:text-[16px] font-bold text-toss-text-primary flex items-center gap-2">
              <Receipt className="w-4 h-4 text-toss-blue" /> 전체 정산 흐름
            </h3>

            {/* Pending */}
            <div className="space-y-2.5">
              <p className="text-[12px] font-extrabold text-toss-text-secondary">정산 대기 ({settlements.transfers.length}건)</p>
              {settlements.transfers.map((t, i) => (
                <motion.div key={`p-${i}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <PendingCard t={t} desktop={true} />
                </motion.div>
              ))}
              {settlements.transfers.length === 0 && (
                <div className="flex flex-col items-center py-6 bg-white rounded-2xl border border-toss-border/60">
                  <p className="text-[12px] text-toss-text-secondary">대기 중인 정산이 없습니다 🙌</p>
                </div>
              )}
            </div>

            {/* Completed */}
            <div className="space-y-2.5 pt-2">
              <p className="text-[12px] font-extrabold text-toss-text-secondary">정산 완료 ({filteredCompleted.length}건)</p>
              {filteredCompleted.map((ct, i) => (
                <motion.div key={ct.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <CompletedCard ct={ct} desktop={true} />
                </motion.div>
              ))}
              {filteredCompleted.length === 0 && (
                <div className="flex flex-col items-center py-6 bg-white rounded-2xl border border-toss-border/60">
                  <p className="text-[12px] text-toss-text-secondary">완료된 정산이 없습니다</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 📱 Mobile Viewport                                               */}
      {/* ================================================================ */}
      <div className="block md:hidden bg-[#f4f6fa] min-h-screen pb-20 text-toss-text-primary">
        {/* Blue header */}
        <div className="bg-gradient-to-br from-[#1b64da] via-[#2563eb] to-[#1d4ed8] text-white rounded-b-[2.5rem] px-6 pt-8 pb-14 shadow-lg relative overflow-hidden">
          <div className="absolute -right-6 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="absolute -left-10 -top-10 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col gap-1.5">
            <span className="text-[12px] font-extrabold text-blue-200/90 tracking-wider uppercase">Settlement Center</span>
            <h1 className="text-[26px] font-black tracking-tight leading-tight">
              {mobileActiveTeams.length > 0 ? mobileActiveTeams.map(t => t.name).join(' · ') : '전체 팀 정산'}
            </h1>
            <p className="text-[13px] text-blue-100/80 font-medium">완료된 정산은 자동 제외 후 잔액만 계산합니다.</p>
          </div>
          <DateBar mobile={true} />
        </div>

        {/* My Settlement Card */}
        <div className="relative z-20 mt-[-2rem] mx-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl p-5 shadow-md border border-slate-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-extrabold text-slate-800">🙋‍♂️ 나의 정산 요약</span>
                <span className="text-[12px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">{nickname || '나'}</span>
              </div>
              <span className="text-[11px] text-[#2563eb] bg-blue-50 px-2 py-0.5 rounded-full font-bold">자동 계산</span>
            </div>

            {/* Send section */}
            {(pendingToPay > 0 || completedAmountToPay > 0) && (
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3 bg-red-50/70 p-4 rounded-2xl border border-red-100/30">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 ${pendingToPay === 0 ? 'bg-emerald-500' : 'bg-red-500'}`}>
                    {pendingToPay === 0 ? <Smile className="w-5 h-5 stroke-[3]" /> : <ArrowUpRight className="w-5 h-5 stroke-[3]" />}
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-slate-500">남은 송금액</p>
                    <p className="text-[20px] font-black text-slate-800 tabular-nums">
                      ₩{formatKRW(pendingToPay)}
                      {pendingToPay === 0 && <span className="text-[11px] text-emerald-600 font-extrabold bg-emerald-100 px-2 py-0.5 rounded-lg ml-2 inline-block align-middle">완료! 🎉</span>}
                    </p>
                    {completedAmountToPay > 0 && (
                      <p className="text-[11px] text-slate-400 mt-0.5">완료된 금액: <strong className="text-emerald-600">₩{formatKRW(completedAmountToPay)}</strong></p>
                    )}
                  </div>
                </div>
                {/* Pending list */}
                {myPendingToPay.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-extrabold text-slate-400 px-1">송금 대기 목록</p>
                    {myPendingToPay.map((t, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${getGradient(t.to)} flex items-center justify-center font-bold text-white text-[11px]`}>{t.to.charAt(0)}</div>
                          <span className="text-[13px] font-bold text-slate-700"><strong className="text-[#2563eb]">{t.to}</strong> 님에게</span>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-[15px] font-black tabular-nums">₩{formatKRW(t.amount)}</span>
                          <div className="flex gap-1.5">
                            <button onClick={() => handleCopyAmount(t.amount, t.to)} className="px-2 py-1 bg-white border text-[10px] font-bold rounded-lg text-slate-500">복사</button>
                            <motion.button whileTap={{ scale: 0.95 }} onClick={() => markComplete(t.from, t.to, t.amount)}
                              className="px-2.5 py-1 text-[11px] font-extrabold rounded-xl bg-[#2563eb] text-white">완료 처리</motion.button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Completed list */}
                {myCompletedToPay.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-extrabold text-emerald-600 px-1">완료된 송금</p>
                    {myCompletedToPay.map((ct) => (
                      <div key={ct.id} className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-2xl flex items-center justify-between opacity-80">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${getGradient(ct.to)} flex items-center justify-center font-bold text-white text-[11px] opacity-60`}>{ct.to.charAt(0)}</div>
                          <div>
                            <span className="text-[12px] font-bold text-slate-500 line-through">{ct.to} 님에게</span>
                            <p className="text-[10px] text-emerald-500">{new Date(ct.completedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[13px] font-extrabold text-emerald-600 line-through tabular-nums">₩{formatKRW(ct.amount)}</span>
                          <button onClick={() => undoComplete(ct.id)} className="px-2 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-lg">취소</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Receive section */}
            {(pendingToReceive > 0 || completedAmountToReceive > 0) && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-emerald-50 p-4 rounded-2xl border border-emerald-100/30">
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white shrink-0">
                    {pendingToReceive === 0 ? <Smile className="w-5 h-5 stroke-[3]" /> : <ArrowDownLeft className="w-5 h-5 stroke-[3]" />}
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-emerald-600">남은 미수금</p>
                    <p className="text-[20px] font-black text-slate-800 tabular-nums">
                      ₩{formatKRW(pendingToReceive)}
                      {pendingToReceive === 0 && <span className="text-[11px] text-emerald-600 font-extrabold bg-emerald-100 px-2 py-0.5 rounded-lg ml-2 inline-block align-middle">완료! 🎉</span>}
                    </p>
                    {completedAmountToReceive > 0 && (
                      <p className="text-[11px] text-slate-400 mt-0.5">받은 금액: <strong className="text-emerald-600">₩{formatKRW(completedAmountToReceive)}</strong></p>
                    )}
                  </div>
                </div>
                {myPendingToReceive.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-extrabold text-slate-400 px-1">입금 대기 목록</p>
                    {myPendingToReceive.map((t, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${getGradient(t.from)} flex items-center justify-center font-bold text-white text-[11px]`}>{t.from.charAt(0)}</div>
                          <span className="text-[13px] font-bold text-slate-700"><strong className="text-emerald-600">{t.from}</strong> 님이</span>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-[15px] font-black text-emerald-600 tabular-nums">₩{formatKRW(t.amount)}</span>
                          <motion.button whileTap={{ scale: 0.95 }} onClick={() => markComplete(t.from, t.to, t.amount)}
                            className="px-3 py-1 text-[11px] font-extrabold rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">받음 처리</motion.button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {pendingToPay === 0 && pendingToReceive === 0 && completedAmountToPay === 0 && completedAmountToReceive === 0 && (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                  <Smile className="w-8 h-8 text-emerald-500 stroke-[2.5]" />
                </div>
                <p className="text-[16px] font-extrabold text-slate-800">모든 정산이 완료되었어요!</p>
                <p className="text-[12px] text-slate-400 mt-1.5">보낼 돈도, 받을 돈도 없는 깨끗한 상태입니다 😊</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Summary */}
        <div className="mx-4 mt-4 bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-[#2563eb]" />
            <span className="text-[15px] font-extrabold text-slate-800">전체 지출 요약</span>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-slate-50 p-4 rounded-2xl flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400">총 지출 금액</span>
              <span className="text-[18px] font-extrabold text-slate-800 tabular-nums">₩{formatKRW(totalKRW)}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400">1인당 평균 지출</span>
              <span className="text-[18px] font-extrabold text-[#2563eb] tabular-nums">₩{formatKRW(averageKRW)}</span>
            </div>
          </div>
        </div>

        {/* Member Stats */}
        <div className="mx-4 mt-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[15px] font-extrabold text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#2563eb]" /> 팀원별 현황
            </h3>
            <span className="text-[11px] text-slate-400 font-bold">총 {members.length}명</span>
          </div>
          <div className="space-y-3">
            {members.map((m, i) => {
              const stats = settlements.memberStats[m] || { paid: 0, actual: 0 };
              const bal = settlements.balances[m] || 0;
              const isPositive = bal >= 0;
              return (
                <motion.div key={m} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  whileTap={{ scale: 0.97 }} onClick={() => setSelectedMember(m)}
                  className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer active:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${getGradient(m)} flex items-center justify-center font-bold text-white text-[14px]`}>{m.charAt(0)}</div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-[14px] font-bold text-slate-800">{m}</span>
                        {m === nickname && <span className="text-[9px] text-[#2563eb] bg-blue-50 px-1.5 py-0.5 rounded-full font-bold ml-1">나</span>}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">결제 ₩{formatKRW(stats.paid)} · 소비 ₩{formatKRW(stats.actual)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-[15px] font-extrabold tabular-nums ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                      {isPositive ? '+' : ''}₩{formatKRW(bal)}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{isPositive ? '돌려받기' : '보내기'}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Full Settlement Flow */}
        <div className="mx-4 mt-6 mb-10 space-y-4">
          <h3 className="text-[15px] font-extrabold text-slate-800 flex items-center gap-2 px-1">
            <Receipt className="w-4 h-4 text-[#2563eb]" /> 전체 정산 흐름
          </h3>

          {/* Pending */}
          <div className="space-y-3">
            <p className="text-[12px] font-extrabold text-slate-400 px-1">정산 대기 ({settlements.transfers.length}건)</p>
            {settlements.transfers.map((t, i) => (
              <motion.div key={`p-${i}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <PendingCard t={t} desktop={false} />
              </motion.div>
            ))}
            {settlements.transfers.length === 0 && (
              <div className="flex flex-col items-center py-6 bg-white rounded-3xl border border-slate-100 text-center shadow-sm">
                <p className="text-[12px] text-slate-400">대기 중인 정산 내역이 없습니다 🙌</p>
              </div>
            )}
          </div>

          {/* Completed */}
          <div className="space-y-3">
            <p className="text-[12px] font-extrabold text-slate-400 px-1">정산 완료 ({filteredCompleted.length}건)</p>
            {filteredCompleted.map((ct, i) => (
              <motion.div key={ct.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <CompletedCard ct={ct} desktop={false} />
              </motion.div>
            ))}
            {filteredCompleted.length === 0 && (
              <div className="flex flex-col items-center py-6 bg-white rounded-3xl border border-slate-100 text-center shadow-sm">
                <p className="text-[12px] text-slate-400">완료된 정산 내역이 없습니다</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* Member Details Modal                                             */}
      {/* ================================================================ */}
      <AnimatePresence>
        {selectedMember && selectedMemberDetails && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setSelectedMember(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 overflow-hidden max-h-[85vh] flex flex-col border border-slate-100"
              onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${getGradient(selectedMember)} flex items-center justify-center font-bold text-white text-[13px]`}>
                    {selectedMember.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-[17px] font-black text-slate-800">{selectedMember}님의 정산 증빙</h2>
                    <p className="text-[11.5px] text-slate-400 font-bold mt-0.5">금액 계산 산출 근거</p>
                  </div>
                </div>
                <button onClick={() => setSelectedMember(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* Overview */}
              <div className="my-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="flex flex-col gap-0.5 border-r border-slate-200/60">
                    <span className="text-[11px] font-bold text-slate-400">총 결제한 돈</span>
                    <span className="text-[14px] font-extrabold text-slate-800 tabular-nums">₩{formatKRW(selectedMemberDetails.stats.paid)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 border-r border-slate-200/60">
                    <span className="text-[11px] font-bold text-slate-400">총 소비한 돈</span>
                    <span className="text-[14px] font-extrabold text-[#2563eb] tabular-nums">₩{formatKRW(selectedMemberDetails.stats.actual)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-bold text-slate-400">최종 결과</span>
                    <span className={`text-[14px] font-black tabular-nums ${selectedMemberDetails.bal >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {selectedMemberDetails.bal >= 0 ? '+' : ''}₩{formatKRW(selectedMemberDetails.bal)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-5 pr-1">
                {/* Paid by */}
                <div className="space-y-2.5">
                  <h3 className="text-[13px] font-extrabold text-slate-700 flex items-center gap-1.5">
                    <span className="text-emerald-600">💵</span> {selectedMember}님이 결제한 내역 ({selectedMemberDetails.paidList.length}건)
                  </h3>
                  {selectedMemberDetails.paidList.map((e, idx) => (
                    <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-extrabold text-slate-800 break-all flex-1 mr-2">{e.description}</span>
                        <span className="text-[14px] font-extrabold tabular-nums shrink-0">₩{formatKRW(e.krw)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold mt-1">
                        <span>{new Date(e.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                        <span>지출 대상: {e.splitWith?.length > 0 ? `${e.splitWith.length}명` : '전원'}</span>
                      </div>
                    </div>
                  ))}
                  {selectedMemberDetails.paidList.length === 0 && (
                    <p className="text-[12px] text-slate-400 italic text-center py-4 bg-slate-50 rounded-2xl">결제한 내역이 없습니다.</p>
                  )}
                </div>

                {/* Shared */}
                <div className="space-y-2.5 pb-2">
                  <h3 className="text-[13px] font-extrabold text-slate-700 flex items-center gap-1.5">
                    <span className="text-[#2563eb]">🍽️</span> 함께 참여한 소비 내역 ({selectedMemberDetails.sharedList.length}건)
                  </h3>
                  {selectedMemberDetails.sharedList.map((e, idx) => (
                    <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-extrabold text-slate-800 break-all flex-1 mr-2">{e.description}</span>
                        <div className="text-right shrink-0">
                          <span className="text-[14px] font-extrabold text-[#2563eb] tabular-nums">₩{formatKRW(e.shareKrw)}</span>
                          <p className="text-[10px] text-slate-400 font-bold">본인 몫 (1/{e.count})</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold mt-1">
                        <span>{new Date(e.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} · 결제자: {e.paidBy}</span>
                        <span>총액: ₩{formatKRW(e.krw)}</span>
                      </div>
                    </div>
                  ))}
                  {selectedMemberDetails.sharedList.length === 0 && (
                    <p className="text-[12px] text-slate-400 italic text-center py-4 bg-slate-50 rounded-2xl">참여한 소비 내역이 없습니다.</p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button onClick={() => setSelectedMember(null)}
                  className="w-full py-3 bg-slate-100 text-slate-700 font-extrabold rounded-2xl text-[14px] hover:bg-slate-200 transition-colors">
                  확인
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
