import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export async function exportToPDF(contentElementId: string, filename: string = 'ai-verse-export.pdf') {
  const element = document.getElementById(contentElementId);
  if (!element) return;

  try {
    const canvas = await html2canvas(element, { 
      backgroundColor: '#000000', 
      scale: 2,
      useCORS: true // Allow images like Pollinations to be captured
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });
    
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(filename);
  } catch(e) {
    console.error("PDF Export failed", e);
  }
}

export function exportToMarkdown(text: string, filename: string = 'ai-verse-notes.md') {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
