"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CubeTransparentIcon } from "@heroicons/react/24/outline";
import Silk from "@/components/Silk";
import VariableProximity from "@/components/VariableProximity";
import PixelTransitionOverlay from "@/components/PixelTransitionOverlay";

export default function Home() {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const router = useRouter();

  const handleGetStarted = () => {
    if (transitioning) return;
    setTransitioning(true);
  };

  return (
    <div className="bg-background text-white">
      <PixelTransitionOverlay
        active={transitioning}
        onComplete={() => router.push("/login")}
        gridSize={18}
        color="#06337b"
        duration={0.5}
      />
      <div className="relative isolate overflow-hidden min-h-screen pt-14">
        <div className="absolute inset-0 -z-30 overflow-hidden">
          <Silk speed={4.2} scale={1.25} noiseIntensity={1} color="#06337b" rotation={0.35} />
        </div>
        <div
          ref={heroRef}
          className="mx-auto flex min-h-[80vh] max-w-4xl flex-col items-center justify-center px-6 py-20 text-center lg:px-8"
        >
          <CubeTransparentIcon aria-hidden="true" className="h-14 w-14 text-white drop-shadow-lg" />
          <h1 className="mt-8 text-5xl font-semibold tracking-tight text-white sm:text-7xl dm-serif-text-regular-italic">
            <VariableProximity
              containerRef={heroRef}
              label="Empower Your Ideas with "
              className="block leading-tight text-white"
              radius={300}
              falloff="gaussian"
              fromFontVariationSettings="'opsz' 52, 'wght' 320, 'slnt' 0, 'wdth' 96"
              toFontVariationSettings="'opsz' 120, 'wght' 920, 'slnt' -10, 'wdth' 112"
            />
            <VariableProximity
              containerRef={heroRef}
              label="Intelligent Knowledge"
              className="block leading-tight text-white"
              radius={300}
              falloff="gaussian"
              fromFontVariationSettings="'opsz' 52, 'wght' 320, 'slnt' 0, 'wdth' 96"
              toFontVariationSettings="'opsz' 120, 'wght' 920, 'slnt' -10, 'wdth' 112"
            />
          </h1>
          <p className="mt-6 text-lg font-medium text-white/85 sm:text-xl/8">
            <VariableProximity
              containerRef={heroRef}
              label={"Connect, refine, and evolve the way your team learns and makes decisions \u2014 seamlessly and intelligently."}
              className="leading-relaxed text-white/85"
              radius={260}
              falloff="exponential"
              fromFontVariationSettings="'opsz' 60, 'wght' 320, 'slnt' 0, 'wdth' 98"
              toFontVariationSettings="'opsz' 96, 'wght' 620, 'slnt' -8, 'wdth' 106"
            />
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={handleGetStarted}
              disabled={transitioning}
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary shadow-lg transition hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-80"
            >
              Get started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
