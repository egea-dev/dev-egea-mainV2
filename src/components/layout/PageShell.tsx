import React from "react";
import { cn, innerWrapperClasses, chromePanel } from "@/lib/utils";

type PageShellProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export const PageShell = ({ title, description, actions, children, className }: PageShellProps) => {
  return (
    <section className={cn(innerWrapperClasses, "space-y-0", className)}>
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-1">
        <div className="space-y-0">
          <h1 className="text-lg font-semibold text-foreground sm:text-xl md:text-2xl">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>
      <div className={cn(chromePanel, "text-foreground")}>{children}</div>
    </section>
  );
};

export default PageShell;
