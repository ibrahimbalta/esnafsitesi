import { kv } from '@vercel/kv';

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
      const data = await kv.get(key);
      return res.status(200).json(data);
    } catch (err) {
      console.error(`Error reading key ${key} from Vercel KV:`, err);
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
      await kv.set(key, value);
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(`Error writing key ${key} to Vercel KV:`, err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).send('Method not allowed');
}
