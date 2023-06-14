import { TodoItem } from "./TodoItem"

export interface TodoList {
    items: TodoItem[]
    nextKey: string
    totalCount?: number
  }
  