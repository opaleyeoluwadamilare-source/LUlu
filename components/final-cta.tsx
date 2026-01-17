"use client"

import { useRouter } from "next/navigation"

export default function FinalCTA() {
  const router = useRouter()

  return (
    <section className="relative py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-primary/90 to-primary">
      <div className="max-w-4xl mx-auto text-center space-y-8 sm:space-y-12">
        {/* Animated Glowing Button */}
        <div className="relative inline-block w-full sm:w-auto">
          <button
            onClick={() => router.push("/signup")}
            className="relative w-full sm:w-auto px-6 sm:px-16 py-4 sm:py-6 text-lg sm:text-2xl md:text-3xl font-bold text-white rounded-full overflow-hidden group active:scale-95 touch-manipulation transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 cursor-pointer"
            style={{
              background: "var(--gradient-hero)",
              border: "1.5px solid rgba(255, 255, 255, 0.3)",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(0, 0, 0, 0.3), 0 0 50px rgba(255, 255, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3)"
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.5)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)"
            }}
          >
            <span
              className="relative flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base md:text-2xl lg:text-3xl z-10"
              style={{
                textShadow: "0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)",
              }}
            >
              <span>MEET LULU →</span>
            </span>

            {/* Enhanced glow effect */}
            <div
              className="absolute -inset-2 rounded-full blur-3xl group-hover:blur-4xl transition opacity-50 group-hover:opacity-75 animate-pulse -z-10"
              style={{ background: "var(--gradient-hero)" }}
            />
          </button>
        </div>

        {/* Benefits */}
        <div className="space-y-3 sm:space-y-4 text-primary-foreground/90 max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base">
            <span style={{ color: "var(--accent-success)" }}>✓</span>
            <span>Syncs with your calendar, health, and tasks</span>
          </div>
          <div className="flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base">
            <span style={{ color: "var(--accent-success)" }}>✓</span>
            <span>Calls when it matters</span>
          </div>
          <div className="flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base">
            <span style={{ color: "var(--accent-success)" }}>✓</span>
            <span>Remembers everything you've told her</span>
          </div>
          <div className="flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base">
            <span style={{ color: "var(--accent-success)" }}>✓</span>
            <span>Not every day. Just the right day.</span>
          </div>
        </div>

        <div className="text-primary-foreground/90 text-sm sm:text-lg font-semibold">
          She calls when you need her. Not every day - just the right day.
        </div>
      </div>
    </section>
  )
}
