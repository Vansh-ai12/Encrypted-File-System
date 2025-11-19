import Profile from "@/Components/Profile";
import Logo from "../../Components/Logo";

import Upload from "@/Components/Upload";
import SideBar from "@/Components/SideBar";
import PlayGroundButton from "@/Components/Playgroundbutton";

export default function DashboardPage() {
    return(
        <div className="flex-col">
            <div className="flex items-center px-8 py-6 justify-between bg-white rounded-2xl shadow-md border border-gray-100">
                <Logo/>
                <div className="flex items-center px-8 py-6 justify-between gap-8">
                    <PlayGroundButton/>
                    <Profile/>
                </div>
            </div>
            <div className="flex py-5 px-5">
                <SideBar/>
            </div>
            <div className="flex justify-center p-20 ">
                <Upload/>
            </div>

        </div>
    )
}