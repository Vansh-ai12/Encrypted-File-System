"use client";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Profile from "@/Components/Profile";
import Logo from "@/Components/Logo";
import PlayGroundButton from "@/Components/Playgroundbutton";
import ClusterModal from "@/Components/ClusterModal";
import getCookie from "@/hooks/GetCookie";

const LoginActivityPanel = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch("http://localhost:8000/user/login-activity/", {
          credentials: "include",
        });

        const data = await res.json();

        // convert to array sorted latest first
        const arr = Object.entries(data)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        setLogs(arr);
      } catch (e) {
        console.error("login logs failed");
      }
    };

    fetchLogs();
  }, []);

  return (
    <div className="p-5 rounded-2xl bg-[#0b0f14] border border-white/5 min-h-[260px] flex flex-col">
      <p className="text-xs text-gray-500 uppercase mb-3">Login Activity</p>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {logs.length === 0 ? (
          <div className="text-xs text-gray-500 text-center mt-6">
            No login activity yet
          </div>
        ) : (
          logs.map((l, i) => (
            <div
              key={i}
              className="flex justify-between items-center text-xs bg-white/5 px-3 py-2 rounded-md hover:bg-white/10"
            >
              <span className="text-gray-300">{l.date}</span>
              <span className="text-blue-400 font-bold">{l.count} logins</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const getLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const UsageChart = () => {
  const [data, setData] = useState([]);
  const [todayTime, setTodayTime] = useState(0);
  const todayRef = useRef(getLocalDate());

  // 🔥 LIVE + SYNCED TRACKING
  useEffect(() => {
    let localSeconds = 0;

    // 1️⃣ INITIAL FETCH
    const fetchUsage = async () => {
      const res = await fetch("http://localhost:8000/user/usage/", {
        credentials: "include",
      });

      const data = await res.json();
      setData(data);

      const today = getLocalDate();
      const todayEntry = data.find((d) => d.date === today);

      const base = todayEntry ? todayEntry.duration : 0;

      setTodayTime(base);
      localSeconds = 0;
    };

    fetchUsage();

    const liveInterval = setInterval(() => {
      const now = getLocalDate();

      if (now !== todayRef.current) {
        todayRef.current = now;

        setTodayTime(0);

        fetchUsage();

        return;
      }


    }, 1000);

    // 3️⃣ SYNC WITH BACKEND (every 5 sec)
    const syncInterval = setInterval(async () => {
      try {
        const res = await fetch("http://localhost:8000/user/usage/", {
          credentials: "include",
        });

        const data = await res.json();
        setData(data);

        const today = getLocalDate();
        const todayEntry = data.find((d) => d.date === today);

        if (todayEntry) {
          setTodayTime(todayEntry.duration);
          localSeconds = 0;
        }
      } catch (e) {
        console.log("sync failed");
      }
    }, 5000);
    const sendInterval = setInterval(() => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      fetch("http://localhost:8000/user/track-visit/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          duration: 5,
          timezone: timezone,
        }),
      });
    }, 5000);

    return () => {
      clearInterval(liveInterval);
      clearInterval(syncInterval);
      clearInterval(sendInterval);
    };
  }, []);

  // 🔥 format
  const formatTime = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;

    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  };

  const today = getLocalDate();

  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();

    // today at index 6
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));

    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const found = data.find((x) => x.date === dateStr);

    return {
      date: dateStr,
      duration: dateStr === getLocalDate() ? todayTime : found?.duration || 0,
    };
  });

  return (
    <div className="p-6 rounded-2xl bg-[#0b0f14] border border-white/5 min-h-[420px] flex flex-col">
      {/* TOP */}
      <div>
        <p className="text-xs text-gray-500 uppercase mb-1">Site Usage</p>

        <div className="flex items-center gap-2">
          <p className="text-3xl font-bold text-white">
            {formatTime(todayTime)}
          </p>

          {/* 🔥 LIVE DOT */}
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        </div>

        <p className="text-[10px] text-gray-500 mt-1">Live tracking (today)</p>
      </div>

      <div className="mt-4 space-y-2">
        {last7.map((d, i) => (
          <div
            key={i}
            className="flex justify-between items-center text-sm px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
          >
            <span className="text-gray-300 font-medium">
              {new Date(d.date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
              })}
            </span>

            <span className="text-blue-400 font-medium">
              {formatTime(d.duration)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const [clusters, setClusters] = useState([]); // Will hold DB data
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [clusterStats, setClusterStats] = useState(null);
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    cluster: null,
    input: "",
  });

  const dropdownRef = useRef(null);

  const [statsCluster, setStatsCluster] = useState(null);

  const [showClusterMenu, setShowClusterMenu] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const [globalIssues, setGlobalIssues] = useState(0);

  const [copiedIndex, setCopiedIndex] = useState(null);

  const [isChatOpen, setIsChatOpen] = useState(true);

  const [aiThinking, setAiThinking] = useState(false);
  const [messages, setMessages] = useState([]);

  const [aiPrompt, setAiPrompt] = useState("");

  const chatEndRef = useRef(null);

  const risk = globalIssues > 10 ? "HIGH" : globalIssues > 5 ? "MEDIUM" : "LOW";

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowClusterMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const pushNotification = (text, type) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, text, type }]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3000);
  };

  const handleDeepScan = async () => {
    if (!selectedCluster) {
      pushNotification("Select a cluster first", "error");
      return;
    }

    setShowConsent(true);
  };

  const startScan = async () => {
    setShowConsent(false);
    setIsScanning(true);

    try {
      const res = await fetch(
        `http://localhost:8000/uploads/list/?workspace_id=${selectedCluster.id}`,
        { credentials: "include" },
      );

      const files = await res.json();

      await fetch("http://localhost:8000/security/scan/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: files.map((f) => ({
            name: f.original_name,
            size: f.size,
          })),
        }),
      });

      pushNotification(`Scan completed: ${selectedCluster.name}`, "success");
    } catch {
      pushNotification("Scan failed", "error");
    }

    setIsScanning(false);
  };

  useEffect(() => {
    const init = async () => {
      try {
        // 🔐 STEP 1: get CSRF cookie
        await fetch("http://localhost:8000/user/csrf/", {
          method: "GET",
          credentials: "include",
        });

        const response = await fetch("http://localhost:8000/workspaces/", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          console.log("Clusters from backend:", data);
          let globalFiles = 0;
          let globalSize = 0;
          let globalIssues = 0;
          const extMap = {};

          const enriched = await Promise.all(
            data.map(async (cluster) => {
              try {
                const res = await fetch(
                  `http://localhost:8000/uploads/list/?workspace_id=${cluster.id}`,
                  { credentials: "include" },
                );

                const files = await res.json();

                // 🔥 COUNT GLOBAL STATS
                globalFiles += files.length;

                let issues = 0;
                const seen = new Set();

                files.forEach((f) => {
                  globalSize += f.size || 0;

                  const key = f.original_name + "_" + f.size;

                  if (seen.has(key)) {
                    issues++;
                    globalIssues++;
                  } else seen.add(key);

                  if (!f.size || f.size === 0) {
                    issues++;
                    globalIssues++;
                  }

                  if (f.size > 5 * 1024 * 1024) {
                    issues++;
                    globalIssues++;
                  }

                  const ext = f.original_name?.split(".").pop()?.toLowerCase();
                  if (ext) {
                    extMap[ext] = (extMap[ext] || 0) + 1;
                  }

                  if (["exe", "sh", "bat"].includes(ext)) {
                    issues++;
                    globalIssues++;
                  }
                });

                const health = Math.max(0, 100 - issues * 5);

                return { ...cluster, health };
              } catch {
                return { ...cluster, health: 50 };
              }
            }),
          );

          setClusterStats({
            totalFiles: globalFiles,
            totalSize: globalSize,
            issues: globalIssues,
            topExtension:
              Object.entries(extMap).sort((a, b) => b[1] - a[1])[0]?.[0] ||
              "none",
          });
          setGlobalIssues(globalIssues);

          setClusters(enriched);
        }
      } catch (error) {
        console.error("Failed to fetch clusters:", error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const handleAiRun = async () => {
    if (!aiPrompt.trim()) return;

    const userMessage = {
      role: "user",
      text: aiPrompt,
    };

    // show user message instantly
    setMessages((prev) => [...prev, userMessage]);
    setAiPrompt("");
    setAiThinking(true);

    try {
      const res = await fetch("http://localhost:8000/griff/chatbot-reply/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: userMessage.text,
        }),
      });

      const data = await res.json();

      const aiMessage = {
        role: "ai",
        text: data.answer || "No response from AI",
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Error connecting to AI server",
        },
      ]);
    }

    setAiThinking(false);
  };

  // 2. Handle Cluster Creation (Sync with Backend)
  const handleCreateCluster = (newClusterFromServer) => {
    // newClusterFromServer should be the response from your POST request
    setClusters((prev) => [...prev, newClusterFromServer]);
    localStorage.setItem(
      "currentWorkspace",
      JSON.stringify(newClusterFromServer),
    );
  };

  // 3. Handle Deletion (Sync with Backend)
  const handleDeleteCluster = async (id) => {
    try {
      // Inside handleDeleteCluster
      const response = await fetch(`http://localhost:8000/workspaces/${id}/`, {
        method: "DELETE",
        credentials: "include", // <--- ADD THIS
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "X-CSRFToken": getCookie("csrftoken"),
        },
      });
      if (response.ok) {
        setClusters(clusters.filter((c) => c.id !== id));
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const globalHealth =
    clusters.length > 0
      ? Math.round(
          clusters.reduce((acc, c) => acc + (c.health || 0), 0) /
            clusters.length,
        )
      : 100;

  return (
    <div className="h-screen w-full bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
      {/* TRIGGER MODAL HERE */}
      <ClusterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleCreateCluster}
      />

      {/* NAVBAR */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10 bg-black/50 backdrop-blur-md z-40">
        <div className="flex items-center gap-8">
          <Logo size={40} />
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-sm font-medium text-gray-300"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 9h18M3 15h18M3 3h18M3 21h18" />
            </svg>
            Clusters ({clusters.length})
          </button>
        </div>

        <div className="flex items-center gap-4">
          <PlayGroundButton />
          <Profile />
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto pt-16 pb-12 px-6 bg-[radial-gradient(circle_at_50%_0%,_rgba(250,204,21,0.03),_transparent)]">
        <div className="text-center max-w-4xl mb-20">
          <h1 className="text-6xl font-black mb-8 tracking-tighter leading-tight">
            The best place to <span className="text-[#facc15]">build</span> &{" "}
            <span className="text-[#facc15]">secure</span>.
          </h1>

          <div className="flex flex-col items-center gap-6 mt-10 w-full max-w-xl mx-auto">
            {/* EXISTING BUTTON */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-10 py-4 bg-[#facc15] text-black font-bold rounded-md hover:scale-105 transition-transform shadow-[0_0_25px_rgba(250,204,21,0.2)] flex items-center gap-2"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              New Cluster
            </button>

            {/* 🔥 AI PROMPT BAR */}
            {isChatOpen && (
              <div className="w-full max-w-xl mt-6 h-[300px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-[#facc15]/30">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`max-w-[80%] px-4 py-2 rounded-xl text-sm ${
                      msg.role === "user"
                        ? "bg-[#1f1f1f] text-white ml-auto text-left border border-white/10"
                        : "bg-transparent text-gray-200 text-left"
                    }`}
                  >
                    <div className="relative">
                      {/* COPY BUTTON */}
                      {msg.role === "ai" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(msg.text);
                            setCopiedIndex(i);
                            setTimeout(() => setCopiedIndex(null), 1500);
                          }}
                          className="absolute top-2 right-2 z-10 text-[10px] bg-black hover:bg-[#1a1a1a] text-white border border-white/10 px-2 py-1 rounded-md"
                        >
                          {copiedIndex === i ? "✓ Copied" : "Copy"}
                        </button>
                      )}

                      {msg.role === "ai" ? (
                        <pre className="whitespace-pre font-mono text-xs leading-relaxed text-left bg-[#0d0d0d] border border-white/5 rounded-lg p-4 overflow-x-auto">
                          {msg.text}
                        </pre>
                      ) : (
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                      )}
                    </div>
                  </div>
                ))}

                {aiThinking && (
                  <div className="text-xs text-gray-400 animate-pulse">
                    AI is typing...
                  </div>
                )}
              </div>
            )}
            <div className="w-full flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-[#facc15] transition">
              {/* AI ICON */}

              <div className="text-[#facc15]">✦</div>

              <input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask anything..."
                className="flex-1 bg-transparent outline-none text-sm text-white placeholder-gray-500"
              />

              <button
                onClick={handleAiRun}
                className="px-3 py-1 bg-[#facc15] text-black text-xs font-bold rounded-md hover:scale-105 transition"
              >
                RUN
              </button>
            </div>
            <div className="w-full max-w-xl flex justify-end mt-4">
              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition text-gray-300 hover:text-white"
              >
                {isChatOpen ? "▲ Hide" : "▼ Show"}
              </button>
            </div>
          </div>

          <div ref={chatEndRef} />
        </div>

        {/* STATS GRID (Keep your existing stats grid here) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-7xl px-4 items-start ">
          {/* LEFT → LOGIN */}
          <div className="lg:col-span-1">
            <LoginActivityPanel />
          </div>

          <div className="lg:col-span-2 flex justify-center">
            <div className="w-full max-w-2xl">
              <UsageChart />
            </div>
          </div>

          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mt-8">
            <div className="col-span-1 p-8 rounded-2xl bg-[#0b0f14] border border-white/5 hover:border-white/10 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#facc15]/10 flex items-center justify-center text-[#facc15] mb-6 group-hover:scale-110 transition-transform">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="2" y="2" width="20" height="8" rx="2" />
                  <rect x="2" y="14" width="20" height="8" rx="2" />
                  <line x1="6" y1="6" x2="6.01" y2="6" />
                  <line x1="6" y1="18" x2="6.01" y2="18" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                  Active Clusters
                </p>
                <p className="text-4xl font-black text-white">
                  {clusters.length || 0}
                </p>
              </div>
            </div>

            {/* TOTAL FILES */}
            <div className="p-6 rounded-2xl bg-[#0b0f14] border border-white/5 hover:border-blue-500/30 transition-all flex flex-col justify-between min-h-[140px]">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 7h6l2 2h10v10a2 2 0 0 1-2 2H3z" />
                </svg>
              </div>

              <p className="text-xs text-gray-500 uppercase">Total Files</p>
              <p className="text-3xl font-bold mt-1">
                {clusterStats?.totalFiles || 0}
              </p>
            </div>

            {/* STORAGE */}
            <div className="p-6 rounded-2xl bg-[#0b0f14] border border-white/5 hover:border-purple-500/30 transition-all flex flex-col justify-between min-h-[140px]">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M7 7h10v10H7z" />
                </svg>
              </div>

              <p className="text-xs text-gray-500 uppercase">Storage Used</p>
              <p className="text-3xl font-bold mt-1">
                {clusterStats
                  ? (clusterStats.totalSize / (1024 * 1024)).toFixed(2)
                  : 0}{" "}
                MB
              </p>
            </div>

            {/* TOP FILE TYPE */}
            <div className="p-6 rounded-2xl bg-[#0b0f14] border border-white/5 hover:border-yellow-500/30 transition-all flex flex-col justify-between min-h-[140px]">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-400 mb-4">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 4h16v16H4z" />
                  <path d="M9 9h6v6H9z" />
                </svg>
              </div>

              <p className="text-xs text-gray-500 uppercase">Top File Type</p>
              <p className="text-3xl font-bold uppercase mt-1">
                {clusterStats?.topExtension || "-"}
              </p>
            </div>

            {/* SECURITY ISSUES */}
            <div className="p-6 rounded-2xl bg-[#0b0f14] border border-white/5 hover:border-red-500/30 transition-all flex flex-col justify-between min-h-[140px]">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 mb-4">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
              </div>

              <p className="text-xs text-gray-500 uppercase">Issues Detected</p>

              <p className="text-sm font-medium text-gray-400 mt-1">
                Coming Soon
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SIDEBAR (Now handles Search & List) */}
      <div
        className={`fixed top-0 right-0 h-full w-[450px] bg-[#0f0f0f] border-l border-white/10 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold tracking-tighter">
              CLUSTER_INDEX
            </h2>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="text-gray-500 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          <input
            type="text"
            placeholder="Search clusters..."
            className="w-full px-4 py-3 rounded-xl bg-black border border-white/10 focus:border-[#facc15] outline-none mb-6 text-sm"
          />

          <div className="flex-1 overflow-y-auto space-y-3">
            {clusters.length === 0 ? (
              <div className="border border-dashed border-white/10 rounded-2xl p-10 text-center">
                <p className="text-gray-500 mb-4 text-xs">
                  NO ACTIVE DEPLOYMENTS
                </p>
                <button
                  onClick={() => {
                    setIsSidebarOpen(false);
                    setIsModalOpen(true);
                  }}
                  className="text-[#facc15] text-xs font-bold uppercase tracking-widest"
                >
                  Init Cluster
                </button>
              </div>
            ) : (
              clusters.map((cluster) => (
                <div key={cluster.id} className="space-y-2">
                  {/* CLUSTER CARD */}
                  <div
                    onClick={() => {
                      setActiveMenuId(
                        activeMenuId === cluster.id ? null : cluster.id,
                      );
                    }}
                    className={`p-4 bg-white/5 border rounded-xl cursor-pointer transition-all ${
                      activeMenuId === cluster.id
                        ? "border-[#facc15] bg-[#facc15]/5"
                        : "border-white/5 hover:border-white/20"
                    } group`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4
                          className={`font-bold text-sm transition-colors ${activeMenuId === cluster.id ? "text-[#facc15]" : "text-white"}`}
                        >
                          {cluster.name}
                        </h4>
                        <p className="text-[10px] text-gray-500 font-mono">
                          SOURCE: {cluster.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* OPTIONS MENU */}
                  {activeMenuId === cluster.id && (
                    <div className="grid grid-cols-3 gap-2 px-1 animate-in slide-in-from-top-1 duration-200">
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(
                              "http://localhost:8000/user/check/",
                              {
                                credentials: "include",
                              },
                            );

                            const data = await res.json();

                            if (!data.loggedIn) {
                              window.location.href = "/";
                              return;
                            }

                            window.location.href = `/dashboard/cluster/${cluster.id}`;
                          } catch {
                            window.location.href = "/";
                          }
                        }}
                        className="py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-[9px] font-bold uppercase tracking-tighter text-blue-400"
                      >
                        View
                      </button>

                      <button
                        onClick={async (e) => {
                          e.stopPropagation();

                          try {
                            const res = await fetch(
                              `http://localhost:8000/uploads/list/?workspace_id=${cluster.id}`,
                              { credentials: "include" },
                            );

                            const files = await res.json();

                            // 🔥 compute stats
                            const extCount = {};
                            let totalSize = 0;

                            files.forEach((f) => {
                              const ext = (f.original_name || "file.txt")
                                .split(".")
                                .pop()
                                .toLowerCase();
                              extCount[ext] = (extCount[ext] || 0) + 1;
                              totalSize += f.size || 0;
                            });

                            const sorted = Object.entries(extCount).sort(
                              (a, b) => b[1] - a[1],
                            );

                            setClusterStats({
                              totalFiles: files.length,
                              extensions: sorted,
                              topExtension: sorted[0]?.[0] || "none",
                              totalSize,
                            });

                            setStatsCluster(cluster);
                            setActiveMenuId(null);
                          } catch (err) {
                            console.error("Stats fetch failed", err);
                          }
                        }}
                        className="py-2 rounded-lg bg-[#facc15]/5 border border-[#facc15]/20 hover:bg-[#facc15]/10 text-[9px] font-bold uppercase tracking-tighter text-[#facc15]"
                      >
                        Stats
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModal({
                            open: true,
                            cluster,
                            input: "",
                          });
                        }}
                        className="py-2 rounded-lg bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 text-[9px] font-bold uppercase tracking-tighter text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* ANALYTICS OVERLAY */}
      {statsCluster && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-5xl bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#facc15]/5 blur-[120px] rounded-full -mr-20 -mt-20" />

            <div className="flex justify-between items-start mb-12 relative z-10">
              <div>
                <span className="text-[#facc15] text-xs font-black tracking-[0.3em] uppercase">
                  System Analytics
                </span>
                <h2 className="text-4xl font-black tracking-tighter mt-2 italic">
                  {statsCluster.name}
                </h2>
              </div>
              <button
                onClick={() => setStatsCluster(null)}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-xl"
              >
                ×
              </button>
            </div>

            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-[10px] text-gray-500">FILES</p>
                <p className="text-xl font-bold">
                  {clusterStats?.totalFiles || 0}
                </p>
              </div>

              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-[10px] text-gray-500">TOP TYPE</p>
                <p className="text-xl font-bold uppercase">
                  {clusterStats?.topExtension || "-"}
                </p>
              </div>

              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-[10px] text-gray-500">TYPES</p>
                <p className="text-xl font-bold">
                  {clusterStats?.extensions?.length || 0}
                </p>
              </div>

              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-[10px] text-gray-500">SIZE</p>
                <p className="text-xl font-bold">
                  {clusterStats
                    ? (clusterStats.totalSize / 1024).toFixed(1)
                    : 0}{" "}
                  KB
                </p>
              </div>
            </div>

            {/* 🔥 EXTENSION BREAKDOWN */}
            <div className="mt-6">
              <p className="text-xs text-gray-500 mb-2">FILE DISTRIBUTION</p>

              <div className="space-y-2 max-h-40 overflow-auto">
                {clusterStats?.extensions?.map(([ext, count], i) => (
                  <div
                    key={i}
                    className="flex justify-between text-xs bg-white/5 px-3 py-2 rounded-md"
                  >
                    <span className="uppercase text-gray-300">{ext}</span>
                    <span className="text-gray-500">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {deleteModal.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6">
          <div className="w-full max-w-md bg-[#0a0a0a] border border-red-500/20 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-red-500 mb-2">
              Delete Cluster
            </h2>

            <p className="text-sm text-gray-400 mb-4">
              This action is irreversible. Type{" "}
              <span className="text-red-400 font-mono">
                {deleteModal.cluster?.name}
              </span>{" "}
              to confirm.
            </p>

            <input
              value={deleteModal.input}
              onChange={(e) =>
                setDeleteModal((prev) => ({
                  ...prev,
                  input: e.target.value,
                }))
              }
              placeholder="Type cluster name..."
              className="w-full px-4 py-3 rounded-lg bg-black border border-white/10 focus:border-red-500 outline-none text-sm mb-4"
            />

            <div className="flex gap-3">
              {/* CANCEL */}
              <button
                onClick={() =>
                  setDeleteModal({ open: false, cluster: null, input: "" })
                }
                className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold"
              >
                Cancel
              </button>

              {/* DELETE */}
              <button
                disabled={deleteModal.input !== deleteModal.cluster?.name}
                onClick={async () => {
                  await handleDeleteCluster(deleteModal.cluster.id);
                  setDeleteModal({ open: false, cluster: null, input: "" });
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                  deleteModal.input === deleteModal.cluster?.name
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-red-500/20 text-red-400 cursor-not-allowed"
                }`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {showConsent && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-sm font-bold mb-3">
              Security Scan Authorization
            </h2>

            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              By proceeding, you consent to temporary processing of your file
              content in decrypted form solely for security analysis. No data
              will be stored or persisted beyond scan execution.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConsent(false)}
                className="flex-1 py-2 text-xs border border-white/10 rounded-md hover:bg-white/5"
              >
                Cancel
              </button>

              <button
                onClick={startScan}
                className="flex-1 py-2 text-xs border border-blue-500/30 text-blue-400 rounded-md hover:bg-blue-500/10"
              >
                Accept & Scan
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="fixed bottom-6 right-6 space-y-3 z-[90]">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`px-5 py-3 text-xs rounded-lg border backdrop-blur-md shadow-lg flex items-center gap-3
  ${
    n.type === "success"
      ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
      : "border-red-500/30 bg-red-500/10 text-red-400"
  }
`}
          >
            <span className="font-medium tracking-wide">{n.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
