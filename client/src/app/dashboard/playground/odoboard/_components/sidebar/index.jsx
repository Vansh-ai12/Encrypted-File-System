import { List } from "./list"
import { NewButton } from "./new-button"

export const SidebarB = () =>{
    return(
        <aside className="fixed z--[1] left-0 bg-blue-950
        h-full w-[65px] flex p-3 flex-col gap-y-4 text-white
        ">
            <List/>
            <NewButton/>
            
        </aside>
    )
}