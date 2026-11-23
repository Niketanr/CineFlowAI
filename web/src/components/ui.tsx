// Minimal shadcn-style primitives (swap for `npx shadcn@latest add ...` if you prefer the CLI versions)
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
export const cn = (...a: any[]) => a.filter(Boolean).join(' ');
const field = 'w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-violet-400/70 placeholder:text-white/30';
export function Button({ variant = 'primary', loading, className, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'outline' | 'danger'; loading?: boolean }) {
  const v = { primary: 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90', ghost: 'hover:bg-white/10', outline: 'border border-white/15 hover:bg-white/10', danger: 'text-red-300 hover:bg-red-500/10' }[variant];
  return <button {...p} disabled={p.disabled || loading} className={cn('inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-40', v, className)}>{loading && <Loader2 className="h-4 w-4 animate-spin" />}{children}</button>;
}
export const Card = ({ className, children }: { className?: string; children: ReactNode }) => <div className={cn('glass rounded-2xl p-5', className)}>{children}</div>;
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cn(field, p.className)} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cn(field, p.className)} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cn(field, p.className)} />;
export const Label = ({ children }: { children: ReactNode }) => <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/50">{children}</label>;
