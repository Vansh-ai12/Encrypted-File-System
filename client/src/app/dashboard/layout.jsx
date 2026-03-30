"use client";

import useGlobalTracking from "@/hooks/GlobalTracking";

export default function DashboardLayout({ children }) {
  useGlobalTracking();

  return <>{children}</>;
}