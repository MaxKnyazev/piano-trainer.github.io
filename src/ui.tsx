import * as Dialog from '@radix-ui/react-dialog';
import * as Progress from '@radix-ui/react-progress';
import { X } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
export function Button({ children, variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  return <button className={`button ${variant} ${className}`} {...props}>{children}</button>;
}
export function ProgressBar({ value }: { value: number }) { return <Progress.Root className="progress" value={value} aria-label="Прогресс обучения"><Progress.Indicator style={{ transform: `translateX(-${100 - value}%)` }} /></Progress.Root>; }
export function Modal({ open, onOpenChange, title, description, children, wide = false }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode; wide?: boolean }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="overlay" /><Dialog.Content className={`modal ${wide ? 'wide' : ''}`}><div className="modal-heading"><Dialog.Title>{title}</Dialog.Title><Dialog.Close asChild><button className="icon-button" aria-label="Закрыть"><X size={20} /></button></Dialog.Close></div><Dialog.Description className={description ? 'muted' : 'sr-only'}>{description ?? title}</Dialog.Description>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}
