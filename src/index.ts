import { handleRequest, Env as ApiEnv } from './api';
import { handleScheduled, Env as ScheduledEnv } from './scheduled';

export interface Env extends ApiEnv, ScheduledEnv {}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handleRequest(request, env);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    return handleScheduled(event, env, ctx);
  }
};
