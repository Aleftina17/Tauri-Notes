import { useEffect, useRef, useState } from 'react'

export type DialogState =
    | { type: 'prompt'; title: string; defaultValue: string; resolve: (value: string | null) => void }
    | { type: 'confirm'; title: string; message: string; danger?: boolean; resolve: (value: boolean) => void }

interface Props {
    dialog: DialogState
    onClose: () => void
}

export default function Dialog({ dialog, onClose }: Props) {
    const [value, setValue] = useState(dialog.type === 'prompt' ? dialog.defaultValue : '')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
    }, [])

    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') cancel()
        }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    function submit(e?: React.FormEvent) {
        e?.preventDefault()
        if (dialog.type === 'prompt') {
            if (!value.trim()) return
            dialog.resolve(value.trim())
        } else {
            dialog.resolve(true)
        }
        onClose()
    }

    function cancel() {
        if (dialog.type === 'prompt') {
            dialog.resolve(null)
        } else {
            dialog.resolve(false)
        }
        onClose()
    }

    return (
        <div className="dialog-overlay" onClick={cancel}>
            <form className="dialog-card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
                <h3>{dialog.title}</h3>
                {dialog.type === 'confirm' && <p className="dialog-message">{dialog.message}</p>}
                {dialog.type === 'prompt' && (
                    <input
                        ref={inputRef}
                        className="dialog-input"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                    />
                )}
                <div className="dialog-actions">
                    <button type="button" className="dialog-btn-secondary" onClick={cancel}>
                        Отмена
                    </button>
                    <button
                        type="submit"
                        className={`dialog-btn-primary${dialog.type === 'confirm' && dialog.danger ? ' danger' : ''}`}
                    >
                        {dialog.type === 'prompt' ? 'Сохранить' : 'Удалить'}
                    </button>
                </div>
            </form>
        </div>
    )
}