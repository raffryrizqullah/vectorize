"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
);

type Props = {
  points: number[];
  height?: number;
  color?: string;
  animate?: boolean;
};

export default function HealthLineChart({ points, height = 28, color = "#0414d7", animate = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const labels = points.map((_, i) => String(i + 1));

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            data: points,
            borderColor: color,
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            cubicInterpolationMode: "monotone",
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300, easing: "linear" },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false },
        },
        elements: { line: { capBezierPoints: true } },
      },
    });

    chartRef.current = chart;
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      chart.destroy();
      chartRef.current = null;
    };
  }, []);

  // Update data when points change
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.data.labels = points.map((_, i) => String(i + 1));
    chart.data.datasets[0].data = points;
    chart.update();
  }, [points]);

  // Simple loop animation by rotating data over time
  useEffect(() => {
    if (!animate) return;
    const chart = chartRef.current;
    if (!chart) return;
    let last = performance.now();
    let idx = 0;
    const base = Array.isArray(points) && points.length > 0 ? points.slice() : [0];
    const N = base.length;
    if (N < 2) return;

    const stepMs = 800; // rotate every 800ms
    const loop = (t: number) => {
      if (!chartRef.current) return;
      if (t - last >= stepMs) {
        last = t;
        idx = (idx + 1) % N;
        const rotated = [...base.slice(idx), ...base.slice(0, idx)];
        chart.data.datasets[0].data = rotated as any;
        chart.update("none");
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [animate, points]);

  return (
    <div style={{ height }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

