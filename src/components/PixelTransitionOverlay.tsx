import React, { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";

type PixelTransitionOverlayProps = {
  active: boolean;
  onComplete?: () => void;
  gridSize?: number;
  color?: string;
  duration?: number;
};

const PixelTransitionOverlay: React.FC<PixelTransitionOverlayProps> = ({
  active,
  onComplete,
  gridSize = 12,
  color = "#ffffff",
  duration = 0.8,
}) => {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const squaresRef = useRef<HTMLDivElement[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const squares = useMemo(() => {
    squaresRef.current = [];
    return Array.from({ length: gridSize * gridSize }, (_, i) => i);
  }, [gridSize]);

  const setSquareRef = (index: number) => (el: HTMLDivElement | null) => {
    if (el) {
      squaresRef.current[index] = el;
    }
  };

  useEffect(() => {
    if (!active) {
      const overlay = overlayRef.current;
      if (overlay) {
        gsap.set(overlay, { autoAlpha: 0, pointerEvents: "none" });
      }
      squaresRef.current.forEach((square) => {
        gsap.set(square, { scale: 0, autoAlpha: 0 });
      });
      tlRef.current?.kill();
      tlRef.current = null;
      return;
    }

    const overlay = overlayRef.current;
    const squares = squaresRef.current.filter(Boolean);
    if (!overlay || !squares.length) return;

    tlRef.current?.kill();

    gsap.set(overlay, { autoAlpha: 1, pointerEvents: "auto", backgroundColor: "transparent" });
    gsap.set(squares, {
      scale: 0.3,
      autoAlpha: 0,
      transformOrigin: "50% 50%",
    });

    const tl = gsap.timeline({
      onComplete: () => {
        onComplete?.();
      },
    });

    tl.to(
      overlay,
      {
        backgroundColor: color,
        duration: duration * 0.45,
        ease: "power1.out",
      },
      0,
    );

    tl.to(squares, {
      scale: 1.05,
      autoAlpha: 1,
      duration,
      ease: "power3.out",
      stagger: {
        each: duration / (squares.length * 2.2),
        from: "random",
      },
    });

    tl.to(
      squares,
      {
        scale: 1,
        duration: duration * 0.35,
        ease: "power2.inOut",
      },
      "-=0.3",
    );

    tlRef.current = tl;

    return () => {
      tl.kill();
    };
  }, [active, duration, gridSize, onComplete]);

  return (
    <div
      ref={overlayRef}
      className="pointer-events-none fixed inset-0 z-[9999] opacity-0"
      aria-hidden={!active}
    >
      <div
        className="grid h-full w-full"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize}, 1fr)`,
        }}
      >
        {squares.map((id) => (
          <div
            key={id}
            ref={setSquareRef(id)}
            className="h-full w-full"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
};

export default PixelTransitionOverlay;
