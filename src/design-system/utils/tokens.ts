import { spacing, radius, shadows } from '../tokens';

export function getSpacing(key: keyof typeof spacing): string {
  return spacing[key];
}

export function getRadius(key: keyof typeof radius): string {
  return radius[key];
}

export function getShadow(key: keyof typeof shadows): string {
  return shadows[key];
}

export function cssVar(name: string): string {
  return `var(${name})`;
}

export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}
