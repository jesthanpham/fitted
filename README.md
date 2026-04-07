# Fitted

Fitted generates personalized cold outreach emails for job seekers. You paste a job posting URL, upload your resume as a PDF or text file, and click **Generate Email**. The backend scrapes the posting text, extracts your resume text, and sends both to Anthropic Claude (`claude-sonnet-4-20250514`) to produce a short, human-sounding outreach email.

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- An [Anthropic API key](https://console.anthropic.com/)

## Setup

1. **Backend environment**

   Open `server/.env` and set your key (replace the placeholder):

   ```env
   ANTHROPIC_API_KEY=sk-ant-api03-...
   ```

2. **Install dependencies**

   Backend (from the project root):

   ```powershell
   cd c:\Users\jesth\fitted\server
   npm install
   ```

   Frontend:

   ```powershell
   cd c:\Users\jesth\fitted
   npm install
   ```

## Run the app

You need **two** terminals: one for the API, one for the Vite dev server. The frontend proxies `/api` to `http://localhost:3001`.

**Terminal 1 — API**

```powershell
cd c:\Users\jesth\fitted\server
npm start
```

**Terminal 2 — frontend**

```powershell
cd c:\Users\jesth\fitted
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

### Run both from one PowerShell window (optional)

```powershell
cd c:\Users\jesth\fitted
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd c:\Users\jesth\fitted\server; npm start"
npm run dev
```

This opens a second window for the server and runs the frontend in the current window.

## API behavior

- `POST /api/email` (multipart form data)
  - `jobUrl` (string)
  - `resumeFile` (PDF or TXT file)
  - `fallbackJobText` (optional string; used when URL scraping is blocked)
- Response:
  - `email` (generated cold email text)
  - `subjectSuggestion` (simple suggested subject line)

The Claude prompt instructs the model to:

- Write a 4-5 sentence personalized cold outreach email
- Mention the specific role/context from the job posting
- Highlight 1-2 relevant resume points
- End with a 15-minute chat call to action
- Return only the email text (no subject line, no commentary)

If a job board blocks scraping, the app returns `SCRAPE_FAILED`; paste the job description into the fallback field in the UI and retry.

## What goes in `.env`

| Variable               | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `ANTHROPIC_API_KEY` | Your secret key from the Anthropic console. |

Optional: set `PORT` in `server/.env` if you need a port other than `3001` (update the Vite proxy in `vite.config.js` to match).

## Project layout

- `src/` — React (Vite) UI
- `server/` — Express API and Claude integration

Do not commit real API keys. Keep `server/.env` local or use your team’s secret management.
