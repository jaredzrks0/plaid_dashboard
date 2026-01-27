'use client'

import { useState, useEffect, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Account {
  account_id: string
  account_name: string
  available_balance: number | null
  current_balance: number | null
  major_account_type: string
  account_type: string
  institution_name: string
  last_updated: string
  display_name: string
  [key: string]: any
}

interface CurrentBalance {
  account_id: string
  display_name: string
  account_type: string
  current_balance: number
  last_updated: string
  last_pulled: string
  institution_name: string
}

export default function HomePage() {
  const [items, setItems] = useState<Account[]>([])
  const [currentBalances, setCurrentBalances] = useState<CurrentBalance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAccountTypes, setSelectedAccountTypes] = useState<string[]>([])
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [groupBy, setGroupBy] = useState<'institution' | 'account_type'>('institution')
  const [chartGroupBy, setChartGroupBy] = useState<'account' | 'institution'>('account')
  
  // Default to current month
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  
  const [minDate, setMinDate] = useState<string>(firstDayOfMonth.toISOString().split('T')[0])
  const [maxDate, setMaxDate] = useState<string>(lastDayOfMonth.toISOString().split('T')[0])
  const [datePreset, setDatePreset] = useState<'current' | 'last' | 'all' | 'custom'>('current')

  // Format currency with commas
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  // Format account type for display
  const formatAccountType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  useEffect(() => {
    async function fetchItems() {
      try {
        const [accountsRes, currentBalancesRes] = await Promise.all([
          fetch('http://localhost:8000/accounts/'),
          fetch('http://localhost:8000/accounts/current-balances')
        ])
        const accountsData = await accountsRes.json()
        const currentBalancesData = await currentBalancesRes.json()
        setItems(accountsData)
        setCurrentBalances(currentBalancesData)
        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching items:', error)
        setIsLoading(false)
      }
    }

    fetchItems()
  }, [])

  // Get unique account types and account names for filtering
  const accountTypes = useMemo(() => {
    return Array.from(new Set(items.map(item => item.account_type)))
  }, [items])

  const accountNames = useMemo(() => {
    // If account types are selected, only show accounts of those types
    if (selectedAccountTypes.length > 0) {
      return Array.from(
        new Set(
          items
            .filter(item => selectedAccountTypes.includes(item.account_type))
            .map(item => item.display_name)
        )
      )
    }
    return Array.from(new Set(items.map(item => item.display_name)))
  }, [items, selectedAccountTypes])

  // Filter items based on selected filters
  const filteredItems = useMemo(() => {
    return currentBalances.filter(item => {
      const typeMatch = selectedAccountTypes.length === 0 || selectedAccountTypes.includes(item.account_type)
      const nameMatch = selectedAccounts.length === 0 || selectedAccounts.includes(item.display_name)
      return typeMatch && nameMatch
    })
  }, [currentBalances, selectedAccountTypes, selectedAccounts])

  // Calculate total balance by account type
  const balanceByType = useMemo(() => {
    return accountTypes.map(type => {
      const typeBalance = filteredItems
        .filter(item => item.account_type === type)
        .reduce((sum, item) => {
          const balance = item.current_balance || 0
          // Credit cards are negated (they represent debt)
          const adjustedBalance = item.account_type === 'credit_card' ? -balance : balance
          return sum + adjustedBalance
        }, 0)
      
      // Show N/A if this type is filtered out but has accounts
      const typeHasAccounts = items.some(item => item.account_type === type)
      const isFiltered = selectedAccountTypes.length > 0 && !selectedAccountTypes.includes(type)
      
      return {
        type,
        balance: typeBalance,
        showNA: isFiltered && typeHasAccounts
      }
    })
  }, [filteredItems, accountTypes, items, selectedAccountTypes])

  const totalBalance = useMemo(() => {
    return filteredItems.reduce((sum, item) => {
      const balance = item.current_balance || 0
      // Credit cards are negated (they represent debt)
      const adjustedBalance = item.account_type === 'credit_card' ? -balance : balance
      return sum + adjustedBalance
    }, 0)
  }, [filteredItems])

  // Prepare data for chart (balance over time by account or institution)
  const chartData = useMemo(() => {
    // Create a map of account display names to their last_pulled dates
    const accountLastPulled = new Map<string, Date>()
    currentBalances.forEach(item => {
      accountLastPulled.set(item.display_name, new Date(item.last_pulled))
    })
    
    // Parse user-defined date filters
    const userMinDate = minDate ? new Date(minDate) : null
    const userMaxDate = maxDate ? new Date(maxDate) : null
    
    // Filter historical items based on selected filters
    const chartFilteredItems = items.filter(item => {
      const typeMatch = selectedAccountTypes.length === 0 || selectedAccountTypes.includes(item.account_type)
      const nameMatch = selectedAccounts.length === 0 || selectedAccounts.includes(item.display_name)
      
      // Apply user-defined date filters
      const itemDate = new Date(item.last_updated)
      const userDateMatch = (!userMinDate || itemDate >= userMinDate) && (!userMaxDate || itemDate <= userMaxDate)
      
      return typeMatch && nameMatch && userDateMatch
    })
    
    // Debug: log unique institutions in chart data
    const uniqueInstitutions = Array.from(new Set(chartFilteredItems.map(item => item.institution_name)))
    console.log('Chart institutions:', uniqueInstitutions)
    console.log('Chart filtered items count:', chartFilteredItems.length)
    console.log('Total items count:', items.length)
    
    // Debug: log date ranges by institution
    const institutionDateRanges = new Map()
    items.forEach(item => {
      const institution = item.institution_name
      const date = new Date(item.last_pulled)
      if (!institutionDateRanges.has(institution)) {
        institutionDateRanges.set(institution, { min: date, max: date })
      } else {
        const range = institutionDateRanges.get(institution)
        if (date < range.min) range.min = date
        if (date > range.max) range.max = date
      }
    })
    console.log('Institution date ranges:', Object.fromEntries(
      Array.from(institutionDateRanges.entries()).map(([inst, range]) => [
        inst, 
        { min: range.min.toDateString(), max: range.max.toDateString() }
      ])
    ))
    console.log('Current filter range:', { minDate, maxDate })
    
    // Group by timestamp first, then sum by account or institution
    const timeSeriesMap = new Map<string, { [key: string]: number }>()
    const allGroups = new Set<string>()
    const groupToInstitution = new Map<string, string>()
    
    chartFilteredItems.forEach(item => {
      const groupKey = chartGroupBy === 'account' ? item.display_name : item.institution_name
      allGroups.add(groupKey)
      groupToInstitution.set(groupKey, item.institution_name)
      // Group by date only (not full timestamp)
      const date = new Date(item.last_pulled).toDateString()
      if (!timeSeriesMap.has(date)) {
        timeSeriesMap.set(date, {})
      }
      const timeData = timeSeriesMap.get(date)!
      const balance = item.current_balance || 0
      // Credit cards are negated (they represent debt)
      const adjustedBalance = item.account_type === 'credit_card' ? -balance : balance
      
      // Take the most recent entry for this group on this date
      // Since items might be sorted, we'll overwrite with latest
      timeData[groupKey] = adjustedBalance
    })
    
    // Convert to array and sort by timestamp
    let data = Array.from(timeSeriesMap.entries())
      .map(([dateString, groups]) => {
        // Ensure all groups are present in each timestamp
        const completeData: { [key: string]: any } = { timestamp: new Date(dateString).toISOString() }
        allGroups.forEach(group => {
          completeData[group] = groups[group] !== undefined ? groups[group] : null
        })
        return completeData
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    
    // Forward fill: for each timestamp, fill null values with the last known balance
    data = data.map((entry, idx) => {
      const filledEntry = { ...entry }
      allGroups.forEach(group => {
        if (filledEntry[group] === null) {
          // Look back to find the most recent non-null value
          for (let i = idx - 1; i >= 0; i--) {
            if (data[i][group] !== null && data[i][group] !== undefined) {
              filledEntry[group] = data[i][group]
              break
            }
          }
          // If still not found, use the first value for this group
          if (filledEntry[group] === null || filledEntry[group] === undefined) {
            for (let i = idx + 1; i < data.length; i++) {
              if (data[i][group] !== null && data[i][group] !== undefined) {
                filledEntry[group] = data[i][group]
                break
              }
            }
          }
        }
      })
      return filledEntry
    })
    
    // Interpolate between data points for smoother visualization
    if (data.length > 1) {
      const interpolatedData = []
      
      for (let i = 0; i < data.length - 1; i++) {
        interpolatedData.push(data[i])
        
        const currentDate = new Date(data[i].timestamp)
        const nextDate = new Date(data[i + 1].timestamp)
        const timeDiffMs = nextDate.getTime() - currentDate.getTime()
        const daysDiff = timeDiffMs / (1000 * 60 * 60 * 24)
        
        // If there's more than 1 day between points, interpolate
        if (daysDiff > 1) {
          const numSteps = Math.ceil(daysDiff)
          for (let step = 1; step < numSteps; step++) {
            const ratio = step / numSteps
            const interpolatedDate = new Date(currentDate.getTime() + timeDiffMs * ratio)
            const interpolatedEntry: { [key: string]: any } = { timestamp: interpolatedDate.toISOString() }
            
            allGroups.forEach(group => {
              const currentVal = data[i][group]
              const nextVal = data[i + 1][group]
              // Linear interpolation
              interpolatedEntry[group] = currentVal + (nextVal - currentVal) * ratio
            })
            
            interpolatedData.push(interpolatedEntry)
          }
        }
      }
      
      // Add the last data point
      interpolatedData.push(data[data.length - 1])
      data = interpolatedData
    }
    
    return { data, groupToInstitution }
  }, [filteredItems, chartGroupBy, minDate, maxDate])

  // Get color based on institution
  const getInstitutionColor = (institution: string, allInstitutions: string[]) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
    const index = allInstitutions.indexOf(institution)
    return colors[index % colors.length]
  }

  const getGroupColor = (group: string, allGroups: string[]) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#a855f7', '#ec4899', '#f43f5e']
    const index = allGroups.indexOf(group)
    return colors[index % colors.length]
  }

  const toggleAccountType = (type: string) => {
    setSelectedAccountTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const toggleAccount = (name: string) => {
    setSelectedAccounts(prev =>
      prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]
    )
  }

  const clearFilters = () => {
    setSelectedAccountTypes([])
    setSelectedAccounts([])
  }

  const setCurrentMonth = () => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    setMinDate(firstDay.toISOString().split('T')[0])
    setMaxDate(lastDay.toISOString().split('T')[0])
    setDatePreset('current')
  }

  const setLastMonth = () => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0)
    setMinDate(firstDay.toISOString().split('T')[0])
    setMaxDate(lastDay.toISOString().split('T')[0])
    setDatePreset('last')
  }

  const setAllTime = () => {
    setMinDate('')
    setMaxDate('')
    setDatePreset('all')
  }

  const handleDateChange = (type: 'min' | 'max', value: string) => {
    if (type === 'min') {
      setMinDate(value)
    } else {
      setMaxDate(value)
    }
    setDatePreset('custom')
  }

  // Group accounts for display
  const groupedAccounts = useMemo(() => {
    if (groupBy === 'institution') {
      const grouped: { [key: string]: CurrentBalance[] } = {}
      filteredItems.forEach(item => {
        if (!grouped[item.institution_name]) {
          grouped[item.institution_name] = []
        }
        grouped[item.institution_name].push(item)
      })
      return Object.entries(grouped).map(([name, accounts]) => ({
        groupName: name,
        accounts
      }))
    } else {
      const grouped: { [key: string]: CurrentBalance[] } = {}
      filteredItems.forEach(item => {
        if (!grouped[item.account_type]) {
          grouped[item.account_type] = []
        }
        grouped[item.account_type].push(item)
      })
      return Object.entries(grouped).map(([name, accounts]) => ({
        groupName: name,
        accounts
      }))
    }
  }, [filteredItems, groupBy])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <p className="text-xl text-slate-400">Loading accounts...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Accounts</h1>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 sticky top-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Filters</h2>
                {(selectedAccountTypes.length > 0 || selectedAccounts.length > 0) && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Account Type Filter */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-3">Account Type</p>
                <div className="space-y-2">
                  {accountTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => toggleAccountType(type)}
                      className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors ${
                        selectedAccountTypes.includes(type)
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {formatAccountType(type)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Name Filter */}
              <div>
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-3">Accounts</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {accountNames.map(name => (
                    <button
                      key={name}
                      onClick={() => toggleAccount(name)}
                      className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors ${
                        selectedAccounts.includes(name)
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Summary Cards by Type */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {balanceByType.map(({ type, balance, showNA }) => (
                <div key={type} className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg border border-slate-600 p-6 hover:border-slate-500 transition-colors">
                  <p className="text-slate-400 text-sm font-medium mb-2">{formatAccountType(type)} Accounts</p>
                  <p className="text-3xl font-bold text-white">{showNA ? 'N/A' : formatCurrency(balance)}</p>
                </div>
              ))}
            </div>

            {/* Total Balance */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 mb-8 border border-blue-500">
              <p className="text-blue-100 text-sm font-medium mb-2">Total Balance</p>
              <p className="text-4xl font-bold text-white">{formatCurrency(totalBalance)}</p>
            </div>

            {/* Account Cards Grid */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Your Accounts</h2>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as 'institution' | 'account_type')}
                  className="bg-slate-700 text-white text-sm font-medium px-3 py-2 rounded border border-slate-600 hover:border-slate-500"
                >
                  <option value="institution">Group by Institution</option>
                  <option value="account_type">Group by Account Type</option>
                </select>
              </div>

              {groupedAccounts.map(({ groupName, accounts }) => (
                <div key={groupName} className="mb-8">
                  <h3 className="text-lg font-semibold text-slate-300 mb-4">{groupBy === 'account_type' ? formatAccountType(groupName) : groupName}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {accounts
                      .slice()
                      .sort((a, b) => (b.current_balance || 0) - (a.current_balance || 0))
                      .map((account, index) => (
                        <div key={index} className="bg-slate-800 rounded-lg border border-slate-700 p-6 hover:border-slate-500 transition-colors">
                          <div className="mb-4">
                            <p className="text-sm text-slate-400">{account.institution_name}</p>
                            <h3 className="text-lg font-semibold text-white">{account.display_name}</h3>
                          </div>

                          <div className="mb-4">
                            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Current Balance</p>
                            <p className="text-2xl font-bold text-white">
                              {formatCurrency(account.current_balance || 0)}
                            </p>
                          </div>

                          <div className="pt-4 border-t border-slate-700">
                            <p className="text-xs text-slate-500">
                              Last pulled: {new Date(account.last_pulled).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
              {filteredItems.length === 0 && (
                <p className="text-slate-400 text-center py-8">No accounts match your filters.</p>
              )}
            </div>

            {/* Debug Table */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">Debug: Filtered Items</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-300">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-4 py-2 text-left">Account ID</th>
                      <th className="px-4 py-2 text-left">Display Name</th>
                      <th className="px-4 py-2 text-left">Account Type</th>
                      <th className="px-4 py-2 text-left">Institution</th>
                      <th className="px-4 py-2 text-left">Current Balance</th>
                      <th className="px-4 py-2 text-left">Last Pulled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, idx) => (
                      <tr key={idx} className="border-t border-slate-700">
                        <td className="px-4 py-2">{item.account_id}</td>
                        <td className="px-4 py-2">{item.display_name}</td>
                        <td className="px-4 py-2">{item.account_type}</td>
                        <td className="px-4 py-2">{item.institution_name}</td>
                        <td className="px-4 py-2">{formatCurrency(item.current_balance || 0)}</td>
                        <td className="px-4 py-2">{new Date(item.last_pulled).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Balance Over Time</h2>
                <select
                  value={chartGroupBy}
                  onChange={(e) => setChartGroupBy(e.target.value as 'account' | 'institution')}
                  className="bg-slate-700 text-white text-sm font-medium px-3 py-2 rounded border border-slate-600 hover:border-slate-500"
                >
                  <option value="account">By Account</option>
                  <option value="institution">By Institution</option>
                </select>
              </div>
              
              {/* Date Filters */}
              <div className="flex gap-4 mb-6 justify-between items-end">
                <div className="flex gap-4">
                  <div className="flex flex-col">
                    <label className="text-sm text-slate-400 mb-2">Min Date</label>
                    <input
                      type="date"
                      value={minDate}
                      onChange={(e) => handleDateChange('min', e.target.value)}
                      className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 hover:border-slate-500"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm text-slate-400 mb-2">Max Date</label>
                    <input
                      type="date"
                      value={maxDate}
                      onChange={(e) => handleDateChange('max', e.target.value)}
                      className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 hover:border-slate-500"
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-slate-400 mb-2 opacity-0">Presets</label>
                  <div className="flex gap-2">
                    <button
                      onClick={setCurrentMonth}
                      className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                        datePreset === 'current'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      Current Month
                    </button>
                    <button
                      onClick={setLastMonth}
                      className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                        datePreset === 'last'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      Last Month
                    </button>
                    <button
                      onClick={setAllTime}
                      className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                        datePreset === 'all'
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      All Time
                    </button>
                    <button
                      className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                        datePreset === 'custom'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      Custom
                    </button>
                    <button
                      onClick={() => {
                        setMinDate('')
                        setMaxDate('')
                        setDatePreset('custom')
                      }}
                      className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded text-sm"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
              {chartData.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={600}>
                  <LineChart data={chartData.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis 
                      dataKey="timestamp" 
                      stroke="#94a3b8"
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#f1f5f9'
                      }}
                      formatter={(value) => formatCurrency(Number(value))}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Legend />
                    {Array.from(new Set(chartData.data.flatMap(d => Object.keys(d).filter(k => k !== 'timestamp')))).map((group) => {
                      let color: string
                      
                      if (chartGroupBy === 'account') {
                        // Each account gets its own color
                        const allGroups = Array.from(new Set(chartData.data.flatMap(d => Object.keys(d).filter(k => k !== 'timestamp'))))
                        color = getGroupColor(group, allGroups)
                      } else {
                        // By institution - use institution coloring
                        const institution = chartData.groupToInstitution.get(group) || ''
                        const allInstitutions = Array.from(new Set(Array.from(chartData.groupToInstitution.values())))
                        color = getInstitutionColor(institution, allInstitutions)
                      }
                      
                      return (
                        <Line
                          key={group}
                          type="monotone"
                          dataKey={group}
                          stroke={color}
                          dot={false}
                          strokeWidth={2}
                          isAnimationActive={false}
                        />
                      )
                    })}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-400 text-center py-8">No data to display. Try adjusting your filters.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}




