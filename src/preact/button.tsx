/** @jsxImportSource preact */
import type { VNode } from "preact";
import { useContext, useState } from "preact/hooks";
import { ErrHandlerCtx } from "./err_context.ts";

export type ButtonProps = {
  label: string | VNode;
  className?: string;
  action: () => Promise<void>;
};

export function Button(props: ButtonProps) {
  const [busy, setBusy] = useState(false);
  const errHandler = useContext(ErrHandlerCtx);

  const succeed = () => {
    setBusy(false);
  };

  const fail = (err: any) => {
    setBusy(false);
    errHandler(err);
  };

  const doAction = () => {
    setBusy(true);
    props.action().then(succeed).catch(fail);
  };

  const busyClass = busy ? "busy" : "not-busy";

  return (
    <button
      className={[busyClass, props.className].filter(Boolean).join(" ")}
      disabled={busy}
      onClick={doAction}
    >
      {props.label}
    </button>
  );
}
