import { motion } from 'framer-motion';

const vehicleTypes = ['car', 'bus', 'truck', 'bike'];

function roadPath(road, points) {
  const a = points[road.source_intersection];
  const b = points[road.destination_intersection];
  const routePoints = [{ x: a.x, y: a.y }];
  if (a.x !== b.x && a.y !== b.y) {
    routePoints.push({ x: a.x, y: b.y });
  }
  routePoints.push({ x: b.x, y: b.y });
  const d = routePoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, points: routePoints, d };
}

function vehiclePosition(road, path, index, total) {
  const green = ['GREEN', 'EMERGENCY_GREEN'].includes(road.signal_state);
  const yellow = road.signal_state === 'YELLOW';
  const limit = green ? 0.96 : yellow ? 0.78 : 0.68;
  const queueFactor = Math.min(0.25, road.queue_length / 180);
  const base = ((Date.now() / (4200 - Math.min(2400, road.average_speed * 35)) + index / Math.max(total, 1)) % 1);
  const progress = green ? base : Math.min(limit - index * 0.035, limit - queueFactor);
  const clamped = Math.max(0.08, Math.min(0.96, progress));
  return pointOnPath(path.points, clamped);
}

function pointOnPath(points, progress) {
  const segments = [];
  let totalLength = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    segments.push({ start, end, length });
    totalLength += length;
  }
  let remaining = progress * totalLength;
  for (const segment of segments) {
    if (remaining <= segment.length || segment === segments[segments.length - 1]) {
      const segmentProgress = segment.length === 0 ? 0 : remaining / segment.length;
      return {
        x: segment.start.x + (segment.end.x - segment.start.x) * segmentProgress,
        y: segment.start.y + (segment.end.y - segment.start.y) * segmentProgress,
        angle: Math.atan2(segment.end.y - segment.start.y, segment.end.x - segment.start.x) * (180 / Math.PI),
      };
    }
    remaining -= segment.length;
  }
  return { ...points[0], angle: 0 };
}

function RoadVehicles({ road, path }) {
  const count = Math.max(2, Math.min(8, Math.round(road.vehicle_count / 13)));
  return Array.from({ length: count }).map((_, index) => {
    const pos = vehiclePosition(road, path, index, count);
    const type = road.emergency_status && index === 0 ? 'ambulance' : vehicleTypes[index % vehicleTypes.length];
    return (
      <g
        key={`${road.road_id}-${index}-${road.signal_state}`}
        transform={`translate(${pos.x} ${pos.y})`}
        opacity="1"
      >
        <g className={`vehicle-svg ${type}`} transform={`rotate(${pos.angle})`}>
          <rect x="-2.2" y="-1.15" width={type === 'bike' ? 3.2 : 4.4} height={type === 'bus' ? 2.6 : 2.3} rx=".65" />
          {type === 'ambulance' ? <text x="0" y=".72">+</text> : null}
          {type !== 'bike' ? (
            <>
              <circle cx="-1.35" cy="1.25" r=".34" />
              <circle cx="1.35" cy="1.25" r=".34" />
            </>
          ) : (
            <>
              <circle cx="-1" cy=".95" r=".42" />
              <circle cx="1" cy=".95" r=".42" />
              <line x1="-1" y1=".25" x2=".3" y2="-.8" />
            </>
          )}
        </g>
      </g>
    );
  });
}

export function NetworkMap({ state, selectedRoad, setSelectedRoad }) {
  const points = Object.fromEntries(state.intersections.map((item) => [item.intersection_id, item]));
  return (
    <motion.section className="network-shell" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
      <div className="map-header">
        <div>
          <h2>Network Overview</h2>
          <p>6 intersections - CrowdFlow Adaptive {state.status.running ? 'Running' : 'Paused'}</p>
        </div>
        <span className="map-status">{state.status.running ? 'running' : 'paused'}</span>
        <div className="map-legend" aria-label="Map legend">
          <span><i className="legend-low" /> Moving</span>
          <span><i className="legend-medium" /> Busy</span>
          <span><i className="legend-high" /> Jammed</span>
          <span><i className="legend-emergency" /> Emergency</span>
        </div>
      </div>
      <svg viewBox="0 0 100 86" className="network-map" role="img" aria-label="Animated connected traffic network">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {state.roads.map((road) => {
          const path = roadPath(road, points);
          const emergency = state.emergency_route.includes(road.road_id);
          const labelPoint = pointOnPath(path.points, 0.5);
          return (
            <g key={road.road_id} className={`road-layer ${selectedRoad === road.road_id ? 'selected' : ''}`} onClick={() => setSelectedRoad(road.road_id)}>
              <path className="road-shadow" d={path.d} />
              <path className={`road-line ${road.congestion_level.toLowerCase()} ${emergency ? 'emergency-route' : ''}`} d={path.d} />
              <text className="road-label" x={labelPoint.x} y={labelPoint.y - 2}>{road.road_id}</text>
              {selectedRoad === road.road_id ? <text className="road-status-label" x={labelPoint.x} y={labelPoint.y + 4}>{road.signal_state.replace('_', ' ')}</text> : null}
              <RoadVehicles road={road} path={path} />
            </g>
          );
        })}
        {state.intersections.map((intersection) => {
          const connected = state.roads.filter((road) => road.source_intersection === intersection.intersection_id || road.destination_intersection === intersection.intersection_id);
          const worst = connected.reduce((max, road) => Math.max(max, road.congestion_score), 0);
          const activeSignal = connected.find((road) => ['GREEN', 'EMERGENCY_GREEN', 'YELLOW', 'ALL_RED'].includes(road.signal_state))?.signal_state || 'RED';
          return (
            <g key={intersection.intersection_id} className="intersection" onClick={() => setSelectedRoad(connected[0]?.road_id || selectedRoad)}>
              <motion.circle
                cx={intersection.x}
                cy={intersection.y}
                r={worst > 0.62 ? 4.6 : 3.8}
                className={`node ${worst > 0.62 ? 'hot' : worst > 0.35 ? 'warm' : 'cool'}`}
                animate={{ scale: worst > 0.62 ? [1, 1.16, 1] : 1 }}
                transition={{ duration: 1.8, repeat: worst > 0.62 ? Infinity : 0 }}
              />
              <circle cx={intersection.x + 4.4} cy={intersection.y - 4.1} r="1.8" className={`signal ${activeSignal.toLowerCase()}`} />
              <text className="node-label" x={intersection.x} y={intersection.y + 8}>{intersection.intersection_id}</text>
            </g>
          );
        })}
      </svg>
    </motion.section>
  );
}
