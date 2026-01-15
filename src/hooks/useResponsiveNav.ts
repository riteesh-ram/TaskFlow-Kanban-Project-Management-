import { useEffect, useState } from 'react';

// Decide navigation mode based on viewport.
// lg+: sidebar, md: drawer, xs: tabs.
const BREAKPOINT_TAB = 640; // tailwind sm
const BREAKPOINT_SIDEBAR = 1024; // tailwind lg

type NavMode = 'sidebar' | 'drawer' | 'tabs';

export function useResponsiveNav(): NavMode {
  const [mode, setMode] = useState<NavMode>('drawer');

  useEffect(() => {
    const compute = () => {
      const width = window.innerWidth;
      if (width >= BREAKPOINT_SIDEBAR) return 'sidebar';
      if (width >= BREAKPOINT_TAB) return 'drawer';
      return 'tabs';
    };
    setMode(compute());
    const onResize = () => setMode(compute());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return mode;
}
