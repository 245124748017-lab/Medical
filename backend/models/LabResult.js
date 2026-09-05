import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { BaseDocument, toDbRow, fromDbRow } from './supabaseModel.js';
import MedicalReport from './MedicalReport.js';
import crypto from 'crypto';

const TABLE_NAME = 'lab_results';
let demoLabResults = [];

class LabResultQuery {
  constructor(filter = {}) {
    this._filter = filter;
    this._sort = null;
    this._populate = [];
  }

  sort(sortObj) {
    this._sort = sortObj;
    return this;
  }

  populate(field, selectFields) {
    this._populate.push({ field, selectFields });
    return this;
  }

  async then(resolve, reject) {
    try {
      if (!isSupabaseConfigured()) {
        let results = [...demoLabResults];
        if (this._filter.patientId) {
          results = results.filter((l) => l.patientId === this._filter.patientId);
        }
        if (this._filter.reportId) {
          if (this._filter.reportId?.$ne) {
            results = results.filter((l) => l.reportId !== this._filter.reportId.$ne);
          } else {
            results = results.filter((l) => l.reportId === this._filter.reportId);
          }
        }
        if (this._filter.isRejected !== undefined) {
          results = results.filter((l) => l.isRejected === this._filter.isRejected);
        }
        return resolve(results.map((l) => new LabResult(l)));
      }

      let query = supabase.from(TABLE_NAME).select('*');

      if (this._filter.reportId) {
        if (this._filter.reportId?.$ne) {
          query = query.neq('report_id', this._filter.reportId.$ne);
        } else {
          query = query.eq('report_id', this._filter.reportId);
        }
      }
      if (this._filter.patientId) {
        query = query.eq('patient_id', this._filter.patientId);
      }
      if (this._filter.isRejected !== undefined) {
        query = query.eq('is_rejected', this._filter.isRejected);
      }

      if (this._sort?.createdAt === 1 || this._sort?.created_at === 1) {
        query = query.order('created_at', { ascending: true });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      const list = (data || []).map((row) => new LabResult(fromDbRow(row)));

      // Populate reportId if requested
      if (this._populate.some((p) => p.field === 'reportId') && list.length > 0) {
        const reportIds = [...new Set(list.map((l) => l.reportId).filter(Boolean))];
        const reports = await MedicalReport.find({ _id: { $in: reportIds } });
        const reportMap = {};
        reports.forEach((r) => {
          reportMap[r.id] = r;
          reportMap[r._id] = r;
        });
        list.forEach((l) => {
          if (l.reportId && reportMap[l.reportId]) {
            l.reportId = reportMap[l.reportId];
          }
        });
      }

      resolve(list);
    } catch (err) {
      reject(err);
    }
  }
}

class LabResult extends BaseDocument {
  constructor(data = {}) {
    super(data, TABLE_NAME);
  }

  static find(filter = {}) {
    return new LabResultQuery(filter);
  }

  static async findById(id) {
    if (!isSupabaseConfigured()) {
      const match = demoLabResults.find((l) => l.id === id || l._id === id);
      return match ? new LabResult(match) : null;
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? new LabResult(fromDbRow(data)) : null;
  }

  static async create(data = {}) {
    if (Array.isArray(data)) {
      const results = [];
      for (const item of data) {
        const res = await LabResult.create(item);
        results.push(res);
      }
      return results;
    }

    const row = toDbRow(data);
    row.id = row.id || crypto.randomUUID();

    if (!isSupabaseConfigured()) {
      const res = new LabResult({
        ...data,
        id: row.id,
        _id: row.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      demoLabResults.push(res.toObject());
      return res;
    }

    const { data: created, error } = await supabase
      .from(TABLE_NAME)
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return new LabResult(fromDbRow(created));
  }

  static async deleteMany(filter = {}) {
    if (!isSupabaseConfigured()) {
      if (filter.reportId?.$in) {
        const ids = filter.reportId.$in;
        demoLabResults = demoLabResults.filter((l) => !ids.includes(l.reportId));
      } else if (filter.reportId) {
        demoLabResults = demoLabResults.filter((l) => l.reportId !== filter.reportId);
      }
      return { deletedCount: 1 };
    }

    let query = supabase.from(TABLE_NAME).delete();
    if (filter.reportId?.$in) {
      query = query.in('report_id', filter.reportId.$in);
    } else if (filter.reportId) {
      query = query.eq('report_id', filter.reportId);
    } else if (filter.patientId) {
      query = query.eq('patient_id', filter.patientId);
    }

    const { error } = await query;
    if (error) throw error;
    return { deletedCount: 1 };
  }
}

export default LabResult;