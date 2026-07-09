"use client";
// 결과보고서 서술 섹션용 리치 에디터 — 굵게·기울임·목록·표를 지원하고 현재 HTML을 상위로 전달한다.

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import { useEffect } from "react";

// 표 노드에 행 간격(density)·열 간격(colgap) 속성 추가 — data-density/data-colgap로
// 저장·렌더되어 report.css가 셀의 상·하(행)·좌·우(열) 여백과 줄간격을 조절한다.
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
      colgap: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-colgap"),
        renderHTML: (attributes: { colgap?: string | null }) =>
          attributes.colgap ? { "data-colgap": attributes.colgap } : {},
      },
    };
  },
}).configure({ resizable: false });

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

export function NoteEditor({
  initialHtml,
  onChange,
}: {
  initialHtml: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit, TableWithDensity, TableRow, TableHeader, TableCell],
    content: initialHtml || "<p></p>",
    immediatelyRender: false, // Next SSR hydration mismatch 방지
    editorProps: { attributes: { class: "note-editor-content" } },
    onUpdate: ({ editor }: { editor: Editor }) => onChange(editor.getHTML()),
  });

  // 최초 초기화 시 현재 HTML을 상위에 반영(수정 없이 바로 저장해도 값이 비지 않도록).
  useEffect(() => {
    if (editor) onChange(editor.getHTML());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // 표 density·colgap을 라이브 DOM에 동기화 — TableView가 노드 attr를 DOM에 반영하지 않아
  // 매 업데이트마다 문서 순서대로 table 요소에 data-density/data-colgap를 직접 붙여 실시간 미리보기를 만든다.
  useEffect(() => {
    if (!editor) return;
    const sync = () => {
      const tables = editor.view.dom.querySelectorAll("table");
      let i = 0;
      editor.state.doc.descendants((node) => {
        if (node.type.name === "table") {
          const el = tables[i++];
          if (el) {
            const d = node.attrs.density as string | null;
            if (d) el.setAttribute("data-density", d);
            else el.removeAttribute("data-density");
            const cg = node.attrs.colgap as string | null;
            if (cg) el.setAttribute("data-colgap", cg);
            else el.removeAttribute("data-colgap");
          }
        }
      });
    };
    editor.on("update", sync);
    sync();
    return () => {
      editor.off("update", sync);
    };
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-line">
      <div className="flex flex-wrap items-center gap-1 border-b border-line p-1.5">
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
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().updateAttributes("table", { density: "tight" }).run()
          }
          active={editor.isActive("table", { density: "tight" })}
        >
          행 좁게
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().updateAttributes("table", { density: null }).run()
          }
        >
          행 보통
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().updateAttributes("table", { density: "loose" }).run()
          }
          active={editor.isActive("table", { density: "loose" })}
        >
          행 넓게
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-line" />
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().updateAttributes("table", { colgap: "tight" }).run()
          }
          active={editor.isActive("table", { colgap: "tight" })}
        >
          열 좁게
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().updateAttributes("table", { colgap: null }).run()
          }
        >
          열 보통
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().updateAttributes("table", { colgap: "loose" }).run()
          }
          active={editor.isActive("table", { colgap: "loose" })}
        >
          열 넓게
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
