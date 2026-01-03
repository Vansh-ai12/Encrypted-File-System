"use client";
import { useRef, useState } from "react";
import { encryptData } from "@/utils/EncryptFn";

export default function UploadButton() {
  const fileInput = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const openPicker = () => fileInput.current.click();

  const handleFileChoose = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);

    const encryptedPayload = await encryptData(selectedFile, "1234");

    try {
      const res = await fetch("http://localhost:8000/uploads/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(encryptedPayload),
      });

      const data = await res.json();
      console.log("Backend Response:", data);
      alert("File uploaded successfully!");
      setSelectedFile(null);
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed!");
    }

    setUploading(false);
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInput}
        className="hidden"
        onChange={handleFileChoose}
      />

      <button
        onClick={openPicker}
        className="
          flex items-center gap-2
          px-5 py-2.5
          rounded-xl
          bg-gradient-to-r from-purple-600 to-indigo-600
          text-white font-semibold text-sm
          shadow-lg shadow-indigo-300/30
          hover:shadow-xl hover:scale-[1.02]
          active:scale-[0.97]
          transition-all duration-200
          hover:cursor-pointer
        "
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className='w-5 h-5'
          fill='none'
          viewBox='0 0 24 24'
          strokeWidth='2'
          stroke='currentColor'
        >
          <path strokeLinecap='round' strokeLinejoin='round'
            d='M12 16V4m0 0l-4 4m4-4l4 4M6 20h12'/>
        </svg>
        Select a File
      </button>

      {selectedFile && (
        <div className="flex items-center gap-3 text-sm text-gray-700 border p-2 rounded-lg shadow-sm bg-white">
          <span className="font-medium">{selectedFile.name}</span>

          <span className="text-gray-500 text-xs">
            {(selectedFile.size / 1024).toFixed(1)} KB
          </span>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className={`px-3 py-1 text-xs rounded-md text-white transition 
              ${uploading ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-500 hover:cursor-pointer"}`}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>

          <button
            onClick={handleCancel}
            disabled={uploading}
            className="px-3 py-1 text-xs rounded-md bg-red-600 text-white hover:bg-red-500 transition hover:cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
