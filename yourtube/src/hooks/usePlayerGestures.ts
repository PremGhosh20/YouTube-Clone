import { useCallback, useRef } from "react";

export type GestureZone = "left" | "center" | "right";

type GestureHandlers = {
  onSingleTap?: (zone: GestureZone) => void;
  onDoubleTap?: (zone: GestureZone) => void;
  onTripleTap?: (zone: GestureZone) => void;
};

const TAP_WINDOW_MS = 350;

function getZone(clientX: number, width: number): GestureZone {
  const ratio = clientX / width;
  if (ratio < 1 / 3) return "left";
  if (ratio > 2 / 3) return "right";
  return "center";
}

export function usePlayerGestures(handlers: GestureHandlers) {
  const tapCountRef = useRef(0);
  const tapZoneRef = useRef<GestureZone | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const flushTaps = useCallback(() => {
    const count = tapCountRef.current;
    const zone = tapZoneRef.current;
    tapCountRef.current = 0;
    tapZoneRef.current = null;
    timerRef.current = null;

    if (!zone || count === 0) return;

    const h = handlersRef.current;
    if (count >= 3) {
      h.onTripleTap?.(zone);
    } else if (count === 2) {
      h.onDoubleTap?.(zone);
    } else if (count === 1) {
      h.onSingleTap?.(zone);
    }
  }, []);

  const registerTap = useCallback(
    (zone: GestureZone) => {
      if (tapZoneRef.current && tapZoneRef.current !== zone) {
        flushTaps();
      }

      tapZoneRef.current = zone;
      tapCountRef.current += 1;

      if (tapCountRef.current >= 3) {
        clearTimer();
        const z = tapZoneRef.current;
        tapCountRef.current = 0;
        tapZoneRef.current = null;
        handlersRef.current.onTripleTap?.(z!);
        return;
      }

      clearTimer();
      timerRef.current = setTimeout(flushTaps, TAP_WINDOW_MS);
    },
    [flushTaps]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const zone = getZone(e.clientX - rect.left, rect.width);
      registerTap(zone);
    },
    [registerTap]
  );

  return { handlePointerUp, getZone };
}
