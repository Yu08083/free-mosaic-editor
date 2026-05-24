// js/export/demo.js — generate a procedural demo image (no network needed)
export function loadDemo() {
  return new Promise(resolve => {
    const c = document.createElement('canvas');
    c.width = 1280;
    c.height = 720;
    const cc = c.getContext('2d');

    // gradient background
    const g = cc.createLinearGradient(0, 0, 1280, 720);
    g.addColorStop(0, '#1d2b53');
    g.addColorStop(0.5, '#7e2553');
    g.addColorStop(1, '#ff004d');
    cc.fillStyle = g;
    cc.fillRect(0, 0, 1280, 720);

    // grid
    cc.strokeStyle = 'rgba(255,255,255,.1)';
    cc.lineWidth = 1;
    for (let x = 0; x < 1280; x += 40) {
      cc.beginPath(); cc.moveTo(x, 0); cc.lineTo(x, 720); cc.stroke();
    }
    for (let y = 0; y < 720; y += 40) {
      cc.beginPath(); cc.moveTo(0, y); cc.lineTo(1280, y); cc.stroke();
    }

    // three fake faces
    for (let i = 0; i < 3; i++) {
      const x = 240 + i * 340, y = 360, r = 90;
      cc.fillStyle = '#fde'; cc.beginPath(); cc.arc(x, y, r, 0, Math.PI * 2); cc.fill();
      cc.fillStyle = '#222';
      cc.beginPath(); cc.arc(x - 30, y - 15, 9, 0, Math.PI * 2);
      cc.arc(x + 30, y - 15, 9, 0, Math.PI * 2); cc.fill();
      cc.beginPath(); cc.arc(x, y + 25, 28, 0, Math.PI);
      cc.lineWidth = 4; cc.strokeStyle = '#222'; cc.stroke();
    }

    // titles
    cc.fillStyle = '#fff';
    cc.font = 'bold 56px Manrope, sans-serif';
    cc.fillText('DEMO SAMPLE', 360, 110);
    cc.font = '20px JetBrains Mono, monospace';
    cc.fillStyle = 'rgba(255,255,255,.85)';
    cc.fillText('Drag a rectangle over each face to mosaic them →', 280, 680);

    c.toBlob(b => {
      resolve(new File([b], 'demo.png', { type: 'image/png' }));
    }, 'image/png');
  });
}
