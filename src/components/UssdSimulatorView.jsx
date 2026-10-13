import React, { useState, useEffect } from 'react';
import { 
  Phone, MessageSquare, Sparkles, Send, RefreshCw, 
  CheckCircle2, Droplets, Info, Shield, Radio, Smartphone,
  BookOpen, HelpCircle, ChevronRight, AlertCircle, ArrowRight
} from 'lucide-react';
import { useSensors } from '../context/SensorContext';
import { useAuth } from '../context/AuthContext';

export default function UssdSimulatorView() {
  const { socket, pump, sendCommand } = useSensors();
  const { getApiUrl, authHeaders } = useAuth();

  // USSD Interactive Phone State
  const [ussdInput, setUssdInput] = useState('*384*4744#');
  const [sessionActive, setSessionActive] = useState(false);
  const [screenText, setScreenText] = useState('Dial *384*4744# to start USSD Session');
  const [sessionHistory, setSessionHistory] = useState([]);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+254 712 345 678');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('phone'); // 'phone' | 'sms' | 'architecture'

  // SMS Notifications Feed
  const [smsLogs, setSmsLogs] = useState([]);
  const [refreshingSms, setRefreshingSms] = useState(false);

  // Fetch real SMS messages from server
  const fetchSmsLogs = async () => {
    setRefreshingSms(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/ussd/sms-logs`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSmsLogs(data.smsLogs || []);
      }
    } catch (err) {
      console.warn('Failed to fetch SMS logs:', err);
    } finally {
      setRefreshingSms(false);
    }
  };

  useEffect(() => {
    fetchSmsLogs();

    if (socket) {
      const handleSms = (sms) => {
        setSmsLogs((prev) => [sms, ...prev]);
      };
      const handleIrrigationComplete = (report) => {
        fetchSmsLogs();
      };
      socket.on('sms_dispatched', handleSms);
      socket.on('irrigation_completed', handleIrrigationComplete);

      return () => {
        socket.off('sms_dispatched', handleSms);
        socket.off('irrigation_completed', handleIrrigationComplete);
      };
    }
  }, [socket]);

  // Dial or Send USSD Command
  const handleSendUssd = async (overrideText = null) => {
    const textToSend = overrideText !== null ? overrideText : currentPrompt;
    setLoading(true);

    try {
      const parts = sessionHistory.concat(textToSend ? [textToSend] : []);
      const payloadText = sessionActive ? parts.join('*') : '';

      const res = await fetch(`${getApiUrl()}/api/ussd/simulate`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          sessionId: 'interactive-browser-session',
          serviceCode: '*384*4744#',
          phoneNumber: phoneNumber.trim(),
          text: payloadText
        })
      });

      if (res.ok) {
        const data = await res.json();
        setScreenText(data.message);
        if (data.status === 'CON') {
          setSessionActive(true);
          if (textToSend) {
            setSessionHistory(prev => [...prev, textToSend]);
          }
        } else {
          // END session reached
          setSessionActive(false);
          setSessionHistory([]);
        }
      } else {
        setScreenText('Connection timeout. Please redial *384*4744#');
        setSessionActive(false);
      }
    } catch (err) {
      setScreenText('Network error. Unable to reach telecom USSD gateway.');
      setSessionActive(false);
    } finally {
      setLoading(false);
      setCurrentPrompt('');
    }
  };

  const handleDialInitial = () => {
    setSessionActive(true);
    setSessionHistory([]);
    setScreenText('Connecting to Irriga-Tech USSD Gateway (*384*4744#)...');
    handleSendUssd('');
  };

  const handleKeyPress = (num) => {
    if (!sessionActive) {
      setUssdInput(prev => prev + num);
    } else {
      setCurrentPrompt(prev => prev + num);
    }
  };

  const handleClear = () => {
    if (!sessionActive) {
      setUssdInput(prev => prev.slice(0, -1));
    } else {
      setCurrentPrompt(prev => prev.slice(0, -1));
    }
  };

  const handleTriggerSimulatedIrrigationDone = async () => {
    try {
      setLoading(true);
      await fetch(`${getApiUrl()}/api/ai/advice`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          crop: 'Tomato (Solanum lycopersicum)',
          durationSeconds: 180,
          waterLiters: 36.0,
          soilPh: 6.2,
          soilMoisture: 48.0
        })
      });
      // Also trigger via command
      sendCommand('PUMP_OFF');
      setTimeout(() => {
        fetchSmsLogs();
      }, 1000);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto', padding: '1.5rem 1rem 5rem' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
          <Radio size={24} color="#059669" />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            USSD (*384*4744#) & Automated SMS Gateway
          </h1>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
          Empowering both learned and unlearned farmers with non-smart feature phones ("kabambe") to receive automated water, soil pH, and fertilizer advice without internet connectivity.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('phone')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '12px',
            background: activeTab === 'phone' ? '#059669' : '#f8fafc',
            color: activeTab === 'phone' ? '#ffffff' : '#64748b',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: 'pointer'
          }}
        >
          <Phone size={16} />
          Interactive Feature Phone Simulator
        </button>

        <button
          onClick={() => setActiveTab('sms')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '12px',
            background: activeTab === 'sms' ? '#059669' : '#f8fafc',
            color: activeTab === 'sms' ? '#ffffff' : '#64748b',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: 'pointer'
          }}
        >
          <MessageSquare size={16} />
          Automated SMS Dispatch Log ({smsLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('architecture')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '12px',
            background: activeTab === 'architecture' ? '#059669' : '#f8fafc',
            color: activeTab === 'architecture' ? '#ffffff' : '#64748b',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: 'pointer'
          }}
        >
          <Sparkles size={16} />
          AI & Telecom Requirements Guide
        </button>
      </div>

      {/* TAB 1: INTERACTIVE USSD PHONE */}
      {activeTab === 'phone' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'flex-start' }}>
          
          {/* Virtual Feature Phone Hardware Frame */}
          <div style={{
            background: 'linear-gradient(145deg, #1e293b, #0f172a)',
            borderRadius: '36px',
            padding: '1.75rem 1.25rem',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.4), inset 0 2px 4px rgba(255,255,255,0.1)',
            maxWidth: '360px',
            margin: '0 auto',
            border: '4px solid #334155'
          }}>
            
            {/* Phone Speaker & Status Indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem 0.75rem' }}>
              <div style={{ width: '40px', height: '4px', background: '#475569', borderRadius: '4px', margin: '0 auto' }} />
            </div>

            {/* Feature Phone LCD Screen (Nokia/Retro Green-Amber Backlit LCD) */}
            <div style={{
              background: '#0d2818',
              borderRadius: '18px',
              border: '3px solid #166534',
              padding: '1rem',
              color: '#4ade80',
              fontFamily: '"Courier New", Courier, monospace',
              minHeight: '210px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.8)',
              position: 'relative'
            }}>
              {/* Screen Status Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#22c55e', borderBottom: '1px dashed #15803d', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>
                <span>📶 Safaricom 2G</span>
                <span>🔋 95%</span>
              </div>

              {/* Main Display Body */}
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.82rem', lineHeight: '1.35', flex: 1, overflowY: 'auto' }}>
                {screenText}
              </div>

              {/* User Prompt Input on LCD */}
              {sessionActive && (
                <div style={{ marginTop: '0.5rem', borderTop: '1px dashed #15803d', paddingTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#86efac' }}>Input:</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>{currentPrompt || '_'}</span>
                </div>
              )}
            </div>

            {/* Input & Dial Controls */}
            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              
              {!sessionActive ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={ussdInput}
                    onChange={(e) => setUssdInput(e.target.value)}
                    placeholder="*384*4744#"
                    style={{
                      flex: 1,
                      background: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '12px',
                      color: '#ffffff',
                      padding: '0.6rem 0.8rem',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      textAlign: 'center'
                    }}
                  />
                  <button
                    onClick={handleDialInitial}
                    disabled={loading}
                    style={{
                      padding: '0.6rem 1.25rem',
                      borderRadius: '12px',
                      background: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Phone size={16} />
                    DIAL
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleSendUssd()}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '0.65rem',
                      borderRadius: '12px',
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Send size={15} />
                    SEND REPLY
                  </button>
                  <button
                    onClick={() => { setSessionActive(false); setScreenText('Session ended by user.'); setSessionHistory([]); }}
                    style={{
                      padding: '0.65rem 1rem',
                      borderRadius: '12px',
                      background: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    END
                  </button>
                </div>
              )}

              {/* Physical Number Keypad Grid (1-9, *, 0, #) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem',
                marginTop: '0.5rem'
              }}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((key) => (
                  <button
                    key={key}
                    onClick={() => handleKeyPress(key)}
                    style={{
                      background: '#334155',
                      border: '1px solid #475569',
                      borderRadius: '14px',
                      padding: '0.65rem 0',
                      color: '#ffffff',
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      boxShadow: '0 4px 0 #1e293b',
                      cursor: 'pointer',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    {key}
                  </button>
                ))}
              </div>

              {/* Bottom Phone Action Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                <button
                  onClick={handleClear}
                  style={{
                    background: '#475569',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.4rem 0.8rem',
                    color: '#e2e8f0',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  CLEAR
                </button>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', alignSelf: 'center' }}>
                  Irriga-Tech Feature Phone V2.4
                </div>
              </div>
            </div>
          </div>

          {/* Right Information & Quick Simulation Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Quick Interactive Shortcut Card */}
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '1.25rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                Simulate Immediate Irrigation Completion
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                Test what happens when the pump finishes watering: the AI diagnoses the post-irrigation substrate pH, calculates water liters used, prescribes fertilizer with optimal application hours, and automatically dispatches an SMS notification to the farmer!
              </p>

              <button
                onClick={handleTriggerSimulatedIrrigationDone}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                }}
              >
                <Droplets size={18} />
                Finish Irrigation Cycle & Trigger Automated Notification
              </button>
            </div>

            {/* Unlearned & Learned Farmer Accessibility Design */}
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '1.25rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <BookOpen size={18} color="#0284c7" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Dual-Language Accessibility (English & Kiswahili)
                </h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 0.75rem 0' }}>
                Designed so that any smallholder farmer regardless of literacy or technology background can operate with ease:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.78rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <strong>Menu 1:</strong> Angalia Hali ya Shamba (Soil, Temp & Tank Status)
                </div>
                <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <strong>Menu 2:</strong> Maji Yaliyotumika & Muda (Liters delivered & cycle time)
                </div>
                <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <strong>Menu 3:</strong> pH ya Udongo & Ushauri wa Mbolea (Best fertilizer + when to apply)
                </div>
                <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <strong>Menu 4:</strong> Washa au Zima Maji (Remote 3-minute emergency pump activation)
                </div>
                <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <strong>Automatic SMS:</strong> Farmer does not even need to dial—the system pushes the summary straight to their phone!
                </div>
              </div>
            </div>

            {/* Recipient Phone Configuration */}
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '1.25rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Farmer Recipient Phone Number
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+254 712 345 678"
                  style={{
                    flex: 1,
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                />
                <button
                  onClick={() => alert(`Farmer phone updated to: ${phoneNumber}`)}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '10px',
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Save
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: AUTOMATED SMS INBOX */}
      {activeTab === 'sms' && (
        <div style={{ background: '#ffffff', borderRadius: '24px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Automated SMS Notifications Inbox
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0' }}>
                Messages dispatched automatically to smallholder farmers post-irrigation.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={fetchSmsLogs}
                disabled={refreshingSms}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={14} className={refreshingSms ? 'spin' : ''} />
                Refresh SMS Feed
              </button>

              <button
                onClick={handleTriggerSimulatedIrrigationDone}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: '10px',
                  background: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer'
                }}
              >
                <Droplets size={14} />
                Trigger Test SMS
              </button>
            </div>
          </div>

          {smsLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
              <MessageSquare size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>No SMS messages recorded yet</div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                Click "Trigger Test SMS" above or run an irrigation cycle to see automatic post-irrigation messages!
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {smsLogs.map((sms, idx) => (
                <div
                  key={sms.id || idx}
                  style={{
                    background: '#f8fafc',
                    borderRadius: '16px',
                    padding: '1rem 1.25rem',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '9999px',
                        background: '#dcfce7',
                        color: '#15803d',
                        fontSize: '0.68rem',
                        fontWeight: 800
                      }}>
                        {sms.gateway || 'GSM GATEWAY'}
                      </span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                        To: {sms.recipient}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {new Date(sms.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {new Date(sms.timestamp).toLocaleDateString()}
                    </span>
                  </div>

                  {/* SMS Text Content */}
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    padding: '0.85rem',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    color: '#1e293b',
                    lineHeight: 1.5,
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                  }}>
                    {sms.message}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
                    <span>Type: <strong>{sms.type}</strong></span>
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Status: {sms.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ARCHITECTURE & REQUIREMENTS GUIDE */}
      {activeTab === 'architecture' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ background: '#ffffff', borderRadius: '24px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
              Field Requirements for AI Agronomy, USSD & Automated SMS
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.25rem 0' }}>
              Here are the exact physical and software requirements needed to deploy the system at full commercial production scale:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              
              {/* Requirement 1: Soil pH Sensor */}
              <div style={{ background: '#f8fafc', padding: '1.15rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Droplets size={20} color="#059669" />
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>1. Physical Soil pH Sensor Probe</h4>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>
                  • <strong>Model:</strong> Analog Industrial Soil pH Sensor (e.g. PH-4502C module with glass electrode or RS485 Modbus Soil NPK+pH Probe).<br />
                  • <strong>Interface:</strong> Connected to Pin <strong>A1</strong> on Arduino Uno / ESP32.<br />
                  • <strong>Calibration:</strong> Standard buffer solutions (pH 4.01 and pH 6.86) to calibrate analog millivolt slope.
                </div>
              </div>

              {/* Requirement 2: GSM / USSD Gateway */}
              <div style={{ background: '#f8fafc', padding: '1.15rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Radio size={20} color="#2563eb" />
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>2. Telecom USSD & SMS Gateway</h4>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>
                  • <strong>Cloud Gateway (Recommended):</strong> Africa's Talking Account (Username + API Key) providing USSD Service Code <strong>*384*4744#</strong> and Sender ID <strong>IRRIGATECH</strong>.<br />
                  • <strong>Hardware Fallback:</strong> SIM800L or SIM7600 GSM modem with a standard SIM card connected via UART for direct offline SMS dispatch.
                </div>
              </div>

              {/* Requirement 3: AI Engine */}
              <div style={{ background: '#f8fafc', padding: '1.15rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Sparkles size={20} color="#9333ea" />
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>3. AI Agronomy Intelligence Model</h4>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>
                  • <strong>Local Expert Engine:</strong> Already integrated! Deterministic FAO-56 crop coefficient & horticultural nutrient models (zero internet latency).<br />
                  • <strong>Generative AI:</strong> Google Gemini 1.5/2.0 API Key (configurable in Settings) for dynamic agronomic disease prevention & weather adaptability.
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
}
