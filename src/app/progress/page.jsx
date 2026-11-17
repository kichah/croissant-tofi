'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import {
  getEntriesByStore,
  saveDailyEntry,
  deleteDailyEntry,
} from '@/lib/storage';
import { calculateShiftMetrics } from '@/lib/calculations';
import {
  Calendar,
  TrendingUp,
  PackageCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Pencil,
  Trash2,
  X,
  Save,
  BadgeDollarSign,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const AR_DAY_NAMES = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];
const AR_MONTH_NAMES = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

/** سعر شراء الكرواسون الواحد (دج) */
const COST_PER_UNIT = 21;

const EMPTY_SHIFT = {
  directProfit: 0,
  expenses: 0,
  sweetsSales: 0,
  fridgeSales: 0,
  fermentedCount: 0,
  leftoverBaked: 0,
  leftoverRaw: 0,
  leftoverSpoiled: 0,
};

// ─── Date helpers ─────────────────────────────────────────────────────────────
function getSaturdayOfWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const offset = (d.getDay() + 1) % 7;
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}
function getEndOfWeek(sat) {
  const d = new Date(sat + 'T00:00:00');
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}
function formatWeekLabel(sat, fri) {
  const f = (s) => {
    const [, m, d] = s.split('-');
    return `${d}/${m}`;
  };
  return `${f(sat)} — ${f(fri)}`;
}
function getDayName(dateStr) {
  return AR_DAY_NAMES[new Date(dateStr + 'T00:00:00').getDay()];
}

// ─── Grouping ─────────────────────────────────────────────────────────────────
function groupByMonthAndWeek(entries) {
  const weekMap = new Map();
  for (const entry of entries) {
    const sat = getSaturdayOfWeek(entry.date);
    if (!weekMap.has(sat)) weekMap.set(sat, []);
    weekMap.get(sat).push(entry);
  }
  const weeks = [...weekMap.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([sat, days]) => ({
      saturdayKey: sat,
      fridayKey: getEndOfWeek(sat),
      days: days.sort((a, b) => b.date.localeCompare(a.date)),
    }));

  const monthMap = new Map();
  for (const week of weeks) {
    const key = week.saturdayKey.slice(0, 7);
    if (!monthMap.has(key)) monthMap.set(key, []);
    monthMap.get(key).push(week);
  }
  return [...monthMap.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, monthWeeks]) => {
      const [year, month] = key.split('-');
      return {
        monthKey: key,
        label: `${AR_MONTH_NAMES[+month - 1]} ${year}`,
        weeks: monthWeeks,
      };
    });
}

// ─── Metrics helper ───────────────────────────────────────────────────────────
function entryMetrics(entry) {
  const m = calculateShiftMetrics(entry.morning, false);
  const e = calculateShiftMetrics(entry.evening, true);
  const dayNet = m.netCroissantRevenue + e.netCroissantRevenue;
  const daySold = m.soldCount + e.soldCount;
  const daySpoiled = m.totalSpoiled + e.totalSpoiled;
  const dayAvg = daySold > 0 ? dayNet / daySold : 0;
  // الربح = الصافي − (المباع + التالف) × تكلفة الحبة
  // المباع + التالف = كل الحبات التي استُهلكت فعلاً في هذا اليوم (بدون الباقي النيء أو المطهو الذي ينتقل لليوم التالي)
  const dayCost = (daySold + daySpoiled) * COST_PER_UNIT;
  const dayProfit = dayNet - dayCost;
  return { m, e, dayNet, daySold, daySpoiled, dayAvg, dayCost, dayProfit };
}

