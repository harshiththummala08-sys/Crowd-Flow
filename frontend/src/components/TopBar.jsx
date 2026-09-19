import { Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export function TopBar({ status, onStart, onStop, onReset, onDemo, onMode }) {
  const isAdaptive = status?.mode === 'ADAPTIVE';
  return (
    <motion.header className="topbar" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="run-status">
        <span className={`status-dot ${status?.running ? 'live' : ''}`} />
        <b>{status?.running ? 'Simulation Running' : 'Simulation Paused'}</b>
        <span>Sim Time: <strong>{status?.simulation_time || 0}s</strong></span>
        <span>Mode: <strong>{isAdaptive ? 'Adaptive' : 'Fixed'}</strong></span>
      </div>
      <div className="actions app-controls">
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
