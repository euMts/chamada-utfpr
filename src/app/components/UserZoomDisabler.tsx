"use client";

import { useEffect } from "react";

export default function UserZoomDisabler() {
  useEffect(() => {
    const preventDefault = (event: Event) => {
      event.preventDefault();
    };

    const preventMultiTouch = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    const preventCtrlWheel = (event: WheelEvent) => {
      if (event.ctrlKey) {
        event.preventDefault();
      }
    };

    document.addEventListener("gesturestart", preventDefault, { passive: false });
    document.addEventListener("gesturechange", preventDefault, { passive: false });
    document.addEventListener("gestureend", preventDefault, { passive: false });
    document.addEventListener("touchmove", preventMultiTouch, { passive: false });
    window.addEventListener("wheel", preventCtrlWheel, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", preventDefault);
      document.removeEventListener("gesturechange", preventDefault);
      document.removeEventListener("gestureend", preventDefault);
      document.removeEventListener("touchmove", preventMultiTouch);
      window.removeEventListener("wheel", preventCtrlWheel);
    };
  }, []);

  return null;
}
