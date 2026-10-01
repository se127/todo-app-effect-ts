import { Context, Effect, Layer, Schema } from "effect"
import { Todo, TodoId, TodoPatch, TodoList, TodoTitle } from "../domain/Todo.js"

export class TodoError extends Schema.TaggedError<TodoError>()("TodoError", {
  message: Schema.String,
}) {}

const STORAGE_KEY = "todo-app/effect-todos"

export class Storage extends Schema.TaggedError<Storage>()("StorageError", {
  reason: Schema.String,
}) {}

const loadTodos = Effect.fnUntraced(function* () {
  const raw = yield* Effect.try({
    try: () => localStorage.getItem(STORAGE_KEY),
    catch: () => new Storage({ reason: "خواندن اطلاعات ذخیره شده ممکن نشد." }),
  })

  if (raw === null) return [] as ReadonlyArray<Todo>

  const parsed = yield* Effect.try({
    try: () => JSON.parse(raw) as unknown,
    catch: () => new Storage({ reason: "اطلاعات ذخیره شده معتبر نیست." }),
  })

  return yield* Effect.suspend(() => {
    const result = TodoList.safeParse(parsed)
    if (result.success) return Effect.succeed(result.data as ReadonlyArray<Todo>)
    return Effect.logWarning(
      "stored todos failed validation, starting empty",
      result.error,
    ).pipe(Effect.andThen(Effect.succeed([] as ReadonlyArray<Todo>)))
  })
})

/** Runs a Zod schema as an Effect, surfacing Zod's message on failure. */
const validateTitle = Effect.fnUntraced(function* (title: string) {
  const result = TodoTitle.safeParse(title)
  if (result.success) return result.data
  return yield* new TodoError({
    message: result.error.issues[0]?.message ?? "عنوان کار نامعتبر است.",
  })
})

const saveTodos = Effect.fnUntraced(function*(todos: ReadonlyArray<Todo>) {
  yield* Effect.try({
    try: () => localStorage.setItem(STORAGE_KEY, JSON.stringify(todos)),
    catch: () => new Storage({ reason: "ذخیره سازی کارها ممکن نشد." }),
  })
})

interface TodoServiceApi {
  readonly list: Effect.Effect<ReadonlyArray<Todo>, Storage>
  readonly add: (title: string) => Effect.Effect<Todo, Storage | TodoError>
  readonly toggle: (id: TodoId) => Effect.Effect<ReadonlyArray<Todo>, Storage>
  readonly rename: (
    id: TodoId,
    title: string,
  ) => Effect.Effect<ReadonlyArray<Todo>, Storage | TodoError>
  readonly patch: (
    id: TodoId,
    changes: TodoPatch,
  ) => Effect.Effect<ReadonlyArray<Todo>, Storage>
  readonly remove: (id: TodoId) => Effect.Effect<ReadonlyArray<Todo>, Storage>
  readonly restoreLast: Effect.Effect<ReadonlyArray<Todo>, Storage | TodoError>
  readonly toggleAll: Effect.Effect<ReadonlyArray<Todo>, Storage>
  readonly clearCompleted: Effect.Effect<ReadonlyArray<Todo>, Storage>
}

export class TodoService extends Context.Service<TodoService, TodoServiceApi>()(
  "todo-app/TodoService",
) {
  static readonly layer = Layer.effect(
    TodoService,
    Effect.gen(function* () {
      /*
       * Held in memory only: the undo affordance should not survive a reload,
       * and keeping it out of localStorage keeps the stored shape simple.
       */
      let lastDeleted: Todo | null = null

      const readTodos = Effect.fnUntraced(function* () {
        const stored = yield* loadTodos()
        return [...stored]
      })

      const update = Effect.fnUntraced(function* (
        f: (todos: ReadonlyArray<Todo>) => ReadonlyArray<Todo>,
      ) {
        const current = yield* readTodos()
        const next = f(current)
        yield* saveTodos(next)
        return next
      })

      return TodoService.of({
        list: readTodos(),

        add: Effect.fnUntraced(function*(title: string) {
          const trimmed = yield* validateTitle(title)
          const todo: Todo = {
            id: crypto.randomUUID() as TodoId,
            title: trimmed,
            completed: false,
            priority: "medium",
            dueDate: null,
            createdAt: new Date(),
          }
          yield* update((todos) => [todo, ...todos])
          return todo
        }),

        toggle: (id) =>
          Effect.fnUntraced(function*() {
            yield* update((todos) =>
              todos.map((todo) =>
                todo.id === id ? { ...todo, completed: !todo.completed } : todo,
              ),
            )
          })().pipe(Effect.andThen(readTodos)),

        rename: (id, title) =>
          Effect.fnUntraced(function*() {
            const trimmed = yield* validateTitle(title)
            yield* update((todos) =>
              todos.map((todo) => (todo.id === id ? { ...todo, title: trimmed } : todo)),
            )
          })().pipe(Effect.andThen(readTodos)),

        patch: (id, changes) =>
          Effect.fnUntraced(function*() {
            yield* update((todos) =>
              todos.map((todo) => (todo.id === id ? { ...todo, ...changes } : todo)),
            )
          })().pipe(Effect.andThen(readTodos)),

        remove: (id) =>
          Effect.fnUntraced(function*() {
            const current = yield* readTodos()
            lastDeleted = current.find((todo) => todo.id === id) ?? null
            yield* update((todos) => todos.filter((todo) => todo.id !== id))
          })().pipe(Effect.andThen(readTodos)),

        restoreLast: Effect.fnUntraced(function*() {
          if (lastDeleted === null) {
            return yield* new TodoError({ message: "کاری برای بازگردانی وجود ندارد." })
          }
          const todo = lastDeleted
          lastDeleted = null
          yield* update((todos) => [todo, ...todos])
        })().pipe(Effect.andThen(readTodos)),

        /* Marks everything completed, or back to active if all are done. */
        toggleAll: Effect.fnUntraced(function*() {
          const current = yield* readTodos()
          const shouldComplete = current.some((todo) => !todo.completed)
          yield* update((todos) =>
            todos.map((todo) => ({ ...todo, completed: shouldComplete })),
          )
        })().pipe(Effect.andThen(readTodos)),

        clearCompleted: Effect.fnUntraced(function*() {
          yield* update((todos) => todos.filter((todo) => !todo.completed))
        })().pipe(Effect.andThen(readTodos)),
      })
    }),
  )
}