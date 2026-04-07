import { useEffect, useState } from 'react'
import './App.css'

const API_URL = '/api/email'
const FUN_QUESTIONS = [
  'Do you have any unusual pets or animals in your life?',
  "What's the most random job or thing you've ever done?",
  "What's a skill you have that has nothing to do with work?",
  "What's the most exotic or unexpected place you've been?",
  "What's something weird that's happened to you that nobody believes?",
  'Do you have a fun nickname or a good story behind your name?',
  "What's your most unhinged food opinion?",
  "What's a hobby that would surprise people who know you professionally?",
]
const LOADING_MESSAGES = [
  'Reading the job posting...',
  'Stalking your resume...',
  'Cooking up something good...',
  'Almost there...',
]

export default function App() {
  const [jobUrl, setJobUrl] = useState('')
  const [fallbackJobText, setFallbackJobText] = useState('')
  const [resumeFile, setResumeFile] = useState(null)
  const [funQuestion] = useState(
    () => FUN_QUESTIONS[Math.floor(Math.random() * FUN_QUESTIONS.length)]
  )
  const [funFact, setFunFact] = useState('')
  const [output, setOutput] = useState('')
  const [subjectLine, setSubjectLine] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [error, setError] = useState('')
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [copiedSubject, setCopiedSubject] = useState(false)
  const formattedOutput = output.replace(
    /\s*\n?\s*(Best,\s*[^\n]*)$/i,
    '\n\n$1'
  )

  useEffect(() => {
    if (!loading) return undefined
    const timer = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
    }, 1500)
    return () => clearInterval(timer)
  }, [loading])

  async function runGenerateRequest() {
    setError('')
    setOutput('')
    setSubjectLine('')
    setCopiedEmail(false)
    setCopiedSubject(false)
    setLoadingMessageIndex(0)
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('jobUrl', jobUrl.trim())
      formData.append('resumeFile', resumeFile)
      formData.append('funFact', funFact.trim())
      if (fallbackJobText.trim()) {
        formData.append('fallbackJobText', fallbackJobText.trim())
      }

      const res = await fetch(API_URL, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(
          data.error ?? 'Something went wrong on our end — try again in a second.'
        )
        return
      }
      setOutput(data.email ?? '')
      setSubjectLine(data.subject ?? '')
    } catch {
      setError('Something went wrong on our end — try again in a second.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateEmail() {
    await runGenerateRequest()
  }

  async function handleRegenerate() {
    await runGenerateRequest()
  }

  async function handleCopyEmail() {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
    } catch {
      setError('Something went wrong on our end — try again in a second.')
    }
  }

  async function handleCopySubject() {
    if (!subjectLine) return
    try {
      await navigator.clipboard.writeText(subjectLine)
      setCopiedSubject(true)
      setTimeout(() => setCopiedSubject(false), 2000)
    } catch {
      setError('Something went wrong on our end — try again in a second.')
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header__brand">
          <span className="logo" aria-hidden="true" />
          <span className="header__name">Fitted</span>
        </div>
        <h1 className="header__tagline">Cold emails that actually sound like you.</h1>
      </header>

      <p className="lede">
        Paste a job URL, upload your resume, and get a cold email worth sending in
        seconds.
      </p>

      <div className="panels">
        <label className="field">
          <span className="field__label">Job posting URL</span>
          <input
            className="field__input"
            type="url"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder="https://company.com/careers/role"
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span className="field__label">Resume file</span>
          <input
            className="field__file"
            type="file"
            accept=".pdf,.txt,text/plain,application/pdf"
            onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
          />
          <p className="field__hint">
            {resumeFile
              ? `Selected: ${resumeFile.name}`
              : 'Upload a PDF or plain text file.'}
          </p>
        </label>
      </div>
      <label className="field">
        <span className="field__label">Fallback job text (optional)</span>
        <textarea
          className="field__input"
          value={fallbackJobText}
          onChange={(e) => setFallbackJobText(e.target.value)}
          placeholder="If scraping fails, paste the full job description here and generate again."
          rows={7}
          spellCheck
        />
        <p className="field__hint">
          Use this only when the URL blocks scraping (common on some job boards).
        </p>
      </label>

      <section className="fun-question" aria-label="Fun personal detail">
        <p className="fun-question__intro">Quick, answer this:</p>
        <p className="fun-question__prompt">{funQuestion}</p>
        <input
          className="field__input fun-question__input"
          type="text"
          value={funFact}
          onChange={(e) => setFunFact(e.target.value)}
          placeholder="Type a short answer..."
          maxLength={180}
        />
      </section>

      <div className="actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleGenerateEmail}
          disabled={loading || !jobUrl.trim() || !resumeFile}
        >
          {loading ? (
            <>
              <span className="btn__spinner" aria-hidden="true" />
              Generating...
            </>
          ) : (
            'Generate Email'
          )}
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={handleRegenerate}
          disabled={loading || !jobUrl.trim() || !resumeFile}
        >
          {loading ? (
            <>
              <span className="btn__spinner" aria-hidden="true" />
              Regenerating...
            </>
          ) : (
            'Regenerate'
          )}
        </button>
      </div>

      {error ? (
        <p className="banner banner--error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="output-section" aria-labelledby="output-heading">
        <div className="output-section__head">
          <h2 className="output-section__title">Suggested Subject Line</h2>
          <button
            type="button"
            className={`btn btn--ghost desktop-copy-btn ${copiedSubject ? 'btn--copied' : ''}`}
            onClick={handleCopySubject}
            disabled={!subjectLine}
          >
            {copiedSubject ? 'Copied! ✓' : 'Copy to clipboard'}
          </button>
        </div>
        <div className="subject-box">
          <button
            type="button"
            className={`mobile-copy-btn ${copiedSubject ? 'mobile-copy-btn--copied' : ''}`}
            onClick={handleCopySubject}
            disabled={!subjectLine}
            aria-label={copiedSubject ? 'Copied subject line' : 'Copy subject line'}
          >
            {copiedSubject ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M9 16.2 5.5 12.7l-1.4 1.4L9 19 20 8l-1.4-1.4z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H10V7h9v14z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>
          <span className={subjectLine ? '' : 'is-placeholder'}>
            {subjectLine || 'Your subject line will appear here.'}
          </span>
        </div>

        <div className="output-section__head">
          <h2 id="output-heading" className="output-section__title">
            Generated cold email
          </h2>
          <button
            type="button"
            className={`btn btn--ghost desktop-copy-btn ${copiedEmail ? 'btn--copied' : ''}`}
            onClick={handleCopyEmail}
            disabled={!output}
          >
            {copiedEmail ? 'Copied! ✓' : 'Copy to clipboard'}
          </button>
        </div>
        <div className="output-panel">
          <button
            type="button"
            className={`mobile-copy-btn ${copiedEmail ? 'mobile-copy-btn--copied' : ''}`}
            onClick={handleCopyEmail}
            disabled={!output}
            aria-label={copiedEmail ? 'Copied email' : 'Copy email'}
          >
            {copiedEmail ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M9 16.2 5.5 12.7l-1.4 1.4L9 19 20 8l-1.4-1.4z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H10V7h9v14z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>
          {loading ? (
            <p className="output-panel__placeholder output-panel__loading">
              {LOADING_MESSAGES[loadingMessageIndex]}
            </p>
          ) : formattedOutput ? (
            <pre className="output-panel__text">{formattedOutput}</pre>
          ) : (
            <p className="output-panel__placeholder">
              Your personalized cold email will appear here.
            </p>
          )}
        </div>
      </section>

    </div>
  )
}
