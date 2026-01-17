"use client"
import Header from "@/components/header"
import Hero from "@/components/hero"
import ResultsCompartment from "@/components/results-compartment"
import HowLuluDecides from "@/components/how-lulu-decides"
import ThreeThings from "@/components/three-things"
import WhenLuluCalls from "@/components/when-lulu-calls"
import FAQ from "@/components/faq"
import FinalCTA from "@/components/final-cta"
import Footer from "@/components/footer"

export default function Home() {
  return (
    <main
      className="overflow-hidden"
      style={{
        overscrollBehavior: 'none',
        overscrollBehaviorY: 'none',
        minHeight: '100vh',
        position: 'relative',
      }}
    >
      <Header />
      <Hero />
      <ResultsCompartment />
      <HowLuluDecides />
      <ThreeThings />
      <WhenLuluCalls />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  )
}
