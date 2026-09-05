import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { BaseDocument, toDbRow, fromDbRow } from './supabaseModel.js';
import Patient from './Patient.js';
import crypto from 'crypto';

const TABLE_NAME = 'medical_reports';
let demoReports = [];

class ReportQuery {
  constructor(filter = {}, single = false) {
    this._filter = filter;
    this._single = single;
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
        let results = [...demoReports];
        if (this._filter.patientId) {
          results = results.filter((r) => r.patientId === this._filter.patientId);
        }
        if (this._filter._id || this._filter.id) {
          const id = this._filter._id || this._filter.id;
          results = results.filter((r) => r.id === id || r._id === id);
        }
        if (this._single) {
          return resolve(results[0] ? new MedicalReport(results[0]) : null);
        }
        return resolve(results.map((r) => new MedicalReport(r)));
      }

      let query = supabase.from(TABLE_NAME).select('*');

      if (this._filter.patientId) {
        query = query.eq('patient_id', this._filter.patientId);
      }
      if (this._filter._id || this._filter.id) {
        query = query.eq('id', this._filter._id || this._filter.id);
      }
      if (this._filter.fileName) {
        query = query.eq('file_name', this._filter.fileName);
      }
      if (this._filter._id?.$ne) {
        query = query.neq('id', this._filter._id.$ne);
      }
      if (this._filter.verificationStatus) {
        query = query.eq('verification_status', this._filter.verificationStatus);
      }

      if (this._sort?.reportDate === -1 || this._sort?.report_date === -1) {
        query = query.order('report_date', { ascending: false });
      } else if (this._sort?.uploadedAt === -1 || this._sort?.uploaded_at === -1) {
        query = query.order('uploaded_at', { ascending: false });
      }

      if (this._single) {
        const { data, error } = await query.maybeSingle();
        if (error) throw error;
        if (!data) return resolve(null);
        const report = new MedicalReport(fromDbRow(data));
        if (this._populate.some((p) => p.field === 'patientId')) {
          report.patientId = await Patient.findById(report.patientId);
        }
        return resolve(report);
      }

      const { data, error } = await query;
      if (error) throw error;
      const list = (data || []).map((row) => new MedicalReport(fromDbRow(row)));
      resolve(list);
    } catch (err) {
      reject(err);
    }
  }
}

class MedicalReport extends BaseDocument {
  constructor(data = {}) {
    super(data, TABLE_NAME);
  }

  static find(filter = {}) {
    return new ReportQuery(filter, false);
  }

  static findOne(filter = {}) {
    return new ReportQuery(filter, true);
  }

  static findById(id) {
    return new ReportQuery({ id }, true);
  }

  static async create(data = {}) {
    const row = toDbRow(data);
    row.id = row.id || crypto.randomUUID();

    if (!isSupabaseConfigured()) {
      const rep = new MedicalReport({
        ...data,
        id: row.id,
        _id: row.id,
        uploadedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      demoReports.push(rep.toObject());
      return rep;
    }

    const { data: created, error } = await supabase
      .from(TABLE_NAME)
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return new MedicalReport(fromDbRow(created));
  }

  static async countDocuments(filter = {}) {
    if (!isSupabaseConfigured()) {
      if (filter.verificationStatus) {
        return demoReports.filter((r) => r.verificationStatus === filter.verificationStatus).length;
      }
      return demoReports.length;
    }

    let query = supabase.from(TABLE_NAME).select('*', { count: 'exact', head: true });
    if (filter.verificationStatus) {
      query = query.eq('verification_status', filter.verificationStatus);
    }
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }

  static async deleteMany(filter = {}) {
    if (!isSupabaseConfigured()) {
      if (filter.patientId) {
        demoReports = demoReports.filter((r) => r.patientId !== filter.patientId);
      }
      return { deletedCount: 1 };
    }

    if (filter.patientId) {
      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('patient_id', filter.patientId);
      if (error) throw error;
    }
    return { deletedCount: 1 };
  }

  static async aggregate(pipeline = []) {
    // Pipeline is used for { $match: { patientId: { $in: patientIds } } }, { $group: { _id: '$patientId', count: ... } }
    if (!isSupabaseConfigured()) {
      const counts = {};
      demoReports.forEach((r) => {
        counts[r.patientId] = counts[r.patientId] || { count: 0, pending: 0 };
        counts[r.patientId].count++;
        if (r.verificationStatus === 'PENDING') counts[r.patientId].pending++;
      });
      return Object.entries(counts).map(([patientId, stat]) => ({
        _id: patientId,
        count: stat.count,
        pendingCount: stat.pending,
      }));
    }

    // Retrieve reports to aggregate
    const matchStage = pipeline.find((stage) => stage.$match);
    const patientIds = matchStage?.$match?.patientId?.$in;

    let query = supabase.from(TABLE_NAME).select('patient_id, verification_status');
    if (patientIds && Array.isArray(patientIds) && patientIds.length > 0) {
      query = query.in('patient_id', patientIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    const countMap = {};
    (data || []).forEach((row) => {
      const pid = row.patient_id;
      if (!countMap[pid]) {
        countMap[pid] = { count: 0, pendingCount: 0 };
      }
      countMap[pid].count++;
      if (row.verification_status === 'PENDING') {
        countMap[pid].pendingCount++;
      }
    });

    return Object.entries(countMap).map(([pId, val]) => ({
      _id: pId,
      count: val.count,
      pendingCount: val.pendingCount,
    }));
  }
}

export default MedicalReport;
