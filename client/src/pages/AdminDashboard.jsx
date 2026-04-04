import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Download, Users, Trash2, Plus, LogOut, CheckCircle2, Sun, Moon, Edit2, Check, X, ChevronRight, Archive, KeyRound, Inbox, FileSpreadsheet, AlertCircle } from 'lucide-react';

const API_BASE = 'https://tnp-attendance-system-production-5a81.up.railway.app';

const MONTHS = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
const parseDate = (dateStr) => {
  if (!dateStr) return new Date(0);
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1].toLowerCase().slice(0, 3);
    const month = MONTHS[monthStr];
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

// ─── Toast Component ───
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 2000,
      padding: '14px 22px', borderRadius: '12px',
      display: 'flex', alignItems: 'center', gap: '10px',
      fontSize: '13.5px', fontWeight: '600',
      animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      background: type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--accent-color)',
      color: type === 'success' ? '#022c22' : 'white'
    }}>
      {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      {message}
    </div>
  );
};

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newSubjects, setNewSubjects] = useState('');
  const [activeTab, setActiveTab] = useState('attendance'); 

  const [editingId, setEditingId] = useState(null);
  const [editSubjectsInput, setEditSubjectsInput] = useState('');
  const [expandedDate, setExpandedDate] = useState(null);

  // Marked attendances
  const [showMarked, setShowMarked] = useState(false);
  const [markedData, setMarkedData] = useState([]);
  const [markedLoading, setMarkedLoading] = useState(false);
  const [markedExpandedDate, setMarkedExpandedDate] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  // Change password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'professors') fetchProfessors();
    if (activeTab === 'attendance') fetchAttendance();
  }, [activeTab]);

  const fetchProfessors = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/admin/professors`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setProfessors(res.data);
    } catch (error) {
      console.error(error);
      showToast('Failed to fetch professors', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/attendance`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarkedAttendances = async () => {
    try {
      setMarkedLoading(true);
      const res = await axios.get(`${API_BASE}/attendance/marked`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setMarkedData(res.data);
    } catch (error) {
      console.error('Failed to fetch marked attendances', error);
      showToast('Failed to load marked records', 'error');
    } finally {
      setMarkedLoading(false);
    }
  };

  // Group data by date, sorted by roll
  const groupedData = useMemo(() => {
    const groups = {};
    data.forEach(row => {
      if (!groups[row.date]) groups[row.date] = [];
      groups[row.date].push(row);
    });
    Object.values(groups).forEach(arr => {
      arr.sort((a, b) => (a.roll || '').localeCompare(b.roll || '', undefined, { numeric: true, sensitivity: 'base' }));
    });
    return groups;
  }, [data]);

  const datesList = useMemo(() => {
    return Object.keys(groupedData).sort((a, b) => parseDate(a).getTime() - parseDate(b).getTime());
  }, [groupedData]);

  // Group marked data by date
  const groupedMarkedData = useMemo(() => {
    const groups = {};
    markedData.forEach(row => {
      if (!groups[row.date]) groups[row.date] = [];
      groups[row.date].push(row);
    });
    Object.values(groups).forEach(arr => {
      arr.sort((a, b) => (a.roll || '').localeCompare(b.roll || '', undefined, { numeric: true, sensitivity: 'base' }));
    });
    return groups;
  }, [markedData]);

  const markedDatesList = useMemo(() => {
    return Object.keys(groupedMarkedData).sort((a, b) => parseDate(b).getTime() - parseDate(a).getTime());
  }, [groupedMarkedData]);

  const handleAddProfessor = async (e) => {
    e.preventDefault();
    if (!newEmail.endsWith('@iiitsurat.ac.in')) {
      showToast('Must use @iiitsurat.ac.in email', 'error');
      return;
    }
    try {
      await axios.post(`${API_BASE}/admin/add-professor`, 
        { email: newEmail, password: newPassword, subject: newSubjects },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setNewEmail(''); setNewPassword(''); setNewSubjects('');
      await fetchProfessors();
      showToast('Professor added successfully');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to add professor', 'error');
    }
  };

  const handleRemoveProfessor = async (id) => {
    if (!window.confirm('Are you sure you want to remove this professor?')) return;
    try {
      await axios.delete(`${API_BASE}/admin/remove-professor/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      await fetchProfessors();
      showToast('Professor removed');
    } catch (error) {
      showToast('Failed to remove professor', 'error');
    }
  };

  const startEditing = (prof) => {
    setEditingId(prof._id);
    setEditSubjectsInput(prof.subjects ? prof.subjects.join(', ') : '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditSubjectsInput('');
  };

  const saveEditedSubjects = async (id) => {
    try {
      await axios.put(`${API_BASE}/admin/update-subjects/${id}`, 
        { subject: editSubjectsInput },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setEditingId(null);
      await fetchProfessors();
      showToast('Subjects updated');
    } catch (error) {
      showToast('Failed to update subjects', 'error');
    }
  };

  const handleExportCSV = () => {
    axios({
      url: `${API_BASE}/attendance/download?format=csv`,
      method: 'GET',
      responseType: 'blob',
      headers: { Authorization: `Bearer ${user.token}` }
    }).then((response) => {
       const header = response.headers['content-disposition'];
       let filename = 'global_attendance_report.csv';
       if (header) {
         const parts = header.split(';');
         for (let part of parts) {
           if (part.indexOf('filename=') !== -1) {
             filename = part.split('=')[1].trim().replace(/['"]/g, '');
           }
         }
       }
       const url = window.URL.createObjectURL(new Blob([response.data]));
       const link = document.createElement('a');
       link.href = url;
       link.setAttribute('download', filename);
       document.body.appendChild(link);
       link.click();
       showToast('CSV downloaded successfully');
    }).catch((error) => {
        if (error.response?.status === 404) {
            showToast('No data available to download', 'error');
        } else {
            showToast('Download failed', 'error');
        }
    });
  };

  const handleToggleMarked = () => {
    const next = !showMarked;
    setShowMarked(next);
    if (next) fetchMarkedAttendances();
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError(''); setPasswordSuccess('');

    if (newPwd !== confirmPwd) { setPasswordError('Passwords do not match'); return; }
    if (newPwd.length < 6) { setPasswordError('New password must be at least 6 characters'); return; }

    try {
      setPasswordLoading(true);
      await axios.post(`${API_BASE}/auth/change-password`,
        { currentPassword, newPassword: newPwd },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword(''); setNewPwd(''); setConfirmPwd('');
      setTimeout(() => { setShowPasswordModal(false); setPasswordSuccess(''); }, 1500);
    } catch (error) {
      setPasswordError(error.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordError(''); setPasswordSuccess('');
    setCurrentPassword(''); setNewPwd(''); setConfirmPwd('');
  };

  return (
    <div className="dashboard-layout">
      {/* ─── Sidebar ─── */}
      <div className="sidebar">
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.02em' }}>T&P Portal</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', fontWeight: '500' }}>Admin Dashboard</p>
        </div>
        
        <div className="nav-links">
          <button className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
            style={{ width: '100%', border: 'none', textAlign: 'left' }}>
            <CheckCircle2 size={17} /> Global Logs
          </button>
          <button className={`nav-item ${activeTab === 'professors' ? 'active' : ''}`}
            onClick={() => setActiveTab('professors')}
            style={{ width: '100%', border: 'none', textAlign: 'left' }}>
            <Users size={17} /> Professors
          </button>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            Logged in as
            <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '13px', marginTop: '2px', wordBreak: 'break-all' }}>{user.email}</div>
          </div>
          <button className="btn btn-secondary" onClick={() => setShowPasswordModal(true)} style={{ width: '100%', fontSize: '13px' }}>
            <KeyRound size={15} /> Change Password
          </button>
          <button className="btn btn-secondary" onClick={logout} style={{ width: '100%', fontSize: '13px' }}>
            <LogOut size={15} /> Logout
          </button>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="main-content">

        {/* ━━━ ATTENDANCE TAB ━━━ */}
        {activeTab === 'attendance' && (
          <>
            <div className="header">
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '6px', letterSpacing: '-0.02em' }}>Global Unprocessed Logs</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>All master sheet records pending processing</p>
              </div>
              <div className="actions-bar">
                <button className="btn btn-success" onClick={handleExportCSV}>
                  <Download size={15} /> Download CSV
                </button>
                <button className="btn btn-icon" onClick={toggleTheme}>
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              </div>
            </div>

            <div className="table-card">
              <div className="table-scroll">
                {loading ? (
                  <div className="loading-container">
                    <div className="spinner"></div>
                    <span className="loading-text">Fetching attendance data...</span>
                  </div>
                ) : datesList.length === 0 ? (
                  <div className="empty-state">
                    <Inbox size={44} className="empty-state-icon" />
                    <div className="empty-state-title">No unprocessed records</div>
                    <div className="empty-state-desc">All attendance records have been processed or no data is available yet.</div>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Register No</th>
                        <th>Student Name</th>
                        <th>Subject</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datesList.map(dateKey => (
                        <React.Fragment key={dateKey}>
                          <tr className="accordion-header-row"
                            onClick={() => setExpandedDate(prev => prev === dateKey ? null : dateKey)}>
                            <td colSpan="5">
                              <div className="accordion-inner">
                                <ChevronRight size={15} className={`accordion-chevron ${expandedDate === dateKey ? 'open' : ''}`} />
                                <span className="accordion-date">{dateKey}</span>
                                <span className="accordion-count">
                                  {groupedData[dateKey].length} record{groupedData[dateKey].length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </td>
                          </tr>
                          {expandedDate === dateKey && groupedData[dateKey].map((row, idx) => (
                            <tr key={`${dateKey}-${row.roll}-${idx}`}>
                              <td style={{ color: 'var(--text-muted)', fontSize: '13px', whiteSpace: 'nowrap' }}>{row.date}</td>
                              <td style={{ fontWeight: '600', fontFamily: 'monospace', fontSize: '13px' }}>{row.roll}</td>
                              <td>{row.name}</td>
                              <td><span className="chip">{row.subject}</span></td>
                              <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{row.reason || '—'}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Marked Attendances — 2 Level Accordion */}
            <div className="marked-section">
              <div className={`marked-section-header ${showMarked ? 'open' : ''}`}
                onClick={handleToggleMarked}>
                <Archive size={17} style={{ color: 'var(--accent-color)' }} />
                <span className="marked-section-title">Marked Attendances</span>
                {markedData.length > 0 && (
                  <span className="marked-badge">{markedData.length} record{markedData.length !== 1 ? 's' : ''}</span>
                )}
                <ChevronRight size={15} className={`accordion-chevron ${showMarked ? 'open' : ''}`}
                  style={{ marginLeft: 'auto' }} />
              </div>

              {showMarked && (
                <div className="marked-section-content">
                  {markedLoading ? (
                    <div className="loading-container">
                      <div className="spinner"></div>
                      <span className="loading-text">Loading marked records...</span>
                    </div>
                  ) : markedDatesList.length === 0 ? (
                    <div className="empty-state">
                      <FileSpreadsheet size={36} className="empty-state-icon" />
                      <div className="empty-state-title">No marked records</div>
                      <div className="empty-state-desc">Records marked as processed will appear here.</div>
                    </div>
                  ) : (
                    <div style={{ padding: '4px 0' }}>
                      {markedDatesList.map(dateKey => {
                        // Collect unique subjects for this date
                        const subjects = [...new Set(groupedMarkedData[dateKey].map(r => r.subject))].join(', ');
                        return (
                          <div key={dateKey}>
                            <div
                              onClick={() => setMarkedExpandedDate(prev => prev === dateKey ? null : dateKey)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '12px 18px', cursor: 'pointer',
                                borderBottom: '1px solid var(--border-subtle)',
                                transition: 'background 0.15s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <ChevronRight size={14} className={`accordion-chevron ${markedExpandedDate === dateKey ? 'open' : ''}`} />
                              <span style={{ fontSize: '13px', fontWeight: '600' }}> {dateKey}</span>
                              <span className="chip" style={{ fontSize: '10.5px', padding: '2px 8px' }}>{subjects}</span>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                {groupedMarkedData[dateKey].length} student{groupedMarkedData[dateKey].length !== 1 ? 's' : ''}
                              </span>
                            </div>

                            {markedExpandedDate === dateKey && (
                              <div style={{ background: 'var(--row-stripe)' }}>
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Register No</th>
                                      <th>Student Name</th>
                                      <th>Subject</th>
                                      <th>Reason</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {groupedMarkedData[dateKey].map((row, idx) => (
                                      <tr key={row._id || `${dateKey}-${idx}`}>
                                        <td style={{ fontWeight: '600', fontFamily: 'monospace', fontSize: '13px' }}>{row.roll || '—'}</td>
                                        <td>{row.name || '—'}</td>
                                        <td><span className="chip">{row.subject}</span></td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{row.reason || '—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ━━━ PROFESSORS TAB ━━━ */}
        {activeTab === 'professors' && (
          <>
            <div className="header">
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '6px', letterSpacing: '-0.02em' }}>Manage Professors</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Add or update multi-subject assignments</p>
              </div>
              <div className="actions-bar">
                <button className="btn btn-icon" onClick={toggleTheme}>
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-start' }}>
              <div className="table-card" style={{ flex: 2 }}>
                <div className="table-scroll">
                  {loading ? (
                    <div className="loading-container">
                      <div className="spinner"></div>
                      <span className="loading-text">Loading professors...</span>
                    </div>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Assigned Subjects</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {professors.map((prof) => (
                          <tr key={prof._id}>
                            <td style={{ fontSize: '13px' }}>{prof.email}</td>
                            <td>
                              {editingId === prof._id ? (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <input type="text" className="input-field" style={{ padding: '7px 12px', fontSize: '13px' }}
                                    value={editSubjectsInput} onChange={(e) => setEditSubjectsInput(e.target.value)}
                                    placeholder="ML, AVR, OS" autoFocus />
                                  <button className="btn btn-small" onClick={() => saveEditedSubjects(prof._id)} style={{ padding: '7px' }}>
                                    <Check size={14} />
                                  </button>
                                  <button className="btn btn-secondary btn-small" onClick={cancelEditing} style={{ padding: '7px' }}>
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                  {prof.subjects && prof.subjects.length > 0 ? (
                                    prof.subjects.map((sub, i) => <span key={i} className="chip">{sub}</span>)
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>None</span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                {editingId !== prof._id && (
                                  <button className="btn btn-secondary btn-small" onClick={() => startEditing(prof)}>
                                    <Edit2 size={14} /> Edit
                                  </button>
                                )}
                                <button className="btn btn-danger btn-small" onClick={() => handleRemoveProfessor(prof._id)}>
                                  <Trash2 size={14} /> Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {professors.length === 0 && (
                          <tr>
                            <td colSpan="3">
                              <div className="empty-state">
                                <Users size={36} className="empty-state-icon" />
                                <div className="empty-state-title">No professors added</div>
                                <div className="empty-state-desc">Use the form to add your first professor.</div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="glass-card" style={{ flex: 1, padding: '28px', maxWidth: '380px' }}>
                <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: '700' }}>Add New Professor</h3>
                <form onSubmit={handleAddProfessor}>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input type="email" className="input-field" value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)} placeholder="name@iiitsurat.ac.in" required />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input type="text" className="input-field" value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)} placeholder="Temporary password" required />
                  </div>
                  <div className="form-group">
                    <label>Subjects (comma-separated)</label>
                    <input type="text" className="input-field" value={newSubjects}
                      onChange={(e) => setNewSubjects(e.target.value)} placeholder="e.g. AVR, ML, OS" required />
                  </div>
                  <button type="submit" className="btn" style={{ width: '100%', marginTop: '4px' }}>
                    <Plus size={15} /> Add Professor
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ─── Change Password Modal ─── */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={closePasswordModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change Password</h3>
              <button className="modal-close" onClick={closePasswordModal}><X size={18} /></button>
            </div>
            {passwordError && <div className="alert alert-error">{passwordError}</div>}
            {passwordSuccess && <div className="alert alert-success">{passwordSuccess}</div>}
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>Current Password</label>
                <input type="password" className="input-field" value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" className="input-field" value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)} placeholder="••••••••" required />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" className="input-field" value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)} placeholder="••••••••" required />
              </div>
              <button type="submit" className="btn" style={{ width: '100%' }} disabled={passwordLoading}>
                <KeyRound size={15} /> {passwordLoading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── Toast ─── */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default AdminDashboard;
