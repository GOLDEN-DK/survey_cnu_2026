"use client";
// 결과보고서 서술 섹션용 리치 에디터 — 굵게·기울임·글자색·목록·표(행/열 간격 조절)를 지원하고 현재 HTML을 상위로 전달한다.

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import { TableMap } from "@tiptap/pm/tables";
import { useEffect, useReducer } from "react";

// 셀 노드에 열 간격(colgap) 속성을 더하는 확장 팩토리 — data-colgap로 저장·렌더된다.
function withColgap<T extends { extend: (c: object) => T }>(base: T): T {
  return base.extend({
    addAttributes(this: { parent?: () => object }) {
      return {
        ...(this.parent?.() || {}),
        colgap: {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute("data-colgap"),
          renderHTML: (attributes: { colgap?: string | null }) =>
            attributes.colgap ? { "data-colgap": attributes.colgap } : {},
        },
      };
    },
  });
}

// 표 노드에 행 간격(density) 속성 추가 — 표 전체의 상·하 여백·줄간격을 조절한다.
const TableWithDensity = Table.extend({
  addAttributes() {
    return {
      ...(this.parent?.() || {}),
      density: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-density"),
        renderHTML: (attributes: { density?: string | null }) =>
          attributes.density ? { "data-density": attributes.density } : {},
      },
    };
  },
}).configure({ resizable: false });

const CellWithColgap = withColgap(TableCell);
const HeaderWithColgap = withColgap(TableHeader);

// 글자색 팔레트(보고서 톤에 맞춘 소수 색상). value=null 은 기본색 복귀.
const COLORS: { name: string; value: string | null }[] = [
  { name: "기본", value: null },
  { name: "남색", value: "#1e3a8a" },
  { name: "빨강", value: "#c0392b" },
  { name: "초록", value: "#1e7f4f" },
  { name: "회색", value: "#6b7280" },
];

// 형광펜(하이라이트) 팔레트. value=null 은 형광 제거.
const HIGHLIGHTS: { name: string; value: string | null }[] = [
  { name: "없음", value: null },
  { name: "노랑", value: "#fff176" },
  { name: "초록", value: "#b9f6ca" },
  { name: "분홍", value: "#ff8ab4" },
  { name: "파랑", value: "#80d8ff" },
];

