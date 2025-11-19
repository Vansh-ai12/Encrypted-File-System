"use client";

import { useRef, useState } from "react";
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
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      {/* NAVBAR */}
      <header className="flex justify-between items-center px-10 py-6 bg-white/70 backdrop-blur-md border-b border-indigo-200 shadow-md">
        <Logo />

        <div className="flex items-center gap-4">
          <button
            className="
              px-5 py-2.5 rounded-xl
              bg-indigo-600 text-white font-semibold
              shadow-md shadow-indigo-500/30
              hover:bg-indigo-700 hover:shadow-indigo-400/40
              hover:scale-[1.03] active:scale-95
              transition-all duration-200 ease-out
              hover:cursor-pointer
            "
          >
            Image Resizer
          </button>

          <Profile />
        </div>
      </header>

      {/* PAGE HERO SECTION */}
      <section className="text-center mt-14 mb-10">
        <h1 className="text-4xl font-extrabold text-indigo-900 tracking-tight">
          Image to PDF Converter
        </h1>

        <p className="text-indigo-700/70 mt-2 text-lg">
          Upload your images and convert them into a clean, high-quality PDF.
        </p>
      </section>

      {/* MAIN CARD */}
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8 border border-indigo-100">
        <h2 className="text-2xl font-bold text-indigo-700 mb-6 text-center">
          Upload Images
        </h2>

        <input
          type="file"
          multiple
          accept="image/*"
          ref={fileInputRef}
          className="hidden"
          onChange={handleImageUpload}
        />

        {/* ACTION ROW */}
        <div className="flex justify-center gap-6 mb-6">
          <button
            onClick={openFilePicker}
            className="
              px-6 py-3 rounded-xl bg-indigo-500 text-white font-medium
              shadow-md shadow-indigo-300
              hover:bg-indigo-600 hover:scale-[1.03]
              active:scale-95 transition-all duration-200
              hover:cursor-pointer
            "
          >
            Upload Images
          </button>

          {images.length > 0 && (
            <button
              onClick={() => setImages([])}
              className="
                px-6 py-3 rounded-xl bg-red-500 text-white font-medium
                shadow-md shadow-red-300
                hover:bg-red-600 hover:scale-[1.03]
                active:scale-95 transition-all duration-200
                hover:cursor-pointer
              "
            >
              Clear All
            </button>
          )}
        </div>

        {/* Preview Grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {images.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt="Preview"
                className="rounded-xl shadow-lg border border-indigo-100"
              />
            ))}
          </div>
        )}

        {/* Convert Button */}
        {images.length > 0 && (
          <button
            onClick={convertToPDF}
            className="
              w-full py-3 rounded-xl
              bg-indigo-600 text-white font-semibold text-lg
              shadow-lg shadow-indigo-600/40
              hover:bg-indigo-700 hover:shadow-indigo-700/40
              hover:scale-[1.03] active:scale-95
              transition-all duration-200
              hover:cursor-pointer
            "
          >
            Convert to PDF
          </button>
        )}
      </div>

      {/* FOOTER BUTTON */}
      <div className="flex justify-center mt-14 mb-20">
        <button
          className="
            px-8 py-3 rounded-2xl
            bg-indigo-700 text-white font-semibold text-lg
            shadow-xl shadow-indigo-600/40
            hover:bg-indigo-800 hover:scale-[1.04]
            active:scale-95 backdrop-blur-md
            transition-all duration-200
            hover:cursor-pointer
          "
        >
          OdoBoard
        </button>
      </div>
    </div>
  );
}
