import { useState, useEffect, useCallback, useRef } from 'react';
import { loadFromStorage, saveToStorage } from './storage';
import {
  isFirebaseConfigured,
  subscribeToCollection,
  saveDocument,
  deleteDocument,
  saveRoomMeta,
  subscribeToRoomMeta,
  saveActivityLog,
  subscribeToActivityLogs,
} from './firebase';

/**
 * Hook that syncs a list of items with Firestore (if configured) + localStorage fallback.
 * When roomCode is provided and Firebase is configured, data is synced in real-time.
 * Otherwise, uses localStorage only.
 */
export function useSyncedList(roomCode, collectionName, storageKey) {
  const [items, setItems] = useState(() => loadFromStorage(storageKey) || []);
  const isOnline = isFirebaseConfigured() && !!roomCode;
  const initializedRef = useRef(false);

  // Subscribe to Firestore real-time updates
  useEffect(() => {
    if (!isOnline) return;

    const unsub = subscribeToCollection(roomCode, collectionName, (data) => {
      setItems(data);
      saveToStorage(storageKey, data); // also cache locally
      initializedRef.current = true;
    });

    return () => unsub();
  }, [roomCode, collectionName, isOnline, storageKey]);

  // Save to localStorage when offline
  useEffect(() => {
    if (!isOnline) {
      saveToStorage(storageKey, items);
    }
  }, [items, isOnline, storageKey]);

  const addItem = useCallback(async (item) => {
    if (isOnline) {
      await saveDocument(roomCode, collectionName, item);
    } else {
      setItems(prev => [...prev, item]);
    }
  }, [isOnline, roomCode, collectionName]);

  const updateItem = useCallback(async (item) => {
    if (isOnline) {
      await saveDocument(roomCode, collectionName, item);
    } else {
      setItems(prev => prev.map(i => i.id === item.id ? item : i));
    }
  }, [isOnline, roomCode, collectionName]);

  const removeItem = useCallback(async (id) => {
    if (isOnline) {
      await deleteDocument(roomCode, collectionName, id);
    } else {
      setItems(prev => prev.filter(i => i.id !== id));
    }
  }, [isOnline, roomCode, collectionName]);

  // For offline: allow direct setItems
  const setItemsDirect = useCallback((updater) => {
    if (!isOnline) {
      setItems(updater);
    }
  }, [isOnline]);

  return { items, setItems: setItemsDirect, addItem, updateItem, removeItem, isOnline };
}

/**
 * Hook that syncs room metadata (members, settings) with Firestore
 */
export function useSyncedMeta(roomCode) {
  const [meta, setMeta] = useState(null);
  const isOnline = isFirebaseConfigured() && !!roomCode;

  useEffect(() => {
    if (!isOnline) return;
    const unsub = subscribeToRoomMeta(roomCode, setMeta);
    return () => unsub();
  }, [roomCode, isOnline]);

  const updateMeta = useCallback(async (data) => {
    if (isOnline) {
      await saveRoomMeta(roomCode, data);
    }
  }, [isOnline, roomCode]);

  return { meta, updateMeta, isOnline };
}

const genLogId = () => `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Hook for logging activity (add/edit/delete) to Firestore
 */
export function useActivityLog(roomCode) {
  const isOnline = isFirebaseConfigured() && !!roomCode;

  const logAction = useCallback(async (action, collectionName, item, performedBy, previousItem = null) => {
    if (!isOnline) return;

    const collectionLabels = { schedules: '일정', expenses: '지출', checklists: '준비물' };
    const actionLabels = { add: '추가', edit: '수정', delete: '삭제' };
    const itemName = item?.title || item?.name || item?.description || item?.id || '항목';

    const logData = {
      id: genLogId(),
      action,
      collection: collectionName,
      itemId: item?.id || '',
      itemSnapshot: previousItem || item,
      newItem: action === 'edit' ? item : null,
      performedBy,
      timestamp: Date.now(),
      description: `${collectionLabels[collectionName] || collectionName} '${itemName}' ${actionLabels[action] || action}`,
      restored: false,
    };

    try {
      await saveActivityLog(roomCode, logData);
    } catch (err) {
      console.error('Failed to save activity log:', err);
    }
  }, [isOnline, roomCode]);

  return { logAction };
}

/**
 * Hook that subscribes to activity logs in real-time
 */
export function useSyncedLogs(roomCode) {
  const [logs, setLogs] = useState([]);
  const isOnline = isFirebaseConfigured() && !!roomCode;

  useEffect(() => {
    if (!isOnline) return;
    const unsub = subscribeToActivityLogs(roomCode, setLogs);
    return () => unsub();
  }, [roomCode, isOnline]);

  return { logs };
}
