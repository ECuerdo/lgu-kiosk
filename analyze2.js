import fs from 'node:fs';

try {
  const kioskCode = fs.readFileSync('c:/Users/Eulysis/Documents/lgu-kiosk/src/app/modules/building-permit/page.tsx', 'utf8');
  const lines = kioskCode.split('\n');
  const qrLines = [];
  
  for(let i=0; i<lines.length; i++) {
    const l = lines[i];
    if (l.includes('QRCode') || l.includes('Handoff') || l.includes('supabase') || l.includes('QR')) {
      qrLines.push(`${i+1}: ${l}`);
      // get 5 lines context around it
      for(let j=Math.max(0, i-2); j<=Math.min(lines.length-1, i+15); j++) {
        qrLines.push(`  ${j+1}: ${lines[j]}`);
      }
      qrLines.push('---');
    }
  }
  
  fs.writeFileSync('c:/Users/Eulysis/Documents/lgu-kiosk/qr_analysis.txt', qrLines.join('\n'));
} catch (err) {
  fs.writeFileSync('c:/Users/Eulysis/Documents/lgu-kiosk/qr_analysis_error.txt', err.toString());
}
