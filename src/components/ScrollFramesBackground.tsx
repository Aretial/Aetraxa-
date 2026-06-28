import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export const ScrollFramesBackground = ({ 
  frameCount = 83,
  prefix = '/assets/Landing%20Scroll/Land-scroll%20(',
  suffix = ').webp',
  opacity = 0.85
}: { 
  frameCount?: number;
  prefix?: string;
  suffix?: string;
  opacity?: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [frames, setFrames] = useState<HTMLImageElement[]>([]);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const currentIndexRef = useRef(0);
  const canvasSizeRef = useRef({ width: 0, height: 0 });
  const [loadedCount, setLoadedCount] = useState(0);
  const [hasDrawnYet, setHasDrawnYet] = useState(false);

  // Smooth scroll interpolation references
  const targetProgressRef = useRef(0);
  const currentProgressRef = useRef(0);

  // Keep references to prefix and suffix so we don't recreate effects on change
  const prefixRef = useRef(prefix);
  const suffixRef = useRef(suffix);
  const frameCountRef = useRef(frameCount);
  
  // Track the absolute last successfully drawn image to guarantee fast fallback rendering
  const lastDrawnImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    // Start graceful fade out before loading next category
    setHasDrawnYet(false);
    lastDrawnImgRef.current = null;

    // Clear the canvas to avoid legacy image persistence during transition
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    // Update refs to latest values
    prefixRef.current = prefix;
    suffixRef.current = suffix;
    frameCountRef.current = frameCount;

    // Calculate matching initial scroll index based on mounting layout heights (robust on both window and main-content container)
    const mainContent = document.getElementById('main-content');
    
    const docScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const docMaxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

    const mainScrollY = mainContent ? mainContent.scrollTop : 0;
    const mainMaxScroll = mainContent ? Math.max(1, mainContent.scrollHeight - mainContent.clientHeight) : 1;

    let scrollY = docScrollY;
    let maxScroll = docMaxScroll;

    if (mainScrollY > 0) {
      scrollY = mainScrollY;
      maxScroll = mainMaxScroll;
    } else if (docScrollY > 0) {
      scrollY = docScrollY;
      maxScroll = docMaxScroll;
    } else {
      if (mainContent && mainContent.scrollHeight > mainContent.clientHeight) {
        maxScroll = mainMaxScroll;
      } else {
        maxScroll = docMaxScroll;
      }
    }

    const progress = Math.max(0, Math.min(1, scrollY / maxScroll));
    const initialIndex = Math.round(progress * (frameCount - 1));
    
    currentIndexRef.current = initialIndex;
    targetProgressRef.current = progress;
    currentProgressRef.current = progress;

    const loadedFrames: HTMLImageElement[] = new Array(frameCount);
    framesRef.current = loadedFrames;

    // Load active view index immediately as top priority
    priorityLoadWindow(initialIndex);

    // Staggered background loader starting outward from initialIndex
    let isMounted = true;
    const queue: number[] = [initialIndex];
    for (let i = 1; i < frameCount; i++) {
      if (initialIndex + i < frameCount) queue.push(initialIndex + i);
      if (initialIndex - i >= 0) queue.push(initialIndex - i);
    }

    let queueIdx = 0;
    const BATCH_SIZE = 5;
    const loadBatch = () => {
      if (!isMounted) return;
      let count = 0;
      while (queueIdx < queue.length && count < BATCH_SIZE) {
        const targetIdx = queue[queueIdx];
        if (!framesRef.current[targetIdx]) {
          loadFrame(targetIdx);
        }
        queueIdx++;
        count++;
      }
      if (queueIdx < queue.length) {
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(loadBatch, { timeout: 200 });
        } else {
          setTimeout(loadBatch, 32);
        }
      }
    };
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(loadBatch, { timeout: 200 });
    } else {
      setTimeout(loadBatch, 32);
    }

    setFrames(loadedFrames);
    return () => { 
      isMounted = false; 
    };
  }, [prefix, suffix, frameCount]);

  const drawFrameWithImage = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvasSizeRef.current.width;
    let height = canvasSizeRef.current.height;
    
    if (width === 0 || height === 0) {
      width = canvas.width;
      height = canvas.height;
    }
    if (width === 0 || height === 0) return;

    // Cover the canvas aspect ratio
    const canvasRatio = width / height;
    if (!img.width || !img.height) return;
    const imgRatio = img.width / img.height;
    
    let finalWidth, finalHeight, dx, dy;

    if (canvasRatio > imgRatio) {
        finalWidth = width;
        finalHeight = width / imgRatio;
        dx = 0;
        dy = (height - finalHeight) / 2;
    } else {
        finalWidth = height * imgRatio;
        finalHeight = height;
        dx = (width - finalWidth) / 2;
        dy = 0;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, dx, dy, finalWidth, finalHeight);
    setHasDrawnYet(true);
  };

  const drawFrame = (index: number) => {
    const img = framesRef.current[index];
    if (img && img.complete) {
      drawFrameWithImage(img);
      lastDrawnImgRef.current = img;
    } else if (lastDrawnImgRef.current) {
      // Direct high-performance O(1) render fallback to current visible trace
      drawFrameWithImage(lastDrawnImgRef.current);
    } else {
      // Spiral outward search ONLY if absolutely no frame has been drawn yet
      let closestImg = null;
      let left = index;
      let right = index;
      while (left >= 0 || right < frameCount) {
        if (left >= 0) {
          const f = framesRef.current[left];
          if (f && f.complete) {
            closestImg = f;
            break;
          }
          left--;
        }
        if (right < frameCount) {
          const f = framesRef.current[right];
          if (f && f.complete) {
            closestImg = f;
            break;
          }
          right++;
        }
      }
      if (closestImg) {
        drawFrameWithImage(closestImg);
        lastDrawnImgRef.current = closestImg;
      }
    }
  };

  // Helper to load a specific frame by index
  const loadFrame = (index: number) => {
    if (index < 0 || index >= frameCount) return;
    if (framesRef.current[index]) return; // already loading or loaded

    const img = new Image();
    img.src = `${prefixRef.current}${index + 1}${suffixRef.current}`;
    framesRef.current[index] = img; // store reference immediately to avoid double fetching

    img.onload = () => {
      setLoadedCount(prev => prev + 1);
      // Draw immediately if we are currently looking at this frame
      if (currentIndexRef.current === index) {
        drawFrame(index);
      }
    };

    img.onerror = () => {
      console.warn(`[ScrollFramesBackground] Failed to load frame ${index + 1}`);
      setLoadedCount(prev => prev + 1); // increment anyway to avoid blocking loader
    };
  };

  // Pre-load a window of frames dynamically centered around active position
  const priorityLoadWindow = (currentIndex: number) => {
    // Load current index, some preceding frames, and succeeding frames
    for (let offset = -4; offset <= 8; offset++) {
      const idx = currentIndex + offset;
      if (idx >= 0 && idx < frameCount) {
        loadFrame(idx);
      }
    }
  };

  useEffect(() => {
    // Resize Observer for the parent container element to handle layout changes flawlessly
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const width = Math.ceil(entry.contentRect.width || entry.target.getBoundingClientRect().width);
        const height = Math.ceil(entry.contentRect.height || entry.target.getBoundingClientRect().height);
        
        const canvas = canvasRef.current;
        if (canvas && width > 0 && height > 0) {
          canvas.width = width;
          canvas.height = height;
          canvasSizeRef.current = { width, height };
          drawFrame(currentIndexRef.current);
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [frameCount]);

  // Pre-loading cycle handled by unified lifecycle pre-loader above.

  // Smoother momentum-based scrolling loop using linear interpolation (LERP)
  useEffect(() => {
    let animFrameId: number;
    const mainContent = document.getElementById('main-content');

    const tick = () => {
      const target = targetProgressRef.current;
      const current = currentProgressRef.current;
      const diff = target - current;

      // Smooth interpolation ease
      const ease = 0.085;

      if (Math.abs(diff) > 0.0001) {
        currentProgressRef.current += diff * ease;
        const index = Math.min(
          frameCount - 1,
          Math.max(0, Math.round(currentProgressRef.current * (frameCount - 1)))
        );

        if (index !== currentIndexRef.current) {
          currentIndexRef.current = index;
          priorityLoadWindow(index); // pre-load next frames dynamically during LERP glide path
          drawFrame(index);
        }
      } else if (current !== target) {
        currentProgressRef.current = target;
        const index = Math.min(
          frameCount - 1,
          Math.max(0, Math.round(target * (frameCount - 1)))
        );
        if (index !== currentIndexRef.current) {
          currentIndexRef.current = index;
          priorityLoadWindow(index);
          drawFrame(index);
        }
      }

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);

    const handleScroll = () => {
      const activeMainContent = document.getElementById('main-content');

      const docScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const docMaxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

      const mainScrollY = activeMainContent ? activeMainContent.scrollTop : 0;
      const mainMaxScroll = activeMainContent ? Math.max(1, activeMainContent.scrollHeight - activeMainContent.clientHeight) : 1;

      let scrollY = docScrollY;
      let maxScroll = docMaxScroll;

      if (mainScrollY > 0) {
        scrollY = mainScrollY;
        maxScroll = mainMaxScroll;
      } else if (docScrollY > 0) {
        scrollY = docScrollY;
        maxScroll = docMaxScroll;
      } else {
        if (activeMainContent && activeMainContent.scrollHeight > activeMainContent.clientHeight) {
          maxScroll = mainMaxScroll;
        } else {
          maxScroll = docMaxScroll;
        }
      }

      const progress = Math.max(0, Math.min(1, scrollY / maxScroll));
      targetProgressRef.current = progress;

      // Handle on-demand target priority preloads immediately during fast scroll triggers
      const destIndex = Math.round(progress * (frameCountRef.current - 1));
      priorityLoadWindow(destIndex);
    };

    if (mainContent) {
      mainContent.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });

    // Initial draw trigger
    drawFrame(currentIndexRef.current);

    return () => {
      cancelAnimationFrame(animFrameId);
      if (mainContent) {
        mainContent.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [frameCount]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div 
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: hasDrawnYet ? opacity : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.0, ease: "easeOut" }}
      className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden bg-transparent"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </motion.div>
  );
};
