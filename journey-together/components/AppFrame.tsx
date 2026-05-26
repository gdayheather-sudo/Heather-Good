"use client";

import { ReactNode } from "react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { ToastStack } from "./ToastStack";

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#EEF2F4] dark:bg-[#04121A] flex flex-col items-center">
      {/* Desktop view shows a centred mobile frame; on small screens it
          collapses to full-width. */}
      <div className="w-full max-w-[500px] min-h-screen sm:min-h-[860px] flex flex-col bg-[#F5F7F8] dark:bg-ink shadow-card sm:my-6 sm:rounded-3xl overflow-hidden">
        <a href="#main" className="skip-link">Skip to main content</a>
        <Header />
        <main id="main" className="flex-1 overflow-y-auto px-4 py-4">
          {children}
        </main>
        <BottomNav />
      </div>
      <ToastStack />
    </div>
  );
}

export function AdminFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#EEF2F4] dark:bg-[#04121A]">
      <a href="#main" className="skip-link">Skip to main content</a>
      <Header adminWide />
      <main id="main" className="mx-auto max-w-7xl px-6 py-8">
        {children}
      </main>
      <ToastStack />
    </div>
  );
}
