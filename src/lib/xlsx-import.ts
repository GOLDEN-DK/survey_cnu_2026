// 업로드된 .xls/.xlsx(설강과목·수강생 명단)을 파싱해 정규화된 행으로 변환한다 (서버 전용).
// 헤더 위치/컬럼 순서가 바뀌어도 견디도록 키워드로 헤더행과 컬럼을 탐지한다.

import * as XLSX from "xlsx";

export type ParsedCourse = {
  orderNo: number;
  name: string; // 교과목명 (수강생 명단과 조인하는 키)
  professor: string; // 담당교수명
  schedule: string | null; // 강의시간 텍스트
  dayNight: string | null; // 주간/야간
};

export type ParsedEnrollment = {
  courseName: string; // 교과목명(과목명)
  name: string; // 수강생 이름(성명)
  phone: string; // 정규화된 연락처(숫자만)
  gender: string | null; // "남"/"여"
  birthDate: string | null; // 생년월일(숫자만, YYYYMMDD)
  address: string | null; // 주소 원본
  email: string | null; // 이메일 원본
};

type Cell = string | number | boolean | null | undefined;
type Row = Cell[];

function readRows(buf: ArrayBuffer): Row[] {
  const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Row>(sheet, { header: 1, defval: null, blankrows: false });
}

function text(c: Cell): string {
  return c == null ? "" : String(c).trim();
}

// 주어진 키워드를 모두 포함하는 첫 행을 헤더로 본다.
function findHeaderRow(rows: Row[], keywords: string[]): number {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const joined = rows[i].map(text).join("|");
    if (keywords.every((k) => joined.includes(k))) return i;
  }
  return -1;
}

// 헤더행에서 키워드를 포함하는 컬럼 인덱스를 찾는다.
function colOf(header: Row, keyword: string): number {
  return header.findIndex((c) => text(c).includes(keyword));
}

// 여러 후보 키워드 중 먼저 매칭되는 컬럼 인덱스 (신·구 형식 컬럼명 호환).
function colOfAny(header: Row, keywords: string[]): number {
  for (const k of keywords) {
    const i = header.findIndex((c) => text(c).includes(k));
    if (i >= 0) return i;
  }
  return -1;
}

// 각 그룹(OR 후보)을 모두 충족하는 첫 행을 헤더로 본다.
function findHeaderRowAny(rows: Row[], groups: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const joined = rows[i].map(text).join("|");
    if (groups.every((g) => g.some((k) => joined.includes(k)))) return i;
  }
  return -1;
}

// "권택호 : \n(화19:00~21:00)" → { professor: "권택호", schedule: "화19:00~21:00" }
function parseProfessor(cell: string): { professor: string; schedule: string | null } {
  const raw = cell.replace(/\r/g, "");
  const idx = raw.indexOf(":");
  if (idx < 0) {
    return { professor: raw.replace(/\s+/g, " ").trim(), schedule: null };
  }
  const professor = raw.slice(0, idx).replace(/\s+/g, " ").trim();
  const rest = raw
    .slice(idx + 1)
    .replace(/[()\n]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { professor, schedule: rest || null };
}

// 연락처에서 숫자만 남긴다 (010-1234-5678 → 01012345678).
export function normalizePhone(s: string): string {
  return text(s).replace(/\D/g, "");
}

// 생년월일에서 숫자만 남긴다 (1972-12-13 → 19721213). 빈 값은 null.
function normalizeBirth(s: string): string | null {
  const d = text(s).replace(/\D/g, "");
  return d || null;
}

export function parseCoursesXls(buf: ArrayBuffer): ParsedCourse[] {
  const rows = readRows(buf);
  const h = findHeaderRow(rows, ["교과목명", "교수"]);
  if (h < 0) throw new Error("설강과목 파일에서 '교과목명'/'담당교수' 헤더를 찾지 못했습니다.");

  const header = rows[h];
  const cName = colOf(header, "교과목명");
  const cProf = colOf(header, "교수");
  const cDayNight = colOf(header, "주"); // "주/야"
  if (cName < 0 || cProf < 0) {
    throw new Error("설강과목 파일의 교과목명/담당교수 컬럼을 찾지 못했습니다.");
  }

  const out: ParsedCourse[] = [];
  const seen = new Set<string>();
  for (let i = h + 1; i < rows.length; i++) {
    const name = text(rows[i][cName]);
    if (!name) continue;
    if (seen.has(name)) continue; // 교과목명 중복 행 방지
    seen.add(name);
    const { professor, schedule } = parseProfessor(text(rows[i][cProf]));
    out.push({
      orderNo: out.length + 1,
      name,
      professor,
      schedule,
      dayNight: cDayNight >= 0 ? text(rows[i][cDayNight]) || null : null,
    });
  }
  if (out.length === 0) throw new Error("설강과목 데이터 행이 없습니다.");
  return out;
}

// 수강생 명단 파싱 — 새 형식(과목명·성명·ID·성별·핸드폰번호·생년월일·주소·이메일) 기준.
// 컬럼명은 구 형식(교과목명·이름·연락처)도 견디도록 후보 키워드로 탐지한다.
export function parseEnrollmentsXls(buf: ArrayBuffer): ParsedEnrollment[] {
  const rows = readRows(buf);
  const h = findHeaderRowAny(rows, [
    ["과목명", "교과목명"],
    ["성명", "이름"],
    ["핸드폰", "연락처", "전화"],
  ]);
  if (h < 0)
    throw new Error("수강생 명단 파일에서 '과목명/성명/핸드폰번호' 헤더를 찾지 못했습니다.");

  const header = rows[h];
  const cCourse = colOfAny(header, ["과목명", "교과목명"]);
  const cName = colOfAny(header, ["성명", "이름"]);
  const cGender = colOfAny(header, ["성별"]);
  const cPhone = colOfAny(header, ["핸드폰", "연락처", "전화"]);
  const cBirth = colOfAny(header, ["생년월일", "생일"]);
  const cAddr = colOfAny(header, ["주소"]);
  const cEmail = colOfAny(header, ["이메일", "메일", "email", "E-mail"]);
  if (cCourse < 0 || cName < 0 || cPhone < 0) {
    throw new Error("수강생 명단의 과목명/성명/핸드폰번호 컬럼을 찾지 못했습니다.");
  }

  const out: ParsedEnrollment[] = [];
  for (let i = h + 1; i < rows.length; i++) {
    const courseName = text(rows[i][cCourse]);
    const name = text(rows[i][cName]);
    const phone = normalizePhone(text(rows[i][cPhone]));
    if (!courseName || !name || !phone) continue;
    out.push({
      courseName,
      name,
      phone,
      gender: cGender >= 0 ? text(rows[i][cGender]) || null : null,
      birthDate: cBirth >= 0 ? normalizeBirth(text(rows[i][cBirth])) : null,
      address: cAddr >= 0 ? text(rows[i][cAddr]) || null : null,
      email: cEmail >= 0 ? text(rows[i][cEmail]) || null : null,
    });
  }
  if (out.length === 0) throw new Error("수강생 명단 데이터 행이 없습니다.");
  return out;
}
