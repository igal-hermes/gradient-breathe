import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Sparkles, TimerReset, Wind } from 'lucide-react';
import './styles.css';

const phaseMeta = [
  { key: 'inhale', label: 'Inhale', hint: 'Draw the light in', color: '#0a72ef' },
  { key: 'hold', label: 'Hold', hint: 'Let everything shimmer', color: '#de1d8d' },
  { key: 'exhale', label: 'Exhale', hint: 'Release the static', color: '#ff5b4f' },
];

function clampDuration(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(30, Math.round(parsed)));
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return [0, 2, 4].map((offset) => parseInt(clean.slice(offset, offset + 2), 16));
}

function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

function lerpColor(from, to, amount) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  return rgbToHex(a.map((value, i) => value + (b[i] - value) * amount));
}

function useBreathClock(durations) {
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(performance.now());
  const cycle = useMemo(() => phaseMeta.reduce((sum, phase) => sum + durations[phase.key], 0), [durations]);

  useEffect(() => {
    started.current = performance.now();
    setElapsed(0);
  }, [cycle]);

  useEffect(() => {
    let frame;
    const loop = (now) => {
      setElapsed((now - started.current) / 1000);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const cycleTime = cycle ? elapsed % cycle : 0;
  let cursor = 0;
  let activeIndex = 0;
  for (let i = 0; i < phaseMeta.length; i += 1) {
    const length = durations[phaseMeta[i].key];
    if (cycleTime >= cursor && cycleTime < cursor + length) {
      activeIndex = i;
      break;
    }
    cursor += length;
  }

  const phase = phaseMeta[activeIndex];
  const phaseStart = phaseMeta.slice(0, activeIndex).reduce((sum, p) => sum + durations[p.key], 0);
  const local = cycleTime - phaseStart;
  const phaseProgress = local / durations[phase.key];
  const remaining = Math.max(1, Math.ceil(durations[phase.key] - local));
  const cycleProgress = ((cycleTime / cycle) * 100) || 0;

  return { phase, phaseProgress, remaining, cycle, cycleProgress, elapsed };
}

function OrganismCanvas({ phase, phaseProgress, elapsed, phaseDuration, visualColor }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ phase, phaseProgress, elapsed, phaseDuration, visualColor });

  useEffect(() => {
    stateRef.current = { phase, phaseProgress, elapsed, phaseDuration, visualColor };
  }, [phase, phaseProgress, elapsed, phaseDuration, visualColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let raf;
    const particles = Array.from({ length: 380 }, (_, i) => ({
      seed: i * 12.9898,
      lane: i / 380,
      jitter: (i % 23) / 23,
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      const { phase, phaseProgress, elapsed, phaseDuration, visualColor } = stateRef.current;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const cx = w / 2;
      const cy = h / 2;
      const min = Math.min(w, h);
      const inhaleScale = phase.key === 'inhale' ? phaseProgress : phase.key === 'hold' ? 1 : 1 - phaseProgress;
      const slowTime = elapsed * (0.105 * (4 / Math.max(1, phaseDuration)));
      const breathWave = phaseProgress * Math.PI;
      const breath = 0.72 + inhaleScale * 0.3;
      const pulse = Math.sin(breathWave) * 0.018 + Math.sin(slowTime * 0.9) * 0.01;
      const radius = min * 0.31 * (breath + pulse);

      ctx.clearRect(0, 0, w, h);
      const bg = ctx.createRadialGradient(cx, cy, min * 0.04, cx, cy, min * 0.62);
      bg.addColorStop(0, `${visualColor}28`);
      bg.addColorStop(0.42, `${visualColor}12`);
      bg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = 'lighter';
      for (const p of particles) {
        const drift = slowTime * (0.34 + p.jitter * 0.22);
        const angle = p.lane * Math.PI * 2 + drift;
        const wave = Math.sin(angle * 4 + slowTime * 1.25 + p.seed) * 0.15 + Math.cos(angle * 7 - slowTime * 0.72) * 0.065;
        const membrane = radius * (1 + wave);
        const spiral = Math.sin(slowTime * 0.55 + p.seed) * min * 0.01;
        const x = cx + Math.cos(angle) * (membrane + spiral);
        const y = cy + Math.sin(angle) * (membrane * 0.82 + spiral) + Math.sin(angle * 3 + slowTime) * min * 0.018;
        const depth = 0.45 + 0.55 * Math.sin(angle + slowTime * 0.72 + p.seed);
        const size = 1.3 + depth * 2.55;
        ctx.beginPath();
        ctx.fillStyle = visualColor + Math.floor(92 + depth * 138).toString(16).padStart(2, '0');
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let ring = 0; ring < 4; ring += 1) {
        ctx.beginPath();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = visualColor + (28 - ring * 4).toString(16).padStart(2, '0');
        const r = radius * (0.56 + ring * 0.18 + Math.sin(slowTime * 0.7 + ring) * 0.012);
        for (let i = 0; i <= 220; i += 1) {
          const a = (i / 220) * Math.PI * 2;
          const wobble = Math.sin(a * 5 + slowTime * 0.9 + ring) * min * 0.006;
          const x = cx + Math.cos(a) * (r + wobble);
          const y = cy + Math.sin(a) * ((r + wobble) * 0.82);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas className="organism-canvas" ref={canvasRef} aria-hidden="true" />;
}

function App() {
  const [durations, setDurations] = useState({ inhale: 4, hold: 4, exhale: 6 });
  const { phase, phaseProgress, remaining, cycle, cycleProgress, elapsed } = useBreathClock(durations);
  const [visualColor, setVisualColor] = useState(phase.color);

  useEffect(() => {
    let frame;
    const animateColor = () => {
      setVisualColor((current) => lerpColor(current, phase.color, 0.035));
      frame = requestAnimationFrame(animateColor);
    };
    frame = requestAnimationFrame(animateColor);
    return () => cancelAnimationFrame(frame);
  }, [phase.color]);

  const updateDuration = (key, value) => setDurations((prev) => ({ ...prev, [key]: clampDuration(value) }));

  return (
    <main className="shell">
      <section className="hero-card">
        <nav className="nav">
          <div className="brand"><span className="logo"><Wind size={18}/></span> Gradient Breathe</div>
          <span className="pill"><Sparkles size={13}/> {cycle}s living loop</span>
        </nav>

        <div className="hero-grid">
          <div className="copy">
            <span className="eyebrow">editable cadence · living pixels · phase-timed motion</span>
            <h1>A breathing organism you can tune to your rhythm.</h1>
            <p>Set the cadence, then watch hundreds of pixels expand, shimmer, and fold back like a soft luminous creature.</p>

            <div className="controls" aria-label="Breathing duration controls">
              {phaseMeta.map((item) => (
                <label className="duration-card" key={item.key} style={{ '--accent': item.color }}>
                  <span>{item.label}</span>
                  <div><input type="number" min="1" max="30" value={durations[item.key]} onChange={(e) => updateDuration(item.key, e.target.value)} /><b>s</b></div>
                </label>
              ))}
            </div>
          </div>

          <div className="breather" style={{ '--phase-color': visualColor }}>
            <OrganismCanvas phase={phase} phaseProgress={phaseProgress} elapsed={elapsed} phaseDuration={durations[phase.key]} visualColor={visualColor} />
            <div className="orb-core">
              <span>{phase.label}</span>
              <strong>{remaining}</strong>
            </div>
            <div className="caption"><TimerReset size={16}/><span>{phase.hint}</span></div>
            <div className="progress"><span style={{ width: `${cycleProgress}%` }} /></div>
          </div>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
