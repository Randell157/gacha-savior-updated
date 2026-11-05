import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/** A search box with its icon; `label` is both the placeholder and the accessible name. */
export default function SearchInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className="relative w-full sm:w-56">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        aria-label={label}
        className="pl-9"
      />
    </div>
  );
}
