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
    const manualCandidates = Array.from(new Set([
      preferred || 'gemini-1.5-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-2.0-flash',
      'gemini-2.0-pro'
    ])).filter(Boolean);

    const apiVersions = ['v1', 'v1beta'];
    const errors: Array<{ version: string, model: string, status: number, message: string }> = [];

    async function tryGenerate(version: string, model: string) {
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
            return true;
          }
          const parts = json?.candidates?.[0]?.content?.parts || [];
          const out = parts.map((p: any) => p?.text).filter(Boolean).join('\n');
          res.status(200).json({ text: out, model, version });
          return true;
        } catch {
          res.status(200).json({ text: raw, model, version });
          return true;
        }
      } else {
        let msg = raw;
        try { const j = JSON.parse(raw); msg = j?.error?.message || j?.message || msg; } catch {}
        errors.push({ version, model, status: resp.status, message: msg });
        return false;
      }
    }

    // 1) Intentar con candidatos manuales
    for (const version of apiVersions) {
      for (const model of manualCandidates) {
        const ok = await tryGenerate(version, model);
        if (ok) return;
      }
    }

    // 2) Listar modelos disponibles con esta API key y elegir uno con generateContent
    for (const version of apiVersions) {
      const listUrl = `https://generativelanguage.googleapis.com/${version}/models`;
      const listResp = await fetch(listUrl, {
        headers: { 'x-goog-api-key': apiKey }
      });
      const raw = await listResp.text();
      if (!listResp.ok) {
        let msg = raw;
        try { const j = JSON.parse(raw); msg = j?.error?.message || j?.message || msg; } catch {}
        errors.push({ version, model: 'LIST', status: listResp.status, message: msg });
        continue;
      }
      let models: any[] = [];
      try {
        const j = JSON.parse(raw);
        models = j?.models || [];
      } catch {}
      // El campo puede venir como 'supportedGenerationMethods'
      const candidate = models.find(m => Array.isArray(m?.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
                      || models.find(m => (m?.name || '').includes('gemini'))
                      || models[0];
      const name = (candidate?.name || '').replace(/^models\//, '');
      if (name) {
        const ok = await tryGenerate(version, name);
        if (ok) return;
      }
    }

    // Si llegamos aquí, todo falló
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
