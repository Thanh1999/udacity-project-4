import * as AWS from 'aws-sdk'
import { DocumentClient, Key } from 'aws-sdk/clients/dynamodb'
import { createLogger } from '../utils/logger'
import { TodoItem } from '../models/TodoItem'
import { TodoUpdate } from '../models/TodoUpdate';
import { TodoList } from '../models/TodoList';
const AWSXRay = require('aws-xray-sdk')

const XAWS = AWSXRay.captureAWS(AWS)

const logger = createLogger('TodosAccess')

// TODO: Implement the dataLayer logic
export class TodosAccess {
    constructor(
        private readonly docClient: DocumentClient = createDynamoDBClient(),
        private readonly todosTable = process.env.TODOS_TABLE,
        private readonly userIdIndex = process.env.TODOS_CREATED_AT_INDEX
    ) { }

    async getTodos(userId: string, nextKey: Key, limit: number): Promise<TodoList> {
        logger.info(`Get todos for userId ${userId}`);
        const result = await this.docClient
            .query({
                TableName: this.todosTable,
                IndexName: this.userIdIndex,
                KeyConditionExpression: 'userId = :userId',
                ExpressionAttributeValues: {
                    ':userId': userId
                },
                Limit: limit,
                ExclusiveStartKey: nextKey
            })
            .promise()

        return {
            items: result.Items as TodoItem[],
            nextKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null,
        }
    }

    async getTotalCount(userId: string): Promise<number> {
        logger.info(`Get total todos count userId ${userId}`);
        const result = await this.docClient
            .query({
                TableName: this.todosTable,
                IndexName: this.userIdIndex,
                KeyConditionExpression: 'userId = :userId',
                ExpressionAttributeValues: {
                    ':userId': userId
                },
                Select: 'COUNT'
            })
            .promise()

        return result.Count;
    }

    async getTodoById(todoId: string, userId: string): Promise<TodoItem> {
        logger.info(`Get all todos for userId ${userId}`);
        const result = await this.docClient
            .get({
                TableName: this.todosTable,
                Key: {
                    'userId': userId,
                    'todoId': todoId,
                },
            })
            .promise()

        return result.Item as TodoItem;
    }

    async deleteTodo(todoId: string, userId: string) {
        logger.info(`Delete todo ${todoId} for userId ${userId}`);
        await this.docClient
            .delete({
                TableName: this.todosTable,
                Key: {
                    'userId': userId,
                    'todoId': todoId,
                }
            })
            .promise()

        logger.info(`Delete successfully for todo ${todoId}`);
    }

    async createTodo(todoId: string, todoData: TodoItem, userId: string): Promise<TodoItem> {

        try {
            await this.docClient.put({
                TableName: this.todosTable,
                Item: todoData
            }).promise();
            logger.info(`Created TODO item with ID ${todoId} for user ${userId}`);
            return todoData;
        } catch (error) {
            logger.error(`Error creating TODO item with ID ${todoId} for user ${userId}:`, error);
            throw error;
        }
    }

    async updateTodo(todoId: string, userId: string, todoUpdate: TodoUpdate): Promise<TodoItem> {

        try {
            const params = {
                TableName: this.todosTable,
                Key: {
                    'userId': userId,
                    'todoId': todoId,
                },
                UpdateExpression: 'set #name = :name, dueDate = :dueDate, done = :done',
                ExpressionAttributeValues: {
                    ':name': todoUpdate.name,
                    ':dueDate': todoUpdate.dueDate,
                    ':done': todoUpdate.done
                },
                ExpressionAttributeNames: {
                    '#name': 'name'
                },
                ReturnValues: 'UPDATED_NEW'
            };
            const result = await this.docClient.update(params).promise();
            logger.info(`Updated TODO item with ID ${todoId} for user ${userId}`);
            return result.Attributes as TodoItem;
        } catch (error) {
            logger.error(`Error updating TODO item with ID ${todoId} for user ${userId}:`, error);
            throw error;
        }
    }

    async updateAttachmentUrl(todoId: string, userId: string, url: string) {
        logger.info(`Update attachment url of todo ${todoId}`);

        await this.docClient.update({
            TableName: this.todosTable,
            Key: {
                'userId': userId,
                'todoId': todoId,
            },
            UpdateExpression: "set attachmentUrl = :url",
            ExpressionAttributeValues: {
                ":url": url,
            }
        }).promise();
    }
}

function createDynamoDBClient() {
    if (process.env.IS_OFFLINE) {
        logger.info('Creating a local DynamoDB instance')
        return new XAWS.DynamoDB.DocumentClient({
            region: 'localhost',
            endpoint: 'http://localhost:8000'
        })
    }

    return new XAWS.DynamoDB.DocumentClient()
}