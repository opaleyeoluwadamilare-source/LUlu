"use client"

import { useRouter } from "next/navigation"

export default function Pricing() {
  const router = useRouter()
  
  return (
    <section
      id="pricing"
      className="relative py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-primary via-primary/90 to-primary"
    >
      <div className="max-w-6xl mx-auto">
        {/* Section Title */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-2 sm:mb-4 text-balance">
            STUPID SIMPLE PRICING
          </h2>
        </div>

        <div className="max-w-md mx-auto mb-12 sm:mb-16">
          <div
            className="relative p-6 sm:p-8 rounded-2xl border-2 hover:border-accent-primary-blue transition ring-1 active:scale-95 sm:active:scale-100"
            style={{
              borderColor: "var(--accent-primary-blue)",
              backgroundColor: "color-mix(in srgb, var(--accent-primary-blue) 10%, transparent)",
              ringColor: "var(--accent-primary-blue)",
            }}
          >
            <div className="space-y-5 sm:space-y-6 mt-3 sm:mt-4">
              <div className="text-center">
                <h3 className="text-3xl sm:text-4xl font-bold text-white mb-2">$1 A DAY</h3>
                <p className="text-sm sm:text-base text-white/80">
                  That's it. One dollar.
                </p>
                <p className="text-sm sm:text-base text-white/80 mt-2">
                  For an AI that watches your calendar, senses your stress, and calls when you need her.
                </p>
                <p className="text-xs sm:text-sm text-white/60 italic mt-2">
                  Billed monthly at $30.
                </p>
              </div>

              <ul className="space-y-3 sm:space-y-4">
                {[
                  { title: "Calendar sync (Google + Apple)" },
                  { title: "Apple Health integration" },
                  { title: "Calls when it matters" },
                  { title: "Researches who you're meeting" },
                  { title: "Texts if you miss her call" },
                  { title: "Remembers everything you've told her" },
                  { title: "Cancel anytime" },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 sm:gap-3">
                    <span className="font-bold mt-0.5 sm:mt-1 flex-shrink-0 text-white">
                      ✓
                    </span>
                    <div>
                      <p className="text-white font-medium text-sm sm:text-base">{item.title}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => router.push("/signup")}
                className="w-full py-3 sm:py-4 rounded-lg text-white font-semibold transition-all duration-300 text-base sm:text-lg active:scale-95 hover:scale-[1.02] hover:shadow-lg cursor-pointer uppercase tracking-wide"
                style={{ 
                  background: "var(--gradient-hero)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.3), 0 0 40px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3)"
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.4)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)"
                }}
              >
                START 7-DAY FREE TRIAL
              </button>
              
              <div className="text-center space-y-1">
                <p className="text-sm text-white/90 font-medium">
                  7 days free, then $1/day
                </p>
              </div>
            </div>
          </div>
          
          <p className="text-center text-white/60 text-sm mt-6 italic">
            You spend more on coffee you don't finish.
          </p>
        </div>

        {/* Gift Section */}
        <div className="max-w-2xl mx-auto p-6 sm:p-10 rounded-2xl border border-white/10 bg-gradient-to-r from-white/5 to-white/0 text-center space-y-6 sm:space-y-8">
          <div>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-4 sm:mb-6">
              GIFT THIS TO SOMEONE WHO NEEDS IT
            </h3>
            <p className="text-base sm:text-lg text-white/90 mb-4 sm:mb-6">
              Send this to:
            </p>
            <ul className="text-left space-y-2 sm:space-y-3 max-w-md mx-auto mb-6 sm:mb-8">
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="text-white/70 mt-1">•</span>
                <span className="text-sm sm:text-base text-white/90">Your friend with the big interview next week</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="text-white/70 mt-1">•</span>
                <span className="text-sm sm:text-base text-white/90">Your sibling who hasn't been sleeping</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="text-white/70 mt-1">•</span>
                <span className="text-sm sm:text-base text-white/90">Your coworker who's been off lately but won't talk about it</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="text-white/70 mt-1">•</span>
                <span className="text-sm sm:text-base text-white/90">Someone who needs the call they didn't know they needed</span>
              </li>
            </ul>
          </div>
          <button 
            onClick={() => router.push("/signup")}
            className="w-full sm:w-auto px-8 sm:px-12 py-3 sm:py-4 rounded-lg border border-white/30 text-white font-semibold hover:bg-white/10 transition text-base sm:text-lg active:scale-95 cursor-pointer"
          >
            GIFT A SUBSCRIPTION
          </button>
          <p className="text-xs sm:text-sm text-white/70 italic">
            Sometimes the best gift is knowing someone's watching out for you.
          </p>
        </div>
      </div>
    </section>
  )
}
