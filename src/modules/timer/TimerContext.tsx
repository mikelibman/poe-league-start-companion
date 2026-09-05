import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { loadTargetRoute, saveTargetRoute } from "./targetRoute";
import { useRunTracker } from "./useRunTracker";
import type { TargetRouteEntry } from "./types";

interface TimerContextValue extends ReturnType<typeof useRunTracker> {
  targetRoute: TargetRouteEntry[];
  setTargetRoute: (route: TargetRouteEntry[]) => void;
  targetRouteLoaded: boolean;
}

const TimerContext = createContext<TimerContextValue | null>(null);

// Lives at the app root (not inside the Timer page) so run tracking keeps
// running while the user is on another tab mid-race.
export function TimerProvider({ children }: { children: ReactNode }) {
  const [targetRoute, setTargetRouteState] = useState<TargetRouteEntry[]>([]);
  const [targetRouteLoaded, setTargetRouteLoaded] = useState(false);

  useEffect(() => {
    loadTargetRoute().then((route) => {
      setTargetRouteState(route);
      setTargetRouteLoaded(true);
    });
  }, []);

  function setTargetRoute(route: TargetRouteEntry[]) {
    setTargetRouteState(route);
    void saveTargetRoute(route);
  }

  const tracker = useRunTracker(targetRoute);

  return (
    <TimerContext.Provider
      value={{ ...tracker, targetRoute, setTargetRoute, targetRouteLoaded }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) {
    throw new Error("useTimer must be used within a TimerProvider");
  }
  return ctx;
}
