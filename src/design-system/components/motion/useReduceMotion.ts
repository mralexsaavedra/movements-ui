import { useEffect, useState } from "react";

import { AccessibilityInfo } from "react-native";

/**
 * Whether the OS "reduce motion" setting is on. Starts as `false` until the first read resolves
 * (one frame of motion at most), then follows live changes.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let changedByEvent = false;
    let mounted = true;

    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
      changedByEvent = true;
      setReduceMotion(enabled);
    });
    // A change event that arrives first is newer than the initial read: keep it.
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted && !changedByEvent) setReduceMotion(enabled);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
