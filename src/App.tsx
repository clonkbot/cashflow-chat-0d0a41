import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  description: string
  date: Date
}

interface Message {
  id: string
  type: 'user' | 'system'
  content: string
  timestamp: Date
}

const CATEGORIES = {
  income: ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'],
  expense: ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other']
}

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: '1', type: 'income', amount: 4500, category: 'Salary', description: 'Monthly salary', date: new Date(2024, 0, 1) },
  { id: '2', type: 'expense', amount: 120, category: 'Food', description: 'Grocery shopping', date: new Date(2024, 0, 3) },
  { id: '3', type: 'expense', amount: 45, category: 'Transport', description: 'Uber rides', date: new Date(2024, 0, 5) },
  { id: '4', type: 'income', amount: 800, category: 'Freelance', description: 'Design project', date: new Date(2024, 0, 7) },
  { id: '5', type: 'expense', amount: 200, category: 'Bills', description: 'Electricity bill', date: new Date(2024, 0, 10) },
]

function parseUserInput(input: string): { type: 'income' | 'expense' | 'query' | 'unknown', amount?: number, category?: string, description?: string } {
  const lowerInput = input.toLowerCase()

  // Check for balance/summary queries
  if (lowerInput.includes('balance') || lowerInput.includes('summary') || lowerInput.includes('total') || lowerInput.includes('how much')) {
    return { type: 'query' }
  }

  // Check for expense patterns
  const expensePatterns = [/spent/i, /paid/i, /bought/i, /expense/i, /cost/i, /-\s*\$?\d/]
  const incomePatterns = [/earned/i, /received/i, /got paid/i, /income/i, /salary/i, /\+\s*\$?\d/]

  let isExpense = expensePatterns.some(p => p.test(input))
  let isIncome = incomePatterns.some(p => p.test(input))

  // Extract amount
  const amountMatch = input.match(/\$?\s*(\d+(?:\.\d{2})?)/i)
  const amount = amountMatch ? parseFloat(amountMatch[1]) : undefined

  if (!amount) return { type: 'unknown' }

  // Try to categorize
  let category = 'Other'
  const allCategories = [...CATEGORIES.income, ...CATEGORIES.expense]
  for (const cat of allCategories) {
    if (lowerInput.includes(cat.toLowerCase())) {
      category = cat
      break
    }
  }

  // Food-related keywords
  if (/food|lunch|dinner|breakfast|coffee|restaurant|grocery|eat/i.test(lowerInput)) category = 'Food'
  if (/uber|lyft|taxi|gas|fuel|train|bus|transport/i.test(lowerInput)) category = 'Transport'
  if (/netflix|spotify|movie|game|entertainment/i.test(lowerInput)) category = 'Entertainment'
  if (/electric|water|internet|rent|bill/i.test(lowerInput)) category = 'Bills'
  if (/salary|paycheck/i.test(lowerInput)) { category = 'Salary'; isIncome = true }
  if (/freelance|client|project/i.test(lowerInput)) { category = 'Freelance'; isIncome = true }

  const type = isIncome ? 'income' : (isExpense || !isIncome) ? 'expense' : 'expense'

  return { type, amount, category, description: input }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      type: 'system',
      content: 'Hey! I\'m your finance assistant. Tell me about your expenses or income naturally. Try: "Spent $50 on groceries" or "Got paid $3000 salary"',
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
  const balance = totalIncome - totalExpenses

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    setTimeout(() => {
      const parsed = parseUserInput(inputValue)
      let systemResponse: string

      if (parsed.type === 'query') {
        systemResponse = `Your current balance is ${formatCurrency(balance)}. Total income: ${formatCurrency(totalIncome)}, Total expenses: ${formatCurrency(totalExpenses)}.`
      } else if (parsed.type === 'unknown' || !parsed.amount) {
        systemResponse = 'I couldn\'t understand that. Try something like "Spent $30 on lunch" or "Received $500 freelance payment"'
      } else {
        const newTransaction: Transaction = {
          id: Date.now().toString(),
          type: parsed.type,
          amount: parsed.amount,
          category: parsed.category || 'Other',
          description: parsed.description || '',
          date: new Date()
        }
        setTransactions(prev => [newTransaction, ...prev])

        if (parsed.type === 'income') {
          systemResponse = `Added ${formatCurrency(parsed.amount)} income under ${parsed.category}. Your new balance is ${formatCurrency(balance + parsed.amount)}.`
        } else {
          systemResponse = `Logged ${formatCurrency(parsed.amount)} expense for ${parsed.category}. Your new balance is ${formatCurrency(balance - parsed.amount)}.`
        }
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: systemResponse,
        timestamp: new Date()
      }])
      setIsTyping(false)
    }, 800)
  }

  return (
    <div className="min-h-screen bg-[#0D0F11] text-[#E8E8E8] flex flex-col">
      {/* Subtle grid background */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#00D897 1px, transparent 1px), linear-gradient(90deg, #00D897 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-[#1E2328] px-4 md:px-8 py-4 md:py-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-[#00D897] to-[#00A876] flex items-center justify-center">
              <span className="font-mono text-[#0D0F11] font-bold text-lg md:text-xl">$</span>
            </div>
            <div>
              <h1 className="font-serif text-xl md:text-2xl font-bold tracking-tight">CashFlow</h1>
              <p className="text-xs text-[#6B7280] font-mono">chat-first finance</p>
            </div>
          </div>

          {/* Balance Card */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#161A1E] rounded-xl px-4 md:px-6 py-3 md:py-4 border border-[#1E2328] min-w-[200px]"
          >
            <p className="text-[10px] md:text-xs text-[#6B7280] uppercase tracking-widest font-mono mb-1">Current Balance</p>
            <p className={`font-mono text-2xl md:text-3xl font-bold ${balance >= 0 ? 'text-[#00D897]' : 'text-[#FF6B6B]'}`}>
              {formatCurrency(balance)}
            </p>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 p-4 md:p-8 overflow-hidden">

        {/* Chat Section */}
        <div className="lg:col-span-2 flex flex-col bg-[#161A1E] rounded-2xl border border-[#1E2328] overflow-hidden min-h-[400px] md:min-h-0">
          {/* Chat Header */}
          <div className="px-4 md:px-6 py-3 md:py-4 border-b border-[#1E2328] flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#00D897] animate-pulse" />
            <span className="font-mono text-xs md:text-sm text-[#6B7280]">Terminal Active</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] md:max-w-[80%] ${
                    msg.type === 'user'
                      ? 'bg-[#00D897]/10 border border-[#00D897]/30 text-[#00D897]'
                      : 'bg-[#1E2328] border border-[#2A2F35]'
                  } rounded-2xl px-4 md:px-5 py-3 md:py-4`}>
                    {msg.type === 'system' && (
                      <p className="text-[10px] text-[#FFB547] font-mono mb-2 uppercase tracking-wider">System</p>
                    )}
                    <p className="font-mono text-xs md:text-sm leading-relaxed">{msg.content}</p>
                    <p className="text-[10px] text-[#6B7280] mt-2 font-mono">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-2 px-5 py-4"
              >
                <span className="w-2 h-2 rounded-full bg-[#00D897] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#00D897] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#00D897] animate-bounce" style={{ animationDelay: '300ms' }} />
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 md:p-4 border-t border-[#1E2328]">
            <div className="flex gap-2 md:gap-3">
              <div className="flex-1 relative">
                <span className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-[#00D897] font-mono text-sm md:text-base">{'>'}</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type a transaction..."
                  className="w-full bg-[#0D0F11] border border-[#2A2F35] rounded-xl pl-7 md:pl-10 pr-4 py-3 md:py-4 font-mono text-sm focus:outline-none focus:border-[#00D897] focus:ring-1 focus:ring-[#00D897]/50 transition-all placeholder:text-[#3A3F45]"
                />
              </div>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gradient-to-r from-[#00D897] to-[#00A876] text-[#0D0F11] font-mono font-bold px-4 md:px-8 rounded-xl hover:shadow-lg hover:shadow-[#00D897]/20 transition-shadow text-sm md:text-base min-h-[48px]"
              >
                Send
              </motion.button>
            </div>
          </form>
        </div>

        {/* Transactions Sidebar */}
        <div className="flex flex-col bg-[#161A1E] rounded-2xl border border-[#1E2328] overflow-hidden">
          {/* Stats */}
          <div className="p-4 md:p-6 border-b border-[#1E2328] grid grid-cols-2 gap-3 md:gap-4">
            <div>
              <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-mono mb-1">Income</p>
              <p className="font-mono text-base md:text-lg font-bold text-[#00D897]">{formatCurrency(totalIncome)}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-mono mb-1">Expenses</p>
              <p className="font-mono text-base md:text-lg font-bold text-[#FF6B6B]">{formatCurrency(totalExpenses)}</p>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 md:px-6 py-3 sticky top-0 bg-[#161A1E] border-b border-[#1E2328]">
              <p className="text-[10px] text-[#6B7280] uppercase tracking-widest font-mono">Recent Activity</p>
            </div>
            <div className="divide-y divide-[#1E2328]">
              <AnimatePresence>
                {transactions.slice(0, 10).map((t, i) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="px-4 md:px-6 py-3 md:py-4 hover:bg-[#1E2328]/50 transition-colors cursor-default"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs md:text-sm font-medium truncate">{t.category}</span>
                      <span className={`font-mono text-xs md:text-sm font-bold ${t.type === 'income' ? 'text-[#00D897]' : 'text-[#FF6B6B]'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                    </div>
                    <p className="text-[10px] md:text-xs text-[#6B7280] font-mono truncate">{t.description}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 md:py-6 text-center border-t border-[#1E2328]">
        <p className="text-[10px] md:text-xs text-[#4A4F55] font-mono">
          Requested by <span className="text-[#6B7280]">@speedrun26mil</span> · Built by <span className="text-[#6B7280]">@clonkbot</span>
        </p>
      </footer>
    </div>
  )
}

export default App
