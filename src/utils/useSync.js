import { useState, useEffect, useCallback, useRef } from 'react';
import { loadFromStorage, saveToStorage } from './storage';
import {
  isFirebaseConfigured,
  subscribeToCollection,
  saveDocument,
  deleteDocument,
  saveRoomMeta,
  subscribeToRoomMeta,
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
