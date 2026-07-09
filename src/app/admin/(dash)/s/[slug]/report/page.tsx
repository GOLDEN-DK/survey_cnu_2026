// 설문 결과보고서 — 운영 DB를 재집계해 A4 인쇄용 보고서로 렌더한다(브라우저 인쇄로 PDF 저장).

import { notFound } from "next/navigation";
import "./report.css";
import { getReportData, type CourseRow } from "@/lib/report-data";
import { labelOf, GROUP_COLORS } from "@/lib/report-rules";
import type { ScaleStat, DistItem, RosterDemographics } from "@/lib/admin-stats";
import type { RateRow } from "@/lib/report-rules";
import type { ClassifiedCat } from "@/lib/comment-classify";
import {
  GroupAvgBarChart,
  GroupCompareChart,
  ScaleDistStackedChart,
  DonutChart,
  RateBarChart,
  CommentTypeChart,
  CourseRankChart,
} from "@/components/admin/report-charts";
import { EditableNote } from "./EditableNote";
import { PrintButton } from "./PrintButton";
import type { ReportSectionKey } from "@/lib/report-draft";

export const dynamic = "force-dynamic";

const f2 = (n: number) => n.toFixed(2);
const cv = (n: number | null) => (n == null ? "-" : n.toFixed(2));
const pctOf = (n: number, total: number) =>
  total ? `${((n / total) * 100).toFixed(1)}%` : "0.0%";
const dfmt = (d: Date | null) =>
  d ? d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }) : "-";
const courseLabel = (c: { name: string; professor: string | null }) =>
  `${c.name}${c.professor ? ` (${c.professor})` : ""}`;
// 학년도·학기 라벨 — 설문 제목의 "YYYY학년도 N학기"를 우선 쓰고, 없으면 시작일로 산출한다.
function academicTermLabel(title: string, startAt: Date | null): string {
  const m = title.match(/(\d{4})\s*학년도\s*([12])\s*학기/);
  if (m) return `${m[1]}학년도 ${m[2]}학기`;
  if (startAt) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
    }).formatToParts(startAt);
    const y = Number(parts.find((p) => p.type === "year")?.value);
    const mo = Number(parts.find((p) => p.type === "month")?.value);
    if (y && mo) {
      // 3~8월=1학기, 9~12월=2학기, 1~2월=전년도 2학기
      if (mo >= 3 && mo <= 8) return `${y}학년도 1학기`;
      if (mo >= 9) return `${y}학년도 2학기`;
      return `${y - 1}학년도 2학기`;
    }
  }
  return "";
}
// 강좌명에 이미 시간대 표기(주간/야간)가 있으면 중복 부착하지 않는다.
const dayNightSuffix = (c: { name: string; dayNight: string | null }, wrap = false) =>
  c.dayNight && !c.name.includes(c.dayNight)
    ? wrap
      ? ` (${c.dayNight})`
      : ` · ${c.dayNight}`
    : "";

// 자유의견 유형별 정리 문구(표시용)
const SAT_DESC: Record<string, string> = {
  "강사 전문성·열정·준비":
    "전문 지식, 성실한 수업 준비, 열정적 지도와 친절한 설명에 대한 만족",
  "강의 유익성·실무 활용":
    "실습 중심 운영, 생활·업무 활용 가능성, 현장학습 등 학습 효과 긍정",
  "수업 분위기·즐거움":
    "편안하고 활기 있는 분위기, 수강생 간 교류, 즐겁게 배우는 수업 운영",
  "소통·피드백·눈높이":
    "수준별 설명, 질문 대응, 세심한 개별 피드백 등 학습자 이해 지원",
};
const IMP_DESC: Record<string, string> = {
  "강의실·기자재·시설 환경":
    "마이크 배터리·작동, 이젤 고장·부족, 컴퓨터·네트워크, 강의실 청결·냉난방 개선 요구",
  "강좌 구성·진도·수준 조정":
    "진도 속도, 수준별 운영, 자료 제공, 강좌 구성의 체계성 보완 요구",
  "주차·출입·정산":
    "매번 수동 정산의 불편, 자동·선결제 전환 및 주차 할인·면제 검토 요구",
  "강사·수업 운영·관리":
    "수업 분위기 관리, 판서 도구 등 비품 준비, 강사·운영 소통 관련 의견",
  "수강신청·결제·홈페이지·행정":
    "홈페이지 속도·보안, 결제·환불, 등록 안내 등 행정 편의 개선 의견",
  "강좌 개설·운영방식 수요":
    "야간·방학·주말 강좌, 출입 동선·안전 등 운영방식 관련 요구",
};

