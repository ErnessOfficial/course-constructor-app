// Minimal server to proxy Gemini requests and keep API key off the client
// Run with: node server.mjs (listens on 8787)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = process.env.PORT || 8787;
const __dirname = path.dirname(new URL(import.meta.url).pathname);

// Load .env.local manually if present (no extra deps)
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn('[server] WARNING: GEMINI_API_KEY is not set. Set it in .env.local');
}

async function handleGenerate(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const data = JSON.parse(body || '{}');
      const prompt = String(data.prompt || '').slice(0, 8000); // guard
      if (!prompt) throw new Error('Missing prompt');
      if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured on server');

      // Call Gemini REST API
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }]}]
        })
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`Gemini error ${resp.status}: ${t}`);
      }
      const json = await resp.json();
      const text = json?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') || '';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ text }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message || 'Bad Request' }));
    }
  });
}

function handleHealth(_req, res) {
  const ok = true;
  const hasKey = Boolean(GEMINI_API_KEY);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok, hasKey }));
}

const server = http.createServer((req, res) => {
  // Basic CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.url === '/api/generate') return handleGenerate(req, res);
  if (req.url === '/api/health') return handleHealth(req, res);
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><html><body style="font-family:sans-serif"><h3>Backend de IA en ejecución</h3><p>Este puerto (8787) es solo para la API. Abre la app en <a href="http://localhost:3000">http://localhost:3000</a>.</p></body></html>');
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
});
