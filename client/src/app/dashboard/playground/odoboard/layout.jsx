"use client";
import { OrgSidebar } from "./_components/sidebar/org-sidebar";
import { SidebarB } from "./_components/sidebar";
import { Navbar } from "./_components/navbar";
const DashboardLayout = ({children}) =>{
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
        </main>
    )
}

export default DashboardLayout;