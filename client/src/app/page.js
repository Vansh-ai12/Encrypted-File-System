"use client";
import Logo from "../Components/Logo";

export default function HomePage() {
  return (
    <div class="flex-col">
      <div class="flex items-center px-8 py-6 justify-between bg-white rounded-2xl shadow-md border border-gray-100">
        <Logo />
        <div class="flex items-center space-x-6 font-medium text-gray-700">
          <button class="px-4 py-2 border border-gray-300 rounded-md transition-all duration-200 hover:border-indigo-500 hover:text-indigo-500 hover:cursor-pointer">
            Login
          </button>
          <button class="px-4 py-2 border border-gray-300 rounded-md transition-all duration-200 hover:border-indigo-500 hover:text-indigo-500 hover:cursor-pointer">
            Sign up
          </button>
        </div>
      </div>
      <div class="flex justify-center p-20 ">
        <p class="font-medium font-sans text-lg">
          Store your files in your personal safe space
        </p>
      </div>
      <div>
        
      </div>
    </div>
  );
}
