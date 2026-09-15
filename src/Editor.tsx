import {
    useEditor,
    EditorContent,
    ReactNodeViewRenderer,
    NodeViewWrapper,
    NodeViewContent,
    type NodeViewProps,
} from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CodeBlock from '@tiptap/extension-code-block'
import { useEffect, useRef, useState } from 'react'
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
    Copy,
    Check,
} from 'lucide-react'

interface Props {
    content: string
    onChange: (html: string) => void
}

function CodeBlockView({ node }: NodeViewProps) {
    const [copied, setCopied] = useState(false)

    async function handleCopy() {
        await navigator.clipboard.writeText(node.textContent)
        setCopied(true)
        setTimeout(() => setCopied(false), 1000)
    }

    return (
        <NodeViewWrapper className="code-block-wrapper">
            <button
                type="button"
                className="code-block-copy-btn"
                contentEditable={false}
                onClick={handleCopy}
                title="Скопировать код"
            >
                {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
            <pre>
                <NodeViewContent<'code'> as="code" />
            </pre>
        </NodeViewWrapper>
    )
}

const CustomCodeBlock = CodeBlock.extend({
    addNodeView() {
        return ReactNodeViewRenderer(CodeBlockView)
    },
})

function sanitizePastedHtml(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html')

    doc.body.querySelectorAll('b, strong').forEach((el) => {
        const style = el.getAttribute('style') || ''
        const isExplicitlyBold = /font-weight\s*:\s*(bold|[5-9]\d{2,})/i.test(style)
        const normalDescendant = el.querySelector('[style*="font-weight"]')
        const normalStyle = normalDescendant?.getAttribute('style') || ''
        const hasNormalDescendant = /font-weight\s*:\s*(normal|[1-4]\d{2})/i.test(normalStyle)
        if (!isExplicitlyBold && hasNormalDescendant) {
            el.replaceWith(...Array.from(el.childNodes))
        }
    })

    doc.body.querySelectorAll('*').forEach((el) => {
        el.removeAttribute('style')
        el.removeAttribute('class')
    })

    return doc.body.innerHTML
}

export default function Editor({ content, onChange }: Props) {
    const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2] },
                codeBlock: false,
            }),
            CustomCodeBlock,
            Underline,
            TaskList,
            TaskItem.configure({ nested: true }),
        ],
        content: content,
        editorProps: {
            transformPastedHTML: sanitizePastedHtml,
        },
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

    function setCodeBlockFromSelection() {
        if (!editor) return

        if (editor.isActive('codeBlock')) {
            editor.chain().focus().toggleCodeBlock().run()
            return
        }

        const { state } = editor
        const { from, to, empty } = state.selection

        if (empty) {
            editor.chain().focus().toggleCodeBlock().run()
            return
        }

        const text = state.doc.textBetween(from, to, '\n', '\n')

        editor
            .chain()
            .focus()
            .deleteRange({ from, to })
            .insertContent(
                text
                    ? { type: 'codeBlock', content: [{ type: 'text', text }] }
                    : { type: 'codeBlock' }
            )
            .run()
    }

    function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
        const target = e.target as HTMLElement
        const codeEl = target.closest('code')
        if (codeEl && !codeEl.closest('pre') && codeEl.textContent) {
            e.preventDefault()
            if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
            copyTimeoutRef.current = setTimeout(() => {
                navigator.clipboard.writeText(codeEl.textContent || '')
                codeEl.classList.add('copied')
                setTimeout(() => codeEl.classList.remove('copied'), 350)
                copyTimeoutRef.current = null
            }, 220)
        }
    }

    function handleDoubleClick(e: React.MouseEvent<HTMLDivElement>) {
        const target = e.target as HTMLElement
        const codeEl = target.closest('code')
        if (codeEl && !codeEl.closest('pre')) {
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current)
                copyTimeoutRef.current = null
            }
            const pos = editor?.view.posAtCoords({ left: e.clientX, top: e.clientY })
            if (pos) {
                editor?.chain().focus().setTextSelection(pos.pos).run()
            }
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
                    title="Копируемый текст (клик по нему копирует, двойной клик - редактировать)"
                >
                    <Code size={15} />
                </button>
                <button
                    className={editor.isActive('codeBlock') ? 'is-active' : ''}
                    onClick={setCodeBlockFromSelection}
                    title="Блок кода"
                >
                    <FileCode size={15} />
                </button>
            </div>
            <div
                className="editor-box"
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
            >
                <EditorContent editor={editor} />
            </div>
        </div>
    )
}