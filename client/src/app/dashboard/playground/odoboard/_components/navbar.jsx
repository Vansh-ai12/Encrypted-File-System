"use client";

import Profile from "@/Components/Profile";
import { SearchInput } from "./search-input";
import { OrganisationSwitcher } from "./sidebar/organisation-switcher";
import { InviteButton } from "./invite-button";

export const Navbar = () => {
  const orgId =
    typeof window !== "undefined"
      ? localStorage.getItem("activeOrgId")
      : null;

  return (
    <div className="flex items-center gap-x-4 p-5">
      <div className="hidden lg:flex lg:flex-1">
        <SearchInput />
      </div>

      <div className="block lg:hidden flex-1">
        <OrganisationSwitcher className="max-w-[376px]" />
      </div>

      <InviteButton orgId={orgId} />
      <Profile />
    </div>
  );
};
