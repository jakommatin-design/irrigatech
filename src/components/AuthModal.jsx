import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Leaf, Eye, EyeOff, User, Lock, Mail, X } from 'lucide-react';

export default function AuthModal({ onClose }) {
  const { login, setShowAuthModal } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailOrPhone, setEmailOrPhone] = useState('francis@irriga-tech.farm');
  const [password, setPassword] = useState('••••••••••••');
  const [name, setName] = useState('Francis J.');
  const [farmName, setFarmName] = useState('Greenhouse Alpha (3m x 4m)');
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    login(emailOrPhone, password);
    if (onClose) onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '1rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '28px',
        maxWidth: '420px',
        width: '100%',
        padding: '2rem 1.75rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        position: 'relative',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1.25rem',
              right: '1.25rem',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        )}

        {/* Brand Header matching Image 2 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.75rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: '#ecfdf5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#15803d'
          }}>
            <Leaf size={22} />
          </div>
          <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#064e3b', letterSpacing: '-0.02em' }}>
            Irriga-Tech
          </span>
        </div>

        {/* Title and Subtitle matching Image 2 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: '0 0 0.35rem' }}>
            {isRegister ? 'Create Farm Account' : 'Welcome Back'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
            {isRegister ? 'Register your greenhouse to start automated irrigation' : 'Sign in to your account to continue'}
          </p>
        </div>

        {/* Form matching Image 2 */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                Full Name
              </label>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '0.65rem 0.85rem'
              }}>
                <User size={18} color="#94a3b8" style={{ marginRight: '0.6rem' }} />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.85rem', color: '#0f172a' }}
                />
              </div>
            </div>
          )}

          {/* Email or Phone */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
              Email or Phone Number
            </label>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              padding: '0.65rem 0.85rem',
              background: '#ffffff'
            }}>
              <User size={18} color="#94a3b8" style={{ marginRight: '0.6rem' }} />
              <input
                type="text"
                required
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                placeholder="Enter your email or phone"
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.85rem', color: '#0f172a' }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
              Password
            </label>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              padding: '0.65rem 0.85rem',
              background: '#ffffff'
            }}>
              <Lock size={18} color="#94a3b8" style={{ marginRight: '0.6rem' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.85rem', color: '#0f172a' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember me & Forgot password matching Image 2 */}
          {!isRegister && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', color: '#475569', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: '#15803d', width: '15px', height: '15px' }}
                />
                Remember me
              </label>

              <a href="#forgot" style={{ color: '#059669', fontWeight: 700, textDecoration: 'none' }}>
                Forgot password?
              </a>
            </div>
          )}

          {/* Submit Button matching Image 2 */}
          <button
            type="submit"
            style={{
              background: '#047857',
              color: '#ffffff',
              padding: '0.85rem',
              borderRadius: '9999px',
              fontSize: '0.95rem',
              fontWeight: 800,
              boxShadow: '0 6px 16px rgba(4, 120, 87, 0.3)',
              cursor: 'pointer',
              marginTop: '0.5rem'
            }}
          >
            {isRegister ? 'Register Account' : 'Login'}
          </button>
        </form>

        {/* 'or' divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          margin: '1.25rem 0',
          color: '#94a3b8',
          fontSize: '0.78rem'
        }}>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          <span style={{ padding: '0 0.75rem', fontWeight: 500 }}>or</span>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        </div>

        {/* Continue with Google button matching Image 2 */}
        <button
          onClick={() => {
            login('google.user@irriga-tech.farm', 'oauth');
            if (onClose) onClose();
          }}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '12px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#334155',
            fontSize: '0.85rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.65rem',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          {/* Google G icon */}
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          Continue with Google
        </button>

        {/* Footer Toggle matching Image 2 */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: '#64748b' }}>
          {isRegister ? (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setIsRegister(false)}
                style={{ color: '#047857', fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              Don't have an account?{' '}
              <button
                onClick={() => setIsRegister(true)}
                style={{ color: '#047857', fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Register
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
