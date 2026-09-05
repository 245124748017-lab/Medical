import app from './app.js';
import dotenv from 'dotenv';
import { isSupabaseConfigured } from './config/supabase.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Check Database Connection
if (isSupabaseConfigured()) {
  console.log('MedLens Database: Supabase PostgreSQL connected via service-role.');
} else {
  console.log('MedLens Database: Supabase not configured in current environment. Local fallback active.');
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MedLens Backend running on port ${PORT}`);
  console.log(`Health check at: http://localhost:${PORT}/api/health`);
});