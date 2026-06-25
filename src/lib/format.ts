// 화면 표시용 포맷 유틸 — 연락처 등 출력 형식 변환

// 연락처 포맷 — 01012345678 → 010-1234-5678 (마스킹 없이 전체 표시)
export function formatPhone(phone: string): string {
  if (phone.length === 11)
    return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
  if (phone.length === 10)
    return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
  return phone;
}
