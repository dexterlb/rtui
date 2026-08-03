import { describe, it, expect, vi } from "vitest";
import { Throttler } from "../src/throttler";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe("Throttler.do", () => {
  it("executes a single action", async () => {
    const t = new Throttler();

    let ran = false;
    t.do(async () => {
      ran = true;
    });

    await sleep(50);
    expect(ran).toBe(true);
  });

  it("runs only the first and last of slow actions", async () => {
    const t = new Throttler();

    const executed: string[] = [];
    const slow = (label: string) => async () => {
      executed.push(label);
      await sleep(60);
    };

    t.do(slow("a"));
    await sleep(20);

    t.do(slow("b1"));
    await sleep(5);
    t.do(slow("b2"));
    t.do(slow("b3"));

    await sleep(150);
    expect(executed).toEqual(["a", "b3"]);
  });

  it("calls the syncer when (and only when) the action throws", async () => {
    {
      const t = new Throttler();

      let num_syncs = 0;
      let last_err = null;
      t.do(
        async () => {
          throw new Error("boom");
        },
        {
          sync_back: () => {
            num_syncs++;
          },
          err_handler: (err) => {
            last_err = err;
          },
        },
      );

      await sleep(50);
      expect(num_syncs).toBe(1);
      expect(last_err).not.toBe(null);
    }

    {
      const t = new Throttler();

      let num_syncs = 0;
      t.do(async () => {}, {
        sync_back: () => {
          num_syncs++;
        },
      });

      await sleep(50);
      expect(num_syncs).toBe(0);
    }
  });

  it("calls the syncer sync_back_after ms after a successful action", async () => {
    const t = new Throttler();

    let num_syncs = 0;
    t.do(async () => {}, {
      sync_back: () => {
        num_syncs++;
      },
      sync_back_after: 80,
    });

    await sleep(30);
    expect(num_syncs).toBe(0);

    await sleep(120);
    expect(num_syncs).toBe(1);
  });

  it("calls the syncer once, sync_back_after ms after the last action", async () => {
    const t = new Throttler();

    let num_syncs = 0;
    const syncer = () => {
      num_syncs++;
    };
    const slow = () => async () => {
      await sleep(60);
    };

    t.do(slow(), { sync_back: syncer, sync_back_after: 40 });
    await sleep(20);
    t.do(slow(), { sync_back: syncer, sync_back_after: 40 });
    t.do(slow(), { sync_back: syncer, sync_back_after: 40 });

    await sleep(250);
    expect(num_syncs).toBe(1);
  });

  it("cancels a pending sync-back when a new action arrives in the window", async () => {
    const t = new Throttler();

    let a_syncs = 0;
    let b_syncs = 0;

    t.do(async () => {}, {
      sync_back: () => {
        a_syncs++;
      },
      sync_back_after: 60,
    });
    await sleep(20);
    t.do(async () => {}, {
      sync_back: () => {
        b_syncs++;
      },
      sync_back_after: 60,
    });

    await sleep(50);
    expect(a_syncs).toBe(0);
    expect(b_syncs).toBe(0);

    await sleep(80);
    expect(a_syncs).toBe(0);
    expect(b_syncs).toBe(1);
  });
});
