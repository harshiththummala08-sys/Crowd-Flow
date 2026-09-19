import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function LiveCharts({ history, comparison }) {
  const data = history?.slice(-28) || [];
  const comparisonData = comparison
    ? [
        { name: 'Waiting', Fixed: comparison.fixed.average_waiting_time, Adaptive: comparison.adaptive.average_waiting_time },
        { name: 'Queue', Fixed: comparison.fixed.average_queue_length, Adaptive: comparison.adaptive.average_queue_length },
        { name: 'Speed', Fixed: comparison.fixed.average_speed, Adaptive: comparison.adaptive.average_speed },
        { name: 'Congestion', Fixed: comparison.fixed.congestion_score * 100, Adaptive: comparison.adaptive.congestion_score * 100 },
      ]
    : [];
  return (
    <section className="charts">
      <div className="chart-card">
        <h3>Traffic Volume and Queue</h3>
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={data}>
            <CartesianGrid stroke="rgba(255,255,255,.08)" />
            <XAxis dataKey="time" stroke="#7a8b9f" />
            <YAxis stroke="#7a8b9f" />
            <Tooltip contentStyle={{ background: '#0c1420', border: '1px solid rgba(81,245,236,.25)' }} />
            <Line type="monotone" dataKey="vehicles" stroke="#51f5ec" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="average_queue_length" stroke="#f7d35d" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-card">
        <h3>Fixed vs Adaptive Simulation Result</h3>
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={comparisonData}>
            <CartesianGrid stroke="rgba(255,255,255,.08)" />
            <XAxis dataKey="name" stroke="#7a8b9f" />
            <YAxis stroke="#7a8b9f" />
            <Tooltip contentStyle={{ background: '#0c1420', border: '1px solid rgba(81,245,236,.25)' }} />
            <Legend />
            <Bar dataKey="Fixed" fill="#f87171" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Adaptive" fill="#51f5ec" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

