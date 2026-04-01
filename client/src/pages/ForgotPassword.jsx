import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.endsWith('@iiitsurat.ac.in')) {
      setError('Please use a valid IIIT Surat email address');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post('https://tnp-attendance-system-production-5a81.up.railway.app/auth/forgot-password', { email });
      setSuccess(res.data.message || 'OTP sent to your email');
      setStep(2); // Move to OTP input view
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      await axios.post('https://tnp-attendance-system-production-5a81.up.railway.app/auth/reset-password', {
        email,
        otp,
        newPassword
      });
      
      alert('Password successfully reset! You can now log in.');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-card">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>Forgot Password</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {step === 1 ? 'Enter your email to receive OTP' : 'Enter OTP and set new password'}
          </p>
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

        {success && (
          <div style={{ 
            background: 'rgba(16, 185, 129, 0.1)', 
            border: '1px solid rgba(16, 185, 129, 0.2)',
            color: 'var(--success)',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {success}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestOTP}>
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label>Email Address</label>
              <input 
                type="email" 
                className="input-field" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="professor@iiitsurat.ac.in"
                required 
              />
            </div>

            <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label>Enter OTP</label>
              <input 
                type="text" 
                className="input-field" 
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                required 
                maxLength={6}
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

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label>Confirm Password</label>
              <input 
                type="password" 
                className="input-field" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required 
              />
            </div>

            <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Link to="/" style={{ color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none' }}>
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
