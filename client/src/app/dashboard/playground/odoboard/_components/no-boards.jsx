import { LayoutPanelLeft, Plus } from "lucide-react";

export const NoBoards = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 select-none">

      {/* Illustration */}
      <div className="relative w-28 h-28 rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 
                      flex items-center justify-center shadow-lg">
        <LayoutPanelLeft className="w-12 h-12 text-white" strokeWidth={1.5} />
      </div>

      {/* Title */}
      <h2 className="mt-6 text-2xl font-semibold text-gray-900">
        No boards yet
      </h2>

      {/* Subtitle */}
      <p className="text-gray-500 text-sm mt-2 max-w-xs">
        Create your first board and start organizing your tasks with your team.
      </p>

      {/* CTA Button */}
      <button
        onClick={() => window.dispatchEvent(new Event("open-create-board-modal"))}
        className="mt-5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:opacity-90 
                   text-white font-medium text-sm px-5 py-2.5 rounded-lg shadow-md 
                   flex items-center gap-2 transition-all active:scale-95"
      >
        <Plus className="w-4 h-4" />
        Create Board
      </button>

    </div>
  );
};
