import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';

export function useCrowdFlow() {
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [comparison, setComparison] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setState(await api.network());
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 1200);
    return () => window.clearInterval(id);
  }, [refresh]);

  const action = async (fn) => {
    try {
      const next = await fn();
      setState(next.roads ? next : await api.network());
      setError('');
      return next;
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  return {
    state,
    error,
    comparison,
    start: () => action(api.start),
    stop: () => action(api.stop),
    reset: () => action(api.reset),
    tick: () => action(api.tick),
    setMode: (mode) => action(() => api.mode(mode)),
    adjustTraffic: (road, delta) => action(() => api.traffic(road, delta)),
    triggerEmergency: (road) => action(() => api.emergency(road)),
    runExperiment: async () => {
      const result = await action(api.experiment);
      setComparison(result);
    },
    refresh,
  };
}

