"use client";

import dynamic from "next/dynamic";
import { LoaderCircle } from "lucide-react";

const Dashboard = dynamic(() => import("./dashboard"), {
  ssr: false,
  loading: () => <BootScreen />,
});

function BootScreen() {
  return (
    <div className="flex h-[100dvh] w-screen items-center justify-center bg-slate-100">
      <div className="flex flex-col items-center gap-4">
        <LoaderCircle className="h-7 w-7 animate-spin text-blue-700" />
        <div className="font-mono text-[11px] font-medium tracking-[0.24em] text-slate-500">
          INITIALIZING NAV SYSTEMS
        </div>
      </div>
    </div>
  );
}

export default function Bridge() {
  return <Dashboard />;
}
