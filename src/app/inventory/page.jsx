'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import {
  getEntriesByStore,
  getDeliveriesByStore,
  saveDelivery,
  deleteDelivery,
  getStockChecksByStore,
  saveStockCheck,
  deleteStockCheck,
} from '@/lib/storage';
import {
  PackagePlus,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ClipboardCheck,
  TrendingDown,
  Boxes,
  ShieldAlert,
} from 'lucide-react';

const TRAY_SIZE = 70; // حبة في كل صينية

const AR_DAY_NAMES = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];
function getDayName(d) {
  return AR_DAY_NAMES[new Date(d + 'T00:00:00').getDay()];
}
function fmtDate(d) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

/** Pieces actually pulled from stock for a single daily entry */
function piecesPulled(entry) {
  return (
    Number(entry.morning.fermentedCount || 0) +
    Number(entry.evening.fermentedCount || 0) -
    Number(entry.morning.leftoverBaked || 0) -
    Number(entry.morning.leftoverRaw || 0)
  );
}

export default function InventoryPage() {
  const [selectedStore, setSelectedStore] = useState('store-1');

  // ── data ──────────────────────────────────────────────────────────────────
  const [entries, setEntries] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [stockChecks, setStockChecks] = useState([]);

  // ── delivery form ─────────────────────────────────────────────────────────
  const [delDate, setDelDate] = useState('');
  const [delTrays, setDelTrays] = useState('');
  const [delReturned, setDelReturned] = useState('');
  const [delToast, setDelToast] = useState(false);

  // ── stock check form ──────────────────────────────────────────────────────
  const [chkDate, setChkDate] = useState('');
  const [chkTrays, setChkTrays] = useState('');
  const [chkPieces, setChkPieces] = useState('');
  const [chkDefective, setChkDefective] = useState('');
  const [chkToast, setChkToast] = useState(false);

  const reload = async () => {
    const [e, d, c] = await Promise.all([
      getEntriesByStore(selectedStore),
      getDeliveriesByStore(selectedStore),
      getStockChecksByStore(selectedStore),
    ]);
    setEntries(e);
    setDeliveries(d);
    setStockChecks(c);
  };

  useEffect(() => {
    setDelDate(new Date().toISOString().split('T')[0]);
    setChkDate(new Date().toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    reload();
  }, [selectedStore]);

  // ── totals ────────────────────────────────────────────────────────────────
  const totalReceived = deliveries.reduce((s, d) => s + d.trays * TRAY_SIZE, 0);
  const totalReturned = deliveries.reduce(
    (s, d) => s + Number(d.returnedPieces || 0),
    0,
  );
  const totalPulled = entries.reduce((s, e) => s + piecesPulled(e), 0);
  const theoreticalRemaining = totalReceived - totalReturned - totalPulled;

  // last physical check
  const lastCheck = stockChecks[0] ?? null;
  const lastCheckPieces = lastCheck
    ? lastCheck.trays * TRAY_SIZE +
      lastCheck.pieces +
      Number(lastCheck.defective || 0)
    : null;

  // deliveries & pulls AFTER last check date
  const receivedSinceCheck = lastCheck
    ? deliveries
        .filter((d) => d.date > lastCheck.date)
        .reduce((s, d) => s + d.trays * TRAY_SIZE, 0)
    : 0;
  const returnedSinceCheck = lastCheck
    ? deliveries
        .filter((d) => d.date > lastCheck.date)
        .reduce((s, d) => s + Number(d.returnedPieces || 0), 0)
    : 0;
  const pulledSinceCheck = lastCheck
    ? entries
        .filter((e) => e.date > lastCheck.date)
        .reduce((s, e) => s + piecesPulled(e), 0)
    : 0;

  // expected remaining based on last check
  const expectedSinceCheck =
    lastCheckPieces !== null
      ? lastCheckPieces +
        (receivedSinceCheck - returnedSinceCheck) -
        pulledSinceCheck
      : null;

  // ── handlers ─────────────────────────────────────────────────────────────
  const handleAddDelivery = async (e) => {
    e.preventDefault();
    if (!delDate || !delTrays) return;
    await saveDelivery({
      id: `del_${selectedStore}_${delDate}_${Date.now()}`,
      storeId: selectedStore,
      date: delDate,
      trays: Number(delTrays),
      returnedPieces: Number(delReturned || 0),
    });
    setDelTrays('');
    setDelReturned('');
    setDelToast(true);
    setTimeout(() => setDelToast(false), 3000);
    await reload();
  };

  const handleDeleteDelivery = async (id) => {
    await deleteDelivery(id);
    await reload();
  };

  const handleAddCheck = async (e) => {
    e.preventDefault();
    if (!chkDate) return;
    await saveStockCheck({
      id: `chk_${selectedStore}_${chkDate}_${Date.now()}`,
      storeId: selectedStore,
      date: chkDate,
      trays: Number(chkTrays || 0),
      pieces: Number(chkPieces || 0),
      defective: Number(chkDefective || 0),
    });
    setChkTrays('');
    setChkPieces('');
    setChkDefective('');
    setChkToast(true);
    setTimeout(() => setChkToast(false), 3000);
    await reload();
  };

  const handleDeleteCheck = async (id) => {
    await deleteStockCheck(id);
    await reload();
  };

  // discrepancy between expected (from last check) and theoretical (from day 0)
  const discrepancy =
    expectedSinceCheck !== null
      ? expectedSinceCheck - theoreticalRemaining
      : null;

  const stockStatus =
    theoreticalRemaining < 0
      ? 'critical'
      : theoreticalRemaining < TRAY_SIZE
        ? 'low'
        : 'ok';

  return (
    <div dir='rtl' className='min-h-screen bg-zinc-950 text-zinc-100'>
      <Navbar selectedStore={selectedStore} onStoreChange={setSelectedStore} />

      <main className='max-w-5xl mx-auto px-4 py-8 space-y-8'>
        {/* ── Header ── */}
        <div>
          <h1 className='text-xl font-bold text-white'>
            مراقبة المخزون والصوانٍ
          </h1>
          <p className='text-sm text-zinc-400 mt-1'>
            تتبع توارد الصوانٍ واكتشف أي فجوة بين ما استُلم وما سُجِّل
          </p>
        </div>

        {/* ── Summary cards ── */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
          <div className='bg-zinc-900 border border-zinc-800 p-4 rounded-xl'>
            <div className='flex items-center justify-between text-zinc-400 text-xs mb-2'>
              <span>إجمالي المستلم</span>
              <Truck className='w-4 h-4 text-sky-400' />
            </div>
            <p className='text-2xl font-bold text-sky-400'>
              {totalReceived.toLocaleString()} حبة
            </p>
            <div className='flex items-center justify-between text-xs text-zinc-500 mt-1'>
              <span>{(totalReceived / TRAY_SIZE).toFixed(1)} صينية</span>
              {totalReturned > 0 && (
                <span className='text-rose-400 font-medium'>
                  (مرتجع للبائع: {totalReturned} حبة)
                </span>
              )}
            </div>
          </div>

          <div className='bg-zinc-900 border border-zinc-800 p-4 rounded-xl'>
            <div className='flex items-center justify-between text-zinc-400 text-xs mb-2'>
              <span>إجمالي المسحوب (مسجَّل)</span>
              <TrendingDown className='w-4 h-4 text-amber-400' />
            </div>
            <p className='text-2xl font-bold text-amber-400'>
              {totalPulled.toLocaleString()} حبة
            </p>
            <p className='text-xs text-zinc-500 mt-1'>
              {(totalPulled / TRAY_SIZE).toFixed(1)} صينية
            </p>
          </div>

          <div
            className={`border p-4 rounded-xl ${
              stockStatus === 'critical'
                ? 'bg-rose-950/30 border-rose-700/50'
                : stockStatus === 'low'
                  ? 'bg-orange-950/30 border-orange-700/50'
                  : 'bg-zinc-900 border-zinc-800'
            }`}
          >
            <div className='flex items-center justify-between text-zinc-400 text-xs mb-2'>
              <span>المتبقي النظري</span>
              <Boxes
                className={`w-4 h-4 ${
                  stockStatus === 'critical'
                    ? 'text-rose-400'
                    : stockStatus === 'low'
                      ? 'text-orange-400'
                      : 'text-emerald-400'
                }`}
              />
            </div>
            <p
              className={`text-2xl font-bold ${
                stockStatus === 'critical'
                  ? 'text-rose-400'
                  : stockStatus === 'low'
                    ? 'text-orange-400'
                    : 'text-emerald-400'
              }`}
            >
              {theoreticalRemaining.toLocaleString()} حبة
            </p>
            <p className='text-xs text-zinc-500 mt-1'>
              ≈ {Math.max(0, theoreticalRemaining / TRAY_SIZE).toFixed(1)} صينية
            </p>
          </div>

          {/* Discrepancy card */}
          {discrepancy !== null ? (
            <div
              className={`border p-4 rounded-xl ${
                Math.abs(discrepancy) < 5
                  ? 'bg-zinc-900 border-zinc-800'
                  : discrepancy > 0
                    ? 'bg-rose-950/40 border-rose-600/60'
                    : 'bg-zinc-900 border-zinc-800'
              }`}
            >
              <div className='flex items-center justify-between text-zinc-400 text-xs mb-2'>
                <span>فجوة منذ آخر جرد</span>
                <ShieldAlert
                  className={`w-4 h-4 ${
                    Math.abs(discrepancy) < 5
                      ? 'text-zinc-400'
                      : discrepancy > 0
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                  }`}
                />
              </div>
              <p
                className={`text-2xl font-bold ${
                  Math.abs(discrepancy) < 5
                    ? 'text-zinc-300'
                    : discrepancy > 0
                      ? 'text-rose-400'
                      : 'text-emerald-400'
                }`}
              >
                {discrepancy > 0 ? '+' : ''}
                {discrepancy} حبة
              </p>
              <p className='text-xs text-zinc-500 mt-1'>
                {Math.abs(discrepancy) < 5
                  ? 'لا توجد فجوة تُذكر ✓'
                  : discrepancy > 0
                    ? '⚠ يبدو أن هناك مبيعات غير مسجَّلة'
                    : 'المخزون أكثر من المتوقع'}
              </p>
            </div>
          ) : (
            <div className='bg-zinc-900 border border-zinc-800 p-4 rounded-xl'>
              <div className='flex items-center justify-between text-zinc-400 text-xs mb-2'>
                <span>فجوة منذ آخر جرد</span>
                <ShieldAlert className='w-4 h-4 text-zinc-600' />
              </div>
              <p className='text-sm text-zinc-500 mt-2'>
                أضف جرداً فعلياً أدناه لرؤية الفجوة
              </p>
            </div>
          )}
        </div>

        {/* ── Big alert if negative stock ── */}
        {theoreticalRemaining < 0 && (
          <div className='flex items-start gap-3 bg-rose-950/40 border border-rose-700/60 rounded-xl p-4'>
            <AlertTriangle className='w-5 h-5 text-rose-400 shrink-0 mt-0.5' />
            <div>
              <p className='font-bold text-rose-300'>
                تنبيه: المخزون المسجَّل يتجاوز ما استُلم!
              </p>
              <p className='text-sm text-rose-400/80 mt-1'>
                تم تسجيل سحب {Math.abs(theoreticalRemaining)} حبة أكثر مما
                استُلم — راجع سجلات الاستلام أو التخمير.
              </p>
            </div>
          </div>
        )}

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {/* ── Add Delivery ── */}
          <section className='bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4'>
            <div className='flex items-center gap-2'>
              <Truck className='w-5 h-5 text-sky-400' />
              <h2 className='font-bold text-white'>تسجيل استلام صوانٍ</h2>
            </div>

            <form onSubmit={handleAddDelivery} className='space-y-3'>
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                <div>
                  <label className='text-xs text-zinc-400 mb-1 block'>
                    تاريخ الاستلام
                  </label>
                  <input
                    type='date'
                    value={delDate}
                    onChange={(e) => setDelDate(e.target.value)}
                    required
                    className='w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500'
                  />
                </div>
                <div>
                  <label className='text-xs text-zinc-400 mb-1 block'>
                    عدد الصوانٍ المستلمة
                  </label>
                  <input
                    type='number'
                    min='1'
                    value={delTrays}
                    onChange={(e) => setDelTrays(e.target.value)}
                    placeholder='28'
                    required
                    className='w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500'
                  />
                </div>
                <div>
                  <label className='text-xs text-zinc-400 mb-1 block'>
                    مرتجع للبائع
                  </label>
                  <input
                    type='number'
                    min='0'
                    value={delReturned}
                    onChange={(e) => setDelReturned(e.target.value)}
                    placeholder='0 (اختياري)'
                    className='w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500'
                  />
                </div>
              </div>
              {delTrays && (
                <p className='text-xs text-zinc-500'>
                  = {Number(delTrays) * TRAY_SIZE} حبة مستلمة
                  {Number(delReturned) > 0 &&
                    ` − ${delReturned} حبة معطوبة مرجعة للبائع = ${Number(delTrays) * TRAY_SIZE - Number(delReturned)} حبة صافي`}
                </p>
              )}
              <div className='flex items-center gap-3'>
                <button
                  type='submit'
                  className='flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-lg text-sm transition'
                >
                  <PackagePlus className='w-4 h-4' />
                  إضافة الشحنة
                </button>
                {delToast && (
                  <span className='flex items-center gap-1 text-sm text-emerald-400'>
                    <CheckCircle2 className='w-4 h-4' /> تم الحفظ
                  </span>
                )}
              </div>
            </form>

            {/* Delivery history */}
            <div className='space-y-2 max-h-64 overflow-y-auto'>
              {deliveries.length === 0 ? (
                <p className='text-sm text-zinc-600 py-4 text-center'>
                  لا توجد عمليات استلام مسجَّلة
                </p>
              ) : (
                deliveries.map((d) => (
                  <div
                    key={d.id}
                    className='flex items-center justify-between bg-zinc-800/50 rounded-lg px-3 py-2 text-sm'
                  >
                    <div>
                      <span className='font-semibold text-zinc-200'>
                        {getDayName(d.date)}
                      </span>
                      <span className='text-zinc-500 mr-2 text-xs'>
                        {fmtDate(d.date)}
                      </span>
                    </div>
                    <div className='flex items-center gap-3'>
                      <span className='text-sky-400 font-bold'>
                        {d.trays} صينية
                      </span>
                      <span className='text-zinc-500 text-xs'>
                        = {d.trays * TRAY_SIZE} حبة
                      </span>
                      {Number(d.returnedPieces || 0) > 0 && (
                        <span className='text-rose-400 text-xs font-semibold bg-rose-500/10 px-1.5 py-0.5 rounded'>
                          ↩ {d.returnedPieces} مرتجع
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteDelivery(d.id)}
                        className='text-zinc-600 hover:text-rose-400 transition'
                      >
                        <Trash2 className='w-3.5 h-3.5' />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* ── Physical Stock Check ── */}
          <section className='bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4'>
            <div className='flex items-center gap-2'>
              <ClipboardCheck className='w-5 h-5 text-violet-400' />
              <h2 className='font-bold text-white'>جرد فعلي للمخزون</h2>
            </div>
            <p className='text-xs text-zinc-500'>
              عُدَّ الصوانٍ المتبقية الآن وسجِّلها — سيقارنها النظام بما يجب أن
              يكون موجوداً حسب السجلات.
            </p>

            <form onSubmit={handleAddCheck} className='space-y-3'>
              <div>
                <label className='text-xs text-zinc-400 mb-1 block'>
                  تاريخ الجرد
                </label>
                <input
                  type='date'
                  value={chkDate}
                  onChange={(e) => setChkDate(e.target.value)}
                  required
                  className='w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500'
                />
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                <div>
                  <label className='text-xs text-zinc-400 mb-1 block'>
                    صوانٍ كاملة
                  </label>
                  <input
                    type='number'
                    min='0'
                    value={chkTrays}
                    onChange={(e) => setChkTrays(e.target.value)}
                    placeholder='0'
                    className='w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500'
                  />
                </div>
                <div>
                  <label className='text-xs text-zinc-400 mb-1 block'>
                    حبات مفرَّقة (صالحة)
                  </label>
                  <input
                    type='number'
                    min='0'
                    max='69'
                    value={chkPieces}
                    onChange={(e) => setChkPieces(e.target.value)}
                    placeholder='0'
                    className='w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500'
                  />
                </div>
                <div>
                  <label className='text-xs text-zinc-400 mb-1 block'>
                    حبات معطوبة (تنتظر المرتجع)
                  </label>
                  <input
                    type='number'
                    min='0'
                    value={chkDefective}
                    onChange={(e) => setChkDefective(e.target.value)}
                    placeholder='0 (اختياري)'
                    className='w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500'
                  />
                </div>
              </div>
              {(chkTrays || chkPieces || chkDefective) && (
                <p className='text-xs text-zinc-500'>
                  = {Number(chkTrays || 0) * TRAY_SIZE + Number(chkPieces || 0)}{' '}
                  حبة صالحة
                  {Number(chkDefective || 0) > 0 &&
                    ` + ${chkDefective} حبة معطوبة تنتظر الإرجاع`}
                  {` (إجمالي الموجود: ${Number(chkTrays || 0) * TRAY_SIZE + Number(chkPieces || 0) + Number(chkDefective || 0)} حبة)`}
                </p>
              )}
              <div className='flex items-center gap-3'>
                <button
                  type='submit'
                  className='flex items-center gap-2 bg-violet-700 hover:bg-violet-600 text-white font-bold px-4 py-2 rounded-lg text-sm transition'
                >
                  <ClipboardCheck className='w-4 h-4' />
                  تسجيل الجرد
                </button>
                {chkToast && (
                  <span className='flex items-center gap-1 text-sm text-emerald-400'>
                    <CheckCircle2 className='w-4 h-4' /> تم الحفظ
                  </span>
                )}
              </div>
            </form>

            {/* Check history */}
            <div className='space-y-2 max-h-64 overflow-y-auto'>
              {stockChecks.length === 0 ? (
                <p className='text-sm text-zinc-600 py-4 text-center'>
                  لا توجد جرود مسجَّلة
                </p>
              ) : (
                stockChecks.map((c, idx) => {
                  const goodPieces = c.trays * TRAY_SIZE + c.pieces;
                  const defPieces = Number(c.defective || 0);
                  const physicalPieces = goodPieces + defPieces;
                  // theoretical on that check date
                  const receivedUpTo = deliveries
                    .filter((d) => d.date <= c.date)
                    .reduce((s, d) => s + d.trays * TRAY_SIZE, 0);
                  const returnedUpTo = deliveries
                    .filter((d) => d.date <= c.date)
                    .reduce((s, d) => s + Number(d.returnedPieces || 0), 0);
                  const pulledUpTo = entries
                    .filter((e) => e.date <= c.date)
                    .reduce((s, e) => s + piecesPulled(e), 0);
                  const theoreticalOnDate =
                    receivedUpTo - returnedUpTo - pulledUpTo;
                  const diff = physicalPieces - theoreticalOnDate;

                  return (
                    <div
                      key={c.id}
                      className={`rounded-lg px-3 py-2.5 text-sm border ${
                        Math.abs(diff) < 5
                          ? 'bg-zinc-800/50 border-zinc-700/30'
                          : diff < 0
                            ? 'bg-rose-950/30 border-rose-700/40'
                            : 'bg-zinc-800/50 border-zinc-700/30'
                      }`}
                    >
                      <div className='flex items-center justify-between'>
                        <div>
                          <span className='font-semibold text-zinc-200'>
                            {getDayName(c.date)}
                          </span>
                          <span className='text-zinc-500 mr-2 text-xs'>
                            {fmtDate(c.date)}
                          </span>
                          {idx === 0 && (
                            <span className='text-xs bg-violet-800/50 text-violet-300 rounded px-1.5 py-0.5 mr-1'>
                              آخر جرد
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteCheck(c.id)}
                          className='text-zinc-600 hover:text-rose-400 transition'
                        >
                          <Trash2 className='w-3.5 h-3.5' />
                        </button>
                      </div>
                      <div className='mt-1.5 flex flex-wrap items-center gap-3 text-xs'>
                        <span className='text-violet-400 font-semibold'>
                          فعلي: {physicalPieces} حبة
                          {defPieces > 0 && (
                            <span className='text-zinc-400 font-normal mr-1'>
                              ({goodPieces} صالحة +{' '}
                              <span className='text-rose-400 font-medium'>
                                {defPieces} معطوبة
                              </span>
                              )
                            </span>
                          )}
                        </span>
                        <span className='text-zinc-500'>
                          متوقع: {theoreticalOnDate} حبة
                        </span>
                        <span
                          className={`font-bold ${
                            Math.abs(diff) < 5
                              ? 'text-zinc-400'
                              : diff < 0
                                ? 'text-rose-400'
                                : 'text-emerald-400'
                          }`}
                        >
                          {diff > 0 ? '+' : ''}
                          {diff} حبة
                          {Math.abs(diff) >= 5 && diff < 0 && ' ⚠'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* ── Daily pull breakdown ── */}
        <section className='bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden'>
          <div className='px-5 py-3 border-b border-zinc-800 flex items-center gap-2'>
            <TrendingDown className='w-4 h-4 text-amber-400' />
            <h2 className='font-semibold text-white text-sm'>
              تفصيل السحب اليومي من المخزون
            </h2>
          </div>
          {entries.length === 0 ? (
            <p className='text-center text-zinc-600 py-10 text-sm'>
              لا توجد سجلات يومية بعد
            </p>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-sm text-right'>
                <thead className='bg-zinc-900 text-zinc-500 text-xs'>
                  <tr>
                    <th className='py-2.5 px-4'>اليوم</th>
                    <th className='py-2.5 px-4'>تخمير الصباح</th>
                    <th className='py-2.5 px-4'>تخمير المساء</th>
                    <th className='py-2.5 px-4 text-zinc-400'>− باقي مطهو ص</th>
                    <th className='py-2.5 px-4 text-zinc-400'>− باقي نيء ص</th>
                    <th className='py-2.5 px-4 text-amber-400'>
                      المسحوب الفعلي
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-zinc-800/60'>
                  {[...entries]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((entry) => {
                      const pulled = piecesPulled(entry);
                      return (
                        <tr
                          key={entry.id}
                          className='hover:bg-zinc-900/40 transition'
                        >
                          <td className='py-2.5 px-4'>
                            <span className='font-semibold text-zinc-200'>
                              {getDayName(entry.date)}
                            </span>
                            <span className='text-zinc-500 text-xs mr-2'>
                              {fmtDate(entry.date)}
                            </span>
                          </td>
                          <td className='py-2.5 px-4 text-zinc-300'>
                            {entry.morning.fermentedCount || 0}
                          </td>
                          <td className='py-2.5 px-4 text-zinc-300'>
                            {entry.evening.fermentedCount || 0}
                          </td>
                          <td className='py-2.5 px-4 text-zinc-500'>
                            −{entry.morning.leftoverBaked || 0}
                          </td>
                          <td className='py-2.5 px-4 text-zinc-500'>
                            −{entry.morning.leftoverRaw || 0}
                          </td>
                          <td className='py-2.5 px-4 font-bold text-amber-400'>
                            {pulled}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