// ── 재사용 소품 ──
function SectionH({
  num,
  title,
  breakBefore,
}: {
  num: string;
  title: string;
  breakBefore?: boolean;
}) {
  return (
    <h2 className={`mt-7 ${breakBefore ? "page-break" : ""}`}>
      {num}. {title}
    </h2>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[11px] text-ink-soft">※ {children}</p>;
}

function ChartBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="avoid-break my-3 overflow-hidden rounded-lg border border-line bg-white p-2">
      {children}
    </div>
  );
}

// 강좌 핵심지표 표(우수/점검 공용) — showEnv·showInspect로 열 구성 조정.
function CourseTable({
  rows,
  showEnv,
  showInspect,
}: {
  rows: CourseRow[];
  showEnv?: boolean;
  showInspect?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>강좌(교수/시간대)</th>
            <th>응답</th>
            <th>전체</th>
            <th>전반</th>
            <th>재수강</th>
            <th>추천</th>
            {showEnv && <th>환경</th>}
            {showInspect && <th>주요 점검사항</th>}
            <th>관리 방향</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.name}>
              <td>
                {courseLabel(c)}
                {dayNightSuffix(c)}
                {c.smallSample ? (
                  <span className="text-[10px] text-ink-soft"> ※표본작음</span>
                ) : null}
              </td>
              <td className="text-center tabular-nums">{c.total}</td>
              <td className="text-center font-semibold tabular-nums">
                {f2(c.overallAvg)}
              </td>
              <td className="text-center tabular-nums">{cv(c.core.overall)}</td>
              <td className="text-center tabular-nums">{cv(c.core.retake)}</td>
              <td className="text-center tabular-nums">{cv(c.core.recommend)}</td>
              {showEnv && (
                <td className="text-center tabular-nums">{cv(c.core.env)}</td>
              )}
              {showInspect && <td>{c.inspectionPoints}</td>}
              <td>{c.manageDirection}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getReportData(slug);
  if (!data) notFound();

  const {
    survey,
    stats,
    roster,
    overallRate,
    scales,
    topCourses,
    reviewCourses,
    allCourseRows,
    satisfyCats,
    improveCats,
    e3Cats,
    commentCounts,
    rateByGender,
    rateByAge,
    rateByTime,
    regionGrouped,
    gapCommentary,
    rateCommentary,
    notes,
  } = data;

  const byCode: Record<string, ScaleStat> = Object.fromEntries(
    scales.map((s) => [s.code, s]),
  );
  const avgOf = (code: string) => (byCode[code] ? byCode[code].avg : null);
  const noteOf = (key: ReportSectionKey) => notes.find((n) => n.key === key)!;
  const termLabel = academicTermLabel(survey.title, survey.startAt);

  // 핵심 지표 요약 차트 데이터
  const coreChart = [
    { label: "전체 만족도", avg: stats.overallAvg },
    { label: "강사 전문성", avg: avgOf("B3") },
    { label: "수업 준비", avg: avgOf("B6") },
    { label: "전반 만족", avg: avgOf("D2") },
    { label: "재수강 의향", avg: avgOf("D3") },
    { label: "추천 의향", avg: avgOf("D4") },
    { label: "교육환경", avg: avgOf("C1") },
  ].filter((x): x is { label: string; avg: number } => x.avg != null);

  const distChart = scales.map((s) => ({ label: labelOf(s), dist: s.dist }));

  // 집단별 만족도 통합(성별→연령대→시간대) — 표본 10 미만은 (n=..) 부기.
  const withN = (name: string, count: number) =>
    count < 10 ? `${name} (n=${count})` : name;
  // 색은 data와 분리해 병렬 배열로 전달한다(차트 컴포넌트가 Cell로 소비).
  const gRows = stats.byGender.filter((r) => r.count > 0);
  const aRows = stats.byAgeBand.filter((r) => r.count > 0);
  const tRows = stats.byTime.filter((r) => r.count > 0);
  const satRows = [
    ...gRows.map((r) => ({ label: withN(r.name, r.count), avg: r.avg })),
    ...aRows.map((r) => ({ label: withN(r.name, r.count), avg: r.avg })),
    ...tRows.map((r) => ({ label: withN(r.name, r.count), avg: r.avg })),
  ];
  const satColors = [
    ...gRows.map(() => GROUP_COLORS.gender),
    ...aRows.map(() => GROUP_COLORS.age),
    ...tRows.map(() => GROUP_COLORS.time),
  ];
  const minSatAvg = satRows.length ? Math.min(...satRows.map((r) => r.avg)) : 0;
  const satDomainMin = satRows.length
    ? Math.min(4.0, Math.floor((minSatAvg - 0.2) * 4) / 4)
    : 0;

  // 집단별 응답률 통합.
  const rateRow = (r: RateRow) => ({
    label: r.name,
    rate: r.rate,
    rateLabel: `${r.rate.toFixed(1)}% (${r.responded}/${r.enrolled}명)`,
  });
  const rateRows = [
    ...rateByGender.map(rateRow),
    ...rateByAge.map(rateRow),
    ...rateByTime.map(rateRow),
  ];
  const rateColors = [
    ...rateByGender.map(() => GROUP_COLORS.gender),
    ...rateByAge.map(() => GROUP_COLORS.age),
    ...rateByTime.map(() => GROUP_COLORS.time),
  ];

  // 구성 도넛 — 성별 2조각, 연령대 6조각(밝은→진한 순서 램프).
  const AGE_RAMP = [
    "#dbeafe",
    "#bfdbfe",
    "#93c5fd",
    "#60a5fa",
    "#3b82f6",
    "#1d4ed8",
  ];
  const donutGender = roster
    ? roster.byGender
        .filter((g) => g.count > 0)
        .map((g) => ({
          name: g.name,
          value: g.count,
          color: g.name === "남" ? "#1d4ed8" : g.name === "여" ? "#93c5fd" : "#cbd5e1",
        }))
    : [];
  const donutAge = roster
    ? roster.byAgeBand.map((a, i) => ({
        name: a.name,
        value: a.count,
        color: AGE_RAMP[i] ?? "#1d4ed8",
      }))
    : [];

  const satTypes = satisfyCats
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
  const impTypes = improveCats
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
  const e3Types = e3Cats
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  const a4 = [...(stats.choices[0]?.options ?? [])].sort(
    (a, b) => b.count - a.count,
  );

  // 발행일 — 조회 시점(Asia/Seoul).
  const issuedAt = new Date().toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
  });

  // 집단 색 범례(성별·연령대·시간대 통합 차트용).
  const groupLegend = (
    <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-ink-soft">
      {[
        ["성별", GROUP_COLORS.gender],
        ["연령대", GROUP_COLORS.age],
        ["시간대", GROUP_COLORS.time],
      ].map(([name, color]) => (
        <span key={name} className="flex items-center gap-1">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: color }}
          />
          {name}
        </span>
      ))}
    </div>
  );

  return (
    <div>
      {/* 화면 전용 안내줄 */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <p className="text-sm text-ink-soft">
          현재 응답 데이터로 자동 생성된 결과보고서입니다. 서술 항목은 편집·저장할 수 있으며, 인쇄(PDF 저장)에는 편집 UI가 빠집니다.
        </p>
        <PrintButton />
      </div>

      <div className="report-root">
        {/* 발행(조회) 일자 — A4 최상단 우측 */}
        <p className="text-right text-xs text-ink-soft">{issuedAt} 조회 기준</p>
        {/* ── 표지 ── */}
        <div className="avoid-break flex min-h-[900px] flex-col items-center py-12 text-center">
          <div className="mt-20">
            <h1>
              {termLabel && (
                <>
                  {termLabel}
                  <br />
                </>
              )}
              수강생 만족도 조사 결과보고서
            </h1>
            <p className="mt-2 text-[13px] text-[#2f5496]">
              강좌·교수별 만족도 및 교육환경 개선사항 분석 중심
            </p>
          </div>

          <div className="mt-12 w-full overflow-hidden avoid-break">
            <table>
              <thead>
                <tr>
                  <th>총 수강생</th>
                  <th>응답 수</th>
                  <th>응답률</th>
                  <th>전체 만족도</th>
                  <th>교육환경</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-center text-base font-bold">
                  <td className="text-center">
                    {roster ? `${roster.total.toLocaleString()} 명` : "-"}
                  </td>
                  <td className="text-center">{stats.total.toLocaleString()} 명</td>
                  <td className="text-center">
                    {roster ? `${overallRate.toFixed(1)}%` : "-"}
                  </td>
                  <td className="text-center">{f2(stats.overallAvg)} / 5</td>
                  <td className="text-center">
                    {avgOf("C1") != null ? `${f2(avgOf("C1")!)} / 5` : "-"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-auto">
            <p className="text-2xl font-bold text-[#1e3a8a]">
              충남대학교 평생교육원
            </p>
          </div>
        </div>

        {/* ── Ⅰ. 조사 개요 ── */}
        <SectionH num="Ⅰ" title="조사 개요" breakBefore />
        <h3 className="mt-3">1. 조사 목적</h3>
        <ul className="mt-1 flex list-none flex-col gap-1">
          <li className="pl-4 -indent-4">
            · 수강생의 강좌·교수별 만족 및 불만족 요인을 분석하여 차기 교육과정 편성에 반영한다.
          </li>
          <li className="pl-4 -indent-4">
            · 강의 내용, 강사 역량, 수업 운영, 교육환경, 행정서비스 개선 필요사항을 확인한다.
          </li>
          <li className="pl-4 -indent-4">
            · 우수 강좌는 유지·확대하고, 점검 필요 강좌는 보완 방향을 마련한다.
          </li>
        </ul>
        <h3 className="mt-4">2. 조사 방법 및 산출 기준</h3>
        <table className="mt-1 avoid-break">
          <tbody>
            <tr>
              <th className="w-32">조사 대상</th>
              <td>
                {survey.title} 수강생{" "}
                {roster ? `${roster.total.toLocaleString()}명` : ""}
              </td>
            </tr>
            <tr>
              <th>조사 기간</th>
              <td>
                {dfmt(survey.startAt)} ~ {dfmt(survey.endAt)}
              </td>
            </tr>
            <tr>
              <th>조사 방법</th>
              <td>온라인 설문조사 (문자 URL 안내 및 명단 본인확인 후 제출)</td>
            </tr>
            <tr>
              <th>응답 현황</th>
              <td>
                총 {stats.total.toLocaleString()}건 응답
                {roster ? `, 응답률 ${overallRate.toFixed(1)}%` : ""}
              </td>
            </tr>
            <tr>
              <th>평정 방식</th>
              <td>
                5점 척도(1 매우 낮음 ~ 5 매우 높음), 척도 문항 {scales.length}개 +
                자유의견
              </td>
            </tr>
            <tr>
              <th>분석 기준</th>
              <td>문항별 평균·분포, 강좌·교수별 평균, 자유의견 유형화</td>
            </tr>
          </tbody>
        </table>
        <Note>
          강좌·교수별 평가는 응답 수가 적은 강좌가 있어 개별 평가가 아닌 운영 참고자료로 활용한다.
        </Note>

        {/* ── Ⅱ. 조사 결과 요약 ── */}
        <SectionH num="Ⅱ" title="조사 결과 요약" />
        <h3 className="mt-3">1. 핵심 지표</h3>
        <p className="mt-1">
          전체 만족도는 <b>{f2(stats.overallAvg)}점</b>으로 나타났으며,{" "}
          {coreHigh(byCode)} 문항이 우수하게 평가되었다.
          {avgOf("C1") != null && (
            <>
              {" "}
              반면 <b>교육환경({f2(avgOf("C1")!)})</b>은 전체 문항 중 가장 낮아 우선 개선 항목으로 확인되었다.
            </>
          )}
        </p>
        <ChartBox>
          <GroupAvgBarChart data={coreChart} />
        </ChartBox>

        <h3 className="mt-4">2. 문항별 만족도</h3>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>조사 내용</th>
                <th>평균</th>
                <th>매우 낮음</th>
                <th>낮음</th>
                <th>보통</th>
                <th>높음</th>
                <th>매우 높음</th>
              </tr>
            </thead>
            <tbody>
              {scales.map((s) => (
                <tr key={s.code}>
                  <td>{labelOf(s)}</td>
                  <td className="text-center font-semibold tabular-nums">
                    {f2(s.avg)}
                  </td>
                  {s.dist.map((n, i) => (
                    <td key={i} className="text-center tabular-nums">
                      {n}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Note>문항명은 표만 보아도 조사 내용을 이해할 수 있도록 축약 표기하였다.</Note>

        <h3 className="mt-4">3. 문항별 5점 분포</h3>
        <p className="mt-1">
          각 문항의 응답이 ①~⑤에 어떻게 분포하는지 100% 기준으로 나타낸 것이다. 대부분 문항에서 ‘높음·매우 높음’ 비중이 압도적이나, 교육환경 등 일부 문항은 중립·부정 응답 비중이 상대적으로 크다.
        </p>
        <ChartBox>
          <ScaleDistStackedChart data={distChart} />
        </ChartBox>

        {/* ── Ⅲ. 응답자 및 수강 목적 현황 ── */}
        {roster && (
          <>
            <SectionH num="Ⅲ" title="응답자 및 수강 목적 현황" />
            <h3 className="mt-3">1. 전체 수강생 인구통계</h3>
            <p className="mt-1">
              전체 수강생 {roster.total.toLocaleString()}명 기준 성별·연령대 구성은 다음과 같다.
            </p>
            <ChartBox>
              <div className="flex flex-wrap items-start justify-around gap-2">
                <DonutChart title="성별 구성" data={donutGender} />
                <DonutChart title="연령대 구성" data={donutAge} />
              </div>
            </ChartBox>

            <h3 className="mt-5">2. 명단 대비 응답률</h3>
            <p className="mt-1">
              명단 인원 대비 실제 응답 비율(응답률)을 집단별로 비교한 것이다. 붉은 점선은 전체 응답률({overallRate.toFixed(1)}%)이다.
            </p>
            <ChartBox>
              <RateBarChart data={rateRows} colors={rateColors} refValue={overallRate} />
              {groupLegend}
            </ChartBox>
            {rateCommentary && <p className="mt-1">{rateCommentary}</p>}

            <h3 className="mt-5">3. 인구 구성 현황</h3>
            <DemoInsightTable roster={roster} regionRows={regionGrouped} />

            <h3 className="mt-5">4. 집단별 만족도 비교</h3>
            <p className="mt-1">
              성별·연령대·시간대별 만족도 평균이다. 집단 간 차이를 보기 위해 가로축을 {satDomainMin.toFixed(2)}~5.0 구간으로 확대했고, 붉은 점선은 전체 평균({f2(stats.overallAvg)})이다.
            </p>
            <ChartBox>
              <GroupCompareChart
                data={satRows}
                colors={satColors}
                domainMin={satDomainMin}
                refValue={stats.overallAvg}
                refLabel={`전체 ${f2(stats.overallAvg)}`}
              />
              {groupLegend}
            </ChartBox>
            <ul className="mt-1 flex list-none flex-col gap-1.5">
              <li className="pl-4 -indent-4">· 성별 — {gapCommentary.gender}</li>
              <li className="pl-4 -indent-4">· 연령대 — {gapCommentary.age}</li>
              {stats.byTime.length > 0 && (
                <li className="pl-4 -indent-4">· 시간대 — {gapCommentary.time}</li>
              )}
            </ul>

            <h3 className="mt-5">5. 수강 목적 (복수 응답)</h3>
            <ChartBox>
              <CommentTypeChart
                data={a4.map((o) => ({ label: o.label, count: o.count }))}
                total={stats.total}
              />
            </ChartBox>
            <Note>
              수강 목적은 복수 선택 문항이므로 선택 건수 합계는 응답 수와 일치하지 않는다. 비율은 응답자({stats.total.toLocaleString()}명) 대비이다.
            </Note>
          </>
        )}

        {/* ── Ⅳ. 강좌·교수별 만족도 분석 ── */}
        <SectionH num="Ⅳ" title="강좌·교수별 만족도 분석" />
        <ul className="mt-2 flex list-none flex-col gap-1">
          <li className="pl-4 -indent-4">
            · 강좌별 평가는 응답 수 3명 이상 강좌를 중심으로 참고하되, 우수 강좌는 응답 수 5명 이상 강좌를 우선 검토하였다.
          </li>
          <li className="pl-4 -indent-4">
            · 점수가 낮은 강좌는 평균만으로 판단하지 않고 전반 만족도·재수강·추천 의향·교육환경 점수와 자유의견을 함께 검토하였다.
          </li>
        </ul>

        <h3 className="mt-4">1. 우수 강좌 현황 및 관리 방향</h3>
        {topCourses.length > 0 ? (
          <>
            <ChartBox>
              <CourseRankChart
                data={topCourses.map((c) => ({
                  label: courseLabel(c),
                  avg: c.overallAvg,
                }))}
                domainMin={4}
              />
            </ChartBox>
            <CourseTable rows={topCourses} />
            <Note>
              우수 강좌는 강사 전문성·수업 준비, 재수강·추천 의향이 함께 높게 나타난 강좌이며, 강좌당 표본이 작아 개별 평가가 아닌 우수 운영 참고자료로 활용한다.
            </Note>
          </>
        ) : (
          <p className="mt-1 text-ink-soft">응답 5명 이상 강좌가 없어 우수 강좌를 선정하지 않았다.</p>
        )}

        <h3 className="mt-4">2. 점검 필요 강좌 현황 및 개선 방향</h3>
        {reviewCourses.length > 0 ? (
          <>
            <ChartBox>
              <CourseRankChart
                data={reviewCourses.map((c) => ({
                  label: courseLabel(c),
                  avg: c.overallAvg,
                }))}
                domainMin={3}
                color="#f97316"
              />
            </ChartBox>
            <CourseTable rows={reviewCourses} showEnv showInspect />
            <table className="mt-3 avoid-break">
              <thead>
                <tr>
                  <th>관리 구분</th>
                  <th>판단 기준</th>
                  <th>조치 방향</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>개설 재검토</td>
                  <td>전반 만족도가 낮고(4.0 미만) 불만이 반복되는 경우</td>
                  <td>강의계획·강사·강좌 지속 여부 재검토</td>
                </tr>
                <tr>
                  <td>환경 보완 후 유지</td>
                  <td>만족도는 있으나 강의실·기자재·좌석 문제가 확인된 경우</td>
                  <td>강의실 재배정, 기자재 구입·교체, 사전점검 강화</td>
                </tr>
                <tr>
                  <td>보완 후 유지</td>
                  <td>진도·수준·자료·소통 등 개선 요구가 있는 경우</td>
                  <td>강의계획 보완, 수준별 안내·자료 제공 방식 개선</td>
                </tr>
                <tr>
                  <td>유지·모니터링</td>
                  <td>평균은 낮으나 응답 수가 적거나 의견이 제한적인 경우</td>
                  <td>다음 학기 중간 점검 및 자유의견 재확인</td>
                </tr>
              </tbody>
            </table>
          </>
        ) : (
          <p className="mt-1 text-ink-soft">응답 3명 이상 점검 대상 강좌가 없다.</p>
        )}

        {/* ── Ⅴ. 주관식 자유의견 분석 ── */}
        <SectionH num="Ⅴ" title="주관식 자유의견 및 불편사항 분석" />
        <p className="mt-2">
          자유의견은 무응답·‘없음’ 등 의미 없는 응답을 제외하고 내용 중심으로 유형화하였다. 만족 의견(E1 {commentCounts.E1}건)과 개선 의견(불만족 E5 {commentCounts.E5}건 + 개선 E2 {commentCounts.E2}건)을 각각 분류하였다.
        </p>

        <h3 className="mt-4">1. 만족 의견 주요 유형 (E1)</h3>
        <ChartBox>
          <CommentTypeChart
            data={satTypes.map((c) => ({ label: c.name, count: c.count }))}
          />
        </ChartBox>
        <CommentTable cats={satTypes} desc={SAT_DESC} />

        <h3 className="mt-4">2. 개선 의견 주요 유형 (E5·E2)</h3>
        <ChartBox>
          <CommentTypeChart
            data={impTypes.map((c) => ({ label: c.name, count: c.count }))}
            color="#f97316"
          />
        </ChartBox>
        <CommentTable cats={impTypes} desc={IMP_DESC} />
        <Note>자유의견은 하나의 응답에 여러 주제가 포함될 수 있어 중복 분류하였다.</Note>

        <h3 className="mt-4">3. 불편사항 및 개선 반영 내용</h3>
        <EditableNote
          slug={slug}
          sectionKey="improve_actions"
          draft={noteOf("improve_actions").draft}
          saved={noteOf("improve_actions").saved}
        />

        {e3Types.length > 0 && (
          <>
            <h3 className="mt-4">4. 2학기 개설 희망 강좌 (E3)</h3>
            <p className="mt-1">
              개설 희망 의견({commentCounts.E3}건)을 분야·운영방식 유형으로 분류한 것이다.
            </p>
            <ChartBox>
              <CommentTypeChart
                data={e3Types.map((c) => ({ label: c.name, count: c.count }))}
                color="#0d9488"
              />
            </ChartBox>
            <div className="avoid-break overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>희망 유형</th>
                    <th>언급 건수</th>
                    <th>대표 의견</th>
                  </tr>
                </thead>
                <tbody>
                  {e3Types.map((c) => (
                    <tr key={c.name}>
                      <td className="font-semibold">{c.name}</td>
                      <td className="text-center tabular-nums">{c.count}건</td>
                      <td className="text-[10px] text-ink-soft">
                        {c.samples[0]
                          ? `“${c.samples[0].replace(/\s+/g, " ").trim().slice(0, 50)}”`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Note>희망 의견은 하나에 여러 분야가 포함될 수 있어 중복 분류하였다.</Note>
          </>
        )}

        {/* ── Ⅵ. 차기 운영 개선 방향 ── */}
        <SectionH num="Ⅵ" title="2026학년도 2학기 운영 개선 방향" />
        <div className="mt-2">
          <EditableNote
            slug={slug}
            sectionKey="next_direction"
            draft={noteOf("next_direction").draft}
            saved={noteOf("next_direction").saved}
          />
        </div>

        {/* ── Ⅶ. 종합 의견 ── */}
        <SectionH num="Ⅶ" title="종합 의견" />
        <div className="mt-2">
          <EditableNote
            slug={slug}
            sectionKey="overall_opinion"
            draft={noteOf("overall_opinion").draft}
            saved={noteOf("overall_opinion").saved}
          />
        </div>

        {/* ── 붙임. 강좌·교수별 만족도 현황 ── */}
        <div className="appendix">
        <SectionH num="붙임" title="강좌·교수별 만족도 현황" breakBefore />
        <p className="mt-2 text-[11px]">
          응답 1건 이상 전체 강좌를 전체 평균 내림차순으로 정리한 것이다(척도 문항 평균 기준).
        </p>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>강좌명</th>
                <th>교수</th>
                <th>응답</th>
                <th>전체</th>
                <th>전반</th>
                <th>재수강</th>
                <th>추천</th>
                <th>환경</th>
                <th>비고</th>
              </tr>
            </thead>
            <tbody>
              {allCourseRows.map((c) => (
                <tr key={c.name}>
                  <td>
                    {c.name}
                    {dayNightSuffix(c, true)}
                  </td>
                  <td className="whitespace-nowrap">{c.professor ?? "-"}</td>
                  <td className="text-center tabular-nums">{c.total}</td>
                  <td className="text-center font-semibold tabular-nums">
                    {f2(c.overallAvg)}
                  </td>
                  <td className="text-center tabular-nums">{cv(c.core.overall)}</td>
                  <td className="text-center tabular-nums">{cv(c.core.retake)}</td>
                  <td className="text-center tabular-nums">
                    {cv(c.core.recommend)}
                  </td>
                  <td className="text-center tabular-nums">{cv(c.core.env)}</td>
                  <td>{c.tag}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Note>
          전체 평균은 척도 문항 평균이며, 비고는 보고서 작성 시점의 참고 기준이다. 최종 개설 여부는 수요·출석률·강좌 특성·강의실 여건 등을 종합 검토하여 결정한다.
        </Note>
        </div>
      </div>
    </div>
  );
}

// 핵심 지표 상위 문항 문구(강사 전문성 등 상위 3개 라벨).
function coreHigh(byCode: Record<string, ScaleStat>): string {
  const items = Object.values(byCode)
    .filter((s) => s.count > 0)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3)
    .map((s) => `${labelOf(s)}(${s.avg.toFixed(2)})`);
  return items.join(", ");
}

// 인구 구성 표 — 성별·연령대·지역(권역)별 인원·비율.
function DemoInsightTable({
  roster,
  regionRows,
}: {
  roster: RosterDemographics;
  regionRows: DistItem[];
}) {
  const rows: { group: string; items: DistItem[] }[] = [
    { group: "성별", items: roster.byGender },
    { group: "연령대", items: roster.byAgeBand },
    { group: "지역", items: regionRows },
  ];
  return (
    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>구분</th>
            <th>세부 항목</th>
            <th>인원</th>
            <th>비율</th>
          </tr>
        </thead>
        <tbody>
          {rows.flatMap((r) =>
            r.items.map((it, idx) => (
              <tr key={`${r.group}-${it.name}`}>
                {idx === 0 && (
                  <td rowSpan={r.items.length} className="text-center font-semibold">
                    {r.group}
                  </td>
                )}
                <td>{it.name}</td>
                <td className="text-center tabular-nums">
                  {it.count.toLocaleString()}명
                </td>
                <td className="text-center tabular-nums">
                  {pctOf(it.count, roster.total)}
                </td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}

// 자유의견 유형 표 — 유형·건수·정리 내용 + 대표의견 1건.
function CommentTable({
  cats,
  desc,
}: {
  cats: ClassifiedCat[];
  desc: Record<string, string>;
}) {
  return (
    <div className="avoid-break overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>의견 유형</th>
            <th>언급 건수</th>
            <th>정리 내용 및 대표 의견</th>
          </tr>
        </thead>
        <tbody>
          {cats.map((c) => (
            <tr key={c.name}>
              <td className="font-semibold">{c.name}</td>
              <td className="text-center tabular-nums">{c.count}건</td>
              <td>
                {desc[c.name] ?? ""}
                {c.samples[0] && (
                  <span className="mt-0.5 block text-[10px] text-ink-soft">
                    “{c.samples[0].replace(/\s+/g, " ").trim().slice(0, 60)}”
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

