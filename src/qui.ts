export { QUI }

import { AsyncQueue } from '@borewit/async-queue';

type ActionHandler = () => Promise<void>;
type EventHandler = (evt: Event) => Promise<void>;

interface Action {
    t: "action"
    handler: ActionHandler
    reset?: () => void
    reset_after?: number
    bucket?: string
}

interface Stop {
    t: "stop"
}

class QUI {
    private queue: AsyncQueue<Action | Stop> = new AsyncQueue<Action | Stop>;
    public add(opts: { handler: ActionHandler, bucket?: string, reset?: () => void, reset_after?: number }) {
        const { handler, bucket, reset, reset_after } = opts;

        if (bucket !== undefined) {
            const prev_resetter = this.resetters.get(bucket)
            if (prev_resetter) {
                clearTimeout(prev_resetter)
            }

            const bucket_handler = async () => {
                this.buckets.delete(bucket);
                return await handler();
            };

            var bucket_action = this.buckets.get(bucket)
            if (bucket_action !== undefined) {
                // override the previous handler
                bucket_action.handler = bucket_handler;
            } else {
                bucket_action = { t: "action", bucket: bucket, handler: bucket_handler, reset: reset, reset_after: reset_after }
                this.buckets.set(bucket, bucket_action);
                this.queue.push(bucket_action);
            }

            return
        }

        this.queue.push({ t: "action", bucket: bucket, handler: handler, reset: reset, reset_after: reset_after});
    }

    public stop() {
        this.queue.push({t: 'stop'});
    }

    public addEventListener(el: HTMLElement, type: string, handler: EventHandler) {
        el.addEventListener(type, (evt) => this.add({
            handler: async () => { await handler(evt); },
            bucket: el.id,
        }))
    }

    public async loop(err_handler: (err: any) => Promise<void>) {
        while (true) {
            const baba = await this.queue.next();
            if (baba.t == 'action') {
                try {
                    await baba.handler();
                    if (baba.reset && baba.reset_after) {
                        const resetter = setTimeout(baba.reset, baba.reset_after);
                        if (baba.bucket !== undefined) {
                            this.resetters.set(baba.bucket, resetter);
                        }
                    }
                } catch (err) {
                    if (baba.reset) {
                        baba.reset();
                    }
                    await err_handler(err);
                }
            }
            if (baba.t == 'stop') {
                return;
            }
        }
    }

    private buckets: Map<string, Action> = new Map();
    private resetters: Map<string, ReturnType<typeof setTimeout>> = new Map();
}
