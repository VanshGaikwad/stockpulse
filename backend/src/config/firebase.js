import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

let dbInstance = null;
let isMock = false;

// Robust In-Memory Firestore Adapter for zero-friction local development & evaluation
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

export function initFirebase() {
  if (dbInstance) return dbInstance;

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  try {
    if (admin.apps.length > 0) {
      dbInstance = admin.firestore();
      console.log('[Firebase] Using existing initialized Firebase Admin instance');
      return dbInstance;
    }

    if (serviceAccountJson) {
      const credentials = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(credentials),
        projectId: credentials.project_id || projectId,
      });
      dbInstance = admin.firestore();
      console.log(`[Firebase] Initialized with Service Account JSON. Project: ${credentials.project_id || projectId}`);
      return dbInstance;
    } else if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
      const resolvedPath = path.resolve(serviceAccountPath);
      const credentials = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(credentials),
        projectId: credentials.project_id || projectId,
      });
      dbInstance = admin.firestore();
      console.log(`[Firebase] Initialized with Service Account file: ${resolvedPath}`);
      return dbInstance;
    } else if (process.env.FIRESTORE_EMULATOR_HOST) {
      admin.initializeApp({
        projectId: projectId || 'stockpulse-dev',
      });
      dbInstance = admin.firestore();
      console.log(`[Firebase] Connected to Firestore Emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
      return dbInstance;
    } else if (projectId) {
      admin.initializeApp({
        projectId,
      });
      dbInstance = admin.firestore();
      console.log(`[Firebase] Initialized with Google Cloud Project ID: ${projectId}`);
      return dbInstance;
    }
  } catch (error) {
    console.warn('[Firebase] Notice: Cloud credentials initialization error:', error.message);
  }

  // Graceful in-memory Firestore engine for instant 5-minute zero-dependency evaluation
  console.log('[Firebase] Running with StockPulse Embedded Firestore Engine (Zero Config Mode)');
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
