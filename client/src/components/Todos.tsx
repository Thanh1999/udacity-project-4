import dateFormat from 'dateformat'
import { History } from 'history'
import update from 'immutability-helper'
import * as React from 'react'
import {
  Button,
  Checkbox,
  Divider,
  Grid,
  Header,
  Icon,
  Input,
  Image,
  Loader
} from 'semantic-ui-react'

import { createTodo, deleteTodo, getTodos, patchTodo } from '../api/todos-api'
import Auth from '../auth/Auth'
import { Todo } from '../types/Todo'

interface TodosProps {
  auth: Auth
  history: History
}

interface TodosState {
  todos: Todo[]
  newTodoName: string
  loadingTodos: boolean
  nextKey: string
  totalCount: number
}

const LIMIT_ITEMS = 3

export class Todos extends React.PureComponent<TodosProps, TodosState> {
  state: TodosState = {
    todos: [],
    newTodoName: '',
    loadingTodos: true,
    nextKey: '',
    totalCount: 0,
  }

  handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ newTodoName: event.target.value })
  }

  onEditButtonClick = (todoId: string) => {
    this.props.history.push(`/todos/${todoId}/edit`)
  }

  onTodoCreate = async (event: React.ChangeEvent<HTMLButtonElement>) => {
    try {
      const dueDate = this.calculateDueDate()
      const newTodo = await createTodo(this.props.auth.getIdToken(), {
        name: this.state.newTodoName,
        dueDate
      })
      this.setState({
        todos: [...this.state.todos, newTodo],
        newTodoName: ''
      })
    } catch {
      alert('Todo creation failed')
    }
  }

  onTodoDelete = async (todoId: string) => {
    try {
      await deleteTodo(this.props.auth.getIdToken(), todoId)
      this.setState({
        todos: this.state.todos.filter(todo => todo.todoId !== todoId)
      })
    } catch {
      alert('Todo deletion failed')
    }
  }

  onTodoCheck = async (pos: number) => {
    try {
      const todo = this.state.todos[pos]
      await patchTodo(this.props.auth.getIdToken(), todo.todoId, {
        name: todo.name,
        dueDate: todo.dueDate,
        done: !todo.done
      })
      this.setState({
        todos: update(this.state.todos, {
          [pos]: { done: { $set: !todo.done } }
        })
      })
    } catch {
      alert('Todo deletion failed')
    }
  }

  async loadTodoData() {
    try {
      if (!this.state.loadingTodos) {
        this.setState({
          loadingTodos: true
        })
      }
      const currentTodo = this.state.todos;
      const todoData = await getTodos(this.props.auth.getIdToken(), this.state.nextKey ?? null, LIMIT_ITEMS);
      currentTodo.push(...todoData?.items);
      this.setState({
        todos: currentTodo,
        loadingTodos: false,
        nextKey: todoData?.nextKey,
        totalCount: todoData?.totalCount
      })
    } catch (e) {
      alert(`Failed to fetch todos: ${(e as Error).message}`)
    }
  }

  onLoadMore() {
    this.loadTodoData();
  }

  componentDidMount() {
    this.loadTodoData();
  }

  render() {
    return (
      <div>
        <Header as="h1">TODOs</Header>

        {this.renderCreateTodoInput()}

        {this.renderTodos()}
      </div>
    )
  }

  renderCreateTodoInput() {
    return (
      <Grid.Row>
        <Grid.Column width={16}>
          <Input
            action={{
              color: 'teal',
              labelPosition: 'left',
              icon: 'add',
              content: 'New task',
              onClick: this.onTodoCreate
            }}
            fluid
            actionPosition="left"
            placeholder="To change the world..."
            onChange={this.handleNameChange}
          />
        </Grid.Column>
        <Grid.Column width={16}>
          <Divider />
        </Grid.Column>
      </Grid.Row>
    )
  }

  renderTodos() {
    if (this.state.loadingTodos) {
      return this.renderLoading()
    }

    return this.renderTodosList()
  }

  renderLoading() {
    return (
      <Grid.Row>
        <Loader indeterminate active inline="centered">
          Loading TODOs
        </Loader>
      </Grid.Row>
    )
  }

  renderTodosList() {
    return (
      <>
        <Grid padded>
          {this.state.todos.map((todo, pos) => {
            return (
              <Grid.Row key={todo.todoId}>
                <Grid.Column width={1} verticalAlign="middle">
                  <Checkbox
                    onChange={() => this.onTodoCheck(pos)}
                    checked={todo.done}
                  />
                </Grid.Column>
                <Grid.Column width={10} verticalAlign="middle">
                  {todo.name}
                </Grid.Column>
                <Grid.Column width={3} floated="right">
                  {todo.dueDate}
                </Grid.Column>
                <Grid.Column width={1} floated="right">
                  <Button
                    icon
                    color="blue"
                    onClick={() => this.onEditButtonClick(todo.todoId)}
                  >
                    <Icon name="pencil" />
                  </Button>
                </Grid.Column>
                <Grid.Column width={1} floated="right">
                  <Button
                    icon
                    color="red"
                    onClick={() => this.onTodoDelete(todo.todoId)}
                  >
                    <Icon name="delete" />
                  </Button>
                </Grid.Column>
                {todo.attachmentUrl && (
                  <Image src={todo.attachmentUrl} size="small" wrapped />
                )}
                <Grid.Column width={16}>
                  <Divider />
                </Grid.Column>
              </Grid.Row>
            )
          })}
        </Grid>
        {this.renderLoadMoreButton()}
      </>
    )
  }

  renderLoadMoreButton() {
    return this.state.nextKey && (this.state.todos.length < this.state.totalCount) && <Button
      color="orange"

      onClick={() => this.onLoadMore()}
    >
      Load More
    </Button>
  }

  calculateDueDate(): string {
    const date = new Date()
    date.setDate(date.getDate() + 7)

    return dateFormat(date, 'yyyy-mm-dd') as string
  }
}
