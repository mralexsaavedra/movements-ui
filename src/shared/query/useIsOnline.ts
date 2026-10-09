import { useSyncExternalStore } from "react";

import { onlineManager } from "@tanstack/react-query";

const subscribe = (onChange: () => void) => onlineManager.subscribe(onChange);
const getSnapshot = () => onlineManager.isOnline();

/** React Query's view of connectivity (fed by `configureQueryManagers`). */
export const useIsOnline = (): boolean => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
