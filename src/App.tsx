import { useEffect, useRef, useState } from 'react'
import {
    listNotes,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    listFolders,
    createFolder,
    renameFolder,
    deleteFolder,
    getTagsForNote,
    setTagsForNote,
    listAllTags,
    pruneUnusedTags,
    type Note,
    type Folder,
    type Tag,
} from './db'
import Editor from './Editor'
import Dialog, { type DialogState } from './Dialog'
import { Pencil, Trash2, Pin, PinOff, X, Plus } from 'lucide-react'

function stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatDate(iso: string): string {
    const d = new Date(iso.replace(' ', 'T') + 'Z')
    const now = new Date()
    const sameDay = d.toDateString() === now.toDateString()
    if (sameDay) {
        return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
}

function App() {
    const [notes, setNotes] = useState<Note[]>([])
    const [folders, setFolders] = useState<Folder[]>([])
    const [selectedFolderId, setSelectedFolderId] = useState<number | null | undefined>(undefined)
    const [allTags, setAllTags] = useState<Tag[]>([])
    const [selectedTagId, setSelectedTagId] = useState<number | undefined>(undefined)
    const [search, setSearch] = useState('')
    const [selectedId, setSelectedId] = useState<number | null>(null)
    const [editText, setEditText] = useState('')
    const [titleText, setTitleText] = useState('')
    const [noteFolderId, setNoteFolderId] = useState<number | null>(null)
    const [noteTags, setNoteTags] = useState<Tag[]>([])
    const [tagsInput, setTagsInput] = useState('')
    const [dragOverTarget, setDragOverTarget] = useState<number | null | undefined>(undefined)
    const [dialog, setDialog] = useState<DialogState | null>(null)
    const [sidebarWidth, setSidebarWidth] = useState(200)
    const [listWidth, setListWidth] = useState(320)

    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const pendingFields = useRef<{ title?: string; content?: string }>({})
    const titleInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        refreshFolders()
        refreshAllTags()
    }, [])

    useEffect(() => {
        refreshNotes()
    }, [selectedFolderId, selectedTagId, search])

    useEffect(() => {
        if (selectedId == null) {
            setNoteTags([])
            setTagsInput('')
            return
        }
        getTagsForNote(selectedId).then((tags) => {
            setNoteTags(tags)
            setTagsInput(tags.map((t) => t.name).join(', '))
        })
    }, [selectedId])

    function askPrompt(title: string, defaultValue = ''): Promise<string | null> {
        return new Promise((resolve) => {
            setDialog({ type: 'prompt', title, defaultValue, resolve })
        })
    }

    function askConfirm(title: string, message: string, danger = false): Promise<boolean> {
        return new Promise((resolve) => {
            setDialog({ type: 'confirm', title, message, danger, resolve })
        })
    }

    function startResize(
        e: React.MouseEvent,
        startWidth: number,
        setWidth: (w: number) => void,
        min: number,
        max: number
    ) {
        e.preventDefault()
        const startX = e.clientX

        const previousUserSelect = document.body.style.userSelect
        document.body.style.userSelect = 'none'

        function onMouseMove(moveEvent: MouseEvent) {
            const delta = moveEvent.clientX - startX
            const next = Math.min(max, Math.max(min, startWidth + delta))
            setWidth(next)
        }

        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
            document.body.style.userSelect = previousUserSelect // возвращаем как было
        }

        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
    }

    async function refreshFolders() {
        setFolders(await listFolders())
    }

    async function refreshAllTags() {
        setAllTags(await listAllTags())
    }

    async function refreshNotes() {
        setNotes(await listNotes({ folderId: selectedFolderId, tagId: selectedTagId, search }))
    }

    function handleSelectFolder(id: number | null | undefined) {
        setSelectedFolderId(id)
        setSelectedTagId(undefined)
    }

    function handleSelectTag(id: number) {
        setSelectedTagId(id)
        setSelectedFolderId(undefined)
    }

    async function addNote() {
        const folderId = typeof selectedFolderId === 'number' ? selectedFolderId : null
        const id = await createNote(folderId)
        await refreshNotes()
        setSelectedId(id)
        setEditText('')
        setTitleText('')
        setNoteFolderId(folderId)
        setTimeout(() => titleInputRef.current?.focus(), 0)
    }

    async function addFolder() {
        const name = await askPrompt('Новая папка')
        if (!name) return
        await createFolder(name)
        await refreshFolders()
    }

    async function handleRenameFolder(folder: Folder) {
        const name = await askPrompt('Переименовать папку', folder.name)
        if (!name) return
        await renameFolder(folder.id, name)
        await refreshFolders()
    }

    async function handleDeleteFolder(folder: Folder) {
        const ok = await askConfirm(
            'Удалить папку?',
            `Заметки внутри «${folder.name}» останутся, но станут "без папки".`,
            true
        )
        if (!ok) return
        await deleteFolder(folder.id)
        if (selectedFolderId === folder.id) setSelectedFolderId(undefined)
        await refreshFolders()
        await refreshNotes()
    }

    async function handleTogglePin(note: Note) {
        await togglePin(note.id, note.is_pinned === 0)
        await refreshNotes()
    }

    function selectNote(note: Note) {
        setSelectedId(note.id)
        setEditText(note.content)
        setTitleText(note.title)
        setNoteFolderId(note.folder_id)
    }

    function closeEditor() {
        setSelectedId(null)
        setEditText('')
        setTitleText('')
        setNoteFolderId(null)
    }

    function scheduleSave(id: number, fields: { title?: string; content?: string }) {
        pendingFields.current = { ...pendingFields.current, ...fields }
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(async () => {
            const toSave = pendingFields.current
            pendingFields.current = {}
            await updateNote(id, toSave)
            await refreshNotes()
        }, 500)
    }

    function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setTitleText(e.target.value)
        if (selectedId != null) scheduleSave(selectedId, { title: e.target.value })
    }

    function handleEditorChange(text: string) {
        setEditText(text)
        if (selectedId != null) scheduleSave(selectedId, { content: text })
    }

    async function handleNoteFolderChange(folderId: number | null) {
        if (selectedId == null) return
        setNoteFolderId(folderId)
        await updateNote(selectedId, { folder_id: folderId })
        await refreshNotes()
    }

    async function saveTags() {
        if (selectedId == null) return
        const names = tagsInput.split(',').map((s) => s.trim()).filter(Boolean)
        await setTagsForNote(selectedId, names)
        await pruneUnusedTags()
        const updated = await getTagsForNote(selectedId)
        setNoteTags(updated)
        await refreshAllTags()
    }

    async function removeNote(id: number, title: string) {
        const ok = await askConfirm(
            'Удалить заметку?',
            `«${title || 'Без названия'}» будет удалена без возможности восстановления.`,
            true
        )
        if (!ok) return
        await deleteNote(id)
        await pruneUnusedTags()
        if (selectedId === id) {
            setSelectedId(null)
            setEditText('')
            setTitleText('')
            setNoteFolderId(null)
        }
        await refreshNotes()
        await refreshAllTags()
    }

    function handleDragStart(e: React.DragEvent, note: Note) {
        e.dataTransfer.setData('text/plain', String(note.id))
        e.dataTransfer.effectAllowed = 'move'

        const preview = document.createElement('div')
        preview.textContent = note.title || stripHtml(note.content) || 'Без названия'
        preview.className = 'drag-preview'
        document.body.appendChild(preview)
        e.dataTransfer.setDragImage(preview, 10, 10)

        setTimeout(() => document.body.removeChild(preview), 0)
    }

    function handleDragOverTarget(e: React.DragEvent, folderId: number | null) {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragOverTarget(folderId)
    }

    function handleDragLeaveTarget() {
        setDragOverTarget(undefined)
    }

    async function handleDropOnFolder(e: React.DragEvent, folderId: number | null) {
        e.preventDefault()
        setDragOverTarget(undefined)
        const noteId = Number(e.dataTransfer.getData('text/plain'))
        if (!noteId) return
        await updateNote(noteId, { folder_id: folderId })
        if (selectedId === noteId) setNoteFolderId(folderId)
        await refreshNotes()
    }

    return (
        <>
            <div className="app-shell">
                <aside className="sidebar" style={{ width: sidebarWidth }}>
                    <h2>Папки</h2>
                    <div
                        className={`sidebar-static${selectedFolderId === undefined && selectedTagId === undefined ? ' active' : ''}`}
                        onClick={() => handleSelectFolder(undefined)}
                    >
                        Все заметки
                    </div>
                    <div
                        className={`sidebar-static${selectedFolderId === null ? ' active' : ''}${
                            dragOverTarget === null ? ' drag-over' : ''
                        }`}
                        onClick={() => handleSelectFolder(null)}
                        onDragOver={(e) => handleDragOverTarget(e, null)}
                        onDragLeave={handleDragLeaveTarget}
                        onDrop={(e) => handleDropOnFolder(e, null)}
                    >
                        Без папки
                    </div>
                    <hr style={{ borderColor: 'var(--ink-700)', margin: '10px 0' }} />
                    {folders.map((folder) => (
                        <div
                            key={folder.id}
                            className={`folder-row${selectedFolderId === folder.id ? ' active' : ''}${
                                dragOverTarget === folder.id ? ' drag-over' : ''
                            }`}
                            onDragOver={(e) => handleDragOverTarget(e, folder.id)}
                            onDragLeave={handleDragLeaveTarget}
                            onDrop={(e) => handleDropOnFolder(e, folder.id)}
                        >
                            <span onClick={() => handleSelectFolder(folder.id)}>{folder.name}</span>
                            <div className="folder-row-actions">
                                <button onClick={() => handleRenameFolder(folder)} title="Переименовать">
                                    <Pencil size={12} />
                                </button>
                                <button onClick={() => handleDeleteFolder(folder)} title="Удалить">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                    <button className="add-folder-btn" onClick={addFolder}>
                        <Plus size={13} /> Папка
                    </button>

                    {allTags.length > 0 && (
                        <>
                            <hr style={{ borderColor: 'var(--ink-700)', margin: '14px 0 10px' }} />
                            <h2>Теги</h2>
                            {allTags.map((tag) => (
                                <div
                                    key={tag.id}
                                    className={`sidebar-static${selectedTagId === tag.id ? ' active' : ''}`}
                                    onClick={() => handleSelectTag(tag.id)}
                                >
                                    #{tag.name}
                                </div>
                            ))}
                        </>
                    )}
                </aside>

                <div
                    className="resize-handle"
                    onMouseDown={(e) => startResize(e, sidebarWidth, setSidebarWidth, 160, 320)}
                />

                <section className="note-list-pane" style={{ width: listWidth }}>
                    <h1>Мои заметки</h1>

                    <input
                        className="search-input"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Поиск..."
                    />

                    <div className="new-note-row">
                        <button onClick={addNote}>
                            <Plus size={15} /> Заметка
                        </button>
                    </div>

                    {notes.length === 0 && (
                        <div className="empty-hint">
                            {search ? 'Ничего не найдено' : 'Здесь пока нет заметок'}
                        </div>
                    )}

                    {notes.map((note) => (
                        <div
                            key={note.id}
                            className={`note-item${selectedId === note.id ? ' active' : ''}`}
                            onClick={() => selectNote(note)}
                            draggable
                            onDragStart={(e) => handleDragStart(e, note)}
                        >
                            <div className="note-item-main">
                                <div className="note-item-title">
                                    {note.is_pinned ? <Pin size={12} /> : null}
                                    <span>{note.title || 'Без названия'}</span>
                                </div>
                                <div className="note-item-snippet">
                                    {stripHtml(note.content) || 'Пусто'}
                                </div>
                                <div className="note-item-date">{formatDate(note.updated_at)}</div>
                            </div>
                            <div className="note-item-actions">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleTogglePin(note)
                                    }}
                                    title="Закрепить"
                                >
                                    {note.is_pinned ? <PinOff size={14} /> : <Pin size={14} />}
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        removeNote(note.id, note.title)
                                    }}
                                    title="Удалить"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </section>

                <div
                    className="resize-handle"
                    onMouseDown={(e) => startResize(e, listWidth, setListWidth, 240, 480)}
                />

                {selectedId != null && (
                    <section className="editor-pane">
                        <div className="editor-header">
                            <h2>Редактирование</h2>
                            <button onClick={closeEditor} title="Закрыть">
                                <X size={16} />
                            </button>
                        </div>

                        <input
                            ref={titleInputRef}
                            className="note-title-input"
                            value={titleText}
                            onChange={handleTitleChange}
                            placeholder="Без названия"
                        />

                        <select
                            className="folder-select editor-folder-select"
                            value={noteFolderId ?? ''}
                            onChange={(e) =>
                                handleNoteFolderChange(e.target.value === '' ? null : Number(e.target.value))
                            }
                        >
                            <option value="">Без папки</option>
                            {folders.map((folder) => (
                                <option key={folder.id} value={folder.id}>
                                    {folder.name}
                                </option>
                            ))}
                        </select>

                        <input
                            className="tags-input"
                            value={tagsInput}
                            onChange={(e) => setTagsInput(e.target.value)}
                            onBlur={saveTags}
                            placeholder="теги через запятую"
                        />
                        <div className="tags-display">
                            {noteTags.map((t) => `#${t.name}`).join('  ')}
                        </div>

                        <Editor content={editText} onChange={handleEditorChange} />
                    </section>
                )}
            </div>
            {dialog && <Dialog dialog={dialog} onClose={() => setDialog(null)} />}
        </>
    )
}

export default App