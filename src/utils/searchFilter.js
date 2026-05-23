/**
 * Advanced search and filtering utilities for TripSync
 */

export const createDateRangeFilter = (startDate, endDate) => {
  return (item) => {
    if (!startDate || !endDate) return true;
    const itemDate = new Date(item.date || item.createdAt);
    return itemDate >= new Date(startDate) && itemDate <= new Date(endDate);
  };
};

export const createCategoryFilter = (categories) => {
  if (!categories || categories.length === 0) return () => true;
  return (item) => categories.includes(item.category);
};

export const createPersonFilter = (person) => {
  if (!person) return () => true;
  return (item) => item.paidBy === person || item.createdBy === person || item.assignedTo === person;
};

export const createSearchFilter = (query) => {
  if (!query || query.trim() === '') return () => true;
  const lowerQuery = query.toLowerCase();
  return (item) => {
    const searchableFields = [
      item.title,
      item.name,
      item.description,
      item.paidBy,
      item.category,
      item.type,
    ].map(f => (f || '').toString().toLowerCase());
    
    return searchableFields.some(field => field.includes(lowerQuery));
  };
};

export const createCompletionFilter = (status) => {
  if (status === 'all') return () => true;
  if (status === 'completed') return (item) => item.completed;
  if (status === 'pending') return (item) => !item.completed;
  return () => true;
};

/**
 * Combine multiple filters with AND logic
 */
export const combineFilters = (...filters) => {
  return (item) => filters.every(f => f ? f(item) : true);
};

/**
 * Search schedules with advanced filters
 */
export const searchSchedules = (schedules, {
  query = '',
  startDate = null,
  endDate = null,
  completion = 'all',
  sortBy = 'date'
} = {}) => {
  let results = schedules;

  // Apply filters
  results = results.filter(combineFilters(
    createSearchFilter(query),
    createDateRangeFilter(startDate, endDate),
    createCompletionFilter(completion)
  ));

  // Sort
  if (sortBy === 'date') {
    results.sort((a, b) => new Date(a.date) - new Date(b.date));
  } else if (sortBy === 'title') {
    results.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }

  return results;
};

/**
 * Search expenses with advanced filters
 */
export const searchExpenses = (expenses, {
  query = '',
  startDate = null,
  endDate = null,
  categories = [],
  person = '',
  minAmount = 0,
  maxAmount = Infinity,
  sortBy = 'date'
} = {}) => {
  let results = expenses;

  // Apply filters
  results = results.filter(combineFilters(
    createSearchFilter(query),
    createDateRangeFilter(startDate, endDate),
    createCategoryFilter(categories),
    createPersonFilter(person || null),
    (item) => item.amount >= minAmount && item.amount <= maxAmount
  ));

  // Sort
  if (sortBy === 'date') {
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sortBy === 'amount') {
    results.sort((a, b) => b.amount - a.amount);
  } else if (sortBy === 'person') {
    results.sort((a, b) => (a.paidBy || '').localeCompare(b.paidBy || ''));
  }

  return results;
};

/**
 * Search checklists with advanced filters
 */
export const searchChecklists = (checklists, {
  query = '',
  completion = 'all',
  assignee = '',
  type = 'all', // 'all', 'personal', 'common'
  sortBy = 'name'
} = {}) => {
  let results = checklists;

  // Apply filters
  results = results.filter(combineFilters(
    createSearchFilter(query),
    createCompletionFilter(completion),
    createPersonFilter(assignee || null),
    (item) => type === 'all' || item.type === type
  ));

  // Sort
  if (sortBy === 'name') {
    results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } else if (sortBy === 'completion') {
    results.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  return results;
};

/**
 * Get summary statistics for expenses
 */
export const getExpenseStats = (expenses, groupBy = 'category') => {
  const stats = {};
  
  expenses.forEach(exp => {
    const key = groupBy === 'category' ? exp.category : exp.paidBy;
    if (!stats[key]) {
      stats[key] = { total: 0, count: 0, items: [] };
    }
    stats[key].total += exp.amount;
    stats[key].count += 1;
    stats[key].items.push(exp);
  });

  return stats;
};

/**
 * Calculate expense settlement
 * Returns: who owes how much to whom
 */
export const calculateSettlement = (expenses, members) => {
  const balances = {};
  
  // Initialize balances for all members
  members.forEach(member => {
    balances[member] = 0;
  });

  // Calculate who paid what
  expenses.forEach(exp => {
    if (balances.hasOwnProperty(exp.paidBy)) {
      balances[exp.paidBy] += exp.amount;
    }

    // Deduct from split members
    const splitAmount = exp.amount / (exp.splitWith?.length || 1);
    (exp.splitWith || []).forEach(person => {
      if (balances.hasOwnProperty(person)) {
        balances[person] -= splitAmount;
      }
    });
  });

  // Convert balances to settlement transactions
  const settlement = [];
  const positive = Object.entries(balances).filter(([, v]) => v > 0.01);
  const negative = Object.entries(balances).filter(([, v]) => v < -0.01);

  positive.forEach(([creditor, amount]) => {
    let remaining = amount;
    for (let i = 0; i < negative.length && remaining > 0.01; i++) {
      const [debtor, debt] = negative[i];
      const absDebt = Math.abs(debt);
      const transfer = Math.min(remaining, absDebt);
      
      if (transfer > 0.01) {
        settlement.push({
          from: debtor,
          to: creditor,
          amount: Math.round(transfer * 100) / 100,
        });
        remaining -= transfer;
        negative[i][1] += transfer;
      }
    }
  });

  return settlement;
};
