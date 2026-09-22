import React from "react";
import { motion } from "motion/react";

interface Props {
  value: number;
  max?: number;
  min?: number;
  gaugePrimaryColor: string;
  gaugeSecondaryColor: string;
  className?: string;
}

export function AnimatedCircularProgressBar({
  value,
  max = 100,
  min = 0,
  gaugePrimaryColor,
  gaugeSecondaryColor,
  className,
}: Props) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const percent = ((value - min) / (max - min)) * 100;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
        {/* Background Circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={gaugeSecondaryColor}
          strokeWidth="8"
          fill="transparent"
        />
        {/* Progress Circle */}
        <motion.circle
          cx="50"
          cy="50"
          r={radius}
          stroke={gaugePrimaryColor}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{Math.round(percent)}%</span>
      </div>
    </div>
  );
}
