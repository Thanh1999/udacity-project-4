import { TodosAccess } from './todosAcess'
import { AttachmentUtils } from './attachmentUtils';
import { TodoItem } from '../models/TodoItem'
import { CreateTodoRequest } from '../requests/CreateTodoRequest'
import { UpdateTodoRequest } from '../requests/UpdateTodoRequest'
import { createLogger } from '../utils/logger'
import * as uuid from 'uuid'
import * as createError from 'http-errors'
import { TodoList } from '../models/TodoList';
import { Key } from 'aws-sdk/clients/dynamodb';

// TODO: Implement businessLogic
const logger = createLogger('todos');
const todosAcess = new TodosAccess();
const attachmentUtils = new AttachmentUtils();

export async function getTodosForUser(userId: string, nextKey: Key, limit: number): Promise<TodoList> {
    logger.info('Process business for getTodosForUser');
    const totalCount = await todosAcess.getTotalCount(userId);
    const todoList = await todosAcess.getTodos(userId, nextKey, limit);
    return {
        ...todoList,
        totalCount
    }
}

export async function deleteTodo(todoId: string, userId: string) {
    logger.info('Process business for deleteTodo');
    const todoItem = await todosAcess.getTodoById(todoId, userId);
    if (!todoItem) {
        throw createError(404, 'TODO item not found');
    }

    if (todoItem.attachmentUrl) {
        try{
        const url = todoItem.attachmentUrl;
        const imageId = url.slice(url.lastIndexOf('/') + 1);
        await attachmentUtils.deleteObject(imageId).promise();
        logger.info('Delete image for todoid: ', todoId);
        }catch(error){
            logger.error('Cant delete image with error: ', error);
        }
    }
    return todosAcess.deleteTodo(todoId, userId);
}

export async function createTodo(todoRequest: CreateTodoRequest, userId: string): Promise<TodoItem> {
    logger.info('Process business for createTodo');
    const todoId = uuid.v4();
    const date = new Date();
    const todoData: TodoItem = {
        ...todoRequest,
        todoId,
        userId,
        createdAt: date.toISOString(),
        done: false,
    }
    return todosAcess.createTodo(todoId, todoData, userId);
}

export async function updateTodo(todoId: string, userId: string, todoRequest: UpdateTodoRequest): Promise<TodoItem> {
    logger.info('Process business for updateTodo');
    const todoItem = await todosAcess.getTodoById(todoId, userId);
    if (!todoItem) {
        throw createError(404, 'TODO item not found');
    }
    return todosAcess.updateTodo(todoId, userId, todoRequest);
}

export async function createAttachmentPresignedUrl(todoId: string, userId: string): Promise<string> {
    const todoItem = await todosAcess.getTodoById(todoId, userId);
    if (!todoItem) {
        throw createError(404, 'TODO item not found');
    }
    const imageId = uuid.v4();
    const url = attachmentUtils.getAttachmentUrl(imageId);
    await todosAcess.updateAttachmentUrl(todoId, userId, url);
    return attachmentUtils.getUploadUrl(imageId);
}