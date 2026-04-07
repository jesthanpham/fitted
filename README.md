# Fitted 🤝

Cold emails that actually sound like you.

Built with React, Node/Express, and the Anthropic Claude API.

## What it does

Fitted helps job seekers write cold outreach emails that feel human, specific, and worth sending. You paste a job URL, upload your resume, answer a fun personal question, and the app generates a short punchy email tailored to the role. The result sounds like a real person wrote it, not a generic cover letter.

## Features

- Scrapes job postings directly from the URL
- Reads your resume as a PDF
- Asks you a random fun question to add personality to the email
- Generates a short, punchy cold email using Claude AI
- Suggests a subject line
- One-click copy to clipboard
- Clean dark UI, mobile responsive

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- AI: Anthropic Claude (`claude-sonnet-4-20250514`)
- PDF parsing: `pdf-parse`
- Web scraping: Axios + Cheerio

## Getting Started

1. Clone the repo
   ```bash
   git clone <your-repo-url>
   cd fitted
   ```
2. Add your API key to `server/.env`
   ```env
   ANTHROPIC_API_KEY=your_key_here
   ```
3. Install backend dependencies
   ```bash
   cd server
   npm install
   ```
4. Install frontend dependencies
   ```bash
   cd ..
   npm install
   ```
5. Run the backend
   ```bash
   cd server
   npm start
   ```
6. Run the frontend (in a second terminal)
   ```bash
   cd .
   npm run dev
   ```
7. Open `http://localhost:5173`

## Environment Variables

- `ANTHROPIC_API_KEY`: Your Anthropic API key from [console.anthropic.com](https://console.anthropic.com)

## Why I built this

Cold emailing recruiters is painful. Most emails sound the same. I built Fitted to generate emails that are short, specific, and actually reflect your personality — because the cow-named-after-me-in-the-Philippines energy should come through in your outreach too.

Built by Jesthan Pham
