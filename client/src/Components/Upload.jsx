"use client";
import { useRef, useState } from "react";
import { encryptData } from "@/utils/EncryptFn";   // ⭐ import encryption function

export default function UploadButton() {
  const fileInput = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const openPicker = () => fileInput.current.click();

  const onFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);

    console.log("Selected File:", file);


    const encryptedPayload = await encryptData(file, "1234");

    console.log("Encrypted Payload:", encryptedPayload);

    // ⭐ 3. Send encrypted data to backend
    try {
      const res = await fetch("http://127.0.0.1:8000/uploads/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(encryptedPayload),
      });

      const data = await res.json();

      console.log("Backend Response:", data);
      alert("File uploaded successfully!");

    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed!");
    }
  };

  return (
    <div className="space-y-3">

      {/* Hidden input (required for browser security) */}
      <input
        type="file"
        ref={fileInput}
        className="hidden"
        onChange={onFileSelect}
      />

      {/* ⭐ Aesthetic Google-like Upload Button */}
      <button
        onClick={openPicker}
        className="
          flex items-center gap-2 
          px-4 py-2
          bg-white
          text-gray-700
          font-medium
          text-sm
          rounded-lg
          border border-gray-300
          shadow-sm
          hover:bg-gray-50
          hover:shadow-md
          active:scale-[0.97]
          transition-all
          hover:cursor-pointer
        "
      >
        {/* Upload Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 text-indigo-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16V4m0 0l-4 4m4-4l4 4M6 20h12"
          />
        </svg>

        Upload File
      </button>

      {/* ⭐ Minimal Selected File Line */}
      {selectedFile && (
        <div className="flex items-center gap-2 text-sm text-gray-700 border-b pb-1">

          {/* Filename */}
          <span className="font-medium">{selectedFile.name}</span>

          {/* Separator */}
          <span className="text-gray-400">•</span>

          {/* Size */}
          <span className="text-gray-500">
            {(selectedFile.size / 1024).toFixed(1)} KB
          </span>

          {/* ✔ Static Success Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 text-green-600 ml-auto"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

    </div>
  );
}
