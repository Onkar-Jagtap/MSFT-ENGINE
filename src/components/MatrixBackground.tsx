import React, { useEffect, useRef } from 'react';

export function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const characters = '01ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@&%*'; // More characters for hacking feel
    const fontSize = 12;
    const columns = width / fontSize;
    const drops: number[] = [];

    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -height;
    }

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; // Slightly faster trail
      ctx.fillRect(0, 0, width, height);

      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = characters.charAt(Math.floor(Math.random() * characters.length));
        
        // Randomly make some characters brighter
        if (Math.random() > 0.98) {
          ctx.fillStyle = 'rgba(0, 243, 255, 1)'; // Full opacity for bright bits
          ctx.shadowBlur = 12;
          ctx.shadowColor = 'rgba(0, 243, 255, 1)';
        } else {
          ctx.fillStyle = 'rgba(0, 243, 255, 0.25)'; // Slightly higher base opacity
          ctx.shadowBlur = 0;
        }

        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[-1] opacity-30"
    />
  );
}
