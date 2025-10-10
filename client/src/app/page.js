"use client";

export default function Home() {
  function handleFileDownload() {
    const fileUrl = "/Syllabus_CSET243-2024-28.pdf"; 
    const fileName = "Syllabus_CSET243-2024-28.pdf";

    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div>
      <h1>File Encryption System</h1>
      <button onClick={handleFileDownload} class=" bg-orange-400 border-1 p-4 hover:cursor-pointer hover:bg-amber-300 rounded-4xl">Download File</button>
    </div>
  );
}
