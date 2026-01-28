import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ReferenceLine,
  Legend,
  AreaChart
} from 'recharts';
import { motion } from 'framer-motion';

interface SurvivalDataPoint {
  time: number;
  probability: number;
}

interface PatientSurvivalData {
  patientId: string;
  data: SurvivalDataPoint[];
  color: string;
}

interface SurvivalChartProps {
  mode: 'single' | 'all';
  data: PatientSurvivalData[];
  timepoints?: number[];
  selectedPatient?: string;
}

// Color palette - greys with accent
const CHART_COLORS = [
  '#3b3b3b', '#5a5a5a', '#787878', '#969696', '#b4b4b4',
  '#2a2a2a', '#4a4a4a', '#686868', '#868686', '#a4a4a4',
  '#1a1a1a', '#383838', '#565656', '#747474', '#929292'
];

export function SurvivalChart({
  mode,
  data,
  timepoints = [365, 730, 1095, 1825],
  selectedPatient
}: SurvivalChartProps) {
  const chartData = useMemo(() => {
    if (mode === 'single' && data.length > 0) {
      const patientData = selectedPatient
        ? data.find(d => d.patientId === selectedPatient) || data[0]
        : data[0];
      
      return patientData.data.map(point => ({
        time: Math.round(point.time),
        timeDays: point.time,
        probability: point.probability,
        probabilityPercent: (point.probability * 100).toFixed(1)
      }));
    }
    
    // Multi-patient: we need to merge all data
    if (data.length === 0) return [];
    
    // Get all unique time points
    const allTimes = new Set<number>();
    data.forEach(patient => {
      patient.data.forEach(point => {
        allTimes.add(Math.round(point.time));
      });
    });
    
    const sortedTimes = Array.from(allTimes).sort((a, b) => a - b);
    
    return sortedTimes.map(time => {
      const point: Record<string, number | string> = { time, timeDays: time };
      
      data.forEach((patient, idx) => {
        // Find the probability at this time (or interpolate)
        const exactPoint = patient.data.find(p => Math.round(p.time) === time);
        if (exactPoint) {
          point[patient.patientId] = exactPoint.probability;
        } else {
          // Find surrounding points for interpolation
          const sortedData = [...patient.data].sort((a, b) => a.time - b.time);
          const before = sortedData.filter(p => p.time <= time).pop();
          const after = sortedData.find(p => p.time > time);
          
          if (before && after) {
            const ratio = (time - before.time) / (after.time - before.time);
            point[patient.patientId] = before.probability + ratio * (after.probability - before.probability);
          } else if (before) {
            point[patient.patientId] = before.probability;
          } else if (after) {
            point[patient.patientId] = after.probability;
          }
        }
      });
      
      return point;
    });
  }, [mode, data, selectedPatient]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    
    return (
      <div className="glass-card rounded-lg p-3 shadow-lg">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Day {label} ({(label / 365).toFixed(1)} years)
        </p>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-foreground">
              {mode === 'single' ? 'Survival' : entry.name}: {(entry.value * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="chart-container"
    >
      <h3 className="section-header mb-4">
        {mode === 'single' ? 'Survival Probability Curve' : 'Patient Survival Comparison'}
      </h3>
      
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {mode === 'single' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="survivalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b3b3b" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b3b3b" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--chart-grid))"
                strokeOpacity={0.5}
              />
              
              <XAxis
                dataKey="time"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                label={{
                  value: 'Time (days)',
                  position: 'insideBottomRight',
                  offset: -5,
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 11
                }}
              />
              
              <YAxis
                domain={[0, 1]}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                label={{
                  value: 'Survival Probability',
                  angle: -90,
                  position: 'insideLeft',
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 11
                }}
              />
              
              {timepoints.map((tp) => (
                <ReferenceLine
                  key={tp}
                  x={tp}
                  stroke="hsl(var(--border))"
                  strokeDasharray="5 5"
                  strokeOpacity={0.7}
                />
              ))}
              
              <Tooltip content={<CustomTooltip />} />
              
              <Area
                type="stepAfter"
                dataKey="probability"
                stroke="#3b3b3b"
                strokeWidth={2}
                fill="url(#survivalGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#3b3b3b', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </AreaChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--chart-grid))"
                strokeOpacity={0.5}
              />
              
              <XAxis
                dataKey="time"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                label={{
                  value: 'Time (days)',
                  position: 'insideBottomRight',
                  offset: -5,
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 11
                }}
              />
              
              <YAxis
                domain={[0, 1]}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                iconSize={8}
              />
              
              {data.map((patient, idx) => (
                <Line
                  key={patient.patientId}
                  type="stepAfter"
                  dataKey={patient.patientId}
                  name={patient.patientId}
                  stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
