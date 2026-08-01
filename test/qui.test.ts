import { describe, it, expect } from 'vitest';
import { QUI } from '../src/qui';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function runLoop(qui: QUI) {
    const errors: unknown[] = [];
    const done = qui.loop(async (e) => {
        errors.push(e);
    });
    return { errors, done };
}

async function teardown(qui: QUI, done: Promise<void>) {
    qui.stop();
    await done;
}

describe('QUI.add / QUI.loop', () => {
    it('executes a single added action', async () => {
        const qui = new QUI();
        const { done } = runLoop(qui);

        let ran = false;
        qui.add({ handler: async () => { ran = true; } });

        await sleep(50);
        expect(ran).toBe(true);

        await teardown(qui, done);
    });

    it('executes every action when no buckets are used', async () => {
        const qui = new QUI();
        const { done } = runLoop(qui);

        const executed: number[] = [];
        for (let i = 0; i < 5; i++) {
            qui.add({ handler: async () => { executed.push(i); } });
        }

        await sleep(50);
        expect(executed).toEqual([0, 1, 2, 3, 4]);

        await teardown(qui, done);
    });

    it('runs only the first and last of slow same-bucket actions', async () => {
        const qui = new QUI();
        const { done } = runLoop(qui);

        const executed: string[] = [];
        const slow = (label: string) => async () => {
            executed.push(label);
            await sleep(60);
        };

        qui.add({ handler: slow('a'), bucket: 'b' });
        await sleep(20);

        qui.add({ handler: slow('b1'), bucket: 'b' });
        qui.add({ handler: slow('b2'), bucket: 'b' });
        qui.add({ handler: slow('b3'), bucket: 'b' });

        await sleep(150);
        expect(executed).toEqual(['a', 'b3']);

        await teardown(qui, done);
    });

    it('calls the resetter when (and only when) the action throws', async () => {
        {
            const qui = new QUI();
            const { errors, done } = runLoop(qui);

            let reset = 0;
            qui.add({
                handler: async () => { throw new Error('boom'); },
                reset: () => { reset++; },
            });

            await sleep(50);
            expect(reset).toBe(1);
            expect(errors).toHaveLength(1);

            await teardown(qui, done);
        }

        {
            const qui = new QUI();
            const { errors, done } = runLoop(qui);

            let reset = 0;
            qui.add({
                handler: async () => {},
                reset: () => { reset++; },
            });

            await sleep(50);
            expect(reset).toBe(0);
            expect(errors).toHaveLength(0);

            await teardown(qui, done);
        }
    });

    it('calls the resetter reset_after ms after a successful action', async () => {
        const qui = new QUI();
        const { done } = runLoop(qui);

        let reset = 0;
        qui.add({
            handler: async () => {},
            reset: () => { reset++; },
            reset_after: 80,
        });

        await sleep(30);
        expect(reset).toBe(0);

        await sleep(120);
        expect(reset).toBe(1);

        await teardown(qui, done);
    });

    it('calls the resetter once, reset_after ms after the last same-bucket action', async () => {
        const qui = new QUI();
        const { done } = runLoop(qui);

        let reset = 0;
        const resetter = () => { reset++; };
        const slow = () => async () => { await sleep(60); };

        qui.add({ handler: slow(), bucket: 'b', reset: resetter, reset_after: 40 });
        await sleep(20);
        qui.add({ handler: slow(), bucket: 'b', reset: resetter, reset_after: 40 });
        qui.add({ handler: slow(), bucket: 'b', reset: resetter, reset_after: 40 });

        await sleep(250);
        expect(reset).toBe(1);

        await teardown(qui, done);
    });
});
