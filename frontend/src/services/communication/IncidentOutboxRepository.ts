// ResQGrid AI — Persistent IndexedDB Incident Outbox Repository
// Guarantees emergency reports survive browser crashes, tab reloads, and network outages.

import { OutboxRecord, ChannelType, ChannelDeliveryStatus } from './types';

const DB_NAME = 'ResQGrid_Emergency_DB_v1';
const DB_VERSION = 1;
const STORE_NAME = 'incident_outbox';
const LOCAL_STORAGE_FALLBACK_KEY = 'resqgrid_emergency_outbox_fallback_v1';

class IncidentOutboxRepository {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('[ResQGrid Outbox] IndexedDB not available, using LocalStorage fallback.');
      return Promise.reject(new Error('IndexedDB not supported'));
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('incident_id', 'incident_id', { unique: false });
          store.createIndex('sync_status', 'sync_status', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
          store.createIndex('idempotency_key', 'idempotency_key', { unique: true });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        console.warn('[ResQGrid Outbox] IndexedDB open error, falling back to LocalStorage:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Save or update an emergency report record in persistent storage.
   */
  async saveRecord(record: OutboxRecord): Promise<void> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(record);

        req.onsuccess = () => {
          this.backupToLocalStorage(record);
          resolve();
        };
        req.onerror = () => {
          this.backupToLocalStorage(record);
          reject(req.error);
        };
      });
    } catch (e) {
      this.backupToLocalStorage(record);
    }
  }

  /**
   * Get all outbox records, sorted by creation timestamp (newest first).
   */
  async getAllRecords(): Promise<OutboxRecord[]> {
    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          const records: OutboxRecord[] = req.result || [];
          records.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          resolve(records);
        };
        req.onerror = () => {
          resolve(this.getFromLocalStorage());
        };
      });
    } catch {
      return this.getFromLocalStorage();
    }
  }

  /**
   * Get pending or unsynced records that require channel transmission.
   */
  async getPendingRecords(): Promise<OutboxRecord[]> {
    const all = await this.getAllRecords();
    return all.filter(r => r.sync_status === 'PENDING');
  }

  /**
   * Update status for a specific communication channel on an existing outbox record.
   */
  async updateChannelStatus(
    messageId: string,
    channel: ChannelType,
    status: ChannelDeliveryStatus,
    details?: { ackId?: string; error?: string; isSimulated?: boolean }
  ): Promise<OutboxRecord | null> {
    const all = await this.getAllRecords();
    const record = all.find(r => r.id === messageId);
    if (!record) return null;

    record.updated_at = new Date().toISOString();
    const curChannelStatus = record.channel_status[channel] || {
      status: 'QUEUED',
      attempt_count: 0,
      last_attempt: null
    };

    curChannelStatus.status = status;
    curChannelStatus.attempt_count += 1;
    curChannelStatus.last_attempt = new Date().toISOString();
    if (details?.ackId) curChannelStatus.acknowledgement_id = details.ackId;
    if (details?.error) curChannelStatus.error = details.error;
    if (details?.isSimulated !== undefined) curChannelStatus.is_simulated = details.isSimulated;

    record.channel_status[channel] = curChannelStatus;

    // Check if at least one critical channel has confirmed delivery
    const hasConfirmedAck = Object.values(record.channel_status).some(
      s => s.status === 'SERVER_ACCEPTED' || s.status === 'ACKNOWLEDGED'
    );

    if (hasConfirmedAck) {
      record.sync_status = 'SYNCED';
    }

    await this.saveRecord(record);
    return record;
  }

  /**
   * Delete an emergency record by message ID.
   */
  async deleteRecord(messageId: string): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(messageId);
    } catch { /* fallback */ }
    this.removeFromLocalStorage(messageId);
  }

  // ──────────────── LOCAL STORAGE FALLBACK ────────────────

  private backupToLocalStorage(record: OutboxRecord) {
    try {
      const existing = this.getFromLocalStorage();
      const idx = existing.findIndex(r => r.id === record.id);
      if (idx >= 0) {
        existing[idx] = record;
      } else {
        existing.unshift(record);
      }
      localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, JSON.stringify(existing.slice(0, 100)));
    } catch { /* storage full */ }
  }

  private getFromLocalStorage(): OutboxRecord[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private removeFromLocalStorage(messageId: string) {
    try {
      const existing = this.getFromLocalStorage().filter(r => r.id !== messageId);
      localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, JSON.stringify(existing));
    } catch { /* ignore */ }
  }
}

export const incidentOutboxRepository = new IncidentOutboxRepository();
