import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, SlidersHorizontal, ArrowUpDown, X } from 'lucide-react';
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
  
  // Mobile filter expand state
  const [showFilters, setShowFilters] = useState(false);

  // Sync firestore raw items to Zustand store
  useEffect(() => {
    setExpenses(rawExpenses || []);
  }, [rawExpenses, setExpenses]);

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
  const existingCities = Array.from(
    new Set((rawExpenses || []).map((e) => e.city))
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

      {/* Grid: Summary & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2">
          <TotalSummary
            stats={stats}
            onOpenExchangeRateModal={() => setIsRateOpen(true)}
          />
        </div>
        <div className="h-full">
          <CityBreakdown
            stats={stats}
            selectedCity={selectedCity}
            onSelectCity={setSelectedCity}
          />
        </div>
      </div>

      {/* Control Panel (Filter/Sort) */}
      <div className="bg-white rounded-[24px] border border-toss-border p-4.5 space-y-4">
        <div className="flex justify-between items-center">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2.5 bg-toss-bg hover:bg-gray-200 text-toss-text-secondary font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-toss-text-tertiary" />
            <span>필터 & 정렬 상세</span>
          </button>

          {/* Quick Clear Filter Info */}
          {(selectedCity !== 'all' || selectedCategory !== 'all' || dateRange.start || dateRange.end) && (
            <button
              onClick={() => {
                setSelectedCity('all');
                setSelectedCategory('all');
                setDateRange(null, null);
              }}
              className="flex items-center gap-1 text-[11px] font-bold text-red-500 hover:underline cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>모든 필터 초기화</span>
            </button>
          )}
        </div>

        {/* Expandable filters detail panel */}
        {(showFilters || selectedCity !== 'all' || selectedCategory !== 'all' || dateRange.start || dateRange.end) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-toss-border/50">
            {/* Sort Order */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-toss-text-secondary uppercase">
                정렬 순서
              </label>
              <div className="flex items-center gap-2 bg-toss-bg rounded-xl px-3.5 py-2 border border-toss-border">
                <ArrowUpDown className="w-3.5 h-3.5 text-toss-text-tertiary" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs font-bold text-toss-text-primary focus:outline-none w-full cursor-pointer"
                >
                  <option value="date-desc">최신 순</option>
                  <option value="date-asc">과거 순</option>
                  <option value="amount-desc">금액 높은 순</option>
                  <option value="amount-asc">금액 낮은 순</option>
                </select>
              </div>
            </div>

            {/* Date Range Start */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-toss-text-secondary uppercase">
                기간 시작일
              </label>
              <input
                type="date"
                value={dateRange.start || ''}
                onChange={(e) => setDateRange(e.target.value || null, dateRange.end)}
                className="w-full bg-toss-bg text-xs font-bold text-toss-text-primary rounded-xl px-3.5 py-2 border border-toss-border focus:outline-none cursor-pointer"
              />
            </div>

            {/* Date Range End */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-toss-text-secondary uppercase">
                기간 종료일
              </label>
              <input
                type="date"
                value={dateRange.end || ''}
                onChange={(e) => setDateRange(dateRange.start, e.target.value || null)}
                className="w-full bg-toss-bg text-xs font-bold text-toss-text-primary rounded-xl px-3.5 py-2 border border-toss-border focus:outline-none cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: List & Category breakdown side-by-side on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-2 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-base font-bold text-toss-text-primary">
              {selectedCity !== 'all' ? `${selectedCity} 지출 목록` : '전체 지출 내역'}
            </h3>
            <span className="text-[11px] font-bold text-toss-text-tertiary">
              검색결과 {filteredExpenses.length}건
            </span>
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

        <div className="space-y-4">
          <CategorySummary
            stats={stats}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>
      </div>

      {/* Floating Action Button (FAB) */}
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
      </motion.button>

      {/* Forms & Modals */}
      <ExpenseForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleAddOrEditExpense}
        editItem={editingItem}
        existingCities={existingCities}
      />

      <ExchangeRateModal
        isOpen={isRateOpen}
        onClose={() => setIsRateOpen(false)}
        rates={exchangeRates}
        onUpdateRate={handleUpdateRate}
      />
    </div>
  );
}
