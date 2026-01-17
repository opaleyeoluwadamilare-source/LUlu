"use client"

import { motion } from "framer-motion"

const callMoments = [
  {
    moment: "Before your investor pitch",
    detail: "with research on who's in the room"
  },
  {
    moment: "When your sleep's been off for a week",
    detail: "to ask what's going on"
  },
  {
    moment: "The morning of your interview",
    detail: "to remind you you're ready"
  },
  {
    moment: "When your patterns show you're in a slump",
    detail: "just to check in"
  },
  {
    moment: "After the hard conversation",
    detail: "to see how you're holding up"
  },
  {
    moment: "When you need it",
    detail: "not when a schedule says so"
  }
]

export default function WhenLuluCalls() {
  return (
    <section className="relative w-full py-16 sm:py-24 px-4 sm:px-6 bg-white overflow-hidden">
      {/* Subtle gradient background */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          background: "var(--gradient-hero)",
        }}
      />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Section Title */}
        <div className="text-center mb-12 sm:mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 mb-4 text-balance uppercase tracking-tighter"
          >
            WHEN LULU <span className="text-transparent bg-clip-text" style={{ backgroundImage: "var(--gradient-hero)" }}>CALLS</span>
          </motion.h2>
        </div>

        {/* Call Moments List */}
        <div className="space-y-4 sm:space-y-6">
          {callMoments.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group"
            >
              <div className="flex items-start gap-4 p-4 sm:p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-gray-100 hover:border-gray-200 transition-all duration-300">
                <div
                  className="w-3 h-3 rounded-full mt-2 flex-shrink-0"
                  style={{ background: "var(--gradient-hero)" }}
                />
                <div className="flex-1">
                  <p className="text-lg sm:text-xl font-bold text-gray-900">
                    {item.moment}
                  </p>
                  <p className="text-gray-600 mt-1">
                    {item.detail}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center mt-12 sm:mt-16"
        >
          <p className="text-gray-500 text-lg italic">
            She's not going to spam you. She pays attention.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
