export async function extractPdfText(arrayBuffer) {
  if (typeof window === "undefined") return "";

  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");

    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      disableWorker: true, 
      useSystemFonts: true,
      isEvalSupported: false,
    }).promise;

    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      const strings = content.items.map((item) => item.str);
      fullText += strings.join(" ") + "\n\n";
    }

    return fullText;
  } catch (err) {
    console.error("❌ PDF extraction internal error:", err);

 
    return "__PDF_EXTRACTION_FAILED__";
  }
}