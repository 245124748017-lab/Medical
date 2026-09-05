import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = () => {
  return !!(
    supabaseUrl &&
    supabaseServiceRoleKey &&
    supabaseUrl.trim() !== '' &&
    supabaseServiceRoleKey.trim() !== '' &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    supabaseServiceRoleKey !== 'your-service-role-key'
  );
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

export const getSupabaseClient = () => {
  if (!supabase) {
    throw new Error(
      'Supabase client is not configured. Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.'
    );
  }
  return supabase;
};

export default supabase;
