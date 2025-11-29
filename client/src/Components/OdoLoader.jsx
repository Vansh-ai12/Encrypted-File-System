"use client";

import React, { useEffect, useState } from "react";

export default function OdoLoader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1600);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-[9999]">
      <div className="flex gap-2 loader-bars">
        {/* Left bar (Purple) */}
        <div className="bar bar-purple" />

        {/* Middle bar (Navy) */}
        <div className="bar bar-navy" />

        {/* Right bar (Purple) */}
        <div className="bar bar-purple" />
      </div>

      <style jsx>{`
        .bar {
          width: 14px;
          height: 38px;
          border-radius: 6px;
          transform-origin: bottom center;
          animation: pulse 0.8s ease-in-out infinite;
        }

        .bar-purple {
          background: #7c3aed; /* Purple */
        }

        .bar-navy {
          background: #0f172a; /* Navy */
        }

        .loader-bars .bar:nth-child(2) {
          animation-delay: 0.15s;
        }

        .loader-bars .bar:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes pulse {
          0% {
            transform: scaleY(0.6);
            opacity: 0.5;
          }
          50% {
            transform: scaleY(1.2);
            opacity: 1;
          }
          100% {
            transform: scaleY(0.6);
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
