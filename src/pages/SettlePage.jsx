import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, ArrowRight, BarChart3, Receipt, CheckCircle, ArrowUpRight, ArrowDownLeft, Smile } from 'lucide-react';
import { convertToKRW, formatKRW } from '../utils/exchangeRate';
import { fetchExchangeRates } from '../utils/exchangeRate';

export default function SettlePage({ members, expenses = [], nickname }) {
  const [currentRates, setCurrentRates] = useState(null);

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

  return (
    <div className="pb-6">
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
                <motion.div key={m} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="toss-card border border-toss-border/40">
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
  );
}
