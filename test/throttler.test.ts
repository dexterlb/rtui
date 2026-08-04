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

      let numSyncs = 0;
      let lastErr = null;
      t.do(
        async () => {
          throw new Error("boom");
        },
        {
          syncBack: () => {
            numSyncs++;
          },
          errHandler: (err) => {
            lastErr = err;
          },
        },
      );

      await sleep(50);
      expect(numSyncs).toBe(1);
      expect(lastErr).not.toBe(null);
    }

    {
      const t = new Throttler();

      let numSyncs = 0;
      t.do(async () => {}, {
        syncBack: () => {
          numSyncs++;
        },
      });

      await sleep(50);
      expect(numSyncs).toBe(0);
    }
  });

  it("calls the syncer syncBackAfter ms after a successful action", async () => {
    const t = new Throttler();

    let numSyncs = 0;
    t.do(async () => {}, {
      syncBack: () => {
        numSyncs++;
      },
      syncBackAfter: 80,
    });

    await sleep(30);
    expect(numSyncs).toBe(0);

    await sleep(120);
    expect(numSyncs).toBe(1);
  });

  it("calls the syncer once, syncBackAfter ms after the last action", async () => {
    const t = new Throttler();

    let numSyncs = 0;
    const syncer = () => {
      numSyncs++;
    };
    const slow = () => async () => {
      await sleep(60);
    };

    t.do(slow(), { syncBack: syncer, syncBackAfter: 40 });
    await sleep(20);
    t.do(slow(), { syncBack: syncer, syncBackAfter: 40 });
    t.do(slow(), { syncBack: syncer, syncBackAfter: 40 });

    await sleep(250);
    expect(numSyncs).toBe(1);
  });

  it("cancels a pending sync-back when a new action arrives in the window", async () => {
    const t = new Throttler();

    let aSyncs = 0;
    let bSyncs = 0;

    t.do(async () => {}, {
      syncBack: () => {
        aSyncs++;
      },
      syncBackAfter: 60,
    });
    await sleep(20);
    t.do(async () => {}, {
      syncBack: () => {
        bSyncs++;
      },
      syncBackAfter: 60,
    });

    await sleep(50);
    expect(aSyncs).toBe(0);
    expect(bSyncs).toBe(0);

    await sleep(80);
    expect(aSyncs).toBe(0);
    expect(bSyncs).toBe(1);
  });
});
