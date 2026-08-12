/** @jsxImportSource preact */
import { useState } from "preact/hooks";
import { useSignal } from '@preact/signals';
import useRT from "./rt.ts";

export type SliderProps = {
  value: number;
  min: number;
  max: number;
  className?: string;
  onNewUserVal?: (value: number) => Promise<void>;
  syncBackAfter?: number;
  syncBackAfterDuringDrag?: number;
  direction: "vertical" | "horizontal";
  extraIndicators?: [string, number][]; // list of tuples key -> coef to display in addition to 'real' and 'user'
};

export function Slider(props: SliderProps) {
  const [dragging, setDragging] = useState(false);

  const syncBackAfter = useSignal(props.syncBackAfter);

  const [req, setReq] = useRT({
    realVal: props.value,
    onNewUserVal: props.onNewUserVal ?? (async () => {}),
    syncBackAfter: syncBackAfter,
  });

  const pct = (value: number) => {
    const { min, max } = props;
    const frac = (value - min) / (max - min);
    return Math.min(100, Math.max(0, frac * 100));
  };

  const barStyle = (value: number) => {
    const size = `${pct(value)}%`;
    if (props.direction == "vertical") {
      return { height: size };
    } else {
      return { width: size };
    }
  };

  const handlePointerCommit = (e: PointerEvent) => {
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

  const handlePointerDown = (e: PointerEvent) => {
    if (props.syncBackAfterDuringDrag !== undefined) {
      syncBackAfter.value = props.syncBackAfterDuringDrag;
    }
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    handlePointerCommit(e);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (dragging) handlePointerCommit(e);
  };

  const handlePointerUp = (e: PointerEvent) => {
    syncBackAfter.value = props.syncBackAfter;
    setDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    handlePointerCommit(e);
  };

  const { extraIndicators, value } = props;

  return (
    <div
      className={["slider", props.direction, props.className]
        .filter(Boolean)
        .join(" ")}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="real" style={barStyle(value)} />
      <div className="user" style={barStyle(req)} />
      {extraIndicators?.map(([cls, v]) => (
        <div key={cls} className={cls} style={barStyle(v)} />
      ))}
    </div>
  );
}
