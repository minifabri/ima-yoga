"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Bold, Italic, List, ListOrdered, Heading2, Link as LinkIcon, Link2Off } from "lucide-react";
import { COLORS, withAlpha } from "./colors";

function ToolbarButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex items-center justify-center rounded-md"
      style={{
        width: 28,
        height: 28,
        background: active ? withAlpha(COLORS.primary, 16) : "transparent",
        color: active ? COLORS.primaryDark : COLORS.ink,
      }}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  minHeight = 140,
}: {
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
}) {
  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false, autolink: true })],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        style: `min-height: ${minHeight}px; outline: none; font-size: 13px; line-height: 1.5; color: ${COLORS.ink}`,
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  function setLink() {
    const previousUrl = editor!.getAttributes("link").href as string | undefined;
    const url = window.prompt("Indirizzo del link (es. https://…)", previousUrl || "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor!.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor!.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  return (
    <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 9, overflow: "hidden" }}>
      <div className="flex items-center gap-0.5 p-1.5" style={{ borderBottom: `1px solid ${COLORS.border}`, background: COLORS.subtle }}>
        <ToolbarButton title="Grassetto" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={14} />
        </ToolbarButton>
        <ToolbarButton title="Corsivo" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={14} />
        </ToolbarButton>
        <ToolbarButton title="Titolo" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={14} />
        </ToolbarButton>
        <ToolbarButton title="Elenco puntato" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={14} />
        </ToolbarButton>
        <ToolbarButton title="Elenco numerato" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={14} />
        </ToolbarButton>
        <ToolbarButton title="Inserisci link" active={editor.isActive("link")} onClick={setLink}>
          <LinkIcon size={14} />
        </ToolbarButton>
        {editor.isActive("link") && (
          <ToolbarButton title="Rimuovi link" active={false} onClick={() => editor.chain().focus().unsetLink().run()}>
            <Link2Off size={14} />
          </ToolbarButton>
        )}
      </div>
      <div className="px-3 py-2 rich-content">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
