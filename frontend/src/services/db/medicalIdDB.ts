// IndexedDB local storage engine for Medical ID and GPS coordinate caching
import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface MedicalIDRecord {
  id: string;
  fullName: string;
  bloodType: string;
  allergies: string[];
  chronicConditions: string[];
  medications: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
  updatedAt: string;
}

export interface CachedGPSLocation {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  timestamp: number;
}

interface ResQGridDB extends DBSchema {
  medical_id: {
    key: string;
    value: MedicalIDRecord;
  };
  cached_gps: {
    key: string;
    value: CachedGPSLocation;
  };
  offline_sos_log: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'resqgrid_offline_mesh_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ResQGridDB>> | null = null;

export function getDatabase(): Promise<IDBPDatabase<ResQGridDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ResQGridDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('medical_id')) {
          db.createObjectStore('medical_id', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cached_gps')) {
          db.createObjectStore('cached_gps', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('offline_sos_log')) {
          db.createObjectStore('offline_sos_log', { keyPath: 'packetId' });
        }
      },
    });
  }
  return dbPromise;
}

const DEFAULT_RECORD: MedicalIDRecord = {
  id: 'current_user_profile',
  fullName: 'Priyanka Mohapatra',
  bloodType: 'O-Negative (Universal)',
  allergies: ['Severe Penicillin Anaphylaxis', 'Shellfish Allergy'],
  chronicConditions: ['Asthma (Rescue Inhaler Required)', 'Type-1 Diabetes'],
  medications: ['Salbutamol 100mcg', 'Insulin Glargine'],
  emergencyContactName: 'Debabrata Mohapatra (Father)',
  emergencyContactPhone: '+91 94370 12345',
  notes: 'Inhaler stored in outer backpack pocket.',
  updatedAt: new Date().toISOString()
};

// Retrieve Medical ID from IndexedDB
export async function getMedicalIDRecord(): Promise<MedicalIDRecord> {
  try {
    const db = await getDatabase();
    const record = await db.get('medical_id', 'current_user_profile');
    if (record) return record;
  } catch (e) {
    console.warn('IndexedDB read fallback:', e);
  }
  return DEFAULT_RECORD;
}

// Save Medical ID to IndexedDB
export async function saveMedicalIDRecord(profile: Partial<MedicalIDRecord>): Promise<MedicalIDRecord> {
  const current = await getMedicalIDRecord();
  const updated: MedicalIDRecord = {
    ...current,
    ...profile,
    id: 'current_user_profile',
    updatedAt: new Date().toISOString()
  };
  try {
    const db = await getDatabase();
    await db.put('medical_id', updated);
  } catch (e) {
    console.warn('IndexedDB save fallback:', e);
  }
  return updated;
}

// Cache Last Known GPS Position
export async function cacheLastKnownGPS(lat: number, lon: number, accuracy: number): Promise<void> {
  try {
    const db = await getDatabase();
    await db.put('cached_gps', {
      id: 'last_known_position',
      latitude: lat,
      longitude: lon,
      accuracy,
      timestamp: Date.now()
    });
  } catch (e) {
    console.warn('IndexedDB GPS caching error:', e);
  }
}

// Get Cached GPS Position
export async function getLastKnownGPS(): Promise<CachedGPSLocation | null> {
  try {
    const db = await getDatabase();
    const pos = await db.get('cached_gps', 'last_known_position');
    return pos || null;
  } catch {
    return null;
  }
}
