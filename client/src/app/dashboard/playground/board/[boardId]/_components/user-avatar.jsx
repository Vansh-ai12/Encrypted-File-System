"use client";

import { Hint } from "@/Components/hints";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

import { connectionIdToColor } from "@/hooks/utils";

export const UserAvatar = ({ src, name, fallback, connectionId }) => {
  const letter = fallback || name?.[0]?.toUpperCase() || "?";

  const color = connectionId
    ? connectionIdToColor(connectionId)
    : "#9CA3AF"; // gray fallback

  return (
    <Hint label={name || "Teammate"} side="bottom" sideOffset={18}>
      <Avatar className="h-9 w-9">
        <AvatarImage
          src={src || undefined}
          alt={name || "user"}
          className="object-cover"
        />

        <AvatarFallback
          style={{ backgroundColor: color }}   // ✅ FIX
          className="text-white text-sm font-semibold flex items-center justify-center"
        >
          {letter}
        </AvatarFallback>
      </Avatar>
    </Hint>
  );
};
