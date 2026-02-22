import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-600">
      <div className="mx-auto flex w-full max-w-[1360px] flex-wrap items-center justify-between gap-2">
        <p>BBB Profile Website Builder internal tool</p>
        <Link className="text-slate-700 underline underline-offset-2" href="/privacy">
          Privacy
        </Link>
      </div>
    </footer>
  );
}
