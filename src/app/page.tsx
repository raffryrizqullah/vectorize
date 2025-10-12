"use client";

import { useRef } from "react";
import Link from "next/link";
import { CubeTransparentIcon } from "@heroicons/react/24/outline";
import PixelBlast from "@/components/PixelBlast";
import VariableProximity from "@/components/VariableProximity";

export default function Home() {
  const heroRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="bg-background">
      <div className="relative isolate overflow-hidden pt-14">
        <div className="absolute inset-0 -z-30">
          <PixelBlast
            variant="circle"
            pixelSize={6}
            color="#06337b"
            patternScale={3}
            patternDensity={1.2}
            pixelSizeJitter={0.5}
            enableRipples
            rippleSpeed={0.4}
            rippleThickness={0.12}
            rippleIntensityScale={1.5}
            liquid
            liquidStrength={0.12}
            liquidRadius={1.2}
            liquidWobbleSpeed={5}
            speed={0.6}
            edgeFade={0.25}
            transparent
          />
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-gradient-to-b from-background/70 via-background/40 to-background/85"
        />
        <div
          ref={heroRef}
          className="mx-auto flex max-w-3xl flex-col items-center px-6 py-32 text-center sm:py-40 lg:px-8"
        >
          <CubeTransparentIcon aria-hidden="true" className="h-14 w-14 text-primary drop-shadow-lg" />
          <h1 className="mt-8 text-5xl font-semibold tracking-tight text-secondary sm:text-7xl dm-serif-text-regular-italic">
            <VariableProximity
              containerRef={heroRef}
              label="Empower Your Ideas with "
              className="block leading-tight"
              radius={300}
              falloff="gaussian"
              fromFontVariationSettings="'opsz' 52, 'wght' 320, 'slnt' 0, 'wdth' 96"
              toFontVariationSettings="'opsz' 120, 'wght' 920, 'slnt' -10, 'wdth' 112"
            />
            <VariableProximity
              containerRef={heroRef}
              label="Intelligent Knowledge"
              className="block leading-tight"
              radius={300}
              falloff="gaussian"
              fromFontVariationSettings="'opsz' 52, 'wght' 320, 'slnt' 0, 'wdth' 96"
              toFontVariationSettings="'opsz' 120, 'wght' 920, 'slnt' -10, 'wdth' 112"
            />
          </h1>
          <p className="mt-6 text-lg font-medium text-secondary sm:text-xl/8">
            <VariableProximity
              containerRef={heroRef}
              label={"Connect, refine, and evolve the way your team learns and makes decisions \u2014 seamlessly and intelligently."}
              className="leading-relaxed"
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
        <div className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-linear-to-t from-background sm:h-32" />
      </div>
    </div>
  );
}
