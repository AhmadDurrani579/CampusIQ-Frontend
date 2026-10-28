import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const tipStyle = { borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--text)', fontSize: 12 };
export function VolumeChart({ data, compact = false, resolutionOnly = false, local = false }) {
  return <div className={`chart-wrap ${compact ? 'chart-compact' : ''}`} role="img" aria-label={local ? 'Local query volume and resolutions by date' : resolutionOnly ? 'Demonstration resolved queries by weekday' : 'Demonstration query volume and resolutions by weekday'}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0}><AreaChart data={data} margin={{ top: 15, right: 12, left: -22, bottom: 0 }}>
      <defs><linearGradient id="queryGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4a70ed" stopOpacity={0.18} /><stop offset="100%" stopColor="#4a70ed" stopOpacity={0.01} /></linearGradient></defs>
      <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} domain={local ? [0, 'auto'] : [0, 100]} ticks={local ? undefined : [0, 25, 50, 75, 100]} allowDecimals={!local} /><Tooltip contentStyle={tipStyle} />
      {!resolutionOnly && <Area isAnimationActive={false} type="monotone" dataKey="queries" name="Received queries" stroke="#4a70ed" strokeWidth={2.5} fill="url(#queryGradient)" />}
      <Area isAnimationActive={false} type="monotone" dataKey="resolved" name="Resolved queries" stroke="#0fb68a" strokeWidth={2} fill={resolutionOnly ? '#0fb68a10' : 'transparent'} strokeDasharray={resolutionOnly ? undefined : '5 4'} />
    </AreaChart></ResponsiveContainer>
  </div>;
}
export function StatusChart({ data, local = false, resolutionRate }) {
  const total = data.reduce((sum, row) => sum + row.value, 0);
  const rate = resolutionRate ?? (total ? (data.find(row => row.name === 'Resolved')?.value || 0) / total * 100 : 0);
  return <div className="status-chart"><div className="donut-wrap" role="img" aria-label={local ? 'Local query status distribution' : 'Demonstration query status distribution'}><ResponsiveContainer width="100%" height={172} minWidth={0}><PieChart><Pie isAnimationActive={false} data={data} dataKey="value" innerRadius={58} outerRadius={74} paddingAngle={3} stroke="none" startAngle={90} endAngle={-270}>{data.map((row) => <Cell key={row.name} fill={row.color} />)}</Pie><Tooltip contentStyle={tipStyle} /></PieChart></ResponsiveContainer><div className="donut-label"><strong>{local ? Math.round(rate) : 72}<span>%</span></strong><small>Resolution rate</small></div></div><div className="status-legend">{data.map((row) => <div key={row.name}><span className="legend-dot" style={{ background: row.color }} /><span>{row.name}</span><b>{local ? `${row.value} (${total ? Math.round(row.value / total * 100) : 0}%)` : `${row.value}%`}</b></div>)}</div></div>;
}
export function DepartmentChart({ data, local = false, staff = false }) {
  return <div className="chart-wrap chart-compact" role="img" aria-label={local ? staff ? "Local unresolved query workload by staff" : "Local query volume by department" : "Demonstration query volume by department"}><ResponsiveContainer width="100%" height="100%" minWidth={0}><BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, left: 0, bottom: 0 }}><CartesianGrid stroke="var(--border)" horizontal={false} strokeDasharray="3 3" /><XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--muted)' }} /><YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} /><Tooltip contentStyle={tipStyle} /><Bar isAnimationActive={false} dataKey="value" name="Queries" fill="#557aee" radius={[0, 4, 4, 0]} barSize={14} /></BarChart></ResponsiveContainer></div>;
}
