import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Download, Users, Trash2, Plus, LogOut, CheckCircle2, Sun, Moon, Edit2, Check, X } from 'lucide-react';

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

  useEffect(() => {
    if (activeTab === 'professors') fetchProfessors();
    if (activeTab === 'attendance') fetchAttendance();
  }, [activeTab]);

  const fetchProfessors = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:5000/admin/professors', {
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
      const res = await axios.get('http://localhost:5000/attendance', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProfessor = async (e) => {
    e.preventDefault();
    if (!newEmail.endsWith('@iiitsurat.ac.in')) {
      alert('Must use @iiitsurat.ac.in email');
      return;
    }
    try {
      await axios.post('http://localhost:5000/admin/add-professor', 
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
      await axios.delete(`http://localhost:5000/admin/remove-professor/${id}`, {
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
      await axios.put(`http://localhost:5000/admin/update-subjects/${id}`, 
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
      url: `http://localhost:5000/attendance/download?format=csv`,
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
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Register No</th>
                      <th>Student Name</th>
                      <th>Subject</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.slice(0, 100).map((row, idx) => (
                      <tr key={idx}>
                        <td>{row.date}</td>
                        <td style={{ fontWeight: '500' }}>{row.roll}</td>
                        <td>{row.name}</td>
                        <td><div className="chip" style={{ display: 'inline-block' }}>{row.subject}</div></td>
                      </tr>
                    ))}
                    {data.length > 100 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                          And {data.length - 100} more rows...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
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
    </div>
  );
};

export default AdminDashboard;
