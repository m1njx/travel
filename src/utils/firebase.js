import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Firebase is only initialized when config is present
let app = null;
let db = null;

export function isFirebaseConfigured() {
  return !!import.meta.env.VITE_FIREBASE_API_KEY && !!import.meta.env.VITE_FIREBASE_PROJECT_ID;
}

function getDb() {
  if (!db && isFirebaseConfigured()) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  }
  return db;
}

/**
 * Get a Firestore collection reference for a trip room
 * Path: /trips/{roomCode}/{collectionName}
 */
function getRoomCollection(roomCode, collectionName) {
  const firestore = getDb();
  if (!firestore || !roomCode) return null;
  return collection(firestore, 'trips', roomCode, collectionName);
}

/**
 * Subscribe to real-time updates for a collection
 * Returns an unsubscribe function
 */
export function subscribeToCollection(roomCode, collectionName, onData) {
  const colRef = getRoomCollection(roomCode, collectionName);
  if (!colRef) return () => {};

  const q = query(colRef);
  return onSnapshot(q, (snapshot) => {
    const items = [];
    snapshot.forEach(docSnap => {
      items.push({ ...docSnap.data(), id: docSnap.id });
    });
    onData(items);
  }, (error) => {
    console.error(`Firestore subscription error (${collectionName}):`, error);
  });
}

/**
 * Save a document to a room collection
 */
export async function saveDocument(roomCode, collectionName, data) {
  const colRef = getRoomCollection(roomCode, collectionName);
  if (!colRef) return;
  const docRef = doc(colRef, data.id);
  await setDoc(docRef, data);
}

/**
 * Delete a document from a room collection
 */
export async function deleteDocument(roomCode, collectionName, docId) {
  const colRef = getRoomCollection(roomCode, collectionName);
  if (!colRef) return;
  const docRef = doc(colRef, docId);
  await deleteDoc(docRef);
}

/**
 * Save room metadata (members, settings)
 */
export async function saveRoomMeta(roomCode, data) {
  const firestore = getDb();
  if (!firestore || !roomCode) return;
  const docRef = doc(firestore, 'trips', roomCode);
  await setDoc(docRef, data, { merge: true });
}

/**
 * Subscribe to room metadata
 */
export function subscribeToRoomMeta(roomCode, onData) {
  const firestore = getDb();
  if (!firestore || !roomCode) return () => {};
  const docRef = doc(firestore, 'trips', roomCode);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      onData(docSnap.data());
    }
  });
}

/**
 * Get room metadata once (without subscribing)
 */
export async function getRoomMeta(roomCode) {
  const firestore = getDb();
  if (!firestore || !roomCode) return null;
  const docRef = doc(firestore, 'trips', roomCode);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
}

/**
 * Generate a 6-character room code
 */
export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Save an activity log entry
 */
export async function saveActivityLog(roomCode, logData) {
  const colRef = getRoomCollection(roomCode, 'activityLogs');
  if (!colRef) return;
  const docRef = doc(colRef, logData.id);
  await setDoc(docRef, logData);
}

/**
 * Subscribe to activity logs in real-time
 */
export function subscribeToActivityLogs(roomCode, onData) {
  const colRef = getRoomCollection(roomCode, 'activityLogs');
  if (!colRef) return () => {};

  const q = query(colRef);
  return onSnapshot(q, (snapshot) => {
    const items = [];
    snapshot.forEach(docSnap => {
      items.push({ ...docSnap.data(), id: docSnap.id });
    });
    // Sort by timestamp descending
    items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    onData(items);
  }, (error) => {
    console.error('Activity logs subscription error:', error);
  });
}
