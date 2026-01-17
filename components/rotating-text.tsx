"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

const RotatingText = () => {
  const texts = [
    { prefix: "", bold: "Before", suffix: " the meeting you can't stop thinking about" },
    { prefix: "", bold: "When", suffix: " you haven't been sleeping" },
    { prefix: "", bold: "The morning", suffix: " everything feels heavy" },
    { prefix: "", bold: "After", suffix: " the conversation you were dreading" },
    { prefix: "", bold: "When", suffix: " she senses something's off" }
  ]
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % texts.length)
    }, 3500)

    return () => clearInterval(interval)
  }, [texts.length])

  return (
    <span style={{ display: "inline-block", position: "relative" }}>
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ 
            display: "inline-block",
            color: "white"
          }}
        >
          <span style={{ opacity: 0.9, color: "white" }}>{texts[index].prefix}</span>
          <span style={{ fontWeight: 700, color: "white" }}>{texts[index].bold}</span>
          <span style={{ opacity: 0.9, color: "white" }}>{texts[index].suffix}</span>
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export default RotatingText
