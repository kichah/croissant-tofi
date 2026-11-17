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

  const updateShift = (shift: 'morning' | 'evening', field: keyof ShiftData, value: string) => {
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

      <main className='max-w-5xl mx-auto px-4 py-8'>
        <form onSubmit={handleSave} className='space-y-6'>
          <div className='flex flex-wrap items-center justify-between gap-4 bg-zinc-900/70 p-4 rounded-xl border border-zinc-800'>
            <div>
              <h1 className='text-xl font-bold text-white'>
                جدول الملخص المالي اليومي (المباشر)
              </h1>
              <p className='text-sm text-zinc-400'>
                أدخل معطيات الفترتين الصباحية والمسائية لحساب الصافي والمتوسط
                تلقائياً
              </p>
            </div>

            <div className='flex items-center gap-3'>
              <label className='text-sm text-zinc-400'>التاريخ:</label>
              <input
                type='date'
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className='bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500'
              />
            </div>
          </div>

          <div className='overflow-x-auto bg-zinc-900/50 rounded-xl border border-zinc-800'>
            <table className='w-full text-sm text-right'>
              <thead className='bg-zinc-900 text-zinc-300 border-b border-zinc-800'>
                <tr>
                  <th className='py-3.5 px-4 font-semibold w-1/3'>
                    البيان / البند
                  </th>
                  <th className='py-3.5 px-4 font-semibold text-amber-400'>
                    الفترة الصباحية
                  </th>
                  <th className='py-3.5 px-4 font-semibold text-sky-400'>
                    الفترة المسائية
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-zinc-800/80'>
                <tr className='bg-zinc-900/30'>
                  <td
                    colSpan={3}
                    className='py-2 px-4 text-xs font-bold text-zinc-400'
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
                      eveningNote: 'يُحسب تلقائياً ضمن التالف مساءً',
                    },
                    { key: 'leftoverRaw', label: 'الباقي غير مطهو (-)' },
                    {
                      key: 'leftoverSpoiled',
                      label: 'الباقي الفاسد / التالف (-)',
                    },
                  ] as { key: keyof ShiftData; label: string; eveningNote?: string }[]
                ).map((row) => (
                  <tr key={row.key}>
                    <td className='py-3 px-4 font-medium text-zinc-200'>
                      {row.label}
                    </td>
                    <td className='py-2 px-4'>
                      <input
                        type='number'
                        min='0'
                        value={morning[row.key] || ''}
                        onChange={(e) =>
                          updateShift('morning', row.key, e.target.value)
                        }
                        placeholder='0'
                        className='w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none'
                      />
                    </td>
                    <td className='py-2 px-4'>
                      <input
                        type='number'
                        min='0'
                        value={evening[row.key] || ''}
                        onChange={(e) =>
                          updateShift('evening', row.key, e.target.value)
                        }
                        placeholder='0'
                        className='w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-sky-500 focus:outline-none'
                      />
                      {row.eveningNote && (
                        <p className='text-xs text-rose-400/70 mt-1'>
                          ⚠ {row.eveningNote}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}

                <tr className='bg-zinc-900/30'>
                  <td
                    colSpan={3}
                    className='py-2 px-4 text-xs font-bold text-zinc-400'
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
                  <tr key={row.key}>
                    <td className='py-3 px-4 font-medium text-zinc-200'>
                      {row.label}
                    </td>
                    <td className='py-2 px-4'>
                      <input
                        type='number'
                        step='any'
                        value={morning[row.key] || ''}
                        onChange={(e) =>
                          updateShift('morning', row.key, e.target.value)
                        }
                        placeholder='0.00'
                        className='w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none'
                      />
                    </td>
                    <td className='py-2 px-4'>
                      <input
                        type='number'
                        step='any'
                        value={evening[row.key] || ''}
                        onChange={(e) =>
                          updateShift('evening', row.key, e.target.value)
                        }
                        placeholder='0.00'
                        className='w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-sky-500 focus:outline-none'
                      />
                    </td>
                  </tr>
                ))}

                <tr className='bg-amber-500/10 font-bold text-amber-300'>
                  <td className='py-3.5 px-4'>5. الصافي الخاص بالكرواسون</td>
                  <td className='py-3.5 px-4'>
                    {morningMetrics.netCroissantRevenue.toFixed(2)} دج
                  </td>
                  <td className='py-3.5 px-4'>
                    {eveningMetrics.netCroissantRevenue.toFixed(2)} دج
                  </td>
                </tr>
                <tr className='bg-zinc-900/60 font-semibold text-zinc-200'>
                  <td className='py-3 px-4'>6. عدد الحبات المباعة</td>
                  <td className='py-3 px-4'>{morningMetrics.soldCount} حبة</td>
                  <td className='py-3 px-4'>{eveningMetrics.soldCount} حبة</td>
                </tr>
                <tr className='bg-emerald-500/10 font-bold text-emerald-400'>
                  <td className='py-3.5 px-4'>7. المتوسط (الصافي ÷ المباع)</td>
                  <td className='py-3.5 px-4'>
                    {morningMetrics.averagePerPiece.toFixed(2)} دج
                  </td>
                  <td className='py-3.5 px-4'>
                    {eveningMetrics.averagePerPiece.toFixed(2)} دج
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div className='bg-zinc-900 border border-zinc-800 p-4 rounded-xl'>
              <span className='text-xs text-zinc-400'>إجمالي صافي اليوم</span>
              <p className='text-2xl font-bold text-amber-400 mt-1'>
                {totalNet.toFixed(2)} دج
              </p>
            </div>
            <div className='bg-zinc-900 border border-zinc-800 p-4 rounded-xl'>
              <span className='text-xs text-zinc-400'>
                إجمالي الحبات المباعة اليوم
              </span>
              <p className='text-2xl font-bold text-white mt-1'>
                {totalSold} حبة
              </p>
            </div>
            <div className='bg-zinc-900 border border-zinc-800 p-4 rounded-xl'>
              <span className='text-xs text-zinc-400'>المتوسط العام لليوم</span>
              <p className='text-2xl font-bold text-emerald-400 mt-1'>
                {totalAverage.toFixed(2)} دج
              </p>
            </div>
          </div>

          <div className='flex items-center justify-end gap-4'>
            {savedToast && (
              <span className='flex items-center gap-1.5 text-sm text-emerald-400'>
                <CheckCircle2 className='w-4 h-4' />
                تم حفظ بيانات اليوم بنجاح
              </span>
            )}
            <button
              type='submit'
              className='flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-6 py-3 rounded-xl transition cursor-pointer'
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
