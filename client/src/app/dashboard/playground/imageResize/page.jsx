"use client";
import React, { useRef, useState } from "react";
import ImageResizerButton from "@/Components/ImageResizerButton";
import Logo from "@/Components/Logo";

export default function ImageResizer() {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [img, setImg] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [keepAspect, setKeepAspect] = useState(true);

  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);

  const aspect = useRef(null);

  /** ---------------------------------------------------
   *  HANDLE FILE UPLOAD
   --------------------------------------------------- */
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    const image = new Image();
    image.src = url;

    image.onload = () => {
      setImg(image);
      setWidth(image.width);
      setHeight(image.height);
      aspect.current = image.width / image.height;
    };
  };

  const openFileDialog = () => fileInputRef.current?.click();

  /** ---------------------------------------------------
   *  DIMENSION CONTROLS
   --------------------------------------------------- */
  const changeWidth = (v) => {
    setWidth(v);
    if (keepAspect && img) {
      setHeight(Math.round(v / aspect.current));
    }
  };

  const changeHeight = (v) => {
    setHeight(v);
    if (keepAspect && img) {
      setWidth(Math.round(v * aspect.current));
    }
  };

  /** ---------------------------------------------------
   *  PIXEL PROCESSING (Brightness, Contrast, Saturation)
   --------------------------------------------------- */
  const processPixels = (ctx, w, h) => {
    let imageData = ctx.getImageData(0, 0, w, h);
    let data = imageData.data;

    const b = brightness / 100;
    const c = contrast / 100;
    const s = saturation / 100;

    for (let i = 0; i < data.length; i += 4) {
      // Extract RGB
      let r = data[i];
      let g = data[i + 1];
      let bpx = data[i + 2];

      // BRIGHTNESS
      r *= b;
      g *= b;
      bpx *= b;

      // CONTRAST (centered around 128)
      r = (r - 128) * c + 128;
      g = (g - 128) * c + 128;
      bpx = (bpx - 128) * c + 128;

      // SATURATION (simple method)
      const avg = (r + g + bpx) / 3;
      r = avg + (r - avg) * s;
      g = avg + (g - avg) * s;
      bpx = avg + (bpx - avg) * s;

      // Clamp
      data[i] = Math.min(255, Math.max(0, r));
      data[i + 1] = Math.min(255, Math.max(0, g));
      data[i + 2] = Math.min(255, Math.max(0, bpx));
    }

    ctx.putImageData(imageData, 0, 0);
  };

  /** ---------------------------------------------------
   *  RESIZE + APPLY PIXEL EFFECTS + DOWNLOAD
   --------------------------------------------------- */
  const resizeImage = () => {
    if (!img) return;

    const canvas = canvasRef.current;
    canvas.width = parseInt(width);
    canvas.height = parseInt(height);

    const ctx = canvas.getContext("2d");

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Pixel effects
    processPixels(ctx, canvas.width, canvas.height);

    const link = document.createElement("a");
    link.download = "resized-image.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🔵 TOP NAVBAR */}
      <div className="w-full bg-white shadow-md py-3 px-6 flex items-center justify-between sticky top-0 z-30">
        {/* LEFT — YOUR <Logo /> */}
        <div className="flex items-center gap-3 p-6">
          <Logo />
        </div>

        {/* CENTER — TITLE */}
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent tracking-wide drop-shadow-sm">
          Image Resizer
        </h1>

        {/* RIGHT — Empty for balance */}
        <div className="w-10"></div>
      </div>

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Hidden input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />

        {/* Upload Button */}
        <ImageResizerButton label="Upload Image" onClick={openFileDialog} />

        {/* Preview */}
        {previewUrl && (
          <img
            src={previewUrl}
            alt="preview"
            className="w-full rounded-xl shadow-xl mt-3 border"
          />
        )}

        {/* CONTROLS BOX */}
        {img && (
          <div className="bg-white p-6 rounded-xl shadow-lg space-y-5 border">
            {/* 🔹 Dimensions */}
            <div className="grid grid-cols-2 gap-4">
              {/* Width */}
              <div className="flex flex-col">
                <label className="font-medium text-gray-700 mb-1">
                  Width (px)
                </label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => changeWidth(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                />
              </div>

              {/* Height */}
              <div className="flex flex-col">
                <label className="font-medium text-gray-700 mb-1">
                  Height (px)
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => changeHeight(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            {/* Keep Aspect */}
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={keepAspect}
                onChange={() => setKeepAspect(!keepAspect)}
              />
              <span className="font-medium">Keep Aspect Ratio</span>
            </label>

            {/* -------- PIXEL CONTROLS -------- */}
            <div className="space-y-4">
              {/* Brightness */}
              <div>
                <label className="font-medium text-gray-700">
                  Brightness: {brightness}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={brightness}
                  onChange={(e) => setBrightness(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Contrast */}
              <div>
                <label className="font-medium text-gray-700">
                  Contrast: {contrast}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={contrast}
                  onChange={(e) => setContrast(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Saturation */}
              <div>
                <label className="font-medium text-gray-700">
                  Saturation: {saturation}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={saturation}
                  onChange={(e) => setSaturation(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            {/* Resize Button */}
            <ImageResizerButton
              label="Download Resized Image"
              onClick={resizeImage}
              className="mt-4"
            />
          </div>
        )}

        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden"></canvas>
      </div>
    </div>
  );
}
