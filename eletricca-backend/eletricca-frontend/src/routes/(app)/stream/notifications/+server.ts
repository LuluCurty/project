import { notificationEvents } from '$lib/server/events';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
    const userId = locals.user?.user_id;
    if (!userId) return new Response('Unauthorized', { status: 401 });

    let isAlive = true;

    const stream = new ReadableStream({
        start(controller) {
            const onNotification = (data: any) => {
                if (!isAlive) return;
                try {
                    controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
                } catch {
                    cleanup();
                }
            };

            const cleanup = () => {
                isAlive = false;
                notificationEvents.off(`notification:${userId}`, onNotification);
                try { controller.close(); } catch { /* already closed */ }
            };

            notificationEvents.on(`notification:${userId}`, onNotification);

            return () => cleanup();
        },

        cancel() {
            isAlive = false;
            notificationEvents.removeAllListeners(`notification:${userId}`);
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        }
    });
};
