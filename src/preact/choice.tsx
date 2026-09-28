/** @jsxImportSource preact */
import type { ComponentChildren } from "preact";
import useRT from "./rt.ts";

export type ChoiceProps = {
  options: string[];
  value: string;
  className?: string;
  transform?: (option: string) => ComponentChildren;
  onNewUserVal?: (value: string) => Promise<void>;
  syncBackAfter?: number;
};

export function Choice(props: ChoiceProps) {
  const transform = props.transform ?? ((option: string) => option);

  const [req, setReq] = useRT({
    realVal: props.value,
    onNewUserVal: props.onNewUserVal ?? (async () => {}),
    syncBackAfter: props.syncBackAfter,
  });

  return (
    <div className={["choice", props.className].filter(Boolean).join(" ")}>
      {props.options.map((option) => {
        const cls = [
          "option",
          option == props.value && "real",
          option == req && "user",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <span key={option} className={cls} onClick={() => setReq(option)}>
            {transform(option)}
          </span>
        );
      })}
    </div>
  );
}