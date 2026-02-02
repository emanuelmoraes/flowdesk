'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import { FaLink } from 'react-icons/fa6';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ content, onChange, placeholder = 'Digite aqui...' }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false, // Fix para SSR no Next.js
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: true,
        autolink: true,
        defaultProtocol: 'https',
        protocols: ['http', 'https'],
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-4 py-3',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Atualiza o conteúdo quando o prop content mudar
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const url = window.prompt('Digite a URL:');
    
    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-300 px-3 py-2 flex items-center gap-1 flex-wrap">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1 rounded hover:bg-gray-200 transition-colors font-bold text-sm ${
            editor.isActive('bold') ? 'bg-gray-300' : ''
          }`}
          title="Negrito (Ctrl+B)"
        >
          B
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1 rounded hover:bg-gray-200 transition-colors italic text-sm ${
            editor.isActive('italic') ? 'bg-gray-300' : ''
          }`}
          title="Itálico (Ctrl+I)"
        >
          I
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`px-3 py-1 rounded hover:bg-gray-200 transition-colors line-through text-sm ${
            editor.isActive('strike') ? 'bg-gray-300' : ''
          }`}
          title="Tachado"
        >
          S
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1 rounded hover:bg-gray-200 transition-colors text-sm ${
            editor.isActive('bulletList') ? 'bg-gray-300' : ''
          }`}
          title="Lista com marcadores"
        >
          • Lista
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-3 py-1 rounded hover:bg-gray-200 transition-colors text-sm ${
            editor.isActive('orderedList') ? 'bg-gray-300' : ''
          }`}
          title="Lista numerada"
        >
          1. Lista
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <button
          type="button"
          onClick={setLink}
          className={`px-3 py-1 rounded hover:bg-gray-200 transition-colors text-sm flex items-center gap-1 ${
            editor.isActive('link') ? 'bg-gray-300' : ''
          }`}
          title="Inserir/Editar link"
        >
          <FaLink className="inline-block" /> Link
        </button>

        {editor.isActive('link') && (
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            className="px-3 py-1 rounded hover:bg-gray-200 transition-colors text-sm text-red-600"
            title="Remover link"
          >
            ✕ Remover
          </button>
        )}
      </div>

      {/* Editor */}
      <EditorContent editor={editor} className="bg-white" />
    </div>
  );
}
