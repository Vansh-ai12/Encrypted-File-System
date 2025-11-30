"use client";

import React, { useState, useEffect } from "react";
import OdoLoader from "@/Components/OdoLoader";
import { EmptyOrg } from "./_components/empty-org";
import CreateOrganization from "./_components/create-organisation";
import { useSearchParams } from "next/navigation";
import { BoardList } from "./_components/board-list";
export default function OdoBoardPage(props) {
  const searchParams = useSearchParams();
  const search = searchParams.get("search");
  const favorites = searchParams.get("favorites");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeOrgId, setActiveOrgId] = useState(
    typeof window !== "undefined" ? localStorage.getItem("activeOrgId") : null
  );
  const [activeOrgName, setActiveOrgName] = useState("");

  // 🟣 Update org data whenever activeOrg changes
  useEffect(() => {
    if (!activeOrgId) {
      setActiveOrgName("");
      return;
    }

    fetch("http://127.0.0.1:8000/boardOrganisation/getOrganisations/", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        const found = data.organisations?.find(
          (o) => o.organisationId == activeOrgId
        );
        if (found) setActiveOrgName(found.organisationName);
      });
  }, [activeOrgId]);

  // 🔁 Listen for activeOrg switch
  useEffect(() => {
    const updateActiveOrg = () =>
      setActiveOrgId(localStorage.getItem("activeOrgId"));
    window.addEventListener("org-changed", updateActiveOrg);
    return () => window.removeEventListener("org-changed", updateActiveOrg);
  }, []);

  // 🎯 CTA Listener (from EmptyOrg button)
  useEffect(() => {
    const openModal = () => setShowCreateModal(true);
    window.addEventListener("open-create-org-modal", openModal);
    return () => window.removeEventListener("open-create-org-modal", openModal);
  }, []);

  return (
    <>
      <OdoLoader />

      <div className="flex-1 h-[calc(100%-80px)] p-6">
         
        {/* Show UI based on active organisation status */}
        {!activeOrgId ? (
          <EmptyOrg />
        ) : (
          <BoardList
            orgId={activeOrgId}
            search= {search}
            favorites = {favorites}
          />
        )}

       
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center">
            <div className="relative">
              <button
                className="absolute -top-3 -right-3 bg-white shadow-md 
                           w-7 h-7 rounded-full text-xs"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
              <CreateOrganization />
            </div>
          </div>
        )}

      </div>
    </>
  );
}
