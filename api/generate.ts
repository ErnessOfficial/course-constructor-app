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
    const { prompt } = (req.body || {}) as { prompt?: string };
    const textPrompt = String(prompt || '').slice(0, 8000);
    if (!textPrompt) throw new Error('Missing prompt');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured on server');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: textPrompt }]}]
      })
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`Gemini error ${resp.status}: ${t}`);
    }
    const json = await resp.json();
    const outText = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('\n') || '';
    res.status(200).json({ text: outText });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Bad Request' });
  }
}

