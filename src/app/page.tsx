"use client";

import { useMemo, useRef } from "react";
import Link from "next/link";
import { CubeTransparentIcon } from "@heroicons/react/24/outline";
import Silk from "@/components/Silk";
import VariableProximity from "@/components/VariableProximity";
import LogoLoop, { type LogoItem } from "@/components/LogoLoop";
import SplitText from "@/components/SplitText";

export default function Home() {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const logos = useMemo<LogoItem[]>(
    () => [
      { src: "/next.svg", alt: "Next.js" },
      { src: "/vercel.svg", alt: "Vercel" },
      { src: "/globe.svg", alt: "Global Reach" },
      { node: <span className="font-semibold">Pinecone</span> },
      { node: <span className="font-semibold">FastAPI</span> },
      { src: "/window.svg", alt: "Dashboard" },
      { node: <span className="font-semibold">Redis</span> },
      { node: <span className="font-semibold">OpenAI</span> },
    ],
    [],
  );

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
          <SplitText
            text={"Connect, refine, and evolve the way your team learns and makes decisions \u2014 seamlessly and intelligently."}
            tag="p"
            splitType="words, chars"
            delay={45}
            duration={0.5}
            className="mt-6 text-lg font-medium text-white/85 sm:text-xl/8 leading-relaxed max-w-3xl mx-auto"
            textAlign="center"
            rootMargin="-120px"
          />
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary shadow-lg transition hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Get started
            </Link>
          </div>
          <div className="mt-14 w-full max-w-4xl">
            <LogoLoop
              logos={logos}
              speed={80}
              gap={48}
              logoHeight={32}
              fadeOut
              scaleOnHover
              ariaLabel="Technologies powering Vectorize"
              className="mx-auto max-w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
