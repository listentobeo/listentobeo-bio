import { kv } from '@vercel/kv';

const LINK_KEYS = [
  'buy-art', 'portrait', 'mural', 'event-painting',
  'music-mrdj', 'tool-photo', 'tool-mural', 'aihdstudio', 'beoarts'
];

export default async function handler(req, res) {
  // Password gate
  const { password } = req.query;
  if (password !== process.env.DASHBOARD_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Fetch everything in parallel
  const [total, ...rest] = await Promise.all([
    kv.get('clicks:total'),
    ...LINK_KEYS.map(k => kv.get(`clicks:link:${k}`)),
  ]);

  // Build link totals
  const links = LINK_KEYS
    .map((name, i) => ({ name, count: rest[i] || 0 }))
    .filter(l => l.count > 0)
    .sort((a, b) => b.count - a.count);

  // Build last 30 days
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const dayCounts = await Promise.all(days.map(d => kv.get(`clicks:day:${d}`)));
  const daily = days.map((date, i) => ({ date, count: dayCounts[i] || 0 }));

  // Recent clicks
  const rawRecent = await kv.lrange('clicks:recent', 0, 19);
  const recent = rawRecent.map(r => typeof r === 'string' ? JSON.parse(r) : r);

  res.status(200).json({
    total: total || 0,
    links,
    daily,
    recent,
  });
}
