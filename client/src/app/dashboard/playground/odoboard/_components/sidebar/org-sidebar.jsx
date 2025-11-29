"use client";

import Link from "next/link";
import { Poppins } from "next/font/google";
import OdoBoardLogo from "@/Components/OdoBoardLogo";
import { OrganisationSwitcher } from "./organisation-switcher";
import { Button } from "@/Components/ui/button";
import { LayoutDashboard, Star } from "lucide-react";
import { useSearchParams } from "next/navigation";

const font = Poppins({
  subsets: ["latin"],
  weight: ["600"],
});

export const OrgSidebar = () => {
  const searchParams = useSearchParams();
  const favorites = searchParams.get("favorites");

  const activeStyles =
    "bg-[#E9EEFF] border border-[#C7D2FE] shadow-sm text-[#333]"; // Active look like screenshot

  const defaultStyles =
    "bg-transparent text-gray-600"; // Inactive look

  return (
    <div className="hidden lg:flex flex-col space-y-6 w-[206px] pl-5 pt-5">
      
      {/* Logo */}
      <Link href="/dashboard/playground/odoboard">
        <div className="flex items-center gap-x-2">
          <OdoBoardLogo />
        </div>
      </Link>

      {/* Org Switcher */}
      <OrganisationSwitcher />

      {/* Sidebar Navigation */}
      <div className="space-y-1 w-full">

        {/* Team Boards */}
        <Button
          asChild
          size="lg"
          variant="ghost"
          className={`font-normal justify-start px-3 w-full rounded-md transition-all duration-150
            hover:bg-[#F3F4F6] hover:shadow-sm
            ${!favorites ? activeStyles : defaultStyles}`}
        >
          <Link href="/dashboard/playground/odoboard">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Team boards
          </Link>
        </Button>

        {/* Favorite Boards */}
        <Button
          asChild
          size="lg"
          variant="ghost"
          className={`font-normal justify-start px-3 w-full rounded-md transition-all duration-150
            hover:bg-[#F3F4F6] hover:shadow-sm
            ${favorites ? activeStyles : defaultStyles}`}
        >
          <Link
            href={{
              pathname: "/dashboard/playground/odoboard",
              query: { favorites: true },
            }}
          >
            <Star className="h-4 w-4 mr-2" />
            Favorite boards
          </Link>
        </Button>
      </div>
    </div>
  );
};
