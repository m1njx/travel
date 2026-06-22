import { create } from 'zustand';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '../utils/storage';
import { DEFAULT_EURO_RATES, convertEuroToKRW } from '../utils/euroCurrency';

export const useEuroExpenseStore = create((set, get) => ({
  // Active state
  expenses: [],
  exchangeRates: loadFromStorage(STORAGE_KEYS.EURO_EXCHANGE_RATES) || { ...DEFAULT_EURO_RATES },
  
  // Filters & Sorts
  selectedCity: 'all',
  selectedCategory: 'all',
  sortBy: 'date-desc', // 'date-desc', 'date-asc', 'amount-desc', 'amount-asc'
  dateRange: { start: null, end: null },

  // Setters
  setExpenses: (expenses) => set({ expenses }),
  
  setExchangeRates: (rates) => {
    saveToStorage(STORAGE_KEYS.EURO_EXCHANGE_RATES, rates);
    set({ exchangeRates: rates });
  },

  updateRate: (currency, newRate, onSyncMeta = null) => {
    const updatedRates = {
      ...get().exchangeRates,
      [currency]: Number(newRate)
    };
    get().setExchangeRates(updatedRates);
    
    // If online, sync meta so other users get it
    if (onSyncMeta) {
      onSyncMeta({ euroExchangeRates: updatedRates });
    }
  },

  setSelectedCity: (city) => set({ selectedCity: city }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSortBy: (sortBy) => set({ sortBy }),
  setDateRange: (start, end) => set({ dateRange: { start, end } }),

  // Computed Selectors (Getters)
  getFilteredExpenses: () => {
    const { expenses, selectedCity, selectedCategory, sortBy, dateRange, exchangeRates } = get();
    
    return expenses
      .filter(item => {
        // City Filter
        if (selectedCity !== 'all' && item.city !== selectedCity) return false;
        
        // Category Filter
        if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
        
        // Date Range Filter
        if (dateRange.start || dateRange.end) {
          const itemDate = item.date?.seconds 
            ? new Date(item.date.seconds * 1000) 
            : new Date(item.date);
            
          if (dateRange.start) {
            const start = new Date(dateRange.start);
            start.setHours(0, 0, 0, 0);
            if (itemDate < start) return false;
          }
          if (dateRange.end) {
            const end = new Date(dateRange.end);
            end.setHours(23, 59, 59, 999);
            if (itemDate > end) return false;
          }
        }
        
        return true;
      })
      .map(item => {
        // Recalculate amountInKRW dynamically based on current user custom rates
        const krw = convertEuroToKRW(item.amount, item.currency, exchangeRates);
        return {
          ...item,
          amountInKRW: krw
        };
      })
      .sort((a, b) => {
        const dateA = a.date?.seconds ? a.date.seconds * 1000 : new Date(a.date).getTime();
        const dateB = b.date?.seconds ? b.date.seconds * 1000 : new Date(b.date).getTime();

        if (sortBy === 'date-desc') return dateB - dateA;
        if (sortBy === 'date-asc') return dateA - dateB;
        if (sortBy === 'amount-desc') return b.amountInKRW - a.amountInKRW;
        if (sortBy === 'amount-asc') return a.amountInKRW - b.amountInKRW;
        return 0;
      });
  },

  getStats: () => {
    const { expenses, exchangeRates } = get();
    
    let totalKRW = 0;
    const cityMap = {};
    const categoryMap = {
      accommodation: 0,
      food: 0,
      transport: 0,
      sightseeing: 0,
      shopping: 0,
      etc: 0
    };

    expenses.forEach(item => {
      const krw = convertEuroToKRW(item.amount, item.currency, exchangeRates);
      totalKRW += krw;

      // City calculation
      if (!cityMap[item.city]) {
        cityMap[item.city] = {
          city: item.city,
          country: item.country || '',
          amountInKRW: 0,
          count: 0,
          currencies: {}
        };
      }
      cityMap[item.city].amountInKRW += krw;
      cityMap[item.city].count += 1;
      
      if (!cityMap[item.city].currencies[item.currency]) {
        cityMap[item.city].currencies[item.currency] = 0;
      }
      cityMap[item.city].currencies[item.currency] += item.amount;

      // Category calculation
      if (categoryMap[item.category] !== undefined) {
        categoryMap[item.category] += krw;
      } else {
        categoryMap.etc += krw;
      }
    });

    // Sort cities by amount descending
    const citiesBreakdown = Object.values(cityMap).sort((a, b) => b.amountInKRW - a.amountInKRW);

    // Calculate dates for trip duration
    let tripDays = 1;
    if (expenses.length > 0) {
      const timestamps = expenses.map(item => 
        item.date?.seconds ? item.date.seconds * 1000 : new Date(item.date).getTime()
      ).filter(t => isFinite(t));
      
      if (timestamps.length > 0) {
        const minDate = Math.min(...timestamps);
        const maxDate = Math.max(...timestamps);
        const diffTime = Math.abs(maxDate - minDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        tripDays = diffDays || 1;
      }
    }

    const averagePerDay = Math.round(totalKRW / tripDays);

    return {
      totalKRW,
      tripDays,
      averagePerDay,
      citiesBreakdown,
      categories: categoryMap
    };
  }
}));
