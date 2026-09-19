const TICK_SECONDS = 3;
const MIN_GREEN = 18;
const MAX_GREEN = 60;

const initialRoads = [
  ['R1', 'I1', 'I2', 32, 7, 28, 35, 80],
  ['R2', 'I2', 'I3', 46, 13, 42, 27, 85],
  ['R3', 'I4', 'I5', 35, 10, 35, 30, 75],
  ['R4', 'I5', 'I6', 28, 5, 24, 38, 70],
  ['R5', 'I1', 'I4', 22, 4, 19, 41, 65],
  ['R6', 'I2', 'I5', 52, 18, 54, 22, 80],
  ['R7', 'I3', 'I6', 31, 8, 30, 32, 70],
  ['R8', 'I2', 'I4', 20, 5, 22, 37, 60],
  ['R9', 'I3', 'I5', 25, 6, 26, 34, 65],
  ['R10', 'I4', 'I2', 29, 9, 33, 31, 70],
  ['R11', 'I5', 'I2', 34, 11, 37, 29, 70],
  ['R12', 'I6', 'I3', 19, 4, 18, 42, 60],
];

const intersectionSeed = [
  ['I1', 18, 22],
  ['I2', 50, 22],
  ['I3', 82, 22],
  ['I4', 18, 66],
  ['I5', 50, 66],
  ['I6', 82, 66],
];

function clamp(value, low = 0, high = 1) {
  return Math.max(low, Math.min(high, value));
}

