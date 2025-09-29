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
   - Ya incluimos `api/generate.ts` (función serverless Node en Vercel).
   - En el panel de Vercel, en tu proyecto, define la variable de entorno `GEMINI_API_KEY` (Production y Preview).
   - Conecta el repo; Vercel detecta Vite y compila a `dist/` (config también en `vercel.json`).
   - El frontend llamará a `/api/generate` en el mismo dominio.
   - Opcional: define `GEMINI_MODEL` si quieres un modelo diferente. Por defecto usamos `gemini-1.5-flash`. Si ves errores 404 de modelo, prueba valores como `gemini-1.5-flash` o `gemini-1.5-pro`.

   Pasos rápidos en Vercel:
   - Import Project → selecciona este repo.
   - Build & Output: Vercel lo autocompleta (o usa `vercel.json`).
   - Environment Variables: agrega `GEMINI_API_KEY` y despliega.
   - Abre tu dominio y usa “Probar conexión a IA”.

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

## Probar conexión a IA

- En la cabecera de la app hay un botón “Probar conexión a IA”.
- Si estás en local y corriendo `npm run server`, el test usa el proxy.
- En Vercel, el test llama al endpoint `/api/generate` del mismo dominio.

## GitHub Pages

- Al hacer push a `main`, el workflow `Deploy static site to GitHub Pages` compila y publica `dist/`.
- La URL quedará en `https://<tu-usuario>.github.io/<nombre-del-repo>/`.
- Importante: GitHub Pages no ejecuta backend. Debes proveer un backend externo y definir el secret `VITE_API_BASE` en Settings → Secrets and variables → Actions con esa URL (p. ej. tu despliegue en Vercel/Render).
- Si visitas la página sin `VITE_API_BASE` configurado, verás un aviso en la cabecera y el botón de probar IA permanecerá deshabilitado.
