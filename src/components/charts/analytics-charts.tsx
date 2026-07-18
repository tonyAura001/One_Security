"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS, ChartTooltip } from "@/components/ui/chart-card";
import { formatFCFACompact } from "@/lib/format";
import { BY_SITE, type MonthPoint } from "@/lib/api/analytics";

const AXIS = {
  fill: CHART_COLORS.axis,
  fontSize: 11,
  fontWeight: 700,
} as const;

/** CA par mois — aire. */
export function CaChart({ data }: { data: MonthPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="anCa" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={CHART_COLORS.accent}
              stopOpacity={0.35}
            />
            <stop
              offset="100%"
              stopColor={CHART_COLORS.accent}
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={AXIS}
          dy={6}
        />
        <Tooltip
          cursor={{ stroke: CHART_COLORS.grid }}
          content={<ChartTooltip valueFormat={formatFCFACompact} />}
        />
        <Area
          type="monotone"
          dataKey="ca"
          name="CA"
          stroke={CHART_COLORS.accent}
          strokeWidth={2.8}
          fill="url(#anCa)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Évolution de la masse salariale — ligne. */
export function MasseChart({ data }: { data: MonthPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={AXIS}
          dy={6}
        />
        <Tooltip
          cursor={{ stroke: CHART_COLORS.grid }}
          content={<ChartTooltip valueFormat={formatFCFACompact} />}
        />
        <Line
          type="monotone"
          dataKey="masse"
          name="Masse salariale"
          stroke={CHART_COLORS.violet}
          strokeWidth={2.8}
          dot={{ r: 3, fill: CHART_COLORS.violet }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Incidents par mois — barres. */
export function IncidentsChart({ data }: { data: MonthPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={AXIS}
          dy={6}
        />
        <Tooltip cursor={{ fill: "transparent" }} content={<ChartTooltip />} />
        <Bar
          dataKey="incidents"
          name="Incidents"
          fill={CHART_COLORS.danger}
          radius={[5, 5, 0, 0]}
          barSize={26}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Répartition des contrats par site — barres horizontales. */
export function ContratsChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={BY_SITE}
        layout="vertical"
        margin={{ top: 4, right: 12, bottom: 0, left: 8 }}
      >
        <CartesianGrid horizontal={false} stroke={CHART_COLORS.grid} />
        <XAxis type="number" axisLine={false} tickLine={false} tick={AXIS} />
        <YAxis
          type="category"
          dataKey="site"
          axisLine={false}
          tickLine={false}
          tick={AXIS}
          width={92}
        />
        <Tooltip cursor={{ fill: "transparent" }} content={<ChartTooltip />} />
        <Bar
          dataKey="contrats"
          name="Contrats"
          fill={CHART_COLORS.accent}
          radius={[0, 5, 5, 0]}
          barSize={16}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Taux de couverture par site — barres. */
export function CouvertureChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={BY_SITE}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
      >
        <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
        <XAxis
          dataKey="site"
          axisLine={false}
          tickLine={false}
          tick={{ ...AXIS, fontSize: 9.5 }}
          dy={6}
          interval={0}
        />
        <Tooltip
          cursor={{ fill: "transparent" }}
          content={<ChartTooltip valueFormat={(v) => `${v}%`} />}
        />
        <Bar
          dataKey="couverture"
          name="Couverture"
          fill={CHART_COLORS.success}
          radius={[5, 5, 0, 0]}
          barSize={26}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
