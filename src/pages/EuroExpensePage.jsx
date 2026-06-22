import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
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
    const myExpenses = (rawExpenses || []).filter(e => e.createdBy === nickname || !e.createdBy);
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

      {/* Category Summary at the very top */}
      <CategorySummary
        stats={stats}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

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

      {/* Main List (Full Width) */}
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
    </div>
  );
}