function ToolbarButton({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rounded border border-line px-2 py-1 text-xs hover:bg-slate-50 ${
        active ? "bg-slate-200 font-semibold" : ""
      }`}
    >
      {children}
    </button>
  );
}

function SpacingSelect({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <select
      title={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="rounded border border-line px-1.5 py-1 text-xs text-ink disabled:opacity-40"
    >
      <option value="normal">{label} 보통</option>
      <option value="tight">{label} 좁게</option>
      <option value="loose">{label} 넓게</option>
    </select>
  );
}

export function NoteEditor({
  initialHtml,
  onChange,
}: {
  initialHtml: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TableWithDensity,
      TableRow,
      HeaderWithColgap,
      CellWithColgap,
    ],
    content: initialHtml || "<p></p>",
    immediatelyRender: false, // Next SSR hydration mismatch 방지
    editorProps: { attributes: { class: "note-editor-content" } },
    onUpdate: ({ editor }: { editor: Editor }) => onChange(editor.getHTML()),
  });

  // useEditor는 선택 변경 시 자동 리렌더하지 않으므로, 트랜잭션마다 툴바 상태를 갱신한다
  // (활성 표시·간격 select 값·표 안 여부 반영).
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (!editor) return;
    editor.on("transaction", rerender);
    return () => {
      editor.off("transaction", rerender);
    };
  }, [editor]);

  // 최초 초기화 시 현재 HTML을 상위에 반영(수정 없이 바로 저장해도 값이 비지 않도록).
  useEffect(() => {
    if (editor) onChange(editor.getHTML());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // 표 density(표)·colgap(셀)을 라이브 DOM에 동기화 — TableView가 노드 attr를 DOM에
  // 반영하지 않아, 매 업데이트마다 문서 순서대로 table/셀 요소에 직접 붙여 실시간 미리보기를 만든다.
  useEffect(() => {
    if (!editor) return;
    const sync = () => {
      const tables = editor.view.dom.querySelectorAll("table");
      const cells = editor.view.dom.querySelectorAll("td, th");
      let ti = 0;
      let ci = 0;
      editor.state.doc.descendants((node) => {
        const n = node.type.name;
        if (n === "table") {
          const el = tables[ti++];
          if (el) {
            const d = node.attrs.density as string | null;
            if (d) el.setAttribute("data-density", d);
            else el.removeAttribute("data-density");
          }
        } else if (n === "tableCell" || n === "tableHeader") {
          const el = cells[ci++];
          if (el) {
            const cg = node.attrs.colgap as string | null;
            if (cg) el.setAttribute("data-colgap", cg);
            else el.removeAttribute("data-colgap");
          }
        }
        return true;
      });
    };
    editor.on("update", sync);
    sync();
    return () => {
      editor.off("update", sync);
    };
  }, [editor]);

  if (!editor) return null;

  const inTable = editor.isActive("table");

  // 행 간격(표 전체) — density 속성.
  const applyDensity = (value: string) =>
    editor
      .chain()
      .focus()
      .updateAttributes("table", { density: value === "normal" ? null : value })
      .run();
  const currentDensity = editor.isActive("table", { density: "tight" })
    ? "tight"
    : editor.isActive("table", { density: "loose" })
      ? "loose"
      : "normal";

  // 열 간격(커서가 있는 열의 셀 전체) — colgap 속성을 그 열의 모든 셀에 적용.
  const applyColumnColgap = (value: string) => {
    const attr = value === "normal" ? null : value;
    editor
      .chain()
      .focus()
      .command(({ tr, state }) => {
        const $from = state.selection.$from;
        let cellDepth = -1;
        let tableDepth = -1;
        for (let d = $from.depth; d > 0; d--) {
          const name = $from.node(d).type.name;
          if (cellDepth === -1 && (name === "tableCell" || name === "tableHeader"))
            cellDepth = d;
          if (name === "table") {
            tableDepth = d;
            break;
          }
        }
        if (cellDepth === -1 || tableDepth === -1) return false;
        const tableNode = $from.node(tableDepth);
        const tableStart = $from.before(tableDepth) + 1;
        const map = TableMap.get(tableNode);
        const col = map.colCount($from.before(cellDepth) - tableStart);
        const seen = new Set<number>();
        for (let row = 0; row < map.height; row++) {
          const pos = tableStart + map.map[row * map.width + col];
          if (seen.has(pos)) continue;
          seen.add(pos);
          tr.setNodeAttribute(pos, "colgap", attr);
        }
        return true;
      })
      .run();
  };
  const colgapActive = (v: string) =>
    editor.isActive("tableCell", { colgap: v }) ||
    editor.isActive("tableHeader", { colgap: v });
  const currentColgap = colgapActive("tight")
    ? "tight"
    : colgapActive("loose")
      ? "loose"
      : "normal";

  return (
    <div className="rounded-lg border border-line">
      <div className="flex flex-wrap items-center gap-1 border-b border-line p-1.5">
        {/* 글자 서식 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
        >
          굵게
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
        >
          기울임
        </ToolbarButton>
        <span className="ml-1 text-[11px] text-ink-soft">글자색</span>
        {COLORS.map((c) => (
          <button
            key={c.name}
            type="button"
            title={`글자색 ${c.name}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              c.value
                ? editor.chain().focus().setColor(c.value).run()
                : editor.chain().focus().unsetColor().run()
            }
            className="h-5 w-5 rounded border border-line"
            style={{ backgroundColor: c.value ?? "#111827" }}
          />
        ))}

        <span className="ml-1 text-[11px] text-ink-soft">형광</span>
        {HIGHLIGHTS.map((h) => (
          <button
            key={h.name}
            type="button"
            title={`형광 ${h.name}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              h.value
                ? editor.chain().focus().setHighlight({ color: h.value }).run()
                : editor.chain().focus().unsetHighlight().run()
            }
            className="h-5 w-5 rounded border border-line"
            style={
              h.value
                ? { backgroundColor: h.value }
                : {
                    background:
                      "linear-gradient(to top right, transparent 45%, #ef4444 45%, #ef4444 55%, transparent 55%)",
                  }
            }
          />
        ))}

        <span className="mx-1 h-4 w-px bg-line" />
        {/* 목록 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
        >
          • 목록
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
        >
          1. 목록
        </ToolbarButton>

        <span className="mx-1 h-4 w-px bg-line" />
        {/* 표 */}
        <ToolbarButton
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        >
          표 삽입
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()}>
          행+
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()}>
          열+
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().deleteRow().run()}>
          행−
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().deleteColumn().run()}>
          열−
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()}>
          표 삭제
        </ToolbarButton>

        <span className="mx-1 h-4 w-px bg-line" />
        {/* 간격(표 안에서만) */}
        <SpacingSelect
          label="행 간격"
          value={currentDensity}
          disabled={!inTable}
          onChange={applyDensity}
        />
        <SpacingSelect
          label="열 간격"
          value={currentColgap}
          disabled={!inTable}
          onChange={applyColumnColgap}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
