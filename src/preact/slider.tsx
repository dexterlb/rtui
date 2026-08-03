/** @jsxImportSource preact */
import { useState } from "preact/hooks";
import useRT from "./rt.ts";

export type SliderProps = {
  id: string;
  value: number;
  min: number;
  max: number;
  on_new_user_val?: (value: number) => Promise<void>;
  reset_after?: number;
  direction: "vertical" | "horizontal";
  extra_indicators?: [string, number][]; // list of tuples key -> coef to display in addition to 'real' and 'user'
};

export function Slider(props: SliderProps) {
  const [dragging, setDragging] = useState(false);

  const [req, setReq] = useRT({
    real_val: props.value,
    on_new_user_val: props.on_new_user_val ?? (async () => {}),
    sync_back_after: props.reset_after,
  });

  const pct = (value: number) => {
    const { min, max } = props;
    const frac = (value - min) / (max - min);
    return Math.min(100, Math.max(0, frac * 100));
  };

  const bar_style = (value: number) => {
    const size = `${pct(value)}%`;
    if (props.direction == "vertical") {
      return { height: size };
    } else {
      return { width: size };
    }
  };

  const handle_pointer_commit = (e: PointerEvent) => {
    const { min, max, direction } = props;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const frac =
      direction === "vertical"
        ? 1 - (e.clientY - rect.top) / rect.height
        : (e.clientX - rect.left) / rect.width;

    const clamped = Math.min(1, Math.max(0, frac));
    const value = min + clamped * (max - min);
    setReq(value);
  };

  const handle_pointer_down = (e: PointerEvent) => {
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    handle_pointer_commit(e);
  };

  const handle_pointer_move = (e: PointerEvent) => {
    if (dragging) handle_pointer_commit(e);
  };

  const handle_pointer_up = (e: PointerEvent) => {
    setDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const { id, extra_indicators, value, direction } = props;

  return (
    <div
      className={`slider ${direction}`}
      id={id}
      onPointerDown={handle_pointer_down}
      onPointerMove={handle_pointer_move}
      onPointerUp={handle_pointer_up}
    >
      <div className="real" style={bar_style(value)} />
      <div className="user" style={bar_style(req)} />
      {extra_indicators?.map(([cls, v]) => (
        <div key={cls} className={cls} style={bar_style(v)} />
      ))}
    </div>
  );
}
