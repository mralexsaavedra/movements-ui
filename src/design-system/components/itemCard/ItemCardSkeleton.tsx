import { useEffect, useMemo, useState } from "react";

import { Animated, View } from "react-native";

import { useReduceMotion } from "@/design-system/components/motion/useReduceMotion";
import { useTheme } from "@/design-system/theme";

import { style } from "./ItemCardSkeleton.style";

export interface ItemCardSkeletonProps {
  readonly testID?: string;
}

/**
 * Loading placeholder with the `ItemCard` layout. Hidden from assistive technologies: the list
 * announces loading once instead of every placeholder row. Static when reduce motion is on.
 */
export function ItemCardSkeleton({ testID }: ItemCardSkeletonProps) {
  const theme = useTheme();
  const styles = useMemo(() => style(theme), [theme]);
  const reduceMotion = useReduceMotion();
  const { opacityMin, opacityMax, pulseDuration } = theme.skeleton;
  const [opacity] = useState(() => new Animated.Value(opacityMax));

  useEffect(() => {
    opacity.setValue(opacityMax);
    if (reduceMotion) return undefined;

    // One pulse (`pulseDuration`) fades out and back in.
    const halfPulse = pulseDuration / 2;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: opacityMin,
          duration: halfPulse,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: opacityMax,
          duration: halfPulse,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity, opacityMin, opacityMax, pulseDuration, reduceMotion]);

  return (
    <View testID={testID} aria-hidden style={styles.container}>
      <Animated.View
        testID={testID === undefined ? undefined : `${testID}-pulse`}
        style={[styles.pulse, { opacity }]}
      >
        <View style={styles.avatar} />
        <View style={styles.content}>
          <View style={styles.titleLine}>
            <View style={styles.titleBar} />
          </View>
          <View style={styles.subtitleLine}>
            <View style={styles.subtitleBar} />
          </View>
        </View>
        <View style={styles.amountLine}>
          <View style={styles.amountBar} />
        </View>
      </Animated.View>
    </View>
  );
}
