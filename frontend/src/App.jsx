import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { useCrowdFlow } from './hooks/useCrowdFlow.js';
import { TopBar } from './components/TopBar.jsx';
import { NetworkMap } from './components/NetworkMap.jsx';
import { IntelligencePanel, MetricsGrid, WhatIfPanel } from './components/Panels.jsx';
import { LiveCharts } from './components/Charts.jsx';
import { Activity, BarChart3, Brain, FlaskConical, GitBranch, LayoutDashboard, Route, ScrollText, Settings, Siren } from 'lucide-react';

function Sidebar({ status, activeView, setActiveView }) {
  const items = [
    ['dashboard', LayoutDashboard, 'Dashboard'],
    ['network', Route, 'Live Network'],
    ['prediction', Brain, 'AI Prediction'],
    ['optimizer', GitBranch, 'Signal Optimizer'],
    ['emergency', Siren, 'Emergency Control'],
    ['whatif', FlaskConical, 'What-If Simulator'],
    ['evaluation', BarChart3, 'Fixed vs Adaptive'],
    ['logs', ScrollText, 'Decision Logs'],
    ['settings', Settings, 'Settings'],
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
        {items.map(([id, Icon, label]) => (
          <button className={activeView === id ? 'active' : ''} key={id} onClick={() => setActiveView(id)}>
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-state">
        <p><i className={status?.running ? 'green' : ''} /> {status?.running ? 'Simulation Running' : 'Simulation Paused'}</p>
        <p><i className="cyan" /> {status?.mode === 'ADAPTIVE' ? 'Adaptive Mode' : 'Fixed Mode'}</p>
      </div>
    </aside>
  );
}

function ViewHeader({ title, subtitle }) {
  return (
    <div className="view-header">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
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

const guideItems = [
  ['Fixed timing', 'Runs signals on a preset cycle. It is the baseline used for comparison.'],
  ['Adaptive timing', 'CrowdFlow changes green time using queue, wait, prediction, fairness, and emergency priority.'],
  ['Start live', 'Begins the live traffic simulation so vehicles, queues, and metrics keep changing.'],
  ['Pause', 'Freezes the current state for explanation or judging questions.'],
  ['Reset', 'Returns all roads to the clean starting scenario.'],
  ['Guided demo', 'Auto-runs a judge-friendly story: fixed mode, congestion, adaptive recovery, emergency, and comparison.'],
  ['What-If', 'Adds/removes traffic or creates an ambulance event on selected roads.'],
  ['Fixed vs Adaptive', 'Runs both approaches on the same rush-hour scenario and charts the result.'],
  ['Decision Logs', 'Shows why the optimizer selected or held each road.'],
];

function PrototypeGuide({ compact = false }) {
  const visibleItems = compact ? guideItems.slice(0, 6) : guideItems;
  return (
    <section className="guide-panel">
      <div className="section-title">
        <h2>Prototype Guide</h2>
        <p>Quick meaning of every main option</p>
      </div>
      <div className="guide-grid">
        {visibleItems.map(([title, detail]) => (
          <div key={title}>
            <b>{title}</b>
            <span>{detail}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function RoadTable({ roads, onSelect }) {
  return (
    <div className="road-table">
      {roads.map((road) => (
        <button key={road.road_id} onClick={() => onSelect(road.road_id)}>
          <b>{road.road_id}</b>
          <span>{road.source_intersection} to {road.destination_intersection}</span>
          <em className={road.congestion_level.toLowerCase()}>{road.congestion_level}</em>
          <strong>{road.vehicle_count.toFixed(0)} vehicles</strong>
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const crowd = useCrowdFlow();
  const [selectedRoad, setSelectedRoad] = useState('R2');
  const [activeView, setActiveView] = useState('dashboard');
  const state = crowd.state;

  useEffect(() => {
    if (!state?.roads?.some((road) => road.road_id === selectedRoad)) {
      setSelectedRoad(state?.roads?.[0]?.road_id || 'R1');
    }
  }, [state, selectedRoad]);

  const selected = useMemo(() => state?.roads.find((road) => road.road_id === selectedRoad), [state, selectedRoad]);
  const decision = useMemo(() => state?.decisions.find((item) => item.road_id === selectedRoad), [state, selectedRoad]);
  const topRoads = useMemo(() => [...(state?.roads || [])].sort((a, b) => b.priority_score - a.priority_score).slice(0, 5), [state]);
  const highCongestion = useMemo(() => (state?.roads || []).filter((road) => road.congestion_level === 'HIGH'), [state]);

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

  const views = {
    dashboard: (
      <>
        <MetricsGrid metrics={state.metrics} status={state.status} />
        <PrototypeGuide compact />
        <motion.div className="dashboard-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <NetworkMap state={state} selectedRoad={selectedRoad} setSelectedRoad={setSelectedRoad} />
          <IntelligencePanel road={selected} decision={decision} />
        </motion.div>
      </>
    ),
    network: (
      <>
        <ViewHeader title="Live Network" subtitle="Rectangular road grid with live vehicles, signals, queues, and road selection." />
        <motion.div className="dashboard-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <NetworkMap state={state} selectedRoad={selectedRoad} setSelectedRoad={setSelectedRoad} />
          <IntelligencePanel road={selected} decision={decision} />
        </motion.div>
        <RoadTable roads={state.roads} onSelect={setSelectedRoad} />
      </>
    ),
    prediction: (
      <section className="page-panel">
        <ViewHeader title="AI Prediction" subtitle={`Prediction source: ${state.status.prediction_source}. Higher predicted demand increases priority.`} />
        <div className="insight-grid">
          {state.roads.map((road) => (
            <button className="insight-card" key={road.road_id} onClick={() => { setSelectedRoad(road.road_id); setActiveView('network'); }}>
              <span>{road.road_id}</span>
              <strong>{road.predicted_vehicle_count.toFixed(0)} predicted vehicles</strong>
              <p>{road.congestion_level} congestion now, {road.queue_length.toFixed(0)} queued.</p>
            </button>
          ))}
        </div>
      </section>
    ),
    optimizer: (
      <section className="page-panel">
        <ViewHeader title="Signal Optimizer" subtitle="Roads are ranked by priority, then green time is assigned within safe limits." />
        <div className="decision-list">
          {topRoads.map((road) => (
            <button className="decision-card" key={road.road_id} onClick={() => { setSelectedRoad(road.road_id); setActiveView('network'); }}>
              <b>{road.road_id}</b>
              <span>Priority {road.priority_score.toFixed(2)}</span>
              <span>Green {road.green_time}s</span>
              <em>{road.signal_state}</em>
            </button>
          ))}
        </div>
        <button className="experiment-button" onClick={crowd.tick}>Run one optimizer tick</button>
      </section>
    ),
    emergency: (
      <section className="page-panel">
        <ViewHeader title="Emergency Control" subtitle="Trigger an ambulance route and watch safe transition to emergency green." />
        <div className="emergency-grid">
          {state.roads.slice(0, 6).map((road) => (
            <button key={road.road_id} onClick={() => { setSelectedRoad(road.road_id); crowd.triggerEmergency(road.road_id); }}>
              <b>Ambulance on {road.road_id}</b>
              <span>{road.source_intersection} to {road.destination_intersection}</span>
            </button>
          ))}
        </div>
        <IntelligencePanel road={selected} decision={decision} />
      </section>
    ),
    whatif: (
      <>
        <ViewHeader title="What-If Simulator" subtitle="Add or reduce traffic on key roads and see the optimizer respond." />
        <WhatIfPanel roads={state.roads} onAdjust={crowd.adjustTraffic} onEmergency={crowd.triggerEmergency} onExperiment={crowd.runExperiment} />
        <RoadTable roads={state.roads.slice(0, 8)} onSelect={setSelectedRoad} />
      </>
    ),
    evaluation: (
      <section className="details-section standalone">
        <div className="section-title">
          <h2>Fixed vs Adaptive</h2>
          <p>Run both modes on the same simulated rush-hour scenario.</p>
        </div>
        <button className="experiment-button" onClick={crowd.runExperiment}>Run comparison</button>
        <LiveCharts history={state.history} comparison={crowd.comparison} />
      </section>
    ),
    logs: (
      <section className="page-panel">
        <ViewHeader title="Decision Logs" subtitle="Latest explainable optimizer decisions from live simulation state." />
        <div className="log-list">
          {state.decisions.slice(0, 8).map((item) => (
            <button key={item.road_id} onClick={() => { setSelectedRoad(item.road_id); setActiveView('network'); }}>
              <b>{item.road_id}</b>
              <span>{item.explanation[0]}</span>
            </button>
          ))}
        </div>
      </section>
    ),
    settings: (
      <section className="page-panel">
        <ViewHeader title="Settings" subtitle="Presentation-safe controls for the Round 3 demo." />
        <div className="settings-grid">
          <button onClick={() => crowd.setMode('FIXED')}>
            <b>Use fixed timing</b>
            <span>Normal signal cycle. Best for showing the baseline problem.</span>
          </button>
          <button onClick={() => crowd.setMode('ADAPTIVE')}>
            <b>Use adaptive timing</b>
            <span>AI priority changes green time based on live road pressure.</span>
          </button>
          <button onClick={crowd.start}>
            <b>Start simulation</b>
            <span>Traffic begins moving and metrics update automatically.</span>
          </button>
          <button onClick={crowd.stop}>
            <b>Pause simulation</b>
            <span>Freezes the network so you can explain the current decision.</span>
          </button>
          <button onClick={crowd.reset}>
            <b>Reset clean scenario</b>
            <span>Clears experiments and returns to the starting traffic state.</span>
          </button>
          <button onClick={runDemo}>
            <b>Run guided demo</b>
            <span>Shows congestion, adaptive recovery, emergency control, and comparison.</span>
          </button>
        </div>
        <PrototypeGuide />
        <div className="system-note">
          <b>System status</b>
          <p>{state.status.provider} provider, {state.status.prediction_source} prediction, {highCongestion.length} highly congested roads.</p>
        </div>
      </section>
    ),
  };

  return (
    <main className="app-frame">
      <Sidebar status={state.status} activeView={activeView} setActiveView={setActiveView} />
      <section className="app-shell" id="dashboard">
        <TopBar status={state.status} onStart={crowd.start} onStop={crowd.stop} onReset={crowd.reset} onDemo={runDemo} onMode={crowd.setMode} />
        {crowd.error ? <div className="inline-error">{crowd.error}</div> : null}
        {views[activeView]}
        {activeView === 'dashboard' ? (
          <section className="details-section">
            <div className="section-title">
              <h2>Performance Metrics</h2>
              <p>Simulation Result - live dashboard history</p>
            </div>
            <LiveCharts history={state.history} comparison={crowd.comparison} />
            <ProblemResponse />
          </section>
        ) : null}
      </section>
    </main>
  );
}