function round(value, places = 1) {
  return Number(value.toFixed(places));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeRoad([road_id, source_intersection, destination_intersection, vehicle_count, queue_length, waiting_time, average_speed, capacity]) {
  return {
    road_id,
    source_intersection,
    destination_intersection,
    vehicle_count,
    queue_length,
    waiting_time,
    average_speed,
    capacity,
    predicted_vehicle_count: 0,
    congestion_score: 0,
    congestion_level: 'LOW',
    green_time: 30,
    signal_state: 'RED',
    emergency_status: false,
    waiting_since: 0,
    priority_score: 0,
    fairness_active: false,
    downstream_penalty: 0,
    priority_components: {},
  };
}

function buildIntersections(roads) {
  const intersections = intersectionSeed.map(([intersection_id, x, y]) => ({
    intersection_id,
    x,
    y,
    connected_roads: [],
    current_phase: 'normal',
    phase_time_remaining: 30,
  }));
  const byId = Object.fromEntries(intersections.map((item) => [item.intersection_id, item]));
  roads.forEach((road) => {
    byId[road.source_intersection].connected_roads.push(road.road_id);
    byId[road.destination_intersection].connected_roads.push(road.road_id);
  });
  return intersections;
}

function classify(score) {
  if (score < 0.3) return 'LOW';
  if (score < 0.6) return 'MEDIUM';
  return 'HIGH';
}

function predict(road, index) {
  const pulse = 6 * Math.sin((engine.tickIndex + index + 1) / 4);
  const queuePressure = road.queue_length * 0.65;
  return round(clamp(road.vehicle_count + queuePressure + pulse + 12, 0, road.capacity * 1.4), 1);
}

function updateCongestion(road) {
  const density = clamp(road.vehicle_count / road.capacity);
  const queue = clamp(road.queue_length / Math.max(road.capacity * 0.45, 1));
  const waiting = clamp(road.waiting_time / 150);
  const speedFactor = clamp(1 - road.average_speed / 50);
  const prediction = clamp(road.predicted_vehicle_count / road.capacity);
  const score = clamp(0.3 * density + 0.25 * queue + 0.2 * waiting + 0.15 * speedFactor + 0.1 * prediction);
  road.congestion_score = round(score, 3);
  road.congestion_level = classify(score);
}

function priorityScore(road) {
  const waiting = clamp(road.waiting_time / 140);
  const prediction = clamp(road.predicted_vehicle_count / Math.max(road.capacity, 1));
  const fairness = road.waiting_time > 95 ? 0.16 : 0;
  const emergency = road.emergency_status ? 1 : 0;
  const score = 0.4 * road.congestion_score + 0.24 * waiting + 0.18 * prediction + fairness + 0.55 * emergency - road.downstream_penalty;
  road.fairness_active = fairness > 0;
  road.priority_score = round(clamp(score, 0, 1.5), 3);
  road.priority_components = {
    congestion: round(road.congestion_score, 2),
    waiting: round(waiting, 2),
    prediction: round(prediction, 2),
    fairness: round(fairness, 2),
    emergency: round(emergency, 2),
    downstream_penalty: round(road.downstream_penalty, 2),
  };
}

function recommendedGreen(priority) {
  return Math.round(MIN_GREEN + (MAX_GREEN - MIN_GREEN) * Math.min(priority, 1));
}

function chooseGreenRoad(roads) {
  if (engine.mode === 'FIXED') {
    return roads[ Math.floor(engine.tickIndex / 10) % Math.min(6, roads.length) ].road_id;
  }
  return roads.reduce((best, road) => (road.priority_score > best.priority_score ? road : best), roads[0]).road_id;
}

function explainDecision(road, selectedRoad) {
  const lines = [
    road.road_id === selectedRoad
      ? `${road.road_id} is receiving GREEN because its priority score is ${road.priority_score.toFixed(2)}.`
      : `${road.road_id} is being held while ${selectedRoad} receives the active phase.`,
    road.congestion_level === 'HIGH'
      ? `Congestion is HIGH with ${road.vehicle_count.toFixed(0)} vehicles and ${road.queue_length.toFixed(0)} queued.`
      : road.congestion_level === 'MEDIUM'
        ? 'Congestion is MEDIUM, so the optimizer keeps monitoring the approach.'
        : 'Congestion is LOW and does not need extended green time yet.',
    road.emergency_status
      ? 'Emergency vehicle detected, so this road receives safe priority.'
      : `Predicted demand is ${road.predicted_vehicle_count.toFixed(0)} vehicles using the browser demo predictor.`,
  ];

  return {
    road_id: road.road_id,
    selected_road: selectedRoad,
    mode: engine.mode,
    recommended_green_time: road.green_time,
    explanation: lines,
    priority_components: road.priority_components,
    fairness_status: road.fairness_active ? 'Active' : 'Normal',
    emergency_status: road.emergency_status ? 'Active' : 'None',
  };
}

function recalculate() {
  engine.roads.forEach((road, index) => {
    road.predicted_vehicle_count = predict(road, index);
    updateCongestion(road);
  });

  const destinationScores = {};
  engine.roads.forEach((road) => {
    destinationScores[road.destination_intersection] ||= [];
    destinationScores[road.destination_intersection].push(road.congestion_score);
  });
  engine.roads.forEach((road) => {
    const values = destinationScores[road.destination_intersection] || [0];
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    road.downstream_penalty = round(Math.max(0, avg - 0.62) * 0.18, 3);
    priorityScore(road);
  });

  const selected = engine.emergencyRoad || chooseGreenRoad(engine.roads);
  engine.selectedRoad = selected;
  engine.roads.forEach((road) => {
    road.green_time = engine.mode === 'FIXED' ? 30 : recommendedGreen(road.priority_score);
    road.signal_state = road.road_id === selected ? (road.emergency_status ? 'EMERGENCY_GREEN' : 'GREEN') : 'RED';
  });
  engine.decisions = engine.roads.map((road) => explainDecision(road, selected));
}

function metrics(roads = engine.roads) {
  const sum = (key) => roads.reduce((total, road) => total + road[key], 0);
  return {
    vehicles: round(sum('vehicle_count')),
    average_waiting_time: round(sum('waiting_time') / roads.length),
    average_queue_length: round(sum('queue_length') / roads.length),
    average_speed: round(sum('average_speed') / roads.length),
    congestion_score: round(sum('congestion_score') / roads.length, 3),
    throughput: round(engine.throughput),
    maximum_waiting_time: round(Math.max(...roads.map((road) => road.waiting_time))),
    emergency_status: engine.emergencyRoad ? 'ACTIVE' : 'CLEAR',
  };
}

function step() {
  engine.tickIndex += 1;
  engine.simulationTime += TICK_SECONDS;
  let throughput = 0;

  engine.roads.forEach((road, index) => {
    const arrival = 2.2 + 1.1 * Math.sin((engine.tickIndex + index * 3) / 7) + (['R2', 'R6'].includes(road.road_id) ? 0.7 : 0);
    const isGreen = ['GREEN', 'EMERGENCY_GREEN'].includes(road.signal_state);
    const departures = Math.min(road.queue_length + road.vehicle_count * 0.08, isGreen ? 6.2 : 0.35);
    throughput += departures;
    road.vehicle_count = clamp(road.vehicle_count + arrival - departures, 0, road.capacity * 1.35);
    if (isGreen) {
      road.queue_length = clamp(road.queue_length + arrival * 0.15 - departures * 0.85, 0, road.capacity);
      road.waiting_time = clamp(road.waiting_time - 7 + road.queue_length * 0.06, 0, 220);
      road.average_speed = clamp(road.average_speed + 3.2, 4, 50);
    } else {
      road.queue_length = clamp(road.queue_length + arrival * 0.88, 0, road.capacity);
      road.waiting_time = clamp(road.waiting_time + 3.4 + road.queue_length * 0.055, 0, 220);
      road.average_speed = clamp(road.average_speed - 2.5, 4, 50);
    }
    road.vehicle_count = round(road.vehicle_count);
    road.queue_length = round(road.queue_length);
    road.waiting_time = round(road.waiting_time);
    road.average_speed = round(road.average_speed);
  });

  engine.throughput = throughput;
  recalculate();
  engine.history.push({ time: engine.simulationTime, ...metrics() });
  engine.history = engine.history.slice(-80);
}

function state() {
  if (engine.running) step();
  return clone({
    roads: engine.roads,
    intersections: engine.intersections,
    metrics: metrics(),
    decisions: engine.decisions,
    status: {
      running: engine.running,
      mode: engine.mode,
      simulation_time: engine.simulationTime,
      prediction_source: 'BROWSER_DEMO',
      provider: 'static-pages',
    },
    history: engine.history,
    emergency_route: engine.emergencyRoad ? [engine.emergencyRoad] : [],
  });
}

function resetEngine() {
  engine.roads = initialRoads.map(makeRoad);
  engine.intersections = buildIntersections(engine.roads);
  engine.mode = 'ADAPTIVE';
  engine.running = false;
  engine.simulationTime = 0;
  engine.tickIndex = 0;
  engine.throughput = 0;
  engine.history = [];
  engine.emergencyRoad = '';
  recalculate();
}

function runComparison() {
  const saved = clone(engine);
  const results = {};
  ['FIXED', 'ADAPTIVE'].forEach((mode) => {
    resetEngine();
    engine.mode = mode;
    ['R2', 'R6', 'R10'].forEach((roadId) => {
      const road = engine.roads.find((item) => item.road_id === roadId);
      road.vehicle_count += 18;
      road.queue_length += 12;
      road.waiting_time += 30;
    });
    recalculate();
    for (let index = 0; index < 42; index += 1) step();
    results[mode.toLowerCase()] = metrics();
  });
  Object.assign(engine, saved);
  recalculate();
  return {
    scenario: 'rush_hour',
    duration_ticks: 42,
    fixed: results.fixed,
    adaptive: results.adaptive,
  };
}

const engine = {};
resetEngine();

export const mockApi = {
  network: async () => state(),
  start: async () => {
    engine.running = true;
    return state();
  },
  stop: async () => {
    engine.running = false;
    return state();
  },
  reset: async () => {
    resetEngine();
    return state();
  },
  tick: async () => {
    step();
    return state();
  },
  mode: async (mode) => {
    engine.mode = mode;
    recalculate();
    return state();
  },
  traffic: async (roadId, delta) => {
    const road = engine.roads.find((item) => item.road_id === roadId);
    road.vehicle_count = clamp(road.vehicle_count + delta, 0, road.capacity * 1.35);
    road.queue_length = clamp(road.queue_length + Math.max(delta * 0.45, delta * 0.15), 0, road.capacity);
    road.waiting_time = clamp(road.waiting_time + Math.max(delta, 0) * 0.8, 0, 220);
    road.average_speed = clamp(road.average_speed - Math.max(delta, 0) * 0.22, 4, 50);
    recalculate();
    return state();
  },
  emergency: async (roadId) => {
    engine.emergencyRoad = roadId;
    engine.roads.forEach((road) => {
      road.emergency_status = road.road_id === roadId;
    });
    engine.running = true;
    recalculate();
    return state();
  },
  experiment: async () => runComparison(),
};
