"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const features = [
  {
    id: 1,
    heading: "KNOWS WHAT'S COMING",
    gradient: "bg-gradient-to-br from-[#f3f4f6] to-[#e5e7eb] border-white/20",
    iconBg: "bg-[#e5e7eb]",
    text: (
      <>
        <p className="mb-4 text-gray-700 font-medium">She syncs with your calendar.</p>
        <p className="mb-4 text-gray-600">The pitch, the interview, the hard conversation - she sees it before you tell her.</p>
        <p className="text-gray-800 italic text-sm sm:text-base bg-white/50 p-4 rounded-lg border border-gray-200 shadow-sm">
          "I see you have that board meeting tomorrow at 9am. Let's talk about it."
        </p>
      </>
    ),
  },
  {
    id: 2,
    heading: "SENSES WHEN YOU'RE OFF",
    gradient: "bg-gradient-to-br from-[#f3f4f6] to-[#e5e7eb] border-white/20",
    iconBg: "bg-[#e5e7eb]",
    text: (
      <>
        <p className="mb-4 text-gray-700 font-medium">Sleep dropped? Heart rate up? Patterns changing?</p>
        <p className="mb-2 text-gray-900 font-bold tracking-wide text-sm uppercase opacity-80">She notices:</p>
        <ul className="grid grid-cols-2 gap-2 text-gray-600 mb-4 text-sm">
          <li className="bg-white/50 p-2 rounded flex items-center border border-gray-200">Your sleep</li>
          <li className="bg-white/50 p-2 rounded flex items-center border border-gray-200">Your stress</li>
          <li className="bg-white/50 p-2 rounded flex items-center border border-gray-200">Your patterns</li>
          <li className="bg-white/50 p-2 rounded flex items-center border border-gray-200">Your energy</li>
        </ul>
        <p className="text-gray-600 mt-4 text-sm">
          She notices before you say anything.
          <br />
          <span className="text-gray-900 font-semibold">And she reaches out.</span>
        </p>
      </>
    ),
  },
  {
    id: 3,
    heading: "SHOWS UP AT THE RIGHT TIME",
    gradient: "bg-gradient-to-br from-[#f3f4f6] to-[#e5e7eb] border-white/20",
    iconBg: "bg-[#e5e7eb]",
    text: (
      <>
        <p className="mb-4 text-gray-700 font-medium">Not every day. Not random.</p>
        <div className="space-y-3 my-4 bg-white/50 p-4 rounded-xl border border-gray-200">
          <p className="text-gray-600 text-sm">She calls when you actually need to hear from someone.</p>
          <p className="text-gray-900 font-bold text-sm">Before the big moment.</p>
          <p className="text-gray-900 font-bold text-sm">Or when things aren't okay.</p>
        </div>
        <p className="text-gray-600 mt-4">
          That restraint is the product. She knows when to show up.
        </p>
      </>
    ),
  },
]

export default function ThreeThings() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <section id="three-things" className="relative w-full py-24 px-4 sm:px-6 bg-white overflow-hidden">
      {/* Subtle warm gradient background to match hero theme */}
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          background: "var(--gradient-hero)",
        }}
      />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Title */}
        <div className="text-center mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 mb-4 text-balance uppercase tracking-tighter"
          >
            THREE THINGS THAT <span className="text-transparent bg-clip-text" style={{ backgroundImage: "var(--gradient-hero)" }}>ACTUALLY MATTER</span>
          </motion.h2>
        </div>

        {/* Interactive Cards Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-0 relative min-h-[550px] items-center justify-center">
          {features.map((feature, index) => {
            const isHovered = hoveredIndex === index
            const isAnyHovered = hoveredIndex !== null
            
            // Base transforms for desktop
            const rotate = index === 0 ? -6 : index === 2 ? 6 : 0
            const x = index === 0 ? 20 : index === 2 ? -20 : 0
            const y = index === 1 ? -20 : 0 

            return (
              <motion.div
                key={feature.id}
                className={cn(
                  "relative lg:absolute lg:w-[380px] h-full",
                  index === 0 && "lg:left-0 lg:z-10",
                  index === 1 && "lg:left-1/2 lg:-translate-x-1/2 lg:z-20",
                  index === 2 && "lg:right-0 lg:z-10"
                )}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                style={{
                  x: 0,
                  y: 0,
                  rotate: 0,
                  zIndex: isHovered ? 50 : 10 
                }}
                animate={{
                  x: typeof window !== 'undefined' && window.innerWidth >= 1024 ? (isHovered ? 0 : x) : 0,
                  y: typeof window !== 'undefined' && window.innerWidth >= 1024 ? (isHovered ? -40 : y) : 0,
                  rotate: typeof window !== 'undefined' && window.innerWidth >= 1024 ? (isHovered ? 0 : rotate) : 0,
                  scale: isHovered ? 1.05 : (isAnyHovered ? 0.95 : 1),
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div 
                  className={cn(
                    "h-full p-8 rounded-3xl border shadow-xl transition-all duration-500 flex flex-col backdrop-blur-sm",
                    feature.gradient,
                    isHovered ? "shadow-2xl scale-[1.02] border-gray-300" : "shadow-lg border-gray-100"
                  )}
                >
                  {/* Card Header */}
                  <div 
                    className="h-2 w-20 rounded-full mb-6"
                    style={{ background: "var(--gradient-hero)" }}
                  />
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 uppercase tracking-wide leading-none">
                    {feature.heading}
                  </h3>

                  {/* Card Body */}
                  <div className="text-base leading-relaxed flex-grow">
                    {feature.text}
                  </div>

                  {/* Decorative Number */}
                  <div className="absolute top-4 right-6 text-6xl font-black text-gray-200/50 pointer-events-none select-none">
                    0{feature.id}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
