"use client"

import { useRouter } from "next/navigation"

// Advanced Typography Scale (Modular Scale 1.25 - Major Third)
// Desktop: 36, 45, 56, 70, 88
// Mobile: 24, 30, 36, 45, 56
// Following 8px base spacing system

type HeadlineConfig = {
  lines: {
    text: string
    fontSize: number // Desktop size in px
    mobileFontSize?: number // Mobile size override
    tabletFontSize?: number // Tablet size (768px - 1024px)
    fontWeight: number
    textTransform: "uppercase" | "none"
    color: string
    letterSpacing: string
    mobileLetterSpacing?: string
    lineHeight: number
    mobileLineHeight?: number
    marginTop?: number
    mobileMarginTop?: number
    italic?: boolean
    opacity?: number
    textShadow?: string
    mobileBreak?: boolean
  }[]
}

const headlineConfig: HeadlineConfig = {
  lines: [
    {
      text: "YOU'RE NOT BROKEN.",
      fontSize: 70,
      mobileFontSize: 32,
      tabletFontSize: 48,
      fontWeight: 800,
      textTransform: "uppercase",
      color: "#FFFFFF",
      letterSpacing: "-0.02em",
      lineHeight: 1.0,
      mobileLineHeight: 1.1,
    },
    {
      text: "Everyone else is just delusional.",
      fontSize: 45,
      mobileFontSize: 24,
      tabletFontSize: 36,
      fontWeight: 500,
      textTransform: "none",
      color: "rgba(255, 255, 255, 0.90)",
      letterSpacing: "0.01em",
      lineHeight: 1.3,
      mobileLineHeight: 1.4,
      marginTop: 32,
      mobileMarginTop: 24,
    },
    {
      text: "(And that's why they're winning.)",
      fontSize: 36,
      mobileFontSize: 20,
      tabletFontSize: 28,
      fontWeight: 300,
      textTransform: "none",
      color: "rgba(255, 255, 255, 0.60)",
      letterSpacing: "0.01em",
      lineHeight: 1.4,
      mobileLineHeight: 1.5,
      marginTop: 32,
      mobileMarginTop: 24,
      italic: true,
    },
  ],
}

