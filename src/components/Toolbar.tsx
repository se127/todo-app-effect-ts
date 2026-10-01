import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SortOrder, sortLabels } from "@/domain/Todo"

interface ToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  sort: SortOrder
  onSortChange: (value: SortOrder) => void
  onToggleAll: () => void
  allCompleted: boolean
  hasTodos: boolean
}

export const Toolbar = ({
  search,
  onSearchChange,
  sort,
  onSortChange,
  onToggleAll,
  allCompleted,
  hasTodos,
}: ToolbarProps) => (
  <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-5">
    <div className="relative min-w-0 flex-1">
      <svg
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
        />
      </svg>
      <Input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="جستجو در کارها…"
        aria-label="جستجو در کارها"
        className="h-9 pr-9 sm:h-8"
      />
    </div>

    <Select value={sort} onValueChange={(value) => onSortChange(value as SortOrder)}>
      <SelectTrigger className="h-9 w-28 shrink-0 sm:h-8" aria-label="ترتیب نمایش">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(sortLabels) as SortOrder[]).map((value) => (
          <SelectItem key={value} value={value}>
            {sortLabels[value]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    <Button
      variant="outline"
      onClick={onToggleAll}
      disabled={!hasTodos}
      className="h-9 shrink-0 sm:h-8"
    >
      {allCompleted ? "همه فعال" : "همه انجام شده"}
    </Button>
  </div>
)