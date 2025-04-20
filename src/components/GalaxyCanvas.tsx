"use client";

import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';

// Define the Star type
export interface Star {
  id: number; // Add an ID for React keys
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  imageIndex?: number; // Add image index to star
}

interface GalaxyCanvasProps {
  width: number;
  height: number;
  gravity: number;
  timeStep: number;
  defaultMass: number; // Consolidated mass parameter
  onPauseStateChange?: (isPaused: boolean) => void; // Callback for pause state
  onStarCountChange?: (count: number) => void; // <-- Add prop type
}

// Define the type for the exposed handle
export interface GalaxyCanvasHandle {
  togglePause: () => void;
  clearStars: () => void;
  saveImage: () => void;
  isCurrentlyPaused: () => boolean;
  addStars: (newStars: Star[]) => void;
}

// Wrap component with forwardRef
const GalaxyCanvas = forwardRef<GalaxyCanvasHandle, GalaxyCanvasProps>((
  {
    width,
    height,
    gravity,
    timeStep,
    defaultMass, // Use the consolidated mass prop
    onPauseStateChange, // Get callback prop
    onStarCountChange, // <-- Get the prop
  },
  ref // The ref passed from the parent
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stars, setStars] = useState<Star[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<{ x: number, y: number } | null>(null);
  const [startDragPos, setStartDragPos] = useState<{ x: number, y: number } | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [starImages, setStarImages] = useState<HTMLImageElement[]>([]); // State for loaded images
  const [imagesLoaded, setImagesLoaded] = useState(false); // State to track loading

  // Use props directly
  const G = gravity;
  const dt = timeStep;
  const softeningFactor = 5;

  // Effect to load images on mount
  useEffect(() => {
    const imagePaths = [
        '/images/star1.png',
        '/images/star2.png',
        '/images/star3.png',
        '/images/star4.png',
        '/images/star5.png',
    ];
    let loadedCount = 0;
    const images: HTMLImageElement[] = [];

    imagePaths.forEach(src => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === imagePaths.length) {
          setStarImages(images);
          setImagesLoaded(true); // Mark images as loaded
        }
      };
      img.onerror = () => {
        console.error(`Failed to load image: ${src}`);
        // Potentially handle errors, maybe try loading again or fall back
        loadedCount++; // Count errors too so loading state completes
         if (loadedCount === imagePaths.length) {
           setStarImages(images); // Set whatever loaded successfully
           setImagesLoaded(true); // Mark loading as complete even with errors
         }
      };
      img.src = src;
      images.push(img);
    });
  }, []); // Run only once on mount

  // Effect to report initial star count
  useEffect(() => {
    onStarCountChange?.(stars.length);
  }, [onStarCountChange]); // Run when callback changes (effectively once on mount)

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let animationFrameId: number;

    // Drawing function
    const draw = () => {
      // Clear canvas
      context.fillStyle = 'rgb(10,10,10)';
      context.fillRect(0, 0, width, height);

      // Draw stars
      stars.forEach(star => {
        if (imagesLoaded && star.imageIndex !== undefined && starImages[star.imageIndex]) {
            const img = starImages[star.imageIndex];
            // Scale image based on mass, similar to radius logic, but capped
            const baseSize = 15; // Base size in pixels
            const maxSize = 30; // Max size
            const size = Math.min(maxSize, baseSize + Math.sqrt(star.mass) * 0.5);
            // Draw centered image
            context.drawImage(img, star.x - size / 2, star.y - size / 2, size, size);
        } else {
            // Fallback to drawing circles if images not loaded or index missing
            context.fillStyle = 'white';
            context.beginPath();
            const radius = Math.max(1, Math.sqrt(star.mass));
            context.arc(star.x, star.y, radius, 0, Math.PI * 2);
            context.fill();
        }
      });

      // Physics update step
      if (!isPaused) {
        // Use functional update to ensure we work with the latest state
        setStars(currentStars => {
          return currentStars.map(star => {
            let netForceX = 0;
            let netForceY = 0;

            // Calculate net force from all other stars in the *current* state
            currentStars.forEach(otherStar => {
              if (star.id === otherStar.id) return;

              const dx = otherStar.x - star.x;
              const dy = otherStar.y - star.y;
              const distSq = dx * dx + dy * dy + softeningFactor * softeningFactor;
              const dist = Math.sqrt(distSq);

              const force = (G * star.mass * otherStar.mass) / distSq;
              const forceX = force * (dx / dist);
              const forceY = force * (dy / dist);

              netForceX += forceX;
              netForceY += forceY;
            });

            const vx = star.vx + (netForceX / star.mass) * dt;
            const vy = star.vy + (netForceY / star.mass) * dt;
            const x = star.x + vx * dt;
            const y = star.y + vy * dt;

            return { ...star, x, y, vx, vy };
          });
        });
      } // End of !isPaused check

      // Request next frame
      animationFrameId = requestAnimationFrame(draw);
    };

    // Request the first animation frame
    animationFrameId = requestAnimationFrame(draw);

    // Cleanup function to cancel animation frame when component unmounts or dependencies change
    return () => {
      cancelAnimationFrame(animationFrameId);
    };

  }, [stars, width, height, isPaused, G, dt, imagesLoaded, starImages]); // Add G, dt, imagesLoaded, starImages dependencies

  // Mouse down handler
  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setIsDragging(true);
    setLastMousePos({ x, y });
    setStartDragPos({ x, y }); // Record start position
    event.preventDefault();
  };

  // Mouse move handler
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;

    if (lastMousePos) {
      const dx = currentX - lastMousePos.x;
      const dy = currentY - lastMousePos.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      // Only add stars if mouse moved a minimum distance
      if (dist > 15) { 
          // Calculate tangential velocity (perpendicular to drag direction)
          const dragSpeed = 0.1; // Adjust speed factor as needed
          const tangentialVx = -dy / dist * dragSpeed * dist; // Scale velocity by drag distance
          const tangentialVy = dx / dist * dragSpeed * dist;
          const randomImageIndex = imagesLoaded ? Math.floor(Math.random() * starImages.length) : undefined;

          const newStar: Star = {
            id: Date.now(),
            x: currentX,
            y: currentY,
            vx: tangentialVx,
            vy: tangentialVy,
            mass: defaultMass, // Use consolidated mass
            imageIndex: randomImageIndex,
          };
          setStars(prevStars => [...prevStars, newStar]);
          setLastMousePos({ x: currentX, y: currentY });
      }
    }
  };

  // Mouse up handler - Now handles clicks vs drag releases
  const handleMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !startDragPos) return; // Exit if not dragging

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const endX = event.clientX - rect.left;
    const endY = event.clientY - rect.top;

    const dx = endX - startDragPos.x;
    const dy = endY - startDragPos.y;
    const distSq = dx * dx + dy * dy;
    const clickThresholdSq = 25; // Threshold distance (squared) to differentiate click vs drag (5px)

    // If distance is small, treat as a click
    if (distSq < clickThresholdSq) {
        const randomImageIndex = imagesLoaded ? Math.floor(Math.random() * starImages.length) : undefined;
        const newStar: Star = {
            id: Date.now(),
            x: endX, // Use endX/endY for click position
            y: endY,
            vx: 0, // Zero initial velocity for clicks
            vy: 0,
            mass: defaultMass, // Use consolidated mass
            imageIndex: randomImageIndex,
        };
        setStars(prevStars => [...prevStars, newStar]);
    }
    // Otherwise, it was a drag, and we don't add the final star here

    setIsDragging(false);
    setLastMousePos(null);
    setStartDragPos(null); // Clear start position
  };

  // Mouse leave handler (optional, but good practice to stop drag if mouse leaves canvas)
  const handleMouseLeave = () => {
      if (isDragging) {
          setIsDragging(false);
          setLastMousePos(null);
      }
  }

  // --- UI Control Handlers (kept internal, exposed via ref) ---
  const internalTogglePause = () => {
    const nextPausedState = !isPaused;
    setIsPaused(nextPausedState);
    onPauseStateChange?.(nextPausedState); // Notify parent
  };

  const internalClearStars = () => {
    setStars([]);
    // Optional: Ensure simulation isn't paused after clearing
    if (isPaused) {
        const nextPausedState = false;
        setIsPaused(nextPausedState);
        onPauseStateChange?.(nextPausedState); // Notify parent
    }
  };

  const internalSaveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'galaxy.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to add multiple stars
  const internalAddStars = (newStars: Star[]) => {
      setStars(prevStars => [...prevStars, ...newStars]);
  };

  // Expose functions via useImperativeHandle
  useImperativeHandle(ref, () => ({
    togglePause: internalTogglePause,
    clearStars: internalClearStars,
    saveImage: internalSaveImage,
    isCurrentlyPaused: () => isPaused, // Expose state getter
    addStars: internalAddStars, // Expose the new function
  }));

  // Update star count on adding single star or dragging
  useEffect(() => {
    onStarCountChange?.(stars.length);
  }, [stars.length, onStarCountChange]); // Run whenever star count changes

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border border-gray-500 cursor-crosshair block"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  );
});

// Set display name for React DevTools
GalaxyCanvas.displayName = 'GalaxyCanvas';

export default GalaxyCanvas; 