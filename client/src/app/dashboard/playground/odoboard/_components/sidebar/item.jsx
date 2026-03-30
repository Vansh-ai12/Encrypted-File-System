"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { Hint } from "@/Components/hints";

const gradients = [
  "from-[#4F46E5] to-[#7C3AED]",
  "from-[#2563EB] to-[#06B6D4]",
  "from-[#9333EA] to-[#F43F5E]",
  "from-[#0EA5E9] to-[#6366F1]",
  "from-[#10B981] to-[#3B82F6]",
  "from-[#D946EF] to-[#F59E0B]",
  "from-[#EC4899] to-[#9F1239]",
  "from-[#8B5CF6] to-[#EC4899]",
];

function getGradientIndex(name) {
  let hash = 7;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % 10000;
  }
  return hash % gradients.length;
}

export const Item = ({ name, imageUrl, isActive, onClick }) => {
  const firstLetter = name?.charAt(0).toUpperCase() || "A";
  const gradientClass = gradients[getGradientIndex(name)];

  return (
    <Hint label={name} side="right" align="start" sideOffset={18}>
      <div
        onClick={onClick}
        className={cn(
          "flex items-center justify-center",
          "w-10 h-10 rounded-md cursor-pointer overflow-hidden select-none",
          "transition-all duration-200 ease-out",

          isActive
            ? "opacity-100 scale-[1.15] ring-2 ring-indigo-500 shadow-lg" 
            : "opacity-40 hover:opacity-100 hover:scale-[1.05]"
        )}
      >
        {imageUrl ? (
          <Image
            src={`https://encrypted-file-system-production.up.railway.app${imageUrl}`}
            alt={name}
            width={40}
            height={40}
            className="object-cover w-full h-full"
          />
        ) : (
          <div
            className={cn(
              "w-full h-full flex items-center justify-center rounded-md shadow-inner",
              `bg-gradient-to-br ${gradientClass}`
            )}
          >
            <span className="text-white text-sm font-bold drop-shadow-md">
              {firstLetter}
            </span>
          </div>
        )}
      </div>
    </Hint>
  );
};
