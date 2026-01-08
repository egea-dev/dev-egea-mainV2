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
    <section className={cn(innerWrapperClasses, "space-y-2 sm:space-y-4 lg:space-y-6", className)}>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl md:text-3xl">
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
