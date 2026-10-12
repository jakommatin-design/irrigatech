import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Leaf, ArrowRight, Sun, Cpu, Sparkles, ShieldCheck } from 'lucide-react';
import logoImg from '../assets/site_logo.jpeg';

export default function OpeningScreen({ onContinue }) {
  const { setShowAuthModal } = useAuth();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 40%, #f7fee7 100%)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      maxWidth: '480px',
      margin: '0 auto',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 20px 40px rgba(0,0,0,0.08)'
    }}>
      {/* Top Status Simulation Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem 1.5rem',
        fontSize: '0.85rem',
        fontWeight: 700,
        color: '#0f172a'
      }}>
        <span>9:41</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.75rem' }}>5G</span>
          <span style={{ width: '16px', height: '10px', border: '1px solid #0f172a', borderRadius: '2px', display: 'inline-block', position: 'relative' }}>
            <span style={{ position: 'absolute', inset: '1px', background: '#16a34a', width: '80%' }} />
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: '1rem 1.5rem', textAlign: 'center', zIndex: 10 }}>
        
        {/* Top Logo Emblem */}
        <div style={{
          width: '76px',
          height: '76px',
          margin: '0 auto 1rem',
          borderRadius: '22px',
          background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          boxShadow: '0 10px 25px rgba(22, 163, 74, 0.3)'
        }}>
          <Leaf size={42} />
        </div>

        {/* Brand Name & Subtitle matching Image 1 */}
        <h1 style={{
          fontSize: '2.4rem',
          fontWeight: 800,
          color: '#064e3b',
          letterSpacing: '-0.03em',
          margin: '0 0 0.35rem'
        }}>
          Irriga-Tech
        </h1>
        <p style={{
          fontSize: '0.9rem',
          fontWeight: 600,
          color: '#059669',
          margin: '0 0 2rem'
        }}>
          Smart Greenhouse • Smarter Agriculture
        </p>

        {/* Center Emblem matching Image 1 */}
        <div style={{
          width: '120px',
          height: '110px',
          margin: '0 auto 1.5rem',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Wireframe dome overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            border: '2px solid #16a34a',
            borderRadius: '50% 50% 12px 12px',
            opacity: 0.85
          }} />
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#ecfdf5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#15803d',
            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.15)'
          }}>
            <Leaf size={32} />
          </div>
        </div>

        {/* Triple Feature Pill */}
        <div style={{
          fontSize: '0.92rem',
          fontWeight: 800,
          color: '#047857',
          letterSpacing: '0.02em',
          marginBottom: '1rem'
        }}>
          AI-Driven • Solar-Powered • IoT Enabled
        </div>

        {/* Slogan strip */}
        <div style={{
          fontSize: '0.78rem',
          fontWeight: 600,
          color: '#475569',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '2rem'
        }}>
          <span>Healthy Crops</span>
          <span>|</span>
          <span>Better Yields</span>
          <span>|</span>
          <span>Sustainable Future</span>
        </div>

      </div>

      {/* Bottom Greenhouse & Solar Panel Visual Card with Buttons */}
      <div style={{
        position: 'relative',
        borderRadius: '32px 32px 0 0',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(6, 78, 59, 0.92) 0%, #064e3b 100%)',
        padding: '2rem 1.5rem 2.5rem',
        color: '#ffffff',
        textAlign: 'center'
      }}>
        {/* Subtle solar greenhouse grid background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.15,
          backgroundImage: 'radial-gradient(#34d399 1.5px, transparent 1.5px)',
          backgroundSize: '18px 18px'
        }} />

        <div style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <span style={{ padding: '0.3rem 0.75rem', borderRadius: '9999px', background: 'rgba(255,255,255,0.15)', fontSize: '0.72rem', fontWeight: 600 }}>
              🌿 Multi-Crop Ready
            </span>
            <span style={{ padding: '0.3rem 0.75rem', borderRadius: '9999px', background: 'rgba(255,255,255,0.15)', fontSize: '0.72rem', fontWeight: 600 }}>
              ⚡ 100% Solar Off-Grid
            </span>
          </div>

          <button
            onClick={onContinue}
            style={{
              width: '100%',
              padding: '1rem',
              borderRadius: '16px',
              background: '#22c55e',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 8px 20px rgba(34, 197, 94, 0.4)',
              cursor: 'pointer',
              marginBottom: '0.75rem'
            }}
          >
            <span>Enter Smart Greenhouse</span>
            <ArrowRight size={18} />
          </button>

          <button
            onClick={() => setShowAuthModal(true)}
            style={{
              width: '100%',
              padding: '0.8rem',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 700,
              border: '1px solid rgba(255, 255, 255, 0.2)',
              cursor: 'pointer'
            }}
          >
            Farmer Sign In / Account Portal
          </button>
        </div>
      </div>
    </div>
  );
}
