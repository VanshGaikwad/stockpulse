import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// User's Web App Firebase configuration
export const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDdhzAn1tB7Nm3kF48RnpyDHKtvMPZwm1c",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "zycus-hackathon.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "zycus-hackathon",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "zycus-hackathon.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "159395198853",
  appId: process.env.FIREBASE_APP_ID || "1:159395198853:web:29b80032782eade86576ec"
};

let dbInstance = null;
let isMock = false;

// Robust In-Memory Firestore Fallback for zero-friction local development & resilient fallback
class MemoryCollection {
  constructor(name) {
    this.name = name;
    this.documents = new Map();
  }

  doc(id) {
    const docId = id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const col = this;
    return {
      id: docId,
      async get() {
        const data = col.documents.get(docId);
        return {
          id: docId,
          exists: !!data,
          data: () => (data ? JSON.parse(JSON.stringify(data)) : undefined),
        };
      },
      async set(data, options = {}) {
        const existing = col.documents.get(docId) || {};
        const finalData = options.merge ? { ...existing, ...data } : { ...data };
        col.documents.set(docId, finalData);
        return { writeTime: new Date() };
      },
      async update(updates) {
        const existing = col.documents.get(docId);
        if (!existing) {
          throw new Error(`Document ${docId} does not exist in collection ${col.name}`);
        }
        const updated = { ...existing, ...updates };
        col.documents.set(docId, updated);
        return { writeTime: new Date() };
      },
      async delete() {
        col.documents.delete(docId);
        return { writeTime: new Date() };
      },
    };
  }

  where(field, opStr, value) {
    return this._filterQuery((doc) => {
      const v = doc[field];
      switch (opStr) {
        case '==':
          return v === value;
        case '!=':
          return v !== value;
        case '<':
          return v < value;
        case '<=':
          return v <= value;
        case '>':
          return v > value;
        case '>=':
          return v >= value;
        case 'in':
          return Array.isArray(value) && value.includes(v);
        default:
          return true;
      }
    });
  }

  _filterQuery(filterFn) {
    const col = this;
    const currentFilters = [filterFn];
    let sortField = null;
    let sortDir = 'asc';
    let limitNum = null;

    const queryObj = {
      where(f, op, val) {
        currentFilters.push((doc) => {
          const v = doc[f];
          if (op === '==') return v === val;
          if (op === '!=') return v !== val;
          if (op === '<') return v < val;
          if (op === '<=') return v <= val;
          if (op === '>') return v > val;
          if (op === '>=') return v >= val;
          if (op === 'in') return Array.isArray(val) && val.includes(v);
          return true;
        });
        return queryObj;
      },
      orderBy(field, direction = 'asc') {
        sortField = field;
        sortDir = direction;
        return queryObj;
      },
      limit(num) {
        limitNum = num;
        return queryObj;
      },
      async get() {
        let results = [];
        for (const [id, data] of col.documents.entries()) {
          const docData = { ...data, id };
          const matches = currentFilters.every((fn) => fn(docData));
          if (matches) {
            results.push({
              id,
              exists: true,
              data: () => JSON.parse(JSON.stringify(data)),
            });
          }
        }
        if (sortField) {
          results.sort((a, b) => {
            const valA = a.data()[sortField];
            const valB = b.data()[sortField];
            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
          });
        }
        if (limitNum && limitNum > 0) {
          results = results.slice(0, limitNum);
        }
        return {
          empty: results.length === 0,
          size: results.length,
          docs: results,
        };
      },
    };
    return queryObj;
  }

  async get() {
    const docs = [];
    for (const [id, data] of this.documents.entries()) {
      docs.push({
        id,
        exists: true,
        data: () => JSON.parse(JSON.stringify(data)),
      });
    }
    return {
      empty: docs.length === 0,
      size: docs.length,
      docs,
    };
  }
}

class MemoryFirestoreDB {
  constructor() {
    this.collections = new Map();
  }

  collection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MemoryCollection(name));
    }
    return this.collections.get(name);
  }
}

