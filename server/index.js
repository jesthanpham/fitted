import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import multer from 'multer'
import axios from 'axios'
import * as cheerio from 'cheerio'
import pdfParse from 'pdf-parse'
import Anthropic from '@anthropic-ai/sdk'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '512kb' }))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
})

const SYSTEM_PROMPT = `You are an expert at writing cold outreach emails for job seekers.

The user will provide job posting text, resume text, and an optional fun personal fact.

Your task:
- Start with exactly: "Hey!"
- Write 4-6 short punchy lines (line-break style), max 5 sentences total.
- Make it sound like a real human, not a robot or cover letter.
- Keep the tone casual, confident, direct, and memorable.
- Mention who the candidate is and why they are relevant for this specific role.
- Pull 1-2 actually relevant skills/details from the resume for this job.
- Weave this fun personal fact into the email naturally - it should feel unexpected, specific and memorable, the way "I have a cow named after me in the Philippines" works. Don't force it, make it flow.
- Never use words/phrases like: "excited", "passionate", "driven", "aligned", "I'm particularly drawn to", or similar corporate buzzwords.
- End with exactly: "I have attached my resume below, hope to hear from you soon. Best, [name from resume]"
- Return output in exactly this parseable format:
SUBJECT: [subject line here]
EMAIL: [email body here]
- SUBJECT must be professional and concise (about 4-8 words), clear, and specific to the role.
- Avoid corny, gimmicky, or overly casual SUBJECT lines.
- Do not use emojis, slang, exclamation-heavy phrasing, or clickbait wording in SUBJECT.
- The EMAIL value must contain the full email body with line breaks.
- Do not include labels, bullet points, markdown, or commentary before/after the email.`

function collapseWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim()
}

function formatEmailOutput(rawEmail) {
  const normalized = rawEmail.replace(/\r\n/g, '\n').trim()
  return normalized.replace(/\s*\n?\s*(Best,\s*[^\n]*)$/i, '\n\n$1')
}

function parseClaudeResponse(rawText) {
  const normalized = rawText.replace(/\r\n/g, '\n').trim()
  const subjectMatch = normalized.match(/SUBJECT:\s*(.+)/i)
  const emailMatch = normalized.match(/EMAIL:\s*([\s\S]+)/i)

  const subject = subjectMatch?.[1]?.trim() ?? ''
  const email = emailMatch?.[1]?.trim() ?? ''

  if (subject && email) {
    return { subject, email }
  }

  return {
    subject: 'Quick intro',
    email: normalized.replace(/^SUBJECT:.*$/gim, '').replace(/^EMAIL:\s*/i, '').trim(),
  }
}

function extractFromSelectors($, selectors) {
  for (const selector of selectors) {
    const value = collapseWhitespace($(selector).first().text() || '')
    if (value) return value
  }
  return ''
}

function sanitizeAndValidateUrl(rawUrl) {
  let parsed
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error('Invalid job URL. Include the full URL (https://...).')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http/https job URLs are supported.')
  }

  return parsed.toString()
}

async function scrapeJobPosting(url) {
  const response = await axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
    maxRedirects: 5,
  })

  const $ = cheerio.load(response.data)
  $('script, style, noscript, svg, iframe, nav, footer, header').remove()

  const title =
    extractFromSelectors($, [
      'meta[property="og:title"]',
      'h1',
      'title',
    ]) || 'Job Opportunity'
  const company =
    extractFromSelectors($, [
      '[data-testid="company-name"]',
      '.company',
      '.job-company',
      '[class*="company"]',
    ]) || ''

  const prioritizedSections = collapseWhitespace(
    [
      'main',
      'article',
      '[role="main"]',
      '.job-description',
      '.description',
      '[class*="job"]',
      '[class*="description"]',
    ]
      .map((selector) => $(selector).text())
      .join(' ')
  )

  const fallbackBody = collapseWhitespace($('body').text() || '')
  const text = prioritizedSections.length > 250 ? prioritizedSections : fallbackBody

  if (!text) {
    throw new Error('Could not extract readable text from the job posting URL.')
  }

  return { title, company, text }
}

async function extractResumeText(file) {
  if (!file || !file.buffer) {
    throw new Error('Resume file is required.')
  }

  const isPdf =
    file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')

  if (isPdf) {
    const parsed = await pdfParse(file.buffer)
    return collapseWhitespace(parsed.text || '')
  }

  const isText =
    file.mimetype.startsWith('text/') || file.originalname.endsWith('.txt')

  if (isText) {
    return collapseWhitespace(file.buffer.toString('utf-8'))
  }

  throw new Error('Unsupported file type. Upload a PDF or plain text file.')
}

app.post('/api/email', upload.single('resumeFile'), async (req, res) => {
  const { jobUrl, fallbackJobText, funFact } = req.body ?? {}

  if (typeof jobUrl !== 'string' || !jobUrl.trim()) {
    return res.status(400).json({
      error: 'Request body must include a non-empty jobUrl string.',
    })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_key_here') {
    return res.status(500).json({
      error: 'Server is missing a valid ANTHROPIC_API_KEY. Set it in server/.env',
    })
  }

  const client = new Anthropic({ apiKey })

  try {
    if (!req.file) {
      return res.status(400).json({
        error: "Don't forget to upload your resume!",
      })
    }

    const safeJobUrl = sanitizeAndValidateUrl(jobUrl.trim())
    const resumeText = await extractResumeText(req.file)
    let jobData

    try {
      jobData = await scrapeJobPosting(safeJobUrl)
    } catch (scrapeError) {
      const fallbackText =
        typeof fallbackJobText === 'string'
          ? collapseWhitespace(fallbackJobText)
          : ''

      if (!fallbackText) {
        return res.status(422).json({
          error:
            "Couldn't read that URL — try a different link or paste the job description directly.",
          code: 'SCRAPE_FAILED',
        })
      }

      jobData = {
        title: 'Job Opportunity',
        company: '',
        text: fallbackText,
      }
      console.warn('Job scrape failed, using fallback text:', scrapeError?.message)
    }

    if (!resumeText) {
      return res.status(400).json({
        error: 'Could not extract text from the uploaded resume file.',
      })
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 700,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Job posting URL:
${safeJobUrl}

Job posting title:
${jobData.title}

Company (if detected):
${jobData.company || 'Not clearly detected'}

Job posting text:
${jobData.text}

Resume text:
${resumeText}

Fun personal fact from user:
${typeof funFact === 'string' ? funFact.trim() || 'None provided' : 'None provided'}`,
        },
      ],
    })

    const textBlock = message.content.find((block) => block.type === 'text')
    const rawResponse =
      textBlock && textBlock.type === 'text' ? textBlock.text.trim() : ''
    const parsed = parseClaudeResponse(rawResponse)
    const formattedEmail = formatEmailOutput(parsed.email)

    if (!formattedEmail) {
      return res.status(502).json({
        error: 'Something went wrong on our end — try again in a second.',
      })
    }

    return res.json({
      subject: parsed.subject,
      email: formattedEmail,
    })
  } catch (err) {
    console.error(err)
    const status = err?.status === 400 ? 400 : 502
    if (err?.message?.includes('Resume file is required')) {
      return res.status(400).json({ error: "Don't forget to upload your resume!" })
    }
    return res.status(status).json({
      error: 'Something went wrong on our end — try again in a second.',
    })
  }
})

app.listen(PORT, () => {
  console.log(`Fitted API listening on http://localhost:${PORT}`)
})

app.get("/", (req, res) => {
  res.send("backend running")
})

app.get("/api/test", (req, res) => {
  res.json({ message: "API works" })
})
