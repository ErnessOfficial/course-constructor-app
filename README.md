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

Para producción, crea un endpoint equivalente a `/api/generate` en tu backend o función serverless y define la variable de entorno `GEMINI_API_KEY` en el servidor. El cliente seguirá llamando a `/api/generate`.

## Scripts útiles

- `npm run dev`: Frontend en Vite.
- `node server.mjs`: Backend mínimo para Gemini.
- `npm run build`: Build de producción.
- `npm run preview`: Servir build local.
