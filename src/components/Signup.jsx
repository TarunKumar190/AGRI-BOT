import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Signup = ({ onSwitchToLogin, onSuccess }) => {
  const { signup, signInWithGoogle, continueAsGuest } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    state: '',
    agreeTerms: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);

  const indianStates = [
    'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
    'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan',
    'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateStep1 = () => {
    if (!formData.name.trim()) {
      setError('Please enter your name');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Please enter your email');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.password) {
      setError('Please enter a password');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (!formData.agreeTerms) {
      setError('Please agree to the terms and conditions');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateStep2()) return;

    setLoading(true);

    const result = await signup(formData.name, formData.email, formData.password);
    
    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    
    const result = await signInWithGoogle();
    
    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleGuestLogin = () => {
    continueAsGuest();
    onSuccess?.();
  };

  return (
    <div className="auth-container">
      <div className="auth-card signup-card">
        <div className="auth-header">
          <div className="auth-logo">
            <span className="logo-icon">🌾</span>
            <h1>KrishiMitra</h1>
          </div>
          <p className="auth-subtitle">Join the farming revolution!</p>
        </div>

        {/* Progress Steps */}
        <div className="signup-progress">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Basic Info</span>
          </div>
          <div className="progress-line"></div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Security</span>
          </div>
        </div>

        {error && (
          <div className="auth-error">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {step === 1 && (
            <>
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <div className="input-wrapper">
                  <span className="input-icon">👤</span>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-wrapper">
                  <span className="input-icon">📧</span>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number (Optional)</label>
                <div className="input-wrapper">
                  <span className="input-icon">📱</span>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 XXXXX XXXXX"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="state">State (Optional)</label>
                <div className="input-wrapper">
                  <span className="input-icon">📍</span>
                  <select
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">Select your state</option>
                    {indianStates.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button 
                type="button" 
                className="auth-btn primary" 
                onClick={handleNext}
                disabled={loading}
              >
                Next <span>→</span>
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <div className="password-strength">
                  <div className={`strength-bar ${formData.password.length >= 6 ? 'strong' : formData.password.length >= 3 ? 'medium' : ''}`}></div>
                  <span>{formData.password.length >= 6 ? 'Strong' : formData.password.length >= 3 ? 'Medium' : 'Weak'}</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔐</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    disabled={loading}
                  />
                  {formData.confirmPassword && (
                    <span className="match-indicator">
                      {formData.password === formData.confirmPassword ? '✅' : '❌'}
                    </span>
                  )}
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="agreeTerms"
                    checked={formData.agreeTerms}
                    onChange={handleChange}
                  />
                  <span className="checkmark"></span>
                  <span>I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></span>
                </label>
              </div>

              <div className="form-buttons">
                <button 
                  type="button" 
                  className="auth-btn secondary" 
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  <span>←</span> Back
                </button>
                <button type="submit" className="auth-btn primary" disabled={loading}>
                  {loading ? (
                    <span className="loading-spinner"></span>
                  ) : (
                    <>
                      Create Account <span>🌱</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>

        {step === 1 && (
          <>
            <div className="auth-divider">
              <span>OR</span>
            </div>

            <div className="social-auth">
              <button 
                className="auth-btn google" 
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up with Google
              </button>

              <button 
                className="auth-btn guest" 
                onClick={handleGuestLogin}
                disabled={loading}
              >
                <span>👤</span> Continue as Guest
              </button>
            </div>
          </>
        )}

        <p className="auth-switch">
          Already have an account?{' '}
          <button onClick={onSwitchToLogin} className="switch-btn">
            Login
          </button>
        </p>

        <div className="auth-footer">
          <p>🌱 Empowering Indian Farmers with Technology</p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
