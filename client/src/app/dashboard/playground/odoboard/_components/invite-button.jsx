"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
} from "@/Components/ui/dialog";
import { Plus } from "lucide-react";
import { Button } from "@/Components/ui/button";
import ManageOrganisations from "./InviteSomeone";

export function InviteButton({ orgId }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="
            bg-gradient-to-r from-purple-600 to-fuchsia-600
            hover:opacity-90 active:scale-95
            text-white font-medium px-4 py-2 rounded-lg
            shadow-md transition-all duration-200
            flex items-center gap-2
          "
        >
          <Plus className="h-4 w-4" />
          Invite members
        </Button>
      </DialogTrigger>

      <DialogContent
  className="
    p-0
    border-none
    shadow-none

    !w-[1250px]
    !max-w-[1250px]
    sm:!max-w-[1250px]

    h-[700px]
    max-h-none

    overflow-hidden
  "
>
  <ManageOrganisations
    orgId={orgId}
    onClose={() => setOpen(false)}
  />
</DialogContent>


    </Dialog>
  );
}
