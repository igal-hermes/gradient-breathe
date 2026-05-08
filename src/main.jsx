import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Maximize2, Minimize2, Sparkles, TimerReset, Wind } from 'lucide-react';
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

function OrganismCanvas({ phase, phaseProgress, elapsed, fullscreen }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let raf;
    const particles = Array.from({ length: 360 }, (_, i) => ({
      seed: i * 12.9898,
      lane: i / 360,
      jitter: (i % 17) / 17,
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const cx = w / 2;
      const cy = h / 2;
      const min = Math.min(w, h);
      const inhaleScale = phase.key === 'inhale' ? phaseProgress : phase.key === 'hold' ? 1 : 1 - phaseProgress;
      const breath = 0.74 + inhaleScale * 0.28;
      const pulse = Math.sin(elapsed * 1.8) * 0.02 + Math.sin(elapsed * 0.43) * 0.035;
      const radius = min * (fullscreen ? 0.28 : 0.31) * (breath + pulse);

      ctx.clearRect(0, 0, w, h);
      const bg = ctx.createRadialGradient(cx, cy, min * 0.04, cx, cy, min * 0.62);
      bg.addColorStop(0, `${phase.color}26`);
      bg.addColorStop(0.42, `${phase.color}10`);
      bg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = 'lighter';
      for (const p of particles) {
        const angle = p.lane * Math.PI * 2 + elapsed * (0.16 + p.jitter * 0.12);
        const wave = Math.sin(angle * 4 + elapsed * 2.1 + p.seed) * 0.16 + Math.cos(angle * 7 - elapsed * 1.25) * 0.07;
        const membrane = radius * (1 + wave);
        const spiral = Math.sin(elapsed * 0.6 + p.seed) * min * 0.018;
        const x = cx + Math.cos(angle) * (membrane + spiral);
        const y = cy + Math.sin(angle) * (membrane * 0.82 + spiral) + Math.sin(angle * 3 + elapsed) * min * 0.025;
        const depth = 0.45 + 0.55 * Math.sin(angle + elapsed * 0.7 + p.seed);
        const size = (fullscreen ? 1.8 : 1.35) + depth * (fullscreen ? 3.5 : 2.6);
        ctx.beginPath();
        ctx.fillStyle = phase.color + Math.floor(90 + depth * 135).toString(16).padStart(2, '0');
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let ring = 0; ring < 4; ring += 1) {
        ctx.beginPath();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = phase.color + (26 - ring * 4).toString(16).padStart(2, '0');
        const r = radius * (0.56 + ring * 0.18 + Math.sin(elapsed + ring) * 0.015);
        for (let i = 0; i <= 220; i += 1) {
          const a = (i / 220) * Math.PI * 2;
          const wobble = Math.sin(a * 5 + elapsed * 1.6 + ring) * min * 0.008;
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
  }, [phase, phaseProgress, elapsed, fullscreen]);

  return <canvas className="organism-canvas" ref={canvasRef} aria-hidden="true" />;
}

function App() {
  const [durations, setDurations] = useState({ inhale: 4, hold: 4, exhale: 6 });
  const [isFullscreen, setFullscreen] = useState(false);
  const stageRef = useRef(null);
  const { phase, phaseProgress, remaining, cycle, cycleProgress, elapsed } = useBreathClock(durations);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const updateDuration = (key, value) => setDurations((prev) => ({ ...prev, [key]: clampDuration(value) }));
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) await stageRef.current?.requestFullscreen();
    else await document.exitFullscreen();
  };

  return (
    <main className="shell">
      <section className="hero-card">
        <nav className="nav">
          <div className="brand"><span className="logo"><Wind size={18}/></span> Gradient Breathe</div>
          <span className="pill"><Sparkles size={13}/> {cycle}s living loop</span>
        </nav>

        <div className="hero-grid">
          <div className="copy">
            <span className="eyebrow">editable cadence · living pixels · fullscreen</span>
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

          <div ref={stageRef} className="breather" style={{ '--phase-color': phase.color }}>
            <OrganismCanvas phase={phase} phaseProgress={phaseProgress} elapsed={elapsed} fullscreen={isFullscreen} />
            <button className="fullscreen-btn" onClick={toggleFullscreen} aria-label="Toggle fullscreen animation">
              {isFullscreen ? <Minimize2 size={16}/> : <Maximize2 size={16}/>} {isFullscreen ? 'Exit' : 'Fullscreen'}
            </button>
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
