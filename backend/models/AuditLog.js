import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { BaseDocument, toDbRow, fromDbRow } from './supabaseModel.js';
import Patient from './Patient.js';
import crypto from 'crypto';

const TABLE_NAME = 'audit_logs';
let demoAuditLogs = [];

class AuditLogQuery {
  constructor(filter = {}) {
    this._filter = filter;
    this._sort = null;
    this._limit = null;
    this._populate = [];
  }

  sort(sortObj) {
    this._sort = sortObj;
    return this;
  }

  limit(num) {
    this._limit = num;
    return this;
  }

  populate(field, selectFields) {
    this._populate.push({ field, selectFields });
    return this;
  }

  lean() {
    return this;
  }

  async then(resolve, reject) {
    try {
      if (!isSupabaseConfigured()) {
        let results = [...demoAuditLogs];
        if (this._filter.patientId) {
          results = results.filter((a) => a.patientId === this._filter.patientId);
        }
        if (this._filter.reportId) {
          results = results.filter((a) => a.reportId === this._filter.reportId);
        }
        if (this._filter.userId) {
          results = results.filter((a) => a.userId === this._filter.userId);
        }
        if (this._limit) {
          results = results.slice(0, this._limit);
        }
        return resolve(results.map((a) => new AuditLog(a)));
      }

      let query = supabase.from(TABLE_NAME).select('*');

      if (this._filter.patientId) {
        query = query.eq('patient_id', this._filter.patientId);
      }
      if (this._filter.reportId) {
        query = query.eq('report_id', this._filter.reportId);
      }
      if (this._filter.userId) {
        query = query.eq('user_id', this._filter.userId);
      }

      query = query.order('timestamp', { ascending: false });

      if (this._limit) {
        query = query.limit(this._limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      const list = (data || []).map((row) => new AuditLog(fromDbRow(row)));

      if (this._populate.some((p) => p.field === 'patientId') && list.length > 0) {
        const patientIds = [...new Set(list.map((a) => a.patientId).filter(Boolean))];
        const patients = await Patient.find({ _id: { $in: patientIds } });
        const patientMap = {};
        patients.forEach((p) => {
          patientMap[p.id] = p;
          patientMap[p._id] = p;
        });
        list.forEach((a) => {
          if (a.patientId && patientMap[a.patientId]) {
            a.patientId = {
              _id: patientMap[a.patientId].id,
              name: patientMap[a.patientId].name,
            };
          }
        });
      }

      resolve(list);
    } catch (err) {
      reject(err);
    }
  }
}

class AuditLog extends BaseDocument {
  constructor(data = {}) {
    super(data, TABLE_NAME);
  }

  static find(filter = {}) {
    return new AuditLogQuery(filter);
  }

  static async create(data = {}) {
    if (Array.isArray(data)) {
      const logs = [];
      for (const item of data) {
        const log = await AuditLog.create(item);
        logs.push(log);
      }
      return logs;
    }

    const row = toDbRow(data);
    row.id = row.id || crypto.randomUUID();

    if (!isSupabaseConfigured()) {
      const log = new AuditLog({
        ...data,
        id: row.id,
        _id: row.id,
        timestamp: data.timestamp || new Date().toISOString(),
      });
      demoAuditLogs.push(log.toObject());
      return log;
    }

    const { data: created, error } = await supabase
      .from(TABLE_NAME)
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return new AuditLog(fromDbRow(created));
  }

  static async deleteMany(filter = {}) {
    if (!isSupabaseConfigured()) {
      if (filter.patientId) {
        demoAuditLogs = demoAuditLogs.filter((a) => a.patientId !== filter.patientId);
      }
      return { deletedCount: 1 };
    }

    let query = supabase.from(TABLE_NAME).delete();
    if (filter.patientId) {
      query = query.eq('patient_id', filter.patientId);
    }

    const { error } = await query;
    if (error) throw error;
    return { deletedCount: 1 };
  }
}

export default AuditLog;
