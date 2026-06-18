"use client";
// 설문 응답 링크와 QR 코드 — 관리자가 복사·저장해 배포할 수 있도록 제공한다.

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

export function ShareLink({ slug }: { slug: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const qrWrapRef = useRef<HTMLDivElement>(null);

  // 현재 접속한 도메인을 기준으로 링크를 만든다(로컬·배포 자동 대응).
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = origin ? `${origin}/s/${slug}` : "";

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없으면 사용자가 직접 선택해 복사한다.
    }
  };

  const download = () => {
    const canvas = qrWrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `survey-qr-${slug}.png`;
    a.click();
  };

  return (
    <div className="flex max-w-md flex-col gap-4 rounded-xl border border-line bg-white p-4">
      <h3 className="text-sm font-semibold text-ink">응답 링크 · QR</h3>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-ink">응답 링크</span>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
            className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          />
          <button
            type="button"
            onClick={copy}
            disabled={!url}
            className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand disabled:opacity-60"
          >
            {copied ? "복사됨" : "복사"}
          </button>
        </div>
      </div>

      <div className="flex flex-col items-start gap-2">
        <span className="text-sm font-semibold text-ink">QR 코드</span>
        <div
          ref={qrWrapRef}
          className="rounded-lg border border-line bg-white p-3"
        >
          {url ? (
            <QRCodeCanvas value={url} size={160} marginSize={2} />
          ) : (
            <div className="h-[160px] w-[160px]" />
          )}
        </div>
        <button
          type="button"
          onClick={download}
          disabled={!url}
          className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
        >
          QR 이미지 저장 (PNG)
        </button>
      </div>

      <p className="text-xs text-ink-soft">
        이 링크·QR로 접속하면 본인확인(성함·휴대폰) 후 설문에 참여합니다.
      </p>
    </div>
  );
}
