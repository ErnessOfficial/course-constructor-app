// Vercel serverless function: /api/generate
// Usa la clave en process.env.GEMINI_API_KEY y llama a la API REST de Gemini

export default async function handler(req: any, res: any) {
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

    const preferred = (process.env.GEMINI_MODEL || '').trim();
    const modelCandidates = Array.from(new Set([
      preferred || 'gemini-1.5-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ])).filter(Boolean);

    const apiVersions = ['v1', 'v1beta'];
    const errors: Array<{ version: string, model: string, status: number, message: string }> = [];

    let okText = '';
    for (const version of apiVersions) {
      for (const model of modelCandidates) {
        const url = `https://generativelanguage.googleapis.com/${version}/models/${encodeURIComponent(model)}:generateContent`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: textPrompt }]}] })
        });
        const raw = await resp.text();
        if (resp.ok) {
          try {
            const json = JSON.parse(raw);
            const promptFeedback = json?.promptFeedback;
            if (promptFeedback?.blockReason) {
              res.status(400).json({ error: `Request blocked: ${promptFeedback.blockReason}` });
              return;
            }
            const parts = json?.candidates?.[0]?.content?.parts || [];
            okText = parts.map((p: any) => p?.text).filter(Boolean).join('\n');
            res.status(200).json({ text: okText, model, version });
            return;
          } catch (e: any) {
            res.status(200).json({ text: raw, model, version });
            return;
          }
        } else {
          let msg = raw;
          try { const j = JSON.parse(raw); msg = j?.error?.message || j?.message || msg; } catch {}
          errors.push({ version, model, status: resp.status, message: msg });
        }
      }
    }

    // Si llegamos aquí, todos fallaron
    const detail = errors.map(e => `${e.version}/${e.model} -> ${e.status}: ${e.message}`).join(' | ');
    res.status(400).json({ error: `Gemini failed for all candidates: ${detail}` });
    return;
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
