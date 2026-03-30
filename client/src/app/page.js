"use client";

import Logo from "../Components/Logo";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-yellow-400/30">
      {/* HEADER */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-12">
          <Logo />
          
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/login")} className="text-sm font-bold px-5 py-2 hover:text-yellow-400 transition-colors">
            Log In
          </button>
          <button 
            onClick={() => router.push("/signup")}
            className="bg-yellow-400 text-black text-sm font-black px-6 py-2 rounded-md hover:bg-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.2)] transition-all active:scale-95"
          >
            Sign Up
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col lg:flex-row">
        {/* LEFT ARTISTIC TEXT SECTION */}
        <div className="flex-1 flex flex-col justify-center px-12 py-20 lg:py-0 border-r border-white/5 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-yellow-400/5 via-transparent to-transparent">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-yellow-400/20 bg-yellow-400/5 text-yellow-400 text-[10px] font-black uppercase tracking-tighter mb-6 w-fit">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400"></span>
            </span>
            V1.0 Encrypted Storage Live
          </div>
          
          <h1 className="text-7xl xl:text-8xl font-black tracking-tighter leading-[0.9] mb-8">
            The best place to <br />
            <span className="text-yellow-400 italic">build & secure</span> <br />
            your code.
          </h1>

          <p className="text-gray-400 text-xl max-w-xl leading-relaxed mb-10 font-medium">
            Secure Vault is a <span className="text-white">social development environment</span> for engineers. 
            Store encrypted projects and scribble ideas on an infinite board.
          </p>

          <div className="flex gap-4">
            <button onClick={() => router.push("/signup")} className="px-10 py-5 bg-yellow-400 text-black font-black text-lg rounded-md hover:scale-105 transition-transform shadow-[5px_5px_0px_0px_rgba(255,255,255,0.1)]">
              Start Building Now
            </button>
          </div>
        </div>

        {/* RIGHT PREVIEW SECTION (Visual Art) */}
        <div className="hidden lg:flex flex-1 bg-[#0a0a0a] items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#fa4 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }}></div>
          
          {/* Futuristic Floating Card */}
          <div className="relative z-10 w-full max-w-md aspect-video bg-[#1e1f26] rounded-xl border border-white/10 shadow-2xl p-6 transform rotate-2 hover:rotate-0 transition-transform duration-700">
             <div className="flex gap-2 mb-4">
               <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
               <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
               <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
             </div>
             <div className="space-y-3">
               <div className="h-2 w-3/4 bg-white/5 rounded"></div>
               <div className="h-2 w-full bg-white/10 rounded"></div>
               <div className="h-2 w-1/2 bg-yellow-400/20 rounded"></div>
               <div className="pt-4 flex justify-between">
                 <div className="text-[10px] text-yellow-400 font-mono">STATUS: ENCRYPTED</div>
                 <div className="text-[10px] text-gray-500 font-mono">AES-256</div>
               </div>
             </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="px-8 py-6 border-t border-white/5 bg-black flex justify-between items-center text-[11px] text-gray-600 font-bold uppercase tracking-widest">
        <div>© 2026 SECURE VAULT CORP</div>
        <div className="flex gap-8">
     
          <span className="hover:text-white cursor-pointer transition-colors">Scribble Board</span>
          <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
        </div>
      </footer>
    </div>
  );
}