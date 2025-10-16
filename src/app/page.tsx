"use client";

import { useRef } from "react";
import Link from "next/link";
import { CubeTransparentIcon } from "@heroicons/react/24/outline";
import Silk from "@/components/Silk";
import VariableProximity from "@/components/VariableProximity";

export default function Home() {
  const heroRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="bg-background text-white">
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
            <Link
              href="/login"
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Get started
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
