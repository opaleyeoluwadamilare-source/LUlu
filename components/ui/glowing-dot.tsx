"use client"

import { motion } from "framer-motion"

interface GlowingDotProps {
  color: "red" | "green"
  delay?: number
}

export function GlowingDot({ color, delay = 0 }: GlowingDotProps) {
  const isRed = color === "red"
  
  return (
    <div className="relative flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6">
      {/* Main pulsing dot */}
      <motion.div
        className={`absolute inset-0 rounded-full ${
          isRed ? "bg-red-500" : "bg-green-500"
        }`}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          delay: delay,
          ease: "easeInOut",
        }}
        style={{
          boxShadow: isRed
            ? "0 0 14px rgba(239, 68, 68, 1), 0 0 28px rgba(239, 68, 68, 0.8), 0 0 42px rgba(239, 68, 68, 0.6), 0 0 56px rgba(239, 68, 68, 0.4)"
            : "0 0 14px rgba(34, 197, 94, 1), 0 0 28px rgba(34, 197, 94, 0.8), 0 0 42px rgba(34, 197, 94, 0.6), 0 0 56px rgba(34, 197, 94, 0.4)",
        }}
      />
      {/* Outer expanding glow ring */}
      <motion.div
        className={`absolute inset-0 rounded-full ${
          isRed ? "bg-red-500" : "bg-green-500"
        }`}
        animate={{
          scale: [1, 2.8, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          delay: delay,
          ease: "easeInOut",
        }}
      />
      {/* Inner bright core */}
      <motion.div
        className={`absolute rounded-full ${
          isRed ? "bg-red-300" : "bg-green-300"
        }`}
        style={{
          width: "45%",
          height: "45%",
          top: "27.5%",
          left: "27.5%",
        }}
        animate={{
          opacity: [0.9, 1, 0.9],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          delay: delay,
          ease: "easeInOut",
        }}
      />
    </div>
  )
}

