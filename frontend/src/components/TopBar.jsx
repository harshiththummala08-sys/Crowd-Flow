import { Activity, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export function TopBar({ status, onStart, onStop, onReset, onDemo, onMode }) {
  const isAdaptive = status?.mode === 'ADAPTIVE';
  return (
    <motion.header className="topbar" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <div className="brand">CrowdFlow</div>
        <div className="tagline">Live traffic signal demo with clear adaptive control</div>
      </div>
      <div className="mode-explainer">
        <span className="pill online"><Activity size={15} /> Online</span>
        <span className={`pill ${status?.running ? 'cyan' : ''}`}>{status?.running ? 'Running live' : 'Paused'}</span>
        <span className="pill">Time {status?.simulation_time || 0}s</span>
        <p>
          <b>{isAdaptive ? 'Adaptive mode:' : 'Fixed mode:'}</b>{' '}
          {isAdaptive ? 'CrowdFlow changes green time based on traffic.' : 'Signals use the same timing, even when traffic builds up.'}
        </p>
      </div>
      <div className="actions">
        <button className="mode-toggle" onClick={() => onMode(status?.mode === 'ADAPTIVE' ? 'FIXED' : 'ADAPTIVE')} aria-label="Toggle optimization mode">
          <span className={status?.mode === 'FIXED' ? 'active' : ''}>Fixed timing</span>
          <span className={status?.mode === 'ADAPTIVE' ? 'active adaptive' : ''}>CrowdFlow adaptive</span>
        </button>
        <button className="primary-action" onClick={onDemo}><Sparkles size={17} /> Guided demo</button>
        <button onClick={onStart}><Play size={17} /> Start live</button>
        <button onClick={onStop}><Pause size={17} /> Pause</button>
        <button onClick={onReset}><RotateCcw size={17} /> Reset</button>
      </div>
    </motion.header>
  );
}
