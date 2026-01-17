"use client"

import { ContainerScroll } from "@/components/ui/container-scroll-animation"
import { GlowingDot } from "@/components/ui/glowing-dot"
import { motion, useScroll, useTransform, useMotionValue } from "framer-motion"
import { useRef, useEffect } from "react"

function ScrollableContent() {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollProgress = useMotionValue(0.5) // Start at middle to show both sections
  
  // Track scroll within the container - use container prop for scrollable divs
  const { scrollYProgress } = useScroll({
    container: containerRef,
    layoutEffect: false
  })

  // Sync framer-motion scroll progress with our manual tracking
  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      scrollProgress.set(latest)
    })
    return unsubscribe
  }, [scrollYProgress, scrollProgress])

  // Manual scroll tracking as primary method for reliability
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const scrollTop = container.scrollTop
      const scrollHeight = container.scrollHeight - container.clientHeight
      const progress = scrollHeight > 0 ? Math.min(Math.max(scrollTop / scrollHeight, 0), 1) : 0.5
      scrollProgress.set(progress)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial calculation

    // Also listen for resize to recalculate
    window.addEventListener('resize', handleScroll, { passive: true })

    return () => {
      container.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [scrollProgress])

  // Negative items fade in dark area (top 0-30%), positive fade in light area (70-100%)
  // Make positive items ALWAYS visible - start at 0.7 opacity minimum, reach full at bottom
  const negativeOpacity = useTransform(scrollProgress, [0, 0.3, 0.7, 1], [1, 0.8, 0.5, 0.2])
  const positiveOpacity = useTransform(scrollProgress, [0, 0.3, 0.7, 1], [0.7, 0.75, 0.95, 1])
  const negativeY = useTransform(scrollProgress, [0, 0.5], [0, -5])
  const positiveY = useTransform(scrollProgress, [0.5, 1], [5, 0])

  return (
    <div 
      ref={containerRef} 
      className="h-full w-full flex flex-col space-y-8 sm:space-y-10 md:space-y-14 overflow-y-auto scrollbar-hide"
      style={{ 
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Negative Items - Dark Section (Top) */}
      <motion.div
        style={{ opacity: negativeOpacity, y: negativeY }}
        className="space-y-6 sm:space-y-7 md:space-y-9 min-h-[48%] flex flex-col justify-center px-2 sm:px-3 md:px-6 py-3 sm:py-4 md:py-6 pb-8 sm:pb-10"
      >
        <div className="space-y-5 sm:space-y-6 md:space-y-8">
          <motion.div
            className="flex items-center gap-4 sm:gap-5 md:gap-6 lg:gap-8 group cursor-default"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, margin: "-50px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex-shrink-0 relative z-10">
              <GlowingDot color="red" delay={0} />
            </div>
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-semibold text-white leading-relaxed tracking-tight group-hover:text-white/90 transition-all duration-500">
              Not an app you forget to open
            </p>
          </motion.div>

          <motion.div
            className="flex items-center gap-4 sm:gap-5 md:gap-6 lg:gap-8 group cursor-default"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, margin: "-50px" }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex-shrink-0 relative z-10">
              <GlowingDot color="red" delay={0.25} />
            </div>
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-semibold text-white leading-relaxed tracking-tight group-hover:text-white/90 transition-all duration-500">
              Not notifications you swipe away
            </p>
          </motion.div>

          <motion.div
            className="flex items-center gap-4 sm:gap-5 md:gap-6 lg:gap-8 group cursor-default"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, margin: "-50px" }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex-shrink-0 relative z-10">
              <GlowingDot color="red" delay={0.5} />
            </div>
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-semibold text-white leading-relaxed tracking-tight group-hover:text-white/90 transition-all duration-500">
              Not a schedule that doesn't know what you're facing
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Transition Divider - appears in middle gradient area */}
      <motion.div
        className="h-[2px] bg-gradient-to-r from-transparent via-white/60 to-transparent my-6 sm:my-8 md:my-10"
        initial={{ scaleX: 0, opacity: 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: false, margin: "-50px" }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Positive Items - Light Section (Bottom) - Always visible with scroll-based enhancement */}
      <motion.div
        style={{ 
          opacity: positiveOpacity, 
          y: positiveY,
        }}
        className="space-y-6 sm:space-y-7 md:space-y-9 min-h-[52%] flex flex-col justify-center px-2 sm:px-3 md:px-6 py-3 sm:py-4 md:py-6 pb-32 sm:pb-36 md:pb-40"
      >
        <div className="space-y-5 sm:space-y-6 md:space-y-8">
          <motion.div
            className="flex items-center gap-4 sm:gap-5 md:gap-6 lg:gap-8 group cursor-default"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, margin: "-50px" }}
            transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex-shrink-0 relative z-10">
              <GlowingDot color="green" delay={0} />
            </div>
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-semibold text-slate-900 leading-relaxed tracking-tight group-hover:text-slate-950 transition-all duration-500" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)' }}>
              <span className="font-bold text-slate-950">Lulu comes to you</span>
            </p>
          </motion.div>

          <motion.div
            className="flex items-center gap-4 sm:gap-5 md:gap-6 lg:gap-8 group cursor-default"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, margin: "-50px" }}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex-shrink-0 relative z-10">
              <GlowingDot color="green" delay={0.15} />
            </div>
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-semibold text-slate-900 leading-relaxed tracking-tight group-hover:text-slate-950 transition-all duration-500" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)' }}>
              She calls. <span className="font-bold text-slate-950">It actually lands.</span>
            </p>
          </motion.div>

          <motion.div
            className="flex items-center gap-4 sm:gap-5 md:gap-6 lg:gap-8 group cursor-default"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, margin: "-50px" }}
            transition={{ duration: 0.7, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex-shrink-0 relative z-10">
              <GlowingDot color="green" delay={0.3} />
            </div>
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-semibold text-slate-900 leading-relaxed tracking-tight group-hover:text-slate-950 transition-all duration-500" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)' }}>
              She knows when. <span className="font-bold text-slate-950">Not scheduled. Signal-driven.</span>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

export default function ResultsCompartment() {
  return (
    <section className="relative w-full py-12 sm:py-20 px-4 sm:px-6" style={{ background: "white" }}>
      {/* Smooth gradient fade-in from hero section - creates seamless dissolve */}
      <div 
        className="absolute top-0 left-0 right-0 h-40 sm:h-56 md:h-72 lg:h-80 -z-10 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, rgba(166, 124, 82, 0.25) 0%, rgba(184, 144, 95, 0.18) 8%, rgba(196, 149, 111, 0.12) 16%, rgba(176, 122, 88, 0.08) 24%, rgba(154, 106, 106, 0.05) 32%, rgba(125, 95, 149, 0.03) 40%, rgba(95, 79, 168, 0.02) 48%, rgba(61, 74, 143, 0.01) 56%, rgba(255, 255, 255, 0.3) 65%, rgba(255, 255, 255, 0.6) 75%, rgba(255, 255, 255, 0.85) 88%, white 100%)",
          mixBlendMode: "normal",
        }}
      />
      <div
        className="absolute inset-0 -z-20"
        style={{
          background:
            "linear-gradient(135deg, rgba(200, 149, 107, 0.05) 0%, rgba(212, 148, 110, 0.05) 15%, rgba(224, 168, 133, 0.05) 25%, rgba(160, 130, 150, 0.05) 50%, rgba(122, 126, 200, 0.05) 70%, rgba(74, 109, 184, 0.05) 85%, rgba(44, 90, 160, 0.05) 100%)",
        }}
      />

      <div className="max-w-6xl mx-auto space-y-16 sm:space-y-20">
        {/* What You Actually Get Section with Scroll Animation */}
        <div className="space-y-6 sm:space-y-8">
          <ContainerScroll
            titleComponent={
              <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground uppercase tracking-tight">
                WHAT YOU ACTUALLY GET
              </h3>
            }
          >
            <ScrollableContent />
          </ContainerScroll>
        </div>

      </div>
    </section>
  )
}
