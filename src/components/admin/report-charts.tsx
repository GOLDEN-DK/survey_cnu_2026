"use client";
// 결과보고서 차트 (Recharts) — 인쇄 안정을 위해 ResponsiveContainer 없이 고정 폭·애니메이션 off로 렌더한다.

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
  Cell,
  PieChart,
  Pie,
  ReferenceLine,
} from "recharts";

const W = 640;
const BRAND = "#1d4ed8";
// 5점 척도 분포 색 (① 매우 불만족 → ⑤ 매우 만족)
const DIST_COLORS = ["#dc2626", "#f59e0b", "#d1d5db", "#60a5fa", "#1d4ed8"];
const DIST_NAMES = ["매우 불만족", "불만족", "보통", "만족", "매우 만족"];

const f2 = (v: unknown) => (typeof v === "number" ? v.toFixed(2) : String(v));

// 만족도 확대축 눈금 — domainMin~5 구간을 0.25 또는 0.5 간격으로 채운다.
function ticksFrom(domainMin: number): number[] {
  const step = 5 - domainMin <= 1 ? 0.25 : 0.5;
  const out: number[] = [];
  for (let v = domainMin; v <= 5 + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}

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

// 집단별 만족도 비교(성별·연령대·시간대 통합) — 확대축 + 그룹색 + 전체 평균 기준선.
// 색은 data가 아닌 colors 배열로 분리 전달한다(데이터에 색 필드를 두면 Cell fill이 적용되지 않는 recharts 이슈 회피).
export function GroupCompareChart({
  data,
  colors,
  domainMin,
  refValue,
  refLabel,
}: {
  data: { label: string; avg: number }[];
  colors: string[];
  domainMin: number;
  refValue?: number;
  refLabel?: string;
}) {
  return (
    <BarChart
      width={W}
      height={Math.max(220, data.length * 30 + 44)}
      data={data}
      layout="vertical"
      margin={{ top: 16, right: 48, bottom: 8, left: 8 }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
      <XAxis type="number" domain={[domainMin, 5]} ticks={ticksFrom(domainMin)} fontSize={11} />
      <YAxis
        type="category"
        dataKey="label"
        width={110}
        interval={0}
        tick={<TruncTick />}
      />
      {refValue != null && (
        <ReferenceLine
          x={refValue}
          stroke="#dc2626"
          strokeDasharray="4 3"
          label={{
            value: refLabel ?? `전체 ${refValue.toFixed(2)}`,
            position: "top",
            fontSize: 10,
            fill: "#dc2626",
          }}
        />
      )}
      <Bar dataKey="avg" radius={[0, 4, 4, 0]} isAnimationActive={false}>
        {data.map((_, i) => (
          <Cell key={i} fill={colors[i] ?? BRAND} />
        ))}
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

// 집단별 응답률(%) 단일 가로막대 — 전체 응답률 기준선 + "nn.n% (응답/명단명)" 라벨.
export function RateBarChart({
  data,
  colors,
  refValue,
}: {
  data: { label: string; rate: number; rateLabel: string }[];
  colors: string[];
  refValue?: number;
}) {
  const maxRate = Math.max(...data.map((d) => d.rate), 1);
  const top = Math.ceil((maxRate * 1.15) / 5) * 5;
  return (
    <BarChart
      width={W}
      height={Math.max(220, data.length * 30 + 44)}
      data={data}
      layout="vertical"
      margin={{ top: 16, right: 140, bottom: 8, left: 8 }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
      <XAxis
        type="number"
        domain={[0, top]}
        tickFormatter={(v) => `${v}%`}
        fontSize={11}
      />
      <YAxis
        type="category"
        dataKey="label"
        width={110}
        interval={0}
        tick={<TruncTick />}
      />
      {refValue != null && (
        <ReferenceLine
          x={refValue}
          stroke="#dc2626"
          strokeDasharray="4 3"
          label={{
            value: `전체 ${refValue.toFixed(1)}%`,
            position: "top",
            fontSize: 10,
            fill: "#dc2626",
          }}
        />
      )}
      <Bar dataKey="rate" radius={[0, 4, 4, 0]} isAnimationActive={false}>
        {data.map((_, i) => (
          <Cell key={i} fill={colors[i] ?? BRAND} />
        ))}
        <LabelList dataKey="rateLabel" position="right" fontSize={10} fill="#374151" />
      </Bar>
    </BarChart>
  );
}

// 구성 비율 도넛 — 조각은 각도로, 정확한 값은 아래 HTML 범례로(라벨 겹침 방지).
export function DonutChart({
  data,
  title,
}: {
  data: { name: string; value: number; color: string }[];
  title: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div className="flex flex-col items-center">
      <p className="mb-1 text-center text-[11px] font-semibold text-ink-soft">
        {title}
      </p>
      <PieChart width={220} height={180}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={46}
          outerRadius={78}
          paddingAngle={1}
          stroke="#ffffff"
          strokeWidth={2}
          isAnimationActive={false}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
      </PieChart>
      <div className="mt-1 grid w-full grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
        {data.map((d, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-ink">{d.name}</span>
            <span className="ml-auto tabular-nums text-ink-soft">
              {((d.value / total) * 100).toFixed(1)}%
            </span>
          </span>
        ))}
      </div>
    </div>
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

// 자유의견/수강목적 유형별 건수 — 가로 막대. total을 주면 "건수 (비율%)" 라벨.
export function CommentTypeChart({
  data,
  color = BRAND,
  total,
}: {
  data: { label: string; count: number }[];
  color?: string;
  total?: number;
}) {
  const rows = data.map((d) => ({
    ...d,
    _label:
      total && total > 0
        ? `${d.count}건 (${((d.count / total) * 100).toFixed(1)}%)`
        : `${d.count}건`,
  }));
  return (
    <BarChart
      width={W}
      height={Math.max(180, rows.length * 34 + 30)}
      data={rows}
      layout="vertical"
      margin={{ top: 8, right: total ? 92 : 52, bottom: 8, left: 8 }}
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
        <LabelList dataKey="_label" position="right" fontSize={11} fill="#374151" />
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
