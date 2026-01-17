"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { formatCallTimeWithConversion, getHoursUntilCall, TIMEZONE_OPTIONS } from "@/lib/timezone-utils"
import dynamic from "next/dynamic"

// Dynamically import QR code to avoid SSR issues
const QRCodeSVG = dynamic(() => import('qrcode.react').then(mod => mod.QRCodeSVG), { ssr: false })

interface OnboardingData {
  name: string
  timeRange: string
  callTime: string
  timezone: string
  plan: string
  userStory?: string
  extractedData?: {
    goal?: string
    insecurity?: string
    blocker?: string
  }
}

// Lulu's phone number
const LULU_PHONE_NUMBER = "+1 (646) 517-1423"
const LULU_PHONE_CLEAN = "+16465171423" // Clean format for tel: links and vCard

function ThankYouContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState<OnboardingData | null>(null)
  const [callTime, setCallTime] = useState<string>("")
  const [hoursUntil, setHoursUntil] = useState<number>(0)
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop' | null>(null)
  const [showQRCode, setShowQRCode] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Detect device type
    if (typeof window !== "undefined") {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      setDeviceType(isMobile ? 'mobile' : 'desktop')
    }

    // Get data from localStorage - try multiple possible keys
    if (typeof window !== "undefined") {
      // Try the expected key first
      let saved = localStorage.getItem("delulu_onboarding_data")

      // If not found, try to reconstruct from available data
      if (!saved) {
        const customerId = localStorage.getItem("customer_record_id")
        // We can't get full data without an API call, so use defaults
        // In production, you might want to fetch from API using customer ID
        const defaultData: OnboardingData = {
          name: "",
          timeRange: "7:00 AM",
          callTime: "7:00 AM",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          plan: "standard",
        }
        setData(defaultData)
        setCallTime("7:00am ET")
        return
      }

        try {
          const parsed = JSON.parse(saved)
          setData(parsed)

          const timeMap: Record<string, string> = {
            early: "6:00am",
            morning: "7:00am",
            sleeping: "8:00am",
            westcoast: "9:00am",
          }

        // Use callTime if available, otherwise parse timeRange
        let baseTime = parsed.callTime || "7:00am"
        if (!baseTime.includes("AM") && !baseTime.includes("PM")) {
          if (parsed.timeRange && (parsed.timeRange.includes("AM") || parsed.timeRange.includes("PM"))) {
            baseTime = parsed.timeRange
          } else {
            baseTime = timeMap[parsed.timeRange] || "7:00am"
          }
        }

          const tzInfo = TIMEZONE_OPTIONS.find(tz => tz.value === parsed.timezone)
          const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
          const userTzInfo = TIMEZONE_OPTIONS.find(tz => tz.value === userTimezone)

          const formattedTime = formatCallTimeWithConversion(
            baseTime,
          parsed.timezone || userTimezone,
            userTzInfo?.value
          )

          setCallTime(formattedTime)
        const hours = getHoursUntilCall(baseTime, parsed.timezone || userTimezone)
          setHoursUntil(hours)
        } catch (e) {
          console.error("Error loading data:", e)
        // Set defaults on error
        const defaultData: OnboardingData = {
          name: "",
          timeRange: "7:00 AM",
          callTime: "7:00 AM",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          plan: "standard",
        }
        setData(defaultData)
        setCallTime("7:00am ET")
      }
    }
  }, [])

  const handleSaveContact = () => {
    if (deviceType === 'mobile') {
      // Mobile: Create vCard and trigger download/open
      const vCard = `BEGIN:VCARD\nVERSION:3.0\nFN:Lulu\nORG:Bedelulu\nTEL;TYPE=CELL,VOICE:${LULU_PHONE_CLEAN}\nNOTE:Your AI companion who calls when you need it\nEND:VCARD`
      const blob = new Blob([vCard], { type: 'text/vcard' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'Lulu.vcf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } else {
      // Desktop: Show QR code
      setShowQRCode(true)
    }
  }

  const copyPhoneNumber = async () => {
    try {
      await navigator.clipboard.writeText(LULU_PHONE_NUMBER)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = LULU_PHONE_NUMBER
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!data) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  // Personalized message based on their goal
  const personalizedMessage = data.extractedData?.goal
    ? `I know you're working on ${data.extractedData.goal}. I'm synced up and watching. You'll hear from me when you need it.`
    : "I'm synced up and watching. You won't hear from me every day - just when it matters."

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
      {/* Background effects */}
      <div className="fixed inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
      <div className="fixed inset-0 -z-9" style={{
        background: `
          radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(168, 85, 247, 0.2) 0%, transparent 60%),
          radial-gradient(circle at 50% 50%, rgba(200, 149, 107, 0.1) 0%, transparent 70%)
        `,
        filter: 'blur(80px)',
        WebkitFilter: 'blur(80px)',
      }} />
      <div className="fixed inset-0 -z-8 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
          mixBlendMode: 'overlay',
      }} />

      {/* Main Content */}
      <div className="pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <div className="onboarding-card liquid-glass-card">
            <div className="step-content">
              <h1 className="step-question mb-6">
                Hey {data.name || "there"} 👋
              </h1>

              <p className="step-subtitle mb-6 text-xl">
                {personalizedMessage}
              </p>

              <div className="bg-white/10 rounded-2xl p-6 mb-6 border border-white/20">
                <h2 className="text-xl font-bold text-white mb-2 text-center">
                  I'm here, {data.name || "friend"}.
                </h2>
                <p className="text-white/70 text-center text-sm">
                  Before the big moments. When things seem off. I've got you.
                </p>
              </div>

              {/* Save Lulu's Number Section */}
              <div className="bg-white/10 rounded-2xl p-6 mb-6 border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-2 text-center">
                  Save my number as "Lulu"
                </h3>
                <p className="text-white/80 text-sm mb-4 text-center">
                  So you know it's me when I call
                </p>

                {deviceType === 'mobile' ? (
                  <button
                    onClick={handleSaveContact}
                    className="w-full py-4 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white font-semibold transition active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span className="text-2xl">📱</span>
                    <span>Add to Contacts</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    {!showQRCode ? (
                      <button
                        onClick={handleSaveContact}
                        className="w-full py-4 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white font-semibold transition active:scale-95 flex items-center justify-center gap-2"
                      >
                        <span className="text-2xl">📱</span>
                        <span>Show QR Code</span>
                      </button>
                    ) : (
                      <div className="mt-4 p-6 bg-white rounded-xl">
                        <p className="text-gray-800 text-sm mb-3 text-center font-medium">
                          Scan with your phone camera:
                        </p>
                        <div className="flex justify-center mb-4">
                          <div className="p-4 bg-white rounded-lg">
                            <QRCodeSVG
                              value={`BEGIN:VCARD\nVERSION:3.0\nFN:Lulu\nORG:Bedelulu\nTEL;TYPE=CELL,VOICE:${LULU_PHONE_CLEAN}\nNOTE:Your AI companion who calls when you need it\nEND:VCARD`}
                              size={200}
                              level="H"
                            />
                          </div>
                        </div>
                        <p className="text-gray-600 text-xs mb-3 text-center">
                          Or copy the number:
                        </p>
                        <button
                          onClick={copyPhoneNumber}
                          className="w-full py-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition text-gray-800 font-semibold text-lg"
                        >
                          {copied ? '✓ Copied!' : LULU_PHONE_NUMBER}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="text-left space-y-4 mb-6">
                    <div>
                  <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    <span>✓</span>
                    <span>I'm watching your calendar</span>
                  </h3>
                  <p className="text-white/80 text-sm ml-7">
                    Before big meetings, interviews, or hard conversations - I'll reach out.
                      </p>
                    </div>

                    <div>
                  <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    <span>✓</span>
                    <span>I'm noticing your patterns</span>
                  </h3>
                  <p className="text-white/80 text-sm ml-7">
                    If your sleep drops or something seems off, you'll hear from me.
                      </p>
                    </div>

                    <div>
                  <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    <span>✓</span>
                    <span>I'm here when it matters</span>
                  </h3>
                  <p className="text-white/80 text-sm ml-7">
                    Not every day. Just the right day.
                      </p>
                </div>
              </div>

              <p className="text-white/90 text-lg mb-6 font-medium text-center">
                I'll be here when you need me, {data.name || "friend"}.<br/>
                - Lulu
              </p>

              <button
                onClick={() => router.push("/")}
                className="continue-button w-full"
              >
                BACK TO HOME
              </button>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          .liquid-glass-card {
            border-radius: 32px;
            padding: 60px;
            background: rgba(255, 255, 255, 0.12);
            backdrop-filter: blur(30px) saturate(180%);
            -webkit-backdrop-filter: blur(30px) saturate(180%);
            border: 1px solid rgba(255, 255, 255, 0.25);
            box-shadow:
              0 20px 60px rgba(0, 0, 0, 0.3),
              0 0 0 1px rgba(255, 255, 255, 0.1) inset,
              0 1px 0 rgba(255, 255, 255, 0.2) inset,
              0 -1px 0 rgba(255, 255, 255, 0.05) inset;
          }

          .step-question {
            display: block;
            font-size: 48px;
            font-weight: 700;
            letter-spacing: -0.02em;
            color: #FFFFFF;
            line-height: 1.2;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            text-align: center;
          }

          .step-subtitle {
            font-size: 20px;
            opacity: 0.85;
            font-weight: 400;
            color: rgba(255, 255, 255, 0.9);
            line-height: 1.5;
            text-align: center;
          }

          .continue-button {
            padding: 18px 48px;
            border-radius: 50px;
            font-weight: 700;
            font-size: 18px;
            background: rgba(255, 255, 255, 0.95);
            color: #4a6db8;
            border: 1px solid rgba(255, 255, 255, 0.3);
            cursor: pointer;
            box-shadow:
              0 4px 16px rgba(0, 0, 0, 0.15),
              0 1px 0 rgba(255, 255, 255, 0.6) inset;
            transition: all 0.2s ease;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
          }

          .continue-button:hover {
            transform: translateY(-2px);
            box-shadow:
              0 6px 20px rgba(0, 0, 0, 0.2),
              0 1px 0 rgba(255, 255, 255, 0.7) inset;
            background: rgba(255, 255, 255, 1);
          }

          @media (max-width: 768px) {
            .liquid-glass-card {
              padding: 40px !important;
              border-radius: 24px;
            }

            .step-question {
              font-size: 36px;
            }
          }
        `
      }} />
    </div>
  )
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <ThankYouContent />
    </Suspense>
  )
}
