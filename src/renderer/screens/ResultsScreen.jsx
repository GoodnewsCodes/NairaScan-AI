import React, { useState, useMemo } from 'react';
import {
  ArrowDownCircle, ArrowUpCircle, Activity, CreditCard,
  Download, Search, CheckCircle, AlertTriangle,
  TrendingDown, TrendingUp, ChevronLeft, ChevronRight as ChevronRightIcon,
  FileJson, Landmark,
} from 'lucide-react';
import { cn } from '../utils';

// ─── Mock fallback (used when no backend result is present) ──────────────────
const MOCK_RESULT = {
  bank: 'GTBank',
  account_number: '4022',
  statement_period: { from: '2025-10-01', to: '2025-10-31' },
  opening_balance: 1250400,
  closing_balance: 985200.5,
  transactions: [
    { date: '2025-10-28', description: 'UBER NG TRIP',        debit: 4500,       credit: 0,          balance: 985200.50, category: 'Transport'    },
    { date: '2025-10-27', description: 'SALARY TECHCORP',     debit: 0,          credit: 1200000,    balance: 989700.50, category: 'Income'       },
    { date: '2025-10-26', description: 'EKO ELECTRICITY',     debit: 20000,      credit: 0,          balance: 210300.50, category: 'Utilities'    },
    { date: '2025-10-25', description: 'NETFLIX CH',          debit: 4800,       credit: 0,          balance: 190300.50, category: 'Entertainment'},
    { date: '2025-10-22', description: 'GTB TRANSFER TO OLU', debit: 50000,      credit: 0,          balance: 185500.50, category: 'Transfer'     },
    { date: '2025-10-21', description: 'AIRTIME PURCHASE MTN',debit: 2000,       credit: 0,          balance: 183500.50, category: 'Utilities'    },
    { date: '2025-10-20', description: 'CHICKEN REPUBLIC',    debit: 8500,       credit: 0,          balance: 181500.50, category: 'Food'         },
    { date: '2025-10-18', description: 'BOLT RIDE',           debit: 3200,       credit: 0,          balance: 173000.50, category: 'Transport'    },
    { date: '2025-10-15', description: 'POS PURCHASE SHOPRITE',debit: 45000,     credit: 0,          balance: 169800.50, category: 'Shopping'     },
    { date: '2025-10-10', description: 'BANK MAINTENANCE FEE', debit: 525,       credit: 0,          balance: 124800.50, category: 'Bank Charges' },
  ],
  summary: {
    transaction_count: 142,
    total_credits:  2450000,
    total_debits:   2715199.5,
    net_flow:       -265199.5,
    opening_balance: 1250400,
    closing_balance:  985200.5,
    category_totals: {
      Transfer: 850000, Shopping: 420000, Food: 180000,
      Utilities: 95000, Transport: 62000, Entertainment: 28000,
      'Bank Charges': 8000,
    },
    anomalies: [
      { type: 'large_debit',            severity: 'high',   date: '2025-10-15', description: 'LARGE POS AT MIDNIGHT',   amount: 145000, note: 'Unusually large debit (>120,000)' },
      { type: 'duplicate_transaction',  severity: 'medium', date: '2025-10-09', description: 'GTB TRANSFER TO JOHN',    amount: 25000,  note: 'Possible duplicate — identical consecutive debit' },
    ],
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) =>
  n == null
    ? '—'
    : '₦' + Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 });

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt) ? d : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const PAGE_SIZE = 10;

const CATEGORY_COLORS = {
  Income: 'bg-green-500', Transfer: 'bg-blue-500', Shopping: 'bg-purple-500',
  Food: 'bg-orange-500', Transport: 'bg-cyan-500', Utilities: 'bg-yellow-500',
  Entertainment: 'bg-pink-500', 'Bank Charges': 'bg-gray-400', ATM: 'bg-red-400', Other: 'bg-gray-300',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value, colorClass, bgClass, iconBg }) {
  return (
    <div className={cn('relative overflow-hidden bg-white p-5 rounded-2xl border border-gray-100 shadow-sm', bgClass)}>
      <div className={cn('flex items-center gap-2 mb-2', colorClass)}>
        <Icon size={18} />
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className={cn('text-xl font-extrabold tabular-nums', colorClass)}>{value}</div>
      <div className={cn('absolute -bottom-5 -right-5 opacity-[0.07]', colorClass)}>
        <Icon size={88} />
      </div>
    </div>
  );
}

function CategoryBar({ name, amount, max }) {
  const pct = max > 0 ? Math.round((amount / max) * 100) : 0;
  const color = CATEGORY_COLORS[name] || 'bg-gray-400';
  return (
    <div className="flex items-center gap-3 group">
      <div className="w-28 text-xs font-medium text-gray-600 truncate shrink-0">{name}</div>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-28 text-xs font-semibold text-gray-700 text-right tabular-nums">{fmt(amount)}</div>
    </div>
  );
}

