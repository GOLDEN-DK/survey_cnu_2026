// 설문 결과보고서 — 운영 DB를 재집계해 A4 인쇄용 보고서로 렌더한다(브라우저 인쇄로 PDF 저장).

import { notFound } from "next/navigation";
import "./report.css";
import { getReportData, type CourseRow } from "@/lib/report-data";
import { labelOf } from "@/lib/report-rules";
import type { ScaleStat, GroupStat, DistItem, RosterDemographics } from "@/lib/admin-stats";
import type { RateRow } from "@/lib/report-rules";
import type { ClassifiedCat } from "@/lib/comment-classify";
import {
  GroupAvgBarChart,
  ScaleDistStackedChart,
  DemoCompareChart,
  CommentTypeChart,
  CourseRankChart,
} from "@/components/admin/report-charts";
import { EditableNote } from "./EditableNote";
import { PrintButton } from "./PrintButton";
import {
  REPORT_SECTION_TITLES,
  type ReportSectionKey,
} from "@/lib/report-draft";

export const dynamic = "force-dynamic";

const f2 = (n: number) => n.toFixed(2);
const cv = (n: number | null) => (n == null ? "-" : n.toFixed(2));
const pctOf = (n: number, total: number) =>
  total ? `${((n / total) * 100).toFixed(1)}%` : "0.0%";
const dfmt = (d: Date | null) =>
  d ? d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }) : "-";
