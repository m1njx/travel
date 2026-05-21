import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ArrowRight, BarChart3, Receipt, CheckCircle, ArrowUpRight, ArrowDownLeft, Smile, X } from 'lucide-react';
import { convertToKRW, formatKRW } from '../utils/exchangeRate';
import { fetchExchangeRates } from '../utils/exchangeRate';

export default function SettlePage({ members, expenses = [], nickname }) {
  const [currentRates, setCurrentRates] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    fetchExchangeRates().then(r => setCurrentRates(r.rates));
  }, []);

  // Calculate settlements — uses each expense's own recorded rate
  const settlements = useMemo(() => {
    if (members.length === 0) return { balances: {}, transfers: [], memberStats: {} };

    const balances = {};
    const memberStats = {};
    
    // Initialize
    members.forEach(m => {
      balances[m] = 0;
      memberStats[m] = { paid: 0, actual: 0 };
    });

    expenses.forEach(e => {
      const expRate = e.rateSnapshot || currentRates;
      const krw = expRate ? convertToKRW(e.amount, e.currency, expRate) : 0;
      
      // Add to paid amount
      if (balances[e.paidBy] !== undefined) {
        balances[e.paidBy] += krw;
        memberStats[e.paidBy].paid += krw;
      }

      // Distribute to split targets
      const splitTargets = e.splitWith || members;
      const count = splitTargets.length;
      if (count > 0) {
        const perPerson = krw / count;
        splitTargets.forEach(target => {
          if (balances[target] !== undefined) {
            balances[target] -= perPerson;
            memberStats[target].actual += perPerson;
          }
        });
      }
    });

    // Calculate transfers (minimizing transfer count using greedy algorithm)
    const activeBalances = { ...balances };
    const transfers = [];
    const threshold = 1; // 1 KRW tolerance

    while (true) {
      let maxDebtor = null; // owes money (negative balance)
      let maxCreditor = null; // gets money (positive balance)
      
      members.forEach(m => {
        const bal = activeBalances[m];
        if (bal < -threshold) {
          if (!maxDebtor || bal < activeBalances[maxDebtor]) {
            maxDebtor = m;
          }
        } else if (bal > threshold) {
          if (!maxCreditor || bal > activeBalances[maxCreditor]) {
            maxCreditor = m;
          }
        }
      });

      if (!maxDebtor || !maxCreditor) break;

      const debtorAmt = -activeBalances[maxDebtor];
      const creditorAmt = activeBalances[maxCreditor];
      const transferAmt = Math.min(debtorAmt, creditorAmt);

      transfers.push({
        from: maxDebtor,
        to: maxCreditor,
        amount: Math.round(transferAmt)
      });

      activeBalances[maxDebtor] += transferAmt;
      activeBalances[maxCreditor] -= transferAmt;
    }

    return { balances, transfers, memberStats };
  }, [members, expenses, currentRates]);

  // Extract transfers relevant to the logged-in user
  const myTransfers = useMemo(() => {
    const toPay = settlements.transfers.filter(t => t.from === nickname);
    const toReceive = settlements.transfers.filter(t => t.to === nickname);
    return { toPay, toReceive };
  }, [settlements.transfers, nickname]);

  const totalKRW = expenses.reduce((a, e) => {
    const r = e.rateSnapshot || currentRates;
    return a + (r ? convertToKRW(e.amount, e.currency, r) : 0);
  }, 0);

  const averageKRW = members.length > 0 ? Math.round(totalKRW / members.length) : 0;

  const totalToPay = myTransfers.toPay.reduce((sum, t) => sum + t.amount, 0);
  const totalToReceive = myTransfers.toReceive.reduce((sum, t) => sum + t.amount, 0);

  // Custom gradients for member avatars on mobile
  const getGradientForName = (name) => {
    const gradients = [
      'from-[#3b82f6] to-[#1d4ed8]', // Blue
      'from-[#10b981] to-[#047857]', // Emerald
      'from-[#8b5cf6] to-[#6d28d9]', // Violet
      'from-[#ec4899] to-[#be185d]', // Pink
      'from-[#f59e0b] to-[#b45309]', // Amber
      'from-[#06b6d4] to-[#0891b2]', // Cyan
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }
    return gradients[sum % gradients.length];
  };

  const handleCopyAmount = (amount, toName) => {
    navigator.clipboard.writeText(amount.toString());
    alert(`₩${formatKRW(amount)}원이 복사되었습니다! ${toName}님에게 송금해주세요.`);
  };

  // Mobile-specific team resolving logic from localStorage
  const mobileActiveTeams = useMemo(() => {
    try {
      const teams = JSON.parse(localStorage.getItem('tripsync_teams') || '[]');
      const storedMembers = JSON.parse(localStorage.getItem('tripsync_members') || '[]');
      const activeMember = storedMembers.find(m => typeof m === 'object' && m.name === nickname);
      const activeMemberTeamIds = activeMember?.teamIds || [];
      return teams.filter(t => activeMemberTeamIds.includes(t.id));
    } catch (e) {
      return [];
    }
  }, [nickname]);

  // Compute breakdown details for the selected team member
  const selectedMemberDetails = useMemo(() => {
    if (!selectedMember) return null;
    
    // Find all expenses paid by this member
    const paidList = expenses.filter(e => e.paidBy === selectedMember).map(e => {
      const expRate = e.rateSnapshot || currentRates;
      const krw = expRate ? convertToKRW(e.amount, e.currency, expRate) : 0;
      return { ...e, krw };
    });

    // Find all expenses split with this member
    const sharedList = expenses.filter(e => {
      const targets = e.splitWith || members;
      return targets.includes(selectedMember);
    }).map(e => {
      const expRate = e.rateSnapshot || currentRates;
      const krw = expRate ? convertToKRW(e.amount, e.currency, expRate) : 0;
      const targets = e.splitWith || members;
      const count = targets.length;
      const shareKrw = count > 0 ? krw / count : 0;
      const shareAmount = count > 0 ? e.amount / count : 0;
      return { ...e, krw, count, shareKrw, shareAmount };
    });

    const stats = settlements.memberStats[selectedMember] || { paid: 0, actual: 0 };
    const bal = settlements.balances[selectedMember] || 0;

    return { paidList, sharedList, stats, bal };
  }, [selectedMember, expenses, members, currentRates, settlements]);

  return (
    <>
      {/* 🖥️ Desktop Viewport (100% Unchanged) */}
      <div className="hidden md:block pb-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-4 sm:px-5 pt-2 pb-4">
          <h1 className="text-[24px] sm:text-[26px] md:text-[28px] font-bold text-toss-text-primary tracking-tight">정산</h1>
          <p className="text-[13px] sm:text-[14px] text-toss-text-secondary mt-1">공정하게 나누어 정산해요 🤝</p>
        </motion.div>

        {/* 🙋‍♂️ My Personal Settlement Card (Toss Style) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mx-4 sm:mx-5 mb-6 bg-white rounded-3xl border border-toss-border p-5 sm:p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-toss-bg">
            <span className="text-[15px] font-extrabold text-toss-text-primary">🙋‍♂️ 나의 정산 현황 ({nickname || '나'})</span>
            <span className="text-[11px] text-toss-blue bg-toss-blue-light px-2 py-0.5 rounded-full font-bold">실시간 계산</span>
          </div>

          {totalToPay > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-toss-danger">
                <ArrowUpRight className="w-6 h-6 shrink-0" />
                <div>
                  <p className="text-[14px] font-semibold">보내야 할 총 금액</p>
                  <p className="text-[22px] sm:text-[24px] font-extrabold tabular-nums">₩{formatKRW(totalToPay)}</p>
                </div>
              </div>
              
              <div className="bg-toss-bg/50 p-4 rounded-2xl space-y-3">
                {myTransfers.toPay.map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[13px] sm:text-[14px]">
                    <span className="text-toss-text-secondary">
                      <strong className="text-toss-text-primary font-bold">{t.to}</strong>님에게
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-toss-text-primary tabular-nums">₩{formatKRW(t.amount)}</span>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => alert(`₩${formatKRW(t.amount)}원 복사 완료! 팀원의 계좌로 이체해 주세요.`)}
                        className="px-2.5 py-1 bg-white border border-toss-border text-[11px] font-bold rounded-lg hover:bg-toss-bg"
                      >
                        금액 복사
                      </motion.button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : totalToReceive > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-toss-success">
                <ArrowDownLeft className="w-6 h-6 shrink-0" />
                <div>
                  <p className="text-[14px] font-semibold">받아야 할 총 금액</p>
                  <p className="text-[22px] sm:text-[24px] font-extrabold tabular-nums">₩{formatKRW(totalToReceive)}</p>
                </div>
              </div>
              
              <div className="bg-toss-bg/50 p-4 rounded-2xl space-y-3">
                {myTransfers.toReceive.map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[13px] sm:text-[14px]">
                    <span className="text-toss-text-secondary">
                      <strong className="text-toss-text-primary font-bold">{t.from}</strong>님으로부터
                    </span>
                    <span className="font-extrabold text-toss-success tabular-nums">₩{formatKRW(t.amount)} 받기</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
                <CheckCircle className="w-6 h-6 text-toss-success" />
              </div>
              <p className="text-[15px] font-bold text-toss-text-primary">보낼 돈도, 받을 돈도 없어요!</p>
              <p className="text-[12px] text-toss-text-secondary mt-1">모든 차액 계산이 깔끔하게 상쇄되었습니다. ☺️</p>
            </div>
          )}
        </motion.div>

        {/* Summary Card */}
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

        {/* Grid container for split layout on Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4 sm:px-5">
          {/* Member Stats */}
          <div className="space-y-3">
            <h3 className="text-[15px] sm:text-[16px] font-bold text-toss-text-primary flex items-center gap-2">
              <Users className="w-4 h-4 text-toss-blue" />
              팀원별 현황
            </h3>
            <div className="space-y-2.5">
              {members.map((m, i) => {
                const stats = settlements.memberStats[m] || { paid: 0, actual: 0 };
                const bal = (settlements.balances[m] || 0);
                const isPositive = bal >= 0;
                return (
                  <motion.div
                    key={m}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.012 }}
                    whileTap={{ scale: 0.988 }}
                    onClick={() => setSelectedMember(m)}
                    className="toss-card border border-toss-border/40 cursor-pointer hover:bg-slate-50 transition-colors duration-150"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-left">
                        <div className="w-8 h-8 bg-toss-blue-light rounded-full flex items-center justify-center font-bold text-toss-blue text-[13px]">{m.charAt(0)}</div>
                        <div>
                          <p className="text-[14px] font-bold text-toss-text-primary">
                            {m} {m === nickname && <span className="text-[9px] text-toss-blue bg-toss-blue-light px-1 rounded-full font-bold ml-1">나</span>}
                          </p>
                          <p className="text-[11px] text-toss-text-secondary">결제 ₩{formatKRW(stats.paid)} · 소비 ₩{formatKRW(stats.actual)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-[14px] font-bold tabular-nums ${isPositive ? 'text-toss-success' : 'text-toss-danger'}`}>
                          {isPositive ? '+' : ''}₩{formatKRW(bal)}
                        </p>
                        <p className="text-[10px] text-toss-text-tertiary">
                          {isPositive ? '돌려받기' : '보내기'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Settlement Transfers */}
          <div className="space-y-3">
            <h3 className="text-[15px] sm:text-[16px] font-bold text-toss-text-primary flex items-center gap-2">
              <Receipt className="w-4 h-4 text-toss-blue" />
              전체 정산 흐름
            </h3>
            <div className="space-y-2.5">
              {settlements.transfers.map((t, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="toss-card bg-toss-blue-light/30 border border-toss-blue/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3 text-left">
                      <span className="text-[13px] sm:text-[14px] font-bold text-toss-text-primary">{t.from}</span>
                      <ArrowRight className="w-4 h-4 text-toss-blue" />
                      <span className="text-[13px] sm:text-[14px] font-bold text-toss-text-primary">{t.to}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[15px] sm:text-[16px] font-extrabold text-toss-blue tabular-nums">₩{formatKRW(t.amount)}</p>
                      <p className="text-[10px] text-toss-blue/60">송금하기</p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {settlements.transfers.length === 0 && (
                <div className="flex flex-col items-center py-12 bg-white rounded-2xl border border-toss-border/60">
                  <div className="w-12 h-12 bg-toss-blue-light rounded-full flex items-center justify-center mb-3">
                    <Receipt className="w-6 h-6 text-toss-blue" />
                  </div>
                  <p className="text-[14px] font-semibold text-toss-text-primary mb-1">정산할 내역이 없어요</p>
                  <p className="text-[12px] text-toss-text-secondary">모든 지출이 공평하게 정산되었습니다</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 📱 Mobile Viewport (Toss-style Redesign) */}
      <div className="block md:hidden bg-[#f4f6fa] min-h-screen pb-20 text-toss-text-primary">
        {/* Header Block (Toss-style blue gradient) */}
        <div className="bg-gradient-to-br from-[#1b64da] via-[#2563eb] to-[#1d4ed8] text-white rounded-b-[2.5rem] px-6 pt-8 pb-14 shadow-lg relative overflow-hidden">
          <div className="absolute -right-6 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="absolute -left-10 -top-10 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col gap-1.5">
            <span className="text-[12px] font-extrabold text-blue-200/90 tracking-wider uppercase">Settlement Center</span>
            <h1 className="text-[26px] font-black tracking-tight leading-tight">
              {mobileActiveTeams.length > 0 ? mobileActiveTeams.map(t => t.name).join(' · ') : '전체 팀 정산'}
            </h1>
            <p className="text-[13px] text-blue-100/80 font-medium">모든 지출 내역을 정밀하게 상쇄 계산하였습니다.</p>
          </div>
        </div>

        {/* 🙋‍♂️ My Personal Settlement Card */}
        <div className="relative z-20 mt-[-2rem] mx-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl p-6 shadow-md border border-slate-100"
          >
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-extrabold text-slate-800">🙋‍♂️ 나의 정산 요약</span>
                <span className="text-[12px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                  {nickname || '나'}
                </span>
              </div>
              <span className="text-[11px] text-[#2563eb] bg-blue-50 px-2 py-0.5 rounded-full font-bold">자동 계산</span>
            </div>

            {totalToPay > 0 ? (
              <div className="space-y-5">
                <div className="flex items-center gap-4 bg-red-50 p-4 rounded-2xl">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm shadow-red-200">
                    <ArrowUpRight className="w-6 h-6 stroke-[3]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-red-500">내가 보내야 할 총 금액</p>
                    <p className="text-[24px] font-black text-red-600 tabular-nums">₩{formatKRW(totalToPay)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[12px] font-extrabold text-slate-400 uppercase tracking-wide px-1">송금 대상 목록</p>
                  <div className="space-y-2.5">
                    {myTransfers.toPay.map((t, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-100/60 p-4 rounded-2xl flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${getGradientForName(t.to)} flex items-center justify-center font-bold text-white text-[13px] shadow-sm`}>
                              {t.to.charAt(0)}
                            </div>
                            <span className="text-[14px] text-slate-700 font-bold">
                              <strong className="text-[#2563eb] font-extrabold">{t.to}</strong> 님에게
                            </span>
                          </div>
                          <span className="text-[16px] font-black text-slate-800 tabular-nums">
                            ₩{formatKRW(t.amount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-end">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleCopyAmount(t.amount, t.to)}
                            className="w-full py-2 bg-white border border-slate-200 text-[12px] font-extrabold rounded-xl text-slate-600 hover:bg-slate-100 active:bg-slate-100 flex items-center justify-center gap-1.5 shadow-sm transition-all"
                          >
                            <span>₩ {formatKRW(t.amount)}원 복사하기</span>
                          </motion.button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : totalToReceive > 0 ? (
              <div className="space-y-5">
                <div className="flex items-center gap-4 bg-emerald-50 p-4 rounded-2xl">
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm shadow-emerald-200">
                    <ArrowDownLeft className="w-6 h-6 stroke-[3]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-emerald-600">내가 받아야 할 총 금액</p>
                    <p className="text-[24px] font-black text-emerald-700 tabular-nums">₩{formatKRW(totalToReceive)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[12px] font-extrabold text-slate-400 uppercase tracking-wide px-1">입금 대기 목록</p>
                  <div className="space-y-2.5">
                    {myTransfers.toReceive.map((t, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-100/60 p-4 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${getGradientForName(t.from)} flex items-center justify-center font-bold text-white text-[13px] shadow-sm`}>
                            {t.from.charAt(0)}
                          </div>
                          <span className="text-[14px] text-slate-700 font-bold">
                            <strong className="text-emerald-600 font-extrabold">{t.from}</strong> 님이 나에게
                          </span>
                        </div>
                        <span className="text-[16px] font-black text-emerald-600 tabular-nums">
                          ₩{formatKRW(t.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                  <Smile className="w-8 h-8 text-emerald-500 stroke-[2.5]" />
                </div>
                <p className="text-[16px] font-extrabold text-slate-800">모든 정산이 완료되었어요!</p>
                <p className="text-[12px] text-slate-400 mt-1.5 leading-relaxed">
                  보낼 돈도, 받을 돈도 없는 깨끗한 상태입니다.<br />즐거운 정산 완료! 😊
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Dynamic Summary Cards */}
        <div className="mx-4 mt-4 bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4 pb-1">
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

        {/* Member Stats Section */}
        <div className="mx-4 mt-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[15px] font-extrabold text-slate-800 flex items-center gap-2">
              <Users className="w-4.5 h-4.5 text-[#2563eb]" />
              팀원별 현황
            </h3>
            <span className="text-[11px] text-slate-400 font-bold">총 {members.length}명</span>
          </div>

          <div className="space-y-3">
            {members.map((m, i) => {
              const stats = settlements.memberStats[m] || { paid: 0, actual: 0 };
              const bal = (settlements.balances[m] || 0);
              const isPositive = bal >= 0;
              return (
                <motion.div
                  key={m}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedMember(m)}
                  className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer active:bg-slate-50 transition-colors duration-150"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${getGradientForName(m)} flex items-center justify-center font-bold text-white text-[14px] shadow-sm`}>
                      {m.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-[14px] font-bold text-slate-800">{m}</span>
                        {m === nickname && (
                          <span className="text-[9px] text-[#2563eb] bg-blue-50 px-1.5 py-0.5 rounded-full font-bold ml-1">나</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 font-medium">
                        결제 ₩{formatKRW(stats.paid)} · 소비 ₩{formatKRW(stats.actual)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`text-[15px] font-extrabold tabular-nums ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                      {isPositive ? '+' : ''}₩{formatKRW(bal)}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                      {isPositive ? '돌려받기' : '보내기'}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Full Flow Transfers Section */}
        <div className="mx-4 mt-6 mb-10 space-y-3">
          <div className="px-1">
            <h3 className="text-[15px] font-extrabold text-slate-800 flex items-center gap-2">
              <Receipt className="w-4.5 h-4.5 text-[#2563eb]" />
              전체 정산 흐름
            </h3>
          </div>

          <div className="space-y-3">
            {settlements.transfers.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${getGradientForName(t.from)} flex items-center justify-center font-bold text-white text-[12px] shadow-sm`}>
                        {t.from.charAt(0)}
                      </div>
                      <span className="text-[13px] font-bold text-slate-800">{t.from}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 stroke-[2.5]" />
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${getGradientForName(t.to)} flex items-center justify-center font-bold text-white text-[12px] shadow-sm`}>
                        {t.to.charAt(0)}
                      </div>
                      <span className="text-[13px] font-bold text-slate-800">{t.to}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[16px] font-black text-[#2563eb] tabular-nums">₩{formatKRW(t.amount)}</p>
                    <button
                      onClick={() => handleCopyAmount(t.amount, t.to)}
                      className="text-[10px] font-extrabold text-slate-400 mt-1 hover:text-[#2563eb] active:text-[#2563eb] bg-slate-50 px-2 py-0.5 rounded border border-slate-100 transition-colors"
                    >
                      송금 복사
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            {settlements.transfers.length === 0 && (
              <div className="flex flex-col items-center py-12 bg-white rounded-3xl border border-slate-100/80 shadow-sm text-center">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                  <Receipt className="w-6 h-6 text-[#2563eb]" />
                </div>
                <p className="text-[14px] font-extrabold text-slate-800">송금할 내역이 없어요</p>
                <p className="text-[12px] text-slate-400 mt-1">모든 지출이 아주 공평하게 일치합니다. 👍</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected Member Details Breakdown Modal (Toss Style) */}
      <AnimatePresence>
        {selectedMember && selectedMemberDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setSelectedMember(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 overflow-hidden max-h-[85vh] flex flex-col border border-slate-100 text-slate-800"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${getGradientForName(selectedMember)} flex items-center justify-center font-bold text-white text-[13px] shadow-sm`}>
                    {selectedMember.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-[17px] font-black text-slate-800">{selectedMember}님의 정산 증빙</h2>
                    <p className="text-[11.5px] text-slate-400 font-bold mt-0.5">금액 계산 산출 근거 표기</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* Overview Summary */}
              <div className="my-4 bg-slate-50 border border-slate-100 p-4.5 rounded-2xl">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="flex flex-col gap-0.5 border-r border-slate-200/60">
                    <span className="text-[11px] font-bold text-slate-400">총 결제한 돈</span>
                    <span className="text-[14.5px] font-extrabold text-slate-800 tabular-nums">
                      ₩{formatKRW(selectedMemberDetails.stats.paid)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 border-r border-slate-200/60">
                    <span className="text-[11px] font-bold text-slate-400">총 소비한 돈</span>
                    <span className="text-[14.5px] font-extrabold text-[#2563eb] tabular-nums">
                      ₩{formatKRW(selectedMemberDetails.stats.actual)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-bold text-slate-400">최종 정산 결과</span>
                    <span className={`text-[14.5px] font-black tabular-nums ${selectedMemberDetails.bal >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {selectedMemberDetails.bal >= 0 ? '+' : ''}₩{formatKRW(selectedMemberDetails.bal)}
                    </span>
                  </div>
                </div>
                <div className="mt-3.5 pt-3 border-t border-slate-200/40 text-center">
                  <p className="text-[12px] font-bold text-slate-500">
                    설명: 이 멤버는 공동 경비로 <strong className="text-slate-700">₩{formatKRW(selectedMemberDetails.stats.paid)}원</strong>을 결제하고, 본인이 참여한 항목에서 <strong className="text-[#2563eb]">₩{formatKRW(selectedMemberDetails.stats.actual)}원</strong>어치를 소비하여, 최종적으로 <strong className={selectedMemberDetails.bal >= 0 ? 'text-emerald-600' : 'text-red-500'}>{selectedMemberDetails.bal >= 0 ? `₩${formatKRW(selectedMemberDetails.bal)}원을 돌려받아야` : `₩${formatKRW(Math.abs(selectedMemberDetails.bal))}원을 보내야`}</strong> 합니다.
                  </p>
                </div>
              </div>

              {/* Scrollable details list */}
              <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-left">
                {/* 1. Paid by this member */}
                <div className="space-y-2.5">
                  <h3 className="text-[13px] font-extrabold text-slate-700 flex items-center gap-1.5 px-0.5">
                    <span className="text-emerald-600">💵</span> {selectedMember}님이 결제한 내역 ({selectedMemberDetails.paidList.length}건)
                  </h3>
                  <div className="space-y-2">
                    {selectedMemberDetails.paidList.map((e, idx) => (
                      <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[13.5px] font-extrabold text-slate-800 break-all">{e.description}</span>
                          <span className="text-[14px] font-extrabold text-slate-800 tabular-nums">
                            ₩{formatKRW(e.krw)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                          <span>
                            {new Date(e.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                            {e.currency && e.currency !== 'KRW' && ` · ${e.currency} ${e.amount.toLocaleString()}`}
                          </span>
                          <span className="text-slate-500">
                            지출 대상: {e.splitWith && e.splitWith.length > 0 ? `${e.splitWith.length}명 (${e.splitWith.join(', ')})` : '전원'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {selectedMemberDetails.paidList.length === 0 && (
                      <p className="text-[12px] text-slate-400 italic text-center py-4 bg-slate-50 rounded-2xl border border-slate-150/40">결제한 내역이 없습니다.</p>
                    )}
                  </div>
                </div>

                {/* 2. Shared/Consumed by this member */}
                <div className="space-y-2.5 pb-2">
                  <h3 className="text-[13px] font-extrabold text-slate-700 flex items-center gap-1.5 px-0.5">
                    <span className="text-[#2563eb]">🍽️</span> {selectedMember}님이 함께 참여한 소비 내역 ({selectedMemberDetails.sharedList.length}건)
                  </h3>
                  <div className="space-y-2">
                    {selectedMemberDetails.sharedList.map((e, idx) => (
                      <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[13.5px] font-extrabold text-slate-800 break-all">{e.description}</span>
                          <div className="text-right">
                            <span className="text-[14px] font-extrabold text-[#2563eb] tabular-nums">
                              ₩{formatKRW(e.shareKrw)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">본인 개별 몫 (1/{e.count})</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                          <span>
                            {new Date(e.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                            {` · 결제자: ${e.paidBy}`}
                          </span>
                          <span className="text-slate-500">
                            총액: ₩{formatKRW(e.krw)}
                          </span>
                        </div>
                      </div>
                    ))}
                    {selectedMemberDetails.sharedList.length === 0 && (
                      <p className="text-[12px] text-slate-400 italic text-center py-4 bg-slate-50 rounded-2xl border border-slate-150/40">참여한 소비 내역이 없습니다.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Close Footer button */}
              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => setSelectedMember(null)}
                  className="w-full py-3 bg-slate-100 text-slate-700 font-extrabold rounded-2xl text-[14px] hover:bg-slate-200 transition-colors"
                >
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

