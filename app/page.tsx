import { AppFooter } from "@/components/AppFooter";

export default function LandingPage() {
  return (
    <main className="mx-auto grid min-h-screen w-[min(900px,94vw)] py-10">
      <section className="panel w-full place-self-center text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">BBB Minisite Engine</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Internal publishing app for BBB team members</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-700">
          This app powers internal minisite creation and publishing for ethicalct.com. The builder is available to
          authorized users under the admin area.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a className="button-primary" href="/admin">
            Open Admin Builder
          </a>
          <a className="button-secondary" href="/admin/sites">
            Manage Published Sites
          </a>
        </div>
      </section>
      <AppFooter />
    </main>
  );
}
