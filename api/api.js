import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client using Vercel environment variables
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Admin-Password'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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

      return res.status(200).json(data.value);
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