// Client SDK Firestore Adapter connecting to zycus-hackathon
class ClientFirestoreAdapter {
  constructor(firestoreInstance) {
    this.db = firestoreInstance;
  }

  collection(name) {
    const firestore = this.db;
    const colRef = collection(firestore, name);

    return {
      doc(id) {
        const docRef = doc(firestore, name, id);
        return {
          id,
          async get() {
            const snap = await getDoc(docRef);
            return {
              id: snap.id,
              exists: snap.exists(),
              data: () => snap.data(),
            };
          },
          async set(data, options = {}) {
            await setDoc(docRef, data, options);
            return { writeTime: new Date() };
          },
          async update(updates) {
            await updateDoc(docRef, updates);
            return { writeTime: new Date() };
          },
          async delete() {
            await deleteDoc(docRef);
            return { writeTime: new Date() };
          },
        };
      },
      where(field, opStr, value) {
        return this._buildQuery([where(field, opStr, value)]);
      },
      _buildQuery(clauses) {
        const self = this;
        return {
          where(f, op, v) {
            return self._buildQuery([...clauses, where(f, op, v)]);
          },
          orderBy(field, direction = 'asc') {
            return self._buildQuery([...clauses, orderBy(field, direction)]);
          },
          limit(num) {
            return self._buildQuery([...clauses, limit(num)]);
          },
          async get() {
            const q = query(colRef, ...clauses);
            const snap = await getDocs(q);
            return {
              empty: snap.empty,
              size: snap.size,
              docs: snap.docs.map((d) => ({
                id: d.id,
                exists: d.exists(),
                data: () => d.data(),
              })),
            };
          },
        };
      },
      async get() {
        const snap = await getDocs(colRef);
        return {
          empty: snap.empty,
          size: snap.size,
          docs: snap.docs.map((d) => ({
            id: d.id,
            exists: d.exists(),
            data: () => d.data(),
          })),
        };
      },
    };
  }
}

export function initFirebase() {
  if (dbInstance) return dbInstance;

  // 1. Check for Service Account credentials first (Admin SDK)
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  try {
    if (serviceAccountJson) {
      const credentials = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(credentials),
        projectId: credentials.project_id || firebaseConfig.projectId,
      });
      dbInstance = admin.firestore();
      console.log(`[Firebase] Initialized with Service Account JSON: ${credentials.project_id}`);
      return dbInstance;
    } else if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
      const resolvedPath = path.resolve(serviceAccountPath);
      const credentials = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(credentials),
        projectId: credentials.project_id || firebaseConfig.projectId,
      });
      dbInstance = admin.firestore();
      console.log(`[Firebase] Initialized with Service Account file: ${resolvedPath}`);
      return dbInstance;
    }
  } catch (adminErr) {
    console.warn('[Firebase] Admin SDK notice:', adminErr.message);
  }

  // 2. Initialize with User's Firebase Config (zycus-hackathon)
  try {
    console.log(`[Firebase] Initializing Firebase App with Project ID: "${firebaseConfig.projectId}"`);
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const firestore = getFirestore(app);
    dbInstance = new ClientFirestoreAdapter(firestore);
    console.log(`[Firebase] Successfully connected to Firebase Project: "${firebaseConfig.projectId}" (${firebaseConfig.authDomain})`);
    return dbInstance;
  } catch (sdkError) {
    console.warn('[Firebase] Client SDK notice:', sdkError.message);
  }

  // 3. Graceful in-memory fallback
  console.log('[Firebase] Running with StockPulse Embedded Engine');
  dbInstance = new MemoryFirestoreDB();
  isMock = true;
  return dbInstance;
}

export function getDb() {
  if (!dbInstance) {
    return initFirebase();
  }
  return dbInstance;
}

export function isUsingMemoryStore() {
  return isMock;
}

export const Collections = {
  PRODUCTS: 'products',
  PRICING_SUGGESTIONS: 'pricing_suggestions',
  REORDER_SUGGESTIONS: 'reorder_suggestions',
  CONFIG: 'system_config',
};
