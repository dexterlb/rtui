export type ActionHandler = () => Promise<void>;
export type ErrHandler = (err: any) => void;

export type DoOpts = {
  syncBack?: () => void;
  syncBackAfter?: number;
  errHandler?: ErrHandler;
};

type State =
  | { status: "idle" }
  | { status: "exec" }
  | { status: "execAnd"; pending: ActionHandler; opts: DoOpts };

export class Throttler {
  constructor(private dfltOpts?: DoOpts) {}

  public do(action: ActionHandler, opts?: DoOpts) {
    if (opts === undefined) {
      opts = this.dfltOpts;
    }
    if (opts === undefined) {
      opts = {};
    }

    const state = this.getState();
    if (state.status == "idle") {
      this.forkAction(action, opts);
    } else {
      // An action is already in progress, so queue this one to run after.
      // A newly-posted action overrides the current pending action, so
      // there is at most one pending action.
      this.setState({ status: "execAnd", pending: action, opts: opts });
    }
  }

  private forkAction(action: ActionHandler, opts: DoOpts) {
    this.execAction(action, opts); // no await lmaoo
  }

  private async execAction(action: ActionHandler, opts: DoOpts) {
    if (this.syncBackTimer) {
      clearTimeout(this.syncBackTimer);
      this.syncBackTimer = null;
    }

    while (true) {
      this.setState({ status: "exec" });
      try {
        await action();
      } catch (err) {
        if (opts.errHandler) {
          opts.errHandler(err);
        } else {
          console.error("UI action failed: ", err);
        }
        if (opts.syncBack) {
          opts.syncBack();
        }
      }

      const state = this.getState();
      if (state.status == "execAnd") {
        action = state.pending;
        opts = state.opts;
        continue;
      }
      break;
    }

    if (opts.syncBackAfter !== undefined) {
      this.syncBackTimer = setTimeout(
        () => this.doSyncBack(opts),
        opts.syncBackAfter,
      );
    }

    this.setState({ status: "idle" });
  }

  private doSyncBack(opts: DoOpts) {
    this.syncBackTimer = null;
    if (opts.syncBack) {
      opts.syncBack();
    }
    this.setState({ status: "idle" });
  }

  private getState(): State {
    return this.state;
  }
  private setState(state: State) {
    this.state = state;
  }

  private state: State = { status: "idle" };
  private syncBackTimer: ReturnType<typeof setTimeout> | null = null;
}
