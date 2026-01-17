"use client"

import { useRouter } from "next/navigation"
import { ShuffleCards } from "@/components/ui/testimonial-cards"

const testimonials = [
  {
    id: 1,
    testimonial: "I had a board presentation at 9am. Barely slept. At 7:15, Lulu called. She'd looked up who was in the room and told me I was ready. I walked in calm.",
    author: "Sarah, 32, Founder"
  },
  {
    id: 2,
    testimonial: "She called me on a random Tuesday. Said she noticed I hadn't been sleeping well for a week. Asked if I was okay. I wasn't. But it helped that she noticed.",
    author: "Marcus, 28, Engineer"
  },
  {
    id: 3,
    testimonial: "The morning of my Google interview, my phone rang. 'Hey, just wanted you to know - you've got this.' I cried. Then I got the job.",
    author: "Priya, 26, Designer"
  },
  {
    id: 4,
    testimonial: "She doesn't call every day. But when she does, it's always the right moment. Like she actually knows what's going on in my life.",
    author: "Jamie, 31, Product Manager"
  }
]

export default function SocialProof() {
  const router = useRouter()

  return (
    <section className="relative w-full py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-primary/95 to-primary">
      <div className="max-w-6xl mx-auto">
        <div className="space-y-8 sm:space-y-12">
          {/* Section Title */}
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-2 sm:mb-4 text-balance">
              WHAT PEOPLE ARE SAYING
            </h2>
          </div>

          {/* Testimonial Cards - All Devices */}
          <div className="flex justify-center items-center min-h-[400px] sm:min-h-[500px] py-8" style={{ overflow: 'visible' }}>
            <ShuffleCards testimonials={testimonials} />
          </div>

          {/* CTA */}
          <div className="text-center pt-6 sm:pt-8">
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-6 sm:mb-8">
              4,847 people stopped waiting to feel ready
            </p>
            <button
              onClick={() => router.push("/signup")}
              className="px-8 sm:px-12 py-3 sm:py-4 text-base sm:text-lg font-bold text-white rounded-full transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                background: "var(--gradient-hero)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
              }}
            >
              Join them →
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

