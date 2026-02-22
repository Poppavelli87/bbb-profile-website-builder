import { AppFooter } from "@/components/AppFooter";

export default function AppPrivacyPage() {
  return (
    <main className="mx-auto min-h-screen w-[min(920px,94vw)] py-8">
      <section className="panel">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Internal App Privacy</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">BBB Builder App Privacy Policy</h1>
        <p className="mt-3 text-sm text-slate-700">
          This page describes how the internal BBB Profile Website Builder handles project and operational data for
          internal team use.
        </p>

        <div className="mt-6 grid gap-4 text-sm text-slate-700">
          <section>
            <h2 className="text-lg font-semibold text-slate-900">What This App Stores</h2>
            <p>
              The app stores project content submitted by users, uploaded images, generated site files, and basic
              operational logs needed to run and troubleshoot the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Who Can Access Data</h2>
            <p>
              Access is limited to authorized BBB employees and internal administrators who support publishing,
              operations, and maintenance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Tracking and Cookies</h2>
            <p>No third party tracking is enabled by default for this internal app.</p>
            <p className="mt-1">
              Essential session and preference storage may be used to support authentication, security, and core app
              functionality.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Hosting and Infrastructure</h2>
            <p>
              This app is hosted on Vercel infrastructure. Standard platform logs and infrastructure telemetry may be
              processed by the hosting provider to operate the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Internal Support Contact</h2>
            <p>
              For internal privacy, access, or data retention requests, contact:{" "}
              <strong>[Insert internal support contact]</strong>.
            </p>
          </section>
        </div>
      </section>

      <AppFooter />
    </main>
  );
}
