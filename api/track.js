import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const { link, url } = req.query;

  if (!url) return res.status(400).json({ error: 'Missing url' });

  const day = new Date().toISOString().slice(0, 10);
  const name = link || 'unknown';

  // Await writes before redirecting so data is committed immediately
  await Promise.all([
    kv.incr('clicks:total'),
    kv.incr(`clicks:link:${name}`),
    kv.incr(`clicks:day:${day}`),
    kv.lpush('clicks:recent', JSON.stringify({ link: name, url, at: new Date().toISOString() })),
    kv.ltrim('clicks:recent', 0, 49),
  ]).catch(() => {});

  res.redirect(302, url);
}
