"use client"

import { useRouter } from "next/navigation"
import RotatingText from "./rotating-text"

export default function Hero() {
  const router = useRouter()

  const handleBrainwashClick = () => {
    try {
      router.push("/signup")
    } catch (error) {
      console.error("Navigation error:", error)
      window.location.href = "/signup"
    }
  }

  return (
    <section 
      className="relative w-full hero-section" 
      style={{ 
        background: "var(--gradient-hero)", 
        minHeight: "calc(100vh - 72px)",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent z-0" />
      {/* Smooth gradient dissolve transition to next section */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-40 sm:h-56 md:h-72 lg:h-80 z-0 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, transparent 0%, rgba(255, 255, 255, 0.05) 15%, rgba(255, 255, 255, 0.15) 30%, rgba(255, 255, 255, 0.35) 45%, rgba(255, 255, 255, 0.55) 60%, rgba(255, 255, 255, 0.75) 75%, rgba(255, 255, 255, 0.9) 88%, white 100%)",
          mixBlendMode: "normal",
        }}
      />

      <div 
        className="hero-section-container mx-auto flex flex-col justify-center items-center text-center relative z-10"
        style={{
          maxWidth: "1100px",
          padding: "140px 24px 80px",
          minHeight: "calc(100vh - 72px)",
        }}
      >
        {/* Main Headline - ONE LINE */}
        <h1 
          className="hero-main-headline"
          style={{
            fontSize: "44px",
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: "-3px",
            color: "#FFFFFF",
            textTransform: "uppercase",
            maxWidth: "1000px",
            marginBottom: "32px",
            marginTop: 0,
            textAlign: "center",
            textShadow: "0 4px 24px rgba(0, 0, 0, 0.15)",
          }}
        >
          SOMEONE WHO KNOWS WHEN TO CHECK IN
        </h1>

        {/* Subtext */}
        <div 
          className="hero-subtext"
          style={{
            fontSize: "20px",
            fontWeight: 500,
            lineHeight: 1.4,
            color: "rgba(255, 255, 255, 0.95)",
            opacity: 0.95,
            marginBottom: "40px",
            marginTop: 0,
            textAlign: "center",
            maxWidth: "1000px",
            minHeight: "1.4em",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}
        >
          <RotatingText />
        </div>

        {/* Button */}
        <button 
          onClick={handleBrainwashClick}
          className="brainwash-button"
          style={{
            marginTop: "40px",
            padding: "20px 48px",
            fontSize: "18px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "#1a1a1a",
            backgroundColor: "#FFFFFF",
            border: "none",
            borderRadius: "50px",
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: "translateY(0)",
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          TALK TO LULU <span className="arrow">→</span>
        </button>

        {/* Below Button Text */}
        <div 
          className="hero-below-button"
          style={{
            marginTop: "40px",
            fontSize: "16px",
            fontWeight: 500,
            textAlign: "center",
            lineHeight: 1.5,
            color: "#FFFFFF",
          }}
        >
          <div style={{ opacity: 0.8 }}>She syncs with your life. She calls when you need her.</div>
          <div style={{ marginTop: "8px", opacity: 0.9, fontWeight: "bold" }}>
            Not every day. Just the right day.
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          /* Hide navigation buttons in bottom left during hero section */
          .hero-section ~ * [data-sidebar="trigger"],
          .hero-section ~ * button[data-sidebar="trigger"],
          .hero-section ~ * .sidebar-trigger,
          .hero-section ~ * nav[class*="bottom"],
          .hero-section ~ * [class*="bottom-left"] {
            display: none !important;
          }
          
          /* Button Shimmer Effect */
          .brainwash-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
            transition: left 0.5s;
          }
          
          .brainwash-button:hover::before {
            left: 100%;
          }
          
          /* Arrow Animation */
          .brainwash-button .arrow {
            display: inline-block;
            transition: transform 0.3s ease;
          }
          
          .brainwash-button:hover .arrow {
            transform: translateX(4px);
          }
          
          /* Button Hover Effects */
          .brainwash-button:hover {
            transform: translateY(-3px) scale(1.02) !important;
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25) !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          
          .brainwash-button:active {
            transform: translateY(-1px) scale(0.98) !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
          }
          
          .brainwash-button:focus-visible {
            outline: 2px solid rgba(255, 255, 255, 0.5);
            outline-offset: 4px;
          }
          
          /* Mobile (max-width: 768px) */
          @media (max-width: 768px) {
            .hero-section {
              min-height: calc(100vh - 64px) !important;
            }
            .hero-section-container {
              padding: 80px 20px 60px !important;
              min-height: calc(100vh - 64px) !important;
            }
            .hero-main-headline {
              font-size: 44px !important;
              letter-spacing: -1px !important;
              line-height: 1.05 !important;
              margin-bottom: 22px !important;
              padding: 0 16px;
            }
            .hero-subtext {
              font-size: 20px !important;
              margin-bottom: 28px !important;
              padding: 0 16px;
              max-width: 90% !important;
              margin-left: auto !important;
              margin-right: auto !important;
            }
            .brainwash-button {
              margin-top: 28px !important;
              padding: 16px 40px !important;
              font-size: 16px !important;
              min-height: 48px !important;
            }
            .brainwash-button:hover {
              transform: translateY(0) scale(1) !important;
            }
            .brainwash-button:active {
              transform: scale(0.95) !important;
              background-color: #f5f5f5 !important;
            }
            .brainwash-button:hover .arrow {
              transform: translateX(0);
            }
          }
          
          /* Tablet (769px - 1023px) */
          @media (min-width: 769px) and (max-width: 1023px) {
            .hero-main-headline {
              font-size: 64px !important;
              letter-spacing: -2.5px !important;
            }
            .hero-subtext {
              font-size: 24px !important;
            }
          }
          
          /* Desktop (min-width: 1024px) */
          @media (min-width: 1024px) {
            .hero-section {
              min-height: calc(100vh - 72px) !important;
            }
            .hero-section-container {
              padding-top: 140px !important;
              min-height: calc(100vh - 72px) !important;
            }
            .hero-main-headline {
              font-size: 84px !important;
              letter-spacing: -3px !important;
              line-height: 1.05 !important;
            }
            .hero-subtext {
              font-size: 28px !important;
            }
          }
        `
      }} />
    </section>
  )
}
