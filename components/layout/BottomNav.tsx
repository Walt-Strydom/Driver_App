// components/layout/BottomNav.tsx
'use client';

import { BarChart2, Map, User, ClipboardList } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_ITEMS = [
  { label: 'Jobs', icon: ClipboardList, href: '/jobs' },
  { label: 'Map', icon: Map, href: '/map' },
  { label: 'Reports', icon: BarChart2, href: '/analytics' },
  { label: 'Profile', icon: User, href: '/profile' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass bg-surface-raised/80 border-t border-border safe-bottom">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors duration-200"
            >
              <div className={`relative flex items-center justify-center w-12 h-8 rounded-xl transition-all ${isActive ? 'text-primary' : 'text-txt-tertiary'}`}>
                <item.icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                {isActive && (
                  <span className="absolute inset-0 bg-primary/10 rounded-xl animate-scale-in" />
                )}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-tighter ${isActive ? 'text-primary' : 'text-txt-tertiary'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}