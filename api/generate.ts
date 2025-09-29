// Vercel serverless function: /api/generate
// Usa la clave en process.env.GEMINI_API_KEY y llama a la API REST de Gemini

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { prompt } = (body) as { prompt?: string };
    const textPrompt = String(prompt || '').slice(0, 8000);
    if (!textPrompt) throw new Error('Missing prompt');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured on server');

    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: textPrompt }]}] })
    });
    const raw = await resp.text();
    if (!resp.ok) {
      let errMsg = raw;
      try { const j = JSON.parse(raw); errMsg = j?.error?.message || j?.message || errMsg; } catch {}
      res.status(resp.status).json({ error: `Gemini error ${resp.status}: ${errMsg}` });
      return;
    }
    let json: any = {};
    try { json = JSON.parse(raw); } catch { json = raw; }
    // Safety / prompt feedback handling
    const promptFeedback = json?.promptFeedback;
    if (promptFeedback?.blockReason) {
      res.status(400).json({ error: `Request blocked: ${promptFeedback.blockReason}` });
      return;
    }
    const parts = json?.candidates?.[0]?.content?.parts || [];
    const outText = parts.map((p: any) => p?.text).filter(Boolean).join('\n');
    res.status(200).json({ text: outText });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Bad Request' });
  }
}
