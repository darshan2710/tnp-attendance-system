import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email.endsWith('@iiitsurat.ac.in')) {
      setError('Please use a valid IIIT Surat email address');
      return;
    }

    try {
      await login(email, password);
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-card">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>T&P Cell Portal</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Sign in to manage attendance</p>
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'var(--danger)',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              className="input-field" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. tnp@iiitsurat.ac.in"
              required 
            />
          </div>
          
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label>Password</label>
            <input 
              type="password" 
              className="input-field" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required 
            />
          </div>

          <div style={{ textAlign: 'right', marginBottom: '24px' }}>
            <Link to="/forgot-password" style={{ color: 'var(--accent-color)', fontSize: '13px', textDecoration: 'none', fontWeight: '500' }}>
              Forgot Password?
            </Link>
          </div>

          <button type="submit" className="btn" style={{ width: '100%' }}>
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
