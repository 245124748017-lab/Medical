import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { BaseDocument, toDbRow, fromDbRow } from './supabaseModel.js';
import crypto from 'crypto';

const TABLE_NAME = 'users';

class User extends BaseDocument {
  constructor(data = {}) {
    super(data, TABLE_NAME);
  }

  static async findOne(filter = {}) {
    const dbFilter = toDbRow(filter);
    if (!isSupabaseConfigured()) {
      return null;
    }

    let query = supabase.from(TABLE_NAME).select('*');
    for (const [key, val] of Object.entries(dbFilter)) {
      query = query.eq(key, val);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data ? new User(fromDbRow(data)) : null;
  }

  static async findOneAndUpdate(filter = {}, updateData = {}, options = {}) {
    const dbFilter = toDbRow(filter);
    const dbUpdate = toDbRow(updateData);

    if (!isSupabaseConfigured()) {
      const mockUser = new User({
        _id: crypto.randomUUID(),
        firebaseUid: filter.firebaseUid || 'demo_user_clinician_01',
        email: updateData.email || 'dr.demo@medlens.health',
        name: updateData.name || 'Dr. Alex Vance, MD',
        role: updateData.role || 'clinician',
      });
      return mockUser;
    }

    const existing = await User.findOne(filter);
    if (existing) {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .update(dbUpdate)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return new User(fromDbRow(data));
    }

    if (options.upsert) {
      const newRow = {
        id: crypto.randomUUID(),
        ...dbFilter,
        ...dbUpdate,
      };
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(newRow)
        .select()
        .single();
      if (error) throw error;
      return new User(fromDbRow(data));
    }

    return null;
  }
}

export default User;
