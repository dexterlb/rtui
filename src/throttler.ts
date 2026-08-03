export { Throttler }

type ActionHandler = () => Promise<void>
type ErrHandler = (err: any) => Promise<void>

type DoOpts = {
    sync_back?: () => void
    sync_back_after?: number
    err_handler?: ErrHandler
}

class Throttler {
    constructor(private dflt_opts?: DoOpts) {}

    public do(action: ActionHandler, opts?: DoOpts) {
        if (opts === undefined) {
            opts = this.dflt_opts;
        }
        if (opts === undefined) {
            opts = {};
        }

        if (this.state.status == "idle" || this.state.status == "settling") {
            this.fork_action(action, opts);
        } else {
            // An action is already in progress, so queue this one to run after.
            // A newly-posted action overrides the current pending action, so
            // there is at most one pending action.
            this.state = { status: "exec_and", pending: action, opts: opts };
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
            this.state = { status: "exec" };
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

            // A newer action posted while we were running overrides the pending
            // slot; run it next, with its own opts, before settling.
            if (this.state.status == "exec_and") {
                action = this.state.pending;
                opts = this.state.opts;
                continue;
            }
            break;
        }

        if (opts.sync_back_after !== undefined) {
            this.state = { status: "settling" };
            this.sync_back_timer = setTimeout(() => this.do_sync_back(opts), opts.sync_back_after);
        } else {
            this.state = { status: "idle" };
        }
    }

    private do_sync_back(opts: DoOpts) {
        this.sync_back_timer = null;
        if (opts.sync_back) {
            opts.sync_back();
        }
        this.state = { status: "idle" };
    }

    private state: { status: "idle" } | { status: "exec" } | { status: "exec_and", pending: ActionHandler, opts: DoOpts } | { status: "settling" } = { status: "idle" };
    private sync_back_timer: ReturnType<typeof setTimeout> | null = null;
}
