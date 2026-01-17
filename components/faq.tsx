"use client"

import { useState } from "react"

const faqs = [
  { q: "What does Lulu do?", a: "Lulu syncs with your calendar and health data. She watches for high-stakes moments and signs you're struggling. When she senses you need it, she calls. Not every day - just when it matters." },
  { q: "How often will she call?", a: "Depends on your life. Before a big meeting when you're not sleeping? She'll call. Random Tuesday when everything's fine? She stays quiet. Most people hear from her a few times a month." },
  { q: "What if I don't pick up?", a: "She sends a short supportive text instead. No guilt. She's not needy." },
  { q: "What does she know about me?", a: "Your calendar events, your sleep and heart rate patterns (if you connect Health), and everything you've told her. She uses this to know when to reach out and what to say." },
  { q: "Does Lulu remember things?", a: "Yes. She remembers what you told her - your goals, your fears, how past conversations went. She gets better over time." },
  { q: "Can I call her whenever I want?", a: "Not yet. The point is she comes to you at the moment you need it. You don't have to remember to ask for help." },
  {
    q: "Is this just therapy?",
    a: "No. Lulu isn't a therapist. She's the friend who somehow always knows when to call.",
  },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="relative py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-primary to-primary/90">
      <div className="max-w-4xl mx-auto">
        {/* Section Title */}
        <div className="mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-2 sm:mb-4 text-balance">
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <p className="text-base sm:text-xl text-primary-foreground/60">(From People Who Think Too Much)</p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="group border border-foreground/10 rounded-lg overflow-hidden hover:border-foreground/20 transition bg-foreground/5 active:scale-95 sm:active:scale-100"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full p-4 sm:p-6 text-left flex items-center justify-between hover:bg-foreground/5 transition min-h-14 sm:min-h-16"
              >
                <span className="text-base sm:text-lg font-semibold text-primary-foreground pr-2">{faq.q}</span>
                <span
                  className={`text-xl sm:text-2xl text-primary-foreground/60 transition transform flex-shrink-0 ${openIndex === index ? "rotate-180" : ""}`}
                >
                  ▼
                </span>
              </button>

              {openIndex === index && (
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 text-sm sm:text-base text-primary-foreground/70 border-t border-foreground/10 pt-4 whitespace-pre-line">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
