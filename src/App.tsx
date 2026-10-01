import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTodos } from "@/hooks/useTodos"
import { TodoFilter, TodoId, TodoTitle } from "@/domain/Todo"
import { TodoItem } from "@/components/TodoItem"
import { Toolbar } from "@/components/Toolbar"
import { fa } from "@/utils/format"

const filters: { label: string; value: TodoFilter }[] = [
  { label: "همه", value: "all" },
  { label: "فعال", value: "active" },
  { label: "انجام شده", value: "completed" },
]

const emptyMessages: Record<TodoFilter, string> = {
  all: "هنوز کاری ثبت نشده است",
  active: "همه کارها انجام شده اند",
  completed: "هنوز کاری انجام نشده است",
}

const emptyHints: Record<TodoFilter, string> = {
  all: "اولین کارتان را در کادر بالا بنویسید.",
  active: "کارهای باقی مانده اینجا نمایش داده می شوند.",
  completed: "کارهای تمام شده اینجا جمع می شوند.",
}

export const App = () => {
  const {
    todos,
    filter,
    setFilter,
    search,
    setSearch,
    sort,
    setSort,
    loading,
    addError,
    renameError,
    clearAddError,
    globalError,
    addTodo,
    toggleTodo,
    renameTodo,
    patchTodo,
    removeTodo,
    undoRemove,
    toggleAll,
    clearCompleted,
    activeCount,
    completedCount,
    allCompleted,
  } = useTodos()

  const [input, setInput] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const addInputRef = useRef<HTMLInputElement>(null)

  /*
   * Derived, not stored: once the user has tried to submit, the message tracks
   * the field's contents. Typing hides it, deleting all the text brings it back.
   */
  const emptyError =
    submitted && input.trim().length === 0
      ? (TodoTitle.safeParse("").error?.issues[0]?.message ?? null)
      : null
  const shownAddError = emptyError ?? addError

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    const added = await addTodo(input)
    // Reset validation state too: the field is empty again, so without this the
    // derived empty-title error would immediately reappear after a successful add.
    if (added) {
      setInput("")
      setSubmitted(false)
    }
  }

  /* "/" focuses the composer, Escape leaves it. Ignored while already typing. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable === true

      if (event.key === "/" && !isTyping) {
        event.preventDefault()
        addInputRef.current?.focus()
      } else if (event.key === "Escape" && isTyping) {
        target?.blur()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  /* Delete is undoable, so it announces itself as a toast rather than vanishing. */
  const handleRemove = (id: TodoId, title: string) => {
    removeTodo(id)
    toast.error(`«${title}» حذف شد`, {
      description: "می توانید این کار را بازگردانید.",
      action: { label: "بازگردانی", onClick: () => undoRemove() },
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <p className="animate-pulse text-sm text-muted-foreground">
          در حال بارگذاری…
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-muted/40">
      <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 sm:py-14">
        <header className="mb-6 text-center sm:mb-8">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            لیست کارها
          </h1>
          <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
            ساخته شده با Effect TS
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mb-4 sm:mb-5" noValidate>
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="min-w-0 flex-1">
              <Input
                ref={addInputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  clearAddError()
                }}
                placeholder="کار جدید را بنویسید…"
                aria-label="عنوان کار جدید"
                aria-invalid={shownAddError !== null}
                aria-describedby={
                  shownAddError !== null ? "add-error" : undefined
                }
                className={`h-11 text-sm sm:h-10 sm:text-base ${
                  shownAddError !== null ? "border-destructive" : ""
                }`}
              />
              {shownAddError !== null && (
                <p
                  id="add-error"
                  role="alert"
                  className="mt-2 text-xs text-destructive"
                >
                  {shownAddError}
                </p>
              )}
            </div>
            <Button type="submit" className="h-11 sm:h-10 sm:px-6">
              افزودن
            </Button>
          </div>
        </form>

        {globalError && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive sm:mb-5 sm:text-sm"
          >
            {globalError}
          </p>
        )}

        <Toolbar
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={setSort}
          onToggleAll={toggleAll}
          allCompleted={allCompleted}
          hasTodos={activeCount + completedCount > 0}
        />

        <nav
          className="mb-4 flex gap-1.5 sm:mb-5 sm:gap-2"
          aria-label="فیلتر کارها"
        >
          {filters.map(({ label, value }) => (
            <Button
              key={value}
              variant={filter === value ? "default" : "outline"}
              onClick={() => setFilter(value)}
              aria-current={filter === value ? "true" : undefined}
              className="h-9 flex-1 sm:h-8 sm:flex-none sm:px-5"
            >
              {label}
            </Button>
          ))}
        </nav>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {todos.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm text-muted-foreground sm:text-base">
                {emptyMessages[filter]}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground/80">
                {emptyHints[filter]}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {todos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={toggleTodo}
                  onRename={renameTodo}
                  onRemove={(id, title) => handleRemove(id, title)}
                  onPatch={patchTodo}
                  renameError={
                    renameError?.id === todo.id ? renameError.message : null
                  }
                />
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground sm:text-sm">
          <span className="tabular-nums">
            {fa(activeCount)} فعال · {fa(completedCount)} انجام شده
          </span>
          {completedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCompleted}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              حذف انجام شده ها
            </Button>
          )}
        </div>

        </div>

      <Toaster position="bottom-center" dir="rtl" />
    </div>
  )
}