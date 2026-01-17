"use client"

import { motion } from "framer-motion"

// Icons
const CalendarIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)

const SleepIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)

const HeartIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
)

const TasksIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 11l3 3L22 4"/>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
  </svg>
)

const CheckIcon = () => (
  <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const XIcon = () => (
  <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

const PhoneIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
  </svg>
)

const SilentIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
  </svg>
)

interface SignalItemProps {
  icon: React.ReactNode
  label: string
  value: string
  alert?: boolean
}

const SignalItem = ({ icon, label, value, alert }: SignalItemProps) => (
  <div className="flex items-start gap-3">
    <div className={`p-2 rounded-lg ${alert ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
      {icon}
    </div>
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-medium ${alert ? 'text-red-700' : 'text-gray-900'}`}>{value}</p>
    </div>
  </div>
)

interface DecisionItemProps {
  checked: boolean
  text: string
}

const DecisionItem = ({ checked, text }: DecisionItemProps) => (
  <div className="flex items-center gap-2">
    {checked ? <CheckIcon /> : <XIcon />}
    <span className={`text-sm ${checked ? 'text-gray-700' : 'text-gray-400'}`}>{text}</span>
  </div>
)

export default function HowLuluDecides() {
  return (
    <section className="relative w-full py-20 sm:py-28 px-4 sm:px-6 bg-gradient-to-b from-white via-gray-50/50 to-white overflow-hidden">
      {/* Subtle background texture */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }} />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 mb-4 uppercase tracking-tight">
            How Lulu Decides
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            She watches everything. She only calls when it matters.
          </p>
        </motion.div>

        {/* Scenarios Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

          {/* Scenario 1: Before Your Investor Pitch */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden"
          >
            {/* Card Header */}
            <div className="p-5 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, rgba(200, 149, 107, 0.08) 0%, rgba(168, 85, 247, 0.05) 100%)' }}>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Scenario</p>
              <h3 className="text-lg font-bold text-gray-900">Before Your Investor Pitch</h3>
            </div>

            {/* What She Sees */}
            <div className="p-5 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">What she sees</p>
              <div className="space-y-4">
                <SignalItem
                  icon={<CalendarIcon />}
                  label="Calendar"
                  value="Pitch with Sequoia — Thursday 2pm"
                />
                <SignalItem
                  icon={<SleepIcon />}
                  label="Sleep (Wednesday)"
                  value="4.2 hours (avg: 7.1)"
                  alert
                />
                <SignalItem
                  icon={<HeartIcon />}
                  label="Heart Rate"
                  value="Elevated since Tuesday"
                  alert
                />
              </div>
            </div>

            {/* What She Does */}
            <div className="p-5 border-b border-gray-100 bg-gray-50/50">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">What she does</p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Researches the partner — they value resilience</li>
                <li>• Checks Thursday morning — you're free until 11am</li>
              </ul>
            </div>

            {/* Decision */}
            <div className="p-5 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Decision</p>
              <div className="space-y-2">
                <DecisionItem checked text="High-stakes event" />
                <DecisionItem checked text="Body showing stress" />
                <DecisionItem checked text="Has useful intel to share" />
                <DecisionItem checked text="Good window to call" />
              </div>
            </div>

            {/* Result */}
            <div className="p-5" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.02) 100%)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-green-100 rounded-full text-green-600">
                  <PhoneIcon />
                </div>
                <p className="font-bold text-green-700">Lulu calls Thursday 9am</p>
              </div>
              <p className="text-sm text-gray-700 italic border-l-2 border-green-300 pl-3">
                "The partner you're meeting values grit. Lead with your hardest moment and how you got through it. You've got this."
              </p>
            </div>
          </motion.div>

          {/* Scenario 2: When You're Quietly Struggling */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden"
          >
            {/* Card Header */}
            <div className="p-5 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%)' }}>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Scenario</p>
              <h3 className="text-lg font-bold text-gray-900">When You're Quietly Struggling</h3>
            </div>

            {/* What She Sees */}
            <div className="p-5 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">What she sees</p>
              <div className="space-y-4">
                <SignalItem
                  icon={<CalendarIcon />}
                  label="Calendar"
                  value="No major events this week"
                />
                <SignalItem
                  icon={<SleepIcon />}
                  label="Sleep"
                  value="Under 5 hours for 6 days"
                  alert
                />
                <SignalItem
                  icon={<TasksIcon />}
                  label="Tasks"
                  value="Piling up, none completed"
                  alert
                />
              </div>
            </div>

            {/* What She Does */}
            <div className="p-5 border-b border-gray-100 bg-gray-50/50">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">What she does</p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Waits. Day 1, 2, 3 — could be a busy week</li>
                <li>• Day 6 — pattern is clear. Something's wrong.</li>
              </ul>
            </div>

            {/* Decision */}
            <div className="p-5 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Decision</p>
              <div className="space-y-2">
                <DecisionItem checked text="Sustained signal (not a one-off)" />
                <DecisionItem checked text="No obvious external cause" />
                <DecisionItem checked text="Worth checking in" />
              </div>
            </div>

            {/* Result */}
            <div className="p-5" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.02) 100%)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-green-100 rounded-full text-green-600">
                  <PhoneIcon />
                </div>
                <p className="font-bold text-green-700">Lulu calls Tuesday afternoon</p>
              </div>
              <p className="text-sm text-gray-700 italic border-l-2 border-green-300 pl-3">
                "Hey, I noticed you haven't been sleeping. What's going on? You okay?"
              </p>
            </div>
          </motion.div>

          {/* Scenario 3: When She Stays Quiet */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden"
          >
            {/* Card Header */}
            <div className="p-5 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Scenario</p>
              <h3 className="text-lg font-bold text-gray-900">When She Stays Quiet</h3>
            </div>

            {/* What She Sees */}
            <div className="p-5 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">What she sees</p>
              <div className="space-y-4">
                <SignalItem
                  icon={<CalendarIcon />}
                  label="Calendar"
                  value="Team standup — Monday 10am"
                />
                <SignalItem
                  icon={<SleepIcon />}
                  label="Sleep"
                  value="6.8 hours (normal)"
                />
                <SignalItem
                  icon={<HeartIcon />}
                  label="Heart Rate"
                  value="Normal"
                />
              </div>
            </div>

            {/* Decision */}
            <div className="p-5 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Decision</p>
              <div className="space-y-2">
                <DecisionItem checked={false} text="Routine event" />
                <DecisionItem checked={false} text="No stress signals" />
                <DecisionItem checked={false} text="Nothing useful to add" />
              </div>
            </div>

            {/* Result */}
            <div className="p-5 flex-grow" style={{ background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.08) 0%, rgba(156, 163, 175, 0.02) 100%)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-gray-100 rounded-full text-gray-500">
                  <SilentIcon />
                </div>
                <p className="font-bold text-gray-600">Lulu does nothing</p>
              </div>
              <p className="text-sm text-gray-500 italic border-l-2 border-gray-300 pl-3">
                Most days look like this. That's the point.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Bottom Note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center text-gray-500 mt-12 text-sm max-w-xl mx-auto"
        >
          She's not trying to call you every day. She's trying to call you on the right day.
        </motion.p>
      </div>
    </section>
  )
}
