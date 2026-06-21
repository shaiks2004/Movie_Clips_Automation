import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Upload, Video, Library, Calendar, BarChart3, Search, Trash2, Clock, Check, Download, AlertCircle, X } from 'lucide-react'

function Dashboard() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const email = searchParams.get('email')?.trim().toLowerCase() || ''
  
  // States
  const [isPremium, setIsPremium] = useState(false)
  const [analytics, setAnalytics] = useState({ videos_count: 0, clips_count: 0, avg_processing_time: 45, top_mood: 'N/A' })
  const [activeTab, setActiveTab] = useState('upload') // upload, library, queue
  
  // Upload States
  const [file, setFile] = useState(null)
  const [selectedMoods, setSelectedMoods] = useState([])
  const [activeJobId, setActiveJobId] = useState(null)
  const [jobProgress, setJobProgress] = useState(0)
  const [jobStatus, setJobStatus] = useState('')
  const [jobError, setJobError] = useState('')
  const [jobClips, setJobClips] = useState([])
  
  // Library States
  const [libraryClips, setLibraryClips] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [moodFilter, setMoodFilter] = useState('')
  
  // Queue States
  const [queueItems, setQueueItems] = useState([])
  
  // Modal / Scheduler States
  const [schedulingClip, setSchedulingClip] = useState(null)
  const [scheduleTime, setScheduleTime] = useState('')
  const [schedulePlatform, setSchedulePlatform] = useState('facebook')
  const [scheduleTitle, setScheduleTitle] = useState('')
  const [scheduleDesc, setScheduleDesc] = useState('')
  
  // Toasts
  const [toasts, setToasts] = useState([])
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!email || !email.includes('@')) {
      navigate('/')
    } else {
      fetchUserStatus()
      fetchAnalytics()
      fetchLibrary()
      fetchQueue()
    }
  }, [email])

  // Polling active jobs
  useEffect(() => {
    let interval = null
    if (activeJobId) {
      interval = setInterval(() => {
        pollJobStatus()
      }, 2000)
    }
    return () => clearInterval(interval)
  }, [activeJobId])

  const showToast = (message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  const fetchUserStatus = async () => {
    try {
      const res = await fetch(`/api/user/status?email=${encodeURIComponent(email)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.is_suspended) {
          alert('Your account has been suspended by an administrator.')
          navigate('/')
          return
        }
        setIsPremium(data.is_premium)
      } else {
        const err = await res.json()
        showToast(err.error || 'Failed to retrieve user status.', 'error')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`/api/analytics?email=${encodeURIComponent(email)}`)
      if (res.ok) {
        const data = await res.json()
        setAnalytics(data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchLibrary = async () => {
    try {
      const res = await fetch(`/api/library?email=${encodeURIComponent(email)}&search=${encodeURIComponent(searchQuery)}&mood=${encodeURIComponent(moodFilter)}`)
      if (res.ok) {
        const data = await res.json()
        setLibraryClips(data.clips || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchQueue = async () => {
    try {
      const res = await fetch(`/api/queue?email=${encodeURIComponent(email)}`)
      if (res.ok) {
        const data = await res.json()
        setQueueItems(data.queue || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }

  const handleUploadSubmit = async (e) => {
    e.preventDefault()
    if (!file) return
    
    const formData = new FormData()
    formData.append('video', file)
    formData.append('email', email)
    selectedMoods.forEach(m => formData.append('moods', m))

    showToast('Uploading video and starting AI Content Pipeline...', 'info')
    setJobProgress(5)
    setJobStatus('uploading')
    setJobError('')
    setJobClips([])
    
    try {
      const res = await fetch('/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (res.ok && data.job_id) {
        setActiveJobId(data.job_id)
        showToast('Video uploaded. Pipeline started!', 'success')
      } else {
        setJobStatus('error')
        setJobError(data.error || 'Upload failed.')
        showToast(data.error || 'Upload failed.', 'error')
      }
    } catch (err) {
      setJobStatus('error')
      setJobError(err.toString())
      showToast('Network error during upload.', 'error')
    }
  }

  const pollJobStatus = async () => {
    if (!activeJobId) return
    try {
      const res = await fetch(`/status/${activeJobId}`)
      if (res.ok) {
        const data = await res.json()
        setJobProgress(data.progress)
        setJobStatus(data.status)
        setJobError(data.error || '')
        
        if (data.status === 'done') {
          setJobClips(data.clips || [])
          setActiveJobId(null)
          showToast('Clips sliced and rendered successfully!', 'success')
          fetchLibrary()
          fetchAnalytics()
        } else if (data.status === 'error') {
          setActiveJobId(null)
          showToast(`Job failed: ${data.error}`, 'error')
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteClip = async (clipId) => {
    if (!window.confirm('Are you sure you want to delete this clip?')) return
    try {
      const res = await fetch(`/api/clip/${clipId}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Clip deleted successfully.', 'success')
        fetchLibrary()
        fetchAnalytics()
      } else {
        showToast('Failed to delete clip.', 'error')
      }
    } catch (e) {
      showToast('Error deleting clip.', 'error')
    }
  }

  const handleOpenScheduler = (clip) => {
    setSchedulingClip(clip)
    setScheduleTitle(clip.title || '')
    setScheduleDesc(clip.description || '')
    // Default 1 hour in the future formatted locally
    const future = new Date(Date.now() + 3600000)
    const localISO = new Date(future.getTime() - future.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    setScheduleTime(localISO)
  }

  const handleScheduleSubmit = async (e) => {
    e.preventDefault()
    if (!schedulingClip) return

    // Convert local time select back to UTC timezone offset safely
    const utcTime = new Date(scheduleTime).toISOString()

    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clip_id: schedulingClip.clip_id,
          title: scheduleTitle,
          description: scheduleDesc,
          hashtags: schedulingClip.hashtags || [],
          platform: schedulePlatform,
          schedule_time: utcTime,
          email: email
        })
      })
      if (res.ok) {
        showToast('Clip scheduled successfully!', 'success')
        setSchedulingClip(null)
        fetchQueue()
      } else {
        showToast('Failed to schedule clip.', 'error')
      }
    } catch (e) {
      showToast('Error scheduling clip.', 'error')
    }
  }

  const handleCancelQueue = async (queueId) => {
    if (!window.confirm('Cancel this scheduled post?')) return
    try {
      const res = await fetch(`/api/queue/${queueId}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Scheduled post cancelled.', 'success')
        fetchQueue()
      } else {
        showToast('Failed to cancel post.', 'error')
      }
    } catch (e) {
      showToast('Error cancelling post.', 'error')
    }
  }

  const toggleMoodSelection = (mood) => {
    if (selectedMoods.includes(mood)) {
      setSelectedMoods(prev => prev.filter(m => m !== mood))
    } else {
      setSelectedMoods(prev => [...prev, mood])
    }
  }

  return (
    <div className="dashboard-layout" style={styles.container}>
      {/* Toast Overlay */}
      <div style={styles.toastContainer}>
        {toasts.map(t => (
          <div key={t.id} style={{
            ...styles.toast,
            borderLeft: `4px solid ${t.type === 'error' ? 'var(--error)' : t.type === 'info' ? 'var(--accent-primary)' : 'var(--success)'}`
          }}>
            {t.message}
          </div>
        ))}
      </div>

      <header style={styles.header}>
        <div style={styles.logo} onClick={() => navigate('/')}>
          <Video color="#8B5CF6" size={24} />
          <span style={styles.logoText}>ClipMood <span style={styles.logoAccent}>Workspace</span></span>
        </div>
        <div style={styles.userBadge}>
          <span style={styles.userEmail}>{email}</span>
          <span style={isPremium ? styles.premiumBadge : styles.freeBadge}>{isPremium ? 'Premium' : 'Free Tier'}</span>
        </div>
      </header>

      {/* Analytics Summary */}
      <div style={styles.analyticsGrid}>
        <div className="glass-panel" style={styles.metricCard}>
          <Video size={20} color="#8B5CF6" />
          <div>
            <div style={styles.metricLabel}>Videos Processed</div>
            <div style={styles.metricVal}>{analytics.videos_count}</div>
          </div>
        </div>
        <div className="glass-panel" style={styles.metricCard}>
          <Library size={20} color="#EC4899" />
          <div>
            <div style={styles.metricLabel}>Generated Clips</div>
            <div style={styles.metricVal}>{analytics.clips_count}</div>
          </div>
        </div>
        <div className="glass-panel" style={styles.metricCard}>
          <Clock size={20} color="#10B981" />
          <div>
            <div style={styles.metricLabel}>Average Process Time</div>
            <div style={styles.metricVal}>{analytics.avg_processing_time}s</div>
          </div>
        </div>
        <div className="glass-panel" style={styles.metricCard}>
          <Calendar size={20} color="#F59E0B" />
          <div>
            <div style={styles.metricLabel}>Top Category</div>
            <div style={styles.metricVal}>{analytics.top_mood || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabBar}>
        <button style={activeTab === 'upload' ? styles.activeTabBtn : styles.tabBtn} onClick={() => setActiveTab('upload')}>
          <Upload size={16} /> Upload Video
        </button>
        <button style={activeTab === 'library' ? styles.activeTabBtn : styles.tabBtn} onClick={() => { setActiveTab('library'); fetchLibrary(); }}>
          <Library size={16} /> Clip Library
        </button>
        <button style={activeTab === 'queue' ? styles.activeTabBtn : styles.tabBtn} onClick={() => { setActiveTab('queue'); fetchQueue(); }}>
          <Clock size={16} /> Publishing Queue ({queueItems.length})
        </button>
      </div>

      <main style={styles.mainContent}>
        {/* TAB 1: UPLOAD */}
        {activeTab === 'upload' && (
          <div style={styles.uploadTab}>
            <div className="glass-panel" style={styles.uploadCard}>
              <form onSubmit={handleUploadSubmit} style={styles.uploadForm}>
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current.click()}
                  style={styles.dropZone}
                >
                  <Upload size={40} color="var(--text-secondary)" />
                  <p>{file ? file.name : "Drag & Drop video file here, or click to browse"}</p>
                  <span style={styles.fileHint}>Supports MP4, MOV, MKV up to 500MB</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => setFile(e.target.files[0])}
                    accept="video/*"
                    style={{ display: 'none' }}
                  />
                </div>

                <div style={styles.moodSection}>
                  <label style={styles.sectionLabel}>Select Mood Tags (Optional)</label>
                  <div style={styles.moodGrid}>
                    {['Educational', 'Motivational', 'Funny', 'Trending', 'Suspense'].map(m => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => toggleMoodSelection(m)}
                        style={selectedMoods.includes(m) ? styles.activeMoodBadge : styles.moodBadge}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={!file || jobStatus === 'uploading'} className="btn btn-primary" style={styles.submitBtn}>
                  {jobStatus === 'uploading' ? 'Uploading...' : 'Launch AI Slicer'}
                </button>
              </form>
            </div>

            {/* Active Telemetry widget */}
            {(activeJobId || jobStatus) && (
              <div className="glass-panel" style={styles.telemetryCard}>
                <h3 style={styles.telemetryTitle}>Active Job Processing Status</h3>
                <div style={styles.progressRow}>
                  <div style={styles.progressTrack}>
                    <div style={{ ...styles.progressFill, width: `${jobProgress}%` }}></div>
                  </div>
                  <span style={styles.progressLabel}>{jobProgress}%</span>
                </div>
                <div style={styles.telemetryStatus}>
                  Status: <strong style={{ color: 'var(--accent-primary)', textTransform: 'uppercase' }}>{jobStatus}</strong>
                </div>
                {jobError && (
                  <div style={styles.errorBox}>
                    <AlertCircle size={16} />
                    <span>{jobError}</span>
                  </div>
                )}

                {jobClips.length > 0 && (
                  <div style={styles.renderedList}>
                    <h4>Generated Clips:</h4>
                    {jobClips.map(c => (
                      <div key={c.clip_id} style={styles.jobClipItem}>
                        <span>{c.title || `Clip #${c.index}`} ({c.duration}s)</span>
                        <span style={styles.successBadge}>Rendered</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LIBRARY */}
        {activeTab === 'library' && (
          <div style={styles.libraryTab}>
            <div style={styles.filterBar}>
              <div style={styles.searchWrapper}>
                <Search size={16} color="var(--text-secondary)" />
                <input
                  type="text"
                  placeholder="Search by keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchLibrary()}
                  style={styles.searchInput}
                />
              </div>
              <select value={moodFilter} onChange={(e) => { setMoodFilter(e.target.value); fetchLibrary(); }} style={styles.filterSelect}>
                <option value="">All Moods</option>
                <option value="Educational">Educational</option>
                <option value="Motivational">Motivational</option>
                <option value="Funny">Funny</option>
                <option value="Trending">Trending</option>
                <option value="Suspense">Suspense</option>
              </select>
              <button className="btn btn-secondary" onClick={fetchLibrary}>Apply</button>
            </div>

            {libraryClips.length === 0 ? (
              <div style={styles.emptyState}>No clips found in library. Upload a video first!</div>
            ) : (
              <div style={styles.clipsGrid}>
                {libraryClips.map(c => (
                  <div key={c.clip_id} className="glass-panel" style={styles.clipCard}>
                    <div style={styles.videoPlaceholder}>
                      <Video size={36} color="rgba(255,255,255,0.2)" />
                      <span style={styles.durationBadge}>{c.duration}s</span>
                    </div>
                    <div style={styles.clipBody}>
                      <h4 style={styles.clipTitle}>{c.ai_content?.title || `Clip #${c.index}`}</h4>
                      <p style={styles.clipDesc}>{c.ai_content?.description}</p>
                      
                      <div style={styles.actionsRow}>
                        <a href={`/download/${c.filename}`} className="btn btn-secondary" style={styles.iconBtn} title="Download Clip">
                          <Download size={14} /> Download
                        </a>
                        <button className="btn btn-primary" onClick={() => handleOpenScheduler(c)} style={styles.iconBtn}>
                          <Calendar size={14} /> Schedule
                        </button>
                        <button className="btn btn-danger" onClick={() => handleDeleteClip(c.clip_id)} style={styles.iconBtnSquare}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: QUEUE */}
        {activeTab === 'queue' && (
          <div style={styles.queueTab}>
            {queueItems.length === 0 ? (
              <div style={styles.emptyState}>No scheduled publications in queue.</div>
            ) : (
              <div style={styles.queueList}>
                {queueItems.map(item => (
                  <div key={item.queue_id} className="glass-panel" style={styles.queueCard}>
                    <div style={styles.queueHeader}>
                      <div style={styles.platformIndicator}>
                        <span style={styles.platformBadge}>{item.platform.toUpperCase()}</span>
                        <span style={styles.statusBadge}>{item.status}</span>
                      </div>
                      <button className="btn btn-danger" onClick={() => handleCancelQueue(item.queue_id)} style={styles.iconBtnSquare}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div style={styles.queueBody}>
                      <h4 style={styles.queueTitle}>{item.title}</h4>
                      <p style={styles.queueTime}>
                        Scheduled: <strong>{new Date(item.schedule_time).toLocaleString()}</strong>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Scheduler Modal */}
      {schedulingClip && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>Schedule Post</h3>
              <button style={styles.closeBtn} onClick={() => setSchedulingClip(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleScheduleSubmit} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label>Platform</label>
                <select value={schedulePlatform} onChange={(e) => setSchedulePlatform(e.target.value)} style={styles.modalInput}>
                  <option value="facebook">Facebook Reels / Page Video</option>
                  <option value="tiktok">TikTok Video</option>
                  <option value="youtube">YouTube Shorts</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label>Schedule Time (Local Time)</label>
                <input
                  type="datetime-local"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  style={styles.modalInput}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label>Post Title</label>
                <input
                  type="text"
                  value={scheduleTitle}
                  onChange={(e) => setScheduleTitle(e.target.value)}
                  style={styles.modalInput}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label>Post Caption</label>
                <textarea
                  value={scheduleDesc}
                  onChange={(e) => setScheduleDesc(e.target.value)}
                  style={{ ...styles.modalInput, height: '80px', resize: 'none' }}
                />
              </div>

              <div style={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setSchedulingClip(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add to Queue</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px 20px',
    width: '100%',
  },
  header: {
    height: '60px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: '700',
    fontFamily: 'var(--font-display)',
  },
  logoAccent: {
    color: 'var(--accent-primary)',
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userEmail: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  freeBadge: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  premiumBadge: {
    background: 'rgba(139,92,246,0.15)',
    border: '1px solid var(--accent-primary)',
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '11px',
    color: 'var(--accent-primary)',
    fontWeight: '600',
  },
  analyticsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '30px',
  },
  metricCard: {
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  metricLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  metricVal: {
    fontSize: '22px',
    fontWeight: '700',
    marginTop: '4px',
  },
  tabBar: {
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    marginBottom: '24px',
  },
  tabBtn: {
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--text-secondary)',
    padding: '12px 16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontFamily: 'var(--font-display)',
  },
  activeTabBtn: {
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid var(--accent-primary)',
    color: '#fff',
    padding: '12px 16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: 'var(--font-display)',
  },
  mainContent: {
    minHeight: '400px',
  },
  uploadTab: {
    display: 'grid',
    gridTemplateColumns: '1fr 350px',
    gap: '24px',
    alignItems: 'start',
  },
  uploadCard: {
    padding: '24px',
  },
  uploadForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  dropZone: {
    border: '2px dashed var(--border-color)',
    borderRadius: '10px',
    padding: '40px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  fileHint: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  moodSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  sectionLabel: {
    fontSize: '14px',
    fontWeight: '500',
  },
  moodGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  moodBadge: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  activeMoodBadge: {
    background: 'rgba(139,92,246,0.1)',
    border: '1px solid var(--accent-primary)',
    color: 'var(--text-primary)',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  submitBtn: {
    padding: '12px',
  },
  telemetryCard: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  telemetryTitle: {
    fontSize: '16px',
    fontFamily: 'var(--font-display)',
  },
  progressRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  progressTrack: {
    flex: '1',
    height: '6px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '99px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
    transition: 'width 0.4s ease',
  },
  progressLabel: {
    fontSize: '13px',
    fontWeight: '600',
  },
  telemetryStatus: {
    fontSize: '14px',
  },
  errorBox: {
    background: 'rgba(239,68,68,0.1)',
    color: 'var(--error)',
    padding: '10px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  renderedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  jobClipItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    background: 'rgba(255,255,255,0.02)',
    padding: '8px',
    borderRadius: '4px',
  },
  successBadge: {
    color: 'var(--success)',
    fontWeight: '600',
  },
  filterBar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  searchWrapper: {
    flex: '1',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '0 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    width: '100%',
    color: '#fff',
    outline: 'none',
    fontSize: '14px',
    height: '38px',
  },
  filterSelect: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    color: '#fff',
    outline: 'none',
    padding: '0 12px',
    fontSize: '14px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px',
    color: 'var(--text-secondary)',
  },
  clipsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
  },
  clipCard: {
    overflow: 'hidden',
  },
  videoPlaceholder: {
    height: '160px',
    background: 'rgba(255,255,255,0.02)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderBottom: '1px solid var(--border-color)',
  },
  durationBadge: {
    position: 'absolute',
    bottom: '8px',
    right: '8px',
    background: 'rgba(0,0,0,0.6)',
    color: '#fff',
    fontSize: '11px',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  clipBody: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  clipTitle: {
    fontSize: '15px',
    fontWeight: '600',
  },
  clipDesc: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    display: '-webkit-box',
    WebkitLineClamp: '2',
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  actionsRow: {
    display: 'flex',
    gap: '8px',
    marginTop: '6px',
  },
  iconBtn: {
    flex: '1',
    padding: '6px 12px',
    fontSize: '12px',
  },
  iconBtnSquare: {
    padding: '6px 10px',
  },
  queueList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  queueCard: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  queueHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  platformIndicator: {
    display: 'flex',
    gap: '8px',
  },
  platformBadge: {
    background: 'rgba(255,255,255,0.05)',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
  },
  statusBadge: {
    background: 'rgba(16,185,129,0.15)',
    color: 'var(--success)',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
  },
  queueTitle: {
    fontSize: '15px',
  },
  queueTime: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modalContent: {
    width: '450px',
    padding: '24px',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  modalInput: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '8px 12px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '10px',
  },
  toastContainer: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    zIndex: 99999,
  },
  toast: {
    background: '#1F1F29',
    color: '#fff',
    padding: '12px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    minWidth: '250px',
  },
}

export default Dashboard
