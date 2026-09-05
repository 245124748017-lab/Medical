import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import crypto from 'crypto';

// In-memory fallback database when running without active Supabase credentials
const memoryStore = {
  users: [],
  patients: [],
  medical_reports: [],
  lab_results: [],
  audit_logs: [],
};

// Map JavaScript camelCase to PostgreSQL snake_case
const camelToSnake = (str) =>
  str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

// Map PostgreSQL snake_case to JavaScript camelCase
const snakeToCamel = (str) =>
  str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());

export const toDbRow = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const row = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key === '_id' || key === 'id') {
      if (val) row.id = val;
    } else {
      row[camelToSnake(key)] = val;
    }
  }
  return row;
};

export const fromDbRow = (row, ModelClass) => {
  if (!row || typeof row !== 'object') return row;
  const doc = {};
  for (const [key, val] of Object.entries(row)) {
    const camelKey = snakeToCamel(key);
    doc[camelKey] = val;
  }
  // Ensure both _id and id are always present
  doc._id = row.id;
  doc.id = row.id;

  // If ModelClass provided, wrap with helper methods (e.g. .save(), .toObject())
  if (ModelClass) {
    return new ModelClass(doc);
  }
  return doc;
};

export class BaseDocument {
  constructor(data = {}, tableName = '') {
    Object.assign(this, data);
    this._tableName = tableName;
    if (this.id && !this._id) this._id = this.id;
    if (this._id && !this.id) this.id = this._id;
  }

  toObject() {
    const copy = { ...this };
    delete copy._tableName;
    return copy;
  }

  toJSON() {
    return this.toObject();
  }

  async save() {
    const tableName = this._tableName;
    const row = toDbRow(this.toObject());
    const id = row.id;

    if (!isSupabaseConfigured()) {
      const list = memoryStore[tableName] || [];
      const idx = list.findIndex((item) => item.id === id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...row, updated_at: new Date().toISOString() };
      } else {
        row.id = row.id || crypto.randomUUID();
        row.created_at = new Date().toISOString();
        row.updated_at = row.created_at;
        list.push(row);
        this.id = row.id;
        this._id = row.id;
      }
      return this;
    }

    if (id) {
      const { data, error } = await supabase
        .from(tableName)
        .update(row)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      Object.assign(this, fromDbRow(data));
      return this;
    } else {
      const { data, error } = await supabase
        .from(tableName)
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      Object.assign(this, fromDbRow(data));
      return this;
    }
  }
}
