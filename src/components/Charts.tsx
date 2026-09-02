"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CLIENT_TYPES, ESTIMATE_STATUSES, labelOf } from "@/lib/constants";

const COLORS = ["#00d9f5", "#00b8d4", "#7dd3e8", "#0a3d48"];
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8",
  SENT: "#38bdf8",
  APPROVED: "#16a34a",
  REJECTED: "#dc2626",
  INVOICED: "#00b8d4",
};

export function ClientTypeChart({
  data,
}: {
  data: Array<{ type: string; _count: { _all: number } }>;
}) {
  const chart = data.map((d) => ({
    name: labelOf(CLIENT_TYPES, d.type),
    value: d._count._all,
  }));
  if (!chart.length) return <p className="p-6 text-sm text-slate-500">Aucune donnée</p>;
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={chart} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
            {chart.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusChart({
  data,
}: {
  data: Array<{ status: string; _count: { _all: number } }>;
}) {
  const chart = ESTIMATE_STATUSES.map((s) => ({
    name: s.label,
    value: data.find((d) => d.status === s.value)?._count._all ?? 0,
    fill: STATUS_COLORS[s.value],
  }));
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <BarChart data={chart}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {chart.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
