"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { decryptFile, encryptFile } from "@/lib/crypto";
import Logo from "@/Components/Logo";

import { splitText } from "@/lib/splitter";
import { generateEmbedding } from "@/lib/embeddings";
import { insertVectors } from "@/lib/qdrant";

import JSZip from "jszip";

import { useRef } from "react";

export default function ClusterView() {
  const { id } = useParams();
  const [cluster, setCluster] = useState(null);
  const [files, setFiles] = useState([]);
  const [decryptedContent, setDecryptedContent] = useState("");
  const [fileType, setFileType] = useState("text");
  const [mimeType, setMimeType] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [isDecrypting, setIsDecrypting] = useState(true);
  const formattedClusterId = "CL-" + id.toString().padStart(4, "0") + "-AX";
  const [currentFileId, setCurrentFileId] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [isDirty, setIsDirty] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadError, setUploadError] = useState("");
  const MAX_TOTAL_SIZE = 50 * 1024 * 1024;
  const [pendingFiles, setPendingFiles] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiPos, setAiPos] = useState({
    x: window.innerWidth - 100,
    y: window.innerHeight - 100,
  });
  const [dragging, setDragging] = useState(false);
  const [dragEnabled, setDragEnabled] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState([]);
  const [aiExpanded, setAiExpanded] = useState(false);

  const [copiedIndex, setCopiedIndex] = useState(null);

  const [indexedFiles, setIndexedFiles] = useState(new Set());

  const [userId, setUserId] = useState(null);

  const messagesEndRef = useRef(null);

  const analyzeFiles = (files) => {
    let issues = 0;

    const seen = new Set();

    files.forEach((f) => {
      const key = f.original_name + "_" + f.size;

      if (seen.has(key)) issues++;
      else seen.add(key);

      if (!f.size || f.size === 0) issues++;

      if (f.size > 5 * 1024 * 1024) issues++;

      const ext = f.original_name?.split(".").pop();
      if (["exe", "sh", "bat"].includes(ext)) issues++;
    });

    return Math.max(0, 100 - issues * 5);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  let lastTap = 0;

  const handlePointerDown = (e) => {
    const now = Date.now();

    // DOUBLE TAP DETECTION
    if (now - lastTap < 300) {
      setDragEnabled((prev) => !prev);
    }
    lastTap = now;

    if (!dragEnabled) return;

    setDragging(true);

    const offsetX = e.clientX - aiPos.x;
    const offsetY = e.clientY - aiPos.y;

    const move = (ev) => {
      setAiPos({
        x: ev.clientX - offsetX,
        y: ev.clientY - offsetY,
      });
    };

    const up = () => {
      setDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("https://encrypted-file-system-production.up.railway.app/user/check/", {
          credentials: "include",
        });

        const data = await res.json();

        if (!data.loggedIn) {
          window.location.href = "/";
        }
      } catch {
        window.location.href = "/";
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  useEffect(() => {
    let isMounted = true;

    const fetchAndDecrypt = async () => {
      try {
        const filesRes = await fetch(
          `https://encrypted-file-system-production.up.railway.app/uploads/list/?workspace_id=${id}`,
          {
            credentials: "include",
          },
        );

        if (filesRes.ok) {
          const filesData = await filesRes.json();

          const health = analyzeFiles(filesData);

          if (isMounted) {
            setFiles(filesData);

            // 🔥 attach health to cluster
            setCluster((prev) => ({
              ...(prev || {}),
              health,
            }));
          }
        }
        const workspaceRes = await fetch(
          `https://encrypted-file-system-production.up.railway.app/workspaces/${id}/`,
          { credentials: "include" },
        );

        if (workspaceRes.ok) {
          const workspaceData = await workspaceRes.json();

          if (isMounted) {
            setCluster((prev) => ({
              ...(prev || {}),
              name: workspaceData.name,
            }));
          }
        } else {
          if (isMounted) {
            setCluster({
              name: formattedClusterId,
            });
          }
        }
      } catch (err) {
        console.error("Zero-Knowledge Fetch Failed", err);

        if (isMounted) setCluster({ name: "Cluster" });
      } finally {
        if (isMounted) {
          setTimeout(() => setIsDecrypting(false), 800);
        }
      }
    };

    fetchAndDecrypt();

    setTimeout(fetchAndDecrypt, 500);

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleCommit = async () => {
    if (!currentFileId || fileType !== "text") return;

    try {
      setSaveStatus("saving");

      let password = localStorage.getItem(`cluster_key_${id}`);
      if (!password) password = localStorage.getItem("cluster_key");

      const file = new Blob([decryptedContent], { type: "text/plain" });

      const encrypted = await encryptFile(file, password);

      const res = await fetch("https://encrypted-file-system-production.up.railway.app/uploads/update/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: currentFileId,
          ...encrypted,
        }),
      });

      if (!res.ok) throw new Error("Commit failed");

      setSaveStatus("saved");
      setIsDirty(false);

      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      console.error("Commit failed", err);
      setSaveStatus("error");
      setIsDirty(false);
    }
  };

  const handleDownloadCluster = async () => {
    try {
      let password = localStorage.getItem(`cluster_key_${id}`);
      if (!password) password = localStorage.getItem("cluster_key");

      const zip = new JSZip();

      for (let file of files) {
        const res = await fetch("https://encrypted-file-system-production.up.railway.app/uploads/view/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id: file.file_id }),
        });

        if (!res.ok) continue;

        const data = await res.json();

        const clearBytes = await decryptFile(
          data.ciphertextBase64,
          data.ivBase64,
          data.saltBase64,
          password,
        );

        // 🔥 HANDLE TEXT FILES
        if (
          file.mime_type?.includes("text") ||
          file.original_name.endsWith(".cpp")
        ) {
          const decoder = new TextDecoder();
          const text = decoder.decode(clearBytes);

          zip.file(file.original_name, text);
        } else {
          // 🔥 HANDLE BINARY FILES
          zip.file(file.original_name, clearBytes);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });

      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");

      a.href = url;
      a.download = `${cluster?.name || "cluster"}.zip`;

      document.body.appendChild(a);
      a.click();

      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  

  const ALLOWED_EXTENSIONS = [
    "png",
    "jpg",
    "jpeg",
    "gif",
    "webp",
    "pdf",
    "docx",
    "ppt",
    "txt",
    "js",
    "ts",
    "java",
    "cpp",
    "c",
    "py",
    "html",
    "css",
    "json",
  ];

  const createPromptLine = () => {
    return `
    <span style="color:#4ec9b0">${cluster?.name || "root"}</span>
    <span style="color:#dcdcaa"> ${currentPath}</span>
    <span style="color:#ffffff"> ❯ </span>
  `;
  };

  const handleFileSelection = (filesList) => {
    let totalSize = 0;

    for (let file of filesList) {
      const ext = file.name.split(".").pop().toLowerCase();

      // ❌ INVALID FORMAT
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setUploadError(`.${ext} format not supported`);
        return;
      }

      totalSize += file.size;
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      setUploadError("Total upload exceeds 50MB limit");
      return;
    }

    setUploadError("");
    setPendingFiles(filesList);
    setShowConfirm(true); // 🔥 trigger modal
  };

  const handleMultiUpload = async (filesList) => {
    let totalSize = 0;
    const validFiles = [];

    for (let file of filesList) {
      totalSize += file.size;
      validFiles.push(file);
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      setUploadError("Total upload exceeds 50MB limit");
      return;
    }

    setUploadError("");
    setUploadFiles(validFiles);

    try {
      let password = localStorage.getItem(`cluster_key_${id}`);
      if (!password) password = localStorage.getItem("cluster_key");

      for (let file of validFiles) {
        const encrypted = await encryptFile(file, password);

        const formData = new FormData();
        formData.append("ciphertext", encrypted.ciphertextBase64);
        formData.append("iv", encrypted.ivBase64);
        formData.append("salt", encrypted.saltBase64);
        formData.append("workspace_id", id);
        formData.append("originalName", file.name);
        formData.append("mimeType", file.type);
        formData.append("size", file.size);

        const res = await fetch("https://encrypted-file-system-production.up.railway.app/uploads/", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!res.ok) {
          throw new Error("Upload failed");
        }
      }

      // 🔥 refresh files list
      const filesRes = await fetch(
        `https://encrypted-file-system-production.up.railway.app/uploads/list/?workspace_id=${id}`,
        { credentials: "include" },
      );

      if (filesRes.ok) {
        const filesData = await filesRes.json();
        setFiles(filesData);
      }

      setUploadFiles([]);
    } catch (err) {
      console.error("Multi upload failed", err);
      setUploadError("Upload failed");
    }
  };

  const handleDeleteFile = async (fileId) => {
    try {
      const res = await fetch("https://encrypted-file-system-production.up.railway.app/uploads/delete/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: fileId }),
      });

      if (!res.ok) throw new Error("Delete failed");

      // 🔥 refresh list
      setFiles((prev) => prev.filter((f) => f.file_id !== fileId));

      if (currentFileId === fileId) {
        setDecryptedContent("");
        setBlobUrl(null);
        setCurrentFileId(null);
      }
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const FormattedMessage = ({ content }) => {
    if (!content) return null;

    // 🔥 SPLIT BY CODE BLOCKS ```
    const parts = content.split(/```/);

    return (
      <div className="space-y-3">
        {parts.map((part, i) => {
          const isCode = i % 2 === 1;

          if (isCode) {
            // 🔥 CLEAN ONLY FIRST LINE (like cpp, js)
            const lines = part.split("\n");
            if (lines[0].trim().length < 10) lines.shift();

            const code = lines.join("\n").trim();

            return (
              <div
                key={i}
                className="relative bg-[#0b0b0b] border border-white/10 rounded-lg p-3 font-mono text-[11px] overflow-x-auto"
              >
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(code);
                    setCopiedIndex(i);

                    setTimeout(() => setCopiedIndex(null), 1500);
                  }}
                  className="absolute top-2 right-2 text-[10px] bg-[#facc15] text-black px-2 py-1 rounded"
                >
                  {copiedIndex === i ? "✓ Copied" : "Copy"}
                </button>

                <pre className="whitespace-pre-wrap break-words">{code}</pre>
              </div>
            );
          }

          return (
            <div key={i} className="text-gray-200 leading-relaxed text-[12px]">
              {part
                .replace(/[`]/g, "")
                .replace(/\*/g, "")
                .replace(/["']/g, "")
                .replace(/#+/g, "")
                .trim()
                .split("\n")
                .map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
            </div>
          );
        })}
      </div>
    );
  };
  return (
    <div className="h-screen w-full bg-[#050505] text-white flex flex-col font-mono overflow-hidden">
      {/* HUD HEADER */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-[#facc15]/20 bg-[#0a0a0a]">
        <div className="flex items-center gap-6">
          <Logo size={30} />
          <div className="h-8 w-[1px] bg-white/10" />
          <div>
            <h1 className="text-lg font-semibold tracking-wide text-white flex items-center gap-2">
              <span className="w-2 h-2 bg-[#facc15] rounded-full animate-pulse"></span>
              {cluster?.name}
            </h1>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          {/* 🔥 COMMIT BUTTON */}
          <button
            onClick={handleCommit}
            disabled={!isDirty || saveStatus === "saving"}
            className={`
      px-4 py-2 rounded-md text-xs font-medium flex items-center gap-2
      transition-all duration-200

      ${
        isDirty
          ? "bg-[#facc15] text-black hover:shadow-[0_0_10px_rgba(250,204,21,0.5)]"
          : "bg-white/5 text-gray-500 cursor-not-allowed"
      }

      ${saveStatus === "saving" ? "opacity-60 animate-pulse" : ""}
    `}
          >
            {saveStatus === "saving"
              ? "Saving..."
              : saveStatus === "saved"
                ? "✓ Saved"
                : "Commit Changes"}
          </button>
          <button
            onClick={handleDownloadCluster}
            className="
    px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2

    bg-gradient-to-r from-[#facc15] to-yellow-400
    text-black

    border border-[#facc15]/30

    shadow-[0_0_10px_rgba(250,204,21,0.3)]

    hover:shadow-[0_0_20px_rgba(250,204,21,0.8)]
    hover:scale-[1.05]

    active:scale-[0.95]

    transition-all duration-200
  "
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14" />
              <path d="M19 12l-7 7-7-7" />
            </svg>

            <span className="tracking-wider">EXPORT_VAULT</span>
          </button>
          
          {/* 🔥 ADD FILE BUTTON */}
          <label
            className="
    px-4 py-2
    rounded-md
    border border-white/10
    bg-white/5
    text-white/80
    text-xs font-medium
    cursor-pointer
    flex items-center gap-2

    hover:bg-white/10
    hover:border-white/20
    hover:text-white

    active:scale-[0.97]

    transition-all duration-150
  "
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="tracking-wide">ADD FILES</span>

            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files);
                handleFileSelection(files);
              }}
            />
          </label>
          {uploadError && (
            <span className="text-red-500 text-[10px] font-bold ml-2">
              {uploadError}
            </span>
          )}

          <div className="px-4 py-1 rounded-full border border-green-500/30 bg-green-500/5 text-green-500 text-[10px] font-bold animate-pulse">
            SECURE_CONNECTION_ACTIVE
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT NAV */}
        <div className="w-64 border-r border-white/5 bg-[#0a0a0a] p-6 space-y-8">
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.file_id}
                className="flex items-center justify-between group px-3 py-2 rounded-md hover:bg-[#111] border border-transparent hover:border-white/10 transition-all"
              >
                <button
                  onClick={async () => {
                    setCurrentFileId(file.file_id); // 🔥 IMPORTANT FIX
                    setIsDirty(false); // 🔥 reset on file switch
                    setIsDecrypting(true);

                    const res = await fetch(
                      "https://encrypted-file-system-production.up.railway.app/uploads/view/",
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ id: file.file_id }),
                      },
                    );

                    const data = await res.json();

                    setMimeType(data.mimeType);

                    let password = localStorage.getItem(`cluster_key_${id}`);
                    if (!password)
                      password = localStorage.getItem("cluster_key");

                    const clearText = await decryptFile(
                      data.ciphertextBase64,
                      data.ivBase64,
                      data.saltBase64,
                      password,
                    );

                    const ext = data.originalName
                      .split(".")
                      .pop()
                      .toLowerCase();

                    let type = "text";
                    if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext))
                      type = "image";
                    else if (ext === "pdf") type = "pdf";

                    setFileType(type);

                    if (type === "text") {
                      const decoder = new TextDecoder();
                      const text = decoder.decode(clearText);

                      setDecryptedContent(text);
                      setBlobUrl(null);

                      (async () => {
                        try {
                          // 🚨 PREVENT DUPLICATE INDEXING
                          if (indexedFiles.has(file.file_id)) {
                            console.log("⚠️ Already indexed, skipping...");
                            return;
                          }

                          const chunks = splitText(text);
                          const points = [];

                          for (let i = 0; i < chunks.length; i++) {
                            const embedding = await generateEmbedding(
                              chunks[i],
                            );

                            if (
                              !Array.isArray(embedding) ||
                              embedding.length !== 384
                            ) {
                              console.error("❌ Invalid embedding:", embedding);
                              continue;
                            }

                            points.push({
                              id: crypto.randomUUID(),
                              vector: Array.from(embedding),
                              payload: {
                                text: chunks[i],
                                file_id: file.file_id,
                                file_name: file.original_name,
                                workspace_id: id,
                                chunk_id: i,
                              },
                            });
                          }

                          if (points.length === 0) return;

                          await insertVectors(points);

                          // ✅ MARK AS INDEXED
                          setIndexedFiles((prev) =>
                            new Set(prev).add(file.file_id),
                          );

                          console.log("✅ Indexed once only");
                        } catch (err) {
                          console.error("❌ Indexing failed:", err);
                        }
                      })();
                    } else {
                      const bytes = new Uint8Array(clearText);
                      const blob = new Blob([bytes], {
                        type:
                          data.mimeType ||
                          (type === "pdf" ? "application/pdf" : `image/${ext}`),
                      });

                      setBlobUrl(URL.createObjectURL(blob));
                    }

                    setIsDecrypting(false);
                  }}
                  className="truncate text-gray-300 text-xs flex-1 text-left"
                >
                  {file.original_name}
                </button>

                {/* 🗑️ DELETE (BIN STYLE) */}
                <button
                  onClick={() => setDeleteTarget(file)}
                  className="
    opacity-0 group-hover:opacity-100
    flex items-center justify-center
    w-7 h-7
    rounded-lg
    bg-white/0
    hover:bg-red-500/10
    text-gray-500
    hover:text-red-400
    transition-all duration-200
    hover:scale-110 active:scale-95
  "
                  title="Delete file"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6v-2h8v2" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M5 6l1 14h12l1-14" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* MAIN TERMINAL */}
        <div className="flex-1 relative bg-black flex flex-col">
          {/* Show overlay if still decrypting OR if cluster data hasn't arrived yet */}
          {isDecrypting && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="w-12 h-12 border-2 border-[#facc15] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-[#facc15] text-xs font-black tracking-[0.4em] animate-pulse">
                DECRYPTING_VAULT...
              </p>
            </div>
          )}

          {
            <div className="flex-1 overflow-auto p-8 custom-scrollbar">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-2 mb-4 text-gray-500 text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>SOURCE_DECRYPTED_SUCCESSFULLY</span>
                </div>

                <div className="flex text-sm font-mono bg-[#0b0b0b] border border-white/5 rounded-lg overflow-hidden">
                  {/* KEEP YOUR EXISTING LOCAL VIEW CODE */}
                  {/* LINE NUMBERS */}
                  <div className="bg-[#050505] text-gray-600 px-3 py-4 text-right select-none">
                    {fileType === "text" &&
                    typeof decryptedContent === "string" ? (
                      decryptedContent
                        .split("\n")
                        .map((_, i) => <div key={i}>{i + 1}</div>)
                    ) : (
                      <div>1</div>
                    )}
                  </div>
                  {fileType === "image" && blobUrl && (
                    <div className="flex-1 flex items-center justify-center bg-black">
                      <img
                        src={blobUrl}
                        alt="preview"
                        className="max-w-full max-h-[80vh] object-contain"
                      />
                    </div>
                  )}

                  {fileType === "pdf" && blobUrl && (
                    <embed
                      src={blobUrl}
                      type="application/pdf"
                      className="w-full h-[80vh]"
                    />
                  )}

                  {fileType === "text" && (
                    <textarea
                      value={
                        decryptedContent ||
                        (cluster
                          ? "// No encrypted data found."
                          : "// Initializing...")
                      }
                      onChange={(e) => {
                        setDecryptedContent(e.target.value);
                        setIsDirty(true);
                      }}
                      className="flex-1 bg-transparent outline-none px-4 py-4 text-gray-300 resize-none"
                      spellCheck={false}
                    />
                  )}
                </div>
              </div>
            </div>
          }

          {/* HUD FOOTER */}
          <div className="h-10 border-t border-white/5 bg-[#0a0a0a] flex items-center px-6 justify-between">
            {isDirty && (
              <span className="text-yellow-500">● Unsaved Changes</span>
            )}
            <div className="flex gap-6 text-[9px] font-bold text-gray-600">
              <span>
                LINES:{" "}
                {fileType === "text" && typeof decryptedContent === "string"
                  ? decryptedContent.split("\n").length
                  : 0}
              </span>
              <span>ENC: AES-256-GCM</span>
              <span>STATUS: {cluster ? "READY" : "CONNECTING"}</span>
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1 text-green-500">
                  ✓ Committed
                </span>
              )}

              {saveStatus === "error" && (
                <span className="text-red-500">Failed</span>
              )}
            </div>
            <p className="text-[9px] text-[#facc15] italic">
              SENTINEL PROTOCOL ACTIVE
            </p>
          </div>
        </div>
      </div>
      {showConfirm && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur flex items-center justify-center">
          <div className="bg-[#0a0a0a] border border-[#facc15]/20 rounded-xl p-6 w-[400px] shadow-[0_0_30px_rgba(250,204,21,0.1)]">
            <h2 className="text-sm font-bold text-[#facc15] mb-4 tracking-wide">
              CONFIRM UPLOAD
            </h2>

            <div className="text-xs text-gray-400 space-y-1 mb-4 max-h-32 overflow-auto">
              {pendingFiles.map((f, i) => (
                <div key={i} className="truncate">
                  {f.name}
                </div>
              ))}
            </div>

            <p className="text-[10px] text-gray-500 mb-4">
              {pendingFiles.length} files selected
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setPendingFiles([]);
                }}
                className="text-xs px-3 py-1 border border-white/10 rounded-md text-gray-400 hover:bg-white/5 transition"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  await handleMultiUpload(pendingFiles);
                  setShowConfirm(false);
                }}
                className="text-xs px-4 py-1 bg-[#facc15] text-black font-bold rounded-md hover:shadow-[0_0_15px_rgba(250,204,21,0.4)] transition"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur flex items-center justify-center">
          <div className="bg-[#0a0a0a] border border-red-500/20 rounded-xl p-6 w-[380px] shadow-[0_0_40px_rgba(239,68,68,0.1)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                🗑️
              </div>
              <h2 className="text-sm font-bold text-red-400 tracking-wide">
                DELETE FILE
              </h2>
            </div>

            <p className="text-xs text-gray-400 mb-2">
              Are you sure you want to delete:
            </p>

            <div className="text-xs text-white font-mono bg-white/5 px-3 py-2 rounded-md mb-4 truncate">
              {deleteTarget.original_name}
            </div>

            <p className="text-[10px] text-gray-500 mb-5">
              This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="text-xs px-3 py-1 border border-white/10 rounded-md text-gray-400 hover:bg-white/5 transition"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  await handleDeleteFile(deleteTarget.file_id);
                  setDeleteTarget(null);
                }}
                className="text-xs px-4 py-1 bg-red-500 text-black font-bold rounded-md hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onPointerDown={handlePointerDown}
        onClick={() => {
          if (!dragging) setAiOpen(true);
        }}
        style={{
          right: 20,
          bottom: 70,
          position: "fixed",
        }}
        className={`
    w-14 h-14 rounded-full
    flex items-center justify-center
    text-xl font-bold
    z-[500]
    transition-all duration-200

    ${
      dragEnabled
        ? "bg-blue-500 text-white shadow-[0_0_25px_rgba(59,130,246,0.6)]"
        : "bg-[#facc15] text-black shadow-[0_0_20px_rgba(250,204,21,0.4)]"
    }

    ${dragging ? "scale-110" : "hover:scale-110"}
  `}
      >
        ✦
      </button>

      {/* 🔥 AI CHAT PANEL */}
      {aiOpen && (
        <div
          className={`
      fixed top-0 right-0 h-full z-[600] flex flex-col 
      bg-[#0a0a0a] border-l border-[#facc15]/20
      transition-all duration-300
      ${aiExpanded ? "w-[400px]" : "w-[300px]"}
    `}
        >
          {/* HEADER */}
          <div className="flex justify-between items-center p-4 border-b border-white/10">
            <p className="text-xs text-[#facc15] font-bold tracking-widest">
              AI ASSISTANT
            </p>

            <div className="flex gap-2">
              {/* 🔥 EXPAND / SHRINK */}
              <button
                onClick={() => setAiExpanded((p) => !p)}
                className="text-gray-400 hover:text-white text-sm"
                title={aiExpanded ? "Shrink" : "Expand"}
              >
                {aiExpanded ? "🗕" : "🗖"}
              </button>

              {/* 🔥 COLLAPSE BACK TO ✦ */}
              <button
                onClick={() => {
                  setAiOpen(false);
                  setAiExpanded(false); // reset state
                }}
                className="text-gray-400 hover:text-red-400 text-sm px-1"
                title="Close Assistant"
              >
                ✕
              </button>
            </div>
          </div>

          {/* CHAT MESSAGES */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs min-h-0">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`max-w-[85%] px-3 py-2 rounded-lg whitespace-pre-wrap
      ${
        msg.role === "user"
          ? "bg-[#facc15] text-black ml-auto"
          : "bg-[#111] text-gray-200 border border-white/10"
      }
    `}
              >
                {msg.role === "assistant" ? (
                  <FormattedMessage content={msg.content} />
                ) : (
                  msg.content
                )}
              </div>
            ))}
            {thinking && (
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <div className="w-3 h-3 border-2 border-[#facc15] border-t-transparent rounded-full animate-spin" />
                Thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT */}
          <div className="p-3 border-t border-white/10 sticky bottom-0 bg-[#0a0a0a]">
            <textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Ask about this file..."
              className="w-full h-16 bg-black border border-white/10 rounded-md p-2 text-xs outline-none resize-none"
            />

            <button
              onClick={async () => {
                if (!aiInput.trim()) return;

                try {
                  setThinking(true);

                  setMessages((prev) => [
                    ...prev,
                    { role: "user", content: aiInput },
                  ]);
                  const currentPrompt = aiInput;
                  setAiInput(""); // 🔥 CLEAR INPUT IMMEDIATELY

                  const res = await fetch(
                    "https://encrypted-file-system-production.up.railway.app/griff/generate_response/",
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({
                        question: currentPrompt,
                        workspace_id: id,
                        file_id: currentFileId,
                      }),
                    },
                  );

                  if (!res.ok) {
                    const err = await res.json();
                    console.error("❌ Backend error:", err);

                    setMessages((prev) => [
                      ...prev,
                      {
                        role: "assistant",
                        content: "Error: " + (err.error || "Server error"),
                      },
                    ]);

                    return;
                  }

                  const data = await res.json();

                  setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: data.response },
                  ]);

                  setAiInput("");
                } catch (err) {
                  console.error("❌ AI error:", err);
                } finally {
                  setThinking(false);
                }
              }}
              className="
mt-2 w-full py-2 
bg-[#facc15] text-black text-xs font-bold rounded-md
sticky bottom-0
hover:scale-[1.02] active:scale-[0.98]
transition-all
"
            >
              {thinking ? "Thinking..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
