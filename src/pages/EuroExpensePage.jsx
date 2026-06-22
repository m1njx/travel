import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { 
  EURO_CITY_TEMPLATES, 
  EURO_CATEGORIES, 
  formatEuroCurrency, 
  formatKRW, 
  convertEuroToKRW 
} from '../utils/euroCurrency';
import { useEuroExpenseStore } from '../store/euroExpenseStore';
import TotalSummary from '../components/EuroExpense/TotalSummary';
import CityBreakdown from '../components/EuroExpense/CityBreakdown';
import CategorySummary from '../components/EuroExpense/CategorySummary';
import ExpenseList from '../components/EuroExpense/ExpenseList';
import ExpenseForm from '../components/EuroExpense/ExpenseForm';
import ExchangeRateModal from '../components/EuroExpense/ExchangeRateModal';

export default function EuroExpensePage({
  sync,
  meta,
  updateMeta,
  logAction,
  nickname
}) {
  const { items: rawExpenses, addItem, updateItem, removeItem } = sync;
  
  // Zustand Store state & actions
  const expenses = useEuroExpenseStore((state) => state.expenses);
  const setExpenses = useEuroExpenseStore((state) => state.setExpenses);
  const exchangeRates = useEuroExpenseStore((state) => state.exchangeRates);
  const setExchangeRates = useEuroExpenseStore((state) => state.setExchangeRates);
  const updateRate = useEuroExpenseStore((state) => state.updateRate);
  
  const selectedCity = useEuroExpenseStore((state) => state.selectedCity);
  const setSelectedCity = useEuroExpenseStore((state) => state.setSelectedCity);
  
  const selectedCategory = useEuroExpenseStore((state) => state.selectedCategory);
  const setSelectedCategory = useEuroExpenseStore((state) => state.setSelectedCategory);
  
  const sortBy = useEuroExpenseStore((state) => state.sortBy);
  const setSortBy = useEuroExpenseStore((state) => state.setSortBy);
  
  const dateRange = useEuroExpenseStore((state) => state.dateRange);
  const setDateRange = useEuroExpenseStore((state) => state.setDateRange);
  
  const getFilteredExpenses = useEuroExpenseStore((state) => state.getFilteredExpenses);
  const getStats = useEuroExpenseStore((state) => state.getStats);

  // Modal control states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isRateOpen, setIsRateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [activeCityModal, setActiveCityModal] = useState(null);

  // Payment methods state
  const [localPaymentMethods, setLocalPaymentMethods] = useState(() => 
    loadFromStorage('euro_payment_methods') || ['현금', '카드', '트래블로그', '트래블월렛']
  );

  const paymentMethods = (meta && meta.euroPaymentMethods) 
    ? meta.euroPaymentMethods 
    : localPaymentMethods;

  const handleAddPaymentMethod = async (newMethod) => {
    const current = (meta && meta.euroPaymentMethods) ? meta.euroPaymentMethods : localPaymentMethods;
    if (!current.includes(newMethod)) {
      const updated = [...current, newMethod];
      if (meta && updateMeta) {
        await updateMeta({ euroPaymentMethods: updated });
      }
      setLocalPaymentMethods(updated);
      saveToStorage('euro_payment_methods', updated);
    }
  };

  // Sync firestore raw items to Zustand store
  useEffect(() => {
    console.log('[EuroExpensePage] rawExpenses from Firebase:', rawExpenses);
    console.log('[EuroExpensePage] Current nickname:', nickname);
    const myExpenses = (rawExpenses || []).filter(e => e.createdBy === nickname || !e.createdBy);
    console.log('[EuroExpensePage] Filtered myExpenses:', myExpenses);
    setExpenses(myExpenses);
  }, [rawExpenses, nickname, setExpenses]);

  // Sync firestore custom exchange rates if present
  useEffect(() => {
    if (meta?.euroExchangeRates) {
      setExchangeRates(meta.euroExchangeRates);
    }
  }, [meta?.euroExchangeRates, setExchangeRates]);

  const handleAddOrEditExpense = async (payload) => {
    try {
      if (editingItem) {
        // Edit mode
        await updateItem(payload);
        if (logAction) {
          logAction('edit', 'euroExpenses', payload, nickname, editingItem);
        }
      } else {
        // Create mode
        await addItem(payload);
        if (logAction) {
          logAction('add', 'euroExpenses', payload, nickname);
        }
      }
    } catch (err) {
      console.error('Error saving expense:', err);
      alert('저장 도중 오류가 발생했습니다.');
    }
  };

  const handleDeleteExpense = async (id) => {
    if (window.confirm('이 지출 내역을 정말 삭제하시겠습니까?')) {
      try {
        const itemToDelete = rawExpenses.find(i => i.id === id);
        await removeItem(id);
        if (logAction && itemToDelete) {
          logAction('delete', 'euroExpenses', itemToDelete, nickname);
        }
      } catch (err) {
        console.error('Error deleting expense:', err);
        alert('삭제 도중 오류가 발생했습니다.');
      }
    }
  };

  const handleUpdateRate = (code, val) => {
    // Pass updateMeta as sync trigger if online, otherwise local only
    const syncCallback = meta ? updateMeta : null;
    updateRate(code, val, syncCallback);
  };

  // Get computed values
  const stats = getStats();
  const filteredExpenses = getFilteredExpenses();

  // Extract unique cities list for helper suggestion
  const myExpenses = (rawExpenses || []).filter(e => e.createdBy === nickname || !e.createdBy);
  const existingCities = Array.from(
    new Set(myExpenses.map((e) => e.city))
  ).filter(Boolean);

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Top Title Section */}
      <div className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-toss-text-primary tracking-tight">
            유럽 경비 트래커
          </h2>
          <p className="text-xs text-toss-text-tertiary mt-0.5">
            도시별 경비를 수동 환율로 연동하여 편리하게 관리하세요.
          </p>
        </div>
      </div>

      {/* 1. 총 경비 */}
      <TotalSummary
        stats={stats}
        onOpenExchangeRateModal={() => setIsRateOpen(true)}
      />

      {/* 2. 도시별 지출 정보 */}
      <CityBreakdown
        stats={stats}
        selectedCity={activeCityModal || 'all'}
        onSelectCity={(city) => setActiveCityModal(city === 'all' ? null : city)}
      />

      {/* 3. 카테고리별 정보 */}
      <CategorySummary
        stats={stats}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* 4. 전체 지출 내역 (Full Width) */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-base font-bold text-toss-text-primary">
            {selectedCity !== 'all' ? `${selectedCity} 지출 목록` : '전체 지출 내역'}
          </h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] font-bold text-toss-text-tertiary">
              검색결과 {filteredExpenses.length}건
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white text-[11px] font-bold text-toss-text-secondary rounded-lg px-2.5 py-1.5 border border-toss-border focus:outline-none cursor-pointer shadow-sm"
            >
              <option value="date-desc">최신순</option>
              <option value="date-asc">과거순</option>
              <option value="amount-desc">금액높은순</option>
              <option value="amount-asc">금액낮은순</option>
            </select>
          </div>
        </div>
        <ExpenseList
          expenses={filteredExpenses}
          onEdit={(item) => {
            setEditingItem(item);
            setIsFormOpen(true);
          }}
          onDelete={handleDeleteExpense}
        />
      </div>

      {/* Floating Action Button (FAB) */}
      {createPortal(
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setEditingItem(null);
            setIsFormOpen(true);
          }}
          className="fixed bottom-24 right-5 md:bottom-8 md:right-8 w-14 h-14 bg-toss-blue hover:bg-blue-600 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg shadow-toss-blue/35 z-40 cursor-pointer"
          title="지출 등록"
        >
          <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
        </motion.button>,
        document.body
      )}

      {/* Forms & Modals */}
      {createPortal(
        <ExpenseForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
          }}
          onSubmit={handleAddOrEditExpense}
          editItem={editingItem}
          existingCities={existingCities}
          nickname={nickname}
          paymentMethods={paymentMethods}
          onAddPaymentMethod={handleAddPaymentMethod}
        />,
        document.body
      )}

      {createPortal(
        <ExchangeRateModal
          isOpen={isRateOpen}
          onClose={() => setIsRateOpen(false)}
          rates={exchangeRates}
          onUpdateRate={handleUpdateRate}
        />,
        document.body
      )}

      {/* City Detail Modal */}
      {createPortal(
        <AnimatePresence>
          {activeCityModal && (
            <>
              {/* Overlay backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveCityModal(null)}
                className="fixed inset-0 bg-black z-[110] cursor-pointer"
              />
              
              {/* Modal Container */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[450px] bg-white rounded-[28px] shadow-2xl z-[111] overflow-hidden border border-toss-border flex flex-col max-h-[80vh]"
              >
                {/* Header */}
                <div className="px-6 py-4.5 border-b border-toss-border flex justify-between items-center bg-toss-bg/30 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {EURO_CITY_TEMPLATES.find(t => t.city === activeCityModal)?.flag || '📍'}
                    </span>
                    <h3 className="font-extrabold text-toss-text-primary text-[15px] sm:text-base">
                      {activeCityModal} 지출 상세 내역
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveCityModal(null)}
                    className="p-1.5 hover:bg-toss-bg rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5 text-toss-text-secondary" />
                  </button>
                </div>

                {/* Content List */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3.5 scrollbar-none">
                  {(() => {
                    const cityExpenses = myExpenses.filter(e => e.city === activeCityModal);
                    if (cityExpenses.length === 0) {
                      return (
                        <p className="text-center py-8 text-xs text-toss-text-tertiary">
                          등록된 지출이 없습니다.
                        </p>
                      );
                    }

                    // Sort cityExpenses by date descending
                    const sortedCityExpenses = [...cityExpenses].sort((a, b) => {
                      const dateA = a.date?.seconds ? a.date.seconds * 1000 : new Date(a.date).getTime();
                      const dateB = b.date?.seconds ? b.date.seconds * 1000 : new Date(b.date).getTime();
                      return dateB - dateA;
                    });

                    // Format date MM.DD
                    const formatShortDate = (dateStr) => {
                      const d = new Date(dateStr);
                      return `${d.getMonth() + 1}.${d.getDate()}`;
                    };

                    return (
                      <div className="space-y-2.5">
                        {sortedCityExpenses.map((item) => {
                          const catMeta = EURO_CATEGORIES[item.category] || EURO_CATEGORIES.etc;
                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3.5 bg-toss-bg/30 hover:bg-toss-bg/50 rounded-2xl border border-toss-border/40 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-base bg-white shadow-sm flex-shrink-0">
                                  {catMeta.emoji}
                                </div>
                                <div className="min-w-0 flex-1 space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-[13px] text-toss-text-primary truncate">
                                      {item.description || catMeta.label}
                                    </span>
                                    <span className="text-[10px] text-toss-text-tertiary font-bold flex-shrink-0">
                                      {formatShortDate(item.date)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] text-toss-text-tertiary">
                                      {formatEuroCurrency(item.amount, item.currency)}
                                    </span>
                                    {item.paymentMethod && (
                                      <span className="text-[9px] px-1.5 py-0.2 bg-toss-blue-light text-toss-blue rounded-md font-bold">
                                        {item.paymentMethod}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 pl-2">
                                <span className="font-extrabold text-[14px] text-toss-text-primary">
                                  {formatKRW(convertEuroToKRW(item.amount, item.currency, exchangeRates))}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
                
                {/* Footer showing total city spending */}
                <div className="px-6 py-4.5 bg-toss-bg/40 border-t border-toss-border/60 flex justify-between items-center flex-shrink-0">
                  <span className="text-xs font-bold text-toss-text-secondary">도시 합계</span>
                  <span className="text-base font-extrabold text-toss-blue font-mono">
                    {(() => {
                      const cityTotal = myExpenses
                        .filter(e => e.city === activeCityModal)
                        .reduce((sum, e) => sum + convertEuroToKRW(e.amount, e.currency, exchangeRates), 0);
                      return formatKRW(cityTotal);
                    })()}
                  </span>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
