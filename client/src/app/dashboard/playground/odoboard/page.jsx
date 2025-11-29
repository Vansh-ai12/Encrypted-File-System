"use client";

import React from "react";
import OdoLoader from "@/Components/OdoLoader";
import OdoBoardLogo from "@/Components/OdoBoardLogo";
import Profile from "@/Components/Profile";
import { Button } from "@/Components/ui/button";

export default function OdoBoardPage() {
  return (
    <>
      <OdoLoader />   

      <div className="flex-col">
       

        <Button size="sm">Click me</Button>
      </div>
    </>
  );
}
