import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/site_logo.jpeg';

export default function OpeningScreen({ onContinue }) {
  const { setShowAuthModal } = useAuth();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);


  const fadeUp = (delay = 0) => ({
    opacity: loaded ? 1 : 0,
    transform: loaded ? 'translateY(0)' : 'translateY(22px)',
    transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
  });

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>

      {/* ── Background ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `url('https://www.gardeningknowhow.com/wp-content/uploads/2013/10/greenhouse.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 30%',
        transform: loaded ? 'scale(1)' : 'scale(1.06)',
        transition: 'transform 1.8s cubic-bezier(0.25,0.46,0.45,0.94)',
      }} />

      {/* ── Overlay ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: `
          linear-gradient(135deg, rgba(1,32,24,0.88) 0%, rgba(4,60,46,0.65) 40%, rgba(0,0,0,0.2) 75%),
          linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.25) 50%, transparent 80%)
        `,
      }} />

      {/* ── Subtle grid ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        backgroundImage: `
          linear-gradient(rgba(52,211,153,0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(52,211,153,0.035) 1px, transparent 1px)
        `,
        backgroundSize: '64px 64px',
      }} />

      {/* ── Glow orbs ── */}
      <div style={{
        position: 'absolute', top: '10%', right: '10%', zIndex: 2,
        width: '380px', height: '380px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(52,211,153,0.1) 0%, transparent 70%)',
        animation: 'float 9s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '20%', right: '20%', zIndex: 2,
        width: '220px', height: '220px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(129,140,248,0.09) 0%, transparent 70%)',
        animation: 'float 12s ease-in-out infinite reverse',
        pointerEvents: 'none',
      }} />

      {/* ════════════════════════════════════════
          ALL CONTENT — normal flex column flow
      ════════════════════════════════════════ */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', flexDirection: 'column',
        height: '100%',
        padding: '0',
      }}>

        {/* ── Top Nav ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.2rem 2.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          ...fadeUp(0.05),
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            <img
              src={logoImg}
              alt="Irriga-Tech Logo"
              style={{
                width: '44px', height: '44px',
                borderRadius: '12px',
                objectFit: 'cover',
                boxShadow: '0 4px 16px rgba(52,211,153,0.35)',
                border: '1.5px solid rgba(52,211,153,0.4)',
              }}
            />
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
                Irriga<span style={{ color: '#34d399' }}>Tech</span>
              </div>
              <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.45)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '1px' }}>
                Smart Greenhouse OS
              </div>
            </div>
          </div>

          {/* Nav buttons */}
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <button onClick={() => setShowAuthModal(true)} style={{
              padding: '0.5rem 1.2rem', borderRadius: '8px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: '#fff', fontSize: '0.82rem', fontWeight: 600,
              cursor: 'pointer', backdropFilter: 'blur(10px)',
              transition: 'background 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            >
              Sign In
            </button>
            <button onClick={onContinue} style={{
              padding: '0.5rem 1.3rem', borderRadius: '8px',
              background: 'linear-gradient(135deg,#34d399,#059669)',
              border: 'none', color: '#fff',
              fontSize: '0.82rem', fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(52,211,153,0.38)',
              transition: 'opacity 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Dashboard →
            </button>
          </div>
        </div>

        {/* ── Hero ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: '2rem 2.5rem 1.5rem',
        }}>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(2.8rem, 5.5vw, 5rem)',
            fontWeight: 900,
            color: '#fff',
            letterSpacing: '-0.038em',
            lineHeight: 1.05,
            margin: '0 0 1.1rem',
            maxWidth: '780px',
            ...fadeUp(0.28),
          }}>
            The Future of<br />
            <span style={{
              background: 'linear-gradient(90deg,#34d399 0%,#6ee7b7 55%,#a7f3d0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Smart Farming
            </span>
          </h1>

          {/* Sub-headline */}
          <p style={{
            fontSize: 'clamp(0.9rem, 1.5vw, 1.08rem)',
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.75,
            maxWidth: '560px',
            margin: '0 0 2.5rem',
            fontWeight: 400,
            ...fadeUp(0.38),
          }}>
            AI-driven precision irrigation, solar-powered autonomy, and real-time IoT monitoring — all in one intelligent greenhouse platform.
          </p>

          {/* Single CTA */}
          <div style={{ ...fadeUp(0.47) }}>
            <button
              onClick={() => setShowAuthModal(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                padding: '1rem 2.6rem', borderRadius: '14px',
                background: 'linear-gradient(135deg,#34d399 0%,#059669 100%)',
                border: 'none', color: '#fff',
                fontSize: '1rem', fontWeight: 800,
                cursor: 'pointer', letterSpacing: '-0.01em',
                boxShadow: '0 8px 28px rgba(52,211,153,0.42), 0 2px 10px rgba(0,0,0,0.3)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 14px 36px rgba(52,211,153,0.55)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(52,211,153,0.42)'; }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              Farmer Sign In
            </button>
          </div>

        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        @keyframes float {
          0%,100% { transform: translateY(0) scale(1); }
          50%      { transform: translateY(-18px) scale(1.04); }
        }
        @keyframes pulseDot {
          0%,100% { opacity:1; box-shadow: 0 0 8px #34d399; }
          50%      { opacity:0.55; box-shadow: 0 0 16px #34d399; }
        }
      `}</style>
    </div>
  );
}