function computeSummary(weeks) {
  return weeks.reduce(
    (acc, week) => {
      for (const entry of week.days) {
        const { dayNet, daySold, daySpoiled, dayCost, dayProfit } =
          entryMetrics(entry);
        acc.net += dayNet;
        acc.sold += daySold;
        acc.spoiled += daySpoiled;
        acc.cost += dayCost;
        acc.profit += dayProfit;
      }
      return acc;
    },
    { net: 0, sold: 0, spoiled: 0, cost: 0, profit: 0 },
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ entry, onClose, onSave }) {
  const [morning, setMorning] = useState({ ...EMPTY_SHIFT, ...entry.morning });
  const [evening, setEvening] = useState({ ...EMPTY_SHIFT, ...entry.evening });

  const update = (shift, field, val) => {
    const num = val === '' ? 0 : parseFloat(val);
    if (shift === 'morning') setMorning((p) => ({ ...p, [field]: num }));
    else setEvening((p) => ({ ...p, [field]: num }));
  };

  const handleSave = async () => {
    await onSave({ ...entry, morning, evening });
    onClose();
  };

  const morningM = calculateShiftMetrics(morning, false);
  const eveningM = calculateShiftMetrics(evening, true);

  const SHIFT_ROWS = [
    { key: 'fermentedCount', label: 'عدد حبات التخمير', int: true },
    {
      key: 'leftoverBaked',
      label: 'الباقي مطهو (-)',
      int: true,
      eveningNote: 'يُحسب تالفاً مساءً',
    },
    { key: 'leftoverRaw', label: 'الباقي غير مطهو (-)', int: true },
    { key: 'leftoverSpoiled', label: 'الباقي الفاسد / التالف (-)', int: true },
    { key: 'directProfit', label: 'الفائدة المباشرة (دج)' },
    { key: 'expenses', label: 'إجمالي المصاريف (+) (دج)' },
    { key: 'sweetsSales', label: 'مبيعات الحلويات (-) (دج)' },
    { key: 'fridgeSales', label: 'مبيعات الثلاجة (-) (دج)' },
  ];

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4'>
      <div
        dir='rtl'
        className='bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl'
      >
        {/* Header */}
        <div className='flex items-center justify-between px-5 py-4 border-b border-zinc-800'>
          <div>
            <h2 className='text-base font-bold text-white'>
              تعديل بيانات اليوم
            </h2>
            <p className='text-xs text-zinc-400'>
              {getDayName(entry.date)} · {entry.date.slice(5).replace('-', '/')}
            </p>
          </div>
          <button
            onClick={onClose}
            className='text-zinc-500 hover:text-white transition'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Table */}
        <div className='overflow-x-auto'>
          <table className='w-full text-sm text-right'>
            <thead className='bg-zinc-900/80 text-zinc-400 text-xs border-b border-zinc-800'>
              <tr>
                <th className='py-2.5 px-4'>البيان</th>
                <th className='py-2.5 px-4 text-amber-400'>الصباح</th>
                <th className='py-2.5 px-4 text-sky-400'>المساء</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-zinc-800/60'>
              {SHIFT_ROWS.map((row) => (
                <tr key={row.key} className='bg-zinc-950/30'>
                  <td className='py-2.5 px-4 font-medium text-zinc-200'>
                    {row.label}
                  </td>
                  <td className='py-2 px-4'>
                    <input
                      type='number'
                      min='0'
                      step={row.int ? '1' : 'any'}
                      value={morning[row.key] || ''}
                      onChange={(e) =>
                        update('morning', row.key, e.target.value)
                      }
                      placeholder='0'
                      className='w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-white focus:border-amber-500 focus:outline-none'
                    />
                  </td>
                  <td className='py-2 px-4'>
                    <input
                      type='number'
                      min='0'
                      step={row.int ? '1' : 'any'}
                      value={evening[row.key] || ''}
                      onChange={(e) =>
                        update('evening', row.key, e.target.value)
                      }
                      placeholder='0'
                      className='w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-white focus:border-sky-500 focus:outline-none'
                    />
                    {row.eveningNote && (
                      <p className='text-xs text-rose-400/70 mt-1'>
                        ⚠ {row.eveningNote}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Live preview */}
        <div className='grid grid-cols-2 gap-3 px-5 py-4 border-t border-zinc-800 text-xs'>
          <div className='bg-zinc-800/50 rounded-lg p-3'>
            <p className='text-zinc-400 mb-1'>الصباح — صافي / مباع</p>
            <p className='font-bold text-amber-400'>
              {morningM.netCroissantRevenue.toFixed(2)} دج
            </p>
            <p className='text-zinc-300'>{morningM.soldCount} حبة</p>
          </div>
          <div className='bg-zinc-800/50 rounded-lg p-3'>
            <p className='text-zinc-400 mb-1'>المساء — صافي / مباع</p>
            <p className='font-bold text-sky-400'>
              {eveningM.netCroissantRevenue.toFixed(2)} دج
            </p>
            <p className='text-zinc-300'>{eveningM.soldCount} حبة</p>
          </div>
        </div>

        {/* Footer */}
        <div className='flex items-center justify-end gap-3 px-5 pb-5'>
          <button
            onClick={onClose}
            className='px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 text-sm transition'
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            className='flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-5 py-2 rounded-lg text-sm transition'
          >
            <Save className='w-4 h-4' />
            حفظ التعديلات
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Week Section ─────────────────────────────────────────────────────────────
function WeekSection({ week, weekIndex, onEdit, onDelete }) {
  const [open, setOpen] = useState(weekIndex === 0);
  const ws = computeSummary([week]);
  const weekAvg = ws.sold > 0 ? ws.net / ws.sold : 0;

  return (
    <div className='rounded-lg border border-zinc-700/50 overflow-hidden'>
      <button
        onClick={() => setOpen((v) => !v)}
        className='w-full flex items-center justify-between bg-zinc-800/60 px-4 py-2.5 text-xs hover:bg-zinc-800 transition'
      >
        <div className='flex items-center gap-2'>
          <Calendar className='w-3.5 h-3.5 text-amber-400/80 shrink-0' />
          <span className='font-medium text-zinc-300'>
            {formatWeekLabel(week.saturdayKey, week.fridayKey)}
          </span>
          <span className='text-zinc-500'>({week.days.length} أيام)</span>
        </div>
        <div className='flex items-center gap-5 text-zinc-400'>
          <span>
            <span className='text-amber-400 font-semibold'>
              {ws.net.toFixed(0)}
            </span>{' '}
            دج
          </span>
          <span>
            <span className='text-sky-400 font-semibold'>{ws.sold}</span> حبة
          </span>
          <span
            className={
              ws.profit >= 0
                ? 'text-violet-400 font-semibold'
                : 'text-rose-500 font-semibold'
            }
          >
            ربح: {ws.profit >= 0 ? '+' : ''}
            {ws.profit.toFixed(0)} دج
          </span>
          {open ? (
            <ChevronUp className='w-3.5 h-3.5 text-zinc-500' />
          ) : (
            <ChevronDown className='w-3.5 h-3.5 text-zinc-500' />
          )}
        </div>
      </button>

      {open && (
        <table className='w-full text-sm text-right'>
          <thead className='bg-zinc-900/50 text-zinc-500 text-xs border-t border-zinc-700/40'>
            <tr>
              <th className='py-2 px-4'>اليوم</th>
              <th className='py-2 px-4'>صافي الصباح</th>
              <th className='py-2 px-4'>صافي المساء</th>
              <th className='py-2 px-4 text-amber-400'>الصافي الكلي</th>
              <th className='py-2 px-4'>المباع (حبة)</th>
              <th className='py-2 px-4 text-rose-400'>التالف</th>
              <th className='py-2 px-4 text-emerald-400'>المتوسط</th>
              <th className='py-2 px-4 text-violet-400'>الربح</th>
              <th className='py-2 px-4'></th>
            </tr>
          </thead>
          <tbody className='divide-y divide-zinc-800/60 bg-zinc-950/30'>
            {week.days.map((entry) => {
              const { m, e, dayNet, daySold, daySpoiled, dayAvg, dayProfit } =
                entryMetrics(entry);
              return (
                <tr
                  key={entry.id}
                  className='hover:bg-zinc-900/50 transition group'
                >
                  <td className='py-3 px-4'>
                    <span className='font-semibold text-zinc-200'>
                      {getDayName(entry.date)}
                    </span>
                    <span className='text-zinc-500 text-xs mr-2'>
                      {entry.date.slice(5).replace('-', '/')}
                    </span>
                  </td>
                  <td className='py-3 px-4 text-zinc-300'>
                    {m.netCroissantRevenue.toFixed(2)} دج
                  </td>
                  <td className='py-3 px-4 text-zinc-300'>
                    {e.netCroissantRevenue.toFixed(2)} دج
                  </td>
                  <td className='py-3 px-4 font-bold text-amber-400'>
                    {dayNet.toFixed(2)} دج
                  </td>
                  <td className='py-3 px-4 text-zinc-300'>{daySold}</td>
                  <td className='py-3 px-4 text-rose-400'>{daySpoiled}</td>
                  <td className='py-3 px-4 font-bold text-emerald-400'>
                    {dayAvg.toFixed(2)} دج
                  </td>
                  <td className='py-3 px-4 font-bold'>
                    <span
                      className={
                        dayProfit >= 0 ? 'text-violet-400' : 'text-rose-500'
                      }
                    >
                      {dayProfit >= 0 ? '+' : ''}
                      {dayProfit.toFixed(2)} دج
                    </span>
                  </td>
                  <td className='py-3 px-4'>
                    <div className='flex items-center gap-2 opacity-0 group-hover:opacity-100 transition'>
                      <button
                        onClick={() => onEdit(entry)}
                        className='p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-amber-400/10 transition'
                        title='تعديل'
                      >
                        <Pencil className='w-3.5 h-3.5' />
                      </button>
                      <button
                        onClick={() => onDelete(entry)}
                        className='p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-400/10 transition'
                        title='حذف'
                      >
                        <Trash2 className='w-3.5 h-3.5' />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Week totals */}
            <tr className='bg-zinc-800/40 border-t border-zinc-700/40 text-xs font-semibold text-zinc-400'>
              <td className='py-2 px-4 text-zinc-500'>مجموع الأسبوع</td>
              <td className='py-2 px-4' colSpan={2}></td>
              <td className='py-2 px-4 text-amber-400'>
                {ws.net.toFixed(2)} دج
              </td>
              <td className='py-2 px-4 text-sky-400'>{ws.sold}</td>
              <td className='py-2 px-4 text-rose-400'>{ws.spoiled}</td>
              <td className='py-2 px-4 text-emerald-400'>
                {weekAvg.toFixed(2)} دج
              </td>
              <td className='py-2 px-4'>
                <span
                  className={
                    ws.profit >= 0 ? 'text-violet-400' : 'text-rose-500'
                  }
                >
                  {ws.profit >= 0 ? '+' : ''}
                  {ws.profit.toFixed(2)} دج
                </span>
              </td>
              <td className='py-2 px-4'></td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Month Section ────────────────────────────────────────────────────────────
function MonthSection({ month, isFirst, onEdit, onDelete }) {
  const [open, setOpen] = useState(isFirst);
  const ms = computeSummary(month.weeks);
  const monthAvg = ms.sold > 0 ? ms.net / ms.sold : 0;
  const totalDays = month.weeks.reduce((s, w) => s + w.days.length, 0);

  return (
    <div className='rounded-xl border border-zinc-700 overflow-hidden'>
      <button
        onClick={() => setOpen((v) => !v)}
        className='w-full flex items-center justify-between bg-zinc-900 px-5 py-4 hover:bg-zinc-800/80 transition'
      >
        <div className='flex items-center gap-3'>
          <CalendarDays className='w-5 h-5 text-amber-400 shrink-0' />
          <span className='text-base font-bold text-white'>{month.label}</span>
          <span className='text-zinc-500 text-xs'>
            ({month.weeks.length} أسابيع · {totalDays} يوم)
          </span>
        </div>
        <div className='flex items-center gap-6 text-sm text-zinc-400'>
          <span>
            <span className='text-amber-400 font-bold text-base'>
              {ms.net.toFixed(0)}
            </span>{' '}
            دج
          </span>
          <span>
            <span className='text-sky-400 font-bold'>{ms.sold}</span> حبة
          </span>
          <span>
            <span className='text-emerald-400 font-bold'>
              {monthAvg.toFixed(0)}
            </span>{' '}
            متوسط
          </span>
          <span
            className={ms.profit >= 0 ? 'text-violet-400' : 'text-rose-500'}
          >
            <span className='font-bold text-base'>
              {ms.profit >= 0 ? '+' : ''}
              {ms.profit.toFixed(0)}
            </span>{' '}
            ربح
          </span>
          {open ? (
            <ChevronUp className='w-4 h-4 text-zinc-500' />
          ) : (
            <ChevronDown className='w-4 h-4 text-zinc-500' />
          )}
        </div>
      </button>

      {open && (
        <div className='p-3 space-y-2 bg-zinc-950/60'>
          {month.weeks.map((week, i) => (
            <WeekSection
              key={week.saturdayKey}
              week={week}
              weekIndex={i}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────
function DeleteConfirm({ entry, onConfirm, onCancel }) {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4'>
      <div
        dir='rtl'
        className='bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl'
      >
        <div className='flex items-center gap-3 mb-4'>
          <div className='p-2 rounded-full bg-rose-500/10'>
            <Trash2 className='w-5 h-5 text-rose-400' />
          </div>
          <h2 className='text-base font-bold text-white'>تأكيد الحذف</h2>
        </div>
        <p className='text-sm text-zinc-400 mb-6'>
          هل أنت متأكد من حذف بيانات يوم{' '}
          <span className='text-white font-semibold'>
            {getDayName(entry.date)} {entry.date.slice(5).replace('-', '/')}
          </span>
          ؟ لا يمكن التراجع عن هذا الإجراء.
        </p>
        <div className='flex items-center justify-end gap-3'>
          <button
            onClick={onCancel}
            className='px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white text-sm transition'
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            className='flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2 rounded-lg text-sm transition'
          >
            <Trash2 className='w-4 h-4' />
            حذف
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProgressPage() {
  const [selectedStore, setSelectedStore] = useState('store-1');
  const [entries, setEntries] = useState([]);
  const [editEntry, setEditEntry] = useState(null);
  const [deleteEntry, setDeleteEntry] = useState(null);

  const reload = () => getEntriesByStore(selectedStore).then(setEntries);

  useEffect(() => {
    reload();
  }, [selectedStore]);

  const handleSaveEdit = async (updated) => {
    await saveDailyEntry(updated);
    await reload();
  };

  const handleDelete = async () => {
    if (!deleteEntry) return;
    await deleteDailyEntry(deleteEntry.id);
    setDeleteEntry(null);
    await reload();
  };

  const summary = entries.reduce(
    (acc, entry) => {
      const { dayNet, daySold, daySpoiled, dayCost, dayProfit } =
        entryMetrics(entry);
      acc.totalNet += dayNet;
      acc.totalSold += daySold;
      acc.totalSpoiled += daySpoiled;
      acc.totalCost += dayCost;
      acc.totalProfit += dayProfit;
      return acc;
    },
    {
      totalNet: 0,
      totalSold: 0,
      totalSpoiled: 0,
      totalCost: 0,
      totalProfit: 0,
    },
  );

  const overallAvg =
    summary.totalSold > 0 ? summary.totalNet / summary.totalSold : 0;
  const months = groupByMonthAndWeek(entries);

  return (
    <div dir='rtl' className='min-h-screen bg-zinc-950 text-zinc-100'>
      <Navbar selectedStore={selectedStore} onStoreChange={setSelectedStore} />

      <main className='max-w-5xl mx-auto px-4 py-8 space-y-6'>
        <div>
          <h1 className='text-xl font-bold text-white'>
            متابعة التقدم اليومي والأداء
          </h1>
          <p className='text-sm text-zinc-400'>
            سجل الأيام السابقة ومقارنة الصافي، المبيعات، ومتوسط سعر الحبة
          </p>
        </div>

        {/* Summary cards */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4'>
          <div className='bg-zinc-900 border border-zinc-800 p-4 rounded-xl'>
            <div className='flex items-center justify-between text-zinc-400 text-xs'>
              <span>إجمالي صافي الكرواسون</span>
              <TrendingUp className='w-4 h-4 text-amber-400' />
            </div>
            <p className='text-2xl font-bold text-amber-400 mt-2'>
              {summary.totalNet.toFixed(2)} دج
            </p>
          </div>
          <div className='bg-zinc-900 border border-zinc-800 p-4 rounded-xl'>
            <div className='flex items-center justify-between text-zinc-400 text-xs'>
              <span>إجمالي الحبات المباعة</span>
              <PackageCheck className='w-4 h-4 text-sky-400' />
            </div>
            <p className='text-2xl font-bold text-white mt-2'>
              {summary.totalSold} حبة
            </p>
          </div>
          <div className='bg-zinc-900 border border-zinc-800 p-4 rounded-xl'>
            <div className='flex items-center justify-between text-zinc-400 text-xs'>
              <span>المتوسط العام للحبة</span>
              <Calendar className='w-4 h-4 text-emerald-400' />
            </div>
            <p className='text-2xl font-bold text-emerald-400 mt-2'>
              {overallAvg.toFixed(2)} دج
            </p>
          </div>
          <div className='bg-zinc-900 border border-zinc-800 p-4 rounded-xl'>
            <div className='flex items-center justify-between text-zinc-400 text-xs'>
              <span>إجمالي التالف / الفاسد</span>
              <AlertTriangle className='w-4 h-4 text-rose-400' />
            </div>
            <p className='text-2xl font-bold text-rose-400 mt-2'>
              {summary.totalSpoiled} حبة
            </p>
          </div>
          <div
            className={`border p-4 rounded-xl ${summary.totalProfit >= 0 ? 'bg-violet-950/30 border-violet-700/40' : 'bg-rose-950/30 border-rose-700/40'}`}
          >
            <div className='flex items-center justify-between text-zinc-400 text-xs'>
              <span>إجمالي الربح الصافي</span>
              <BadgeDollarSign
                className={`w-4 h-4 ${summary.totalProfit >= 0 ? 'text-violet-400' : 'text-rose-400'}`}
              />
            </div>
            <p
              className={`text-2xl font-bold mt-2 ${summary.totalProfit >= 0 ? 'text-violet-400' : 'text-rose-400'}`}
            >
              {summary.totalProfit >= 0 ? '+' : ''}
              {summary.totalProfit.toFixed(2)} دج
            </p>
            <p className='text-xs text-zinc-500 mt-1'>
              بعد تكلفة الشراء (21 دج/حبة)
            </p>
          </div>
        </div>

        {/* Month → Week → Day */}
        {entries.length === 0 ? (
          <div className='p-12 text-center text-zinc-500 bg-zinc-900/50 rounded-xl border border-zinc-800'>
            لا توجد سجلات محفوظة لهذا المحل بعد. ابدأ بإدخال ملخص اليوم من
            الصفحة الرئيسية.
          </div>
        ) : (
          <div className='space-y-4'>
            {months.map((month, i) => (
              <MonthSection
                key={month.monthKey}
                month={month}
                isFirst={i === 0}
                onEdit={setEditEntry}
                onDelete={setDeleteEntry}
              />
            ))}
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {editEntry && (
        <EditModal
          entry={editEntry}
          onClose={() => setEditEntry(null)}
          onSave={handleSaveEdit}
        />
      )}

      {/* Delete Confirm */}
      {deleteEntry && (
        <DeleteConfirm
          entry={deleteEntry}
          onConfirm={handleDelete}
          onCancel={() => setDeleteEntry(null)}
        />
      )}
    </div>
  );
}
