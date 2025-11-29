import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/Components/ui/tooltip";

export const Hint = ({
  label,
  children,
  side = "top",
  align = "center",
  sideOffset ,
  alignOffset,
}) => {
  return (
    <TooltipProvider>
      <Tooltip delayedDuration = {100}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent
          className="text-white bg-black border-black"
          side={side}
          align = {align}
          sideOffset = {sideOffset}
          alignOffset = {alignOffset}
        >
          <p className="font-semibold capitalize">
            {label}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};


