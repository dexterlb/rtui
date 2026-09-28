/** @jsxImportSource preact */
import type { ComponentChildren } from "preact";

export type ChoiceProps = {
  options: string[];
  className?: string;
  transform?: (option: string) => ComponentChildren;
};

export function Choice(props: ChoiceProps) {
  const transform = props.transform ?? ((option: string) => option);

  return (
    <div className={["choice", props.className].filter(Boolean).join(" ")}>
      {props.options.map((option) => (
        <span key={option} className="option">
          {transform(option)}
        </span>
      ))}
    </div>
  );
}