import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Download, CheckCircle2, LogOut, Sun, Moon, ChevronDown, ChevronRight, Archive, KeyRound, X } from 'lucide-react';

const API_BASE = 'https://tnp-attendance-system-production-5a81.up.railway.app';

const ProfessorDashboard = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDates, setSelectedDates] = useState(new Set());
  const [processing, setProcessing] = useState(false);
  const [expandedDate, setExpandedDate] = useState(null);

  // Marked attendances state
  const [showMarked, setShowMarked] = useState(false);
  const [markedData, setMarkedData] = useState([]);
  const [markedLoading, setMarkedLoading] = useState(false);
  const [markedExpandedDate, setMarkedExpandedDate] = useState(null);

  // Change password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Backward compatible safety fallback
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
    } catch (error) {
      console.error('Failed to fetch data', error);
      alert('Failed to connect to backend or Google Sheets');
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
    } finally {
      setMarkedLoading(false);
    }
  };

  // Group data by date, sorted by roll within each group
  const groupedData = useMemo(() => {
    const groups = data.reduce((acc, current) => {
      if (!acc[current.date]) acc[current.date] = [];
      acc[current.date].push(current);
      return acc;
    }, {});
    // Sort each group by roll number
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => a.roll.localeCompare(b.roll, undefined, { numeric: true, sensitivity: 'base' }));
    });
    return groups;
  }, [data]);

  const datesList = Object.keys(groupedData);

  // Group marked data by date
  const groupedMarkedData = useMemo(() => {
    const groups = markedData.reduce((acc, current) => {
      if (!acc[current.date]) acc[current.date] = [];
      acc[current.date].push(current);
      return acc;
    }, {});
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => a.roll.localeCompare(b.roll, undefined, { numeric: true, sensitivity: 'base' }));
    });
    return groups;
  }, [markedData]);

  const markedDatesList = Object.keys(groupedMarkedData);

  const handleSelectDate = (date) => {
    const newSelected = new Set(selectedDates);
    if (newSelected.has(date)) newSelected.delete(date);
    else newSelected.add(date);
    setSelectedDates(newSelected);
  };

  const handleToggleDate = (date) => {
    setExpandedDate(prev => prev === date ? null : date);
  };

  const handleMarkProcessed = async () => {
    if (selectedDates.size === 0) return;
    try {
      setProcessing(true);
      // Collect all granular records for selected dates
      const records = [];
      selectedDates.forEach(date => {
        if (groupedData[date]) {
          groupedData[date].forEach(row => {
            records.push({
              date: row.date,
              subject: row.subject,
              roll: row.roll,
              name: row.name,
              reason: row.reason || ''
            });
          });
        }
      });

      await axios.post(`${API_BASE}/attendance/mark`, 
        { records },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      
      alert('Marked as processed successfully');
      setSelectedDates(new Set());
      setExpandedDate(null);
      await fetchData(selectedSubject);
    } catch (error) {
      console.error(error);
      alert('Failed to process records');
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
    }).catch((error) => {
        if (error.response?.status === 404) {
            alert('No data available to download');
        } else {
            console.error(error);
            alert('Download failed');
        }
    });
  };

  const handleToggleMarked = () => {
    const next = !showMarked;
    setShowMarked(next);
    if (next && markedData.length === 0) {
      fetchMarkedAttendances();
    }
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
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 1500);
    } catch (error) {
      setPasswordError(error.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordError('');
    setPasswordSuccess('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="dashboard-layout">
      <div className="sidebar">
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>T&P Portal</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Professor Panel</p>
        </div>
        
        <div className="nav-links">
          <div className="nav-item active">
            <CheckCircle2 size={18} /> Attendance
          </div>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Logged in as:<br/>
            <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{user.email}</span>
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowPasswordModal(true)} 
            style={{ width: '100%', marginBottom: '8px' }}
          >
            <KeyRound size={16} /> Change Password
          </button>
          <button className="btn btn-secondary" onClick={logout} style={{ width: '100%' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="header">
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px' }}>Subject Attendance</h1>
            
            {availableSubjects.length > 1 ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <select 
                  className="input-field" 
                  style={{ 
                    padding: '8px 40px 8px 16px', 
                    borderRadius: '100px', 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: 'var(--accent-color)',
                    background: 'var(--surface-color)', 
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    appearance: 'none',
                    outline: 'none'
                  }}
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                >
                  {availableSubjects.map((sub, i) => (
                    <option key={i} value={sub}>{sub}</option>
                  ))}
                </select>
                <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }}>
                  <ChevronDown size={16} />
                </div>
              </div>
            ) : (
              <div className="chip" style={{ display: 'inline-block', fontSize: '14px', padding: '6px 16px' }}>
                {selectedSubject || 'No Subject Assigned'}
              </div>
            )}

          </div>
          <div className="actions-bar" style={{ margin: 0 }}>
            {selectedDates.size > 0 && (
              <button className="btn" onClick={handleMarkProcessed} disabled={processing}>
                <CheckCircle2 size={16} /> {processing ? 'Processing...' : `Mark ${selectedDates.size} Date(s) as Done`}
              </button>
            )}
            <button className="btn" onClick={handleExportCSV} style={{ background: 'var(--success)', color: 'white' }} disabled={!selectedSubject}>
              <Download size={16} /> Download CSV
            </button>
            <button className="btn btn-secondary" onClick={toggleTheme} style={{ padding: '8px' }}>
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>

        {/* Unprocessed attendance table with collapsible date groups */}
        <div className="table-container">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading data...
            </div>
          ) : datesList.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No pending attendance logs for {selectedSubject}.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Register No</th>
                  <th>Student Name</th>
                  <th>Subject</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {datesList.map(dateKey => (
                  <React.Fragment key={dateKey}>
                    <tr 
                      className="accordion-header" 
                      onClick={() => handleToggleDate(dateKey)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ padding: '14px 8px 14px 16px', borderBottom: '1px solid var(--border-color)' }}>
                        <div className="checkbox-wrapper" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={selectedDates.has(dateKey)}
                            onChange={() => handleSelectDate(dateKey)}
                          />
                        </div>
                      </td>
                      <td colSpan="4" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <ChevronRight size={16} className={`accordion-chevron ${expandedDate === dateKey ? 'open' : ''}`} />
                          <span className="accordion-date">{dateKey}</span>
                          <span className="accordion-count">{groupedData[dateKey].length} student{groupedData[dateKey].length !== 1 ? 's' : ''}</span>
                        </div>
                      </td>
                    </tr>
                    {expandedDate === dateKey && groupedData[dateKey].map((row, idx) => (
                      <tr key={idx}>
                        <td></td>
                        <td style={{ fontWeight: '500', paddingLeft: '16px' }}>{row.roll}</td>
                        <td>{row.name}</td>
                        <td><div className="chip" style={{ display: 'inline-block' }}>{row.subject}</div></td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{row.reason || '—'}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Marked Attendances Section */}
        <div className="marked-section">
          <div 
            className={`marked-section-header ${showMarked ? 'open' : ''}`}
            onClick={handleToggleMarked}
          >
            <Archive size={18} style={{ color: 'var(--accent-color)' }} />
            <span className="marked-section-title">Marked Attendances</span>
            {markedData.length > 0 && (
              <span className="marked-badge">{markedData.length} record{markedData.length !== 1 ? 's' : ''}</span>
            )}
            <ChevronRight 
              size={16} 
              className={`accordion-chevron ${showMarked ? 'open' : ''}`}
              style={{ marginLeft: 'auto' }}
            />
          </div>

          {showMarked && (
            <div className="marked-section-content">
              {markedLoading ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading marked records...</div>
              ) : markedDatesList.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>No marked attendance records found.</div>
              ) : (
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
                    {markedDatesList.map(dateKey => (
                      <React.Fragment key={dateKey}>
                        <tr 
                          style={{ cursor: 'pointer' }}
                          onClick={() => setMarkedExpandedDate(prev => prev === dateKey ? null : dateKey)}
                        >
                          <td colSpan="4" style={{ padding: '14px 16px', background: 'var(--surface-hover)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <ChevronRight size={16} className={`accordion-chevron ${markedExpandedDate === dateKey ? 'open' : ''}`} />
                              <span className="accordion-date">{dateKey}</span>
                              <span className="accordion-count">{groupedMarkedData[dateKey].length} record{groupedMarkedData[dateKey].length !== 1 ? 's' : ''}</span>
                            </div>
                          </td>
                        </tr>
                        {markedExpandedDate === dateKey && groupedMarkedData[dateKey].map((row, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: '500' }}>{row.roll}</td>
                            <td>{row.name}</td>
                            <td><div className="chip" style={{ display: 'inline-block' }}>{row.subject}</div></td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{row.reason || '—'}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={closePasswordModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change Password</h3>
              <button className="modal-close" onClick={closePasswordModal}>
                <X size={20} />
              </button>
            </div>

            {passwordError && <div className="alert alert-error">{passwordError}</div>}
            {passwordSuccess && <div className="alert alert-success">{passwordSuccess}</div>}

            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>Current Password</label>
                <input 
                  type="password" 
                  className="input-field" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required 
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input 
                  type="password" 
                  className="input-field" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required 
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input 
                  type="password" 
                  className="input-field" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required 
                />
              </div>
              <button type="submit" className="btn" style={{ width: '100%' }} disabled={passwordLoading}>
                <KeyRound size={16} /> {passwordLoading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessorDashboard;
