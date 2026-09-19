import { mockApi } from './mockApi';

const configuredApiBase = import.meta.env.VITE_API_BASE;
const localApiInProduction = !import.meta.env.DEV && /127\.0\.0\.1|localhost/.test(configuredApiBase || '');
const API_BASE = localApiInProduction ? '' : configuredApiBase || (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');
const USE_MOCK_API = !API_BASE;

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
  network: () => (USE_MOCK_API ? mockApi.network() : request('/api/network')),
  start: () => (USE_MOCK_API ? mockApi.start() : request('/api/simulation/start', { method: 'POST' })),
  stop: () => (USE_MOCK_API ? mockApi.stop() : request('/api/simulation/stop', { method: 'POST' })),
  reset: () => (USE_MOCK_API ? mockApi.reset() : request('/api/simulation/reset', { method: 'POST' })),
  tick: () => (USE_MOCK_API ? mockApi.tick() : request('/api/simulation/tick', { method: 'POST' })),
  mode: (mode) => (USE_MOCK_API ? mockApi.mode(mode) : request('/api/simulation/mode', { method: 'POST', body: JSON.stringify({ mode }) })),
  traffic: (road_id, delta) => (USE_MOCK_API ? mockApi.traffic(road_id, delta) : request('/api/simulation/traffic', { method: 'POST', body: JSON.stringify({ road_id, delta }) })),
  emergency: (road_id) => (USE_MOCK_API ? mockApi.emergency(road_id) : request('/api/emergency', { method: 'POST', body: JSON.stringify({ road_id }) })),
  experiment: () => (USE_MOCK_API ? mockApi.experiment() : request('/api/experiments/run', { method: 'POST', body: JSON.stringify({ duration_ticks: 42, scenario: 'rush_hour' }) })),
};
