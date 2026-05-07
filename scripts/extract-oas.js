const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const BASES_DIR = path.resolve(__dirname, '..', 'data', 'mineduc', 'bases-curriculares');

async function extractText(pdfPath, startPage, endPage) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  let fullText = '';
  const end = Math.min(endPage || doc.numPages, doc.numPages);

  for (let i = startPage; i <= end; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    fullText += strings.join(' ') + '\n\n';
  }
  return fullText;
}

async function main() {
  const args = process.argv.slice(2);
  const pdfFile = args[0];
  const start = parseInt(args[1]) || 1;
  const end = parseInt(args[2]) || 0;
  const search = args[3] || '';

  if (!pdfFile) {
    // Just get page count
    const files = [
      path.join(BASES_DIR, 'Bases Curriculares 1° a 6° básico.pdf'),
      path.join(BASES_DIR, 'Bases Curriculares 7° a 2° medio.pdf'),
      path.join(BASES_DIR, 'Bases curriculares de la educación parvularia..pdf')
    ];
    for (const f of files) {
      try {
        const data = new Uint8Array(fs.readFileSync(f));
        const doc = await pdfjsLib.getDocument({ data }).promise;
        console.log(f + ': ' + doc.numPages + ' pages');
      } catch(e) { console.log(f + ': ERROR ' + e.message); }
    }
    return;
  }

  const text = await extractText(pdfFile, start, end);

  if (search) {
    // Find occurrences of search term and show context
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      if (line.toLowerCase().includes(search.toLowerCase())) {
        console.log(`[LINE ${i}] ${line.substring(0, 200)}`);
      }
    });
  } else {
    console.log(text);
  }
}

main().catch(e => console.error(e.message));
