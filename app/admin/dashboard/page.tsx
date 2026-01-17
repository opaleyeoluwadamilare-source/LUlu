'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Customer {
  id: number
  name: string
  email: string
  phone: string
  payment_status: string
  phone_validated: boolean
  welcome_call_completed: boolean
  call_status: string | null
  last_call_date: string | null
  next_call_scheduled_at: string | null
  call_time: string | null
  call_time_hour: number | null
  call_time_minute: number | null
  timezone: string | null
  total_calls_made: number
  created_at: string
  updated_at?: string
  hasSchedulingIssue: boolean
  isBlocked: boolean
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  user_story?: string | null
  lulu_response?: string | null
  extracted_goal?: string | null
  extracted_insecurity?: string | null
  extracted_blocker?: string | null
  last_call_transcript?: string | null
  last_call_duration?: number | null
}

interface Stats {
  total: number
  paid: number
  pending: number
  phoneValidated: number
  blocked: number
  readyForCalls: number
  schedulingIssues: number
}

type TabType = 'customers' | 'analytics' | 'system' | 'partner-codes'

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('customers')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null)
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([])
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [analytics, setAnalytics] = useState<any>(null)
  const [systemHealth, setSystemHealth] = useState<any>(null)
  const [customerCallHistory, setCustomerCallHistory] = useState<any>(null)
  const [customerContext, setCustomerContext] = useState<any>(null)
  const [analyticsDays, setAnalyticsDays] = useState(7)
  const [partnerCodes, setPartnerCodes] = useState<any[]>([])
  const [partnerCodesLoading, setPartnerCodesLoading] = useState(false)
  const [showCreatePartnerCodeModal, setShowCreatePartnerCodeModal] = useState(false)
  const [newPartnerCode, setNewPartnerCode] = useState('')
  const [codeExpiresAt, setCodeExpiresAt] = useState('')
  const [codeNotes, setCodeNotes] = useState('')
  const [creatingPartnerCode, setCreatingPartnerCode] = useState(false)

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/customers')
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin')
          return
        }
        throw new Error('Failed to fetch customers')
      }
      const data = await response.json()
      setCustomers(data.customers)
      setStats(data.stats)
      setError('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
    if (activeTab === 'analytics') fetchAnalytics()
    if (activeTab === 'system') fetchSystemHealth()
    if (activeTab === 'partner-codes') fetchPartnerCodes()
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchCustomers()
      if (activeTab === 'analytics') fetchAnalytics()
      if (activeTab === 'system') fetchSystemHealth()
      if (activeTab === 'partner-codes') fetchPartnerCodes()
    }, 30000)
    return () => clearInterval(interval)
  }, [activeTab, analyticsDays])

  useEffect(() => {
    if (viewingCustomer) {
      fetchCallHistory(viewingCustomer.id)
      fetchCustomerContext(viewingCustomer.id)
    }
  }, [viewingCustomer])

  // Fetch analytics
  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/admin/analytics?days=${analyticsDays}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (err) {
      console.error('Error fetching analytics:', err)
    }
  }

  // Fetch system health
  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('/api/admin/system-health')
      if (response.ok) {
        const data = await response.json()
        setSystemHealth(data)
      }
    } catch (err) {
      console.error('Error fetching system health:', err)
    }
  }

  // Fetch customer call history
  const fetchCallHistory = async (customerId: number) => {
    try {
      const response = await fetch(`/api/admin/customers/${customerId}/call-history`)
      if (response.ok) {
        const data = await response.json()
        setCustomerCallHistory(data)
      }
    } catch (err) {
      console.error('Error fetching call history:', err)
    }
  }

  // Fetch customer context
  const fetchCustomerContext = async (customerId: number) => {
    try {
      const response = await fetch(`/api/admin/customers/${customerId}/context`)
      if (response.ok) {
        const data = await response.json()
        setCustomerContext(data)
      }
    } catch (err) {
      console.error('Error fetching context:', err)
    }
  }

  // Fetch partner codes
  const fetchPartnerCodes = async () => {
    try {
      setPartnerCodesLoading(true)
      const response = await fetch('/api/admin/partner-codes')
      if (response.ok) {
        const data = await response.json()
        setPartnerCodes(data.codes || [])
      }
    } catch (err) {
      console.error('Error fetching partner codes:', err)
    } finally {
      setPartnerCodesLoading(false)
    }
  }

  // Create partner code
  const handleCreatePartnerCode = async (code: string, expiresAt: string | null, notes: string | null) => {
    try {
      setCreatingPartnerCode(true)
      const response = await fetch('/api/admin/partner-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, expiresAt, notes })
      })
      if (!response.ok) throw new Error('Failed to create code')
      setSuccessMessage('Partner code created successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowCreatePartnerCodeModal(false)
      setNewPartnerCode('')
      setCodeExpiresAt('')
      setCodeNotes('')
      await fetchPartnerCodes()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setCreatingPartnerCode(false)
    }
  }

  // Toggle partner code active status
  const handleTogglePartnerCodeActive = async (codeId: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/partner-codes/${codeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      })
      if (!response.ok) throw new Error('Failed to update code')
      setSuccessMessage(`Partner code ${!isActive ? 'activated' : 'deactivated'} successfully`)
      setTimeout(() => setSuccessMessage(''), 3000)
      await fetchPartnerCodes()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  // Delete partner code
  const handleDeletePartnerCode = async (codeId: number) => {
    if (!confirm('Are you sure you want to delete this partner code?')) return
    try {
      const response = await fetch(`/api/admin/partner-codes/${codeId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete code')
      setSuccessMessage('Partner code deleted successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
      await fetchPartnerCodes()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  // Handle customer action
  const handleAction = async (customerId: number, action: string) => {
    try {
      setActionLoading(customerId)
      const response = await fetch('/api/admin/customers/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, customerId })
      })

      if (!response.ok) throw new Error('Action failed')
      
      const data = await response.json()
      setSuccessMessage(data.message || 'Action completed successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
      await fetchCustomers()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  // Handle bulk action
  const handleBulkAction = async (action: string) => {
    if (selectedCustomers.length === 0) {
      alert('Please select at least one customer')
      return
    }

    try {
      setActionLoading(-1) // Special ID for bulk actions
      const response = await fetch('/api/admin/customers/bulk-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, customerIds: selectedCustomers })
      })

      if (!response.ok) throw new Error('Bulk action failed')
      
      const data = await response.json()
      setSuccessMessage(data.message || 'Bulk action completed')
      setTimeout(() => setSuccessMessage(''), 3000)
      setSelectedCustomers([])
      await fetchCustomers()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  // Handle trigger call
  const handleTriggerCall = async (customerId: number, callType: 'welcome' | 'daily') => {
    try {
      setActionLoading(customerId)
      const response = await fetch(`/api/admin/customers/${customerId}/trigger-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callType })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to trigger call')
      }

      const data = await response.json()
      setSuccessMessage(data.message || 'Call triggered successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
      await fetchCallHistory(customerId)
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  // Handle export
  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/admin/customers/export?format=${format}`)
      if (!response.ok) throw new Error('Export failed')

      if (format === 'csv') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `customers-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }

      setSuccessMessage(`Exported ${format.toUpperCase()} successfully`)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  // Handle delete
  const handleDelete = async (customerId: number, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) {
      return
    }

    try {
      setActionLoading(customerId)
      const response = await fetch(`/api/admin/customers/${customerId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Delete failed')
      
      setSuccessMessage('Customer deleted successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
      await fetchCustomers()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  // Handle logout
  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin')
  }

  // Filter customers
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm)

    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'paid' && ['Paid', 'Partner'].includes(customer.payment_status)) ||
      (filterStatus === 'pending' && customer.payment_status === 'Pending') ||
      (filterStatus === 'blocked' && customer.isBlocked) ||
      (filterStatus === 'issues' && customer.hasSchedulingIssue)

    return matchesSearch && matchesFilter
  })

  if (loading && !stats) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f7fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e0e0e0',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ color: '#7f8c8d' }}>Loading dashboard...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f7fa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 'clamp(16px, 4vw, 24px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(20px, 4vw, 28px)', color: 'white', fontWeight: '700' }}>
            📞 Admin Dashboard
          </h1>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {activeTab === 'customers' && (
              <>
                {selectedCustomers.length > 0 && (
                  <button
                    onClick={() => handleBulkAction('pause')}
                    disabled={actionLoading === -1}
                    style={{
                      padding: '8px 16px',
                      background: '#f39c12',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      whiteSpace: 'nowrap',
                      opacity: actionLoading === -1 ? 0.6 : 1
                    }}
                  >
                    Pause Selected ({selectedCustomers.length})
                  </button>
                )}
                <button
                  onClick={() => handleExport('csv')}
                  style={{
                    padding: '10px 18px',
                    background: 'rgba(255,255,255,0.95)',
                    color: '#2c3e50',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  📥 Export CSV
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  style={{
                    padding: '10px 18px',
                    background: 'rgba(255,255,255,0.95)',
                    color: '#2c3e50',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  + Add Customer
                </button>
              </>
            )}
            <button
              onClick={handleLogout}
              style={{
                padding: '10px 18px',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
              }}
            >
              Logout
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div style={{
          maxWidth: '1400px',
          margin: '20px auto 0',
          display: 'flex',
          gap: '4px',
          borderBottom: '2px solid rgba(255,255,255,0.2)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          {(['customers', 'analytics', 'system', 'partner-codes'] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab)
                if (tab === 'analytics') fetchAnalytics()
                if (tab === 'system') fetchSystemHealth()
                if (tab === 'partner-codes') fetchPartnerCodes()
              }}
              style={{
                padding: '12px 20px',
                background: activeTab === tab ? 'rgba(255,255,255,0.2)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '3px solid white' : '3px solid transparent',
                color: activeTab === tab ? 'white' : 'rgba(255,255,255,0.8)',
                cursor: 'pointer',
                fontSize: 'clamp(13px, 3vw, 15px)',
                fontWeight: activeTab === tab ? '700' : '500',
                textTransform: 'capitalize',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                borderRadius: '8px 8px 0 0'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              {tab === 'customers' && '👥 Customers'}
              {tab === 'analytics' && '📊 Analytics'}
              {tab === 'system' && '⚙️ System Health'}
              {tab === 'partner-codes' && '🎟️ Partner Codes'}
            </button>
          ))}
          <style>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>
        </div>
      </header>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: 'clamp(12px, 3vw, 20px)' }}>
        {/* Tab Content */}
        {activeTab === 'customers' && (
          <>
            {/* Stats Cards */}
            {stats && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
                marginBottom: '24px'
              }}>
                <StatCard label="Total" value={stats.total} color="#3498db" />
                <StatCard label="Paid" value={stats.paid} color="#27ae60" />
                <StatCard label="Pending" value={stats.pending} color="#f39c12" />
                <StatCard label="Blocked" value={stats.blocked} color="#e74c3c" />
                <StatCard label="Ready" value={stats.readyForCalls} color="#27ae60" />
                <StatCard label="Issues" value={stats.schedulingIssues} color="#f39c12" />
              </div>
            )}

        {/* Filters */}
        <div style={{
          background: 'white',
          padding: 'clamp(12px, 3vw, 16px)',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: '1',
              minWidth: '150px',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              background: 'white'
            }}
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="blocked">Blocked</option>
            <option value="issues">Has Issues</option>
          </select>
          <button
            onClick={fetchCustomers}
            style={{
              padding: '10px 16px',
              background: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div style={{
            background: '#d4edda',
            border: '1px solid #27ae60',
            color: '#155724',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>✅ {successMessage}</span>
            <button
              onClick={() => setSuccessMessage('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#155724',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0 8px'
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            background: '#fee',
            border: '1px solid #e74c3c',
            color: '#721c24',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>❌ {error}</span>
            <button
              onClick={() => setError('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#721c24',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0 8px'
              }}
            >
              ×
            </button>
          </div>
        )}

            {/* Customers List */}
            <div style={{
              display: 'grid',
              gap: '16px'
            }}>
              {filteredCustomers.map(customer => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  onAction={handleAction}
                  onDelete={handleDelete}
                  onEdit={() => setEditingCustomer(customer)}
                  onView={() => {
                    setViewingCustomer(customer)
                    fetchCallHistory(customer.id)
                    fetchCustomerContext(customer.id)
                  }}
                  actionLoading={actionLoading === customer.id}
                  selected={selectedCustomers.includes(customer.id)}
                  onSelect={(selected) => {
                    if (selected) {
                      setSelectedCustomers([...selectedCustomers, customer.id])
                    } else {
                      setSelectedCustomers(selectedCustomers.filter(id => id !== customer.id))
                    }
                  }}
                />
              ))}
            </div>

            {filteredCustomers.length === 0 && (
              <div style={{
                background: 'white',
                padding: '40px',
                borderRadius: '8px',
                textAlign: 'center',
                color: '#7f8c8d'
              }}>
                No customers found matching your filters.
              </div>
            )}
          </>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab 
            analytics={analytics} 
            loading={!analytics} 
            days={analyticsDays}
            onDaysChange={setAnalyticsDays}
            onExport={() => handleExport('json')}
          />
        )}

        {activeTab === 'system' && (
          <SystemHealthTab health={systemHealth} loading={!systemHealth} />
        )}

        {activeTab === 'partner-codes' && (
          <PartnerCodesTab
            codes={partnerCodes}
            loading={partnerCodesLoading}
            onCreateCode={handleCreatePartnerCode}
            onToggleActive={handleTogglePartnerCodeActive}
            onDelete={handleDeletePartnerCode}
            showCreateModal={showCreatePartnerCodeModal}
            onCloseCreateModal={() => setShowCreatePartnerCodeModal(false)}
            onCreateClick={() => setShowCreatePartnerCodeModal(true)}
            newCode={newPartnerCode}
            setNewCode={setNewPartnerCode}
            codeExpiresAt={codeExpiresAt}
            setCodeExpiresAt={setCodeExpiresAt}
            codeNotes={codeNotes}
            setCodeNotes={setCodeNotes}
            creatingCode={creatingPartnerCode}
          />
        )}

        {activeTab === 'partner-codes' && (
          <PartnerCodesTab
            codes={partnerCodes}
            loading={partnerCodesLoading}
            onCreateCode={handleCreatePartnerCode}
            onToggleActive={handleTogglePartnerCodeActive}
            onDelete={handleDeletePartnerCode}
            showCreateModal={showCreatePartnerCodeModal}
            onCloseCreateModal={() => setShowCreatePartnerCodeModal(false)}
            onCreateClick={() => setShowCreatePartnerCodeModal(true)}
            newCode={newPartnerCode}
            setNewCode={setNewPartnerCode}
            codeExpiresAt={codeExpiresAt}
            setCodeExpiresAt={setCodeExpiresAt}
            codeNotes={codeNotes}
            setCodeNotes={setCodeNotes}
            creatingCode={creatingPartnerCode}
          />
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <AddCustomerModal
          onClose={() => setShowAddModal(false)}
      onSuccess={() => {
        setShowAddModal(false)
        setSuccessMessage('Customer created successfully')
        setTimeout(() => setSuccessMessage(''), 3000)
        fetchCustomers()
      }}
        />
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <EditCustomerModal
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSuccess={() => {
            setEditingCustomer(null)
            setSuccessMessage('Customer updated successfully')
            setTimeout(() => setSuccessMessage(''), 3000)
            fetchCustomers()
          }}
        />
      )}

      {/* View Customer Details Modal */}
      {viewingCustomer && (
        <ViewCustomerModal
          customer={viewingCustomer}
          callHistory={customerCallHistory}
          context={customerContext}
          onClose={() => {
            setViewingCustomer(null)
            setCustomerCallHistory(null)
            setCustomerContext(null)
          }}
          onAction={handleAction}
          onTriggerCall={handleTriggerCall}
          actionLoading={actionLoading === viewingCustomer.id}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)',
      borderLeft: `4px solid ${color}`,
      transition: 'all 0.3s ease',
      cursor: 'default',
      position: 'relative',
      overflow: 'hidden'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)'
      e.currentTarget.style.boxShadow = '0 8px 12px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)'
    }}
    >
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        right: 0, 
        width: '60px', 
        height: '60px', 
        background: `${color}15`,
        borderRadius: '0 12px 0 100%'
      }} />
      <div style={{ fontSize: 'clamp(28px, 5vw, 36px)', fontWeight: '700', color, marginBottom: '6px', position: 'relative', zIndex: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: '13px', color: '#6c757d', fontWeight: '500', position: 'relative', zIndex: 1 }}>{label}</div>
    </div>
  )
}

function CustomerCard({
  customer,
  onAction,
  onDelete,
  onEdit,
  onView,
  actionLoading,
  selected,
  onSelect
}: {
  customer: Customer
  onAction: (id: number, action: string) => void
  onDelete: (id: number, name: string) => void
  onEdit: () => void
  onView: () => void
  actionLoading: boolean
  selected?: boolean
  onSelect?: (selected: boolean) => void
}) {
  const getStatusColor = () => {
    if (customer.isBlocked) return '#e74c3c'
    if (['Paid', 'Partner'].includes(customer.payment_status)) return '#27ae60'
    return '#f39c12'
  }

  const getStatusBadge = () => {
    if (customer.isBlocked) return '🚨 Blocked'
    if (customer.payment_status === 'Partner') return '🤝 Partner'
    if (customer.payment_status === 'Paid') return '✅ Paid'
    return '⏳ Pending'
  }

  const nextCallDate = customer.next_call_scheduled_at 
    ? new Date(customer.next_call_scheduled_at)
    : null
  const isPast = nextCallDate && nextCallDate < new Date()

  return (
    <div style={{
      background: 'white',
      padding: 'clamp(12px, 3vw, 16px)',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      borderLeft: `4px solid ${getStatusColor()}`,
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)'
      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'
    }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          {onSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect(e.target.checked)}
              style={{ marginTop: '4px', cursor: 'pointer' }}
            />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: 'clamp(16px, 4vw, 18px)', color: '#2c3e50' }}>
                {customer.name || 'Unknown'}
              </h3>
            <span style={{
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600',
              background: getStatusColor() + '20',
              color: getStatusColor()
            }}>
              {getStatusBadge()}
            </span>
            {customer.hasSchedulingIssue && (
              <span style={{
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                background: '#fff3cd',
                color: '#856404'
              }}>
                ⚠️ Issue
              </span>
            )}
          </div>
          <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '4px' }}>
            📧 {customer.email}
          </div>
          <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
            📱 {customer.phone}
          </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={onView}
              disabled={actionLoading}
              style={{
                padding: '6px 12px',
                background: '#9b59b6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                fontSize: 'clamp(11px, 2.5vw, 12px)',
                opacity: actionLoading ? 0.6 : 1,
                whiteSpace: 'nowrap',
                transition: 'opacity 0.2s',
                minHeight: '32px'
              }}
            >
              View
            </button>
          <button
            onClick={onEdit}
            disabled={actionLoading}
            style={{
              padding: '6px 12px',
              background: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: actionLoading ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              opacity: actionLoading ? 0.6 : 1,
              whiteSpace: 'nowrap'
            }}
          >
            Edit
          </button>
          {customer.call_status === 'paused' ? (
            <button
              onClick={() => onAction(customer.id, 'resume')}
              disabled={actionLoading}
              style={{
                padding: '6px 12px',
                background: '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                opacity: actionLoading ? 0.6 : 1
              }}
            >
              Resume
            </button>
          ) : (
            <button
              onClick={() => onAction(customer.id, 'pause')}
              disabled={actionLoading}
              style={{
                padding: '6px 12px',
                background: '#f39c12',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                opacity: actionLoading ? 0.6 : 1
              }}
            >
              Pause
            </button>
          )}
          <button
            onClick={() => onDelete(customer.id, customer.name)}
            disabled={actionLoading}
            style={{
              padding: '6px 12px',
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: actionLoading ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              opacity: actionLoading ? 0.6 : 1
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginTop: '16px',
        paddingTop: '16px',
        borderTop: '1px solid #e0e0e0',
        fontSize: '13px'
      }}>
        <InfoItem label="Calls Made" value={customer.total_calls_made} />
        <InfoItem 
          label="Call Time" 
          value={customer.call_time_hour !== null && customer.call_time_minute !== null
            ? `${customer.call_time_hour}:${customer.call_time_minute.toString().padStart(2, '0')}`
            : customer.call_time || 'Not set'} 
        />
        <InfoItem label="Timezone" value={customer.timezone || 'Not set'} />
        <InfoItem 
          label="Next Call" 
          value={nextCallDate 
            ? (isPast 
                ? `⚠️ Past (${Math.floor((new Date().getTime() - nextCallDate.getTime()) / (1000 * 60 * 60))}h ago)`
                : nextCallDate.toLocaleString())
            : 'Not scheduled'} 
        />
        {customer.isBlocked && (
          <button
            onClick={() => onAction(customer.id, 'validate_phone')}
            disabled={actionLoading}
            style={{
              padding: '6px 12px',
              background: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: actionLoading ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              opacity: actionLoading ? 0.6 : 1
            }}
          >
            Fix Phone
          </button>
        )}
        {customer.hasSchedulingIssue && (
          <button
            onClick={() => onAction(customer.id, 'fix_scheduling')}
            disabled={actionLoading}
            style={{
              padding: '6px 12px',
              background: '#f39c12',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: actionLoading ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              opacity: actionLoading ? 0.6 : 1
            }}
          >
            Fix Scheduling
          </button>
        )}
      </div>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div style={{ color: '#7f8c8d', fontSize: '12px', marginBottom: '2px' }}>{label}</div>
      <div style={{ color: '#2c3e50', fontWeight: '500' }}>{value}</div>
    </div>
  )
}

function AddCustomerModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    timezone: 'America/New_York',
    call_time: '7:00 AM',
    payment_status: 'Pending'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/customers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create customer')
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Add New Customer">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div style={{ background: '#fee', color: '#721c24', padding: '12px', borderRadius: '6px', fontSize: '14px' }}>
            {error}
          </div>
        )}
        
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Email *</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Phone *</label>
          <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1234567890"
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Timezone</label>
          <select
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
          >
            <option value="America/New_York">Eastern (ET)</option>
            <option value="America/Chicago">Central (CT)</option>
            <option value="America/Denver">Mountain (MT)</option>
            <option value="America/Los_Angeles">Pacific (PT)</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Call Time</label>
          <input
            type="text"
            value={formData.call_time}
            onChange={(e) => setFormData({ ...formData, call_time: e.target.value })}
            placeholder="7:00 AM"
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Payment Status</label>
          <select
            value={formData.payment_status}
            onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
          >
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: '#95a5a6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Creating...' : 'Create Customer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function EditCustomerModal({ customer, onClose, onSuccess }: { customer: Customer; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: customer.name || '',
    email: customer.email || '',
    phone: customer.phone || '',
    timezone: customer.timezone || 'America/New_York',
    call_time: customer.call_time || '',
    call_time_hour: customer.call_time_hour?.toString() || '',
    call_time_minute: customer.call_time_minute?.toString() || '',
    payment_status: customer.payment_status || 'Pending',
    phone_validated: customer.phone_validated
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const updateData: any = { ...formData }
      if (updateData.call_time_hour) updateData.call_time_hour = parseInt(updateData.call_time_hour)
      if (updateData.call_time_minute) updateData.call_time_minute = parseInt(updateData.call_time_minute)

      const response = await fetch(`/api/admin/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update customer')
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose} title={`Edit ${customer.name}`}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div style={{ background: '#fee', color: '#721c24', padding: '12px', borderRadius: '6px', fontSize: '14px' }}>
            {error}
          </div>
        )}
        
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Name</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Email</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Phone</label>
          <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Timezone</label>
          <select
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
          >
            <option value="America/New_York">Eastern (ET)</option>
            <option value="America/Chicago">Central (CT)</option>
            <option value="America/Denver">Mountain (MT)</option>
            <option value="America/Los_Angeles">Pacific (PT)</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Call Hour</label>
            <input
              type="number"
              min="0"
              max="23"
              value={formData.call_time_hour}
              onChange={(e) => setFormData({ ...formData, call_time_hour: e.target.value })}
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Call Minute</label>
            <input
              type="number"
              min="0"
              max="59"
              value={formData.call_time_minute}
              onChange={(e) => setFormData({ ...formData, call_time_minute: e.target.value })}
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Payment Status</label>
          <select
            value={formData.payment_status}
            onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
          >
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
            <option value="Refunded">Refunded</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={formData.phone_validated}
              onChange={(e) => setFormData({ ...formData, phone_validated: e.target.checked })}
            />
            Phone Validated
          </label>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: '#95a5a6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ViewCustomerModal({
  customer,
  callHistory,
  context,
  onClose,
  onAction,
  onTriggerCall,
  actionLoading
}: {
  customer: Customer
  callHistory: any
  context: any
  onClose: () => void
  onAction: (id: number, action: string) => void
  onTriggerCall: (id: number, type: 'welcome' | 'daily') => void
  actionLoading: boolean
}) {
  const [activeSection, setActiveSection] = useState<'details' | 'calls' | 'context' | 'onboarding'>('details')
  const nextCallDate = customer.next_call_scheduled_at 
    ? new Date(customer.next_call_scheduled_at)
    : null
  const isPast = nextCallDate && nextCallDate < new Date()

  return (
    <Modal onClose={onClose} title={`${customer.name} - Complete Details`} large>
      {/* Section Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e0e0e0', flexWrap: 'wrap' }}>
        {(['details', 'calls', 'context', 'onboarding'] as const).map(section => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            style={{
              padding: '8px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeSection === section ? '2px solid #3498db' : '2px solid transparent',
              color: activeSection === section ? '#3498db' : '#7f8c8d',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeSection === section ? '600' : '400',
              textTransform: 'capitalize'
            }}
          >
            {section === 'details' && '📋 Details'}
            {section === 'calls' && '📞 Call History'}
            {section === 'context' && '🧠 Context'}
            {section === 'onboarding' && '🎯 Onboarding'}
          </button>
        ))}
      </div>

      {activeSection === 'details' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#2c3e50' }}>Contact Information</h3>
            <DetailRow label="Email" value={customer.email} />
            <DetailRow label="Phone" value={customer.phone} />
            <DetailRow label="Timezone" value={customer.timezone || 'Not set'} />
          </div>

          <div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#2c3e50' }}>Payment & Status</h3>
            <DetailRow label="Payment Status" value={customer.payment_status} />
            <DetailRow label="Phone Validated" value={customer.phone_validated ? '✅ Yes' : '❌ No'} />
            <DetailRow label="Call Status" value={customer.call_status || 'Active'} />
            <DetailRow label="Welcome Call" value={customer.welcome_call_completed ? '✅ Completed' : '❌ Not completed'} />
            {customer.stripe_customer_id && (
              <DetailRow label="Stripe Customer ID" value={customer.stripe_customer_id} />
            )}
            {customer.stripe_subscription_id && (
              <DetailRow label="Stripe Subscription ID" value={customer.stripe_subscription_id} />
            )}
          </div>

          <div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#2c3e50' }}>Call Scheduling</h3>
            <DetailRow 
              label="Call Time" 
              value={customer.call_time_hour !== null && customer.call_time_minute !== null
                ? `${customer.call_time_hour}:${customer.call_time_minute.toString().padStart(2, '0')}`
                : customer.call_time || 'Not set'} 
            />
            <DetailRow 
              label="Next Call Scheduled" 
              value={nextCallDate 
                ? (isPast 
                    ? `⚠️ Past (${Math.floor((new Date().getTime() - nextCallDate.getTime()) / (1000 * 60 * 60))}h ago)`
                    : nextCallDate.toLocaleString())
                : 'Not scheduled'} 
            />
            <DetailRow label="Total Calls Made" value={customer.total_calls_made.toString()} />
            <DetailRow label="Last Call Date" value={customer.last_call_date || 'Never'} />
            {customer.last_call_duration && (
              <DetailRow label="Last Call Duration" value={`${Math.floor(customer.last_call_duration / 60)}m ${customer.last_call_duration % 60}s`} />
            )}
          </div>

          <div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#2c3e50' }}>Last Call Transcript</h3>
            {customer.last_call_transcript ? (
              <div style={{
                background: '#f8f9fa',
                padding: '12px',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#2c3e50',
                maxHeight: '200px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6'
              }}>
                {customer.last_call_transcript}
              </div>
            ) : (
              <div style={{ color: '#7f8c8d', fontSize: '14px' }}>No transcript available</div>
            )}
          </div>

          <div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#2c3e50' }}>Timestamps</h3>
            <DetailRow label="Created" value={new Date(customer.created_at).toLocaleString()} />
          </div>

          {(customer.isBlocked || customer.hasSchedulingIssue) && (
            <div style={{
              background: '#fff3cd',
              border: '1px solid #f39c12',
              borderRadius: '6px',
              padding: '12px'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '8px', color: '#856404' }}>⚠️ Issues Detected</div>
              {customer.isBlocked && (
                <div style={{ marginBottom: '8px' }}>
                  <button
                    onClick={() => onAction(customer.id, 'validate_phone')}
                    disabled={actionLoading}
                    style={{
                      padding: '8px 16px',
                      background: '#3498db',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      opacity: actionLoading ? 0.6 : 1,
                      width: '100%'
                    }}
                  >
                    {actionLoading ? 'Processing...' : 'Fix Phone Validation'}
                  </button>
                </div>
              )}
              {customer.hasSchedulingIssue && (
                <div>
                  <button
                    onClick={() => onAction(customer.id, 'fix_scheduling')}
                    disabled={actionLoading}
                    style={{
                      padding: '8px 16px',
                      background: '#f39c12',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      opacity: actionLoading ? 0.6 : 1,
                      width: '100%'
                    }}
                  >
                    {actionLoading ? 'Processing...' : 'Fix Scheduling'}
                  </button>
                </div>
              )}
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '8px',
            paddingTop: '12px',
            borderTop: '1px solid #e0e0e0'
          }}>
            {['Paid', 'Partner'].includes(customer.payment_status) && customer.phone_validated && (
              <>
                {!customer.welcome_call_completed && (
                  <button
                    onClick={() => onTriggerCall(customer.id, 'welcome')}
                    disabled={actionLoading}
                    style={{
                      padding: '10px',
                      background: '#9b59b6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      opacity: actionLoading ? 0.6 : 1
                    }}
                  >
                    📞 Trigger Welcome Call
                  </button>
                )}
                <button
                  onClick={() => onTriggerCall(customer.id, 'daily')}
                  disabled={actionLoading}
                  style={{
                    padding: '10px',
                    background: '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    opacity: actionLoading ? 0.6 : 1
                  }}
                >
                  📞 Trigger Daily Call
                </button>
              </>
            )}
            {customer.call_status === 'paused' ? (
              <button
                onClick={() => onAction(customer.id, 'resume')}
                disabled={actionLoading}
                style={{
                  padding: '10px',
                  background: '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: actionLoading ? 0.6 : 1
                }}
              >
                Resume Calls
              </button>
            ) : (
              <button
                onClick={() => onAction(customer.id, 'pause')}
                disabled={actionLoading}
                style={{
                  padding: '10px',
                  background: '#f39c12',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: actionLoading ? 0.6 : 1
                }}
              >
                Pause Calls
              </button>
            )}
            <button
              onClick={() => onAction(customer.id, 'stop')}
              disabled={actionLoading}
              style={{
                padding: '10px',
                background: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: actionLoading ? 0.6 : 1
              }}
            >
              Stop Calls
            </button>
          </div>
        </div>
      )}

      {activeSection === 'calls' && (
        <CallHistorySection callHistory={callHistory} loading={!callHistory} />
      )}

      {activeSection === 'context' && (
        <ContextSection context={context} loading={!context} />
      )}

      {activeSection === 'onboarding' && (
        <OnboardingSection customer={customer} />
      )}
    </Modal>
  )
}

function CallHistorySection({ callHistory, loading }: { callHistory: any; loading: boolean }) {
  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>Loading call history...</div>
  }

  if (!callHistory || (!callHistory.callLogs?.length && !callHistory.queueItems?.length)) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>No call history available</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {callHistory.callLogs && callHistory.callLogs.length > 0 && (
        <div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#2c3e50' }}>Call Logs</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflow: 'auto' }}>
            {callHistory.callLogs.map((log: any, idx: number) => (
              <div key={idx} style={{
                background: '#f8f9fa',
                padding: '12px',
                borderRadius: '6px',
                borderLeft: `4px solid ${log.status === 'completed' ? '#27ae60' : log.status === 'failed' ? '#e74c3c' : '#f39c12'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <strong style={{ color: '#2c3e50' }}>{log.call_type}</strong>
                    <span style={{ marginLeft: '8px', padding: '2px 8px', background: log.status === 'completed' ? '#d4edda' : '#f8d7da', color: log.status === 'completed' ? '#155724' : '#721c24', borderRadius: '4px', fontSize: '12px' }}>
                      {log.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
                {log.duration_seconds && (
                  <div style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '4px' }}>
                    Duration: {Math.floor(log.duration_seconds / 60)}m {log.duration_seconds % 60}s
                  </div>
                )}
                {log.transcript && (
                  <details style={{ marginTop: '8px' }}>
                    <summary style={{ cursor: 'pointer', color: '#3498db', fontSize: '13px' }}>View Transcript</summary>
                    <div style={{
                      marginTop: '8px',
                      padding: '8px',
                      background: 'white',
                      borderRadius: '4px',
                      fontSize: '12px',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '200px',
                      overflow: 'auto'
                    }}>
                      {log.transcript}
                    </div>
                  </details>
                )}
                {log.error_message && (
                  <div style={{ marginTop: '8px', padding: '8px', background: '#fee', borderRadius: '4px', fontSize: '12px', color: '#721c24' }}>
                    Error: {log.error_message}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {callHistory.queueItems && callHistory.queueItems.length > 0 && (
        <div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#2c3e50' }}>Queue Items</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {callHistory.queueItems.map((item: any, idx: number) => (
              <div key={idx} style={{
                background: '#f8f9fa',
                padding: '10px',
                borderRadius: '6px',
                fontSize: '13px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span><strong>{item.call_type}</strong> - {item.status}</span>
                  <span style={{ color: '#7f8c8d' }}>
                    {item.scheduled_for ? new Date(item.scheduled_for).toLocaleString() : 'Not scheduled'}
                  </span>
                </div>
                {item.attempts > 0 && (
                  <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>
                    Attempts: {item.attempts}/{item.max_attempts}
                  </div>
                )}
                {item.error_message && (
                  <div style={{ marginTop: '4px', fontSize: '12px', color: '#e74c3c' }}>
                    Error: {item.error_message}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ContextSection({ context, loading }: { context: any; loading: boolean }) {
  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>Loading context...</div>
  }

  if (!context || (!context.context && !context.onboarding)) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>No context data available</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {context.context && Object.keys(context.context).length > 0 && (
        <div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#2c3e50' }}>Learned Context</h3>
          <div style={{
            background: '#f8f9fa',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '13px',
            maxHeight: '300px',
            overflow: 'auto'
          }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
              {JSON.stringify(context.context, null, 2)}
            </pre>
          </div>
          {context.contextUpdatedAt && (
            <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '8px' }}>
              Last updated: {new Date(context.contextUpdatedAt).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function OnboardingSection({ customer }: { customer: Customer }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {customer.user_story && (
        <div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#2c3e50' }}>User Story</h3>
          <div style={{
            background: '#f8f9fa',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '14px',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.6'
          }}>
            {customer.user_story}
          </div>
        </div>
      )}

      {customer.lulu_response && (
        <div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#2c3e50' }}>Lulu's Response</h3>
          <div style={{
            background: '#f8f9fa',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '14px',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.6'
          }}>
            {customer.lulu_response}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {customer.extracted_goal && (
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#2c3e50' }}>Extracted Goal</h4>
            <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '6px', fontSize: '13px' }}>
              {customer.extracted_goal}
            </div>
          </div>
        )}
        {customer.extracted_insecurity && (
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#2c3e50' }}>Extracted Insecurity</h4>
            <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '6px', fontSize: '13px' }}>
              {customer.extracted_insecurity}
            </div>
          </div>
        )}
        {customer.extracted_blocker && (
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#2c3e50' }}>Extracted Blocker</h4>
            <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '6px', fontSize: '13px' }}>
              {customer.extracted_blocker}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AnalyticsTab({ 
  analytics, 
  loading, 
  days, 
  onDaysChange, 
  onExport 
}: { 
  analytics: any
  loading: boolean
  days: number
  onDaysChange: (days: number) => void
  onExport: () => void
}) {
  if (loading) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '60px 20px', 
        color: '#7f8c8d',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.07)'
      }}>
        <div style={{ fontSize: '18px', marginBottom: '8px' }}>📊</div>
        <div style={{ fontSize: '16px', fontWeight: '500' }}>Loading analytics...</div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '60px 20px', 
        color: '#7f8c8d',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.07)'
      }}>
        <div style={{ fontSize: '18px', marginBottom: '8px' }}>📊</div>
        <div style={{ fontSize: '16px', fontWeight: '500' }}>No analytics data available</div>
      </div>
    )
  }

  // Prepare chart data
  const dailyTrendsData = analytics.dailyTrends?.map((d: any) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    calls: d.callCount,
    successful: d.successfulCount
  })) || []

  const customerGrowthData = analytics.customerGrowth?.map((g: any) => ({
    date: new Date(g.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    customers: g.newCustomers
  })) || []

  const callStatusData = analytics.callStats ? [
    { name: 'Successful', value: analytics.callStats.successful_calls || 0, color: '#27ae60' },
    { name: 'Failed', value: analytics.callStats.failed_calls || 0, color: '#e74c3c' },
    { name: 'No Answer', value: analytics.callStats.no_answer_calls || 0, color: '#f39c12' }
  ].filter(item => item.value > 0) : []

  const successRate = analytics.callStats?.total_calls 
    ? Math.round((analytics.callStats.successful_calls / analytics.callStats.total_calls) * 100) 
    : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header with Time Range Selector */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        padding: '20px 24px', 
        borderRadius: '12px', 
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', color: 'white', fontWeight: '700' }}>📊 Analytics Dashboard</h2>
          <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>Comprehensive insights into your call system</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={days}
            onChange={(e) => onDaysChange(parseInt(e.target.value))}
            style={{
              padding: '10px 16px',
              background: 'rgba(255,255,255,0.95)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#2c3e50',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
          <button
            onClick={() => {
              if (analytics) {
                const blob = new Blob([JSON.stringify(analytics, null, 2)], { type: 'application/json' })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `analytics-${new Date().toISOString().split('T')[0]}.json`
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)
              }
            }}
            disabled={!analytics}
            style={{
              padding: '10px 16px',
              background: analytics ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.5)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: analytics ? '#2c3e50' : 'rgba(255,255,255,0.7)',
              cursor: analytics ? 'pointer' : 'not-allowed',
              boxShadow: analytics ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (analytics) {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
              }
            }}
            onMouseLeave={(e) => {
              if (analytics) {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
              }
            }}
          >
            📥 Export Data
          </button>
        </div>
      </div>

      {/* Call Statistics with Success Rate */}
      {analytics.callStats && (
        <div style={{ 
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)', 
          padding: '24px', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#2c3e50', fontWeight: '600' }}>📞 Call Statistics (Last {days} Days)</h2>
            {successRate > 0 && (
              <div style={{
                padding: '8px 16px',
                background: successRate >= 80 ? 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)' : successRate >= 60 ? 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)' : 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                color: 'white',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                {successRate}% Success Rate
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
            <StatCard label="Total Calls" value={analytics.callStats.total_calls || 0} color="#3498db" />
            <StatCard label="Successful" value={analytics.callStats.successful_calls || 0} color="#27ae60" />
            <StatCard label="Failed" value={analytics.callStats.failed_calls || 0} color="#e74c3c" />
            <StatCard label="No Answer" value={analytics.callStats.no_answer_calls || 0} color="#f39c12" />
            <StatCard 
              label="Avg Duration" 
              value={analytics.callStats.avg_duration ? `${Math.floor(analytics.callStats.avg_duration / 60)}m ${Math.round(analytics.callStats.avg_duration % 60)}s` : '0m'} 
              color="#9b59b6" 
            />
          </div>
        </div>
      )}

      {/* Success Rate Trend */}
      {analytics.successRateTrends && analytics.successRateTrends.length > 0 && (
        <div style={{ 
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)', 
          padding: '24px', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50', fontWeight: '600' }}>📈 Success Rate Trend</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={analytics.successRateTrends.map((r: any) => ({
              date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              rate: r.successRate
            }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="date" stroke="#7f8c8d" fontSize={12} />
              <YAxis stroke="#7f8c8d" fontSize={12} domain={[0, 100]} label={{ value: 'Success Rate %', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                contentStyle={{ 
                  background: 'white', 
                  border: '1px solid #e0e0e0', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
                formatter={(value: any) => [`${value.toFixed(1)}%`, 'Success Rate']}
              />
              <Line 
                type="monotone" 
                dataKey="rate" 
                stroke="#27ae60" 
                strokeWidth={3}
                dot={{ fill: '#27ae60', r: 4 }}
                activeDot={{ r: 6 }}
                name="Success Rate"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Daily Call Trends Chart */}
      {dailyTrendsData.length > 0 && (
        <div style={{ 
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)', 
          padding: '24px', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50', fontWeight: '600' }}>📊 Daily Call Volume</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyTrendsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3498db" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3498db" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorSuccessful" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#27ae60" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#27ae60" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="date" stroke="#7f8c8d" fontSize={12} />
              <YAxis stroke="#7f8c8d" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  background: 'white', 
                  border: '1px solid #e0e0e0', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }} 
              />
              <Legend />
              <Area type="monotone" dataKey="calls" stroke="#3498db" fillOpacity={1} fill="url(#colorCalls)" name="Total Calls" />
              <Area type="monotone" dataKey="successful" stroke="#27ae60" fillOpacity={1} fill="url(#colorSuccessful)" name="Successful" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Hourly Distribution */}
      {analytics.hourlyDistribution && analytics.hourlyDistribution.length > 0 && (
        <div style={{ 
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)', 
          padding: '24px', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50', fontWeight: '600' }}>🕐 Hourly Call Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.hourlyDistribution.map((h: any) => ({
              hour: `${h.hour}:00`,
              calls: h.callCount,
              successful: h.successfulCount
            }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="hour" stroke="#7f8c8d" fontSize={12} angle={-45} textAnchor="end" height={60} />
              <YAxis stroke="#7f8c8d" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  background: 'white', 
                  border: '1px solid #e0e0e0', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }} 
              />
              <Legend />
              <Bar dataKey="calls" fill="#3498db" radius={[4, 4, 0, 0]} name="Total Calls" />
              <Bar dataKey="successful" fill="#27ae60" radius={[4, 4, 0, 0]} name="Successful" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Call Duration Trends */}
      {analytics.durationTrends && analytics.durationTrends.length > 0 && (
        <div style={{ 
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)', 
          padding: '24px', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50', fontWeight: '600' }}>⏱️ Average Call Duration Trend</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={analytics.durationTrends.map((d: any) => ({
              date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              duration: d.avgDuration ? Math.round(d.avgDuration) : 0
            }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="date" stroke="#7f8c8d" fontSize={12} />
              <YAxis stroke="#7f8c8d" fontSize={12} label={{ value: 'Seconds', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                contentStyle={{ 
                  background: 'white', 
                  border: '1px solid #e0e0e0', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
                formatter={(value: any) => [`${Math.floor(value / 60)}m ${Math.round(value % 60)}s`, 'Avg Duration']}
              />
              <Line 
                type="monotone" 
                dataKey="duration" 
                stroke="#9b59b6" 
                strokeWidth={3}
                dot={{ fill: '#9b59b6', r: 4 }}
                activeDot={{ r: 6 }}
                name="Duration (seconds)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Charts Row - Side by Side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Call Status Distribution */}
        {callStatusData.length > 0 && (
          <div style={{ 
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)', 
            padding: '24px', 
            borderRadius: '12px', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)'
          }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50', fontWeight: '600' }}>🥧 Call Status Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={callStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {callStatusData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    background: 'white', 
                    border: '1px solid #e0e0e0', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Payment Status Breakdown */}
        {analytics.paymentBreakdown && analytics.paymentBreakdown.length > 0 && (
          <div style={{ 
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)', 
            padding: '24px', 
            borderRadius: '12px', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)'
          }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50', fontWeight: '600' }}>💳 Payment Status Breakdown</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.paymentBreakdown.map((p: any) => ({
                    name: p.status,
                    value: p.count,
                    color: p.status === 'Paid' ? '#27ae60' : p.status === 'Partner' ? '#9b59b6' : '#f39c12'
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.paymentBreakdown.map((p: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={p.status === 'Paid' ? '#27ae60' : p.status === 'Partner' ? '#9b59b6' : '#f39c12'} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    background: 'white', 
                    border: '1px solid #e0e0e0', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Call Type Distribution */}
      {analytics.callTypeDistribution && analytics.callTypeDistribution.length > 0 && (
        <div style={{ 
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)', 
          padding: '24px', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50', fontWeight: '600' }}>📞 Call Type Performance</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {analytics.callTypeDistribution.map((ct: any, idx: number) => (
              <div key={idx} style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                borderRadius: '10px',
                border: '2px solid #e0e0e0',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                  {ct.type === 'welcome' ? '👋' : '📞'}
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#2c3e50', marginBottom: '4px', textTransform: 'capitalize' }}>
                  {ct.type} Calls
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#3498db', marginBottom: '8px' }}>
                  {ct.count}
                </div>
                <div style={{ fontSize: '13px', color: '#7f8c8d' }}>
                  {ct.successful} successful ({ct.count > 0 ? Math.round((ct.successful / ct.count) * 100) : 0}%)
                </div>
                {ct.avgDuration && (
                  <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>
                    Avg: {Math.floor(ct.avgDuration / 60)}m {Math.round(ct.avgDuration % 60)}s
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer Growth Chart */}
      {customerGrowthData.length > 0 && (
        <div style={{ 
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)', 
          padding: '24px', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50', fontWeight: '600' }}>👥 Customer Growth</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={customerGrowthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="date" stroke="#7f8c8d" fontSize={12} />
              <YAxis stroke="#7f8c8d" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  background: 'white', 
                  border: '1px solid #e0e0e0', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }} 
              />
              <Bar dataKey="customers" fill="#9b59b6" radius={[8, 8, 0, 0]} name="New Customers" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Customers */}
      {analytics.topCustomers && analytics.topCustomers.length > 0 && (
        <div style={{ 
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)', 
          padding: '24px', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50', fontWeight: '600' }}>⭐ Top Customers by Calls</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {analytics.topCustomers.map((c: any, idx: number) => (
              <div key={idx} style={{
                padding: '16px',
                background: idx === 0 ? 'linear-gradient(135deg, #fff9e6 0%, #ffffff 100%)' : '#f8f9fa',
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                border: idx === 0 ? '2px solid #f39c12' : '1px solid #e0e0e0',
                transition: 'all 0.2s ease',
                boxShadow: idx === 0 ? '0 2px 4px rgba(243, 156, 18, 0.2)' : '0 1px 2px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)'
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)'
                e.currentTarget.style.boxShadow = idx === 0 ? '0 2px 4px rgba(243, 156, 18, 0.2)' : '0 1px 2px rgba(0,0,0,0.05)'
              }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {idx === 0 && <span style={{ fontSize: '24px' }}>🏆</span>}
                  <div>
                    <div style={{ fontWeight: '600', color: '#2c3e50', fontSize: '15px' }}>{c.name}</div>
                    <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '2px' }}>{c.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '20px', fontSize: '14px', alignItems: 'center' }}>
                  <div style={{ 
                    padding: '6px 12px', 
                    background: '#3498db', 
                    color: 'white', 
                    borderRadius: '20px',
                    fontWeight: '600',
                    fontSize: '13px'
                  }}>
                    {c.callCount} calls
                  </div>
                  {c.avgDuration && (
                    <div style={{ color: '#7f8c8d', fontSize: '13px' }}>
                      Avg: <strong style={{ color: '#2c3e50' }}>{Math.floor(c.avgDuration / 60)}m {Math.round(c.avgDuration % 60)}s</strong>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Queue Statistics */}
      {analytics.queueStats && (
        <div style={{ 
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)', 
          padding: '24px', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50', fontWeight: '600' }}>⚙️ Queue Status</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
            <StatCard label="Pending" value={analytics.queueStats.pending || 0} color="#f39c12" />
            <StatCard label="Processing" value={analytics.queueStats.processing || 0} color="#3498db" />
            <StatCard label="Failed" value={analytics.queueStats.failed || 0} color="#e74c3c" />
            <StatCard label="Retrying" value={analytics.queueStats.retrying || 0} color="#9b59b6" />
          </div>
        </div>
      )}
    </div>
  )
}

function PartnerCodesTab({
  codes,
  loading,
  onCreateCode,
  onToggleActive,
  onDelete,
  showCreateModal,
  onCloseCreateModal,
  onCreateClick,
  newCode,
  setNewCode,
  codeExpiresAt,
  setCodeExpiresAt,
  codeNotes,
  setCodeNotes,
  creatingCode
}: {
  codes: any[]
  loading: boolean
  onCreateCode: (code: string, expiresAt: string | null, notes: string | null) => Promise<void>
  onToggleActive: (codeId: number, isActive: boolean) => Promise<void>
  onDelete: (codeId: number) => Promise<void>
  showCreateModal: boolean
  onCloseCreateModal: () => void
  onCreateClick: () => void
  newCode: string
  setNewCode: (code: string) => void
  codeExpiresAt: string
  setCodeExpiresAt: (date: string) => void
  codeNotes: string
  setCodeNotes: (notes: string) => void
  creatingCode: boolean
}) {
  if (loading && codes.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>Loading partner codes...</div>
  }

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header with Create Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#2c3e50' }}>Partner Access Codes</h2>
        <button
          onClick={onCreateClick}
          style={{
            padding: '10px 20px',
            background: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          + Create Code
        </button>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px'
      }}>
        <StatCard label="Total Codes" value={codes.length} color="#3498db" />
        <StatCard label="Active" value={codes.filter(c => c.isActive && !c.isUsed).length} color="#27ae60" />
        <StatCard label="Used" value={codes.filter(c => c.isUsed).length} color="#95a5a6" />
        <StatCard label="Inactive" value={codes.filter(c => !c.isActive).length} color="#e74c3c" />
      </div>

      {/* Codes List */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#2c3e50' }}>Code</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#2c3e50' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#2c3e50' }}>Used By</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#2c3e50' }}>Created</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#2c3e50' }}>Expires</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#2c3e50' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {codes.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>
                  No partner codes created yet
                </td>
              </tr>
            ) : (
              codes.map((code) => (
                <tr key={code.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                  <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: '600', fontSize: '14px' }}>
                    {code.code}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {code.isUsed ? (
                      <span style={{ padding: '4px 8px', background: '#95a5a6', color: 'white', borderRadius: '4px', fontSize: '12px' }}>
                        ✓ Used
                      </span>
                    ) : code.isActive ? (
                      <span style={{ padding: '4px 8px', background: '#27ae60', color: 'white', borderRadius: '4px', fontSize: '12px' }}>
                        Active
                      </span>
                    ) : (
                      <span style={{ padding: '4px 8px', background: '#e74c3c', color: 'white', borderRadius: '4px', fontSize: '12px' }}>
                        Inactive
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px' }}>
                    {code.usedByName ? (
                      <div>
                        <div style={{ fontWeight: '500' }}>{code.usedByName}</div>
                        <div style={{ color: '#7f8c8d', fontSize: '12px' }}>{code.usedByEmail}</div>
                      </div>
                    ) : (
                      <span style={{ color: '#95a5a6' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#7f8c8d' }}>
                    {new Date(code.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#7f8c8d' }}>
                    {code.expiresAt ? new Date(code.expiresAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {!code.isUsed && (
                        <button
                          onClick={() => onToggleActive(code.id, !code.isActive)}
                          style={{
                            padding: '6px 12px',
                            background: code.isActive ? '#e74c3c' : '#27ae60',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
                          {code.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(code.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#e74c3c',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Code Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50' }}>Create Partner Code</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#2c3e50' }}>
                Code (leave empty to generate)
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="PARTNER2024"
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    textTransform: 'uppercase'
                  }}
                />
                <button
                  onClick={() => setNewCode(generateRandomCode())}
                  style={{
                    padding: '10px 16px',
                    background: '#f8f9fa',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                >
                  Generate
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#2c3e50' }}>
                Expires At (optional)
              </label>
              <input
                type="date"
                value={codeExpiresAt}
                onChange={(e) => setCodeExpiresAt(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#2c3e50' }}>
                Notes (optional)
              </label>
              <textarea
                value={codeNotes}
                onChange={(e) => setCodeNotes(e.target.value)}
                placeholder="Internal notes about this code..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={onCloseCreateModal}
                disabled={creatingCode}
                style={{
                  padding: '10px 20px',
                  background: '#f8f9fa',
                  color: '#2c3e50',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: creatingCode ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => onCreateCode(
                  newCode || generateRandomCode(),
                  codeExpiresAt || null,
                  codeNotes || null
                )}
                disabled={creatingCode}
                style={{
                  padding: '10px 20px',
                  background: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: creatingCode ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: creatingCode ? 0.6 : 1
                }}
              >
                {creatingCode ? 'Creating...' : 'Create Code'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SystemHealthTab({ health, loading }: { health: any; loading: boolean }) {
  if (loading) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '60px 20px', 
        color: '#7f8c8d',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.07)'
      }}>
        <div style={{ fontSize: '18px', marginBottom: '8px' }}>⚙️</div>
        <div style={{ fontSize: '16px', fontWeight: '500' }}>Loading system health...</div>
      </div>
    )
  }

  if (!health) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '60px 20px', 
        color: '#7f8c8d',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.07)'
      }}>
        <div style={{ fontSize: '18px', marginBottom: '8px' }}>⚙️</div>
        <div style={{ fontSize: '16px', fontWeight: '500' }}>No system health data available</div>
      </div>
    )
  }

  const dbHealthy = health.database?.healthy
  const queueHealthy = health.queueHealth && health.queueHealth.overdue === 0 && health.queueHealth.failed < 10
  const overallHealthy = dbHealthy && queueHealthy

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Overall Health Status */}
      <div style={{ 
        background: overallHealthy 
          ? 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)' 
          : 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
        padding: '24px', 
        borderRadius: '12px', 
        boxShadow: overallHealthy 
          ? '0 4px 12px rgba(39, 174, 96, 0.3)' 
          : '0 4px 12px rgba(231, 76, 60, 0.3)',
        color: 'white'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '700' }}>
              {overallHealthy ? '✅ System Healthy' : '⚠️ System Issues Detected'}
            </h2>
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.95 }}>
              {overallHealthy 
                ? 'All systems operational' 
                : 'Some components require attention'}
            </p>
          </div>
          <div style={{ 
            fontSize: '48px',
            opacity: 0.9
          }}>
            {overallHealthy ? '✅' : '⚠️'}
          </div>
        </div>
      </div>

      {/* Database Health */}
      <div style={{ 
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)', 
        padding: '24px', 
        borderRadius: '12px', 
        boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#2c3e50', fontWeight: '600' }}>🗄️ Database Status</h2>
          <div style={{
            padding: '8px 16px',
            background: dbHealthy ? 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)' : 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
            color: 'white',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '600',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {dbHealthy ? '✅ Healthy' : '❌ Unhealthy'}
          </div>
        </div>
        {health.database?.timestamp && (
          <div style={{ fontSize: '13px', color: '#7f8c8d' }}>
            Last checked: {new Date(health.database.timestamp).toLocaleString()}
          </div>
        )}
      </div>

      {/* Queue Health */}
      {health.queueHealth && (
        <div style={{ 
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)', 
          padding: '24px', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#2c3e50', fontWeight: '600' }}>📋 Call Queue Health</h2>
            {queueHealthy && (
              <div style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                color: 'white',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '600',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                ✅ Operating Normally
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
            <StatCard label="Total" value={health.queueHealth.total || 0} color="#3498db" />
            <StatCard label="Pending" value={health.queueHealth.pending || 0} color="#f39c12" />
            <StatCard label="Processing" value={health.queueHealth.processing || 0} color="#3498db" />
            <StatCard label="Failed" value={health.queueHealth.failed || 0} color="#e74c3c" />
            {health.queueHealth.overdue > 0 && (
              <StatCard label="⚠️ Overdue" value={health.queueHealth.overdue || 0} color="#e74c3c" />
            )}
          </div>
        </div>
      )}

      {/* Recent Errors */}
      {health.recentErrors && health.recentErrors.length > 0 && (
        <div style={{ 
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)', 
          padding: '24px', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#2c3e50', fontWeight: '600' }}>⚠️ Recent Errors</h2>
            <div style={{
              padding: '6px 12px',
              background: '#fee',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '600',
              color: '#721c24'
            }}>
              {health.recentErrors.length} error{health.recentErrors.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflow: 'auto' }}>
            {health.recentErrors.map((error: any, idx: number) => (
              <div key={idx} style={{
                padding: '16px',
                background: 'linear-gradient(135deg, #fee 0%, #fff5f5 100%)',
                borderRadius: '10px',
                borderLeft: '4px solid #e74c3c',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)'
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'
              }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontSize: '14px', color: '#721c24', fontWeight: '600' }}>
                    Customer {error.customerId} - {error.callType}
                  </div>
                  <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                    {new Date(error.createdAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: '#856404', lineHeight: '1.5' }}>
                  {error.errorMessage}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customers with Issues */}
      {health.customersWithIssues && health.customersWithIssues.length > 0 && (
        <div style={{ 
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)', 
          padding: '24px', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#2c3e50', fontWeight: '600' }}>👥 Customers with Issues</h2>
            <div style={{
              padding: '6px 12px',
              background: '#fff3cd',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '600',
              color: '#856404'
            }}>
              {health.customersWithIssues.length} customer{health.customersWithIssues.length !== 1 ? 's' : ''} need attention
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflow: 'auto' }}>
            {health.customersWithIssues.map((c: any, idx: number) => (
              <div key={idx} style={{
                padding: '16px',
                background: 'linear-gradient(135deg, #fff3cd 0%, #fffef5 100%)',
                borderRadius: '10px',
                borderLeft: '4px solid #f39c12',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)'
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'
              }}
              >
                <div style={{ fontWeight: '600', color: '#2c3e50', marginBottom: '8px', fontSize: '15px' }}>
                  {c.name} <span style={{ fontSize: '13px', fontWeight: '400', color: '#7f8c8d' }}>({c.email})</span>
                </div>
                <div style={{ fontSize: '13px', color: '#856404', lineHeight: '1.6' }}>
                  {!c.phoneValidated && <span style={{ display: 'inline-block', marginRight: '8px', marginBottom: '4px' }}>❌ Phone not validated</span>}
                  {!c.hasCallTime && <span style={{ display: 'inline-block', marginRight: '8px', marginBottom: '4px' }}>❌ Missing call time</span>}
                  {!c.hasScheduledTime && <span style={{ display: 'inline-block', marginRight: '8px', marginBottom: '4px' }}>❌ Not scheduled</span>}
                  {c.isScheduledPast && <span style={{ display: 'inline-block', marginRight: '8px', marginBottom: '4px' }}>⚠️ Scheduled time in past</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '14px', color: '#2c3e50', fontWeight: '500' }}>{value}</div>
    </div>
  )
}

function Modal({ children, onClose, title, large }: { children: React.ReactNode; onClose: () => void; title: string; large?: boolean }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    }} onClick={onClose}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        maxWidth: large ? '900px' : '600px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        margin: 'auto'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          background: 'white',
          zIndex: 10
        }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(18px, 4vw, 20px)', color: '#2c3e50' }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#7f8c8d',
              padding: '0',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
