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
 * Hook to detect online/offline status and manage sync queue
 * Stores pending operations when offline and syncs when back online
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [syncQueue, setSyncQueue] = useState(() => 
    loadFromStorage('tripsync_sync_queue') || []
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'syncing', 'success', 'error'

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('[Sync] Online - starting sync queue processing');
    };
    const handleOffline = () => {
      setIsOnline(false);
      console.log('[Sync] Offline - operations will be queued');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save sync queue to localStorage
  useEffect(() => {
    saveToStorage('tripsync_sync_queue', syncQueue);
  }, [syncQueue]);

  const addToQueue = useCallback((operation) => {
    const newOp = {
      ...operation,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3,
      synced: false
    };
    setSyncQueue(prev => [...prev, newOp]);
    return newOp.id;
  }, []);

  const removeFromQueue = useCallback((operationId) => {
    setSyncQueue(prev => prev.filter(op => op.id !== operationId));
  }, []);

  const markAsSynced = useCallback((operationId) => {
    setSyncQueue(prev => prev.filter(op => op.id !== operationId));
  }, []);

  const clearQueue = useCallback(() => {
    setSyncQueue([]);
  }, []);

  return { 
    isOnline, 
    syncQueue, 
    isSyncing, 
    setIsSyncing, 
    syncStatus,
    setSyncStatus,
    addToQueue, 
    removeFromQueue, 
    markAsSynced,
    clearQueue 
  };
}

/**
 * Hook that syncs a list of items with Firestore (if configured) + localStorage fallback.
 * Includes automatic sync queue processing when coming back online.
 */
export function useSyncedList(roomCode, collectionName, storageKey, onlineStatus = null) {
  const [items, setItems] = useState(() => loadFromStorage(storageKey) || []);
  const isOnlineFirebase = isFirebaseConfigured() && !!roomCode;
  const initializedRef = useRef(false);
  const syncProcessingRef = useRef(false);

  // Subscribe to Firestore real-time updates
  useEffect(() => {
    if (!isOnlineFirebase) return;

    const unsub = subscribeToCollection(roomCode, collectionName, (data) => {
      setItems(data);
      saveToStorage(storageKey, data);
      initializedRef.current = true;
    });

    return () => unsub();
  }, [roomCode, collectionName, isOnlineFirebase, storageKey]);

  // Save to localStorage when offline
  useEffect(() => {
    if (!isOnlineFirebase) {
      saveToStorage(storageKey, items);
    }
  }, [items, isOnlineFirebase, storageKey]);

  // Auto-sync queue when coming online
  useEffect(() => {
    if (!onlineStatus?.isOnline || !isOnlineFirebase || syncProcessingRef.current) return;
    if (onlineStatus.syncQueue.length === 0) return;

    syncProcessingRef.current = true;
    onlineStatus.setIsSyncing(true);
    onlineStatus.setSyncStatus('syncing');

    const processSyncQueue = async () => {
      try {
        for (const op of onlineStatus.syncQueue) {
          if (op.synced) continue;
          
          try {
            if (op.action === 'add' || op.action === 'update') {
              await saveDocument(roomCode, collectionName, op.item);
            } else if (op.action === 'delete') {
              await deleteDocument(roomCode, collectionName, op.itemId);
            }
            
            onlineStatus.markAsSynced(op.id);
            console.log(`[Sync] Successfully synced: ${collectionName} - ${op.id}`);
          } catch (err) {
            console.error(`[Sync] Failed to sync: ${op.id}`, err);
            if (op.retries >= op.maxRetries) {
              onlineStatus.removeFromQueue(op.id);
            }
          }
        }
        
        onlineStatus.setSyncStatus('success');
        setTimeout(() => onlineStatus.setSyncStatus('idle'), 2000);
      } catch (err) {
        console.error('[Sync] Queue processing failed:', err);
        onlineStatus.setSyncStatus('error');
        setTimeout(() => onlineStatus.setSyncStatus('idle'), 3000);
      } finally {
        onlineStatus.setIsSyncing(false);
        syncProcessingRef.current = false;
      }
    };

    processSyncQueue();
  }, [onlineStatus?.isOnline, isOnlineFirebase, onlineStatus?.syncQueue.length, roomCode, collectionName]);

  const addItem = useCallback(async (item) => {
    if (isOnlineFirebase) {
      try {
        await saveDocument(roomCode, collectionName, item);
      } catch (err) {
        console.warn('Failed to add item online, queuing:', err);
        onlineStatus?.addToQueue({ action: 'add', item, itemId: item.id });
      }
    } else {
      setItems(prev => [...prev, item]);
      onlineStatus?.addToQueue({ action: 'add', item, itemId: item.id });
    }
  }, [isOnlineFirebase, roomCode, collectionName, onlineStatus]);

  const updateItem = useCallback(async (item) => {
    if (isOnlineFirebase) {
      try {
        await saveDocument(roomCode, collectionName, item);
      } catch (err) {
        console.warn('Failed to update item online, queuing:', err);
        onlineStatus?.addToQueue({ action: 'update', item, itemId: item.id });
      }
    } else {
      setItems(prev => prev.map(i => i.id === item.id ? item : i));
      onlineStatus?.addToQueue({ action: 'update', item, itemId: item.id });
    }
  }, [isOnlineFirebase, roomCode, collectionName, onlineStatus]);

  const removeItem = useCallback(async (id) => {
    if (isOnlineFirebase) {
      try {
        await deleteDocument(roomCode, collectionName, id);
      } catch (err) {
        console.warn('Failed to delete item online, queuing:', err);
        onlineStatus?.addToQueue({ action: 'delete', itemId: id });
      }
    } else {
      setItems(prev => prev.filter(i => i.id !== id));
      onlineStatus?.addToQueue({ action: 'delete', itemId: id });
    }
  }, [isOnlineFirebase, roomCode, collectionName, onlineStatus]);

  const setItemsDirect = useCallback((updater) => {
    if (!isOnlineFirebase) {
      setItems(updater);
    }
  }, [isOnlineFirebase]);

  return { items, setItems: setItemsDirect, addItem, updateItem, removeItem, isOnline: isOnlineFirebase };
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
