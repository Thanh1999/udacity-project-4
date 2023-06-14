import { Todo } from "./Todo"

export interface TodoList {
  items: Todo[],
  nextKey: string,
  totalCount: number
}
