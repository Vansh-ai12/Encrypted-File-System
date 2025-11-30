import { Search } from "lucide-react";

export const EmptySearch = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 select-none">

      {/* Icon */}
      <div className="w-20 h-20 flex items-center justify-center rounded-full bg-gray-100 border border-gray-200 shadow-sm">
        <Search className="w-10 h-10 text-gray-500" strokeWidth={1.5} />
      </div>

      {/* Title */}
      <h3 className="mt-4 text-lg font-semibold text-gray-800">
        No results found
      </h3>

      {/* Subtitle */}
      <p className="text-gray-500 text-sm mt-1">
        Try searching for something else
      </p>

    </div>
  );
};
