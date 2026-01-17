"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { LuluCloud } from "@/components/lulu-cloud"

// Connection types
interface Connections {
  calendar: "google" | "apple" | "outlook" | null
  health: "apple" | "fitbit" | "oura" | "whoop" | null
  tasks: "todoist" | "reminders" | null
}

interface FormData {
  name: string
  phone: string
  connections: Connections
  customWatchFor: string
}

// Helper function to capitalize first letter of name
const capitalizeName = (name: string): string => {
  if (!name) return name
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}

// Connection Button Component
const ConnectionButton = ({
  icon,
  name,
  connected,
  connecting,
  onClick
}: {
  icon: React.ReactNode
  name: string
  connected: boolean
  connecting: boolean
  onClick: () => void
}) => {
  return (
    <button
      onClick={onClick}
      disabled={connecting}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
        connected
          ? "bg-green-50 border-green-300 text-green-800"
          : "bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700"
      }`}
    >
      <div className="w-8 h-8 flex items-center justify-center">
        {connecting ? (
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        ) : connected ? (
          <span className="text-green-600 text-lg">✓</span>
        ) : (
          icon
        )}
      </div>
      <span className="font-medium text-sm">{connected ? `${name} Connected` : name}</span>
    </button>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [luluMood, setLuluMood] = useState<"default" | "excited" | "thinking" | "listening" | "love" | "writing">("default")
  const [connectingService, setConnectingService] = useState<string | null>(null)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [callTriggered, setCallTriggered] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    name: "",
    phone: "",
    connections: {
      calendar: null,
      health: null,
      tasks: null
    },
    customWatchFor: ""
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [phoneValidation, setPhoneValidation] = useState<{
    isValid: boolean | null
    message: string
  }>({ isValid: null, message: "" })

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [currentStep])

  // Update Lulu mood based on step
  useEffect(() => {
    if (currentStep === 1) {
      if (formData.name.length > 0) {
        setLuluMood("writing")
      } else {
        setLuluMood("default")
      }
    } else if (currentStep === 2) {
      setLuluMood("excited")
    } else if (currentStep === 3) {
      setLuluMood("love")
    } else if (currentStep === 4) {
      setLuluMood("listening")
    } else if (currentStep === 5) {
      setLuluMood("love")
    }
  }, [currentStep, formData.name])

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Simulate connecting a service
  const handleConnect = async (category: keyof Connections, service: string) => {
    setConnectingService(`${category}-${service}`)

    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    setFormData(prev => ({
      ...prev,
      connections: {
        ...prev.connections,
        [category]: service
      }
    }))
    setConnectingService(null)
  }

  // Format phone number
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, "")

    if (numbers.length === 0) return ""

    if (numbers.startsWith("1") && numbers.length === 11) {
      return `+1 (${numbers.slice(1, 4)}) ${numbers.slice(4, 7)}-${numbers.slice(7, 11)}`
    } else if (numbers.length === 10) {
      return `+1 (${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
    } else if (numbers.length > 0 && numbers.length <= 11) {
      if (numbers.length <= 1) {
        return `+${numbers}`
      } else if (numbers.length <= 4) {
        return `+1 (${numbers.slice(1)}`
      } else if (numbers.length <= 7) {
        return `+1 (${numbers.slice(1, 4)}) ${numbers.slice(4)}`
      } else {
        return `+1 (${numbers.slice(1, 4)}) ${numbers.slice(4, 7)}-${numbers.slice(7, 11)}`
      }
    }

    return `+${numbers}`
  }

  // Clean phone for backend
  const cleanPhoneForBackend = (phone: string): string => {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '')
    return cleaned.startsWith('+') ? cleaned : `+${cleaned.replace(/^\+/, '')}`
  }

  // Validate phone
  const validatePhoneInput = (phone: string) => {
    if (!phone || phone.length < 10) {
      setPhoneValidation({ isValid: null, message: "" })
      return
    }

    const cleaned = cleanPhoneForBackend(phone)
    const digits = cleaned.replace(/\D/g, '')

    if (digits.length < 10) {
      setPhoneValidation({ isValid: false, message: "Phone number too short" })
      return
    }

    if (digits.length > 15) {
      setPhoneValidation({ isValid: false, message: "Phone number too long" })
      return
    }

    if (digits.length >= 10 && digits.length <= 15) {
      setPhoneValidation({ isValid: true, message: "✓ Looks good" })
    }
  }

  // Trigger welcome call via Vapi
  const triggerWelcomeCall = async () => {
    console.log("triggerWelcomeCall called, callTriggered:", callTriggered)
    if (callTriggered) return
    setCallTriggered(true)

    try {
      const cleanedPhone = cleanPhoneForBackend(formData.phone)

      // Build connected services list
      const connectedServices = []
      if (formData.connections.calendar) connectedServices.push(`calendar:${formData.connections.calendar}`)
      if (formData.connections.health) connectedServices.push(`health:${formData.connections.health}`)
      if (formData.connections.tasks) connectedServices.push(`tasks:${formData.connections.tasks}`)

      console.log("Calling /api/calls/welcome with:", { name: formData.name, phone: cleanedPhone })

      // Call the welcome call API
      const response = await fetch("/api/calls/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: capitalizeName(formData.name),
          phone: cleanedPhone,
          connectedServices,
          customWatchFor: formData.customWatchFor
        })
      })

      const data = await response.json()
      console.log("Welcome call response:", data)

      if (!response.ok) {
        console.error("Failed to trigger welcome call:", data)
      }
    } catch (error) {
      console.error("Error triggering welcome call:", error)
    }
  }

  // Handle Step 4 completion - trigger call immediately when user clicks "I'm ready"
  const handlePhoneComplete = async () => {
    if (!formData.phone || phoneValidation.isValid === false) {
      setErrors({ phone: "I need a phone number to reach you!" })
      return
    }

    setErrors({})

    // Save data for thank-you page
    const onboardingData = {
      name: capitalizeName(formData.name),
      connections: formData.connections,
      customWatchFor: formData.customWatchFor
    }
    localStorage.setItem("delulu_onboarding_data", JSON.stringify(onboardingData))

    // Navigate to Step 5 first
    handleNext()

    // Trigger Vapi call immediately
    triggerWelcomeCall()
  }

  // Handle final confirmation - just navigate to thank-you (call already triggered)
  const handleConfirmation = () => {
    // Navigate to thank-you
    router.push("/thank-you")
  }

  // Get connection summary for display
  const getConnectionSummary = () => {
    const items = []
    if (formData.connections.calendar) {
      const names: Record<string, string> = { google: "Google Calendar", apple: "Apple Calendar", outlook: "Outlook" }
      items.push({ type: "Calendar", name: names[formData.connections.calendar] })
    }
    if (formData.connections.health) {
      const names: Record<string, string> = { apple: "Apple Health", fitbit: "Fitbit", oura: "Oura", whoop: "Whoop" }
      items.push({ type: "Health", name: names[formData.connections.health] })
    }
    if (formData.connections.tasks) {
      const names: Record<string, string> = { todoist: "Todoist", reminders: "Apple Reminders" }
      items.push({ type: "Tasks", name: names[formData.connections.tasks] })
    }
    return items
  }

  // Render Steps
  const renderStep = () => {
    switch (currentStep) {
      case 1: // NAME
        return (
          <div className="space-y-8 max-w-xl mx-auto w-full">
            <div className="text-center space-y-4">
              <LuluCloud mood={luluMood} message={formData.name ? `Hi ${capitalizeName(formData.name)}!` : "What should I call you?"} />
              <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">
                Hey there
              </h1>
              <p className="text-xl text-gray-600 font-medium">
                I'm Lulu. Let's get to know each other.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-xl">
              <label className="block text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">
                What should I call you?
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  const value = e.target.value
                  const capitalized = value.length > 0
                    ? value.charAt(0).toUpperCase() + value.slice(1)
                    : value
                  setFormData({ ...formData, name: capitalized })
                }}
                onBlur={(e) => {
                  const normalized = capitalizeName(e.target.value)
                  setFormData({ ...formData, name: normalized })
                }}
                placeholder="Your first name"
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-lg focus:bg-white focus:border-gray-400 outline-none transition-all font-medium placeholder:text-gray-400"
                autoFocus
              />
              {errors.name && <p className="text-red-500 text-sm mt-2">{errors.name}</p>}
            </div>

            <button
              onClick={() => {
                if (formData.name.trim().length < 2) {
                  setErrors({ name: "I need a name to call you!" })
                } else {
                  setErrors({})
                  handleNext()
                }
              }}
              className="w-full py-4 bg-gray-900 text-white font-black rounded-xl text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-gray-900/20 uppercase tracking-wide"
            >
              Nice to meet you →
            </button>
          </div>
        )

      case 2: // CONNECT YOUR WORLD
        return (
          <div className="space-y-8 max-w-xl mx-auto w-full">
            <div className="text-center space-y-4">
              <LuluCloud mood={luluMood} message="Let me see your world." />
              <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">
                Connect Your World
              </h1>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-8">

              {/* Calendar */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-bold text-gray-900 uppercase tracking-wide">Your calendar</label>
                </div>
                <p className="text-sm text-gray-500 -mt-1">So I know what's coming</p>
                <div className="grid grid-cols-3 gap-2">
                  <ConnectionButton
                    icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="#4285F4"><path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/></svg>}
                    name="Google"
                    connected={formData.connections.calendar === "google"}
                    connecting={connectingService === "calendar-google"}
                    onClick={() => handleConnect("calendar", "google")}
                  />
                  <ConnectionButton
                    icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="#000"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>}
                    name="Apple"
                    connected={formData.connections.calendar === "apple"}
                    connecting={connectingService === "calendar-apple"}
                    onClick={() => handleConnect("calendar", "apple")}
                  />
                  <ConnectionButton
                    icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0078D4"><path d="M11.5 3v8.5H3V3h8.5zm0 18H3v-8.5h8.5V21zm1-18H21v8.5h-8.5V3zm8.5 9.5V21h-8.5v-8.5H21z"/></svg>}
                    name="Outlook"
                    connected={formData.connections.calendar === "outlook"}
                    connecting={connectingService === "calendar-outlook"}
                    onClick={() => handleConnect("calendar", "outlook")}
                  />
                </div>
              </div>

              {/* Health */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-bold text-gray-900 uppercase tracking-wide">Your body</label>
                </div>
                <p className="text-sm text-gray-500 -mt-1">So I sense when you're off</p>
                <div className="grid grid-cols-2 gap-2">
                  <ConnectionButton
                    icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="#FF2D55"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>}
                    name="Apple Health"
                    connected={formData.connections.health === "apple"}
                    connecting={connectingService === "health-apple"}
                    onClick={() => handleConnect("health", "apple")}
                  />
                  <ConnectionButton
                    icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="#00B0B9"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>}
                    name="Fitbit"
                    connected={formData.connections.health === "fitbit"}
                    connecting={connectingService === "health-fitbit"}
                    onClick={() => handleConnect("health", "fitbit")}
                  />
                  <ConnectionButton
                    icon={<div className="w-5 h-5 bg-gray-800 rounded-full" />}
                    name="Oura"
                    connected={formData.connections.health === "oura"}
                    connecting={connectingService === "health-oura"}
                    onClick={() => handleConnect("health", "oura")}
                  />
                  <ConnectionButton
                    icon={<div className="w-5 h-5 bg-blue-600 rounded" />}
                    name="Whoop"
                    connected={formData.connections.health === "whoop"}
                    connecting={connectingService === "health-whoop"}
                    onClick={() => handleConnect("health", "whoop")}
                  />
                </div>
              </div>

              {/* Tasks */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-bold text-gray-900 uppercase tracking-wide">Your tasks</label>
                </div>
                <p className="text-sm text-gray-500 -mt-1">So I know what's weighing on you</p>
                <div className="grid grid-cols-2 gap-2">
                  <ConnectionButton
                    icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="#E44332"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>}
                    name="Todoist"
                    connected={formData.connections.tasks === "todoist"}
                    connecting={connectingService === "tasks-todoist"}
                    onClick={() => handleConnect("tasks", "todoist")}
                  />
                  <ConnectionButton
                    icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="#FF9500"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>}
                    name="Reminders"
                    connected={formData.connections.tasks === "reminders"}
                    connecting={connectingService === "tasks-reminders"}
                    onClick={() => handleConnect("tasks", "reminders")}
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center pt-4 border-t border-gray-100">
                These are how I know when to call — and when to stay quiet.
              </p>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-4 bg-gray-900 text-white font-black rounded-xl text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-gray-900/20 uppercase tracking-wide"
            >
              Continue →
            </button>

            <button
              onClick={handleNext}
              className="w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Skip for now
            </button>
          </div>
        )

      case 3: // I'M IN
        const connectionSummary = getConnectionSummary()
        const hasConnections = connectionSummary.length > 0

        return (
          <div className="space-y-8 max-w-xl mx-auto w-full">
            <div className="text-center space-y-4">
              <LuluCloud mood={luluMood} message={`I'm in, ${capitalizeName(formData.name)}.`} />
              <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">
                I'm in, {capitalizeName(formData.name)}.
              </h1>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">

              {/* Connected Services */}
              {hasConnections && (
                <div className="space-y-2">
                  {connectionSummary.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-green-700">
                      <span className="text-green-600">✓</span>
                      <span className="font-medium">{item.name} connected</span>
                    </div>
                  ))}
                </div>
              )}

              {/* What Lulu can do */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                {formData.connections.calendar && (
                  <p className="text-gray-700">I can see what's coming up.</p>
                )}
                {formData.connections.health && (
                  <p className="text-gray-700">I can sense when you're off.</p>
                )}
                {formData.connections.tasks && (
                  <p className="text-gray-700">I know what's weighing on you.</p>
                )}
                <p className="text-gray-900 font-semibold">I'll know when to call.</p>
              </div>

              {/* Optional custom input */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-3">
                  You don't need to tell me anything else. But if there's something specific you want me to watch for:
                </p>

                {!showCustomInput ? (
                  <button
                    onClick={() => setShowCustomInput(true)}
                    className="text-sm text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2 transition-colors"
                  >
                    <span>+</span> Add something
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {["Big conversation coming", "Going through a tough time", "Job interview soon", "Feeling overwhelmed"].map((chip) => (
                        <button
                          key={chip}
                          onClick={() => setFormData({ ...formData, customWatchFor: chip })}
                          className={`text-xs px-3 py-2 rounded-full border transition-all ${
                            formData.customWatchFor === chip
                              ? "bg-gray-900 text-white border-gray-900"
                              : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={formData.customWatchFor}
                      onChange={(e) => setFormData({ ...formData, customWatchFor: e.target.value })}
                      placeholder="Something else..."
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:bg-white focus:border-gray-400 outline-none transition-all"
                    />
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-4 bg-gray-900 text-white font-black rounded-xl text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-gray-900/20 uppercase tracking-wide"
            >
              I trust you →
            </button>
          </div>
        )

      case 4: // PHONE NUMBER
        return (
          <div className="space-y-8 max-w-xl mx-auto w-full">
            <div className="text-center space-y-4">
              <LuluCloud mood={luluMood} message="Where should I reach you?" />
              <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">
                Where should I reach you?
              </h1>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Your phone number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value)
                    setFormData({ ...formData, phone: formatted })
                    validatePhoneInput(formatted)
                  }}
                  onBlur={() => {
                    if (formData.phone) {
                      validatePhoneInput(formData.phone)
                    }
                  }}
                  placeholder="+1 (555) 123-4567"
                  className={`w-full p-4 bg-gray-50 border rounded-xl text-gray-900 text-lg focus:bg-white outline-none transition-all ${
                    phoneValidation.isValid === false
                      ? "border-red-300 focus:border-red-400"
                      : phoneValidation.isValid === true
                      ? "border-green-300 focus:border-green-400"
                      : "border-gray-200 focus:border-gray-400"
                  }`}
                  autoFocus
                />
                {phoneValidation.message && (
                  <p className={`text-xs ${
                    phoneValidation.isValid === false
                      ? "text-red-500"
                      : "text-green-600"
                  }`}>
                    {phoneValidation.message}
                  </p>
                )}
                <p className="text-sm text-gray-500 text-center mt-3">
                  When the moment comes, this is where I'll call.
                </p>
              </div>
            </div>

            <button
              onClick={handlePhoneComplete}
              className="w-full py-4 bg-gray-900 text-white font-black rounded-xl text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-gray-900/20 uppercase tracking-wide"
            >
              I'm ready →
            </button>
          </div>
        )

      case 5: // CONFIRMATION
        const finalConnections = getConnectionSummary()

        return (
          <div className="space-y-8 max-w-xl mx-auto w-full">
            <div className="text-center space-y-4">
              <LuluCloud mood={luluMood} message={`I'm here, ${capitalizeName(formData.name)}.`} />
              <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">
                I'm here, {capitalizeName(formData.name)}.
              </h1>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              <p className="text-gray-700 text-lg leading-relaxed">
                You won't hear from me every day. Just when it matters. Before the big moments. When things feel off. I've got you.
              </p>

              {/* Connected Services Summary */}
              <div className="space-y-2 pt-4 border-t border-gray-100">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Connected</p>
                <div className="flex items-center gap-3">
                  <span className={finalConnections.find(c => c.type === "Calendar") ? "text-green-600" : "text-gray-300"}>✓</span>
                  <span className={finalConnections.find(c => c.type === "Calendar") ? "text-gray-700" : "text-gray-400"}>
                    Calendar: {finalConnections.find(c => c.type === "Calendar")?.name || "Not connected"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={finalConnections.find(c => c.type === "Health") ? "text-green-600" : "text-gray-300"}>✓</span>
                  <span className={finalConnections.find(c => c.type === "Health") ? "text-gray-700" : "text-gray-400"}>
                    Health: {finalConnections.find(c => c.type === "Health")?.name || "Not connected"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={finalConnections.find(c => c.type === "Tasks") ? "text-green-600" : "text-gray-300"}>✓</span>
                  <span className={finalConnections.find(c => c.type === "Tasks") ? "text-gray-700" : "text-gray-400"}>
                    Tasks: {finalConnections.find(c => c.type === "Tasks")?.name || "Not connected"}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <p className="text-gray-900 font-semibold text-center">
                  I'm calling you now to introduce myself.
                </p>
                <p className="text-gray-500 text-sm text-center mt-2">
                  Pick up — it's me.
                </p>
              </div>
            </div>

            <button
              onClick={handleConfirmation}
              disabled={isLoading}
              className="w-full py-4 text-white font-black rounded-xl text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl uppercase tracking-wide relative overflow-hidden"
              style={{ background: "var(--gradient-hero)" }}
            >
              {isLoading ? "Setting up..." : "Got it"}
            </button>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-hidden relative selection:bg-orange-200 selection:text-black">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-orange-100 to-transparent blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-gradient-to-tl from-yellow-50 to-transparent blur-[120px] rounded-full" />
      </div>

      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 px-6 py-8 bg-white/80 backdrop-blur-sm">
        <div className="max-w-md mx-auto flex gap-3">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                step <= currentStep ? "bg-gray-900" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-24 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full flex justify-center"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
