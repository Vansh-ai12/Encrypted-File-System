"use client";

export default function Pro() {
  return (
    <div className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-full cursor-pointer hover:bg-indigo-700 transition">
      {/* Better Flat Crown Icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="w-5 h-5 fill-yellow-400"
      >
        <path d="M2 8l4 3 3-5 3 5 3-5 3 5 4-3v10H2V8z" />
      </svg>

      {/* Text */}
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] text-indigo-200 font-semibold tracking-wide">
          GO
        </span>
        <span className="text-xs font-bold tracking-wide">PRO</span>
      </div>
    </div>
  );
}
