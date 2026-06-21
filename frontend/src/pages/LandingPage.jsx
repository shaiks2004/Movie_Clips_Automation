import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Video, Sparkles, Share2, Shield } from 'lucide-react'

function LandingPage() {
  const [email, setEmail] = useState('')
  const navigate = useNavigate()

  const handleStart = (e) => {
    e.preventDefault()
    if (email.trim() && email.includes('@')) {
      // Direct access to SaaS tool passing email as query param
      navigate(`/tool?email=${encodeURIComponent(email.trim().toLowerCase())}`)
    } else {
      alert('Please enter a valid email address.')
    }
  }

  return (
    <div className="landing-page" style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logo}>
          <Video color="#8B5CF6" size={28} />
          <span style={styles.logoText}>ClipMood <span style={styles.logoAccent}>AI</span></span>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/admin?email=admin@clipmood.com')}>Admin Console</button>
      </header>

      <main style={styles.main}>
        <div style={styles.heroSection}>
          <div style={styles.badge}>
            <Sparkles size={14} color="#EC4899" />
            <span>Next-Gen Video Content Engine</span>
          </div>
          <h1 style={styles.title}>
            Transform Long Videos Into <span style={styles.glowText}>Viral Highlights</span> In Seconds
          </h1>
          <p style={styles.subtitle}>
            Leverage Gemini & Whisper AI to transcribe, detect engaging scenes, render hardcoded subtitle templates, and publish directly to Facebook.
          </p>

          <form onSubmit={handleStart} style={styles.form}>
            <input
              type="email"
              placeholder="Enter your email to start..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
            <button type="submit" className="btn btn-primary" style={styles.button}>
              Enter Content Factory
              <ArrowRight size={18} />
            </button>
          </form>
        </div>

        <div style={styles.featuresGrid}>
          <div className="glass-panel" style={styles.featureCard}>
            <Sparkles color="#8B5CF6" size={24} />
            <h3>Moment Evaluation</h3>
            <p>Google Gemini analyzes transcripts and visual cuts to isolate the top virality highlights.</p>
          </div>
          <div className="glass-panel" style={styles.featureCard}>
            <Video color="#EC4899" size={24} />
            <h3>Hardcoded Captions</h3>
            <p>FFmpeg automatically burns stylish Oswald font captions directly onto sliced video reels.</p>
          </div>
          <div className="glass-panel" style={styles.featureCard}>
            <Share2 color="#10B981" size={24} />
            <h3>Automated Publisher</h3>
            <p>Queue, schedule offset, and publish posts to Facebook Reels automatically on a poller daemon.</p>
          </div>
        </div>
      </main>
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    width: '100%',
  },
  header: {
    height: '80px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoText: {
    fontSize: '22px',
    fontWeight: '700',
    fontFamily: 'var(--font-display)',
    letterSpacing: '-0.5px',
  },
  logoAccent: {
    color: 'var(--accent-primary)',
  },
  main: {
    padding: '80px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '80px',
  },
  heroSection: {
    textAlign: 'center',
    maxWidth: '800px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(236,72,153,0.1)',
    color: '#EC4899',
    padding: '6px 14px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: '500',
    border: '1px solid rgba(236,72,153,0.2)',
  },
  title: {
    fontSize: '52px',
    fontWeight: '800',
    fontFamily: 'var(--font-display)',
    lineHeight: '1.15',
    letterSpacing: '-1.5px',
  },
  glowText: {
    background: 'linear-gradient(135deg, var(--accent-primary) 30%, var(--accent-secondary) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '18px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
    maxWidth: '650px',
  },
  form: {
    display: 'flex',
    width: '100%',
    maxWidth: '500px',
    gap: '12px',
    marginTop: '12px',
  },
  input: {
    flex: '1',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#fff',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    whiteSpace: 'nowrap',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    width: '100%',
  },
  featureCard: {
    padding: '30px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    textAlign: 'left',
  },
}

export default LandingPage
