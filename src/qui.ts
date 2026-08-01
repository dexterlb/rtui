export { QUI }

import { AsyncQueue } from '@borewit/async-queue';

type ActionHandler = () => Promise<void>;
type EventHandler = (evt: Event) => Promise<void>;

interface Action {
    t: "action"
    handler: ActionHandler
}
interface Stop {
    t: "stop"
}

class QUI {
    private queue: AsyncQueue<Action | Stop> = new AsyncQueue<Action | Stop>;
    public add(handler: ActionHandler, bucket?: string) {
        if (bucket !== undefined) {
            const bucket_handler = async () => {
                buckets.delete(bucket);
                return await handler;
            };

            if (this.buckets.has(bucket)) {
                // override the previous handler
                this.buckets.get(bucket).handler = bucket_handler;
            } else {
                this.buckets.set(bucket, { t: "action", handler: bucket_handler });
            }

            this.queue.push(bucket_handler);
            return
        }

        this.queue.push({ t: "action", handler: handler});
    }

    public stop() {
        this.queue.push({t: 'stop'});
    }

    public addEventListener(el: HTMLElement, type: string, handler: EventHandler) {
        el.addEventListener(type, (evt) => this.add(async () => { await handler(evt); }, el.id))
    }

    public async loop(err_handler: (err: any) => Promise<void>) {
        while (true) {
            const baba = await this.queue.next();
            if (baba.t == 'action') {
                try {
                    await baba.handler();
                } catch (err) {
                    await err_handler(err);
                }
            }
            if (baba.t == 'stop') {
                return;
            }
        }
    }
}
