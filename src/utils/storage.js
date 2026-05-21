// LocalStorage utility for data persistence
const STORAGE_KEYS = {
  SCHEDULES: 'tripsync_schedules',
  EXPENSES: 'tripsync_expenses',
  MEMBERS: 'tripsync_members',
  EXCHANGE_RATES: 'tripsync_exchange_rates',
  SETTINGS: 'tripsync_settings',
  CHECKLISTS: 'tripsync_checklists',
  MEMO: 'tripsync_memo',
};

export function loadFromStorage(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export function removeFromStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error('Failed to remove from localStorage:', e);
  }
}

export { STORAGE_KEYS };