const courseLabel = (c: { name: string; professor: string | null }) =>
  `${c.name}${c.professor ? ` (${c.professor})` : ""}`;

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
    <div className="avoid-break overflow-x-auto">
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
                {c.dayNight ? ` · ${c.dayNight}` : ""}
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
    commentCounts,
    e3Samples,
    rateByGender,
    rateByAge,
    rateByTime,
    insights,
    gapCommentary,
    rateCommentary,
    notes,
  } = data;

  const byCode: Record<string, ScaleStat> = Object.fromEntries(
    scales.map((s) => [s.code, s]),
  );
  const avgOf = (code: string) => (byCode[code] ? byCode[code].avg : null);
  const noteOf = (key: ReportSectionKey) => notes.find((n) => n.key === key)!;

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
  const groupSat = (rows: GroupStat[]) =>
    rows.filter((r) => r.count > 0).map((r) => ({ label: r.name, avg: r.avg }));
  const rateChart = (rows: RateRow[]) =>
    rows.map((r) => ({
      label: r.name,
      enrolled: r.enrolled,
      responded: r.responded,
      rate: r.rate,
    }));

  const satTypes = satisfyCats
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
  const impTypes = improveCats
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  const a4 = [...(stats.choices[0]?.options ?? [])].sort(
    (a, b) => b.count - a.count,
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
        {/* ── 표지 ── */}
        <div className="avoid-break flex min-h-[240px] flex-col items-center justify-center py-8 text-center">
          <p className="text-base font-bold text-[#1e3a8a]">
            충남대학교 평생교육원
          </p>
          <h1 className="mt-6">{survey.title}</h1>
          <p className="mt-2 text-lg font-semibold">결과보고서</p>
          <p className="mt-1 text-[13px] text-[#2f5496]">
            강좌·교수별 만족도 및 교육환경 개선사항 분석 중심
          </p>

          <div className="mt-6 w-full overflow-hidden avoid-break">
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
          <p className="mt-6 text-sm font-semibold">
            {dfmt(survey.endAt) !== "-" ? dfmt(survey.endAt) : ""} 기준
          </p>
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
        <div className="avoid-break overflow-x-auto">
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
            <SectionH num="Ⅲ" title="응답자 및 수강 목적 현황" breakBefore />
            <h3 className="mt-3">1. 전체 수강생 인구통계</h3>
            <p className="mt-1">
              전체 수강생 {roster.total.toLocaleString()}명 기준으로 성별·연령대·지역 구성은 다음과 같으며, 명단 대비 실제 응답 비율(응답률)을 함께 확인하였다.
            </p>
            <div className="grid grid-cols-1 gap-2">
              <ChartBox>
                <p className="mb-1 text-center text-[11px] font-semibold text-ink-soft">
                  성별 · 명단 대비 응답
                </p>
                <DemoCompareChart data={rateChart(rateByGender)} />
              </ChartBox>
              <ChartBox>
                <p className="mb-1 text-center text-[11px] font-semibold text-ink-soft">
                  연령대 · 명단 대비 응답
                </p>
                <DemoCompareChart data={rateChart(rateByAge)} />
              </ChartBox>
              {rateByTime.length > 0 && (
                <ChartBox>
                  <p className="mb-1 text-center text-[11px] font-semibold text-ink-soft">
                    시간대(주간/야간) · 명단 대비 응답
                  </p>
                  <DemoCompareChart data={rateChart(rateByTime)} />
                </ChartBox>
              )}
            </div>
            <p className="mt-1">{rateCommentary}</p>

            <DemoInsightTable
              roster={roster}
              insights={insights}
            />

            <h3 className="mt-4">2. 집단별 만족도 비교</h3>
            <div className="grid grid-cols-1 gap-2">
              <ChartBox>
                <p className="mb-1 text-center text-[11px] font-semibold text-ink-soft">
                  성별 만족도
                </p>
                <GroupAvgBarChart data={groupSat(stats.byGender)} />
              </ChartBox>
              <ChartBox>
                <p className="mb-1 text-center text-[11px] font-semibold text-ink-soft">
                  연령대별 만족도
                </p>
                <GroupAvgBarChart data={groupSat(stats.byAgeBand)} />
              </ChartBox>
              {stats.byTime.length > 0 && (
                <ChartBox>
                  <p className="mb-1 text-center text-[11px] font-semibold text-ink-soft">
                    시간대별 만족도
                  </p>
                  <GroupAvgBarChart data={groupSat(stats.byTime)} />
                </ChartBox>
              )}
            </div>
            <ul className="mt-1 flex list-none flex-col gap-1">
              <li className="pl-4 -indent-4">· 성별 — {gapCommentary.gender}</li>
              <li className="pl-4 -indent-4">· 연령대 — {gapCommentary.age}</li>
              {stats.byTime.length > 0 && (
                <li className="pl-4 -indent-4">· 시간대 — {gapCommentary.time}</li>
              )}
            </ul>

            <h3 className="mt-4">3. 수강 목적 (복수 응답)</h3>
            <div className="avoid-break overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>수강 목적</th>
                    <th>선택 건수</th>
                    <th>응답자 대비 비율</th>
                  </tr>
                </thead>
                <tbody>
                  {a4.map((o) => (
                    <tr key={o.label}>
                      <td>{o.label}</td>
                      <td className="text-center tabular-nums">{o.count}건</td>
                      <td className="text-center tabular-nums">
                        {pctOf(o.count, stats.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Note>
              수강 목적은 복수 선택 문항이므로 선택 건수 합계는 응답 수와 일치하지 않는다.
            </Note>
          </>
        )}

        {/* ── Ⅳ. 강좌·교수별 만족도 분석 ── */}
        <SectionH num="Ⅳ" title="강좌·교수별 만족도 분석" breakBefore />
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
        <SectionH num="Ⅴ" title="주관식 자유의견 및 불편사항 분석" breakBefore />
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
          title={REPORT_SECTION_TITLES.improve_actions}
          draft={noteOf("improve_actions").draft}
          saved={noteOf("improve_actions").saved}
        />

        {e3Samples.length > 0 && (
          <>
            <h3 className="mt-4">4. 2학기 개설 희망 강좌 (E3)</h3>
            <p className="mt-1">개설 희망({commentCounts.E3}건) 원문 일부이다.</p>
            <ul className="mt-1 flex list-none flex-col gap-1">
              {e3Samples.map((t, i) => (
                <li key={i} className="pl-4 -indent-4 text-[12px] text-ink-soft">
                  · {t}
                </li>
              ))}
            </ul>
          </>
        )}

        {/* ── Ⅵ. 차기 운영 개선 방향 ── */}
        <SectionH num="Ⅵ" title="2026학년도 2학기 운영 개선 방향" breakBefore />
        <div className="mt-2">
          <EditableNote
            slug={slug}
            sectionKey="next_direction"
            title={REPORT_SECTION_TITLES.next_direction}
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
            title={REPORT_SECTION_TITLES.overall_opinion}
            draft={noteOf("overall_opinion").draft}
            saved={noteOf("overall_opinion").saved}
          />
        </div>

        {/* ── 붙임 1. 강좌·교수별 만족도 현황 ── */}
        <SectionH num="붙임 1" title="강좌·교수별 만족도 현황" breakBefore />
        <p className="mt-2 text-[12px]">
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
                    {c.dayNight ? ` (${c.dayNight})` : ""}
                  </td>
                  <td>{c.professor ?? "-"}</td>
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

        {/* ── 붙임 2. 수강생 인구통계 ── */}
        {roster && (
          <>
            <SectionH num="붙임 2" title="수강생 인구통계" breakBefore />
            <p className="mt-2 text-[12px]">
              전체 수강생 {roster.total.toLocaleString()}명 기준(응답 여부와 무관한 명단 전체).
            </p>
            <div className="avoid-break overflow-x-auto">
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
                  <DistRows label="성별" items={roster.byGender} total={roster.total} />
                  <DistRows
                    label="연령대"
                    items={roster.byAgeBand}
                    total={roster.total}
                  />
                  <DistRows label="지역" items={roster.byRegion} total={roster.total} />
                </tbody>
              </table>
            </div>

            <h3 className="mt-4">성별 × 연령대 교차 (단위: 명)</h3>
            <div className="avoid-break overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>성별＼연령대</th>
                    {roster.genderAge.colLabels.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                    <th>계</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.genderAge.rowLabels.map((r, i) => (
                    <tr key={r}>
                      <td className="text-center font-semibold">{r}</td>
                      {roster.genderAge.colLabels.map((c, j) => (
                        <td key={c} className="text-center tabular-nums">
                          {roster.genderAge.counts[i][j]}
                        </td>
                      ))}
                      <td className="text-center font-semibold tabular-nums">
                        {roster.genderAge.rowTotals[i]}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="text-center font-semibold">계</td>
                    {roster.genderAge.colTotals.map((t, j) => (
                      <td key={j} className="text-center font-semibold tabular-nums">
                        {t}
                      </td>
                    ))}
                    <td className="text-center font-semibold tabular-nums">
                      {roster.total}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
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

// 인구 해석 포인트 표 — 성별·연령대·지역 각 행에 해석 문구를 붙인다.
function DemoInsightTable({
  roster,
  insights,
}: {
  roster: RosterDemographics;
  insights: {
    gender: Record<string, string>;
    age: Record<string, string>;
    region: Record<string, string>;
  };
}) {
  const rows: { group: string; items: DistItem[]; map: Record<string, string> }[] =
    [
      { group: "성별", items: roster.byGender, map: insights.gender },
      { group: "연령대", items: roster.byAgeBand, map: insights.age },
      { group: "지역", items: roster.byRegion, map: insights.region },
    ];
  return (
    <div className="avoid-break overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>구분</th>
            <th>세부 항목</th>
            <th>인원</th>
            <th>비율</th>
            <th>해석 및 활용 포인트</th>
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
                <td>{r.map[it.name] ?? ""}</td>
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
                  <span className="mt-0.5 block text-[11px] text-ink-soft">
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

// 붙임2 분포 행 — 구분 셀을 rowSpan으로 묶는다.
function DistRows({
  label,
  items,
  total,
}: {
  label: string;
  items: DistItem[];
  total: number;
}) {
  return (
    <>
      {items.map((it, idx) => (
        <tr key={`${label}-${it.name}`}>
          {idx === 0 && (
            <td rowSpan={items.length} className="text-center font-semibold">
              {label}
            </td>
          )}
          <td>{it.name}</td>
          <td className="text-center tabular-nums">
            {it.count.toLocaleString()}명
          </td>
          <td className="text-center tabular-nums">{pctOf(it.count, total)}</td>
        </tr>
      ))}
    </>
  );
}
