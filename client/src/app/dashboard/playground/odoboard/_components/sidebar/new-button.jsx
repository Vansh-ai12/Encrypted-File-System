"use client";

import { Plus } from "lucide-react";

 import {
    Dialog,
    DialogContent,
    DialogTrigger,
 } from "@/Components/ui/dialog";
import CreateOrganization from "../create-organisation";
import { Hint } from "@/Components/hints";


 export const NewButton = () =>{
    return(
        <Dialog>
            <DialogTrigger asChild >
                <div className="aspect-square">
                    <Hint label = "Create organisation" side="right" align="start" sideOffset= {18}>
                    <button className="bg-white/25 h-full w-full rounded-md
                    flex items-center justify-center opacity-60 hover:opacity-100 transition
                    ">
                        <Plus className="text-white" />
                    </button>
                    </Hint>
                </div>
            </DialogTrigger>
            <DialogContent className="p-0 bg-transparent border-none max-w-[480px]">
                {/* Create Organisation fancy form  */}
                <CreateOrganization/>
            </DialogContent>
        </Dialog>
    );
 };