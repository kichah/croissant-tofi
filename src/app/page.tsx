'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { calculateShiftMetrics } from '../lib/calculations';
import { saveDailyEntry } from '@/lib/storage';
import { CheckCircle2, Save } from 'lucide-react';

interface ShiftData {
  directProfit: number;
  expenses: number;
  sweetsSales: number;
  fridgeSales: number;
  fermentedCount: number;
  leftoverBaked: number;
  leftoverRaw: number;
  leftoverSpoiled: number;
}

const emptyShift: ShiftData = {
  directProfit: 0,
  expenses: 0,
  sweetsSales: 0,
  fridgeSales: 0,
  fermentedCount: 0,
  leftoverBaked: 0,
  leftoverRaw: 0,
  leftoverSpoiled: 0,
};

export default function DailyEntryPage() {
  const [selectedStore, setSelectedStore] = useState('store-1');
  const [date, setDate] = useState('');

  const [morning, setMorning] = useState<ShiftData>({ ...emptyShift });
  const [evening, setEvening] = useState<ShiftData>({ ...emptyShift });
  const [savedToast, setSavedToast] = useState(false);

  const morningMetrics = calculateShiftMetrics(morning, false);
  const eveningMetrics = calculateShiftMetrics(evening, true);

  const totalNet =
    morningMetrics.netCroissantRevenue + eveningMetrics.netCroissantRevenue;
  const totalSold = morningMetrics.soldCount + eveningMetrics.soldCount;
  const totalAverage = totalSold > 0 ? totalNet / totalSold : 0;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDate(new Date().toISOString().split('T')[0]);
  }, []);

  const updateShift = (
    shift: 'morning' | 'evening',
    field: keyof ShiftData,
    value: string,
  ) => {
    const num = value === '' ? 0 : parseFloat(value);
    if (shift === 'morning') {
      setMorning((prev) => ({ ...prev, [field]: num }));
    } else {
      setEvening((prev) => ({ ...prev, [field]: num }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveDailyEntry({
      id: `${selectedStore}_${date}`,
      storeId: selectedStore,
      date,
      morning,
      evening,
      createdAt: new Date().toISOString(),
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  return (
    <div dir='rtl' className='min-h-screen bg-zinc-950 text-zinc-100'>
      <Navbar selectedStore={selectedStore} onStoreChange={setSelectedStore} />

      <main className='max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-28 sm:pb-8'>
        <form onSubmit={handleSave} className='space-y-4 sm:space-y-6'>
          {/* Top Form Header with Date */}
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-zinc-900/70 p-3.5 sm:p-4 rounded-xl border border-zinc-800'>
            <div>
              <h1 className='text-lg sm:text-xl font-bold text-white'>
                جدول الملخص المالي اليومي (المباشر)
              </h1>
              <p className='text-xs sm:text-sm text-zinc-400 mt-0.5'>
                أدخل معطيات الفترتين لحساب الصافي والمتوسط تلقائياً
              </p>
            </div>

            <div className='flex items-center justify-between sm:justify-start gap-2.5 bg-zinc-950/80 p-1.5 sm:p-0 rounded-lg sm:bg-transparent border border-zinc-800 sm:border-0'>
              <label className='text-xs sm:text-sm text-zinc-400 font-medium shrink-0'>
                التاريخ:
              </label>
              <input
                type='date'
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className='w-full sm:w-auto bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 sm:py-2 text-sm text-white focus:outline-none focus:border-amber-500'
              />
            </div>
          </div>

          {/* Main Shift Table with Guaranteed Horizontal Scroll on Mobile */}
          <div className='bg-zinc-900/50 rounded-xl border border-zinc-800 shadow-sm overflow-hidden'>
            {/* Mobile Swipe Hint */}
            <div className='sm:hidden flex items-center justify-between px-3 py-1.5 bg-zinc-900/90 border-b border-zinc-800/80 text-[11px] text-zinc-400'>
              <span>جدول حركة الوردية</span>
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
                style={{ minWidth: '540px' }}
              >
                <thead className='bg-zinc-900 text-zinc-300 border-b border-zinc-800'>
                  <tr>
                    <th
                      className='py-3 px-3 sm:px-4 font-semibold'
                      style={{ minWidth: '180px', width: '38%' }}
                    >
                      البيان / البند
                    </th>
                    <th
                      className='py-3 px-3 sm:px-4 font-semibold text-amber-400 text-center sm:text-right'
                      style={{ minWidth: '160px', width: '31%' }}
                    >
                      الفترة الصباحية
                    </th>
                    <th
                      className='py-3 px-3 sm:px-4 font-semibold text-sky-400 text-center sm:text-right'
                      style={{ minWidth: '160px', width: '31%' }}
                    >
                      الفترة المسائية
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-zinc-800/80'>
                  <tr className='bg-zinc-900/40'>
                    <td
                      colSpan={3}
                      className='py-2 px-3 sm:px-4 text-[11px] sm:text-xs font-bold text-zinc-400 tracking-wide'
                    >
                      حركة التخمير والكرواسون (بالحبة)
                    </td>
                  </tr>
                  {(
                    [
                      { key: 'fermentedCount', label: 'عدد حبات التخمير' },
                      {
                        key: 'leftoverBaked',
                        label: 'الباقي مطهو (-)',
                        eveningNote: 'يُحسب تلقائياً تالفاً مساءً',
                      },
                      { key: 'leftoverRaw', label: 'الباقي غير مطهو (-)' },
                      {
                        key: 'leftoverSpoiled',
                        label: 'الباقي الفاسد / التالف (-)',
                      },
                    ] as {
                      key: keyof ShiftData;
                      label: string;
                      eveningNote?: string;
                    }[]
                  ).map((row) => (
                    <tr
                      key={row.key}
                      className='hover:bg-zinc-900/30 transition'
                    >
                      <td className='py-2.5 sm:py-3 px-3 sm:px-4 font-medium text-zinc-200'>
                        {row.label}
                      </td>
                      <td className='py-2 px-2 sm:px-4'>
                        <input
                          type='number'
                          min='0'
                          value={morning[row.key] || ''}
                          onChange={(e) =>
                            updateShift('morning', row.key, e.target.value)
                          }
                          placeholder='0'
                          className='w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-base sm:text-sm text-white focus:border-amber-500 focus:outline-none min-h-[38px] sm:min-h-[42px] transition'
                        />
                      </td>
                      <td className='py-2 px-2 sm:px-4'>
                        <input
                          type='number'
                          min='0'
                          value={evening[row.key] || ''}
                          onChange={(e) =>
                            updateShift('evening', row.key, e.target.value)
                          }
                          placeholder='0'
                          className='w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-base sm:text-sm text-white focus:border-sky-500 focus:outline-none min-h-[38px] sm:min-h-[42px] transition'
                        />
                        {row.eveningNote && (
                          <p className='text-[10px] sm:text-xs text-rose-400/80 mt-1'>
                            ⚠ {row.eveningNote}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}

                  <tr className='bg-zinc-900/40'>
                    <td
                      colSpan={3}
                      className='py-2 px-3 sm:px-4 text-[11px] sm:text-xs font-bold text-zinc-400 tracking-wide'
                    >
                      الحسابات المالية المباشرة (دج)
                    </td>
                  </tr>
                  {(
                    [
                      { key: 'directProfit', label: '1. الفائدة المباشرة' },
                      { key: 'expenses', label: '2. إجمالي المصاريف (+)' },
                      { key: 'sweetsSales', label: '3. مبيعات الحلويات (-)' },
                      { key: 'fridgeSales', label: '4. مبيعات الثلاجة (-)' },
                    ] as { key: keyof ShiftData; label: string }[]
                  ).map((row) => (
                    <tr
                      key={row.key}
                      className='hover:bg-zinc-900/30 transition'
                    >
                      <td className='py-2.5 sm:py-3 px-3 sm:px-4 font-medium text-zinc-200'>
                        {row.label}
                      </td>
                      <td className='py-2 px-2 sm:px-4'>
                        <input
                          type='number'
                          step='any'
                          value={morning[row.key] || ''}
                          onChange={(e) =>
                            updateShift('morning', row.key, e.target.value)
                          }
                          placeholder='0.00'
                          className='w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-base sm:text-sm text-white focus:border-amber-500 focus:outline-none min-h-[38px] sm:min-h-[42px] transition'
                        />
                      </td>
                      <td className='py-2 px-2 sm:px-4'>
                        <input
                          type='number'
                          step='any'
                          value={evening[row.key] || ''}
                          onChange={(e) =>
                            updateShift('evening', row.key, e.target.value)
                          }
                          placeholder='0.00'
                          className='w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-base sm:text-sm text-white focus:border-sky-500 focus:outline-none min-h-[38px] sm:min-h-[42px] transition'
                        />
                      </td>
                    </tr>
                  ))}

                  <tr className='bg-amber-500/10 font-bold text-amber-300'>
                    <td className='py-3 px-3 sm:px-4'>
                      5. الصافي الخاص بالكرواسون
                    </td>
                    <td className='py-3 px-3 sm:px-4 text-center sm:text-right'>
                      {morningMetrics.netCroissantRevenue.toFixed(2)} دج
                    </td>
                    <td className='py-3 px-3 sm:px-4 text-center sm:text-right'>
                      {eveningMetrics.netCroissantRevenue.toFixed(2)} دج
                    </td>
                  </tr>
                  <tr className='bg-zinc-900/60 font-semibold text-zinc-200'>
                    <td className='py-2.5 sm:py-3 px-3 sm:px-4'>
                      6. عدد الحبات المباعة
                    </td>
                    <td className='py-2.5 sm:py-3 px-3 sm:px-4 text-center sm:text-right'>
                      {morningMetrics.soldCount} حبة
                    </td>
                    <td className='py-2.5 sm:py-3 px-3 sm:px-4 text-center sm:text-right'>
                      {eveningMetrics.soldCount} حبة
                    </td>
                  </tr>
                  <tr className='bg-emerald-500/10 font-bold text-emerald-400'>
                    <td className='py-3 px-3 sm:px-4'>
                      7. المتوسط (الصافي ÷ المباع)
                    </td>
                    <td className='py-3 px-3 sm:px-4 text-center sm:text-right'>
                      {morningMetrics.averagePerPiece.toFixed(2)} دج
                    </td>
                    <td className='py-3 px-3 sm:px-4 text-center sm:text-right'>
                      {eveningMetrics.averagePerPiece.toFixed(2)} دج
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Summary Cards */}
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4'>
            <div className='bg-zinc-900 border border-zinc-800 p-3.5 sm:p-4 rounded-xl flex items-center justify-between sm:block'>
              <span className='text-xs text-zinc-400'>إجمالي صافي اليوم</span>
              <p className='text-xl sm:text-2xl font-bold text-amber-400 mt-0 sm:mt-1'>
                {totalNet.toFixed(2)} دج
              </p>
            </div>
            <div className='bg-zinc-900 border border-zinc-800 p-3.5 sm:p-4 rounded-xl flex items-center justify-between sm:block'>
              <span className='text-xs text-zinc-400'>
                إجمالي الحبات المباعة اليوم
              </span>
              <p className='text-xl sm:text-2xl font-bold text-white mt-0 sm:mt-1'>
                {totalSold} حبة
              </p>
            </div>
            <div className='bg-zinc-900 border border-zinc-800 p-3.5 sm:p-4 rounded-xl flex items-center justify-between sm:block'>
              <span className='text-xs text-zinc-400'>المتوسط العام لليوم</span>
              <p className='text-xl sm:text-2xl font-bold text-emerald-400 mt-0 sm:mt-1'>
                {totalAverage.toFixed(2)} دج
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className='flex flex-col-reverse sm:flex-row items-center justify-end gap-3 sm:gap-4 pt-2'>
            {savedToast && (
              <span className='flex items-center gap-1.5 text-xs sm:text-sm text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/30'>
                <CheckCircle2 className='w-4 h-4' />
                تم حفظ بيانات اليوم بنجاح في السحابة
              </span>
            )}
            <button
              type='submit'
              className='w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-6 py-3.5 sm:py-3 rounded-xl transition cursor-pointer text-base shadow-lg active:scale-[0.98]'
            >
              <Save className='w-5 h-5' />
              حفظ ملخص اليوم
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
