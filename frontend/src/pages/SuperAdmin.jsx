import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, Users, Video, Library, Calendar, Server, Settings,
  AlertTriangle, RefreshCw, Trash2, Search, Filter, ShieldAlert,
  Play, Plus, CheckCircle, XCircle, LogOut, Terminal, Key, Database
} from 'lucide-react'

function SuperAdmin() {
  const navigate = useNavigate()
  
  // Auth State
  const [adminEmail, setAdminEmail] = useState(() => localStorage.getItem('clipmood_admin_email') || '')
  const [adminSecret, setAdminSecret] = useState(() => localStorage.getItem('clipmood_admin_secret') || '')
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('clipmood_admin_email'))
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Form states for login
  const [loginEmailForm, setLoginEmailForm] = useState('')
  const [loginSecretForm, setLoginSecretForm] = useState('')

  // Navigation state
  const [activeTab, setActiveTab] = useState('dashboard') // dashboard, users, videos, clips, queue, system, settings

  // Dashboard Data states
  const [dashboardStats, setDashboardStats] = useState(null)
  const [usersList, setUsersList] = useState([])
  const [videosList, setVideosList] = useState([])
  const [clipsList, setClipsList] = useState([])
  const [queueList, setQueueList] = useState([])
  const [systemHealth, setSystemHealth] = useState(null)
  const [apiUsage, setApiUsage] = useState(null)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [logsList, setLogsList] = useState([])
  const [settingsData, setSettingsData] = useState(null)

  // Loading & refresh states
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(null) // ID of current action

  // Filter & Search states
  const [userSearch, setUserSearch] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [videoFilter, setVideoFilter] = useState('')
  
  // Create user form
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [createEmail, setCreateEmail] = useState('')
  const [createRole, setCreateRole] = useState('free')

  // Edit clip modal state
  const [editingClip, setEditingClip] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editHashtags, setEditHashtags] = useState('')

  // Settings form states
  const [settingsProvider, setSettingsProvider] = useState('gemini')
  const [settingsDisableFallbacks, setSettingsDisableFallbacks] = useState(false)
  const [settingsFacebookMode, setSettingsFacebookMode] = useState('mock')
  const [settingsGeminiKey, setSettingsGeminiKey] = useState('')
  const [settingsOpenaiKey, setSettingsOpenaiKey] = useState('')
  const [settingsAdminSecret, setSettingsAdminSecret] = useState('')

  // Toast notification state
  const [toasts, setToasts] = useState([])

  const showToast = (message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  // Effect to fetch active tab data
  useEffect(() => {
    if (isLoggedIn) {
      fetchTabData()
    }
  }, [isLoggedIn, activeTab, userFilter, videoFilter])

  // System Poller effect (only for Telemetry/Dashboard)
  useEffect(() => {
    let timer = null
    if (isLoggedIn && (activeTab === 'dashboard' || activeTab === 'system')) {
      timer = setInterval(() => {
        fetchTabData(true) // silent refresh
      }, 5000)
    }
    return () => clearInterval(timer)
  }, [isLoggedIn, activeTab])

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!loginEmailForm.trim() || !loginSecretForm.trim()) {
      setLoginError('All login fields are required.')
      return
    }

    setLoginError('')
    setLoginLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmailForm.trim(), secret: loginSecretForm.trim() })
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        localStorage.setItem('clipmood_admin_email', data.email)
        localStorage.setItem('clipmood_admin_secret', loginSecretForm.trim())
        setAdminEmail(data.email)
        setAdminSecret(loginSecretForm.trim())
        setIsLoggedIn(true)
        showToast('Login successful. Authorized.', 'success')
      } else {
        setLoginError(data.error || 'Authentication rejected.')
      }
    } catch (err) {
      setLoginError('Network connection failed. Server offline?')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('clipmood_admin_email')
    localStorage.removeItem('clipmood_admin_secret')
    setAdminEmail('')
    setAdminSecret('')
    setIsLoggedIn(false)
    showToast('Logged out successfully.', 'info')
  }

  const fetchTabData = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const authQuery = `email=${encodeURIComponent(adminEmail)}`
      
      if (activeTab === 'dashboard') {
        const res = await fetch(`/api/admin/dashboard?${authQuery}`)
        if (res.ok) {
          const data = await res.json()
          setDashboardStats(data)
        } else if (res.status === 401 || res.status === 403) {
          handleLogout()
        }
      } 
      
      else if (activeTab === 'users') {
        const res = await fetch(`/api/admin/users?${authQuery}&search=${encodeURIComponent(userSearch)}&filter=${encodeURIComponent(userFilter)}`)
        if (res.ok) {
          const data = await res.json()
          setUsersList(data.users || [])
        }
      } 
      
      else if (activeTab === 'videos') {
        const res = await fetch(`/api/admin/videos?${authQuery}&filter=${encodeURIComponent(videoFilter)}`)
        if (res.ok) {
          const data = await res.json()
          setVideosList(data.videos || [])
        }
      } 
      
      else if (activeTab === 'clips') {
        const res = await fetch(`/api/admin/clips?${authQuery}`)
        if (res.ok) {
          const data = await res.json()
          setClipsList(data.clips || [])
        }
      } 
      
      else if (activeTab === 'queue') {
        const res = await fetch(`/api/admin/queue?${authQuery}`)
        if (res.ok) {
          const data = await res.json()
          setQueueList(data.queue || [])
        }
      } 
      
      else if (activeTab === 'system') {
        // Fetch health
        const resHealth = await fetch(`/api/admin/system?${authQuery}`)
        if (resHealth.ok) {
          const healthData = await resHealth.json()
          setSystemHealth(healthData)
        }
        
        // Fetch API usage
        const resUsage = await fetch(`/api/admin/api-usage?${authQuery}`)
        if (resUsage.ok) {
          const usageData = await resUsage.json()
          setApiUsage(usageData)
        }

        // Fetch logs
        const resLogs = await fetch(`/api/admin/logs?${authQuery}`)
        if (resLogs.ok) {
          const logsData = await resLogs.json()
          setLogsList(logsData.logs || [])
        }
      } 
      
      else if (activeTab === 'settings') {
        const res = await fetch(`/api/admin/settings?${authQuery}`)
        if (res.ok) {
          const data = await res.json()
          setSettingsData(data)
          setSettingsProvider(data.provider || 'gemini')
          setSettingsDisableFallbacks(data.disable_fallbacks || false)
          setSettingsFacebookMode(data.facebook_mode || 'mock')
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  // Trigger User management Actions
  const handleUserAction = async (targetEmail, action, extra = {}) => {
    setActionLoading(`${targetEmail}-${action}`)
    try {
      const res = await fetch(`/api/admin/users/action?email=${encodeURIComponent(adminEmail)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, target_email: targetEmail, ...extra })
      })
      if (res.ok) {
        showToast(`User action '${action}' processed.`, 'success')
        fetchTabData(true)
        if (action === 'create') {
          setShowCreateUser(false)
          setCreateEmail('')
        }
      } else {
        const err = await res.json()
        showToast(err.error || 'Failed user action.', 'error')
      }
    } catch (e) {
      showToast('Network error processing user action.', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // Trigger Video management Actions
  const handleVideoAction = async (videoId, action) => {
    setActionLoading(`${videoId}-${action}`)
    try {
      const res = await fetch(`/api/admin/videos/action?email=${encodeURIComponent(adminEmail)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, video_id: videoId })
      })
      if (res.ok) {
        showToast(`Video job '${action}' processed.`, 'success')
        fetchTabData(true)
      } else {
        const err = await res.json()
        showToast(err.error || 'Failed video action.', 'error')
      }
    } catch (e) {
      showToast('Network error processing video action.', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // Trigger Clip Catalog Actions
  const handleClipAction = async (clipId, action, extra = {}) => {
    setActionLoading(`${clipId}-${action}`)
    try {
      const res = await fetch(`/api/admin/clips/action?email=${encodeURIComponent(adminEmail)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, clip_id: clipId, ...extra })
      })
      if (res.ok) {
        showToast(`Clip action '${action}' completed.`, 'success')
        setEditingClip(null)
        fetchTabData(true)
      } else {
        const err = await res.json()
        showToast(err.error || 'Failed clip action.', 'error')
      }
    } catch (e) {
      showToast('Network error processing clip action.', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // Trigger Queue Actions
  const handleQueueAction = async (queueId, action) => {
    setActionLoading(`${queueId}-${action}`)
    try {
      const res = await fetch(`/api/admin/queue/action?email=${encodeURIComponent(adminEmail)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, queue_id: queueId })
      })
      if (res.ok) {
        showToast(`Scheduled post action '${action}' processed.`, 'success')
        fetchTabData(true)
      } else {
        const err = await res.json()
        showToast(err.error || 'Failed queue action.', 'error')
      }
    } catch (e) {
      showToast('Network error processing queue action.', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // Update Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      // 1. Save provider parameters
      const resProvider = await fetch(`/api/admin/settings/apis?email=${encodeURIComponent(adminEmail)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_provider_settings',
          provider: settingsProvider,
          disable_fallbacks: settingsDisableFallbacks,
          facebook_mode: settingsFacebookMode
        })
      })

      // 2. Save rotated API keys if entered
      const rotatedPayload = {}
      if (settingsGeminiKey) rotatedPayload.gemini_api_key = settingsGeminiKey
      if (settingsOpenaiKey) rotatedPayload.openai_api_key = settingsOpenaiKey
      if (settingsAdminSecret) rotatedPayload.admin_secret = settingsAdminSecret

      if (Object.keys(rotatedPayload).length > 0) {
        const resKeys = await fetch(`/api/admin/settings/apis?email=${encodeURIComponent(adminEmail)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rotatedPayload)
        })
        if (!resKeys.ok) {
          showToast('Failed to rotate API keys.', 'error')
        }
      }

      if (resProvider.ok) {
        showToast('Settings saved successfully.', 'success')
        setSettingsGeminiKey('')
        setSettingsOpenaiKey('')
        setSettingsAdminSecret('')
        fetchTabData()
      } else {
        showToast('Error saving settings configuration.', 'error')
      }
    } catch (e) {
      showToast('Network error saving settings.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Render Login state
  if (!isLoggedIn) {
    return (
      <div style={styles.loginContainer}>
        <div className="glass-panel" style={styles.loginCard}>
          <div style={styles.loginHeader}>
            <Shield size={36} color="var(--accent-primary)" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Super Admin Gate</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Authorize via credential keys</p>
          </div>

          {loginError && (
            <div style={styles.errorAlert}>
              <AlertTriangle size={18} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={styles.loginForm}>
            <div style={styles.formGroup}>
              <label>Administrator Email</label>
              <input
                type="email"
                placeholder="admin@clipmood.com"
                value={loginEmailForm}
                onChange={(e) => setLoginEmailForm(e.target.value)}
                style={styles.formInput}
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label>System Secret Key</label>
              <input
                type="password"
                placeholder="••••••••••••••••"
                value={loginSecretForm}
                onChange={(e) => setLoginSecretForm(e.target.value)}
                style={styles.formInput}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loginLoading}>
              {loginLoading ? 'Authenticating...' : 'Enter Admin Terminal'}
            </button>
          </form>

          <button onClick={() => navigate('/')} className="btn btn-secondary" style={{ width: '100%', marginTop: '10px' }}>
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.adminContainer}>
      {/* Sidebar Nav */}
      <aside className="glass-panel" style={styles.sidebar}>
        <div style={styles.sidebarBrand}>
          <Shield color="var(--accent-secondary)" size={24} />
          <span>ClipMood <span style={{ color: 'var(--accent-primary)' }}>Admin</span></span>
        </div>
        
        <div style={styles.sidebarProfile}>
          <div style={styles.avatar}>A</div>
          <div style={styles.profileText}>
            <div style={{ fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{adminEmail}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Root Authority</div>
          </div>
        </div>

        <nav style={styles.sidebarNav}>
          <button style={activeTab === 'dashboard' ? styles.navActive : styles.navLink} onClick={() => setActiveTab('dashboard')}>
            <Server size={18} /> Dashboard
          </button>
          <button style={activeTab === 'users' ? styles.navActive : styles.navLink} onClick={() => setActiveTab('users')}>
            <Users size={18} /> Users
          </button>
          <button style={activeTab === 'videos' ? styles.navActive : styles.navLink} onClick={() => setActiveTab('videos')}>
            <Video size={18} /> Video Jobs
          </button>
          <button style={activeTab === 'clips' ? styles.navActive : styles.navLink} onClick={() => setActiveTab('clips')}>
            <Library size={18} /> Clips Catalog
          </button>
          <button style={activeTab === 'queue' ? styles.navActive : styles.navLink} onClick={() => setActiveTab('queue')}>
            <Calendar size={18} /> Scheduled Queue
          </button>
          <button style={activeTab === 'system' ? styles.navActive : styles.navLink} onClick={() => setActiveTab('system')}>
            <Database size={18} /> System Telemetry
          </button>
          <button style={activeTab === 'settings' ? styles.navActive : styles.navLink} onClick={() => setActiveTab('settings')}>
            <Settings size={18} /> Key Rotations
          </button>
        </nav>

        <button onClick={handleLogout} className="btn btn-danger" style={styles.logoutButton}>
          <LogOut size={16} /> Log Out
        </button>
      </aside>

      {/* Main Body Panel */}
      <main style={styles.mainContent}>
        <header style={styles.header}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Control
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>System dashboard operations and telemetry logs</p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => fetchTabData(false)} className="btn btn-secondary" style={{ padding: '8px 12px' }} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'spin-anim' : ''} />
              Reload Tab
            </button>
            <button onClick={() => navigate('/tool?email=' + adminEmail)} className="btn btn-primary" style={{ padding: '8px 16px' }}>
              Launch SaaS
            </button>
          </div>
        </header>

        {/* ═══════════════════════════════════════════════════════
             TAB: DASHBOARD OVERVIEW
           ═══════════════════════════════════════════════════════ */}
        {activeTab === 'dashboard' && dashboardStats && (
          <div style={styles.tabContent}>
            {dashboardStats.alerts && dashboardStats.alerts.length > 0 && (
              <div style={styles.alertBannerStack}>
                {dashboardStats.alerts.map((alert, idx) => (
                  <div key={idx} style={styles.systemAlert}>
                    <ShieldAlert size={20} color="var(--error)" />
                    <div>
                      <h4 style={{ fontWeight: 600, color: 'var(--text-primary)' }}>System Alert Triggered</h4>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{alert}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={styles.statsGrid}>
              <div className="glass-panel" style={styles.metricCard}>
                <div style={styles.metricIconBox}><Users size={20} color="var(--accent-primary)" /></div>
                <div style={styles.metricNum}>{dashboardStats.total_users}</div>
                <div style={styles.metricLabel}>Platform Users</div>
                <div style={styles.metricSubLabel}>{dashboardStats.premium_users} on premium plans</div>
              </div>
              <div className="glass-panel" style={styles.metricCard}>
                <div style={styles.metricIconBox}><Video size={20} color="var(--accent-secondary)" /></div>
                <div style={styles.metricNum}>{dashboardStats.total_videos}</div>
                <div style={styles.metricLabel}>Uploaded Videos</div>
                <div style={styles.metricSubLabel}>{dashboardStats.processing_count} in render processing</div>
              </div>
              <div className="glass-panel" style={styles.metricCard}>
                <div style={styles.metricIconBox}><Library size={20} color="#10B981" /></div>
                <div style={styles.metricNum}>{dashboardStats.total_clips}</div>
                <div style={styles.metricLabel}>Extracted Clips</div>
                <div style={styles.metricSubLabel}>{dashboardStats.failed_jobs} failed pipeline attempts</div>
              </div>
              <div className="glass-panel" style={styles.metricCard}>
                <div style={styles.metricIconBox}><Calendar size={20} color="#F59E0B" /></div>
                <div style={styles.metricNum}>${(dashboardStats.revenue / 100).toFixed(2)}</div>
                <div style={styles.metricLabel}>Calculated SaaS Revenue</div>
                <div style={styles.metricSubLabel}>{dashboardStats.queued_count} scheduled post actions queued</div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '30px', marginTop: '24px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '15px' }}>System Operational Overview</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', maxWidth: '800px' }}>
                All systems functional. The automated content queue daemon processes scheduling actions every 30 seconds. Video rendering is utilizing the local FFmpeg layer. Speech-to-text uses Whisper API with fallback evaluation logic.
              </p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
             TAB: USER MANAGEMENT
           ═══════════════════════════════════════════════════════ */}
        {activeTab === 'users' && (
          <div style={styles.tabContent}>
            <div style={styles.filterBar}>
              <div style={styles.searchBox}>
                <Search size={18} color="var(--text-secondary)" />
                <input
                  type="text"
                  placeholder="Search user email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchTabData()}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} style={styles.selectFilter}>
                  <option value="">All Tiers</option>
                  <option value="free">Free Tier</option>
                  <option value="premium">Premium</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>

                <button onClick={() => setShowCreateUser(!showCreateUser)} className="btn btn-primary" style={{ padding: '8px 14px' }}>
                  <Plus size={16} /> Add User
                </button>
              </div>
            </div>

            {showCreateUser && (
              <div className="glass-panel" style={styles.actionModalOverlay}>
                <div style={styles.actionFormCard}>
                  <h4>Create User Profile</h4>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                    <input
                      type="email"
                      placeholder="user@gmail.com"
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      style={styles.formInput}
                    />
                    <select value={createRole} onChange={(e) => setCreateRole(e.target.value)} style={styles.selectFilter}>
                      <option value="free">Free</option>
                      <option value="premium">Premium</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                    <button
                      onClick={() => handleUserAction(createEmail, 'create', { role: createRole })}
                      className="btn btn-primary"
                      disabled={!createEmail}
                    >
                      Save Profile
                    </button>
                    <button onClick={() => setShowCreateUser(false)} className="btn btn-secondary">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            <div className="glass-panel" style={{ overflow: 'hidden' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>User Account</th>
                    <th>Role Tier</th>
                    <th>Premium Status</th>
                    <th>Suspension status</th>
                    <th>Activated At</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                        No platform user accounts found.
                      </td>
                    </tr>
                  ) : (
                    usersList.map((user) => (
                      <tr key={user.email}>
                        <td style={{ fontWeight: 600 }}>{user.email}</td>
                        <td>
                          <span style={styles.badgeRole(user.role)}>
                            {user.role}
                          </span>
                        </td>
                        <td>
                          {user.is_premium ? (
                            <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle size={14} /> Active
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>Free Limit</span>
                          )}
                        </td>
                        <td>
                          {user.is_suspended ? (
                            <span style={{ color: 'var(--error)' }}>Suspended</span>
                          ) : (
                            <span style={{ color: 'var(--success)' }}>Active Status</span>
                          )}
                        </td>
                        <td>{user.activated_at ? new Date(user.activated_at).toLocaleDateString() : 'N/A'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={styles.actionButtonContainer}>
                            <button
                              onClick={() => handleUserAction(user.email, 'toggle_premium')}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              disabled={actionLoading === `${user.email}-toggle_premium`}
                            >
                              Toggle Premium
                            </button>
                            <button
                              onClick={() => handleUserAction(user.email, 'toggle_suspension', { is_suspended: !user.is_suspended })}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '12px', color: user.is_suspended ? 'var(--success)' : 'var(--warning)' }}
                              disabled={actionLoading === `${user.email}-toggle_suspension`}
                            >
                              {user.is_suspended ? 'Unsuspend' : 'Suspend'}
                            </button>
                            <button
                              onClick={() => handleUserAction(user.email, 'delete')}
                              className="btn btn-danger"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              disabled={actionLoading === `${user.email}-delete`}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
             TAB: VIDEOS MONITOR
           ═══════════════════════════════════════════════════════ */}
        {activeTab === 'videos' && (
          <div style={styles.tabContent}>
            <div style={styles.filterBar}>
              <select value={videoFilter} onChange={(e) => setVideoFilter(e.target.value)} style={styles.selectFilter}>
                <option value="">All Statuses</option>
                <option value="queued">Queued</option>
                <option value="transcribing">Transcribing</option>
                <option value="detecting moments">Detecting Moments</option>
                <option value="rendering clips">Rendering Clips</option>
                <option value="done">Completed</option>
                <option value="error">Failed Jobs</option>
              </select>
            </div>

            <div className="glass-panel" style={{ overflow: 'hidden' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Job ID</th>
                    <th>Filename</th>
                    <th>Uploaded By</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Total Duration</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {videosList.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                        No video uploading logs found.
                      </td>
                    </tr>
                  ) : (
                    videosList.map((video) => (
                      <tr key={video.video_id}>
                        <td style={{ fontFamily: 'monospace' }}>{video.video_id}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{video.filename}</td>
                        <td>{video.uploaded_by}</td>
                        <td>
                          <span style={styles.badgeStatus(video.status)}>
                            {video.status}
                          </span>
                        </td>
                        <td>
                          <div style={styles.progressBarContainer}>
                            <div style={styles.progressBarFill(video.progress)}></div>
                            <span style={{ fontSize: '11px', marginLeft: '5px' }}>{video.progress}%</span>
                          </div>
                        </td>
                        <td>{video.total_duration ? video.total_duration.toFixed(1) + 's' : 'N/A'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={styles.actionButtonContainer}>
                            {video.status === 'error' && (
                              <button
                                onClick={() => handleVideoAction(video.video_id, 'retry')}
                                className="btn btn-primary"
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                disabled={actionLoading === `${video.video_id}-retry`}
                              >
                                <Play size={12} /> Retry Pipeline
                              </button>
                            )}
                            <button
                              onClick={() => handleVideoAction(video.video_id, 'delete')}
                              className="btn btn-danger"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              disabled={actionLoading === `${video.video_id}-delete`}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
             TAB: CLIPS CATALOG
           ═══════════════════════════════════════════════════════ */}
        {activeTab === 'clips' && (
          <div style={styles.tabContent}>
            {editingClip && (
              <div style={styles.modalOverlay}>
                <div className="glass-panel" style={styles.editClipCard}>
                  <h3>Edit Clip Metadata</h3>
                  <div style={styles.formGroup}>
                    <label>Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      style={styles.formInput}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label>Description</label>
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      style={{ ...styles.formInput, height: '100px', resize: 'vertical' }}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label>Hashtags (Comma Separated)</label>
                    <input
                      type="text"
                      value={editHashtags}
                      onChange={(e) => setEditHashtags(e.target.value)}
                      style={styles.formInput}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button
                      onClick={() => handleClipAction(editingClip.clip_id, 'edit_metadata', {
                        title: editTitle,
                        description: editDesc,
                        hashtags: editHashtags.split(',').map(h => h.trim()).filter(h => h)
                      })}
                      className="btn btn-primary"
                    >
                      Save Changes
                    </button>
                    <button onClick={() => setEditingClip(null)} className="btn btn-secondary">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            <div className="glass-panel" style={{ overflow: 'hidden' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Clip ID</th>
                    <th>Video ID</th>
                    <th>Title</th>
                    <th>Mood</th>
                    <th>Timeline</th>
                    <th>Virality Score</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clipsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                        No generated video clips found.
                      </td>
                    </tr>
                  ) : (
                    clipsList.map((clip) => (
                      <tr key={clip.clip_id}>
                        <td style={{ fontFamily: 'monospace' }}>{clip.clip_id}</td>
                        <td style={{ fontFamily: 'monospace' }}>{clip.video_id}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 600 }}>{clip.ai_content?.title || 'Clip Highlight'}</span>
                        </td>
                        <td>{clip.mood}</td>
                        <td>{clip.start.toFixed(1)}s ({clip.duration}s)</td>
                        <td>{(clip.score * 100).toFixed(0)}%</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={styles.actionButtonContainer}>
                            <button
                              onClick={() => {
                                setEditingClip(clip)
                                setEditTitle(clip.ai_content?.title || '')
                                setEditDesc(clip.ai_content?.description || '')
                                setEditHashtags((clip.ai_content?.hashtags || []).join(', '))
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                            >
                              Edit Metadata
                            </button>
                            <button
                              onClick={() => handleClipAction(clip.clip_id, 'regenerate_ai')}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              disabled={actionLoading === `${clip.clip_id}-regenerate_ai`}
                            >
                              Regen AI
                            </button>
                            <button
                              onClick={() => handleClipAction(clip.clip_id, 'delete')}
                              className="btn btn-danger"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              disabled={actionLoading === `${clip.clip_id}-delete`}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
             TAB: SCHEDULED QUEUE
           ═══════════════════════════════════════════════════════ */}
        {activeTab === 'queue' && (
          <div style={styles.tabContent}>
            <div className="glass-panel" style={{ overflow: 'hidden' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Queue ID</th>
                    <th>Clip ID</th>
                    <th>Target Post Title</th>
                    <th>Platform</th>
                    <th>Scheduled Publish Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queueList.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                        No social posting schedule events queued.
                      </td>
                    </tr>
                  ) : (
                    queueList.map((item) => (
                      <tr key={item.queue_id}>
                        <td style={{ fontFamily: 'monospace' }}>{item.queue_id}</td>
                        <td style={{ fontFamily: 'monospace' }}>{item.clip_id}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 600 }}>{item.title}</span>
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>{item.platform}</td>
                        <td>{new Date(item.schedule_time).toLocaleString()}</td>
                        <td>
                          <span style={styles.badgeStatus(item.status)}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={styles.actionButtonContainer}>
                            {item.status !== 'published' && (
                              <button
                                onClick={() => handleQueueAction(item.queue_id, 'publish_now')}
                                className="btn btn-primary"
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                disabled={actionLoading === `${item.queue_id}-publish_now`}
                              >
                                Publish Now
                              </button>
                            )}
                            {item.status === 'error' && (
                              <button
                                onClick={() => handleQueueAction(item.queue_id, 'retry')}
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                disabled={actionLoading === `${item.queue_id}-retry`}
                              >
                                Retry
                              </button>
                            )}
                            <button
                              onClick={() => handleQueueAction(item.queue_id, 'delete')}
                              className="btn btn-danger"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              disabled={actionLoading === `${item.queue_id}-delete`}
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
             TAB: TELEMETRY & SYSTEM HEALTH
           ═══════════════════════════════════════════════════════ */}
        {activeTab === 'system' && systemHealth && apiUsage && (
          <div style={styles.tabContent}>
            <div style={styles.statsGrid}>
              <div className="glass-panel" style={styles.telemetryCard}>
                <h4>CPU Utilization</h4>
                <div style={styles.telemetryNum}>{systemHealth.cpu}%</div>
                <div style={styles.progressBarContainer}>
                  <div style={styles.progressBarFill(systemHealth.cpu)}></div>
                </div>
              </div>
              <div className="glass-panel" style={styles.telemetryCard}>
                <h4>RAM Usage</h4>
                <div style={styles.telemetryNum}>{systemHealth.ram}%</div>
                <div style={styles.progressBarContainer}>
                  <div style={styles.progressBarFill(systemHealth.ram)}></div>
                </div>
              </div>
              <div className="glass-panel" style={styles.telemetryCard}>
                <h4>Disk Space Remaining</h4>
                <div style={styles.telemetryNum}>{systemHealth.disk_percent}%</div>
                <div style={styles.progressBarContainer}>
                  <div style={styles.progressBarFill(systemHealth.disk_percent)}></div>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>{systemHealth.disk_free_gb} GB Free space</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '15px' }}>Integration Connectivity</h3>
                <div style={styles.healthStatusList}>
                  <div style={styles.healthStatusRow}>
                    <span>MongoDB Database</span>
                    <span style={styles.statusPill(systemHealth.db_status)}>{systemHealth.db_detail}</span>
                  </div>
                  <div style={styles.healthStatusRow}>
                    <span>Google Gemini API</span>
                    <span style={styles.statusPill(systemHealth.gemini_status)}>{systemHealth.gemini_detail}</span>
                  </div>
                  <div style={styles.healthStatusRow}>
                    <span>OpenAI Whisper API</span>
                    <span style={styles.statusPill(systemHealth.whisper_status)}>{systemHealth.whisper_detail}</span>
                  </div>
                  <div style={styles.healthStatusRow}>
                    <span>Local FFmpeg Binary</span>
                    <span style={styles.statusPill(systemHealth.ffmpeg_status)}>{systemHealth.ffmpeg_detail}</span>
                  </div>
                  <div style={styles.healthStatusRow}>
                    <span>Poller Queue Daemon</span>
                    <span style={styles.statusPill(systemHealth.poller_status)}>{systemHealth.poller_detail}</span>
                  </div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '15px' }}>Resource & API Consumption</h3>
                <div style={styles.healthStatusList}>
                  <div style={styles.healthStatusRow}>
                    <span>Total Storage Rendered</span>
                    <span style={{ fontWeight: 600 }}>{apiUsage.storage_gb ? apiUsage.storage_gb.toFixed(4) : 0} GB</span>
                  </div>
                  <div style={styles.healthStatusRow}>
                    <span>Active Storage Files</span>
                    <span style={{ fontWeight: 600 }}>{apiUsage.total_files} clip assets</span>
                  </div>
                  <div style={styles.healthStatusRow}>
                    <span>API Invocations Today</span>
                    <span style={{ fontWeight: 600 }}>{apiUsage.requests_today} requests</span>
                  </div>
                  <div style={styles.healthStatusRow}>
                    <span>API Invocations Month</span>
                    <span style={{ fontWeight: 600 }}>{apiUsage.requests_month} requests</span>
                  </div>
                  <div style={styles.healthStatusRow}>
                    <span>Whisper Processing Time</span>
                    <span style={{ fontWeight: 600 }}>{apiUsage.whisper_minutes ? apiUsage.whisper_minutes.toFixed(1) : 0} minutes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Log Trail streaming view */}
            <div className="glass-panel" style={{ padding: '24px', marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Terminal size={20} color="var(--accent-primary)" /> Log Streaming Console
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Showing last 200 console rows</span>
              </div>
              <div style={styles.consoleBox}>
                {logsList.length === 0 ? (
                  <div style={{ color: '#4B5563', fontFamily: 'monospace' }}>No console logs available. Try refreshing.</div>
                ) : (
                  logsList.map((logLine, idx) => (
                    <div key={idx} style={styles.logRow}>{logLine}</div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
             TAB: KEY ROTATIONS & SETTINGS
           ═══════════════════════════════════════════════════════ */}
        {activeTab === 'settings' && settingsData && (
          <div style={styles.tabContent}>
            <form onSubmit={handleSaveSettings} className="glass-panel" style={{ padding: '30px', maxWidth: '800px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '20px' }}>Global API Key Configuration</h3>
              
              <div style={styles.settingsFormRow}>
                <div style={styles.formGroup}>
                  <label>Highlight Extraction Provider</label>
                  <select value={settingsProvider} onChange={(e) => setSettingsProvider(e.target.value)} style={styles.formInput}>
                    <option value="gemini">Google Gemini AI Evaluation</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label>Facebook Publisher API Mode</label>
                  <select value={settingsFacebookMode} onChange={(e) => setSettingsFacebookMode(e.target.value)} style={styles.formInput}>
                    <option value="mock">Simulated Facebook API</option>
                    <option value="live">Live Publishing Production</option>
                  </select>
                </div>
              </div>

              <div style={{ ...styles.formGroup, flexDirection: 'row', alignItems: 'center', gap: '10px', margin: '20px 0' }}>
                <input
                  type="checkbox"
                  id="disable_fallbacks"
                  checked={settingsDisableFallbacks}
                  onChange={(e) => setSettingsDisableFallbacks(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="disable_fallbacks" style={{ cursor: 'pointer', marginBottom: 0 }}>Disable local transcript lookup fallback</label>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '24px 0' }} />

              <h4 style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>Rotate System Secret Keys</h4>

              <div style={styles.formGroup}>
                <label>Rotate Google Gemini API Key</label>
                <input
                  type="password"
                  placeholder={settingsData.gemini_key_configured ? '•••••••••••••••• (API Key Active)' : 'Not configured'}
                  value={settingsGeminiKey}
                  onChange={(e) => setSettingsGeminiKey(e.target.value)}
                  style={styles.formInput}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Rotating this modifies variables in .env directly</span>
              </div>

              <div style={styles.formGroup}>
                <label>Rotate OpenAI Whisper API Key</label>
                <input
                  type="password"
                  placeholder={settingsData.openai_key_configured ? '•••••••••••••••• (API Key Active)' : 'Not configured'}
                  value={settingsOpenaiKey}
                  onChange={(e) => setSettingsOpenaiKey(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              <div style={styles.formGroup}>
                <label>Change Administrator Access Secret Key</label>
                <input
                  type="password"
                  placeholder={settingsData.admin_secret_configured ? '•••••••••••••••• (Gate Key Active)' : 'Default key active'}
                  value={settingsAdminSecret}
                  onChange={(e) => setSettingsAdminSecret(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '20px', padding: '12px 24px' }}>
                Save API Rotations
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Render Toast Alerts */}
      <div style={styles.toastContainer}>
        {toasts.map((toast) => (
          <div key={toast.id} style={styles.toast(toast.type)}>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  loginContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
  },
  loginCard: {
    width: '100%',
    maxWidth: '420px',
    padding: '40px',
    textAlign: 'center',
  },
  loginHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '30px',
  },
  loginForm: {
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '15px',
    width: '100%',
  },
  formInput: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#fff',
    fontSize: '15px',
    outline: 'none',
    width: '100%',
  },
  errorAlert: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.2)',
    color: 'var(--error)',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
    fontSize: '14px',
    textAlign: 'left',
  },
  adminContainer: {
    display: 'flex',
    minHeight: '100vh',
    width: '100%',
  },
  sidebar: {
    width: '260px',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    height: '100vh',
    position: 'sticky',
    top: 0,
    borderRadius: 0,
    background: 'rgba(11, 11, 15, 0.95)',
  },
  sidebarBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '20px',
    fontWeight: '700',
    fontFamily: 'var(--font-display)',
    marginBottom: '30px',
  },
  sidebarProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingBottom: '20px',
    borderBottom: '1px solid var(--border-color)',
    marginBottom: '24px',
  },
  avatar: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    color: '#fff',
  },
  profileText: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebarNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: '6px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  navActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: '6px',
    background: 'rgba(139, 92, 246, 0.1)',
    border: 'none',
    color: 'var(--accent-primary)',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: 600,
    borderLeft: '3px solid var(--accent-primary)',
  },
  logoutButton: {
    marginTop: 'auto',
    width: '100%',
  },
  mainContent: {
    flex: 1,
    padding: '40px',
    overflowY: 'auto',
    height: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '20px',
  },
  tabContent: {
    animation: 'fadeIn 0.3s ease',
  },
  alertBannerStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
  },
  systemAlert: {
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
  },
  metricCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
  },
  metricIconBox: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.03)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  metricNum: {
    fontSize: '32px',
    fontWeight: '700',
    fontFamily: 'var(--font-display)',
    lineHeight: 1.2,
    marginBottom: '4px',
  },
  metricLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  },
  metricSubLabel: {
    fontSize: '11px',
    color: '#6B7280',
  },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    gap: '20px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '8px 14px',
    width: '100%',
    maxWidth: '300px',
    color: '#fff',
    outline: 'none',
    input: {
      background: 'none',
      border: 'none',
      outline: 'none',
      color: '#fff',
      fontSize: '14px',
      width: '100%',
    }
  },
  selectFilter: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '8px 12px',
    color: '#fff',
    outline: 'none',
    cursor: 'pointer',
    fontSize: '14px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '14px',
    th: {
      padding: '16px 24px',
      borderBottom: '1px solid var(--border-color)',
      color: 'var(--text-secondary)',
      fontWeight: 500,
      fontSize: '12px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    td: {
      padding: '16px 24px',
      borderBottom: '1px solid var(--border-color)',
      color: 'var(--text-primary)',
      verticalAlign: 'middle',
    }
  },
  actionButtonContainer: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  badgeRole: (role) => {
    const isRoot = role === 'super_admin' || role === 'admin'
    return {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 600,
      textTransform: 'uppercase',
      background: isRoot ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
      color: isRoot ? 'var(--accent-primary)' : 'var(--text-secondary)',
      border: isRoot ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid var(--border-color)',
    }
  },
  badgeStatus: (status) => {
    let bg = 'rgba(255, 255, 255, 0.05)'
    let color = 'var(--text-secondary)'
    
    if (status === 'done' || status === 'published') {
      bg = 'rgba(16, 185, 129, 0.1)'
      color = 'var(--success)'
    } else if (status === 'error' || status === 'suspended') {
      bg = 'rgba(239, 68, 68, 0.1)'
      color = 'var(--error)'
    } else if (['processing', 'transcribing', 'detecting scenes', 'detecting moments', 'rendering clips', 'publishing'].includes(status)) {
      bg = 'rgba(245, 158, 11, 0.1)'
      color = 'var(--warning)'
    }
    
    return {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 600,
      textTransform: 'capitalize',
      background: bg,
      color: color,
    }
  },
  progressBarContainer: {
    display: 'flex',
    alignItems: 'center',
    width: '100px',
    height: '6px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBarFill: (progress) => ({
    width: `${progress}%`,
    height: '100%',
    background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
    borderRadius: '3px',
  }),
  telemetryCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  telemetryNum: {
    fontSize: '44px',
    fontWeight: '700',
    fontFamily: 'var(--font-display)',
    lineHeight: 1.1,
  },
  healthStatusList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  healthStatusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    paddingBottom: '10px',
  },
  statusPill: (status) => {
    const isOk = status === 'healthy' || status.toLowerCase().includes('active')
    return {
      fontSize: '11px',
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: '12px',
      background: isOk ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
      color: isOk ? 'var(--success)' : 'var(--error)',
    }
  },
  consoleBox: {
    background: '#040406',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '16px',
    height: '250px',
    overflowY: 'auto',
    fontFamily: 'monospace',
    fontSize: '12px',
    lineHeight: '1.5',
    color: '#10B981',
  },
  logRow: {
    borderBottom: '1px solid rgba(255,255,255,0.01)',
    padding: '4px 0',
  },
  settingsFormRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    width: '100%',
  },
  toastContainer: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    zIndex: 9999,
  },
  toast: (type) => {
    let bg = '#121218'
    let border = '1px solid var(--border-color)'
    if (type === 'success') {
      border = '1px solid var(--success)'
    } else if (type === 'error') {
      border = '1px solid var(--error)'
    } else if (type === 'info') {
      border = '1px solid var(--accent-primary)'
    }
    return {
      background: bg,
      border: border,
      color: '#fff',
      padding: '12px 20px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      fontSize: '14px',
      minWidth: '200px',
      maxWidth: '350px',
      animation: 'slideIn 0.2s cubic-bezier(0, 0, 0.2, 1)',
    }
  },
  actionModalOverlay: {
    padding: '20px',
    marginBottom: '20px',
    background: 'rgba(255, 255, 255, 0.01)',
  },
  actionFormCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  editClipCard: {
    width: '100%',
    maxWidth: '500px',
    padding: '30px',
  }
}

export default SuperAdmin
