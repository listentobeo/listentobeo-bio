import { kv } from '@vercel/kv';

const LINK_KEYS = [
  'buy-art', 'portrait', 'mural', 'event-painting',
  'music-mrdj', 'tool-photo', 'tool-mural', 'aihdstudio', 'beoarts'
];

const RANGE_DAYS = {
  '24h': 1,
  '7d': 7,
  '30d': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
  '2y': 730,
};

export default async function handler(req, res) {
  const { password, range = '30d' } = req.query;

  if (password !== process.env.DASHBOARD_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const days = RANGE_DAYS[range] || 30;

  // Build date list
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  // Fetch everything in parallel using mget for efficiency
  const dayKeys = dates.map(d => `clicks:day:${d}`);
  const linkKeys = LINK_KEYS.map(k => `clicks:link:${k}`);

  const [total, dayValues, linkValues] = await Promise.all([
    kv.get('clicks:total'),
    kv.mget(...dayKeys),
    kv.mget(...linkKeys),
  ]);

  // Daily data
  const daily = dates.map((date, i) => ({ date, count: dayValues[i] || 0 }));

  // Link totals within the selected range
  const rangeTotal = daily.reduce((sum, d) => sum + d.count, 0);

  // Link breakdown (all-time counts per link, filtered by range via proportion if needed)
  // For simplicity we keep all-time link counts and note the range total separately
  const links = LINK_KEYS
    .map((name, i) => ({ name, count: linkValues[i] || 0 }))
    .filter(l => l.count > 0)
    .sort((a, b) => b.count - a.count);

  // Recent clicks (always last 20 regardless of range)
  const rawRecent = await kv.lrange('clicks:recent', 0, 19);
  const recent = rawRecent.map(r => typeof r === 'string' ? JSON.parse(r) : r);

  res.status(200).json({
    total: total || 0,
    rangeTotal,
    range,
    days,
    links,
    daily,
    recent,
  });
}
