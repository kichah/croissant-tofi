'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Store, PenSquare, BarChart3, Boxes } from 'lucide-react';

export default function Navbar({ selectedStore, onStoreChange }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const isActive = (path) => mounted && pathname === path;

  return (
    <>
      {/* ─── Top Header (Desktop + Mobile Brand/Store Bar) ─── */}
      <header className='border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md text-zinc-100 sticky top-0 z-30'>
        <div className='max-w-5xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3'>
          {/* Logo & Desktop Nav */}
          <div className='flex items-center gap-6'>
            <span className='font-bold text-base sm:text-lg tracking-tight text-amber-400 flex items-center gap-2'>
              🥐 <span className='hidden xs:inline'>كراس المحاسبة اليومي</span>
              <span className='xs:hidden'>المحاسبة</span>
            </span>

            {/* Desktop Navigation Links */}
            <nav
              suppressHydrationWarning
              className='hidden sm:flex items-center gap-1.5 md:gap-2'
            >
              <Link
                href='/'
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  isActive('/')
                    ? 'bg-amber-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <PenSquare className='w-4 h-4' />
                إدخال اليومية
              </Link>

              <Link
                href='/progress'
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  isActive('/progress')
                    ? 'bg-amber-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <BarChart3 className='w-4 h-4' />
                متابعة التقدم
              </Link>

              <Link
                href='/inventory'
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  isActive('/inventory')
                    ? 'bg-amber-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Boxes className='w-4 h-4' />
                مراقبة المخزون
              </Link>
            </nav>
          </div>

          {/* Store Selector (المحل 1 و المحل 2) */}
          <div className='flex items-center gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800 shrink-0'>
            <Store className='w-3.5 h-3.5 text-zinc-400 mx-1 hidden sm:block' />
            <button
              type='button'
              onClick={() => onStoreChange('store-1')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition active:scale-95 ${
                selectedStore === 'store-1'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Ain Djasser
            </button>
            <button
              type='button'
              onClick={() => onStoreChange('store-2')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition active:scale-95 ${
                selectedStore === 'store-2'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Merouana
            </button>
          </div>
        </div>
      </header>

      {/* ─── Mobile Bottom Navigation Bar (Native App Style) ─── */}
      <nav
        suppressHydrationWarning
        className='sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-800 px-3 py-2 flex items-center justify-around shadow-2xl'
      >
        <Link
          href='/'
          className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition ${
            isActive('/')
              ? 'text-amber-400 font-bold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <div
            className={`p-1.5 rounded-lg transition ${
              isActive('/') ? 'bg-amber-500/15' : ''
            }`}
          >
            <PenSquare className='w-5 h-5' />
          </div>
          <span className='text-[11px] leading-none'>إدخال اليومية</span>
        </Link>

        <Link
          href='/progress'
          className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition ${
            isActive('/progress')
              ? 'text-amber-400 font-bold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <div
            className={`p-1.5 rounded-lg transition ${
              isActive('/progress') ? 'bg-amber-500/15' : ''
            }`}
          >
            <BarChart3 className='w-5 h-5' />
          </div>
          <span className='text-[11px] leading-none'>متابعة التقدم</span>
        </Link>

        <Link
          href='/inventory'
          className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition ${
            isActive('/inventory')
              ? 'text-amber-400 font-bold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <div
            className={`p-1.5 rounded-lg transition ${
              isActive('/inventory') ? 'bg-amber-500/15' : ''
            }`}
          >
            <Boxes className='w-5 h-5' />
          </div>
          <span className='text-[11px] leading-none'>المخزون</span>
        </Link>
      </nav>
    </>
  );
}
