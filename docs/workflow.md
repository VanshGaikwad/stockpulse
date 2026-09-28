# 📋 Minute‑to‑Minute Development Workflow

## Prerequisites
- **Node ≥ 20** (LTS) and **npm ≥ 10**
- **Git**
- **Google Gemini API key** (add to `.env` → `GEMINI_API_KEY`)
- **Firebase project** – generate the credentials and place them in `.env` (see the `.env.example`).

## 1️⃣ Clone & Install
```bash
git clone <repository‑url>
cd project
npm install          # installs both backend and frontend deps (root package.json)
```

## 2️⃣ Set Up Environment Variables
```bash
cp backend/.env.example backend/.env
# edit backend/.env and set:
#   PORT=8081           # you can change this if the port is taken
#   GEMINI_API_KEY=your‑key-here
#   FIREBASE_… (all firebase vars)
```

## 3️⃣ Run the Full Stack with One Command
```bash
npm run dev          # runs `concurrently "npm start --prefix backend" "npm run dev --prefix frontend"`
```
- Backend: **http://localhost:8081**
- Frontend (Vite): **http://localhost:5174** (auto‑switches if 5173 is busy)

## 4️⃣ Hot‑Reloading
- **Backend** – `node --watch src/server.js` restarts automatically on file changes.
- **Frontend** – Vite refreshes the browser instantly.

## 5️⃣ Testing AI‑Powered Endpoints
1. Open the UI, go to a product, click **“Live AI Reasoning Stream”**.
2. The UI opens an `EventSource` to:
   ```
   http://localhost:8081/products/:id/suggest-pricing/stream?trigger=MANUAL
   ```
3. Watch the streaming tokens appear in the modal and inspect the console for Gemini request/response logs.

## 6️⃣ Common Debugging Tips
| Symptom | Likely Cause | Fix |
|---|---|---|
| `EADDRINUSE` on 8080/8081 | Port already bound | Change `PORT` in `.env` and update `frontend/src/api.js` (and any hard‑coded URLs). |
| Gemini auth error (`401`) | Missing/invalid `GEMINI_API_KEY` | Regenerate the key in Google Cloud, update `.env`, restart dev server. |
| Firebase auth failure | Wrong Firebase project ID or credentials | Verify `FIREBASE_PROJECT_ID` and related values. |
| Vite says “Port 5173 is in use” | Another dev server running | Vite prints the new port; open that URL. |

## 7️⃣ Production / Deployment (optional)
- **Firebase App Hosting** – see the `firebase-app-hosting-basics` skill for Next.js/SSR deployment.
- **Docker** – a `Dockerfile` and `docker-compose.yml` are provided in `infra/`; run `docker compose up`.

---
*This file is located at `docs/workflow.md`.*
