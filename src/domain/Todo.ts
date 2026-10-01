import { z } from "zod"

/**
 * A trimmed, non-blank title. `.trim()` runs before `.min()`, so a string of
 * only spaces is rejected rather than stored as an empty-looking row.
 */
export const TodoTitle = z
  .string()
  .trim()
  .min(1, { error: "عنوان کار نمی تواند خالی باشد." })

export const TodoId = z.string().min(1).brand<"TodoId">()
export type TodoId = z.infer<typeof TodoId>

export const Priority = z.enum(["low", "medium", "high"])
export type Priority = z.infer<typeof Priority>

export const priorityLabels: Record<Priority, string> = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
}

export const priorityOrder: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

export const nextPriority: Record<Priority, Priority> = {
  low: "medium",
  medium: "high",
  high: "low",
}

export const TodoFilter = z.enum(["all", "active", "completed"])
export type TodoFilter = z.infer<typeof TodoFilter>

export const SortOrder = z.enum(["newest", "oldest", "alphabetical", "priority"])
export type SortOrder = z.infer<typeof SortOrder>

export const sortLabels: Record<SortOrder, string> = {
  newest: "جدیدترین",
  oldest: "قدیمی ترین",
  alphabetical: "الفبایی",
  priority: "اولویت",
}

/**
 * `.default()` keeps todos written by earlier versions decodable: missing keys
 * fall back instead of failing validation, which would wipe the whole list.
 */
export const Todo = z.object({
  id: TodoId,
  title: TodoTitle,
  completed: z.boolean(),
  priority: Priority.default("medium"),
  /** Calendar day as `YYYY-MM-DD`; deliberately not a timestamp. */
  dueDate: z.string().nullable().default(null),
  createdAt: z.coerce.date(),
})

export type Todo = z.infer<typeof Todo>

export const TodoList = z.array(Todo)

export const TodoPatch = z.object({
  priority: Priority.optional(),
  dueDate: z.string().nullable().optional(),
})

export type TodoPatch = z.infer<typeof TodoPatch>

const matchesFilter = (todo: Todo, filter: TodoFilter): boolean =>
  filter === "all" ? true : filter === "active" ? !todo.completed : todo.completed

const collator = new Intl.Collator("fa")

export const filterTodos = (
  todos: ReadonlyArray<Todo>,
  filter: TodoFilter,
  search: string,
): ReadonlyArray<Todo> => {
  const needle = search.trim().toLocaleLowerCase("fa")
  return todos.filter(
    (todo) =>
      matchesFilter(todo, filter) &&
      (needle.length === 0 || todo.title.toLocaleLowerCase("fa").includes(needle)),
  )
}

export const sortTodos = (
  todos: ReadonlyArray<Todo>,
  order: SortOrder,
): ReadonlyArray<Todo> => {
  const sorted = [...todos]
  switch (order) {
    case "newest":
      return sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    case "oldest":
      return sorted.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    case "alphabetical":
      return sorted.sort((a, b) => collator.compare(a.title, b.title))
    case "priority":
      return sorted.sort(
        (a, b) =>
          priorityOrder[a.priority] - priorityOrder[b.priority] ||
          a.createdAt.getTime() - b.createdAt.getTime(),
      )
  }
}