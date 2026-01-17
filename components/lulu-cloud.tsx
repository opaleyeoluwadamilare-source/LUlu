"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

// Lulu Cloud Character Component
export const LuluCloud = ({ 
  mood = "default", 
  message = "",
  isTyping = false 
}: { 
  mood?: "default" | "excited" | "thinking" | "listening" | "love" | "writing"
  message?: string 
  isTyping?: boolean
}) => {
  const [clickCount, setClickCount] = useState(0)
  const [tempMessage, setTempMessage] = useState<string | null>(null)
  const [tempMood, setTempMood] = useState<string | null>(null)
  const [wiggle, setWiggle] = useState(0)

  const handleInteraction = () => {
    setClickCount(prev => prev + 1)
    setWiggle(prev => prev + 1) // Trigger animation key change

    // Clear any existing timeout to reset the timer if clicked rapidly
    const timeoutId = setTimeout(() => {
      setTempMessage(null)
      setTempMood(null)
    }, 3500)

    if (clickCount === 0) {
      setTempMessage("Hey! That's actually ticklish!")
      setTempMood("excited")
    } else if (clickCount === 1) {
      setTempMessage("Okay, that's enough poking.")
      setTempMood("default")
    } else {
      setTempMessage("I think you should actually get back to where you left off.")
      setTempMood("thinking")
      setClickCount(0) // Reset cycle after the "scold"
    }
  }

  const currentMessage = tempMessage || message
  const currentMood = (tempMood || mood) as "default" | "excited" | "thinking" | "listening" | "love" | "writing"

  return (
    <div className="relative flex flex-col items-center justify-center mb-8 z-20 select-none">
      {/* Speech Bubble */}
      <AnimatePresence mode="wait">
        {(currentMessage || isTyping) && (
          <motion.div
            key={currentMessage} // Re-animate on message change
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="mb-4 relative bg-black text-white px-6 py-3 rounded-2xl rounded-bl-none shadow-xl max-w-[280px] text-center"
          >
            {isTyping && !tempMessage ? (
              <div className="flex gap-1 h-6 items-center justify-center">
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} className="w-2 h-2 bg-white rounded-full" />
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} className="w-2 h-2 bg-white rounded-full" />
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} className="w-2 h-2 bg-white rounded-full" />
              </div>
            ) : (
              <p className="font-bold text-sm sm:text-base">{currentMessage}</p>
            )}
            <div className="absolute bottom-0 left-0 w-4 h-4 bg-black translate-y-1/2 -translate-x-1/4 [clip-path:polygon(0_0,100%_0,100%_100%)]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cloud Character */}
      <motion.div
        onClick={handleInteraction}
        animate={{ 
          y: [0, -10, 0],
          scale: currentMood === "excited" ? [1, 1.1, 1] : 1,
          rotate: wiggle % 2 === 0 ? [0, -5, 5, 0] : [0, 5, -5, 0] // Wiggle on click
        }}
        transition={{ 
          y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          scale: { duration: 0.5, repeat: currentMood === "excited" ? 1 : 0 },
          rotate: { duration: 0.3, ease: "easeInOut" } // Fast wiggle
        }}
        // Add key to trigger re-animation on click
        key={wiggle}
        className="w-28 h-28 relative cursor-pointer hover:scale-105 transition-transform duration-200 active:scale-95"
      >
        {/* Main Body Gradient */}
        <div className="absolute inset-0 rounded-full blur-xl bg-gradient-to-r from-orange-300 via-amber-200 to-orange-300 opacity-40 animate-pulse" />
        
        {/* Cloud Shape SVG */}
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl relative z-10">
          <path
            d="M25,60 a20,20 0 0,1 0,-40 a25,25 0 0,1 50,0 a20,20 0 0,1 0,40 z"
            fill="url(#cloudGradient)"
            className="filter drop-shadow-lg"
          />
          <defs>
            <linearGradient id="cloudGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f3f4f6" />
            </linearGradient>
          </defs>
          
          {/* Face Expressions */}
          <g transform="translate(25, 35)">
            {currentMood === "default" && (
              <>
                <circle cx="15" cy="15" r="3" fill="#1a1a1a" />
                <circle cx="35" cy="15" r="3" fill="#1a1a1a" />
                <path d="M20,25 Q25,30 30,25" fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
              </>
            )}
            {currentMood === "excited" && (
              <>
                <path d="M12,15 L18,15" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M32,15 L38,15" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M18,25 Q25,38 32,25" fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
                <motion.g animate={{ opacity: [0, 1, 0], y: -15, x: 5 }} transition={{ duration: 1.5, repeat: Infinity }}>
                  <text x="45" y="-5" fontSize="14">✨</text>
                </motion.g>
              </>
            )}
            {currentMood === "listening" && (
              <>
                 <circle cx="15" cy="15" r="3" fill="#1a1a1a" />
                 <circle cx="35" cy="15" r="3" fill="#1a1a1a" />
                 <circle cx="25" cy="28" r="2" fill="#1a1a1a" /> 
              </>
            )}
            {currentMood === "thinking" && (
              <>
                <circle cx="15" cy="15" r="3" fill="#1a1a1a" />
                <circle cx="35" cy="15" r="3" fill="#1a1a1a" />
                <path d="M22,28 L28,28" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
                <motion.g animate={{ opacity: [0, 1, 0], x: 5 }} transition={{ duration: 2, repeat: Infinity }}>
                   <circle cx="45" cy="10" r="1.5" fill="#9ca3af" />
                   <circle cx="48" cy="5" r="2" fill="#9ca3af" />
                </motion.g>
              </>
            )}
             {currentMood === "writing" && (
              <>
                <circle cx="15" cy="18" r="3" fill="#1a1a1a" />
                <circle cx="35" cy="18" r="3" fill="#1a1a1a" />
                <path d="M22,28 Q25,30 28,28" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
              </>
            )}
            {currentMood === "love" && (
              <>
                <text x="8" y="20" fontSize="14">❤️</text>
                <text x="28" y="20" fontSize="14">❤️</text>
                <path d="M20,28 Q25,34 30,28" fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
              </>
            )}
          </g>
        </svg>
      </motion.div>
    </div>
  )
}
