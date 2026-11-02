/**
 * Label/value rows separated by lines, as on the About, Contact and Profile
 * pages. Use inside a PageShell with panel="flush".
 */
export function DetailRows({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-200 dark:border-slate-700 px-4 py-5 sm:p-0">
      <dl className="sm:divide-y sm:divide-gray-200 dark:sm:divide-slate-700">{children}</dl>
    </div>
  );
}

export function DetailRow({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
      <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 dark:text-slate-100 sm:mt-0 sm:col-span-2">
        {children}
      </dd>
    </div>
  );
}
