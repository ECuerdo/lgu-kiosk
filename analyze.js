import fs from 'node:fs';
const kioskCode = fs.readFileSync('c:/Users/Eulysis/Documents/lgu-kiosk/src/app/modules/building-permit/page.tsx', 'utf8');

const lines = kioskCode.split('\n');
const results = [];
lines.forEach((l, i) => {
  if (l.includes('QRCode') || l.includes('qr') || l.includes('QR') || l.includes('Upload') || l.includes('supabase')) {
    results.push(`${i+1}: ${l}`);
  }
});

fs.writeFileSync('c:/Users/Eulysis/Documents/lgu-kiosk/analysis.txt', results.join('\n'));
console.log("Analysis done");
