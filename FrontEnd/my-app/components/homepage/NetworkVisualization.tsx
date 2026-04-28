'use client';

import { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pulse: number;
  pulseSpeed: number;
}

export default function NetworkVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setSize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    setSize();

    const NODE_COUNT = Math.max(
      12,
      Math.floor((canvas.width * canvas.height) / 16000)
    );
    const MAX_DIST = 120;
    // Cyan palette matching the project
    const COLORS = ['#22d3ee', '#06b6d4', '#67e8f9', '#a5f3fc', '#0891b2'];

    const nodes: Node[] = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: 2 + Math.random() * 2.5,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.018 + Math.random() * 0.015,
    }));

    // Store colors separately so they don't reset each frame
    const nodeColors = nodes.map(
      () => COLORS[Math.floor(Math.random() * COLORS.length)]
    );

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Update
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        n.pulse += n.pulseSpeed;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      });

      // Edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.4;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Nodes
      nodes.forEach((n, i) => {
        const r = n.radius * (1 + 0.2 * Math.sin(n.pulse));
        const color = nodeColors[i];

        // Glow
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 4);
        grd.addColorStop(0, color + '99');
        grd.addColorStop(1, color + '00');
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 4, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      setSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="h-full w-full" />
      {/* Fade out bottom edge to blend with section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#071020] to-transparent" />
    </div>
  );
}
