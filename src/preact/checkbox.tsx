import { useEffect, useState } from "preact/hooks";
import useRT from "./rt.ts";

export type CheckboxProps = {
  id: string;
  checked: boolean;
  label: string;
  className?: string;
  on_new_user_val?: (checked: boolean) => any;
  reset_after?: number;
};

export function Checkbox(props: CheckboxProps) {
  const [bc, setBc] = useState("");
  const [req, setReq] = useRT({
    real_val: props.checked,
    on_new_user_val: props.on_new_user_val ?? (async () => null),
    sync_back_after: props.reset_after,
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
      id={props.id}
      className={["checkbox", bc, props.className].filter(Boolean).join(" ")}
      onClick={() => setReq(!req)}
    >
      {props.label}
    </span>
  );
}
