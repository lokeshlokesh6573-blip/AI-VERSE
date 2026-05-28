import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Use CDN for the worker to avoid complex Webpack/Next.js config errors with PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export async function parseFileText(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'txt' || extension === 'csv' || extension === 'json' || extension === 'md') {
    return await file.text();
  }

  if (extension === 'docx') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  }

  if (extension === 'pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    // Limiting to up to 10 pages to ensure it processes quickly on Vercel Edge functions & Browser memory
    const numPages = Math.min(pdf.numPages, 10);
    
    for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
    }
    
    if (pdf.numPages > 10) {
       fullText += '\n\n[WARNING: Document truncated to first 10 pages due to system limits]';
    }
    
    return fullText.trim();
  }

  throw new Error('Unsupported file type');
}

export async function parseFileBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

