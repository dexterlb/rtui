export type ActionHandler = () => Promise<void>
export type ErrHandler = (err: any) => Promise<void>

export type DoOpts = {
    sync_back?: () => void
    sync_back_after?: number
    err_handler?: ErrHandler
}

type State =
    | { status: "idle" }
    | { status: "exec" }
    | { status: "exec_and", pending: ActionHandler, opts: DoOpts }
    | { status: "settling" }

export class Throttler {
    constructor(private dflt_opts?: DoOpts) {}

    public do(action: ActionHandler, opts?: DoOpts) {
        if (opts === undefined) {
            opts = this.dflt_opts;
        }
        if (opts === undefined) {
            opts = {};
        }

        const state = this.get_state();
        if (state.status == "idle" || state.status == "settling") {
            this.fork_action(action, opts);
        } else {
            // An action is already in progress, so queue this one to run after.
            // A newly-posted action overrides the current pending action, so
            // there is at most one pending action.
            this.set_state({ status: "exec_and", pending: action, opts: opts });
        }
    }

    private fork_action(action: ActionHandler, opts: DoOpts) {
        this.exec_action(action, opts);  // no await lmaoo
    }

    private async exec_action(action: ActionHandler, opts: DoOpts) {
        if (this.sync_back_timer) {
            clearTimeout(this.sync_back_timer);
            this.sync_back_timer = null;
        }

        while (true) {
            this.set_state({ status: "exec" });
            try {
                await action();
            } catch (err) {
                if (opts.err_handler) {
                    opts.err_handler(err);
                } else {
                    console.error('UI action failed: ', err);
                }
                if (opts.sync_back) {
                    opts.sync_back();
                }
            }

            const state = this.get_state();
            if (state.status == "exec_and") {
                action = state.pending;
                opts = state.opts;
                continue;
            }
            break;
        }

        if (opts.sync_back_after !== undefined) {
            this.set_state({ status: "settling" });
            this.sync_back_timer = setTimeout(
                () => this.do_sync_back(opts),
                opts.sync_back_after
            );
        } else {
            this.set_state({ status: "idle" });
        }
    }

    private do_sync_back(opts: DoOpts) {
        this.sync_back_timer = null;
        if (opts.sync_back) {
            opts.sync_back();
        }
        this.set_state({ status: "idle" });
    }

    private get_state(): State {
        return this.state;
    }
    private set_state(state: State) {
        this.state = state;
    }

    private state: State = { status: "idle" };
    private sync_back_timer: ReturnType<typeof setTimeout> | null = null;
}
