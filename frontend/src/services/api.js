const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`CrowdFlow API error: ${response.status}`);
  }
  return response.json();
}

export const api = {
  network: () => request('/api/network'),
  start: () => request('/api/simulation/start', { method: 'POST' }),
  stop: () => request('/api/simulation/stop', { method: 'POST' }),
  reset: () => request('/api/simulation/reset', { method: 'POST' }),
  tick: () => request('/api/simulation/tick', { method: 'POST' }),
  mode: (mode) => request('/api/simulation/mode', { method: 'POST', body: JSON.stringify({ mode }) }),
  traffic: (road_id, delta) => request('/api/simulation/traffic', { method: 'POST', body: JSON.stringify({ road_id, delta }) }),
  emergency: (road_id) => request('/api/emergency', { method: 'POST', body: JSON.stringify({ road_id }) }),
  experiment: () => request('/api/experiments/run', { method: 'POST', body: JSON.stringify({ duration_ticks: 42, scenario: 'rush_hour' }) }),
};

