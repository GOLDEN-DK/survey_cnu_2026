"use client";
// 결과보고서 차트 (Recharts) — 인쇄 안정을 위해 ResponsiveContainer 없이 고정 폭·애니메이션 off로 렌더한다.

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LabelList,
  Cell,
} from "recharts";

const W = 640;
const BRAND = "#1d4ed8";
// 5점 척도 분포 색 (① 매우 불만족 → ⑤ 매우 만족)
const DIST_COLORS = ["#dc2626", "#f59e0b", "#d1d5db", "#60a5fa", "#1d4ed8"];
const DIST_NAMES = ["매우 불만족", "불만족", "보통", "만족", "매우 만족"];

const f2 = (v: unknown) => (typeof v === "number" ? v.toFixed(2) : String(v));

// 긴 라벨(강좌명)을 말줄임 처리하는 Y축 tick.
function TruncTick(props: {
  x?: number;
  y?: number;
  payload?: { value?: string | number };
}) {
  const { x, y, payload } = props;
  const s = String(payload?.value ?? "");
  const text = s.length > 22 ? `${s.slice(0, 21)}…` : s;
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fontSize={11} fill="#374151">
      {text}
    </text>
  );
}

// 문항별 만족도 평균 / 집단별 만족도 비교 — 가로 막대.
export function GroupAvgBarChart({
  data,
  domainMin = 0,
}: {
  data: { label: string; avg: number }[];
  domainMin?: number;
}) {
  return (
    <BarChart
      width={W}
      height={Math.max(200, data.length * 34 + 44)}
      data={data}
      layout="vertical"
      margin={{ top: 8, right: 48, bottom: 8, left: 8 }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
      <XAxis
        type="number"
        domain={[domainMin, 5]}
        ticks={domainMin >= 4 ? [4, 4.25, 4.5, 4.75, 5] : [0, 1, 2, 3, 4, 5]}
        fontSize={11}
      />
      <YAxis
        type="category"
        dataKey="label"
        width={150}
        interval={0}
        tick={<TruncTick />}
      />
      <Bar dataKey="avg" fill={BRAND} radius={[0, 4, 4, 0]} isAnimationActive={false}>
        <LabelList
          dataKey="avg"
          position="right"
          formatter={f2}
          fontSize={11}
          fill="#374151"
        />
      </Bar>
    </BarChart>
  );
}

// 문항별 5점 분포 — 100% 스택 가로 막대(① ~ ⑤).
export function ScaleDistStackedChart({
  data,
}: {
  data: { label: string; dist: number[] }[];
}) {
  const rows = data.map((d) => ({
    label: d.label,
    v1: d.dist[0],
    v2: d.dist[1],
    v3: d.dist[2],
    v4: d.dist[3],
    v5: d.dist[4],
  }));
  // 범례는 ①~⑤ 자연 순서로 고정하기 위해 recharts Legend 대신 HTML로 직접 렌더한다.
  return (
    <div>
      <BarChart
        width={W}
        height={Math.max(240, rows.length * 28 + 40)}
        data={rows}
        layout="vertical"
        stackOffset="expand"
        margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
      >
        <XAxis
          type="number"
          domain={[0, 1]}
          tickFormatter={(v) => `${Math.round(v * 100)}%`}
          fontSize={11}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={120}
          interval={0}
          tick={<TruncTick />}
        />
        <Tooltip formatter={(v) => `${v}건`} />
        {[0, 1, 2, 3, 4].map((i) => (
          <Bar
            key={i}
            dataKey={`v${i + 1}`}
            name={DIST_NAMES[i]}
            stackId="a"
            fill={DIST_COLORS[i]}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
      <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-ink-soft">
        {DIST_NAMES.map((n, i) => (
          <span key={n} className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: DIST_COLORS[i] }}
            />
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

// 집단별 명단 대비 응답(명단 vs 응답 이중 막대 + 응답률 %).
export function DemoCompareChart({
  data,
}: {
  data: { label: string; enrolled: number; responded: number; rate: number }[];
}) {
  return (
    <BarChart
      width={W}
      height={Math.max(200, data.length * 48 + 54)}
      data={data}
      layout="vertical"
      margin={{ top: 8, right: 60, bottom: 8, left: 8 }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
      <XAxis type="number" fontSize={11} allowDecimals={false} />
      <YAxis
        type="category"
        dataKey="label"
        width={90}
        interval={0}
        tick={<TruncTick />}
      />
      <Tooltip />
      <Legend wrapperStyle={{ fontSize: 11 }} />
      <Bar
        dataKey="enrolled"
        name="명단"
        fill="#cbd5e1"
        radius={[0, 4, 4, 0]}
        isAnimationActive={false}
      />
      <Bar
        dataKey="responded"
        name="응답"
        fill={BRAND}
        radius={[0, 4, 4, 0]}
        isAnimationActive={false}
      >
        <LabelList
          dataKey="rate"
          position="right"
          formatter={(v: unknown) =>
            `${typeof v === "number" ? v.toFixed(1) : v}%`
          }
          fontSize={10}
          fill="#374151"
        />
      </Bar>
    </BarChart>
  );
}

// 자유의견 유형별 건수 — 가로 막대.
export function CommentTypeChart({
  data,
  color = BRAND,
}: {
  data: { label: string; count: number }[];
  color?: string;
}) {
  return (
    <BarChart
      width={W}
      height={Math.max(180, data.length * 34 + 30)}
      data={data}
      layout="vertical"
      margin={{ top: 8, right: 44, bottom: 8, left: 8 }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
      <XAxis type="number" fontSize={11} allowDecimals={false} />
      <YAxis
        type="category"
        dataKey="label"
        width={160}
        interval={0}
        tick={<TruncTick />}
      />
      <Bar dataKey="count" fill={color} radius={[0, 4, 4, 0]} isAnimationActive={false}>
        <LabelList dataKey="count" position="right" fontSize={11} fill="#374151" />
      </Bar>
    </BarChart>
  );
}

// 강좌 순위 — 우수(파랑)·점검(주황) 가로 막대.
export function CourseRankChart({
  data,
  domainMin,
  color = BRAND,
}: {
  data: { label: string; avg: number }[];
  domainMin: number;
  color?: string;
}) {
  return (
    <BarChart
      width={W}
      height={Math.max(200, data.length * 30 + 40)}
      data={data}
      layout="vertical"
      margin={{ top: 8, right: 48, bottom: 8, left: 8 }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
      <XAxis type="number" domain={[domainMin, 5]} fontSize={11} />
      <YAxis
        type="category"
        dataKey="label"
        width={210}
        interval={0}
        tick={<TruncTick />}
      />
      <Bar dataKey="avg" radius={[0, 4, 4, 0]} isAnimationActive={false}>
        {data.map((_, i) => (
          <Cell key={i} fill={color} />
        ))}
        <LabelList
          dataKey="avg"
          position="right"
          formatter={f2}
          fontSize={10}
          fill="#374151"
        />
      </Bar>
    </BarChart>
  );
}
