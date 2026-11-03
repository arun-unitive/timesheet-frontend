import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const AXIS = { fontSize: 12, fill: '#6b7280' };
const GRID = '#eef1f6';

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e5e7eb',
  boxShadow: '0 8px 24px rgba(15,23,42,0.10)',
  fontSize: 12,
};

/** Area chart used for the trailing daily-hours trend. */
export function TrendAreaChart({ data, xKey = 'label', yKey = 'hours', height = 260, color = '#4f46e5' }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.28} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={48} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} fill="url(#trendFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Vertical bars - used for weekly/monthly volume comparisons. */
export function HoursBarChart({ data, xKey = 'label', yKey = 'hours', height = 260, color = '#6366f1' }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={48} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
        <Bar dataKey={yKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Donut for the submission-status breakdown. */
export function StatusDonut({ data, height = 260, innerRadius = 58, outerRadius = 84 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={innerRadius} outerRadius={outerRadius} paddingAngle={2}>
          {data.map((slice) => (
            <Cell key={slice.name} fill={slice.color} stroke="#fff" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ fontSize: 12, color: '#475569' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
