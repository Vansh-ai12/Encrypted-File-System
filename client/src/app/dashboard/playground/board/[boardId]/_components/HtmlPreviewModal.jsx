"use client";

import { useState, useMemo, useEffect } from "react";
import { X, Upload, FileCode2, Palette, Zap, LayoutTemplate } from "lucide-react";

const TEMPLATES = {
  todo: {
    name: "Todo App",
    html: `
      <div class="app">
        <h1>🚀 Todo App</h1>
        <div class="input-row">
          <input id="taskInput" placeholder="Enter a task..." />
          <button onclick="addTask()">Add</button>
        </div>
        <ul id="list"></ul>
      </div>
    `,
    css: `
      body {
        margin:0;
        font-family: Inter, sans-serif;
        background: linear-gradient(135deg,#020617,#0f172a);
        display:flex;
        justify-content:center;
        align-items:center;
        height:100vh;
        color:white;
      }
      .app{
        background:#0b1220;
        padding:30px;
        border-radius:16px;
        width:350px;
        box-shadow:0 20px 60px rgba(0,0,0,0.6);
      }
      input{
        flex:1;
        padding:10px;
        border-radius:10px;
        border:none;
        background:#1e293b;
        color:white;
      }
      button{
        padding:10px 16px;
        border:none;
        border-radius:10px;
        background:linear-gradient(135deg,#3b82f6,#6366f1);
        color:white;
        cursor:pointer;
      }
      li{
        background:#1e293b;
        margin-top:10px;
        padding:10px;
        border-radius:10px;
      }
    `,
    js: `
      function addTask(){
        const input = document.getElementById("taskInput");
        if(!input.value.trim()) return;
        const li = document.createElement("li");
        li.textContent = input.value;
        document.getElementById("list").appendChild(li);
        input.value="";
      }
    `,
  },
};

export const HtmlPreviewModal = ({ open, onClose }) => {
  const [html, setHtml] = useState("");
  const [css, setCss] = useState("");
  const [js, setJs] = useState("");

  // 🧹 RESET when modal closes (NO previous preview)
  useEffect(() => {
    if (!open) {
      setHtml("");
      setCss("");
      setJs("");
    }
  }, [open]);

  const readFile = async (file, setter) => {
    if (!file) return;
    const text = await file.text();
    setter(text);
  };

  const loadTemplate = (key) => {
    const tpl = TEMPLATES[key];
    setHtml(tpl.html);
    setCss(tpl.css);
    setJs(tpl.js);
  };

  // 🔥 FULL FRONTEND COMPILER (HTML + CSS + JS)
  const compiledDoc = useMemo(() => {
    if (!html && !css && !js) return "";

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <style>
          ${css || ""}
        </style>
      </head>
      <body>
        ${html || "<div style='padding:20px;font-family:sans-serif;'>No HTML Provided</div>"}
        <script>
          try {
            ${js || ""}
          } catch (e) {
            document.body.innerHTML += 
              "<pre style='color:red;padding:10px;'>JS Error: " + e + "</pre>";
          }
        </script>
      </body>
      </html>
    `;
  }, [html, css, js]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-xl flex items-center justify-center">
      <div className="w-[1100px] h-[700px] rounded-2xl border border-white/10 bg-gradient-to-br from-[#020617] to-[#020617] shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden relative">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <FileCode2 className="text-white" size={18}/>
            </div>
            <h2 className="text-white font-semibold text-lg tracking-wide">
              Frontend Live Preview Sandbox
            </h2>
          </div>

          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-xl transition"
          >
            <X size={20}/>
          </button>
        </div>

        {/* 🔥 Upload + Templates Toolbar */}
        <div className="p-4 flex flex-wrap gap-3 border-b border-white/10 bg-[#020617]/80">

          {/* HTML Upload */}
          <label className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-lg hover:scale-105 transition">
            <Upload size={16}/> HTML
            <input hidden type="file" accept=".html,.htm"
              onChange={(e)=>readFile(e.target.files[0], setHtml)}
            />
          </label>

          {/* CSS Upload */}
          <label className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer bg-[#0f172a] border border-white/10 text-white hover:border-cyan-400/40 transition">
            <Palette size={16}/> CSS
            <input hidden type="file" accept=".css"
              onChange={(e)=>readFile(e.target.files[0], setCss)}
            />
          </label>

          {/* JS Upload */}
          <label className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer bg-[#0f172a] border border-white/10 text-white hover:border-yellow-400/40 transition">
            <Zap size={16}/> JS
            <input hidden type="file" accept=".js"
              onChange={(e)=>readFile(e.target.files[0], setJs)}
            />
          </label>

          {/* Templates */}
          <button
            onClick={() => loadTemplate("todo")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:scale-105 transition"
          >
            <LayoutTemplate size={16}/> Load Template
          </button>

        </div>

        {/* Preview */}
        <div className="flex-1 p-4 bg-black">
          <div className="w-full h-full rounded-xl overflow-hidden border border-white/10 bg-white shadow-inner">
            {compiledDoc ? (
              <iframe
                title="frontend-preview"
                sandbox="allow-scripts allow-same-origin"
                srcDoc={compiledDoc}
                className="w-full h-full border-0"
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <div className="text-4xl mb-3">🧪</div>
                <p>Upload HTML, CSS, JS or load a template</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};