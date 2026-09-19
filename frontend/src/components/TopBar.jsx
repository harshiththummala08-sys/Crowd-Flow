import { Activity, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export function TopBar({ status, onStart, onStop, onReset, onDemo, onMode }) {
  return (
    <motion.header className="topbar" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <div className="brand">CrowdFlow</div>
        <div className="tagline">AI-Powered Adaptive Traffic Network Optimizer</div>
      </div>
      <div className="system-pills">
        <span className="pill online"><Activity size={15} /> SYSTEM ONLINE</span>
        <span className="pill cyan">SIMULATION {status?.running ? 'ACTIVE' : 'PAUSED'}</span>
        <span className="pill">T+{status?.simulation_time || 0}s</span>
      </div>
      <div className="actions">
        <button className="mode-toggle" onClick={() => onMode(status?.mode === 'ADAPTIVE' ? 'FIXED' : 'ADAPTIVE')} aria-label="Toggle optimization mode">
          <span className={status?.mode === 'FIXED' ? 'active' : ''}>Fixed</span>
          <span className={status?.mode === 'ADAPTIVE' ? 'active adaptive' : ''}>Adaptive</span>
        </button>
        <button onClick={onDemo}><Sparkles size={17} /> Run Demo</button>
        <button onClick={onStart}><Play size={17} /> Start</button>
        <button onClick={onStop}><Pause size={17} /> Pause</button>
        <button onClick={onReset}><RotateCcw size={17} /> Reset</button>
      </div>
    </motion.header>
  );
}

