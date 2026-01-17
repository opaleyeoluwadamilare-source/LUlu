"use client"

export default function Footer() {
  return (
    <footer 
      className="relative bg-primary border-t border-foreground/10 py-12 sm:py-16 px-4 sm:px-6"
      style={{
        overscrollBehavior: 'none',
        overscrollBehaviorY: 'none',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Disclaimer */}
        <div className="max-w-3xl mx-auto mb-8 sm:mb-12 p-5 sm:p-8 rounded-lg bg-foreground/5 border border-foreground/10">
          <h3 className="text-base sm:text-lg font-bold text-primary-foreground mb-3 sm:mb-4">DISCLAIMER:</h3>
          <div className="space-y-3 sm:space-y-4 text-primary-foreground/70 text-xs sm:text-sm leading-relaxed">
            <p>
              This service is not therapy, medical advice, or a substitute for professional help. Lulu is an AI that syncs with your calendar and health data to reach out when she senses you need support.
            </p>
            <p>
              If you're experiencing mental health issues, please talk to a licensed professional. Lulu is a supportive friend, not clinical care.
            </p>
            <p>
              By signing up, you agree that:
              <br />• You're at least 18 years old
              <br />• You understand this is an AI service (not a real person)
              <br />• You consent to calendar and health data access for call timing
              <br />• You won't hold us liable for your newfound sense of support
            </p>
            <p>
              She calls when you need her.
            </p>
          </div>
        </div>

        {/* Legal Links and Info */}
        <div className="space-y-6 sm:space-y-8">
          {/* Bottom Links - Removed until pages are created */}

          {/* Copyright */}
          <p className="text-center text-primary-foreground/50 text-xs pt-4">
            © 2025 BeDelulu. All rights reserved.
            <br />
            We're not liable for anything. Seriously.
          </p>
        </div>
      </div>
    </footer>
  )
}
