"use client";

import { useEffect, useState } from "react";
import { Item } from "./item";

export const List = () => {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeOrgId, setActiveOrgId] = useState(
    typeof window !== "undefined" ? localStorage.getItem("activeOrgId") : null
  );

  // 🟣 Update UI when active org changes
  useEffect(() => {
    const handler = () => {
      const id = localStorage.getItem("activeOrgId");
      setActiveOrgId(id);
    };
    window.addEventListener("org-changed", handler);
    return () => window.removeEventListener("org-changed", handler);
  }, []);

  // 🟩 Fetch Organisations with session cookie
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const res = await fetch(
          "http://localhost:8000/boardOrganisation/getOrganisations/",
          {
            method: "GET",
            credentials: "include", // IMPORTANT for cookies
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (res.status === 401) {
          console.warn("Unauthorized → Redirecting to login...");
          window.location.href = "/login";
          return;
        }

        const data = await res.json();
        if (data.organisations) {
          setOrgs(data.organisations);
        }
      } catch (error) {
        console.error("Failed to fetch organisations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrgs();
  }, []);


const handleSelect = async (id) => {
  try {
    const res = await fetch(
      "http://localhost:8000/boardOrganisation/setActiveOrganisation/",
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: id }),
      }
    );

    if (!res.ok) {
      console.error("Failed to sync active organisation with backend");
      // We still allow UI update to keep feel smooth
    }
  } catch (error) {
    console.error("Error setting active organisation:", error);
  }

  // Always update UI regardless of backend status
  localStorage.setItem("activeOrgId", id);
  setActiveOrgId(id);
  window.dispatchEvent(new Event("org-changed"));
};


  if (loading) {
    return <p className="text-gray-400 text-sm">Loading organisations...</p>;
  }

  if (orgs.length === 0) {
    return (
      <p className="text-gray-500 text-sm">
        .
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {orgs.map((org) => (
        <li key={org.organisationId}>
          <Item
            name={org.organisationName}
            imageUrl={org.imgUrl}
            isActive={activeOrgId == org.organisationId}
            onClick={() => handleSelect(org.organisationId)}
          />
        </li>
      ))}
    </ul>
  );
};
