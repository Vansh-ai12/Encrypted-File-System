"use client";

import React, { useRef, useState, useEffect } from "react";
import Logo from "@/Components/Logo";
import ImageResizerButton from "@/Components/ImageResizerButton";

// ImageResizerFull_Optimized.jsx
// Modern UI (glass/gradient), precise target-size compression for JPG/WEBP.
// Strategy:
// 1. Try binary-search quality for requested dimensions.
// 2. If lowest quality still too big for very small targets, progressively downscale
//    the image and retry. This allows hitting very small sizes (e.g. 4 KB).
// 3. If user requests PNG and target KB > 0, PNG is auto-converted to JPEG.

export default function ImageResizerFullOptimized() {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const imgRef = useRef(null);

  const [fileUrl, setFileUrl] = useState(null);
  const [imgObj, setImgObj] = useState(null);

  // Dimensions
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [keepAspect, setKeepAspect] = useState(true);
  const aspectRef = useRef(1);

  // Pixel controls
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);

  // Export options
  const [format, setFormat] = useState("image/webp"); // default modern
  const [targetKB, setTargetKB] = useState(0);
  const [qualityPreview, setQualityPreview] = useState(0.92);

  // UI state
  const [processing, setProcessing] = useState(false);
  const [lastGeneratedSizeKB, setLastGeneratedSizeKB] = useState(null);
  const [statusText, setStatusText] = useState("");

  // Helpers
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const formatKB = (n) => (n == null ? "—" : `${n} KB`);

  // File handling
  const openFile = () => fileInputRef.current?.click();

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setFileUrl(url);

    const image = new Image();
    image.src = url;
    image.onload = () => {
      imgRef.current = image;
      setImgObj(image);
      setWidth(image.width);
      setHeight(image.height);
      aspectRef.current = image.width / image.height || 1;
      setLastGeneratedSizeKB(null);
    };
  };

  // Pixel processing (same as your original but slightly optimized)
  const processPixelsOnCanvas = (ctx, w, h) => {
    try {
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      const b = brightness / 100;
      const c = contrast / 100;
      const s = saturation / 100;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let bl = data[i + 2];

        r *= b; g *= b; bl *= b;

        r = (r - 128) * c + 128;
        g = (g - 128) * c + 128;
        bl = (bl - 128) * c + 128;

        const avg = (r + g + bl) / 3;
        r = avg + (r - avg) * s;
        g = avg + (g - avg) * s;
        bl = avg + (bl - avg) * s;

        data[i] = clamp(Math.round(r), 0, 255);
        data[i + 1] = clamp(Math.round(g), 0, 255);
        data[i + 2] = clamp(Math.round(bl), 0, 255);
      }

      ctx.putImageData(imgData, 0, 0);
    } catch (err) {
      // getImageData might throw for cross-origin images - fallback: skip pixel processing
      // (in practice, object URLs should be same-origin)
      console.warn("processPixelsOnCanvas failed:", err);
    }
  };

  // canvas -> blob helper
  const canvasToBlob = (canvas, mime, quality) =>
    new Promise((resolve) => canvas.toBlob((b) => resolve(b), mime, quality));

  // Core compression routine:
  // 1) binary search on quality within [minQ, maxQ]
  // 2) if even at minQ size > target -> downscale image by scaleFactor and retry
  // 3) stop when within tolerance or min dimension reached
  const compressToTargetExact = async (drawFn, mime, targetKB, opts = {}) => {
    const { minQuality = 0.02, maxQuality = 0.99, maxIterations = 20, toleranceKB = 0.6, minDim = 8 } = opts;

    const canvas = canvasRef.current;

    // If PNG and targetKB > 0 -> convert to jpeg (or webp if requested)
    if (mime === "image/png" && targetKB > 0) mime = "image/jpeg";

    // initial dims
    let currW = canvas.width;
    let currH = canvas.height;

    // allow progressive downscaling until we can fit target
    let bestBlob = null;
    let bestDiff = Infinity;

    // outer loop reduces dimensions if quality can't reach size
    while (currW >= minDim && currH >= minDim) {
      // draw image at current dims and apply pixels
      canvas.width = Math.max(1, Math.round(currW));
      canvas.height = Math.max(1, Math.round(currH));
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      await drawFn(ctx, canvas.width, canvas.height);
      processPixelsOnCanvas(ctx, canvas.width, canvas.height);

      // binary search on quality
      let low = minQuality;
      let high = maxQuality;

      for (let iter = 0; iter < maxIterations; iter++) {
        const q = (low + high) / 2;
        const blob = await canvasToBlob(canvas, mime, q);
        if (!blob) break;
        const kb = blob.size / 1024;
        const diff = Math.abs(kb - targetKB);

        if (diff < bestDiff) {
          bestDiff = diff;
          bestBlob = blob;
        }

        // if good enough
        if (diff <= toleranceKB) return { blob, kb, quality: q, width: canvas.width, height: canvas.height };

        if (kb > targetKB) {
          // too big -> reduce quality
          high = q;
        } else {
          // too small -> increase quality
          low = q;
        }

        // if range is tiny, break
        if (Math.abs(high - low) < 0.001) break;
      }

      // after trying all qualities at these dimensions, check if bestBlob is small enough
      if (bestBlob && bestBlob.size / 1024 <= targetKB + Math.max(1, Math.round(targetKB * 0.02))) {
        return { blob: bestBlob, kb: Math.round(bestBlob.size / 1024), quality: null, width: canvas.width, height: canvas.height };
      }

      // otherwise downscale by 0.85 and retry
      currW = Math.floor(currW * 0.85);
      currH = Math.floor(currH * 0.85);
    }

    // fallback: return the best found blob
    if (bestBlob) return { blob: bestBlob, kb: Math.round(bestBlob.size / 1024), quality: null, width: canvas.width, height: canvas.height };

    // last resort: produce blob at preview quality
    const finalBlob = await canvasToBlob(canvas, mime, qualityPreview);
    return { blob: finalBlob, kb: Math.round(finalBlob.size / 1024), quality: qualityPreview, width: canvas.width, height: canvas.height };
  };

  // draw function used by compression routine
  const drawImageToCanvas = async (ctx, w, h) => {
    // Use drawImage with smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(imgRef.current, 0, 0, w, h);
  };

  // Main generate + download flow
  const generateAndDownload = async () => {
    if (!imgObj) return;
    setProcessing(true);
    setStatusText("Preparing...");

    const canvas = canvasRef.current;
    // ensure base dims reflect user's request
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));

    // If user gave a target and chose PNG, we'll auto-switch to webp/jpeg
    let chosenMime = format;
    if (chosenMime === "image/png" && targetKB > 0) {
      // prefer webp if browser supports it
      chosenMime = "image/webp";
    }

    // If no target requested -> simple save using preview quality
    if (!targetKB || targetKB <= 0) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      await drawImageToCanvas(ctx, canvas.width, canvas.height);
      processPixelsOnCanvas(ctx, canvas.width, canvas.height);

      const blob = await canvasToBlob(canvas, chosenMime, qualityPreview);
      if (blob) setLastGeneratedSizeKB(Math.round(blob.size / 1024));
      downloadBlob(blob, chosenMime);
      setProcessing(false);
      setStatusText("Done");
      return;
    }

    // With a target: use compressToTargetExact
    setStatusText("Compressing to target size — this may take a few moments...");
    const result = await compressToTargetExact(async (ctx, w, h) => {
      // draw function passed to the compressor
      await drawImageToCanvas(ctx, w, h);
    }, chosenMime, targetKB, { minQuality: 0.01, maxQuality: 0.99, maxIterations: 22, toleranceKB: Math.max(0.4, Math.round(targetKB * 0.006)) });

    if (result && result.blob) {
      setLastGeneratedSizeKB(Math.round(result.blob.size / 1024));
      downloadBlob(result.blob, chosenMime);
      setStatusText(`Saved ~${Math.round(result.blob.size / 1024)} KB (${result.width}×${result.height})`);
    } else {
      setStatusText("Failed to generate — falling back to preview quality.");
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      await drawImageToCanvas(ctx, canvas.width, canvas.height);
      processPixelsOnCanvas(ctx, canvas.width, canvas.height);
      const blob = await canvasToBlob(canvas, chosenMime, qualityPreview);
      if (blob) {
        setLastGeneratedSizeKB(Math.round(blob.size / 1024));
        downloadBlob(blob, chosenMime);
      }
    }

    setProcessing(false);
  };

  const downloadBlob = (blob, mime) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    a.download = `image-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Aspect handlers
  const onChangeWidth = (v) => {
    const val = Number(v) || 0;
    setWidth(val);
    if (keepAspect && imgRef.current) {
      setHeight(Math.round(val / (aspectRef.current || 1)));
    }
  };

  const onChangeHeight = (v) => {
    const val = Number(v) || 0;
    setHeight(val);
    if (keepAspect && imgRef.current) {
      setWidth(Math.round(val * (aspectRef.current || 1)));
    }
  };

  // live preview size estimate (non-blocking)
  useEffect(() => {
    let mounted = true;
    const updatePreview = async () => {
      if (!imgObj) return;
      const canvas = canvasRef.current;
      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(height));
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(imgObj, 0, 0, canvas.width, canvas.height);
      processPixelsOnCanvas(ctx, canvas.width, canvas.height);
      try {
        const blob = await canvasToBlob(canvas, format === "image/png" && targetKB > 0 ? "image/webp" : format, qualityPreview);
        if (!mounted) return;
        setLastGeneratedSizeKB(Math.round(blob.size / 1024));
      } catch (e) {
        // ignore
      }
    };

    const t = setTimeout(updatePreview, 300);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [width, height, brightness, contrast, saturation, format, qualityPreview, imgObj, targetKB]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="w-full py-4 px-6 sticky top-0 z-40 backdrop-blur bg-white/40 border-b">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <div className="text-lg font-semibold">Image Resizer — Optimized</div>
          </div>

          <div className="text-sm text-slate-600">Precise target-size compression (JPG / WEBP) • Advanced UI</div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-12 gap-6">
        {/* Left: Controls */}
        <div className="col-span-5 bg-white/60 backdrop-blur rounded-2xl p-6 shadow-lg border">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

          <div className="flex gap-3 items-center">
            <ImageResizerButton label="Upload Image" onClick={openFile} />
            {imgObj && (
              <div className="text-sm text-slate-600">Original: {imgObj.width}×{imgObj.height}</div>
            )}
          </div>

          {fileUrl && (
            <div className="mt-4 p-3 rounded-lg border bg-white">
              <img src={fileUrl} alt="preview" className="w-full object-contain rounded" />
            </div>
          )}

          {imgObj && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Width (px)</label>
                  <input className="mt-2 block w-full px-3 py-2 border rounded-md" type="number" value={width} onChange={(e) => onChangeWidth(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Height (px)</label>
                  <input className="mt-2 block w-full px-3 py-2 border rounded-md" type="number" value={height} onChange={(e) => onChangeHeight(e.target.value)} />
                </div>
              </div>

              <label className="inline-flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4" checked={keepAspect} onChange={() => setKeepAspect((s) => !s)} />
                <span className="text-sm font-medium">Keep aspect ratio</span>
              </label>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Brightness: {brightness}%</label>
                  <input type="range" min="50" max="150" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Contrast: {contrast}%</label>
                  <input type="range" min="50" max="150" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Saturation: {saturation}%</label>
                  <input type="range" min="0" max="200" value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} className="w-full mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Format</label>
                  <select value={format} onChange={(e) => setFormat(e.target.value)} className="mt-2 block w-full px-3 py-2 border rounded-md">
                    <option value="image/webp">WEBP (recommended)</option>
                    <option value="image/jpeg">JPG (compatible)</option>
                    <option value="image/png">PNG (lossless)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Target size (KB)</label>
                  <input type="number" min="0" value={targetKB} onChange={(e) => setTargetKB(Number(e.target.value) || 0)} placeholder="0 = no target" className="mt-2 block w-full px-3 py-2 border rounded-md" />
                </div>
              </div>

              <div className="mt-2 flex items-center gap-3">
                <label className="text-sm font-medium">Preview Quality: {Math.round(qualityPreview * 100)}%</label>
                <input type="range" min="0.1" max="0.98" step="0.01" value={qualityPreview} onChange={(e) => setQualityPreview(Number(e.target.value))} className="w-48" />
              </div>

              <div className="mt-4 flex items-center gap-3">
                <ImageResizerButton label={processing ? "Processing..." : "Download"} onClick={generateAndDownload} disabled={processing} />
                <div className="text-sm text-slate-600">Estimated output: {formatKB(lastGeneratedSizeKB)}</div>
              </div>

              <div className="mt-3 text-xs text-slate-500">Status: {statusText || "Idle"}</div>
            </div>
          )}
        </div>

        {/* Right: Live preview & info */}
        <div className="col-span-7 rounded-2xl p-6 bg-white/60 backdrop-blur border shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold">Live Preview</h2>
              <div className="text-sm text-slate-600 mt-1">Shows how the exported image will look at requested size.</div>
            </div>

            <div className="text-right text-sm text-slate-600">Output: {formatKB(lastGeneratedSizeKB)}</div>
          </div>

          <div className="mt-4 h-[520px] rounded-lg overflow-hidden border bg-slate-50 flex items-center justify-center">
            {fileUrl ? (
              <img src={fileUrl} alt="live preview" className="max-h-full max-w-full object-contain" />
            ) : (
              <div className="text-slate-400">Upload an image to preview</div>
            )}
          </div>

          <div className="mt-4 text-sm text-slate-600">Tip: For very small targets (1–10 KB) the tool will lower quality <em>and</em> downscale the image to fit the size.</div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
