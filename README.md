<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/10TgRsb94Alt0TdTAt-SlUjI-4vry6Scs

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Configuración segura de la API de Gemini

Para no exponer la API key en el cliente, este proyecto incluye un micro-servidor (`server.mjs`) que actúa como proxy:

- Copia `.env.example` a `.env.local` y coloca tu clave en `GEMINI_API_KEY`.
- En una terminal corre: `node server.mjs` (escucha en `http://localhost:8787`).
- En otra terminal corre: `npm run dev` (Vite hace proxy de `/api` al servidor).

Tu clave queda solo en el backend local y no en el bundle del navegador. El archivo `.env.local` y `.env` están ignorados por Git.

## Producción

Para producción, tienes dos opciones:

1) Vercel (recomendado, fullstack):
   - Mueve/duplica la lógica de `server.mjs` a un endpoint serverless `/api/generate`.
   - Define `GEMINI_API_KEY` en las variables de entorno del proyecto en Vercel.
   - El frontend seguirá usando `/api/generate`.

2) GitHub Pages (frontend) + Backend externo (Render, Railway, Cloudflare, etc.):
   - Hospeda el frontend estático con GitHub Pages (workflow incluido en `.github/workflows/deploy.yml`).
   - Despliega el backend (la lógica de `server.mjs`) en un servicio con URL pública y define `GEMINI_API_KEY` allí.
   - En GitHub, crea el secret `VITE_API_BASE` con la URL del backend (p. ej. `https://mi-backend.onrender.com`).
   - El workflow de Pages construirá el sitio con `VITE_API_BASE` para que las llamadas vayan al backend.

## Scripts útiles

- `npm run dev`: Frontend en Vite.
- `node server.mjs`: Backend mínimo para Gemini.
- `npm run server`: Alias para `node server.mjs`.
- `npm run dev:all`: Levanta backend y frontend en la misma terminal (Mac/Linux). Para detener ambos, cierra la terminal o mata el proceso de Node si queda en background.
- `npm run build`: Build de producción.
- `npm run preview`: Servir build local.

## GitHub Pages

- Al hacer push a `main`, el workflow `Deploy static site to GitHub Pages` compila y publica `dist/`.
- La URL quedará en `https://<tu-usuario>.github.io/<nombre-del-repo>/`.
- Si usas backend externo, añade el secret `VITE_API_BASE` en Settings → Secrets and variables → Actions.
