import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import * as middy from 'middy'
import { cors } from 'middy/middlewares'

import { getTodosForUser as getTodosForUser } from '../../helpers/todos'
import { getUserId, parseLimitParameter, parseNextKeyParameter } from '../utils';
import { createLogger } from '../../utils/logger'

const logger = createLogger('todos');
// TODO: Get all TODO items for a current user
export const handler = middy(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // Write your code here
    const userId = getUserId(event);
    try {
      const nextKey = parseNextKeyParameter(event)
      const limit = parseLimitParameter(event) || 4

      const todoData = await getTodosForUser(userId, nextKey, limit);

      return {
        statusCode: 200,
        body: JSON.stringify({ todoData })
      }
    } catch (error) {
      logger.error('Error wiith get todo request: ', error)
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Invalid parameters'
        })
      }
    }
  }
)

handler.use(
  cors({
    credentials: true
  })
)
