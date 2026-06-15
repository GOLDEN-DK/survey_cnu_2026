"use client";
// 관리자 대시보드 차트 (Recharts) — 일자별 추이, 문항별 평균

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

export function DateChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="date" fontSize={12} />
        <YAxis allowDecimals={false} fontSize={12} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="count"
          name="응답 수"
          stroke="#1d4ed8"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ScaleAvgChart({
  data,
}: {
  data: { code: string; avg: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(240, data.length * 34)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 32, bottom: 8, left: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis type="number" domain={[0, 5]} fontSize={12} />
        <YAxis type="category" dataKey="code" width={44} fontSize={12} />
        <Tooltip
          formatter={(v) => (typeof v === "number" ? v.toFixed(2) : String(v))}
        />
        <Bar dataKey="avg" name="평균" fill="#1d4ed8" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