function AnomalyCard({ anomaly }) {
  const typeLabel = {
    large_debit: 'Unusual Large Debit',
    duplicate_transaction: 'Duplicate Transaction',
  }[anomaly.type] || anomaly.type;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm relative overflow-hidden">
      <div className={cn(
        'absolute top-0 left-0 w-1 h-full',
        anomaly.severity === 'high' ? 'bg-red-500' : 'bg-orange-400'
      )} />
      <div className="flex justify-between items-start mb-1 gap-2">
        <h4 className="font-bold text-gray-900 text-sm leading-tight">{typeLabel}</h4>
        <span className="font-bold text-red-600 text-sm shrink-0">{fmt(anomaly.amount)}</span>
      </div>
      <p className="text-xs text-gray-500 mb-1 font-medium truncate">{anomaly.description}</p>
      <p className="text-xs text-gray-400 leading-relaxed">{anomaly.note}</p>
      <div className="mt-2 text-xs text-gray-400">{fmtDate(anomaly.date)}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ResultsScreen({ result, onReset }) {
  const data = result || MOCK_RESULT;
  const isMock = !result;

  const { bank, account_number, statement_period, transactions = [], summary = {} } = data;
  const { total_credits, total_debits, net_flow, category_totals = {}, anomalies = [], transaction_count } = summary;

  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState('all'); // all | credit | debit

  // ── Filtered + paginated transactions ──
  const filtered = useMemo(() => {
    let txns = [...transactions];
    if (filterType === 'credit') txns = txns.filter((t) => t.credit > 0);
    if (filterType === 'debit')  txns = txns.filter((t) => t.debit  > 0);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      txns = txns.filter((t) =>
        t.description?.toLowerCase().includes(q) ||
        t.date?.includes(q) ||
        t.category?.toLowerCase().includes(q)
      );
    }
    return txns;
  }, [transactions, searchQuery, filterType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageTxns   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (e) => { setSearchQuery(e.target.value); setPage(1); };
  const handleFilter = (f)  => { setFilterType(f); setPage(1); };

  // ── Category bar chart data ──
  const maxCategoryAmount = Math.max(...Object.values(category_totals), 1);
  const categoryEntries = Object.entries(category_totals).sort(([, a], [, b]) => b - a);

  // ── JSON Export ──
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `nairascan-${bank || 'statement'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Period label ──
  const periodLabel = statement_period
    ? `${fmtDate(statement_period.from)} → ${fmtDate(statement_period.to)}`
    : 'Statement Period Unknown';

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50/50 animate-in fade-in duration-500 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8">

        {/* Mock data notice */}
        {isMock && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm font-medium">
            <AlertTriangle size={16} className="shrink-0 text-amber-500" />
            Showing demo data — connect the Python backend and analyze a real statement to see live results.
          </div>
        )}

        {/* Page header */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                <Landmark size={18} />
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Statement Analysis</h2>
            </div>
            <p className="text-gray-500 text-sm ml-11">
              {bank || 'Unknown Bank'}
              {account_number && ` · ···${account_number}`}
              {' · '}
              {periodLabel}
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={onReset}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors shadow-sm text-sm"
            >
              ← Scan Another
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors shadow-sm shadow-primary-500/20 flex items-center gap-2 text-sm"
            >
              <FileJson size={16} />
              Export JSON
            </button>
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard icon={CreditCard}     label="Opening Balance" value={fmt(data.opening_balance)} colorClass="text-gray-700" />
          <SummaryCard icon={ArrowDownCircle} label="Total Inflow"    value={fmt(total_credits)}        colorClass="text-green-700" bgClass="bg-green-50/30" />
          <SummaryCard icon={ArrowUpCircle}  label="Total Outflow"   value={fmt(total_debits)}          colorClass="text-red-600"   bgClass="bg-red-50/30"   />
          <SummaryCard
            icon={net_flow >= 0 ? TrendingUp : TrendingDown}
            label="Net Flow"
            value={fmt(net_flow)}
            colorClass={net_flow >= 0 ? 'text-green-700' : 'text-red-600'}
            bgClass={net_flow >= 0 ? 'bg-green-50/30' : 'bg-red-50/30'}
          />
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Transactions Table ── */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">

            {/* Table Header */}
            <div className="p-5 border-b border-gray-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-bold text-gray-900">
                Transactions
                <span className="ml-2 text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {filtered.length} shown
                </span>
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Filter pills */}
                {['all', 'credit', 'debit'].map((f) => (
                  <button
                    key={f}
                    onClick={() => handleFilter(f)}
                    className={cn(
                      'px-3 py-1 text-xs font-semibold rounded-full border capitalize transition-all',
                      filterType === f
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-primary-300 hover:text-primary-600'
                    )}
                  >
                    {f === 'all' ? 'All' : f === 'credit' ? '↓ Credits' : '↑ Debits'}
                  </button>
                ))}
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearch}
                    placeholder="Search..."
                    className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white transition-all w-44"
                  />
                </div>
              </div>
            </div>

            {/* Table body */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 text-gray-400 text-xs uppercase tracking-wider border-b border-gray-100">
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Description</th>
                    <th className="px-5 py-3 font-semibold">Category</th>
                    <th className="px-5 py-3 font-semibold text-right">Debit</th>
                    <th className="px-5 py-3 font-semibold text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pageTxns.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-gray-400 text-sm">
                        No transactions match your search.
                      </td>
                    </tr>
                  ) : pageTxns.map((tx, idx) => {
                    const isCredit = tx.credit > 0 && tx.debit === 0;
                    const catColor = CATEGORY_COLORS[tx.category] || 'bg-gray-200';
                    return (
                      <tr
                        key={idx}
                        className={cn(
                          'hover:bg-gray-50/70 transition-colors',
                          isCredit && 'bg-green-50/20'
                        )}
                      >
                        <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap font-mono">
                          {fmtDate(tx.date)}
                        </td>
                        <td className="px-5 py-3.5 max-w-[200px]">
                          <div className="text-sm font-medium text-gray-900 truncate">{tx.description}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          {tx.category && (
                            <span className={cn(
                              'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold text-white',
                              catColor
                            )}>
                              {tx.category}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-sm font-bold text-right text-red-600 whitespace-nowrap tabular-nums">
                          {tx.debit > 0 ? fmt(tx.debit) : ''}
                        </td>
                        <td className="px-5 py-3.5 text-sm font-bold text-right text-green-600 whitespace-nowrap tabular-nums">
                          {tx.credit > 0 ? fmt(tx.credit) : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/40 flex items-center justify-between text-sm text-gray-500">
              <span className="text-xs">
                Page {page} of {totalPages} · {transaction_count || filtered.length} total
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 border border-gray-200 bg-white rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pg = i + 1;
                  return (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      className={cn(
                        'w-7 h-7 text-xs font-semibold rounded border',
                        page === pg
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      {pg}
                    </button>
                  );
                })}
                {totalPages > 5 && <span className="px-1 text-gray-400">...</span>}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 border border-gray-200 bg-white rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRightIcon size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* ── Right Sidebar ── */}
          <div className="space-y-6">

            {/* Spending by Category */}
            {categoryEntries.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900 text-sm">Spending by Category</h3>
                </div>
                <div className="p-4 space-y-3">
                  {categoryEntries.map(([cat, amt]) => (
                    <CategoryBar key={cat} name={cat} amount={amt} max={maxCategoryAmount} />
                  ))}
                </div>
              </div>
            )}

            {/* Anomalies */}
            <div className="bg-white rounded-2xl border border-orange-100 overflow-hidden shadow-sm">
              <div className="bg-orange-50/50 p-4 border-b border-orange-100 flex items-center gap-2">
                <AlertTriangle size={16} className="text-orange-500" />
                <h3 className="font-bold text-orange-900 text-sm">
                  AI Anomalies
                  <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
                    {anomalies.length}
                  </span>
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {anomalies.length === 0 ? (
                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium py-2">
                    <CheckCircle size={16} />
                    No anomalies detected
                  </div>
                ) : anomalies.map((a, i) => <AnomalyCard key={i} anomaly={a} />)}
              </div>
            </div>

            {/* Scan Stats Card */}
            <div className="bg-gradient-to-br from-primary-900 to-indigo-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white opacity-[0.04] rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={18} className="text-primary-300" />
                <h3 className="font-bold text-sm">Scan Complete</h3>
              </div>
              <p className="text-xs text-primary-100/70 mb-5 leading-relaxed">
                DeepSeek-VL2 extracted{' '}
                <strong className="text-white">{transaction_count ?? transactions.length}</strong> transactions
                {anomalies.length > 0 && (
                  <> and flagged <strong className="text-orange-300">{anomalies.length} anomal{anomalies.length === 1 ? 'y' : 'ies'}</strong></>
                )}.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-primary-200">
                <div className="bg-primary-800/40 px-3 py-2 rounded-lg">
                  <div className="text-primary-400 text-[10px] uppercase mb-1">Model</div>
                  <div>VL2-Small Q4</div>
                </div>
                <div className="bg-primary-800/40 px-3 py-2 rounded-lg">
                  <div className="text-primary-400 text-[10px] uppercase mb-1">Mode</div>
                  <div>100% Local</div>
                </div>
                <div className="bg-primary-800/40 px-3 py-2 rounded-lg">
                  <div className="text-primary-400 text-[10px] uppercase mb-1">Closing Bal</div>
                  <div className="truncate">{fmt(data.closing_balance)}</div>
                </div>
                <div className="bg-primary-800/40 px-3 py-2 rounded-lg">
                  <div className="text-primary-400 text-[10px] uppercase mb-1">Net Flow</div>
                  <div className={net_flow >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {net_flow >= 0 ? '+' : ''}{fmt(net_flow)}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
