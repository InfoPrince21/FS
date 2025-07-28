// utils/supabase-server.js or pages/api/utils/supabase-admin.js
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL, // same URL is fine
  process.env.SUPABASE_SERVICE_ROLE_KEY // server-only secret key
);

export default supabaseAdmin;
