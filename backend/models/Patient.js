import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { BaseDocument, toDbRow, fromDbRow } from './supabaseModel.js';
import crypto from 'crypto';

const TABLE_NAME = 'patients';

// In-memory demo list when running in local development mode without Supabase
let demoPatients = [];

class PatientQuery {
  constructor(filter = {}) {
    this._filter = filter;
    this._sort = null;
    this._limit = null;
  }

  sort(sortObj) {
    this._sort = sortObj;
    return this;
  }

  limit(num) {
    this._limit = num;
    return this;
  }

  lean() {
    return this;
  }

  async then(resolve, reject) {
    try {
      if (!isSupabaseConfigured()) {
        let results = [...demoPatients];
        if (this._filter.userId) {
          results = results.filter((p) => p.userId === this._filter.userId);
        }
        if (this._filter._id) {
          results = results.filter((p) => p._id === this._filter._id);
        }
        if (this._limit) {
          results = results.slice(0, this._limit);
        }
        return resolve(results.map((p) => new Patient(p)));
      }

      let query = supabase.from(TABLE_NAME).select('*');

      if (this._filter.userId) {
        query = query.eq('user_id', this._filter.userId);
      }
      if (this._filter._id || this._filter.id) {
        query = query.eq('id', this._filter._id || this._filter.id);
      }
      if (this._filter.$or && Array.isArray(this._filter.$or)) {
        // e.g. search across name, notes
        const searchTerms = [];
        this._filter.$or.forEach((item) => {
          if (item.name?.$regex) searchTerms.push(`name.ilike.%${item.name.$regex}%`);
          if (item.notes?.$regex) searchTerms.push(`notes.ilike.%${item.notes.$regex}%`);
        });
        if (searchTerms.length > 0) {
          query = query.or(searchTerms.join(','));
        }
      }

      if (this._sort?.updatedAt === -1 || this._sort?.updated_at === -1) {
        query = query.order('updated_at', { ascending: false });
      } else if (this._sort?.createdAt === -1 || this._sort?.created_at === -1) {
        query = query.order('created_at', { ascending: false });
      }

      if (this._limit) {
        query = query.limit(this._limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      const list = (data || []).map((row) => new Patient(fromDbRow(row)));
      resolve(list);
    } catch (err) {
      reject(err);
    }
  }
}

class Patient extends BaseDocument {
  constructor(data = {}) {
    super(data, TABLE_NAME);
  }

  static find(filter = {}) {
    return new PatientQuery(filter);
  }

  static async findOne(filter = {}) {
    if (!isSupabaseConfigured()) {
      const match = demoPatients.find((p) => {
        if (filter._id && p._id !== filter._id && p.id !== filter._id) return false;
        if (filter.userId && p.userId !== filter.userId) return false;
        if (filter.name && p.name !== filter.name) return false;
        return true;
      });
      return match ? new Patient(match) : null;
    }

    let query = supabase.from(TABLE_NAME).select('*');
    if (filter._id || filter.id) {
      query = query.eq('id', filter._id || filter.id);
    }
    if (filter.userId) {
      query = query.eq('user_id', filter.userId);
    }
    if (filter.name) {
      query = query.eq('name', filter.name);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data ? new Patient(fromDbRow(data)) : null;
  }

  static async findById(id) {
    return Patient.findOne({ id });
  }

  static async create(data = {}) {
    const row = toDbRow(data);
    row.id = row.id || crypto.randomUUID();

    if (!isSupabaseConfigured()) {
      const p = new Patient({
        ...data,
        id: row.id,
        _id: row.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      demoPatients.push(p.toObject());
      return p;
    }

    const { data: created, error } = await supabase
      .from(TABLE_NAME)
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return new Patient(fromDbRow(created));
  }

  static async countDocuments(filter = {}) {
    if (!isSupabaseConfigured()) {
      if (filter.userId) {
        return demoPatients.filter((p) => p.userId === filter.userId).length;
      }
      return demoPatients.length;
    }

    let query = supabase.from(TABLE_NAME).select('*', { count: 'exact', head: true });
    if (filter.userId) {
      query = query.eq('user_id', filter.userId);
    }
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }

  static async deleteOne(filter = {}) {
    const id = filter._id || filter.id;
    if (!isSupabaseConfigured()) {
      demoPatients = demoPatients.filter((p) => p.id !== id && p._id !== id);
      return { deletedCount: 1 };
    }

    if (id) {
      const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id);
      if (error) throw error;
    }
    return { deletedCount: 1 };
  }
}

export default Patient;
