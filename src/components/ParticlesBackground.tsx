import React, { useEffect, useRef } from 'react';

interface ParticlesBackgroundProps {
  theme: 'cosmos' | 'aurora' | 'ocean' | 'forest' | 'minimal-dark';
  speedMultiplier?: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
  alpha: number;
  layer: 'deep-bg' | 'bg' | 'mid-bg' | 'mid' | 'fg';
  parallaxFactor: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

export const ParticlesBackground: React.FC<ParticlesBackgroundProps> = ({ 
  theme, 
  speedMultiplier = 1 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 }); // Lerped offsets

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let stars: Star[] = [];

    // Support high-DPI / Retina displays for sharp rendering
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Track mouse for parallax with smooth lerp
    const handleMouseMove = (e: MouseEvent) => {
      const midX = window.innerWidth / 2;
      const midY = window.innerHeight / 2;
      mouseRef.current = {
        x: (e.clientX - midX) / midX * 45, // Max offset
        y: (e.clientY - midY) / midY * 45,
      };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Get color theme mappings for stars
    const getStarColor = (layer: 'deep-bg' | 'bg' | 'mid-bg' | 'mid' | 'fg') => {
      if (theme === 'minimal-dark') {
        return 'rgba(255, 255, 255, ';
      }

      const cosmosColors = ['rgba(168, 85, 247, ', 'rgba(192, 132, 252, ', 'rgba(129, 140, 248, ']; // purple, violet, indigo
      const auroraColors = ['rgba(85, 239, 196, ', 'rgba(129, 236, 236, ', 'rgba(81, 203, 158, ']; // mint, teal, green
      const oceanColors = ['rgba(56, 189, 248, ', 'rgba(6, 182, 212, ', 'rgba(147, 197, 253, ']; // sky, cyan, blue
      const forestColors = ['rgba(46, 213, 115, ', 'rgba(241, 196, 15, ', 'rgba(39, 174, 96, ']; // emerald, gold, green

      let colors = cosmosColors;
      if (theme === 'aurora') colors = auroraColors;
      if (theme === 'ocean') colors = oceanColors;
      if (theme === 'forest') colors = forestColors;

      if (layer === 'deep-bg' || layer === 'bg') {
        return Math.random() > 0.65 ? 'rgba(240, 244, 255, ' : colors[Math.floor(Math.random() * colors.length)];
      }
      return colors[Math.floor(Math.random() * colors.length)];
    };

    const createStar = (layer: 'deep-bg' | 'bg' | 'mid-bg' | 'mid' | 'fg', isInitial = false): Star => {
      let size = 0.5;
      let speedY = -0.02;
      let maxAlpha = 0.3;
      let parallaxFactor = 0.1;
      let twinkleSpeed = 0.005 + Math.random() * 0.01;

      // Sized larger to avoid anti-aliasing fadeout and ensure perfect visibility
      if (layer === 'deep-bg') {
        size = Math.random() * 0.3 + 0.5; // 0.5px - 0.8px
        speedY = -(Math.random() * 0.008 + 0.003);
        maxAlpha = Math.random() * 0.15 + 0.15; // Raised opacity
        parallaxFactor = 0.035;
        twinkleSpeed = 0.002 + Math.random() * 0.005;
      } else if (layer === 'bg') {
        size = Math.random() * 0.4 + 0.8; // 0.8px - 1.2px
        speedY = -(Math.random() * 0.018 + 0.008);
        maxAlpha = Math.random() * 0.2 + 0.2; // Raised opacity
        parallaxFactor = 0.095;
        twinkleSpeed = 0.006 + Math.random() * 0.01;
      } else if (layer === 'mid-bg') {
        size = Math.random() * 0.4 + 1.2; // 1.2px - 1.6px
        speedY = -(Math.random() * 0.026 + 0.012);
        maxAlpha = Math.random() * 0.3 + 0.25; // Raised opacity
        parallaxFactor = 0.22;
        twinkleSpeed = 0.01 + Math.random() * 0.015;
      } else if (layer === 'mid') {
        size = Math.random() * 0.6 + 1.6; // 1.6px - 2.2px
        speedY = -(Math.random() * 0.045 + 0.02);
        maxAlpha = Math.random() * 0.35 + 0.35; // Raised opacity
        parallaxFactor = 0.42;
        twinkleSpeed = 0.018 + Math.random() * 0.022;
      } else if (layer === 'fg') {
        size = Math.random() * 1.0 + 2.2; // 2.2px - 3.2px
        speedY = -(Math.random() * 0.075 + 0.035);
        maxAlpha = Math.random() * 0.4 + 0.45; // Raised opacity
        parallaxFactor = 0.75;
        twinkleSpeed = 0.028 + Math.random() * 0.032;
      }

      return {
        x: Math.random() * window.innerWidth,
        y: isInitial ? Math.random() * window.innerHeight : window.innerHeight + 10,
        size,
        speedX: (Math.random() - 0.5) * 0.03 * speedMultiplier,
        speedY: speedY * speedMultiplier,
        color: getStarColor(layer),
        alpha: maxAlpha,
        layer,
        parallaxFactor,
        twinkleSpeed,
        twinkleOffset: Math.random() * Math.PI * 2
      };
    };

    // Actual star counts (Total = 690 stars)
    const starCounts: Record<Star['layer'], number> = {
      'deep-bg': 250,
      'bg': 200,
      'mid-bg': 120,
      'mid': 80,
      'fg': 40
    };

    (Object.keys(starCounts) as Star['layer'][]).forEach(layer => {
      const count = starCounts[layer];
      for (let i = 0; i < count; i++) {
        stars.push(createStar(layer, true));
      }
    });

    let time = 0;
    const render = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      time += 0.01;

      // 1. Lerp parallax offsets with soft inertia
      offsetRef.current.x += (mouseRef.current.x - offsetRef.current.x) * 0.045;
      offsetRef.current.y += (mouseRef.current.y - offsetRef.current.y) * 0.045;

      // 2. Ambient background glow gradient
      drawBackgroundGlow(ctx, w, h, theme);

      // 3. Render all stars
      stars.forEach((star, idx) => {
        // Vertical drift
        star.y += star.speedY;
        star.x += star.speedX + Math.sin(time * 0.15 + star.twinkleOffset) * 0.015; // Soft waving

        // Recycle star if off screen
        if (star.y < -15) {
          stars[idx] = createStar(star.layer, false);
          return;
        }

        // Horizontal boundary wrap
        if (star.x < -20) star.x = w + 20;
        if (star.x > w + 20) star.x = -20;

        // Apply parallax offsets
        const drawX = star.x - offsetRef.current.x * star.parallaxFactor;
        const drawY = star.y - offsetRef.current.y * star.parallaxFactor;

        // Twinkle calculation
        const twinkle = Math.sin(time * star.twinkleSpeed * 105 + star.twinkleOffset);
        const opacityScale = 0.62 + twinkle * 0.38; // Soft twinkle range (from 24% to 100% brightness)
        const currentAlpha = star.alpha * opacityScale;

        // Draw star dot
        ctx.beginPath();
        ctx.arc(drawX, drawY, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `${star.color}${currentAlpha})`;

        // Premium glow layer for foreground or glowing midground stars
        if (theme !== 'minimal-dark' && (star.layer === 'fg' || (star.layer === 'mid' && Math.random() > 0.88))) {
          ctx.shadowBlur = star.size * 3.8;
          ctx.shadowColor = `${star.color}0.92)`;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme, speedMultiplier]);

  const drawBackgroundGlow = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    currentTheme: string
  ) => {
    ctx.shadowBlur = 0; 
    
    let color1 = 'rgba(0,0,0,0)';
    let color2 = 'rgba(0,0,0,0)';

    switch (currentTheme) {
      case 'cosmos':
        color1 = 'rgba(168, 85, 247, 0.055)'; // Deep purple nebula
        color2 = 'rgba(59, 130, 246, 0.025)'; // Blue cosmic gas
        break;
      case 'aurora':
        color1 = 'rgba(16, 185, 129, 0.04)'; // Green aurora sheet
        color2 = 'rgba(6, 182, 212, 0.025)'; // Cyan
        break;
      case 'ocean':
        color1 = 'rgba(14, 165, 233, 0.045)'; // Sky deep blue
        color2 = 'rgba(30, 58, 138, 0.03)'; // Dark ocean trench
        break;
      case 'forest':
        color1 = 'rgba(34, 197, 94, 0.03)'; // Mossy green glow
        color2 = 'rgba(234, 179, 8, 0.02)'; // Gold firefly glow
        break;
      case 'minimal-dark':
      default:
        return; // Absolute pure dark space
    }

    // Radial Gradient 1 (Top right)
    const grad1 = ctx.createRadialGradient(
      width * 0.72, height * 0.32, 0,
      width * 0.72, height * 0.32, Math.max(width, height) * 0.65
    );
    grad1.addColorStop(0, color1);
    grad1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, width, height);

    // Radial Gradient 2 (Bottom left)
    const grad2 = ctx.createRadialGradient(
      width * 0.22, height * 0.78, 0,
      width * 0.22, height * 0.78, Math.max(width, height) * 0.55
    );
    grad2.addColorStop(0, color2);
    grad2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, width, height);
  };

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none z-0" 
    />
  );
};