export default function Hero() {
  const router = useRouter()
  
  // Helper function to add line breaks (kept for potential future use)
  const renderTextWithBreaks = (text: string) => {
    return text
  }

  const handleBrainwashClick = () => {
    try {
      router.push("/signup")
    } catch (error) {
      console.error("Navigation error:", error)
      // Fallback to window.location if router fails
      window.location.href = "/signup"
    }
  }

  return (
    <section className="relative w-full">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: "var(--gradient-hero)",
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent -z-5" />

      <div 
        className="hero-section-container mx-auto min-h-screen flex flex-col justify-center items-center text-center"
        style={{
          maxWidth: "1400px",
          padding: "120px 80px 80px",
        }}
      >
        {/* Main Headline */}
        <div className="w-full" style={{ maxWidth: "1400px" }}>
          <div
            className="hero-headlines-container flex flex-col justify-center items-center"
            style={{
              minHeight: "200px",
            }}
          >
            {headlineConfig.lines.map((line, idx) => {
              const isInsecuritiesGroup = false
              
              // Responsive sizes with proper scaling
              const mobileFontSize = line.mobileFontSize || line.fontSize * 0.55
              const tabletFontSize = line.tabletFontSize || line.fontSize * 0.7
              const desktopFontSize = line.fontSize
              
              // Line heights - improved for readability
              const mobileLineHeight = line.mobileLineHeight || line.lineHeight + 0.1
              const tabletLineHeight = line.lineHeight + 0.05
              const desktopLineHeight = line.lineHeight
              
              // Spacing - following 8px base system
              const mobileMarginTop = line.mobileMarginTop !== undefined 
                ? line.mobileMarginTop 
                : (line.marginTop ? Math.round(line.marginTop * 0.6) : 0)
              const desktopMarginTop = line.marginTop || 0
              
              // Letter spacing
              const mobileLetterSpacing = line.mobileLetterSpacing || line.letterSpacing
              const desktopLetterSpacing = line.letterSpacing

              return (
                <h1
                  key={idx}
                  className={`hero-headline text-center w-full ${isInsecuritiesGroup ? `hero-insecurities-group hero-insecurities-${idx === 0 ? 'main' : 'secondary'}` : ''}`}
                  data-desktop-size="true"
                  data-tablet-size="true"
                  style={{
                    // Mobile styles (default)
                    fontSize: `${mobileFontSize}px`,
                    fontWeight: line.fontWeight,
                    textTransform: line.textTransform,
                    color: line.color,
                    letterSpacing: mobileLetterSpacing,
                    lineHeight: mobileLineHeight,
                    marginTop: idx === 0 ? 0 : `${mobileMarginTop}px`,
                    fontStyle: line.italic ? "italic" : "normal",
                    opacity: line.opacity !== undefined ? line.opacity : 1,
                    textShadow: line.textShadow
                      ? line.textShadow
                      : "0 4px 24px rgba(0, 0, 0, 0.15)",
                    textAlign: "center",
                    wordWrap: "break-word",
                    overflowWrap: "break-word",
                    // CSS custom properties for responsive sizing
                    ["--mobile-font-size" as any]: `${mobileFontSize}px`,
                    ["--tablet-font-size" as any]: `${tabletFontSize}px`,
                    ["--desktop-font-size" as any]: `${desktopFontSize}px`,
                    ["--mobile-line-height" as any]: mobileLineHeight,
                    ["--tablet-line-height" as any]: tabletLineHeight,
                    ["--desktop-line-height" as any]: desktopLineHeight,
                    ["--mobile-margin-top" as any]: `${mobileMarginTop}px`,
                    ["--desktop-margin-top" as any]: `${desktopMarginTop}px`,
                    ["--mobile-letter-spacing" as any]: mobileLetterSpacing,
                    ["--desktop-letter-spacing" as any]: desktopLetterSpacing,
                  }}
                >
                  {renderTextWithBreaks(line.text)}
                </h1>
              )
            })}
          </div>
        </div>

        {/* Subheading */}
        <p className="text-sm sm:text-base md:text-lg text-white/90 font-light max-w-2xl leading-relaxed mt-8 sm:mt-10 md:mt-12">
          We call you every morning and tell you delusionally confident things you need, until you believe them.
        </p>

        <button 
          onClick={handleBrainwashClick}
          className="brainwash-button relative px-8 sm:px-12 py-3 sm:py-4 text-base sm:text-lg font-bold text-white rounded-full overflow-hidden group touch-manipulation mt-6 sm:mt-8 md:mt-10 cursor-pointer"
        >
          <div className="absolute inset-0 bg-white/20 group-hover:bg-white/30 transition-all duration-300 rounded-full backdrop-blur-sm" />
          <div className="absolute inset-0 border border-white/40 group-hover:border-white/70 transition-all duration-300 rounded-full" />
          {/* Glassy shine effect */}
          <div className="glass-shine absolute inset-0 rounded-full pointer-events-none" />
          <span className="relative flex items-center justify-center gap-2 group-hover:drop-shadow-[0_2px_12px_rgba(255,255,255,0.3)] transition-all duration-300 z-10">
            BRAINWASH ME
          </span>
        </button>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          /* Mobile (default - max-width: 767px) */
          @media (max-width: 767px) {
            .hero-section-container {
              padding: 80px 24px 60px !important;
            }
            .hero-headlines-container {
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              padding: 0 20px !important;
            }
            .hero-headline {
              text-align: center !important;
              width: 100% !important;
              max-width: 100% !important;
              font-size: var(--mobile-font-size) !important;
              line-height: var(--mobile-line-height) !important;
              letter-spacing: var(--mobile-letter-spacing) !important;
            }
            .hero-headline:not(:first-child) {
              margin-top: var(--mobile-margin-top) !important;
            }
            .hero-insecurities-main {
              font-size: 32px !important;
              line-height: 1.1 !important;
              letter-spacing: -0.01em !important;
              padding: 0 16px !important;
            }
            .hero-insecurities-secondary {
              font-size: 20px !important;
              line-height: 1.5 !important;
              margin-top: 24px !important;
              padding: 0 20px !important;
            }
            .hero-ex-moved-on-line {
              font-size: 36px !important;
              line-height: 1.1 !important;
            }
            .hero-its-your-turn {
              margin: 32px auto 0 !important;
              padding: 0 24px !important;
            }
          }
          
          /* Tablet (768px - 1023px) */
          @media (min-width: 768px) and (max-width: 1023px) {
            .hero-headline[data-tablet-size] {
              font-size: var(--tablet-font-size) !important;
              line-height: var(--tablet-line-height) !important;
            }
            .hero-headline[data-tablet-size]:not(:first-child) {
              margin-top: calc(var(--desktop-margin-top) * 0.75) !important;
            }
          }
          
          /* Desktop (min-width: 1024px) */
          @media (min-width: 1024px) {
            .hero-headline[data-desktop-size] {
              font-size: var(--desktop-font-size) !important;
              line-height: var(--desktop-line-height) !important;
              letter-spacing: var(--desktop-letter-spacing) !important;
            }
            .hero-headline[data-desktop-size]:not(:first-child) {
              margin-top: var(--desktop-margin-top) !important;
            }
          }
          
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.8;
              transform: scale(1.1);
            }
          }
          
          /* Brainwash Button Hover Effects */
          .brainwash-button {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform: translateY(0) scale(1);
            box-shadow: none;
          }
          
          .brainwash-button:hover {
            transform: translateY(-4px) scale(1.02);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25), 0 0 40px rgba(255, 255, 255, 0.1);
          }
          
          .brainwash-button:active {
            transform: translateY(-2px) scale(0.98);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), 0 0 30px rgba(255, 255, 255, 0.08);
          }
          
          /* Smooth focus state for accessibility */
          .brainwash-button:focus-visible {
            outline: 2px solid rgba(255, 255, 255, 0.5);
            outline-offset: 4px;
            transform: translateY(-2px) scale(1.01);
          }
          
          /* Glassy shine animation */
          .glass-shine {
            background: linear-gradient(
              90deg,
              transparent 0%,
              rgba(255, 255, 255, 0.05) 40%,
              rgba(255, 255, 255, 0.15) 50%,
              rgba(255, 255, 255, 0.05) 60%,
              transparent 100%
            );
            background-size: 200% 100%;
            animation: shine 6s ease-in-out infinite;
            opacity: 0.6;
            mix-blend-mode: overlay;
          }
          
          @keyframes shine {
            0% {
              background-position: -200% 0;
            }
            50% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }
          
          .brainwash-button:hover .glass-shine {
            animation-duration: 4s;
            opacity: 0.8;
          }
        `
      }} />
    </section>
  )
}
