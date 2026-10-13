import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Droplets, LoaderCircle, Sparkles, Sprout, Sun } from 'lucide-react';
import { useSensors } from '../context/SensorContext';

const cardStyle = {
  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18,
  padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
};

export default function AiAdviceView() {
  const sensors = useSensors();
  const { temperature, humidity, soilMoisture, connected, mode } = sensors;
  const canRequest = connected || mode === 'demo';
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const serverUrl = import.meta.env.VITE_SERVER_URL ||
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3000' : window.location.origin);

  async function getAdvice() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${serverUrl}/api/ai/advice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crop: 'Tomato (Solanum lycopersicum)',
          cropStage: 'Vegetative Phase',
          soilMoisture: Number(soilMoisture),
          soilPh: Number(sensors.soilPh || 6.2),
          temperature: Number(temperature),
          humidity: Number(humidity)
        })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not generate advice.');
      setResult(data);
    } catch (err) {
      setError(`${err.message} Check that the Irriga-Tech server is running and reachable.`);
    } finally {
      setLoading(false);
    }
  }

  const advice = result?.advice;
  const vpd = temperature > -237.3
    ? (0.61078 * Math.exp((17.27 * temperature) / (temperature + 237.3)) * (1 - humidity / 100)).toFixed(2)
    : '—';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem 1rem 5rem', display: 'grid', gap: '1rem' }}>
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem' }}>
          <Sparkles size={22} color="#059669" />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>AI Agronomy Advice</h1>
        </div>
        <p style={{ fontSize: '.88rem', color: '#64748b', margin: '.45rem 0 0' }}>
          Generate a crop advisory from the latest greenhouse readings. AI advice is informational and never controls the pump.
        </p>
      </header>

      <section style={{ ...cardStyle, display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong style={{ color: '#0f172a' }}>Current greenhouse readings</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.1rem', marginTop: '.65rem', color: '#475569', fontSize: '.9rem' }}>
            <span><Sun size={15} style={{ verticalAlign: 'middle' }} /> {temperature}°C</span>
            <span>Humidity {humidity}%</span>
            <span><Droplets size={15} style={{ verticalAlign: 'middle' }} /> Soil moisture {soilMoisture}%</span>
            <span>🧪 Soil pH {sensors.soilPh || 6.2}</span>
            <span>VPD {vpd} kPa</span>
          </div>
          <div style={{ marginTop: '.55rem', color: '#64748b', fontSize: '.78rem' }}>
            Data status: {connected ? 'Hardware connected' : mode === 'demo' ? 'Demo readings' : 'No hardware connected'}
          </div>
          {mode === 'demo' && <div style={{ marginTop: '.35rem', color: '#92400e', fontSize: '.78rem' }}>These simulated readings are for demonstration only.</div>}
        </div>
        <button onClick={getAdvice} disabled={loading || !canRequest} style={{ border: 0, borderRadius: 10, padding: '.75rem 1rem', background: loading || !canRequest ? '#94a3b8' : '#15803d', color: '#fff', fontWeight: 700, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          {loading ? <LoaderCircle size={17} className="spin" /> : <Sparkles size={17} />}
          {loading ? 'Generating advice…' : canRequest ? 'Generate advice' : 'Connect hardware first'}
        </button>
      </section>

      {error && <div role="alert" style={{ ...cardStyle, color: '#b91c1c', background: '#fef2f2', display: 'flex', gap: '.6rem', alignItems: 'flex-start' }}><AlertCircle size={18} />{error}</div>}

      {advice && <>
        <section style={{ ...cardStyle, borderColor: result.aiMode === 'gemini' ? '#a7f3d0' : '#fde68a', background: result.aiMode === 'gemini' ? '#f0fdf4' : '#fffbeb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontWeight: 800, color: '#0f172a' }}>
            {result.aiMode === 'gemini' ? <CheckCircle2 size={18} color="#15803d" /> : <AlertCircle size={18} color="#b45309" />}
            {result.aiMode === 'gemini' ? 'AI generated advisory (Gemini Engine)' : 'Rules based advisory (FAO-56 Offline Engine)'}
          </div>
          {result.aiMode !== 'gemini' && <p style={{ color: '#92400e', fontSize: '.82rem', margin: '.5rem 0 0' }}>Gemini API key is optional. The built-in agronomy rules engine operates fully offline with instant response.</p>}
          <div style={{ color: '#64748b', fontSize: '.78rem', marginTop: '.45rem' }}>For {advice.crop} · {advice.cropStage} · {new Date(advice.isoTime).toLocaleString()}</div>
        </section>

        <section style={cardStyle}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '1rem', margin: '0 0 .8rem', color: '#0f172a' }}><Droplets size={18} color="#0284c7" /> Post-Irrigation Water & Substrate Summary</h2>
          <p style={{ margin: '0 0 .5rem', color: '#475569', lineHeight: 1.6 }}>
            <strong>Water Delivered:</strong> {advice.irrigationSummary.waterLiters} Liters · <strong>Duration:</strong> {advice.irrigationSummary.durationMinutes} min · <strong>Soil Moisture:</strong> {advice.irrigationSummary.soilMoistureAfter}% · <strong>Substrate pH:</strong> {advice.irrigationSummary.soilPh} ({advice.irrigationSummary.phStatus})
          </p>
          <div style={{ marginTop: '.65rem', padding: '.75rem', borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '.82rem', color: '#166534', lineHeight: 1.45 }}>
            <strong>📱 Automated SMS Dispatched to Farmer Phone:</strong><br />
            {advice.smsMessageSw || advice.smsMessageEn}
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '1rem', margin: '0 0 .8rem', color: '#0f172a' }}><Sprout size={18} color="#15803d" /> Recommendation</h2>
          <p style={{ margin: '0 0 .5rem', color: '#334155', lineHeight: 1.6 }}><strong>Fertilizer:</strong> {advice.recommendation.fertilizer}</p>
          <p style={{ margin: '0 0 .5rem', color: '#334155', lineHeight: 1.6 }}><strong>Dosage:</strong> {advice.recommendation.dosage}</p>
          <p style={{ margin: '0 0 .5rem', color: '#334155', lineHeight: 1.6 }}><strong>Timing:</strong> {advice.recommendation.timing}</p>
          <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>{advice.recommendation.scientificRationale}</p>
          <div style={{ marginTop: '1rem', padding: '.75rem', borderRadius: 10, background: '#f8fafc', color: '#64748b', fontSize: '.8rem', lineHeight: 1.5 }}>
            Confirm fertilizer and dosage against a soil or substrate test and local agronomist guidance before applying. Do not treat this advisory as a verified nutrient prescription.
          </div>
        </section>
      </>}

      {!advice && !error && <section style={{ ...cardStyle, color: '#64748b', textAlign: 'center' }}>Select “Generate advice” to request an advisory based on these readings.</section>}
    </div>
  );
}
