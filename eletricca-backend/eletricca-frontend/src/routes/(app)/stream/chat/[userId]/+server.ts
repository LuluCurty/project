import { chatEvents } from "$lib/server/events";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, locals }) => {
    const currentUser = locals.user?.user_id;
    const talkingToId = parseInt(params.userId);
    if (!currentUser) return new Response('Unauthorized', { status: 401 });

    const chatKey = [currentUser, talkingToId].sort((a, b) => a - b).join('-');

    let isAlive = true;

    const stream = new ReadableStream({
        start(controller) {
            const onMessage = (data: any) => {
                if (!isAlive) return;

                try {
                    const message = `data: ${JSON.stringify(data)}\n\n`;
                    controller.enqueue(message);
                } catch (e) {
                    console.warn(`Stream fechada forçadamente para ${chatKey}`);
                    cleanup();
                }
            };

            const cleanup = () => {
                isAlive = false;
                chatEvents.off(`message:${chatKey}`, onMessage);
                console.log(`SSE: Desconectado de ${chatKey}`);
                try {
                    controller.close()
                } catch (e) {
                    console.error(e);
                }
            };

            chatEvents.on(`message:${chatKey}`, onMessage);
            console.log(`SSE: Conectado ao chat ${chatKey}`);
            
            return () => cleanup();
        },

        cancel() {
            isAlive = false;
            chatEvents.removeAllListeners(`message:${chatKey}`);
            console.log(`SSE: Desconectado de ${chatKey}`);
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        }
    })

}