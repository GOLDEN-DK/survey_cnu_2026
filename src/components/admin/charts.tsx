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
  LabelList,
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

// Y축 라벨 — "번호. 문항내용"을 한 줄로, 길면 말줄임. 전체 내용은 막대 hover(tooltip)로 확인.
function ScaleTick(props: {
  x?: number;
  y?: number;
  payload?: { value?: string | number };
}) {
  const { x, y, payload } = props;
  const s = String(payload?.value ?? "");
  const text = s.length > 30 ? `${s.slice(0, 29)}…` : s;
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fontSize={12} fill="#374151">
      {text}
    </text>
  );
}

export function ScaleAvgChart({
  data,
}: {
  data: { no: number; text: string; avg: number }[];
}) {
  // YAxis가 표시할 "번호. 문항내용" 라벨을 미리 합쳐 둔다(tooltip 라벨로도 사용).
  const rows = data.map((d) => ({ ...d, label: `${d.no}. ${d.text}` }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(240, rows.length * 36)}>
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 8, right: 48, bottom: 8, left: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 5]}
          ticks={[0, 1, 2, 3, 4, 5]}
          fontSize={12}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={260}
          interval={0}
          tick={<ScaleTick />}
        />
        <Tooltip
          formatter={(v) => [
            typeof v === "number" ? v.toFixed(2) : String(v),
            "평균",
          ]}
          labelFormatter={(l) => String(l)}
        />
        <Bar dataKey="avg" name="평균" fill="#1d4ed8" radius={[0, 4, 4, 0]}>
          <LabelList
            dataKey="avg"
            position="right"
            formatter={(v) => (typeof v === "number" ? v.toFixed(2) : String(v))}
            fontSize={11}
            fill="#374151"
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
