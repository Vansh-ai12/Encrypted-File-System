"use client";

import { useEffect, useState } from "react";
import { Canvas } from "./_components/canvas";

const BoardIdPage = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500); // 👈 1.5 seconds loader

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-black"></div>
      </div>
    );
  }

  return (
  
       <Canvas />
   
 
);
};

export default BoardIdPage;
