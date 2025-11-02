import Profile from "@/Components/Profile";
import Logo from "../../Components/Logo";
import Pro from "../../Components/Pro";
export default function DashboardPage() {
    return(
        <div class="flex-col">
            <div class="flex items-center px-8 py-6 justify-between bg-white rounded-2xl shadow-md border border-gray-100">
                <Logo/>
                <div class="flex items-center px-8 py-6 justify-between gap-8">
                    <Pro/>
                    <Profile/>
                </div>
            </div>
            <div class="flex justify-center p-20 ">
                
            </div>

        </div>
    )
}