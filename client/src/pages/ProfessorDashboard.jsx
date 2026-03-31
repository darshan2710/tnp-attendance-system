import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Download, CheckCircle2, LogOut, Sun, Moon, ChevronDown } from 'lucide-react';

const ProfessorDashboard = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDates, setSelectedDates] = useState(new Set());
  const [processing, setProcessing] = useState(false);

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
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/attendance`, {
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

  const groupedData = useMemo(() => {
    return data.reduce((acc, current) => {
      if (!acc[current.date]) acc[current.date] = [];
      acc[current.date].push(current);
      return acc;
    }, {});
  }, [data]);

  const datesList = Object.keys(groupedData);

  const handleSelectDate = (date) => {
    const newSelected = new Set(selectedDates);
    if (newSelected.has(date)) newSelected.delete(date);
    else newSelected.add(date);
    setSelectedDates(newSelected);
  };

  const handleMarkProcessed = async () => {
    if (selectedDates.size === 0) return;
    try {
      setProcessing(true);
      await axios.post(`${import.meta.env.VITE_API_URL}/attendance/mark`, 
        { subject: selectedSubject, dates: Array.from(selectedDates) },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      
      alert('Marked as processed successfully');
      setSelectedDates(new Set());
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
      url: `${import.meta.env.VITE_API_URL}/attendance/download?format=csv&subject=${selectedSubject}`,
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
                  <th>Register No</th>
                  <th>Student Name</th>
                  <th>Subject</th>
                </tr>
              </thead>
              <tbody>
                {datesList.map(dateKey => (
                  <React.Fragment key={dateKey}>
                    <tr style={{ background: 'var(--surface-hover)' }}>
                      <td colSpan="3" style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="checkbox-wrapper">
                            <input 
                              type="checkbox" 
                              checked={selectedDates.has(dateKey)}
                              onChange={() => handleSelectDate(dateKey)}
                            />
                          </div>
                          <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{dateKey}</span>
                        </div>
                      </td>
                    </tr>
                    {groupedData[dateKey].map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: '500', paddingLeft: '48px' }}>{row.roll}</td>
                        <td>{row.name}</td>
                        <td>{row.subject}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfessorDashboard;
