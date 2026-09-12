import { toPng } from 'html-to-image';

export function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportSchedule(element: HTMLElement, month: string, format: 'png' | 'pdf') {
  await document.fonts.ready;
  const dataUrl = await toPng(element, {
    pixelRatio: 2.5, backgroundColor: '#FFFFFF', cacheBust: true,
    width: element.offsetWidth, height: element.offsetHeight,
    style: { transform: 'none', margin: '0' }
  });
  if (format === 'png') {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `Escala-${month}.png`;
    link.click();
  } else {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
    pdf.addImage(dataUrl, 'PNG', 0, 0, 297, 210, undefined, 'FAST');
    pdf.save(`Escala-${month}.pdf`);
  }
}
