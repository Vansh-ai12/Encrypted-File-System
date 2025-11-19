"use client";

import { useRouter } from "next/navigation"; 


export default function Logo() {
  const router = useRouter();
  return (
    <div className="flex items-center justify-center font-extrabold text-6xl tracking-tight select-none hover:cursor-pointer"
      onClick={()=>router.push('/')}
    >
      <span className="relative mr-1">
        <span className="text-black">O</span>
        <span className="absolute top-0 left-0 h-full w-1/2 overflow-hidden text-indigo-500">
          O
        </span>
      </span>
      <span className="text-gray-800">
        d
        <span className="text-indigo-500 ">o</span>
        n
      </span>
    </div>
  );
}
