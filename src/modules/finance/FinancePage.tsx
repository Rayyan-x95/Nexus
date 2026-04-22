import { useMemo, useState, useEffect } from 'react';
import {
  Plus, Target, PieChart, Calendar as CalendarIcon,
  TrendingUp, CreditCard, Wallet, Landmark,
  ArrowUpRight, ArrowDownRight, Search, Filter, Upload
} from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { Button } from '@/components/ui/Button';
import { useStore } from '@/core/store';
import { useSettings, formatMoney } from '@/core/settings';
import type { Expense, Budget, BudgetInput, Account, Task, Note } from '@/core/store/types';
import { useSeo } from '@/seo';
import { ExpenseForm, type ExpenseFormValues } from './ExpenseForm';
import { ExpenseItem } from './ExpenseItem';
import { cn } from '@/utils/cn';
import { parseQuickFinance } from '@/utils/financeParser';
import { SmartInput } from '@/components/ParseConfirmation';

type FinanceTab = 'today' | 'week' | 'month';

export function FinancePage() {
  useSeo({
    title: 'Finance',
    description: 'Monitor spending and financial activity with Titan finance tracking.',
    path: '/finance',
  });

  const { 
    expenses, budgets, accounts, tasks, notes, hydrated,
    addExpense, updateExpense, deleteExpense, 
    addBudget, deleteBudget, processRecurringTransactions 
  } = useStore();
  
  const { currency } = useSettings();

  const [activeTab, setActiveTab] = useState<FinanceTab>('month');
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [quickInput, setQuickInput] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (hydrated) {
      processRecurringTransactions();
    }
  }, [hydrated, processRecurringTransactions]);

  const totalBalance = useMemo(() => 
    accounts.reduce((sum, acc) => sum + acc.balance, 0),
  [accounts]);

  const monthlySpend = useMemo(() => {
    const now = new Date();
    return expenses
      .filter(e => {
        const d = new Date(e.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && e.type === 'expense';
      })
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    return expenses.filter(e => {
      const date = new Date(e.createdAt);
      
      // Time Filter
      if (activeTab === 'today') {
        if (date.toDateString() !== now.toDateString()) return false;
      } else if (activeTab === 'week') {
        if (date < startOfWeek) return false;
      }
      
      // Type Filter
      if (filterType !== 'all' && e.type !== filterType) return false;
      
      // Search Filter
      if (searchQuery && !e.category.toLowerCase().includes(searchQuery.toLowerCase()) && !e.note?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      return true;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [expenses, activeTab, filterType, searchQuery]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    filteredExpenses.filter(e => e.type === 'expense').forEach(e => {
      map.set(e.category, (map.get(e.category) || 0) + e.amount);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  const groupedExpenses = useMemo(() => {
    const groups: Record<string, Expense[]> = {};
    filteredExpenses.forEach(e => {
      const date = new Date(e.createdAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      if (!groups[date]) groups[date] = [];
      groups[date].push(e);
    });
    return Object.entries(groups);
  }, [filteredExpenses]);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    
    const parsed = parseQuickFinance(quickInput);
    await addExpense({
      ...parsed,
      accountId: accounts[0]?.id || 'cash',
    });
    setQuickInput('');
  };

  const handleSaveExpense = async (values: ExpenseFormValues) => {
    if (editingExpense) {
      await updateExpense(editingExpense.id, {
        ...values,
        amount: Math.round(values.amountDollars * 100),
      });
    } else {
      await addExpense(values);
    }
  };

  return (
    <PageShell
      title="Finance"
      description="Track every coin, set boundaries, and understand your financial flow."
    >
      {/* ── Balance Overview ────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <article className="lg:col-span-2 relative overflow-hidden rounded-[2.5rem] border border-primary/20 bg-card/40 p-8 shadow-glass backdrop-blur-xl">
          <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-primary/10 blur-[80px]" />
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Combined Balance</p>
            <h2 className="mt-2 text-6xl font-black tracking-tighter text-foreground">
              {formatMoney(totalBalance, currency)}
            </h2>
            <div className="mt-8 flex flex-wrap gap-4">
              <div className="rounded-2xl bg-emerald-500/10 px-4 py-2 border border-emerald-500/20">
                <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-500">Monthly Spend</p>
                <p className="text-lg font-bold text-emerald-400">{formatMoney(monthlySpend, currency)}</p>
              </div>
              <div className="flex items-center gap-1.5 px-4 py-2">
                 <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                 <span className="text-xs font-bold text-emerald-500">+12.5%</span>
                 <span className="text-[10px] text-muted-foreground font-medium">vs last month</span>
              </div>
            </div>
          </div>
        </article>

        <article className="space-y-4">
           <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-2">Accounts</p>
           <div className="grid grid-cols-1 gap-3">
             {accounts.map(acc => (
               <div key={acc.id} className="flex items-center justify-between rounded-2xl border border-border/50 bg-card/30 p-4 hover:border-primary/30 transition-colors">
                 <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                      {acc.id === 'cash' ? <Wallet className="h-4 w-4" /> : acc.id === 'bank' ? <Landmark className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold">{acc.name}</p>
                      <p className="text-[10px] text-muted-foreground">Default</p>
                    </div>
                 </div>
                 <p className="text-sm font-bold">{formatMoney(acc.balance, currency)}</p>
               </div>
             ))}
           </div>
        </article>
      </section>

      {/* ── Budget & Insights ───────────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
             <div className="flex items-center gap-2">
               <Target className="h-5 w-5 text-amber-500" />
               <h3 className="font-bold tracking-tight">Active Budgets</h3>
             </div>
             <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold">Manage</Button>
          </div>
          <div className="grid grid-cols-1 gap-3">
             {budgets.slice(0, 3).map(b => {
               const spent = expenses
                 .filter(e => e.category === b.category && e.type === 'expense')
                 .reduce((sum, e) => sum + e.amount, 0);
               const percent = Math.min((spent / b.limit) * 100, 100);
               return (
                 <div key={b.id} className="rounded-2xl border border-border/50 bg-card/30 p-4">
                    <div className="flex justify-between items-baseline mb-2">
                       <span className="text-xs font-bold uppercase tracking-wider">{b.category}</span>
                       <span className="text-[10px] font-medium text-muted-foreground">{formatMoney(spent, currency)} / {formatMoney(b.limit, currency)}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                       <div 
                        className={cn("h-full transition-all duration-700", percent > 90 ? "bg-rose-500 shadow-glow-sm" : "bg-primary")}
                        style={{ width: `${percent}%` }}
                       />
                    </div>
                 </div>
               );
             })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
             <PieChart className="h-5 w-5 text-accent" />
             <h3 className="font-bold tracking-tight">Category Breakdown</h3>
          </div>
          <div className="rounded-[2rem] border border-border/50 bg-card/20 p-6 space-y-4">
             {categoryBreakdown.slice(0, 4).map(([cat, amt]) => {
               const percent = monthlySpend > 0 ? (amt / monthlySpend) * 100 : 0;

               return (
                 <div key={cat} className="space-y-1.5">
                   <div className="flex justify-between text-[11px] font-bold uppercase tracking-wide">
                     <span>{cat}</span>
                     <span className="text-muted-foreground">{percent.toFixed(0)}%</span>
                   </div>
                   <div className="h-1 w-full rounded-full bg-secondary">
                     <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
                   </div>
                 </div>
               );
             })}
             {categoryBreakdown.length === 0 && <p className="text-center py-4 text-xs text-muted-foreground">No data yet.</p>}
          </div>
        </div>
      </section>

      {/* ── Transaction List ────────────────────────────────────────────── */}
      <div className="space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="flex rounded-xl bg-secondary/50 p-1">
                 {(['today', 'week', 'month'] as const).map(tab => (
                   <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                      activeTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                   >
                     {tab}
                   </button>
                 ))}
              </div>
              <div className="h-8 w-px bg-border/50 hidden sm:block" />
              <div className="flex gap-1">
                 <Button 
                  variant={filterType === 'expense' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setFilterType(t => t === 'expense' ? 'all' : 'expense')}
                  className="h-8 px-3 text-[10px] font-bold uppercase"
                 >
                   Expenses
                 </Button>
                 <Button 
                  variant={filterType === 'income' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setFilterType(t => t === 'income' ? 'all' : 'income')}
                  className="h-8 px-3 text-[10px] font-bold uppercase"
                 >
                   Income
                 </Button>
              </div>
           </div>
           <Button onClick={() => setIsExpenseFormOpen(true)} className="w-full sm:w-auto shadow-glow">
              <Plus className="h-4 w-4" />
              New Entry
           </Button>
        </div>

        {/* Quick Add Bar */}
        <form onSubmit={handleQuickAdd} className="relative group">
           <div className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
             <Search className="h-5 w-5" />
           </div>
           <input 
            type="text"
            placeholder="Quick add: 'Swiggy $250' or 'Salary $5000'..."
            className="h-14 w-full rounded-2xl border border-border/50 bg-card/30 pl-14 pr-24 text-sm font-medium outline-none focus:border-primary/50 focus:bg-card/50 transition-all placeholder:text-muted-foreground/50 shadow-inner"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
           />
           <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hidden md:block">Press Enter</span>
              <Button type="submit" size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg">
                <ArrowDownRight className="h-4 w-4" />
              </Button>
           </div>
        </form>

        {/* Main List */}
        {groupedExpenses.length === 0 ? (
          <article className="rounded-[2.5rem] border border-dashed border-border bg-card/20 p-16 text-center shadow-inner">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary/50 text-muted-foreground">
              <CalendarIcon className="h-8 w-8" />
            </div>
            <p className="mt-4 text-sm font-bold text-foreground">No transactions found</p>
            <p className="mt-1 text-xs text-muted-foreground">Adjust filters or add a new transaction above.</p>
          </article>
        ) : (
          <div className="space-y-12">
            {groupedExpenses.map(([date, items]) => (
              <div key={date} className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/70 ml-2">
                  {date}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map(expense => (
                    <ExpenseItem
                      key={expense.id}
                      expense={expense}
                      account={accounts.find(a => a.id === expense.accountId)}
                      linkedTask={tasks.find(t => t.id === expense.linkedTaskId)}
                      linkedNote={notes.find(n => n.id === expense.linkedNoteId)}
                      onEdit={() => {
                        setEditingExpense(expense);
                        setIsExpenseFormOpen(true);
                      }}
                      onDelete={async () => {
                        await deleteExpense(expense.id);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ExpenseForm
        open={isExpenseFormOpen}
        title={editingExpense ? 'Edit Transaction' : 'New Transaction'}
        submitLabel={editingExpense ? 'Save Changes' : 'Record Entry'}
        categories={['Food', 'Travel', 'Study', 'Personal', 'Rent', 'Utilities', 'Entertainment', 'Salary', 'Investment']}
        accounts={accounts}
        tasks={tasks}
        notes={notes}
        initialValues={editingExpense ?? undefined}
        onOpenChange={(nextOpen) => {
          setIsExpenseFormOpen(nextOpen);
          if (!nextOpen) setEditingExpense(null);
        }}
        onSubmit={handleSaveExpense}
      />
    </PageShell>
  );
}
