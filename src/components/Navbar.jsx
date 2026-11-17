'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Store, PenSquare, BarChart3, Boxes } from 'lucide-react';

export default function Navbar({ selectedStore, onStoreChange }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (path) => mounted && pathname === path;

  return (
    <header className='border-b border-zinc-800 bg-zinc-950 text-zinc-100 sticky top-0 z-10'>
      <div className='max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4'>
        <div className='flex items-center gap-6'>
          <span className='font-bold text-lg tracking-tight text-amber-400'>
            كراس المحاسبة اليومي
          </span>

          <nav suppressHydrationWarning className='flex items-center gap-2'>
            <Link
              href='/'
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                isActive('/')
                  ? 'bg-amber-500 text-zinc-950'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <PenSquare className='w-4 h-4' />
              إدخال الملخص اليومي
            </Link>

            <Link
              href='/progress'
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                isActive('/progress')
                  ? 'bg-amber-500 text-zinc-950'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <BarChart3 className='w-4 h-4' />
              متابعة التقدم اليومي
            </Link>

            <Link
              href='/inventory'
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                isActive('/inventory')
                  ? 'bg-amber-500 text-zinc-950'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Boxes className='w-4 h-4' />
              مراقبة المخزون
            </Link>
          </nav>
        </div>

        {/* Store Selector (المحل 1 و المحل 2) */}
        <div className='flex items-center gap-2 bg-zinc-900 p-1 rounded-lg border border-zinc-800'>
          <Store className='w-4 h-4 text-zinc-400 mr-2' />
          <button
            type='button'
            onClick={() => onStoreChange('store-1')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
              selectedStore === 'store-1'
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Ain Djasser
          </button>
          <button
            type='button'
            onClick={() => onStoreChange('store-2')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
              selectedStore === 'store-2'
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Merouana
          </button>
        </div>
      </div>
    </header>
  );
}
