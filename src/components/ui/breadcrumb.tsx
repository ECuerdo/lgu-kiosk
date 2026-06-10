import * as React from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export function Breadcrumb({ className, ...props }: React.ComponentProps<"nav">) {
  return <nav aria-label="breadcrumb" className={className} {...props} />
}

export function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return <ol className={cn("flex flex-wrap items-center gap-1.5 text-sm text-slate-500", className)} {...props} />
}

export function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li className={cn("inline-flex items-center gap-1.5", className)} {...props} />
}

type BreadcrumbLinkProps = React.ComponentProps<"a"> & {
  asChild?: boolean;
  children?: React.ReactNode;
};

export function BreadcrumbLink({ className, asChild = false, children, ...props }: BreadcrumbLinkProps) {
  const classes = cn("transition-colors hover:text-slate-850 dark:hover:text-white cursor-pointer", className);
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ className?: string }>;
    return React.cloneElement(child, {
      className: cn(classes, child.props.className),
    });
  }
  return <a className={classes} {...props}>{children}</a>
}

export function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("font-normal text-slate-900 dark:text-white", className)} {...props} />
}

export function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<"li">) {
  return (
    <li role="presentation" aria-hidden="true" className={cn("[&>svg]:size-3.5", className)} {...props}>
      {children ?? <ChevronRight />}
    </li>
  )
}
