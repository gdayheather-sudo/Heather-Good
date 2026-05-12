'use client';

import { Toaster as SonnerToaster } from 'sonner';

// Thin wrapper around sonner so the rest of the app imports from one place
// and the styling stays consistent with the brand.
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast:
            'group toast bg-charcoal text-paper border-charcoal/20 rounded-lg font-sans text-sm',
          description: 'text-paper/70',
          actionButton: 'bg-paper text-charcoal',
          cancelButton: 'bg-charcoal/20 text-paper',
        },
      }}
    />
  );
}

export { toast } from 'sonner';
