"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;

export const Tooltip = TooltipPrimitive.Root;

export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef(
  ({ className, sideOffset = 4, ...props }, ref) => (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        strategy="fixed"
        avoidCollisions={false}
        className={cn(
          "z-[2000] overflow-hidden rounded-md bg-black px-3 py-1.5 text-xs text-white shadow-md",
          className
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  )
);


TooltipContent.displayName = TooltipPrimitive.Content.displayName;
