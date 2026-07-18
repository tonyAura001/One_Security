"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { CHART_COLORS, ChartTooltip } from "@/components/ui/chart-card";
import { formatFCFACompact } from "@/lib/format";
import { REVENUE_SERIES } from "@/lib/api/data";

/** Revenus vs Dépenses area chart for the DG dashboard. */
export function RevenueChart({
  data = REVENUE_SERIES,
}: {
  data?: typeof REVENUE_SERIES;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="ppRev" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={CHART_COLORS.accent}
              stopOpacity={0.38}
            />
            <stop
              offset="100%"
              stopColor={CHART_COLORS.accent}
              stopOpacity={0}
            />
          </linearGradient>
          <linearGradient id="ppDep" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={CHART_COLORS.warning}
              stopOpacity={0.22}
            />
            <stop
              offset="100%"
              stopColor={CHART_COLORS.warning}
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          stroke={CHART_COLORS.grid}
          strokeDasharray="0"
        />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fill: CHART_COLORS.axis, fontSize: 12, fontWeight: 700 }}
          dy={6}
        />
        <Tooltip
          cursor={{ stroke: CHART_COLORS.grid }}
          content={<ChartTooltip valueFormat={formatFCFACompact} />}
        />
        <Area
          type="monotone"
          dataKey="depenses"
          name="Dépenses"
          stroke={CHART_COLORS.warning}
          strokeWidth={2.4}
          fill="url(#ppDep)"
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="revenus"
          name="Revenus"
          stroke={CHART_COLORS.accent}
          strokeWidth={2.8}
          fill="url(#ppRev)"
          dot={false}
          activeDot={{ r: 4.5, strokeWidth: 2.5, stroke: "var(--surface)" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
