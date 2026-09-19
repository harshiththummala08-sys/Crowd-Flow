import { AlertTriangle, Gauge, Route, Siren, Timer, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from './AnimatedNumber.jsx';

export function MetricsGrid({ metrics }) {
  const cards = [
    ['Vehicles now', metrics.vehicles, '', 0, Gauge],
    ['Average wait', metrics.average_waiting_time, 's', 1, Timer],
    ['Queue size', metrics.average_queue_length, '', 1, Route],
    ['Traffic speed', metrics.average_speed, ' km/h', 1, Zap],
  ];
  return (
    <div className="metric-grid">
      {cards.map(([label, value, suffix, decimals, Icon], index) => (
        <motion.div className="metric-card" key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
          <Icon size={18} />
          <span>{label}</span>
          <strong><AnimatedNumber value={value} suffix={suffix} decimals={decimals} /></strong>
        </motion.div>
      ))}
      <motion.div className={`metric-card emergency-card ${metrics.emergency_status === 'ACTIVE' ? 'active' : ''}`}>
        <Siren size={18} />
        <span>Emergency</span>
        <strong>{metrics.emergency_status}</strong>
      </motion.div>
      <motion.div className="metric-card">
        <AlertTriangle size={18} />
        <span>Longest wait</span>
        <strong><AnimatedNumber value={metrics.maximum_waiting_time} suffix="s" decimals={1} /></strong>
      </motion.div>
    </div>
  );
}

export function IntelligencePanel({ road, decision }) {
  if (!road) return null;
  return (
    <motion.aside className="intel-panel" key={road.road_id} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}>
      <div className="panel-kicker">Selected Road</div>
      <h2>{road.road_id} <span>{road.source_intersection} to {road.destination_intersection}</span></h2>
      <div className={`signal-badge ${road.signal_state.toLowerCase()}`}>{road.signal_state}</div>
      <div className="plain-summary">
        <b>{road.signal_state.includes('GREEN') ? 'Traffic can move now.' : road.signal_state === 'YELLOW' ? 'Signal is changing.' : 'Traffic is waiting.'}</b>
        <span>{road.vehicle_count.toFixed(0)} vehicles, {road.queue_length.toFixed(0)} queued, {road.congestion_level.toLowerCase()} congestion.</span>
      </div>
      <div className="stat-list">
        <label>Vehicles <b>{road.vehicle_count.toFixed(0)}</b></label>
        <label>Queue <b>{road.queue_length.toFixed(0)}</b></label>
        <label>Wait <b>{road.waiting_time.toFixed(0)}s</b></label>
        <label>Speed <b>{road.average_speed.toFixed(1)} km/h</b></label>
        <label>Next green time <b>{road.green_time}s</b></label>
        <label>Fairness <b>{road.fairness_active ? 'Active' : 'Normal'}</b></label>
      </div>
      <div className="why">
        <h3>What is happening?</h3>
        {decision?.explanation.slice(0, 3).map((line, index) => (
          <motion.p key={line} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}>{line}</motion.p>
        ))}
      </div>
    </motion.aside>
  );
}

export function WhatIfPanel({ roads, onAdjust, onEmergency, onExperiment }) {
  return (
    <section className="whatif">
      <div>
        <h2>Try A Simple Scenario</h2>
        <p>Add traffic, clear traffic, or trigger an ambulance route.</p>
      </div>
      <div className="whatif-grid">
        {roads.slice(0, 4).map((road) => (
          <div className="whatif-row" key={road.road_id}>
            <span>{road.road_id}</span>
            <button onClick={() => onAdjust(road.road_id, -10)} aria-label={`Reduce traffic on ${road.road_id}`}>Less</button>
            <button onClick={() => onAdjust(road.road_id, 20)} aria-label={`Increase traffic on ${road.road_id}`}>More</button>
            <button className="emergency-trigger" onClick={() => onEmergency(road.road_id)}>Ambulance</button>
          </div>
        ))}
      </div>
      <button className="experiment-button" onClick={onExperiment}>Compare Fixed vs Adaptive</button>
    </section>
  );
}
