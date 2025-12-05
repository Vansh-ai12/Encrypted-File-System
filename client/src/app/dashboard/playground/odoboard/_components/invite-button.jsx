"use client";

import { Dialog, DialogTrigger, DialogContent } from "@/Components/ui/dialog";
import { Plus } from "lucide-react";
import { Button } from "@/Components/ui/button";
import ManageOrganisations from "./InviteSomeone";

export function InviteButton({ orgId }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="bg-gradient-to-r from-purple-600 to-fuchsia-600 
               hover:opacity-90 active:scale-95
               t ext-white font-medium px-4 py-2 rounded-lg 
               shadow-md transition-all duration-200 flex items-center gap-2 text-white"
        >
          <Plus className="h-4 w-4" />
          Invite members
        </Button>
      </DialogTrigger>

      <DialogContent
        className="
          fixed inset-0 
          flex items-center justify-center
          p-0 border-none shadow-none
          !max-w-none !max-h-none
          top-1/2 left-1/2 
          -translate-x-1/2 -translate-y-1/2
          bg-transparent     
        "
      >
        <ManageOrganisations orgId={orgId} width="1100px" height="600px" />
      </DialogContent>
    </Dialog>
  );
}
