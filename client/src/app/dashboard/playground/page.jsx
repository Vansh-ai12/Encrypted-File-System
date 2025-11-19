"use client";

import { useRef, useState } from "react";
import ImageResizerButton from "@/Components/ImageResizerButton";
import Logo from "@/Components/Logo";
import Profile from "@/Components/Profile";
import { PDFDocument } from "pdf-lib";

export default function PlaygroundButton() {
  const fileInputRef = useRef(null);
  const [images, setImages] = useState([]);

  // Handle image upload
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const urls = files.map((f) => URL.createObjectURL(f));
    setImages((prev) => [...prev, ...urls]);
  };

  // Open file picker
  const openFilePicker = () => fileInputRef.current.click();

  // Convert images to PDF
  const convertToPDF = async () => {
    if (images.length === 0) return;

    const pdfDoc = await PDFDocument.create();

    for (const imgUrl of images) {
      const imgBytes = await fetch(imgUrl).then((res) => res.arrayBuffer());

      let pdfImage;
      if (imgUrl.endsWith(".png")) {
        pdfImage = await pdfDoc.embedPng(imgBytes);
      } else {
        pdfImage = await pdfDoc.embedJpg(imgBytes);
      }

      const { width, height } = pdfImage;

      const page = pdfDoc.addPage([width, height]);
      page.drawImage(pdfImage, { x: 0, y: 0, width, height });
    }

    const pdfBytes = await pdfDoc.save();

    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "converted.pdf";
    link.click();
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">

      {/* Top Bar */}
      <div className="flex p-9 justify-between">
        <Logo />
        <Profile />
      </div>

      {/* Centered Button */}
      <div className="flex justify-center mt-4">
        <button
          className="
            px-6 py-3
            rounded-xl
            bg-indigo-600/90
            text-white font-semibold
            shadow-lg shadow-indigo-500/40
            backdrop-blur-sm
            hover:bg-indigo-700 hover:shadow-indigo-400/40
            hover:scale-[1.03]
            active:scale-95
            transition-all duration-200 ease-out
            hover:cursor-pointer
          "
        >
          Open Image Resizer
        </button>
      </div>

      {/* ----------------------- */}
      {/*   IMAGE → PDF SECTION   */}
      {/* ----------------------- */}

      <div className="mt-10 max-w-2xl mx-auto w-full bg-white rounded-xl shadow-lg p-6 border border-gray-200">

        <h2 className="text-xl font-bold text-indigo-700 mb-4 text-center">
          Convert Images to PDF
        </h2>

        {/* Hidden Input */}
        <input
          type="file"
          multiple
          accept="image/*"
          ref={fileInputRef}
          className="hidden"
          onChange={handleImageUpload}
        />

        {/* Upload Button */}
        <div className="flex justify-center mb-4">
          <button
            onClick={openFilePicker}
            className="
              px-5 py-2.5 rounded-lg
              bg-indigo-600 text-white font-medium
              hover:bg-indigo-700 hover:scale-[1.03]
              active:scale-95 transition-all duration-200
              shadow-md shadow-indigo-400/40
              hover:cursor-pointer
            "
          >
            Upload Images
          </button>
        </div>

        {/* Preview Grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-5">
            {images.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt="preview"
                className="rounded-lg shadow-md border"
              />
            ))}
          </div>
        )}

        {/* Convert Button */}
        {images.length > 0 && (
          <button
            onClick={convertToPDF}
            className="
              w-full py-3 rounded-lg
              bg-indigo-600 text-white font-semibold
              hover:bg-indigo-700 hover:scale-[1.03]
              active:scale-95 transition-all duration-200
              shadow-md shadow-indigo-500/40
            "
          >
            Convert to PDF
          </button>
        )}
      </div>
    </div>
  );
}

