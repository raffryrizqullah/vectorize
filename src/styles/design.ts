"use client";

export const cardSurfaceClass =
  "relative flex flex-col rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(6,51,123,0.12)]";

export const heroSectionClass =
  "rounded-3xl border border-primary/10 bg-primary/5 px-8 py-7 shadow-inner";

export const heroTitleClass =
  "text-3xl font-semibold text-secondary sm:text-4xl dm-serif-text-regular-italic";

export const heroSubtitleClass =
  "mt-3 max-w-2xl text-sm text-secondary/70 sm:text-base";

export const primaryButtonClass =
  "inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex items-center gap-2 rounded-full border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60";

export const alertStyles = {
  error: "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700",
  success: "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700",
  info: "rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary",
} as const;

export const loadingToastClass =
  "fixed inset-x-0 bottom-6 z-30 mx-auto flex w-max items-center gap-2 rounded-full border border-secondary/10 bg-background/95 px-4 py-2 text-xs text-secondary/60 shadow-lg";

export const toggleInputClass =
  "mt-1 size-4 rounded border-secondary/30 text-primary focus:ring-primary";

export const mutedBadgeClass =
  "inline-flex items-center rounded-full bg-secondary/5 px-2 py-0.5 text-xs text-secondary/60";
