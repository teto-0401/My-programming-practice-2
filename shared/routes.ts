
import { z } from 'zod';
import { insertVmSchema, vms } from './schema';

export const api = {
  vm: {
    get: {
      method: 'GET' as const,
      path: '/api/vm',
      responses: {
        200: z.custom<typeof vms.$inferSelect>(),
        404: z.object({ message: z.string() }),
      },
    },
    upload: {
      method: 'POST' as const,
      path: '/api/vm/upload',
      // Input is FormData, handled separately
      responses: {
        200: z.object({ success: z.boolean(), path: z.string(), filename: z.string() }),
        400: z.object({ message: z.string() }),
      },
    },
    start: {
      method: 'POST' as const,
      path: '/api/vm/start',
      responses: {
        200: z.object({ success: z.boolean(), message: z.string() }),
        400: z.object({ message: z.string() }),
      },
    },
    stop: {
      method: 'POST' as const,
      path: '/api/vm/stop',
      responses: {
        200: z.object({ success: z.boolean(), message: z.string() }),
        400: z.object({ message: z.string() }),
      },
    },
  },
};
