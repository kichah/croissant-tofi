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
  Loader2,
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
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4'>
      <div
        dir='rtl'
        className='bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden'
      >
        {/* Header */}
        <div className='flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-zinc-800 shrink-0'>
          <div>
            <h2 className='text-sm sm:text-base font-bold text-white'>
              تعديل بيانات اليوم
            </h2>
            <p className='text-xs text-zinc-400'>
              {getDayName(entry.date)} · {entry.date.slice(5).replace('-', '/')}
            </p>
          </div>
          <button
            onClick={onClose}
            className='p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Scrollable Table Area */}
        <div className='overflow-y-auto flex-1 p-2 sm:p-4'>
          <div
            className='overflow-x-auto rounded-xl border border-zinc-800'
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <table
              className='w-full text-xs sm:text-sm text-right'
              style={{ minWidth: '440px' }}
            >
              <thead className='bg-zinc-900/90 text-zinc-400 text-xs border-b border-zinc-800'>
                <tr>
                  <th className='py-2.5 px-3 sm:px-4' style={{ width: '40%' }}>
                    البيان
                  </th>
                  <th
                    className='py-2.5 px-3 sm:px-4 text-amber-400'
                    style={{ width: '30%' }}
                  >
                    الصباح
                  </th>
                  <th
                    className='py-2.5 px-3 sm:px-4 text-sky-400'
                    style={{ width: '30%' }}
                  >
                    المساء
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-zinc-800/60'>
                {SHIFT_ROWS.map((row) => (
                  <tr key={row.key} className='bg-zinc-950/40'>
                    <td className='py-2 sm:py-2.5 px-3 sm:px-4 font-medium text-zinc-200'>
                      {row.label}
                    </td>
                    <td className='py-1.5 sm:py-2 px-2 sm:px-4'>
                      <input
                        type='number'
                        min='0'
                        step={row.int ? '1' : 'any'}
                        value={morning[row.key] || ''}
                        onChange={(e) =>
                          update('morning', row.key, e.target.value)
                        }
                        placeholder='0'
                        className='w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 sm:px-3 py-1.5 text-base sm:text-sm text-white focus:border-amber-500 focus:outline-none'
                      />
                    </td>
                    <td className='py-1.5 sm:py-2 px-2 sm:px-4'>
                      <input
                        type='number'
                        min='0'
                        step={row.int ? '1' : 'any'}
                        value={evening[row.key] || ''}
                        onChange={(e) =>
                          update('evening', row.key, e.target.value)
                        }
                        placeholder='0'
                        className='w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 sm:px-3 py-1.5 text-base sm:text-sm text-white focus:border-sky-500 focus:outline-none'
                      />
                      {row.eveningNote && (
                        <p className='text-[10px] text-rose-400/80 mt-1'>
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
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mt-3 text-xs'>
            <div className='bg-zinc-800/50 rounded-xl p-3 border border-zinc-800 flex items-center justify-between sm:block'>
              <div>
                <p className='text-zinc-400 text-[11px] mb-0.5'>الصباح</p>
                <p className='font-bold text-amber-400 text-sm'>
                  {morningM.netCroissantRevenue.toFixed(2)} دج
                </p>
              </div>
              <p className='text-zinc-300'>{morningM.soldCount} حبة مباعة</p>
            </div>
            <div className='bg-zinc-800/50 rounded-xl p-3 border border-zinc-800 flex items-center justify-between sm:block'>
              <div>
                <p className='text-zinc-400 text-[11px] mb-0.5'>المساء</p>
                <p className='font-bold text-sky-400 text-sm'>
                  {eveningM.netCroissantRevenue.toFixed(2)} دج
                </p>
              </div>
              <p className='text-zinc-300'>{eveningM.soldCount} حبة مباعة</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='flex items-center justify-end gap-2.5 px-4 sm:px-5 py-3 border-t border-zinc-800 shrink-0 bg-zinc-950/60'>
          <button
            onClick={onClose}
            className='w-1/2 sm:w-auto px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white text-sm transition'
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            className='w-1/2 sm:w-auto flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-5 py-2.5 rounded-xl text-sm transition active:scale-95'
          >
            <Save className='w-4 h-4' />
            حفظ التعديل
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
    <div className='rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/20'>
      {/* Week Header Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className='w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:px-4 sm:py-3 text-xs hover:bg-zinc-800/60 transition text-right'
      >
        <div className='flex items-center justify-between w-full sm:w-auto gap-2'>
          <div className='flex items-center gap-2'>
            <Calendar className='w-3.5 h-3.5 text-amber-400 shrink-0' />
            <span className='font-semibold text-zinc-200 text-xs sm:text-sm'>
              {formatWeekLabel(week.saturdayKey, week.fridayKey)}
            </span>
            <span className='text-zinc-500 text-[11px]'>
              ({week.days.length} أيام)
            </span>
          </div>
          <div className='sm:hidden text-zinc-400'>
            {open ? (
              <ChevronUp className='w-4 h-4' />
            ) : (
              <ChevronDown className='w-4 h-4' />
            )}
          </div>
        </div>

        <div className='flex items-center justify-between sm:justify-end gap-3 sm:gap-5 text-zinc-400 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-800/60'>
          <span>
            صافي:{' '}
            <span className='text-amber-400 font-bold'>
              {ws.net.toFixed(0)}
            </span>{' '}
            دج
          </span>
          <span>
            مباع: <span className='text-sky-400 font-bold'>{ws.sold}</span>
          </span>
          <span
            className={
              ws.profit >= 0
                ? 'text-violet-400 font-bold'
                : 'text-rose-400 font-bold'
            }
          >
            ربح: {ws.profit >= 0 ? '+' : ''}
            {ws.profit.toFixed(0)} دج
          </span>
          <div className='hidden sm:block text-zinc-500'>
            {open ? (
              <ChevronUp className='w-4 h-4' />
            ) : (
              <ChevronDown className='w-4 h-4' />
            )}
          </div>
        </div>
      </button>

      {/* Day rows table with Guaranteed Horizontal Scrolling */}
      {open && (
        <div className='border-t border-zinc-800 bg-zinc-950/40'>
          {/* Mobile swipe hint */}
          <div className='sm:hidden flex items-center justify-between px-3 py-1.5 bg-zinc-900/90 border-b border-zinc-800/60 text-[11px] text-zinc-400'>
            <span>جدول أيام الأسبوع</span>
            <span className='text-amber-400/90 font-medium'>
              ← اسحب أفقياً للمزيد →
            </span>
          </div>

          <div
            className='w-full overflow-x-auto block'
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <table
              className='w-full text-xs sm:text-sm text-right'
              style={{ minWidth: '700px' }}
            >
              <thead className='bg-zinc-900/80 text-zinc-400 text-xs border-b border-zinc-800'>
                <tr>
                  <th className='py-2.5 px-3 sm:px-4' style={{ width: '15%' }}>
                    اليوم
                  </th>
                  <th className='py-2.5 px-3 sm:px-4' style={{ width: '11%' }}>
                    صافي ص
                  </th>
                  <th className='py-2.5 px-3 sm:px-4' style={{ width: '11%' }}>
                    صافي م
                  </th>
                  <th
                    className='py-2.5 px-3 sm:px-4 text-amber-400'
                    style={{ width: '12%' }}
                  >
                    الصافي
                  </th>
                  <th className='py-2.5 px-3 sm:px-4' style={{ width: '9%' }}>
                    المباع
                  </th>
                  <th
                    className='py-2.5 px-3 sm:px-4 text-rose-400'
                    style={{ width: '9%' }}
                  >
                    التالف
                  </th>
                  <th
                    className='py-2.5 px-3 sm:px-4 text-emerald-400'
                    style={{ width: '11%' }}
                  >
                    المتوسط
                  </th>
                  <th
                    className='py-2.5 px-3 sm:px-4 text-violet-400'
                    style={{ width: '12%' }}
                  >
                    الربح
                  </th>
                  <th
                    className='py-2.5 px-2 sm:px-4 text-center'
                    style={{ width: '10%' }}
                  >
                    إجراء
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-zinc-800/60'>
                {week.days.map((entry) => {
                  const { m, e, dayNet, daySold, daySpoiled, dayAvg, dayProfit } =
                    entryMetrics(entry);
                  return (
                    <tr
                      key={entry.id}
                      className='hover:bg-zinc-900/50 transition group'
                    >
                      <td className='py-2.5 sm:py-3 px-3 sm:px-4'>
                        <span className='font-semibold text-zinc-200'>
                          {getDayName(entry.date)}
                        </span>
                        <span className='text-zinc-500 text-[10px] sm:text-xs mr-1.5'>
                          {entry.date.slice(5).replace('-', '/')}
                        </span>
                      </td>
                      <td className='py-2.5 sm:py-3 px-3 sm:px-4 text-zinc-300'>
                        {m.netCroissantRevenue.toFixed(0)} دج
                      </td>
                      <td className='py-2.5 sm:py-3 px-3 sm:px-4 text-zinc-300'>
                        {e.netCroissantRevenue.toFixed(0)} دج
                      </td>
                      <td className='py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-amber-400'>
                        {dayNet.toFixed(0)} دج
                      </td>
                      <td className='py-2.5 sm:py-3 px-3 sm:px-4 text-zinc-300'>
                        {daySold}
                      </td>
                      <td className='py-2.5 sm:py-3 px-3 sm:px-4 text-rose-400'>
                        {daySpoiled}
                      </td>
                      <td className='py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-emerald-400'>
                        {dayAvg.toFixed(2)} دج
                      </td>
                      <td className='py-2.5 sm:py-3 px-3 sm:px-4 font-bold'>
                        <span
                          className={
                            dayProfit >= 0 ? 'text-violet-400' : 'text-rose-500'
                          }
                        >
                          {dayProfit >= 0 ? '+' : ''}
                          {dayProfit.toFixed(0)} دج
                        </span>
                      </td>
                      <td className='py-2.5 sm:py-3 px-2 sm:px-4'>
                        <div className='flex items-center justify-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition'>
                          <button
                            onClick={() => onEdit(entry)}
                            className='p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-amber-400/10 active:scale-95 transition'
                            title='تعديل'
                          >
                            <Pencil className='w-3.5 h-3.5' />
                          </button>
                          <button
                            onClick={() => onDelete(entry)}
                            className='p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-400/10 active:scale-95 transition'
                            title='حذف'
                          >
                            <Trash2 className='w-3.5 h-3.5' />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Week totals footer */}
                <tr className='bg-zinc-900/70 border-t border-zinc-700/50 text-xs font-semibold text-zinc-400'>
                  <td className='py-2.5 px-3 sm:px-4 text-zinc-400 font-bold'>
                    المجموع
                  </td>
                  <td className='py-2.5 px-3 sm:px-4' colSpan={2}></td>
                  <td className='py-2.5 px-3 sm:px-4 text-amber-400 font-bold'>
                    {ws.net.toFixed(0)} دج
                  </td>
                  <td className='py-2.5 px-3 sm:px-4 text-sky-400 font-bold'>
                    {ws.sold}
                  </td>
                  <td className='py-2.5 px-3 sm:px-4 text-rose-400 font-bold'>
                    {ws.spoiled}
                  </td>
                  <td className='py-2.5 px-3 sm:px-4 text-emerald-400 font-bold'>
                    {weekAvg.toFixed(2)} دج
                  </td>
                  <td className='py-2.5 px-3 sm:px-4 font-bold'>
                    <span
                      className={
                        ws.profit >= 0 ? 'text-violet-400' : 'text-rose-500'
                      }
                    >
                      {ws.profit >= 0 ? '+' : ''}
                      {ws.profit.toFixed(0)} دج
                    </span>
                  </td>
                  <td className='py-2.5 px-2 sm:px-4'></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
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
    <div className='rounded-2xl border border-zinc-700/80 overflow-hidden bg-zinc-900/40 shadow-sm'>
      {/* Month Header Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className='w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 sm:px-5 sm:py-4 bg-zinc-900/90 hover:bg-zinc-800/80 transition text-right'
      >
        <div className='flex items-center justify-between w-full sm:w-auto gap-3'>
          <div className='flex items-center gap-2.5'>
            <CalendarDays className='w-5 h-5 text-amber-400 shrink-0' />
            <span className='text-sm sm:text-base font-bold text-white'>
              {month.label}
            </span>
            <span className='text-zinc-500 text-[11px] sm:text-xs'>
              ({month.weeks.length} أسابيع · {totalDays} يوم)
            </span>
          </div>
          <div className='sm:hidden text-zinc-400'>
            {open ? (
              <ChevronUp className='w-4 h-4' />
            ) : (
              <ChevronDown className='w-4 h-4' />
            )}
          </div>
        </div>

        <div className='flex items-center justify-between sm:justify-end gap-3 sm:gap-6 text-xs sm:text-sm text-zinc-400 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-800'>
          <span>
            الصافي:{' '}
            <span className='text-amber-400 font-bold'>
              {ms.net.toFixed(0)}
            </span>{' '}
            دج
          </span>
          <span>
            المباع: <span className='text-sky-400 font-bold'>{ms.sold}</span>
          </span>
          <span>
            المتوسط:{' '}
            <span className='text-emerald-400 font-bold'>
              {monthAvg.toFixed(2)}
            </span>
          </span>
          <span
            className={
              ms.profit >= 0
                ? 'text-violet-400 font-bold'
                : 'text-rose-500 font-bold'
            }
          >
            الربح: {ms.profit >= 0 ? '+' : ''}
            {ms.profit.toFixed(0)} دج
          </span>
          <div className='hidden sm:block text-zinc-500'>
            {open ? (
              <ChevronUp className='w-4 h-4' />
            ) : (
              <ChevronDown className='w-4 h-4' />
            )}
          </div>
        </div>
      </button>

      {/* Weeks list inside Month */}
      {open && (
        <div className='p-2 sm:p-3 space-y-2 bg-zinc-950/60'>
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
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4'>
      <div
        dir='rtl'
        className='bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm p-5 sm:p-6 shadow-2xl'
      >
        <div className='flex items-center gap-3 mb-3'>
          <div className='p-2 rounded-full bg-rose-500/10'>
            <Trash2 className='w-5 h-5 text-rose-400' />
          </div>
          <h2 className='text-base font-bold text-white'>تأكيد الحذف</h2>
        </div>
        <p className='text-xs sm:text-sm text-zinc-400 mb-5 leading-relaxed'>
          هل أنت متأكد من حذف بيانات يوم{' '}
          <span className='text-white font-semibold'>
            {getDayName(entry.date)} {entry.date.slice(5).replace('-', '/')}
          </span>
          ؟ سيتم حذفها نهائياً من قاعدة البيانات.
        </p>
        <div className='flex items-center justify-end gap-2.5'>
          <button
            onClick={onCancel}
            className='w-1/2 sm:w-auto px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white text-sm transition'
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            className='w-1/2 sm:w-auto flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition active:scale-95'
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
  const [loading, setLoading] = useState(true);
  const [editEntry, setEditEntry] = useState(null);
  const [deleteEntry, setDeleteEntry] = useState(null);

  const reload = async () => {
    setLoading(true);
    try {
      const data = await getEntriesByStore(selectedStore);
      setEntries(data || []);
    } catch (err) {
      console.error('Error fetching entries:', err);
    } finally {
      setLoading(false);
    }
  };

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

      <main className='max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6 pb-28 sm:pb-8'>
        {/* Title */}
        <div>
          <h1 className='text-lg sm:text-xl font-bold text-white'>
            متابعة التقدم اليومي والأداء
          </h1>
          <p className='text-xs sm:text-sm text-zinc-400 mt-0.5'>
            سجل الأسابيع والشهور ومقارنة الصافي والمبيعات والأرباح
          </p>
        </div>

        {/* Summary cards: Responsive 2-cols on mobile, 5-cols on desktop */}
        <div className='grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4'>
          <div className='bg-zinc-900 border border-zinc-800 p-3 sm:p-4 rounded-xl'>
            <div className='flex items-center justify-between text-zinc-400 text-[11px] sm:text-xs'>
              <span>إجمالي الصافي</span>
              <TrendingUp className='w-3.5 h-3.5 text-amber-400' />
            </div>
            <p className='text-lg sm:text-2xl font-bold text-amber-400 mt-1 sm:mt-2'>
              {summary.totalNet.toFixed(0)} دج
            </p>
          </div>

          <div className='bg-zinc-900 border border-zinc-800 p-3 sm:p-4 rounded-xl'>
            <div className='flex items-center justify-between text-zinc-400 text-[11px] sm:text-xs'>
              <span>الحبات المباعة</span>
              <PackageCheck className='w-3.5 h-3.5 text-sky-400' />
            </div>
            <p className='text-lg sm:text-2xl font-bold text-white mt-1 sm:mt-2'>
              {summary.totalSold} حبة
            </p>
          </div>

          <div className='bg-zinc-900 border border-zinc-800 p-3 sm:p-4 rounded-xl'>
            <div className='flex items-center justify-between text-zinc-400 text-[11px] sm:text-xs'>
              <span>المتوسط العام</span>
              <Calendar className='w-3.5 h-3.5 text-emerald-400' />
            </div>
            <p className='text-lg sm:text-2xl font-bold text-emerald-400 mt-1 sm:mt-2'>
              {overallAvg.toFixed(2)} دج
            </p>
          </div>

          <div className='bg-zinc-900 border border-zinc-800 p-3 sm:p-4 rounded-xl'>
            <div className='flex items-center justify-between text-zinc-400 text-[11px] sm:text-xs'>
              <span>إجمالي التالف</span>
              <AlertTriangle className='w-3.5 h-3.5 text-rose-400' />
            </div>
            <p className='text-lg sm:text-2xl font-bold text-rose-400 mt-1 sm:mt-2'>
              {summary.totalSpoiled} حبة
            </p>
          </div>

          <div
            className={`border p-3 sm:p-4 rounded-xl col-span-2 lg:col-span-1 ${
              summary.totalProfit >= 0
                ? 'bg-violet-950/30 border-violet-700/40'
                : 'bg-rose-950/30 border-rose-700/40'
            }`}
          >
            <div className='flex items-center justify-between text-zinc-400 text-[11px] sm:text-xs'>
              <span>إجمالي الربح الصافي</span>
              <BadgeDollarSign
                className={`w-3.5 h-3.5 ${
                  summary.totalProfit >= 0
                    ? 'text-violet-400'
                    : 'text-rose-400'
                }`}
              />
            </div>
            <p
              className={`text-lg sm:text-2xl font-bold mt-1 sm:mt-2 ${
                summary.totalProfit >= 0
                  ? 'text-violet-400'
                  : 'text-rose-400'
              }`}
            >
              {summary.totalProfit >= 0 ? '+' : ''}
              {summary.totalProfit.toFixed(0)} دج
            </p>
            <p className='text-[10px] text-zinc-500 mt-0.5'>
              بعد تكلفة الشراء (21 دج/حبة)
            </p>
          </div>
        </div>

        {/* Loading Spinner / Empty State / Content Hierarchy */}
        {loading ? (
          <div className='flex flex-col items-center justify-center py-16 sm:py-24 space-y-3 bg-zinc-900/30 rounded-2xl border border-zinc-800/80'>
            <Loader2 className='w-8 h-8 text-amber-400 animate-spin' />
            <p className='text-xs sm:text-sm text-zinc-400 font-medium'>
              جاري تحميل سجلات الأداء من السحابة...
            </p>
          </div>
        ) : entries.length === 0 ? (
          <div className='p-8 sm:p-12 text-center text-xs sm:text-sm text-zinc-500 bg-zinc-900/50 rounded-xl border border-zinc-800'>
            لا توجد سجلات محفوظة لهذا المحل بعد. ابدأ بإدخال ملخص اليوم من
            الصفحة الرئيسية.
          </div>
        ) : (
          <div className='space-y-3 sm:space-y-4'>
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
