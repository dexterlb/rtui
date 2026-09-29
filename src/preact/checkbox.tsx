/** @jsxImportSource preact */
import { useEffect, useState } from "preact/hooks";
import useRT from "./rt.ts";

export type CheckboxProps = {
  checked: boolean;
  label: string;
  className?: string;
  disabled?: boolean;
  onNewUserVal?: (checked: boolean) => Promise<void>;
  syncBackAfter?: number;
};

export function Checkbox(props: CheckboxProps) {
  const [bc, setBc] = useState("");
  const [req, setReq] = useRT({
    realVal: props.checked,
    onNewUserVal: props.onNewUserVal ?? (async () => {}),
    syncBackAfter: props.syncBackAfter,
  });

  useEffect(() => {
    if (req === props.checked) {
      setBc(req ? "checked" : "unchecked");
    } else {
      setBc(req ? "wants-check" : "wants-uncheck");
    }
  }, [req, props.checked]);

  return (
    <span
      className={["checkbox", bc, props.disabled && "disabled", props.className]
        .filter(Boolean)
        .join(" ")}
      onClick={() => {
        if (props.disabled) return;
        setReq(!req);
      }}
    >
      {props.label}
    </span>
  );
}
