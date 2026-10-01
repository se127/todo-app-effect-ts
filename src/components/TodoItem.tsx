import { useEffect, useRef, useState } from "react"
import { JalaliCalendar } from "@/components/JalaliCalendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Todo,
  TodoId,
  TodoTitle,
  Priority,
  priorityLabels,
  nextPriority,
} from "@/domain/Todo"
import { relativeTime, dueStatus, formatDay } from "@/utils/format"

interface TodoItemProps {
  todo: Todo
  onToggle: (id: TodoId) => void
  onRename: (id: TodoId, title: string) => void
  onRemove: (id: TodoId, title: string) => void
  onPatch: (
    id: TodoId,
    changes: { priority?: Priority; dueDate?: string | null },
  ) => void
  renameError: string | null
}

/* Same message Zod produces, so both inputs stay in sync. */
const emptyTitleMessage =
  TodoTitle.safeParse("").error?.issues[0]?.message ??
  "عنوان کار نمی تواند خالی باشد."

/*
 * Priority is a dot inside a quiet chip. Three loud hues used to fight the
 * accent colour; now only "high" earns a semantic colour and the rest stay neutral.
 */
const priorityDots: Record<Priority, string> = {
  low: "bg-muted-foreground/60",
  medium: "bg-warning",
  high: "bg-destructive",
}

const priorityChips: Record<Priority, string> = {
  low: "text-muted-foreground hover:bg-muted",
  medium: "bg-warning-soft text-warning hover:brightness-97",
  high: "bg-destructive/10 text-destructive hover:bg-destructive/15",
}

const dueChips = {
  overdue: "border-destructive/30 bg-destructive/10 text-destructive",
  today: "border-warning/30 bg-warning-soft text-warning",
  upcoming: "border-border bg-muted text-muted-foreground",
  none: "border-dashed text-muted-foreground hover:bg-muted",
} as const

const dueLabels = {
  overdue: "گذشته از موعد",
  today: "امروز",
  upcoming: "موعد",
  none: "",
} as const

export const TodoItem = ({
  todo,
  onToggle,
  onRename,
  onRemove,
  onPatch,
  renameError,
}: TodoItemProps) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(todo.title)
  const [touched, setTouched] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const startEditing = () => {
    setDraft(todo.title)
    setTouched(false)
    setEditing(true)
  }

  const cancel = () => {
    setDraft(todo.title)
    setTouched(false)
    setEditing(false)
  }

  const commit = () => {
    setTouched(true)
    const trimmed = draft.trim()
    if (trimmed.length === 0) {
      inputRef.current?.focus()
      return
    }
    if (trimmed !== todo.title) {
      onRename(todo.id, trimmed)
    }
    setEditing(false)
  }

  /*
   * Derived, not stored: after the first commit attempt the message follows the
   * field's contents, so typing clears it and emptying the field restores it.
   */
  const emptyError =
    touched && draft.trim().length === 0 ? emptyTitleMessage : null
  const error = emptyError ?? renameError
  const due = dueStatus(todo.dueDate)

  return (
    <li
      className={`flex gap-2.5 px-3 py-3 transition-colors hover:bg-muted/40 group sm:gap-3 sm:px-4 ${
        todo.completed ? "opacity-60" : ""
      } ${editing ? "items-start" : "items-center"}`}
    >
      <Checkbox
        checked={todo.completed}
        onCheckedChange={() => onToggle(todo.id)}
        aria-label={`${todo.completed ? "بازگرداندن به فعال" : "اتمام"}: ${todo.title}`}
        className="mt-0.5 size-5 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
      />

      <div className="min-w-0 flex-1">
        {editing ? (
          <div>
            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  commit()
                } else if (e.key === "Escape") {
                  e.preventDefault()
                  cancel()
                }
              }}
              aria-invalid={error !== null}
              aria-describedby={error !== null ? `error-${todo.id}` : undefined}
              className={`h-9 text-sm sm:h-8 ${
                error !== null ? "border-destructive ring-destructive/20" : ""
              }`}
            />
            {error !== null && (
              <p
                id={`error-${todo.id}`}
                role="alert"
                className="mt-1.5 text-xs text-destructive"
              >
                {error}
              </p>
            )}
          </div>
        ) : (
          <>
            <span
              className={`block select-none break-words text-sm leading-8 sm:text-base ${
                todo.completed
                  ? "text-muted-foreground line-through"
                  : "text-foreground"
              }`}
            >
              {todo.title}
            </span>

            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <button
                onClick={() =>
                  onPatch(todo.id, { priority: nextPriority[todo.priority] })
                }
                aria-label={`اولویت: ${priorityLabels[todo.priority]}. برای تغییر کلیک کنید`}
                className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium transition-colors ${priorityChips[todo.priority]}`}
              >
                <span
                  className={`size-1.5 rounded-full ${priorityDots[todo.priority]}`}
                />
                {priorityLabels[todo.priority]}
              </button>

              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <button
                    aria-label="تعیین موعد"
                    className={`rounded-md border px-1.5 py-0.5 text-[0.6875rem] transition-colors ${dueChips[due]}`}
                  >
                    {due === "none"
                      ? "تعیین موعد"
                      : `${dueLabels[due]}: ${formatDay(todo.dueDate ?? "")}`}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto p-0">
                  <JalaliCalendar
                    value={todo.dueDate}
                    onChange={(next) => {
                      setDateOpen(false)
                      onPatch(todo.id, { dueDate: next })
                    }}
                  />
                </PopoverContent>
              </Popover>

              {todo.dueDate !== null && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onPatch(todo.id, { dueDate: null })}
                  aria-label="حذف موعد"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <XIcon />
                </Button>
              )}

              <span className="text-[0.6875rem] text-muted-foreground">
                {relativeTime(todo.createdAt)}
              </span>
            </div>
          </>
        )}
      </div>

      {!editing && (
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={startEditing}
            aria-label={`ویرایش ${todo.title}`}
            className="text-muted-foreground hover:text-primary hover:bg-accent"
          >
            <PencilIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onRemove(todo.id, todo.title)}
            aria-label={`حذف ${todo.title}`}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <TrashIcon />
          </Button>
        </div>
      )}
    </li>
  )
}

const XIcon = () => (
  <svg
    className="size-3"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const PencilIcon = () => (
  <svg
    className="size-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897l12.682-12.682z"
    />
  </svg>
)

const TrashIcon = () => (
  <svg
    className="size-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
)