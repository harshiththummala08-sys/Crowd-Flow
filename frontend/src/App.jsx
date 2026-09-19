import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { useCrowdFlow } from './hooks/useCrowdFlow.js';
import { TopBar } from './components/TopBar.jsx';
import { NetworkMap } from './components/NetworkMap.jsx';
import { IntelligencePanel, MetricsGrid, WhatIfPanel } from './components/Panels.jsx';
import { LiveCharts } from './components/Charts.jsx';
import { Activity, BarChart3, Brain, FlaskConical, GitBranch, LayoutDashboard, Route, ScrollText, Settings, Siren } from 'lucide-react';

function Sidebar({ status }) {
  const items = [
    [LayoutDashboard, 'Dashboard', true],
    [Route, 'Live Network'],
    [Brain, 'AI Prediction'],
    [GitBranch, 'Signal Optimizer'],
    [Siren, 'Emergency Control'],
    [FlaskConical, 'What-If Simulator'],
    [BarChart3, 'Fixed vs Adaptive'],
    [ScrollText, 'Decision Logs'],
    [Settings, 'Settings'],
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="logo-mark"><Activity size={25} /></div>
        <div>
          <h1>CrowdFlow</h1>
          <span>Traffic Optimizer</span>
        </div>
      </div>
      <nav>
        {items.map(([Icon, label, active]) => (
          <a className={active ? 'active' : ''} href="#dashboard" key={label}>
            <Icon size={18} />
            <span>{label}</span>
          </a>
        ))}
      </nav>
      <div className="sidebar-state">
        <p><i className={status?.running ? 'green' : ''} /> {status?.running ? 'Simulation Running' : 'Simulation Paused'}</p>
        <p><i className="cyan" /> {status?.mode === 'ADAPTIVE' ? 'Adaptive Mode' : 'Fixed Mode'}</p>
      </div>
    </aside>
  );
}

function ControlGuide({ mode }) {
  return (
    <section className="control-guide">
      <div>
        <b>Fixed</b>
        <span>Every signal gets normal timing. Easy, but it can ignore real traffic.</span>
      </div>
      <div>
        <b>Adaptive</b>
        <span>CrowdFlow gives more green time where queues and waiting are high.</span>
      </div>
      <div>
        <b>Start / Pause</b>
        <span>Run or freeze the live traffic simulation.</span>
      </div>
      <div>
        <b>Guided demo</b>
        <span>Automatically shows congestion, adaptive control, fairness, and ambulance priority.</span>
      </div>
      <strong>{mode === 'ADAPTIVE' ? 'Current mode: CrowdFlow is deciding signal timing.' : 'Current mode: fixed signal timing is being used.'}</strong>
    </section>
  );
}

function ProblemResponse() {
  const pairs = [
    ['Fixed timing', 'Dynamic Green Time'],
    ['Reactive control', 'Traffic Prediction'],
    ['Junction isolation', 'Network Coordination'],
    ['No fairness', 'Anti-Starvation'],
    ['Emergency challenge', 'Safety-Aware Transition'],
    ['Black-box decisions', 'Explainability'],
  ];
  return (
    <section className="problem-response">
      {pairs.map(([problem, response]) => (
        <div key={problem}><span>{problem}</span><b>{response}</b></div>
      ))}
    </section>
  );
}

export default function App() {
  const crowd = useCrowdFlow();
  const [selectedRoad, setSelectedRoad] = useState('R2');
  const state = crowd.state;

  useEffect(() => {
    if (!state?.roads?.some((road) => road.road_id === selectedRoad)) {
      setSelectedRoad(state?.roads?.[0]?.road_id || 'R1');
    }
  }, [state, selectedRoad]);

  const selected = useMemo(() => state?.roads.find((road) => road.road_id === selectedRoad), [state, selectedRoad]);
  const decision = useMemo(() => state?.decisions.find((item) => item.road_id === selectedRoad), [state, selectedRoad]);

  async function runDemo() {
    await crowd.reset();
    await crowd.start();
    await crowd.setMode('FIXED');
    setSelectedRoad('R2');
    window.setTimeout(() => crowd.adjustTraffic('R2', 45), 1200);
    window.setTimeout(() => crowd.adjustTraffic('R2', 35), 2600);
    window.setTimeout(() => crowd.setMode('ADAPTIVE'), 4300);
    window.setTimeout(() => crowd.adjustTraffic('R3', 30), 5900);
    window.setTimeout(() => crowd.adjustTraffic('R3', 30), 7200);
    window.setTimeout(() => crowd.triggerEmergency('R4'), 9000);
    window.setTimeout(() => setSelectedRoad('R4'), 9400);
    window.setTimeout(() => crowd.runExperiment(), 12500);
  }

  if (crowd.error && !state) {
    return (
      <main className="boot-screen">
        <AlertCircle />
        <h1>CrowdFlow backend unavailable</h1>
        <p>Start FastAPI on http://127.0.0.1:8000, then retry.</p>
        <button onClick={crowd.refresh}>Retry</button>
      </main>
    );
  }

  if (!state) {
    return <main className="boot-screen"><div className="loader" /><h1>Starting CrowdFlow command center</h1></main>;
  }

  return (
    <main className="app-frame">
      <Sidebar status={state.status} />
      <section className="app-shell" id="dashboard">
        <TopBar status={state.status} onStart={crowd.start} onStop={crowd.stop} onReset={crowd.reset} onDemo={runDemo} onMode={crowd.setMode} />
        {crowd.error ? <div className="inline-error">{crowd.error}</div> : null}
        <MetricsGrid metrics={state.metrics} status={state.status} />
        <motion.div className="dashboard-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <NetworkMap state={state} selectedRoad={selectedRoad} setSelectedRoad={setSelectedRoad} />
          <IntelligencePanel road={selected} decision={decision} />
        </motion.div>
        <WhatIfPanel roads={state.roads} onAdjust={crowd.adjustTraffic} onEmergency={crowd.triggerEmergency} onExperiment={crowd.runExperiment} />
        <section className="details-section">
          <div className="section-title">
            <h2>Performance Metrics</h2>
            <p>Simulation Result - live dashboard history</p>
          </div>
          <LiveCharts history={state.history} comparison={crowd.comparison} />
          <ProblemResponse />
        </section>
      </section>
    </main>
  );
}
