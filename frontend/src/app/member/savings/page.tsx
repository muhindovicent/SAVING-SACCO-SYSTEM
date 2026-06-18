'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getSession } from '@/services/auth'
import DB from '@/services/db'
import type { Member, SavingsAccount, SavingsTransaction } from '@/lib/types'

function getMemberId(): string | null {
  const session = getSession()
  if (!session) return null
  const members = DB.get<Member[]>('members') || []
  const member = members.find(m => m.userId === session.userId)
  return member ? member.id : null
}

function loadData() {
  const memberId = getMemberId()
  if (!memberId) return { account: null, transactions: [] }
  const accounts = DB.get<SavingsAccount[]>('savings') || []
  const myAccount = accounts.find(a => a.memberId === memberId) || null
  const txns = DB.get<SavingsTransaction[]>('transactions') || []
  const transactions = myAccount ? txns.filter(t => t.accountId === myAccount.id).slice(-20) : []
  return { account: myAccount, transactions }
}

export default function MemberSavings() {
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const setUser = useAuthStore(s => s.setUser)
  const [account, setAccount] = useState<SavingsAccount | null>(null)
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([])
  const [depositAmt, setDepositAmt] = useState(0)
  const [withdrawAmt, setWithdrawAmt] = useState(0)
  const [depositMsg, setDepositMsg] = useState('')
  const [withdrawMsg, setWithdrawMsg] = useState('')

  const refresh = () => {
    const data = loadData()
    setAccount(data.account)
    setTransactions(data.transactions)
  }

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'member') { router.push('/auth/login'); return }
    setUser(session)
    refresh()
  }, [])

  const handleDeposit = () => {
    if (!account || depositAmt <= 0) return
    const allTxns = DB.get<SavingsTransaction[]>('transactions') || []
    const allAccounts = DB.get<SavingsAccount[]>('savings') || []
    const txn: SavingsTransaction = {
      id: `txn-${Date.now()}`,
      accountId: account.id,
      memberId: account.memberId,
      type: 'deposit',
      amount: depositAmt,
      balanceBefore: account.balance,
      balanceAfter: account.balance + depositAmt,
      reference: `DEP-${Date.now().toString(36).toUpperCase()}`,
      description: 'Member deposit',
      createdAt: new Date().toISOString(),
    }
    const updatedAccounts = allAccounts.map(a => a.id === account.id ? { ...a, balance: a.balance + depositAmt } : a)
    DB.set('transactions', [...allTxns, txn])
    DB.set('savings', updatedAccounts)
    setDepositMsg(`Deposited UGX ${depositAmt.toLocaleString()} successfully`)
    setDepositAmt(0)
    refresh()
    setTimeout(() => setDepositMsg(''), 3000)
  }

  const handleWithdraw = () => {
    if (!account || withdrawAmt <= 0) return
    if (withdrawAmt > account.balance) { setWithdrawMsg('Insufficient balance'); return }
    const allTxns = DB.get<SavingsTransaction[]>('transactions') || []
    const allAccounts = DB.get<SavingsAccount[]>('savings') || []
    const txn: SavingsTransaction = {
      id: `txn-${Date.now()}`,
      accountId: account.id,
      memberId: account.memberId,
      type: 'withdrawal',
      amount: withdrawAmt,
      balanceBefore: account.balance,
      balanceAfter: account.balance - withdrawAmt,
      reference: `WTH-${Date.now().toString(36).toUpperCase()}`,
      description: 'Member withdrawal',
      createdAt: new Date().toISOString(),
    }
    const updatedAccounts = allAccounts.map(a => a.id === account.id ? { ...a, balance: a.balance - withdrawAmt } : a)
    DB.set('transactions', [...allTxns, txn])
    DB.set('savings', updatedAccounts)
    setWithdrawMsg(`Withdrew UGX ${withdrawAmt.toLocaleString()} successfully`)
    setWithdrawAmt(0)
    refresh()
    setTimeout(() => setWithdrawMsg(''), 3000)
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-xl font-bold text-[#E8F5E9]">My Savings</h1>

      {account ? (
        <div className="glass p-6 glow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Account No</p>
              <p className="text-[#B6E62E] font-bold text-lg">{account.accountNo}</p>
            </div>
            <div className="text-right">
              <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Balance</p>
              <p className="text-[#B6E62E] font-bold text-2xl">UGX {account.balance?.toLocaleString()}</p>
            </div>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${account.status === 'active' ? 'badge-green' : 'badge-yellow'}`}>{account.status}</span>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#1E2D12] rounded-lg p-4">
              <h3 className="text-sm font-medium text-[#B6E62E] mb-3">Deposit</h3>
              <div className="flex gap-2">
                <input type="number" value={depositAmt || ''} onChange={e => setDepositAmt(Number(e.target.value))} min={1} className="flex-1 bg-[#0A1404] border border-[#2A3D18] rounded-lg px-3 py-2 text-sm text-[#E8F5E9] focus:outline-none focus:border-[#B6E62E]" placeholder="Amount" />
                <button onClick={handleDeposit} disabled={depositAmt <= 0} className="px-4 py-2 bg-[#B6E62E] text-[#0A1404] rounded-lg text-sm font-medium hover:bg-[#9CCC2A] transition disabled:opacity-50">Deposit</button>
              </div>
              {depositMsg && <p className="text-xs text-[#B6E62E] mt-2">{depositMsg}</p>}
            </div>
            <div className="bg-[#1E2D12] rounded-lg p-4">
              <h3 className="text-sm font-medium text-[#F87171] mb-3">Withdraw</h3>
              <div className="flex gap-2">
                <input type="number" value={withdrawAmt || ''} onChange={e => setWithdrawAmt(Number(e.target.value))} min={1} className="flex-1 bg-[#0A1404] border border-[#2A3D18] rounded-lg px-3 py-2 text-sm text-[#E8F5E9] focus:outline-none focus:border-[#F87171]" placeholder="Amount" />
                <button onClick={handleWithdraw} disabled={withdrawAmt <= 0} className="px-4 py-2 bg-[#F87171] text-white rounded-lg text-sm font-medium hover:bg-[#EF4444] transition disabled:opacity-50">Withdraw</button>
              </div>
              {withdrawMsg && <p className={`text-xs mt-2 ${withdrawMsg.includes('Insufficient') ? 'text-[#F87171]' : 'text-[#B6E62E]'}`}>{withdrawMsg}</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass p-8 glow text-center">
          <p className="text-[#8DA88D]">You do not have a savings account yet. Contact the admin.</p>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="glass overflow-hidden glow">
          <div className="p-4 border-b border-[#2A3D18]">
            <h2 className="text-sm font-semibold text-[#E8F5E9]">Recent Transactions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2A3D18]">
                  <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Type</th>
                  <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Amount</th>
                  <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Balance</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id} className="border-b border-[#2A3D18]/50 hover:bg-[#1E2D12] transition">
                    <td className="px-4 py-3 text-sm text-[#8DA88D]">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm"><span className={`text-xs px-2 py-1 rounded-full ${t.type === 'deposit' ? 'badge-green' : t.type === 'withdrawal' ? 'badge-red' : 'badge-blue'}`}>{t.type}</span></td>
                    <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right font-mono">{t.amount?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right font-mono">{t.balanceAfter?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
