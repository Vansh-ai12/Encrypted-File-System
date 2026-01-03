"use client";
import {Pencil , Square , Circle , Ellipsis} from "lucide-react";

import { Hint } from "@/Components/hints";

import {Button} from "@/Components/ui/button";

export const ToolButton = ({
  label,
  icon: Icon,
  onClick,
  isActive,
  isDisabled,
}) => {
  return (
    <Hint label={label} side="right" sideOffset={14}>
      <Button
        disabled={isDisabled}
        onClick={onClick}
        size="icon"
        variant={isActive ? "boardActive" : "board"}
      >
        <Icon />
      </Button>
    </Hint>
  );
};

