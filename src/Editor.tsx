import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { useEffect } from 'react'
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Heading1,
    Heading2,
    List,
    ListOrdered,
    ListChecks,
    Quote,
    Code,
    FileCode,
} from 'lucide-react'

interface Props {
    content: string
    onChange: (html: string) => void
}

export default function Editor({ content, onChange }: Props) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2] },
            }),
            Underline,
            TaskList,
            TaskItem.configure({ nested: true }),
        ],
        content: content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
    })

    useEffect(() => {
        if (editor && editor.getHTML() !== content) {
            editor.commands.setContent(content)
        }
    }, [content, editor])

    if (!editor) return null

    // Перехватываем клик ДО того, как браузер поставит туда курсор.
    // Если кликнули по инлайн-коду (не внутри блока кода) - копируем его текст
    // вместо обычного редактирования, и "гасим" стандартное поведение клика.
    function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
        const target = e.target as HTMLElement
        const codeEl = target.closest('code')
        if (codeEl && !codeEl.closest('pre') && codeEl.textContent) {
            e.preventDefault()
            navigator.clipboard.writeText(codeEl.textContent)
            codeEl.classList.add('copied')
            setTimeout(() => codeEl.classList.remove('copied'), 350)
        }
    }

    return (
        <div>
            <div className="toolbar">
                <button
                    className={editor.isActive('bold') ? 'is-active' : ''}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    title="Жирный"
                >
                    <Bold size={15} />
                </button>
                <button
                    className={editor.isActive('italic') ? 'is-active' : ''}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    title="Курсив"
                >
                    <Italic size={15} />
                </button>
                <button
                    className={editor.isActive('underline') ? 'is-active' : ''}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    title="Подчёркнутый"
                >
                    <UnderlineIcon size={15} />
                </button>
                <button
                    className={editor.isActive('strike') ? 'is-active' : ''}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    title="Зачёркнутый"
                >
                    <Strikethrough size={15} />
                </button>

                <span className="toolbar-sep" />

                <button
                    className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    title="Заголовок 1"
                >
                    <Heading1 size={15} />
                </button>
                <button
                    className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    title="Заголовок 2"
                >
                    <Heading2 size={15} />
                </button>

                <span className="toolbar-sep" />

                <button
                    className={editor.isActive('bulletList') ? 'is-active' : ''}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    title="Маркированный список"
                >
                    <List size={15} />
                </button>
                <button
                    className={editor.isActive('orderedList') ? 'is-active' : ''}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    title="Нумерованный список"
                >
                    <ListOrdered size={15} />
                </button>
                <button
                    className={editor.isActive('taskList') ? 'is-active' : ''}
                    onClick={() => editor.chain().focus().toggleTaskList().run()}
                    title="Чек-лист"
                >
                    <ListChecks size={15} />
                </button>
                <button
                    className={editor.isActive('blockquote') ? 'is-active' : ''}
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    title="Цитата"
                >
                    <Quote size={15} />
                </button>

                <span className="toolbar-sep" />

                <button
                    className={editor.isActive('code') ? 'is-active' : ''}
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    title="Копируемый текст (клик по нему копирует)"
                >
                    <Code size={15} />
                </button>
                <button
                    className={editor.isActive('codeBlock') ? 'is-active' : ''}
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    title="Блок кода"
                >
                    <FileCode size={15} />
                </button>
            </div>
            <div className="editor-box" onMouseDown={handleMouseDown}>
                <EditorContent editor={editor} />
            </div>
        </div>
    )
}