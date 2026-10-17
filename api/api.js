import { createClient } from '@supabase/supabase-js';

// Safe Supabase client resolver with fallback to request headers or env variables
function getSupabaseClient(req) {
  const url = process.env.SUPABASE_URL || req.headers['x-supabase-url'];
  const key = process.env.SUPABASE_KEY || req.headers['x-supabase-key'];

  if (!url || !key) {
    return null;
  }

  try {
    return createClient(url, key);
  } catch (err) {
    console.error('Supabase client creation error:', err);
    return null;
  }
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Admin-Password, X-Supabase-Url, X-Supabase-Key'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = getSupabaseClient(req);
  if (!supabase) {
    return res.status(503).json({
      error: 'SUPABASE_NOT_CONFIGURED',
      message: 'Supabase URL veya API Key yapılandırılmamış. Lütfen Admin Ayarlarından veya Vercel panelinden Supabase bilgilerinizi ekleyin.'
    });
  }

  const { method } = req;

  if (method === 'GET') {
    const { key } = req.query;
    if (!key) {
      return res.status(400).json({ error: 'Missing key parameter' });
    }

    try {
      const { data, error } = await supabase
        .from('store')
        .select('value')
        .eq('key', key)
        .single();

      if (error && error.code === 'PGRST116') {
        // Row not found — return null (same behavior as before)
        return res.status(200).json(null);
      }

      if (error) {
        console.error(`Supabase GET error for key "${key}":`, error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data ? data.value : null);
    } catch (err) {
      console.error(`Error reading key "${key}" from Supabase:`, err);
      return res.status(500).json({ error: err.message });
    }
  }

  if (method === 'POST') {
    const { key, value } = req.body;
    if (!key) {
      return res.status(400).json({ error: 'Missing key or value' });
    }

    // Basic verification of admin password
    const adminPassword = req.headers['x-admin-password'];
    if (adminPassword !== '6032.,Elif.') {
      // Allow saving applications and reviews from the frontend without the admin password
      if (key !== 'applications' && key !== 'reviews') {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    try {
      const { error } = await supabase
        .from('store')
        .upsert({ key, value }, { onConflict: 'key' });

      if (error) {
        console.error(`Supabase POST error for key "${key}":`, error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(`Error writing key "${key}" to Supabase:`, err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).send('Method not allowed');
}
