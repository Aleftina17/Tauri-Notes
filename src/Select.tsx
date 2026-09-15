import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export interface SelectOption {
    value: string
    label: string
}

interface Props {
    value: string
    options: SelectOption[]
    onChange: (value: string) => void
    className?: string
}

export default function Select({ value, options, onChange, className }: Props) {
    const [open, setOpen] = useState(false)
    const [highlighted, setHighlighted] = useState(0)
    const rootRef = useRef<HTMLDivElement>(null)

    const selected = options.find((o) => o.value === value)

    useEffect(() => {
        if (!open) return

        function onDocMouseDown(e: MouseEvent) {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false)
        }

        document.addEventListener('mousedown', onDocMouseDown)
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('mousedown', onDocMouseDown)
            document.removeEventListener('keydown', onKeyDown)
        }
    }, [open])

    function toggleOpen() {
        if (!open) {
            const idx = Math.max(0, options.findIndex((o) => o.value === value))
            setHighlighted(idx)
        }
        setOpen((o) => !o)
    }

    function pick(v: string) {
        onChange(v)
        setOpen(false)
    }

    function onButtonKeyDown(e: React.KeyboardEvent) {
        if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            toggleOpen()
            return
        }
        if (!open) return
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlighted((i) => Math.min(options.length - 1, i + 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlighted((i) => Math.max(0, i - 1))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            const opt = options[highlighted]
            if (opt) pick(opt.value)
        }
    }

    return (
        <div className={`custom-select${className ? ` ${className}` : ''}`} ref={rootRef}>
            <button
                type="button"
                className={`custom-select-trigger${open ? ' open' : ''}`}
                onClick={toggleOpen}
                onKeyDown={onButtonKeyDown}
            >
                <span>{selected ? selected.label : ''}</span>
                <ChevronDown size={14} className="custom-select-chevron" />
            </button>
            {open && (
                <ul className="custom-select-list" role="listbox">
                    {options.map((opt, i) => (
                        <li
                            key={opt.value}
                            role="option"
                            aria-selected={opt.value === value}
                            className={`custom-select-option${opt.value === value ? ' selected' : ''}${
                                i === highlighted ? ' highlighted' : ''
                            }`}
                            onMouseEnter={() => setHighlighted(i)}
                            onMouseDown={(e) => {
                                e.preventDefault()
                                pick(opt.value)
                            }}
                        >
                            {opt.label}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}