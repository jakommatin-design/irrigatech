import React from 'react';
import { useSensors } from '../context/SensorContext';
import { GitBranch, Play, CheckCircle2, XCircle, Code, Cpu } from 'lucide-react';

export default function LogicFlowView() {
  const { soilMoisture, temperature, pump, ac, led } = useSensors();

  const isDry = soilMoisture > 70; // High % dry on FC-28 resistive sensor

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem 1rem 5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
          Irrigation Decision Flow & Firmware Logic
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
          Flowchart matching system execution logic from sensor ingestion to relay trigger.
        </p>
      </div>

      {/* Interactive Flowchart Diagram */}
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '1.5rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        marginBottom: '1.75rem'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          
          {/* Start Pill */}
          <div style={{
            background: '#e2e8f0',
            color: '#334155',
            fontWeight: 700,
            fontSize: '0.82rem',
            padding: '0.45rem 1.75rem',
            borderRadius: '9999px',
            border: '1px solid #cbd5e1'
          }}>
            Start (Microcontroller Boot)
          </div>

          <div style={{ width: '2px', height: '16px', background: '#94a3b8' }} />

          {/* Sensors Ingestion Box */}
          <div style={{
            background: '#fef3c7',
            border: '2px solid #fde68a',
            borderRadius: '14px',
            padding: '0.75rem 1.25rem',
            textAlign: 'center',
            maxWidth: '380px',
            width: '100%'
          }}>
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#92400e' }}>
              FC-28 (A0), DHT11 (D2) Read
            </div>
            <div style={{ fontSize: '0.72rem', color: '#b45309' }}>
              Current Values: Soil={soilMoisture}%, Temp={temperature}°C
            </div>
          </div>

          <div style={{ width: '2px', height: '16px', background: '#94a3b8' }} />

          {/* Edge Computing Step */}
          <div style={{
            background: '#ffedd5',
            border: '2px solid #fed7aa',
            borderRadius: '14px',
            padding: '0.75rem 1.25rem',
            textAlign: 'center',
            maxWidth: '380px',
            width: '100%'
          }}>
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#9a3412' }}>
              Edge Computing & LCD 16x2 Output
            </div>
            <div style={{ fontSize: '0.72rem', color: '#c2410c' }}>
              lcd.print(T, H, Soil) | Serial.println()
            </div>
          </div>

          <div style={{ width: '2px', height: '16px', background: '#94a3b8' }} />

          {/* Decision Diamond */}
          <div style={{
            background: isDry ? '#fee2e2' : '#dcfce7',
            border: `2px solid ${isDry ? '#f87171' : '#86efac'}`,
            borderRadius: '16px',
            padding: '1rem 1.5rem',
            textAlign: 'center',
            maxWidth: '420px',
            width: '100%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: isDry ? '#991b1b' : '#166534', textTransform: 'uppercase' }}>
              Decision Condition:
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0.25rem 0' }}>
              Is Soil Dryness &gt; 70% ?
            </div>
            <div style={{ fontSize: '0.78rem', color: isDry ? '#dc2626' : '#15803d', fontWeight: 700 }}>
              Current: {soilMoisture}% → {isDry ? 'CONDITION TRUE' : 'CONDITION FALSE'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', width: '100%', maxWidth: '520px', marginTop: '0.5rem' }}>
            {/* TRUE BRANCH: Water Pump ON */}
            <div style={{
              background: '#ecfdf5',
              border: `2px solid ${pump ? '#10b981' : '#d1fae5'}`,
              borderRadius: '14px',
              padding: '0.75rem',
              textAlign: 'center',
              boxShadow: pump ? '0 0 0 3px rgba(16, 185, 129, 0.2)' : 'none'
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#059669' }}>TRUE (Dry)</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#065f46', marginTop: '0.2rem' }}>
                digitalWrite(RELAY_PIN, HIGH);
              </div>
              <div style={{ fontSize: '0.7rem', color: '#047857' }}>
                Water Pump Activated (5 min limit)
              </div>
            </div>

            {/* FALSE BRANCH: Standby */}
            <div style={{
              background: '#f8fafc',
              border: `2px solid ${!pump ? '#94a3b8' : '#e2e8f0'}`,
              borderRadius: '14px',
              padding: '0.75rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b' }}>FALSE (Optimal)</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155', marginTop: '0.2rem' }}>
                digitalWrite(RELAY_PIN, LOW);
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Pump Idle • Soil adequately hydrated
              </div>
            </div>
          </div>

          <div style={{ width: '2px', height: '16px', background: '#94a3b8' }} />

          {/* End Pill */}
          <div style={{
            background: '#e2e8f0',
            color: '#334155',
            fontWeight: 700,
            fontSize: '0.82rem',
            padding: '0.45rem 1.75rem',
            borderRadius: '9999px',
            border: '1px solid #cbd5e1'
          }}>
            Loop Delay (delay(2000)) → Repeat
          </div>

        </div>
      </div>

      {/* Firmware Code Snip Reference */}
      <div style={{
        background: '#0f172a',
        borderRadius: '20px',
        padding: '1.25rem',
        color: '#f8fafc',
        fontFamily: 'monospace',
        fontSize: '0.8rem',
        overflowX: 'auto'
      }}>
        <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: '0.5rem', fontFamily: 'sans-serif' }}>
          Embedded Arduino Code Reference (pins & loop)
        </div>
        <pre style={{ margin: 0, lineHeight: 1.5 }}>
{`// Pin configuration
#define DHTPIN 2              // DHT11 Sensor
#define SOIL_MOISTURE_PIN A0  // Analog Soil Moisture
#define RELAY_PIN 3           // Water Pump Relay
#define LED_PIN 8             // Buzzer / LED
#define AC_PIN 7              // AC / Ventilation

void loop() {
  float hum = dht.readHumidity();
  float temp = dht.readTemperature();
  int soilVal = analogRead(SOIL_MOISTURE_PIN);

  if (soilVal > 700) {        // Dry soil condition
    digitalWrite(RELAY_PIN, HIGH); // Turn pump ON
    digitalWrite(LED_PIN, HIGH);
  } else {
    digitalWrite(RELAY_PIN, LOW);  // Turn pump OFF
    digitalWrite(LED_PIN, LOW);
  }
}`}
        </pre>
      </div>

    </div>
  );
}
