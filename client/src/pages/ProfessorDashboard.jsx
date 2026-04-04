import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Download, CheckCircle2, LogOut, Sun, Moon, ChevronDown, ChevronRight, Archive, KeyRound, X, Inbox, FileSpreadsheet, AlertCircle } from 'lucide-react';

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

const ProfessorDashboard = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDates, setSelectedDates] = useState(new Set());
  const [processing, setProcessing] = useState(false);
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
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const availableSubjects = user.subjects || (user.subject ? [user.subject] : []);
  const [selectedSubject, setSelectedSubject] = useState(availableSubjects[0] || '');

  useEffect(() => {
    if (selectedSubject) {
      fetchData(selectedSubject);
    } else {
      setLoading(false);
    }
  }, [selectedSubject]);

  const fetchData = async (subjectContext) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/attendance`, {
        headers: { Authorization: `Bearer ${user.token}` },
        params: { subject: subjectContext }
      });
      setData(res.data);
      setSelectedDates(new Set());
      setExpandedDate(null);
    } catch (error) {
      console.error('Failed to fetch data', error);
      showToast('Failed to connect to backend', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMarkedAttendances = async () => {
    try {
      setMarkedLoading(true);
      const res = await axios.get(`${API_BASE}/attendance/marked`, {
        headers: { Authorization: `Bearer ${user.token}` },
        params: { subject: selectedSubject }
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

  // Group marked data by date for 2-level display
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

  const handleSelectDate = (date) => {
    const newSelected = new Set(selectedDates);
    if (newSelected.has(date)) newSelected.delete(date);
    else newSelected.add(date);
    setSelectedDates(newSelected);
  };

  const handleMarkProcessed = async () => {
    if (selectedDates.size === 0) {
      showToast('Please select at least one date to mark', 'error');
      return;
    }

    // Collect all records for the selected dates
    const recordsToMark = [];
    selectedDates.forEach(date => {
      if (groupedData[date]) {
        groupedData[date].forEach(row => {
          recordsToMark.push({
            date: row.date,
            subject: row.subject,
            roll: row.roll,
            name: row.name,
            reason: row.reason || ''
          });
        });
      }
    });

    if (recordsToMark.length === 0) {
      showToast('No records found for selected dates', 'error');
      return;
    }

    try {
      setProcessing(true);
      const res = await axios.post(`${API_BASE}/attendance/mark`, 
        { records: recordsToMark },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      // ── Real-time state update ──
      // Remove marked records from pending data
      const markedKeys = new Set(
        recordsToMark.map(r => `${r.date}_${r.subject}_${r.roll}`.toLowerCase())
      );
      setData(prev => prev.filter(row => {
        const key = `${row.date}_${row.subject}_${row.roll}`.toLowerCase();
        return !markedKeys.has(key);
      }));

      // Add to marked data (if marked section is visible)
      if (showMarked) {
        const newMarkedRecords = recordsToMark.map(r => ({
          ...r,
          _id: `temp_${Date.now()}_${Math.random()}`,
          createdAt: new Date().toISOString()
        }));
        setMarkedData(prev => [...newMarkedRecords, ...prev]);
      }

      setSelectedDates(new Set());
      setExpandedDate(null);

      const count = res.data.insertedCount || recordsToMark.length;
      showToast(`${count} record${count !== 1 ? 's' : ''} marked as processed`);
    } catch (error) {
      console.error('Mark error:', error);
      const msg = error.response?.data?.message || 'Failed to mark records';
      showToast(msg, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleExportCSV = () => {
    axios({
      url: `${API_BASE}/attendance/download?format=csv&subject=${selectedSubject}`,
      method: 'GET',
      responseType: 'blob',
      headers: { Authorization: `Bearer ${user.token}` }
    }).then((response) => {
       const header = response.headers['content-disposition'];
       let filename = `${selectedSubject}_attendance_report.csv`;
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
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    try {
      setPasswordLoading(true);
      await axios.post(`${API_BASE}/auth/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
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
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
  };

  return (
    <div className="dashboard-layout">
      {/* ─── Sidebar ─── */}
      <div className="sidebar">
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.02em' }}>T&P Portal</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', fontWeight: '500' }}>Professor Panel</p>
        </div>
        
        <div className="nav-links">
          <div className="nav-item active">
            <CheckCircle2 size={17} /> Attendance
          </div>
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
        <div className="header">
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '10px', letterSpacing: '-0.02em' }}>Subject Attendance</h1>
            
            {availableSubjects.length > 1 ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <select 
                  className="input-field" 
                  style={{ 
                    padding: '8px 38px 8px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: '600',
                    color: 'var(--accent-color)', background: 'var(--surface-color)', 
                    border: '1px solid var(--border-color)', cursor: 'pointer', appearance: 'none', outline: 'none', width: 'auto'
                  }}
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                >
                  {availableSubjects.map((sub, i) => (
                    <option key={i} value={sub}>{sub}</option>
                  ))}
                </select>
                <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
                  <ChevronDown size={14} />
                </div>
              </div>
            ) : (
              <div className="chip" style={{ display: 'inline-block', fontSize: '13px', padding: '6px 16px' }}>
                {selectedSubject || 'No Subject Assigned'}
              </div>
            )}
          </div>

          <div className="actions-bar">
            {selectedDates.size > 0 && (
              <button className="btn" onClick={handleMarkProcessed} disabled={processing}>
                <CheckCircle2 size={15} /> 
                {processing ? 'Marking...' : `Mark ${selectedDates.size} Date${selectedDates.size !== 1 ? 's' : ''}`}
              </button>
            )}
            <button className="btn btn-success" onClick={handleExportCSV} disabled={!selectedSubject}>
              <Download size={15} /> Download CSV
            </button>
            <button className="btn btn-icon" onClick={toggleTheme}>
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        {/* ─── Pending Attendance Table ─── */}
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
                <div className="empty-state-title">No pending attendance logs</div>
                <div className="empty-state-desc">
                  {selectedSubject 
                    ? `All records for ${selectedSubject} have been processed.`
                    : 'Select a subject to view attendance records.'}
                </div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '44px' }}></th>
                    <th>Register No</th>
                    <th>Student Name</th>
                    <th>Subject</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {datesList.map(dateKey => (
                    <React.Fragment key={dateKey}>
                      <tr className="accordion-header-row" onClick={() => setExpandedDate(prev => prev === dateKey ? null : dateKey)}>
                        <td colSpan="5">
                          <div className="accordion-inner">
                            <div className="checkbox-wrapper" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={selectedDates.has(dateKey)}
                                onChange={() => handleSelectDate(dateKey)}
                              />
                            </div>
                            <ChevronRight size={15} className={`accordion-chevron ${expandedDate === dateKey ? 'open' : ''}`} />
                            <span className="accordion-date">{dateKey}</span>
                            <span className="accordion-count">
                              {groupedData[dateKey].length} student{groupedData[dateKey].length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {expandedDate === dateKey && groupedData[dateKey].map((row, idx) => (
                        <tr key={`${dateKey}-${row.roll}-${idx}`}>
                          <td></td>
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

        {/* ─── Marked Attendances (2-Level Accordion) ─── */}
        <div className="marked-section">
          <div 
            className={`marked-section-header ${showMarked ? 'open' : ''}`}
            onClick={handleToggleMarked}
          >
            <Archive size={17} style={{ color: 'var(--accent-color)' }} />
            <span className="marked-section-title">Marked Attendances</span>
            {markedData.length > 0 && (
              <span className="marked-badge">{markedData.length} record{markedData.length !== 1 ? 's' : ''}</span>
            )}
            <ChevronRight 
              size={15} 
              className={`accordion-chevron ${showMarked ? 'open' : ''}`}
              style={{ marginLeft: 'auto' }}
            />
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
                  <div className="empty-state-desc">Records you mark as processed will appear here.</div>
                </div>
              ) : (
                <div style={{ padding: '4px 0' }}>
                  {markedDatesList.map(dateKey => (
                    <div key={dateKey}>
                      {/* Level 1: Date summary row */}
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
                        <span style={{ fontSize: '13px', fontWeight: '600' }}>{dateKey}</span>
                        <span className="chip" style={{ fontSize: '10.5px', padding: '2px 8px' }}>
                          {groupedMarkedData[dateKey][0]?.subject || selectedSubject}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                          {groupedMarkedData[dateKey].length} student{groupedMarkedData[dateKey].length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Level 2: Expanded student table */}
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
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
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
                <input type="password" className="input-field" value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" className="input-field" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required />
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

export default ProfessorDashboard;
