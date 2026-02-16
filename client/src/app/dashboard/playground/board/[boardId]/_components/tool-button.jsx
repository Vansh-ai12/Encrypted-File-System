"use client";

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/Components/ui/tooltip";
import React from "react";
import { cn } from "@/lib/utils";

export const ToolButton = React.memo(function ToolButton({
  label,
  icon: Icon,
  onClick,
  isActive,
  isDisabled,
  isInteracting,
}) {
  // 🚫 During camera interaction → NO tooltip at all
  if (isInteracting) {
    return (
      <button
        type="button"
        aria-disabled={isDisabled}
        onClick={isDisabled ? undefined : onClick}
        className={cn(
          "size-9 inline-flex items-center justify-center rounded-md",
          isActive
            ? "bg-blue-500/20 text-blue-800"
            : "hover:bg-blue-500/20 hover:text-blue-800",
          isDisabled && "opacity-50 pointer-events-none"
        )}
      >
        <Icon />
      </button>
    );
  }

  // ✅ Normal hover tooltip
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-disabled={isDisabled}
          onClick={isDisabled ? undefined : onClick}
          className={cn(
            "size-9 inline-flex items-center justify-center rounded-md",
            isActive
              ? "bg-blue-500/20 text-blue-800"
              : "hover:bg-blue-500/20 hover:text-blue-800",
            isDisabled && "opacity-50 pointer-events-none"
          )}
        >
          <Icon />
        </button>
      </TooltipTrigger>

      <TooltipContent side="right">
        {label}
      </TooltipContent>
    </Tooltip>
  );
});
