"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import Profile from "@/Components/Profile";
import Logo from "@/Components/Logo";
import Upload from "@/Components/Upload";
import SideBar from "@/Components/SideBar";
import PlayGroundButton from "@/Components/Playgroundbutton";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const signupSuccess = searchParams.get("signupSuccess");
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (signupSuccess === "true") {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  }, [signupSuccess]);
  


  return (
    <div className="flex-col">

      {/* 🔥 Success Toast */}
      {showToast && (
        <div
          className="fixed top-6 right-6 bg-green-600 text-white font-medium px-5 py-3 rounded-lg shadow-xl z-50 animate-toastSlide"
        >
          Account created successfully! 🎉
        </div>
      )}

      {/* Top Navigation Bar */}
      <div className="flex items-center px-8 py-6 justify-between bg-white rounded-2xl shadow-md border border-gray-100">
        <Logo />
        <div className="flex items-center gap-8">
          <PlayGroundButton />
          <Profile />
        </div>
      </div>

      {/* Sidebar + Upload */}
      <div className="flex py-5 px-5">
        <SideBar />
      </div>

      <div className="flex justify-center p-20">
        <Upload />
      </div>

      {/* Toast Animation */}
      <style jsx>{`
        @keyframes toastSlide {
          0% { opacity: 0; transform: translateX(30px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .animate-toastSlide {
          animation: toastSlide 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
