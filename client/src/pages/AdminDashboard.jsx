import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Download, Users, Trash2, Plus, LogOut, CheckCircle2, Sun, Moon, Edit2, Check, X, ChevronRight, Archive, KeyRound } from 'lucide-react';

const API_BASE = 'https://tnp-attendance-system-production-5a81.up.railway.app';

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

  // Collapsible date groups state
  const [expandedDate, setExpandedDate] = useState(null);

  // Marked attendances state
  const [showMarked, setShowMarked] = useState(false);
  const [markedData, setMarkedData] = useState([]);
  const [markedLoading, setMarkedLoading] = useState(false);
  const [markedExpandedDate, setMarkedExpandedDate] = useState(null);

  // Change password modal state
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
      alert('Failed to fetch professors');
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

  const handleAddProfessor = async (e) => {
    e.preventDefault();
    if (!newEmail.endsWith('@iiitsurat.ac.in')) {
      alert('Must use @iiitsurat.ac.in email');
      return;
    }
    try {
      await axios.post(`${API_BASE}/admin/add-professor`, 
        { email: newEmail, password: newPassword, subject: newSubjects },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setNewEmail(''); setNewPassword(''); setNewSubjects('');
      await fetchProfessors();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to add professor');
    }
  };

  const handleRemoveProfessor = async (id) => {
    if (!window.confirm('Are you sure you want to remove this professor?')) return;
    try {
      await axios.delete(`${API_BASE}/admin/remove-professor/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      await fetchProfessors();
    } catch (error) {
      alert('Failed to remove professor');
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
    } catch (error) {
      alert('Failed to update subjects');
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

    if (newPwd !== confirmPwd) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (newPwd.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    try {
      setPasswordLoading(true);
      await axios.post(`${API_BASE}/auth/change-password`,
        { currentPassword, newPassword: newPwd },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPwd('');
      setConfirmPwd('');
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
    setNewPwd('');
    setConfirmPwd('');
  };

  return (
    <div className="dashboard-layout">
      <div className="sidebar">
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>T&P Portal</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Admin Dashboard</p>
        </div>
        
        <div className="nav-links">
          <button 
            className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
            style={{ width: '100%', border: 'none', background: activeTab === 'attendance' ? 'var(--surface-hover)' : 'transparent', textAlign: 'left', cursor: 'pointer' }}
          >
            <CheckCircle2 size={18} /> Global Logs
          </button>
          <button 
            className={`nav-item ${activeTab === 'professors' ? 'active' : ''}`}
            onClick={() => setActiveTab('professors')}
            style={{ width: '100%', border: 'none', background: activeTab === 'professors' ? 'var(--surface-hover)' : 'transparent', textAlign: 'left', cursor: 'pointer' }}
          >
            <Users size={18} /> Professors
          </button>
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
        {activeTab === 'attendance' && (
          <>
            <div className="header">
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Global Unprocessed Logs</h1>
                <p style={{ color: 'var(--text-secondary)' }}>All master sheet records pending processing</p>
              </div>
              <div className="actions-bar" style={{ margin: 0 }}>
                <button className="btn" onClick={handleExportCSV} style={{ background: 'var(--success)', color: 'white' }}>
                  <Download size={16} /> Download CSV
                </button>
                <button className="btn btn-secondary" onClick={toggleTheme} style={{ padding: '8px' }}>
                  {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
              </div>
            </div>

            <div className="table-container">
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
              ) : datesList.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No unprocessed attendance records found.</div>
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
                        <tr 
                          style={{ cursor: 'pointer' }}
                          onClick={() => setExpandedDate(prev => prev === dateKey ? null : dateKey)}
                        >
                          <td colSpan="5" style={{ padding: '14px 16px', background: 'var(--surface-hover)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <ChevronRight size={16} className={`accordion-chevron ${expandedDate === dateKey ? 'open' : ''}`} />
                              <span className="accordion-date">{dateKey}</span>
                              <span className="accordion-count">{groupedData[dateKey].length} record{groupedData[dateKey].length !== 1 ? 's' : ''}</span>
                            </div>
                          </td>
                        </tr>
                        {expandedDate === dateKey && groupedData[dateKey].map((row, idx) => (
                          <tr key={idx}>
                            <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{row.date}</td>
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
                          <th>Date</th>
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
                              <td colSpan="5" style={{ padding: '14px 16px', background: 'var(--surface-hover)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <ChevronRight size={16} className={`accordion-chevron ${markedExpandedDate === dateKey ? 'open' : ''}`} />
                                  <span className="accordion-date">{dateKey}</span>
                                  <span className="accordion-count">{groupedMarkedData[dateKey].length} record{groupedMarkedData[dateKey].length !== 1 ? 's' : ''}</span>
                                </div>
                              </td>
                            </tr>
                            {markedExpandedDate === dateKey && groupedMarkedData[dateKey].map((row, idx) => (
                              <tr key={idx}>
                                <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{row.date}</td>
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
          </>
        )}

        {activeTab === 'professors' && (
          <>
            <div className="header">
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Manage Professors</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Add or update multi-subject assignments</p>
              </div>
              <div className="actions-bar" style={{ margin: 0 }}>
                <button className="btn btn-secondary" onClick={toggleTheme} style={{ padding: '8px' }}>
                  {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
              <div className="table-container" style={{ flex: 2 }}>
                {loading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
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
                          <td>{prof.email}</td>
                          <td>
                            {editingId === prof._id ? (
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input 
                                  type="text" 
                                  className="input-field" 
                                  style={{ padding: '6px 10px', fontSize: '13px' }}
                                  value={editSubjectsInput}
                                  onChange={(e) => setEditSubjectsInput(e.target.value)}
                                  placeholder="ML, AVR, OS"
                                  autoFocus
                                />
                                <button className="btn btn-small" onClick={() => saveEditedSubjects(prof._id)} style={{ padding: '6px' }}>
                                  <Check size={14} />
                                </button>
                                <button className="btn btn-secondary btn-small" onClick={cancelEditing} style={{ padding: '6px' }}>
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {prof.subjects && prof.subjects.length > 0 ? (
                                  prof.subjects.map((sub, i) => (
                                    <div key={i} className="chip" style={{ margin: 0 }}>{sub}</div>
                                  ))
                                ) : (
                                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>None</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td style={{ display: 'flex', gap: '8px' }}>
                            {editingId !== prof._id && (
                              <button className="btn btn-secondary btn-small" onClick={() => startEditing(prof)}>
                                <Edit2 size={16} /> Edit
                              </button>
                            )}
                            <button className="btn btn-danger btn-small" onClick={() => handleRemoveProfessor(prof._id)}>
                              <Trash2 size={16} /> Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                      {professors.length === 0 && (
                        <tr>
                          <td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                            No professors added yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="glass-card" style={{ flex: 1, padding: '24px' }}>
                <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>Add New Professor</h3>
                <form onSubmit={handleAddProfessor}>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      className="input-field" 
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="@iiitsurat.ac.in"
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Temporary Password"
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Assigned Subjects (comma-separated)</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={newSubjects}
                      onChange={(e) => setNewSubjects(e.target.value)}
                      placeholder="e.g. AVR, ML, OS"
                      required 
                    />
                  </div>
                  <button type="submit" className="btn" style={{ width: '100%', marginTop: '8px' }}>
                    <Plus size={16} /> Add Professor
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
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
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="••••••••"
                  required 
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input 
                  type="password" 
                  className="input-field" 
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
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

export default AdminDashboard;
