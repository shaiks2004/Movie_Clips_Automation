// Dynamic Film dust and scratches overlay animation loop
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.createElement('canvas');
  canvas.className = 'grain-canvas';
  document.body.appendChild(canvas);
  
  const ctx = canvas.getContext('2d');
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();
  
  function animateFilm() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. Draw dust specks
    const numDust = Math.floor(Math.random() * 5);
    ctx.fillStyle = 'rgba(243, 234, 217, 0.25)';
    for(let i=0; i<numDust; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = Math.random() * 1.1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2*Math.PI);
      ctx.fill();
    }
    
    // 2. Draw vertical scratches
    if(Math.random() < 0.1) {
      ctx.strokeStyle = 'rgba(243, 234, 217, 0.05)';
      ctx.lineWidth = Math.random() * 0.9;
      const x = Math.random() * canvas.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (Math.random() * 10 - 5), canvas.height);
      ctx.stroke();
    }
    
    // 3. Draw random hair/squiggle
    if(Math.random() < 0.015) {
      ctx.strokeStyle = 'rgba(243, 234, 217, 0.12)';
      ctx.lineWidth = 0.3 + Math.random() * 0.4;
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(
        x + Math.random()*20 - 10, y + Math.random()*20 - 10,
        x + Math.random()*20 - 10, y + Math.random()*20 - 10,
        x + Math.random()*40 - 20, y + Math.random()*40 - 20
      );
      ctx.stroke();
    }
    
    requestAnimationFrame(animateFilm);
  }
  animateFilm();
});
