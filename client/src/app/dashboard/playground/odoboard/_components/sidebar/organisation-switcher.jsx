"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { ChevronDown, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import CreateOrganization from "../create-organisation";
import ManageOrganisations from "./manage-organisation";

const gradients = [
  "from-[#4F46E5] to-[#7C3AED]",
  "from-[#2563EB] to-[#06B6D4]",
  "from-[#9333EA] to-[#F43F5E]",
  "from-[#0EA5E9] to-[#6366F1]",
  "from-[#10B981] to-[#3B82F6]",
  "from-[#D946EF] to-[#F59E0B]",
  "from-[#EC4899] to-[#9F1239]",
  "from-[#8B5CF6] to-[#EC4899]"
];

function getGradient(name = "A") {
  let hash = 7;
  for (let i = 0; i < name.length; i++)
    hash = (hash * 31 + name.charCodeAt(i)) % 10000;
  return gradients[hash % gradients.length];
}

export const OrganisationSwitcher = () => {
  const ref = useRef(null);

  const [orgs, setOrgs] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(localStorage.getItem("activeOrgId"));
  const [open, setOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

  const activeOrg = orgs.find(o => o.organisationId == activeOrgId);

  useEffect(() => {
    fetch("http://localhost:8000/boardOrganisation/getOrganisations/", {
      credentials: "include",
    })
      .then(res => res.json())
      .then(data => {
        if (data.organisations) setOrgs(data.organisations);
      });
  }, []);

  useEffect(() => {
    const updateActive = () => {
      setActiveOrgId(localStorage.getItem("activeOrgId"));
    };
    window.addEventListener("org-changed", updateActive);
    return () => window.removeEventListener("org-changed", updateActive);
  }, []);

  const handleSelect = async (id) => {
  // 🔥 Instant UI Update — user sees switch immediately
  localStorage.setItem("activeOrgId", id);
  setActiveOrgId(id);
  setOpen(false);
  window.dispatchEvent(new Event("org-changed"));

 
  try {
    await fetch("http://localhost:8000/boardOrganisation/setActiveOrganisation/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: id }),
    });
  } catch (err) {
    console.error("Failed to sync active organisation with backend:", err);
  }
};


  useEffect(() => {
    const handler = (e) =>
      ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <div ref={ref} className="relative w-[180px]">

        {/* 🔥 NEW BUTTON UI */}
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "w-full flex items-center justify-between",
            "px-3 py-[6px] rounded-[10px]",
            "bg-[#F9FAFB] border border-[#D1D5DB]",
            "shadow-sm hover:shadow transition-all",
            "text-gray-700 cursor-pointer"
          )}
        >
          <div className="flex items-center gap-2 min-h-[32px]">
            {activeOrg?.imgUrl ? (
              <Image
                src={`http://localhost:8000${activeOrg.imgUrl}`}
                width={26}
                height={26}
                className="rounded-md object-cover"
                alt="org"
              />
            ) : (
              <div
                className={cn(
                  `w-[26px] h-[26px] flex items-center justify-center rounded-md text-white text-[11px] font-bold bg-gradient-to-br ${getGradient(activeOrg?.organisationName)}`
                )}
              >
                {activeOrg?.organisationName?.[0]?.toUpperCase()}
              </div>
            )}
            <span className="text-xs font-medium truncate max-w-[95px] leading-none">
              {activeOrg?.organisationName}
            </span>
          </div>

          <div
            className={cn(
              "flex items-center justify-center w-6 h-6 rounded-[6px]",
              "bg-[#ECECEC] border border-[#D1D5DB]",
              "transition-all",
              open && "bg-[#E5E7EB]"
            )}
          >
            <ChevronDown
              size={13}
              className={cn(
                "text-gray-600 transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </div>
        </button>

        {/* 🔻 DROPDOWN — unchanged */}
        {open && (
          <div
            className="absolute left-0 mt-2 w-[240px] bg-white rounded-xl shadow-xl
            z-50 p-2 border border-gray-200"
          >
            {activeOrg && (
              <div className="flex items-center gap-2 px-2 py-2 rounded-md bg-indigo-50 border-b border-gray-200">
                <div
                  className={cn(
                    `w-7 h-7 flex items-center justify-center rounded-md text-white text-xs font-bold bg-gradient-to-br ${getGradient(activeOrg.organisationName)}`
                  )}
                >
                  {activeOrg.organisationName[0]?.toUpperCase()}
                </div>
                <div className="flex flex-col leading-tight text-[11px]">
                  <span className="font-semibold text-xs">{activeOrg.organisationName}</span>
                  <span className="text-gray-600 text-[10px]">Admin</span>
                </div>
              </div>
            )}

            <div
              onClick={() => setShowManageModal(true)}
              className="flex items-center gap-2 px-2 py-2 cursor-pointer text-[11px] text-gray-600 hover:bg-gray-100 transition border-b border-gray-200"
            >
              <Settings size={12} /> Manage Organization
            </div>

            <div className="max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent border-b border-gray-200">
              {orgs
                .filter(org => org.organisationId != activeOrgId)
                .map(org => (
                  <div
                    key={org.organisationId}
                    onClick={() => handleSelect(org.organisationId)}
                    className="flex items-center gap-2 px-2 py-2 text-xs cursor-pointer rounded-md hover:bg-gray-100 transition"
                  >
                    <div
                      className={cn(
                        `w-7 h-7 flex items-center justify-center rounded-md text-white text-xs font-bold bg-gradient-to-br ${getGradient(org.organisationName)}`
                      )}
                    >
                      {org.organisationName[0].toUpperCase()}
                    </div>
                    {org.organisationName}
                  </div>
                ))}
            </div>

            <div
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-2 py-2 text-xs text-gray-600 cursor-pointer hover:bg-gray-100 transition"
            >
              <Plus size={14} /> Create Organization
            </div>
          </div>
        )}
      </div>

      {/* Modals unchanged */}
      {showCreateModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[200] bg-black/40">
          <div className="relative">
            <button
              className="absolute -top-3 -right-3 bg-white shadow-md
              w-6 h-6 rounded-full text-xs"
              onClick={() => setShowCreateModal(false)}
            >
              ✕
            </button>
            <CreateOrganization />
          </div>
        </div>
      )}

      {showManageModal && (
        <ManageOrganisations
          orgId={activeOrgId}
          onClose={() => setShowManageModal(false)}
        />
      )}
    </>
  );
};
