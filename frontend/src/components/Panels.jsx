import { AlertTriangle, BarChart3, BrainCircuit, Gauge, Route, Siren, Timer, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from './AnimatedNumber.jsx';

export function MetricsGrid({ metrics }) {
  const cards = [
    ['Vehicles', metrics.vehicles, '', 0, Gauge],
    ['Avg Waiting', metrics.average_waiting_time, 's', 1, Timer],
    ['Avg Queue', metrics.average_queue_length, '', 1, Route],
    ['Avg Speed', metrics.average_speed, ' km/h', 1, Zap],
    ['Congestion', metrics.congestion_score, '', 2, BarChart3],
    ['Throughput', metrics.throughput, '', 1, BrainCircuit],
    ['Max Wait', metrics.maximum_waiting_time, 's', 1, AlertTriangle],
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
    </div>
  );
}

export function IntelligencePanel({ road, decision }) {
  if (!road) return null;
  return (
    <motion.aside className="intel-panel" key={road.road_id} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}>
      <div className="panel-kicker">Traffic Intelligence</div>
      <h2>{road.road_id} <span>{road.source_intersection} to {road.destination_intersection}</span></h2>
      <div className={`signal-badge ${road.signal_state.toLowerCase()}`}>{road.signal_state}</div>
      <div className="stat-list">
        <label>Vehicle Count <b>{road.vehicle_count.toFixed(0)}</b></label>
        <label>Queue Length <b>{road.queue_length.toFixed(0)}</b></label>
        <label>Waiting Time <b>{road.waiting_time.toFixed(0)}s</b></label>
        <label>Average Speed <b>{road.average_speed.toFixed(1)} km/h</b></label>
        <label>Capacity <b>{road.capacity}</b></label>
        <label>Congestion <b>{road.congestion_level} {road.congestion_score.toFixed(2)}</b></label>
        <label>Predicted Demand <b>{road.predicted_vehicle_count.toFixed(0)}</b></label>
        <label>Recommended Green <b>{road.green_time}s</b></label>
        <label>Fairness <b>{road.fairness_active ? 'ACTIVE' : 'Normal'}</b></label>
      </div>
      <div className="priority-stack">
        {Object.entries(road.priority_components).map(([key, value]) => (
          <div key={key}>
            <span>{key}</span>
            <i><em style={{ width: `${Math.min(100, Math.max(3, value * 100))}%` }} /></i>
            <b>{value.toFixed(2)}</b>
          </div>
        ))}
      </div>
      <div className="why">
        <h3>Why This Decision?</h3>
        {decision?.explanation.map((line, index) => (
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
        <h2>What-If Simulation</h2>
        <p>Change traffic pressure and watch signals, queues, prediction, and priority respond.</p>
      </div>
      <div className="whatif-grid">
        {roads.slice(0, 6).map((road) => (
          <div className="whatif-row" key={road.road_id}>
            <span>{road.road_id}</span>
            <button onClick={() => onAdjust(road.road_id, -10)} aria-label={`Reduce traffic on ${road.road_id}`}>-</button>
            <button onClick={() => onAdjust(road.road_id, 20)} aria-label={`Increase traffic on ${road.road_id}`}>+</button>
            <button className="emergency-trigger" onClick={() => onEmergency(road.road_id)}>Emergency</button>
          </div>
        ))}
      </div>
      <button className="experiment-button" onClick={onExperiment}>Run Fixed vs Adaptive Experiment</button>
    </section>
  );
}

