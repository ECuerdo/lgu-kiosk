"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const SelectContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  disabled?: boolean;
}>({});

export function Select({ value, onValueChange, children, disabled = false }: { value?: string; onValueChange?: (value: string) => void; children: React.ReactNode; disabled?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, disabled }}>
      <div ref={containerRef} className="relative w-full">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

export function SelectTrigger({ className, children, ...props }: React.ComponentProps<"button">) {
  const { open, setOpen, disabled } = React.useContext(SelectContext);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setOpen?.(!open)}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  )
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = React.useContext(SelectContext);
  return <span>{value || placeholder}</span>;
}

export function SelectContent({ className, children, ...props }: React.ComponentProps<"div">) {
  const { open } = React.useContext(SelectContext);
  if (!open) return null;
  return (
    <div
      className={cn(
        "absolute z-[160] mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-1 shadow-md focus:outline-none",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function SelectItem({ className, value, children, ...props }: React.ComponentProps<"div"> & { value: string }) {
  const { value: selectedValue, onValueChange, setOpen } = React.useContext(SelectContext);
  const isSelected = selectedValue === value;
  
  return (
    <div
      onClick={() => {
        onValueChange?.(value);
        setOpen?.(false);
      }}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-lg py-1.5 px-3 text-sm outline-none hover:bg-slate-100 dark:hover:bg-white/5",
        isSelected && "bg-slate-50 dark:bg-white/5 font-semibold",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function SelectGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
