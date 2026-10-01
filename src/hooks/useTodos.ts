import { useCallback, useEffect, useMemo, useState } from "react"
import { Effect, ManagedRuntime } from "effect"
import {
  Todo,
  TodoId,
  TodoFilter,
  SortOrder,
  TodoPatch,
  filterTodos,
  sortTodos,
} from "../domain/Todo.js"
import { TodoService } from "../services/TodoService.js"

const runtime = ManagedRuntime.make(TodoService.layer)

const run = <A, E>(effect: Effect.Effect<A, E, TodoService>) =>
  runtime.runPromise(effect)

const fallbackMessage = "خطایی رخ داد. لطفاً دوباره تلاش کنید."

/** Surfaces the Persian message carried by our tagged errors. */
const describe = (cause: unknown): string => {
  if (typeof cause !== "object" || cause === null) return fallbackMessage
  const error = cause as { _tag?: string; message?: string; reason?: string }
  if (error._tag === "TodoError" && error.message) return error.message
  if (error._tag === "StorageError" && error.reason) return error.reason
  return fallbackMessage
}

export function useTodos() {
  const [todos, setTodos] = useState<ReadonlyArray<Todo>>([])
  const [filter, setFilter] = useState<TodoFilter>("all")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortOrder>("newest")
  const [loading, setLoading] = useState(true)
  const [addError, setAddError] = useState<string | null>(null)
  const [renameError, setRenameError] = useState<
    { id: TodoId; message: string } | null
  >(null)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [lastDeleted, setLastDeleted] = useState<string | null>(null)

  const refresh = useCallback(() => {
    run(
      Effect.gen(function* () {
        const service = yield* TodoService
        return yield* service.list
      }),
    )
      .then(setTodos)
      .catch((cause) => setGlobalError(describe(cause)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(refresh, [refresh])

  /** Shared plumbing: run a service call, refresh the list, route errors. */
  const mutate = useCallback(
    <A, E>(
      effect: Effect.Effect<A, E, TodoService>,
      onError: (message: string) => void,
      after?: (value: A) => void,
    ) =>
      run(effect)
        .then((value) => {
          setGlobalError(null)
          after?.(value)
        })
        .catch((cause) => onError(describe(cause))),
    [],
  )

  const withList = <A, E>(make: (service: TodoService["Service"]) => Effect.Effect<A, E>) =>
    Effect.gen(function* () {
      const service = yield* TodoService
      return yield* make(service)
    })

  const addTodo = useCallback(
    (title: string): Promise<boolean> => {
      setAddError(null)
      return run(
        withList((service) =>
          Effect.gen(function* () {
            yield* service.add(title)
            return yield* service.list
          }),
        ),
      )
        .then((next) => {
          setTodos(next)
          return true as const
        })
        .catch((cause) => {
          setAddError(describe(cause))
          return false as const
        })
    },
    [],
  )

  const toggleTodo = useCallback(
    (id: TodoId) =>
      mutate(withList((service) => service.toggle(id)), setGlobalError, setTodos),
    [mutate],
  )

  const renameTodo = useCallback(
    (id: TodoId, title: string) =>
      mutate(
        withList((service) => service.rename(id, title)),
        (message) => setRenameError({ id, message }),
        setTodos,
      ),
    [mutate],
  )

  const patchTodo = useCallback(
    (id: TodoId, changes: TodoPatch) =>
      mutate(withList((service) => service.patch(id, changes)), setGlobalError, setTodos),
    [mutate],
  )

  const clearAddError = useCallback(() => setAddError(null), [])

  const removeTodo = useCallback(
    (id: TodoId) =>
      mutate(
        withList((service) => service.remove(id)),
        setGlobalError,
        (next) => {
          setTodos(next)
          setLastDeleted(todos.find((todo) => todo.id === id)?.title ?? null)
        },
      ),
    [mutate, todos],
  )

  const undoRemove = useCallback(
    () =>
      mutate(withList((service) => service.restoreLast), setGlobalError, (next) => {
        setTodos(next)
        setLastDeleted(null)
      }),
    [mutate],
  )

  const clearLastDeleted = useCallback(() => setLastDeleted(null), [])

  const toggleAll = useCallback(
    () =>
      mutate(withList((service) => service.toggleAll), setGlobalError, setTodos),
    [mutate],
  )

  const clearCompleted = useCallback(
    () =>
      mutate(withList((service) => service.clearCompleted), setGlobalError, setTodos),
    [mutate],
  )

  const visibleTodos = useMemo(
    () => sortTodos(filterTodos(todos, filter, search), sort),
    [todos, filter, search, sort],
  )

  const activeCount = todos.filter((todo) => !todo.completed).length
  const completedCount = todos.filter((todo) => todo.completed).length
  const allCompleted = todos.length > 0 && activeCount === 0

  return {
    todos: visibleTodos,
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
    lastDeleted,
    undoRemove,
    clearLastDeleted,
    addTodo,
    toggleTodo,
    renameTodo,
    patchTodo,
    removeTodo,
    toggleAll,
    clearCompleted,
    activeCount,
    completedCount,
    allCompleted,
  }
}