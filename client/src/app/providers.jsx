"use client";
import { TooltipProvider } from "@/Components/ui/tooltip";

export function Providers({ children }) {
  return (
    <TooltipProvider delayDuration={100}>
      {children}
    </TooltipProvider>
  );
}
