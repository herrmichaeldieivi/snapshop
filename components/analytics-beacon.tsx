"use client";

import { useEffect } from "react";
import { track, type AnalyticsEvent } from "@/src/lib/analytics";

export function AnalyticsBeacon({ event }: { event: AnalyticsEvent }) {
  useEffect(() => { void track(event); }, [event]);
  return null;
}
