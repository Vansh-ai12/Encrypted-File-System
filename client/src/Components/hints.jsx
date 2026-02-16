"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/Components/ui/tooltip";

const HintTrigger = React.forwardRef(function HintTrigger(
  { children, ...props },
  ref
) {
  return (
    <span ref={ref} className="inline-flex" {...props}>
      {children}
    </span>
  );
});

export const Hint = React.memo(function Hint({
  label,
  children,
  side,
  align,
  sideOffset,
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HintTrigger>{children}</HintTrigger>
      </TooltipTrigger>

      <TooltipContent side={side} align={align} sideOffset={sideOffset}>
        <p className="font-semibold capitalize">{label}</p>
      </TooltipContent>
    </Tooltip>
  );
});
