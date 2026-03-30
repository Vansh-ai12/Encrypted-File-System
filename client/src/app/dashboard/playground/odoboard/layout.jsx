"use client";
import { OrgSidebar } from "./_components/sidebar/org-sidebar";
import { SidebarB } from "./_components/sidebar";
import { Navbar } from "./_components/navbar";
import { useRouter } from "next/navigation";

const DashboardLayout = ({children}) => {
    const router = useRouter();

    return(
        <main className="h-full">
            <SidebarB/>
            <div className="pl-[60px] h-full">
                <div className="flex gap-x-3 h-full">
                    <OrgSidebar/>
                    <div className="h-full flex-1">
                        <Navbar/>
                        {children}
                    </div>
                </div>
            </div>

            {/* 🏠 Dashboard home button */}
            <button
                onClick={() => router.push("/dashboard")}
                title="Go to dashboard"
                className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-yellow-400 hover:bg-yellow-300 active:scale-95 transition-all flex items-center justify-center shadow-md"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"/>
                    <path d="M9 21V12h6v9"/>
                </svg>
            </button>
        </main>
    )
}

export default DashboardLayout;