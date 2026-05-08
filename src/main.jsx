import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Sparkles, Wind, TimerReset } from 'lucide-react';
import './styles.css';

const phases = [
  { label: 'Inhale', seconds: 4, hint: 'Draw the light in', color: '#0a72ef' },
  { label: 'Hold', seconds: 4, hint: 'Let everything settle', color: '#de1d8d' },
  { label: 'Exhale', seconds: 6, hint: 'Release the static', color: '#ff5b4f' },
];

function App() {
  const [tick, setTick] = useState(0);
  const cycle = useMemo(() => phases.reduce((sum, phase) => sum + phase.seconds, 0), []);
  const cycleTick = tick % cycle;

  let cursor = 0;
  const phaseIndex = phases.findIndex((phase) => {
    const inside = cycleTick >= cursor && cycleTick < cursor + phase.seconds;
    cursor += phase.seconds;
    return inside;
  });
  const phase = phases[phaseIndex];
  const phaseStart = phases.slice(0, phaseIndex).reduce((sum, p) => sum + p.seconds, 0);
  const remaining = phase.seconds - (cycleTick - phaseStart);
  const progress = ((cycleTick + 1) / cycle) * 100;

  useEffect(() => {
    const id = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="shell">
      <section className="hero-card">
        <nav className="nav">
          <div className="brand"><span className="logo"><Wind size={18}/></span> Gradient Breathe</div>
          <span className="pill"><Sparkles size={13}/> {cycle}s reset</span>
        </nav>

        <div className="hero-grid">
          <div className="copy">
            <span className="eyebrow">tiny calm app · no account · no tracking</span>
            <h1>A beautiful breathing loop for the next quiet minute.</h1>
            <p>Follow the orb through a simple 4–4–6 cadence. It is intentionally small, responsive, and deploys in seconds.</p>

            <div className="stats">
              {phases.map((item) => (
                <div className="stat" key={item.label} style={{ '--accent': item.color }}>
                  <span>{item.label}</span>
                  <strong>{item.seconds}s</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="breather" style={{ '--phase-color': phase.color }}>
            <div className={`orb phase-${phase.label.toLowerCase()}`}>
              <div className="orb-core">
                <span>{phase.label}</span>
                <strong>{remaining}</strong>
              </div>
            </div>
            <div className="caption">
              <TimerReset size={16}/>
              <span>{phase.hint}</span>
            </div>
            <div className="progress"><span style={{ width: `${progress}%` }} /></div>
          </div>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
