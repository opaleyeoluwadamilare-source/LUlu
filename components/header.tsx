"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

export default function Header() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showFloatingButton, setShowFloatingButton] = useState(false)

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Track scroll position
  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY || window.pageYOffset

          if (isMobile) {
            // Mobile: hide header when scrolling, show when at top
            if (scrollY < 10) {
              setIsScrolled(false) // Show at top
            } else {
              setIsScrolled(true) // Hide when scrolling
            }
          } else {
            // Desktop: hide header IMMEDIATELY when user starts scrolling
            setIsScrolled(scrollY > 0)

            // Desktop: Show floating button only when past hero section (in second section)
            const heroSection = document.querySelector('.hero-section')
            if (heroSection) {
              const heroRect = heroSection.getBoundingClientRect()
              // Show button when hero section is out of view (scrolled past it)
              setShowFloatingButton(heroRect.bottom < 0)
            }
          }

          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial check

    return () => window.removeEventListener('scroll', handleScroll)
  }, [isMobile])

  return (
    <>
      {/* Full Header - Desktop: fixed, hides immediately on scroll. Mobile: fixed but static (doesn't move), hides when scrolling */}
      <header
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm transition-all duration-500 ease-out"
        style={{
          background: "var(--gradient-header)",
          paddingTop: "env(safe-area-inset-top, 0px)",
          willChange: 'transform, opacity',
          backfaceVisibility: 'hidden',
          opacity: isScrolled ? 0 : 1,
          transform: isScrolled ? 'translateY(-100%)' : 'translateY(0)',
          pointerEvents: isScrolled ? 'none' : 'auto',
        }}
      >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-80 transition"
        >
          <div className="w-9 sm:w-10 h-9 sm:h-10 flex items-center justify-center">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6 sm:w-7 sm:h-7"
            >
              <path
                d="M19.36 10.04C18.67 6.59 15.64 4 12 4C9.11 4 6.6 5.64 5.35 8.04C2.34 8.36 0 10.91 0 14C0 17.31 2.69 20 6 20H19C21.76 20 24 17.76 24 15C24 12.36 21.95 10.22 19.36 10.04Z"
                fill="white"
              />
            </svg>
          </div>
          <span className="text-lg sm:text-xl font-bold text-white">BeDelulu</span>
        </button>

        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-white hover:text-white/80 transition text-sm font-medium border-b-2 border-white/50 bg-transparent border-0 cursor-pointer"
          >
            Home
          </button>
          <button
            onClick={() => {
              const element = document.getElementById('faq')
              element?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="text-white/70 hover:text-white transition text-sm font-medium bg-transparent border-0 cursor-pointer"
          >
            FAQ
          </button>
          <button
            onClick={() => {
              const element = document.getElementById('three-things')
              element?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="text-white/70 hover:text-white transition text-sm font-medium bg-transparent border-0 cursor-pointer"
          >
            About
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/signup")}
            className="hidden md:block px-4 sm:px-6 py-2 rounded-full border border-white/30 text-white hover:bg-white/10 transition text-xs sm:text-sm font-medium cursor-pointer"
          >
            GET STARTED
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {mobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

    </header>

      {/* Floating Get Started Button - Desktop only, shows when scrolled past hero section */}
      {!isMobile && (
        <button
          onClick={() => router.push("/signup")}
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-full text-white font-semibold text-sm transition-all duration-500 ease-out shadow-lg hover:scale-105 active:scale-95 cursor-pointer ${
            showFloatingButton
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
          style={{
            background: "var(--gradient-hero)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.15)",
            paddingTop: `calc(0.75rem + env(safe-area-inset-top, 0px))`,
            willChange: 'transform, opacity',
            backfaceVisibility: 'hidden',
          }}
          aria-label="Get Started"
        >
          GET STARTED
        </button>
      )}

      {/* Mobile Bottom Sheet Menu - Popup from bottom */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop overlay - closes menu on click */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-[9998] md:hidden"
              style={{
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            />

            {/* Bottom sheet menu */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{
                duration: 0.45,
                ease: [0.16, 1, 0.3, 1],
                type: 'spring',
                damping: 28,
                stiffness: 320
              }}
              className="fixed bottom-0 left-0 right-0 z-[9999] md:hidden bg-white rounded-t-[2rem] shadow-2xl"
              style={{
                height: '60vh',
                minHeight: '400px',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                willChange: 'transform',
                backfaceVisibility: 'hidden',
                WebkitFontSmoothing: 'antialiased',
                overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle indicator */}
              <div className="flex justify-center pt-4 pb-3 sticky top-0 bg-white z-10">
                <div className="w-14 h-1.5 bg-gray-300 rounded-full" />
              </div>

              {/* Menu items */}
              <nav className="flex flex-col px-5 py-3 pb-8">
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    try {
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                      setMobileMenuOpen(false)
                    } catch (error) {
                      window.scrollTo(0, 0)
                      setMobileMenuOpen(false)
                    }
                  }}
                  className="text-gray-900 py-5 px-4 text-lg font-medium text-left bg-transparent border-0 cursor-pointer rounded-xl transition-all duration-200 relative overflow-hidden group hover:bg-gray-50 active:bg-gray-100"
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}
                >
                  <span className="relative z-10">Home</span>
                </motion.button>

                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    try {
                      const element = document.getElementById('faq')
                      if (element) {
                        const headerOffset = 80
                        const elementPosition = element.getBoundingClientRect().top
                        const offsetPosition = elementPosition + window.pageYOffset - headerOffset

                        window.scrollTo({
                          top: offsetPosition,
                          behavior: 'smooth'
                        })
                        setMobileMenuOpen(false)
                      } else {
                        setMobileMenuOpen(false)
                      }
                    } catch (error) {
                      const element = document.getElementById('faq')
                      if (element) {
                        element.scrollIntoView({ behavior: 'auto', block: 'start' })
                      }
                      setMobileMenuOpen(false)
                    }
                  }}
                  className="text-gray-900 py-5 px-4 text-lg font-medium text-left bg-transparent border-0 cursor-pointer rounded-xl transition-all duration-200 relative overflow-hidden group hover:bg-gray-50 active:bg-gray-100"
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}
                >
                  <span className="relative z-10">FAQ</span>
                </motion.button>

                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    try {
                      const element = document.getElementById('three-things')
                      if (element) {
                        const headerOffset = 80
                        const elementPosition = element.getBoundingClientRect().top
                        const offsetPosition = elementPosition + window.pageYOffset - headerOffset

                        window.scrollTo({
                          top: offsetPosition,
                          behavior: 'smooth'
                        })
                        setMobileMenuOpen(false)
                      } else {
                      setMobileMenuOpen(false)
                      }
                    } catch (error) {
                      const element = document.getElementById('three-things')
                      if (element) {
                        element.scrollIntoView({ behavior: 'auto', block: 'start' })
                      }
                      setMobileMenuOpen(false)
                    }
                  }}
                  className="text-gray-900 py-5 px-4 text-lg font-medium text-left bg-transparent border-0 cursor-pointer rounded-xl transition-all duration-200 relative overflow-hidden group hover:bg-gray-50 active:bg-gray-100"
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}
                >
                  <span className="relative z-10">About</span>
                </motion.button>

                {/* Get Started button in mobile menu */}
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setMobileMenuOpen(false)
                    router.push("/signup")
                  }}
                  className="mt-4 py-4 px-6 text-lg font-semibold text-white text-center rounded-full cursor-pointer transition-all duration-200"
                  style={{
                    background: "var(--gradient-hero)",
                  }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="relative z-10">Get Started →</span>
                </motion.button>
              </nav>

              {/* Spacer at bottom for visual balance - white space as requested */}
              <div className="h-24" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
