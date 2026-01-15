export const breakpoints = {
  xs: 0,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
};

export const touchTargetPx = 44; // minimum tap size

export const fluidClamp = (minPx: number, vw: number, maxPx: number) =>
  `clamp(${minPx}px, ${vw}vw, ${maxPx}px)`;
