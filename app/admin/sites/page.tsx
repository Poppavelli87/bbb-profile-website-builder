"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  archiveAdminSite,
  listAdminSites,
  unpublishAdminSite
} from "@/lib/api";
import type { SiteIndexItem, SiteStatus, SiteTier } from "@/lib/shared";

type Toast = {
  tone: "success" | "error" | "info";
  message: string;
};

export default function AdminSitesPage() {
  const [sites, setSites] = useState<SiteIndexItem[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SiteStatus | "all">("all");
  const [tier, setTier] = useState<SiteTier | "all">("all");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);

  async function refreshList() {
    setLoading(true);
    try {
      const response = await listAdminSites({
        search: search || undefined,
        status: status === "all" ? undefined : status,
        tier: tier === "all" ? undefined : tier
      });
      setSites(response.sites);
    } catch (error) {
      setToast({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to load sites."
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    await refreshList();
  }

  async function quickUnpublish(siteId: string) {
    try {
      await unpublishAdminSite(siteId);
      setToast({ tone: "success", message: "Site set to draft." });
      await refreshList();
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Unpublish failed." });
    }
  }

  async function quickArchive(siteId: string) {
    try {
      await archiveAdminSite(siteId);
      setToast({ tone: "success", message: "Site archived." });
      await refreshList();
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Archive failed." });
    }
  }

  return (
    <main className="mx-auto grid min-h-screen w-[min(1200px,96vw)] gap-4 py-6">
      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Admin Sites</p>
            <h1 className="text-2xl font-bold text-slate-900">Published minisites</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="button-secondary" href="/admin">
              Open Builder
            </Link>
            <button className="button-secondary" type="button" onClick={() => void refreshList()}>
              Refresh
            </button>
          </div>
        </div>

        <form className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]" onSubmit={onSearch}>
          <input
            className="input"
            placeholder="Search by business name or slug"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select className="input" value={status} onChange={(event) => setStatus(event.target.value as SiteStatus | "all")}>
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <select className="input" value={tier} onChange={(event) => setTier(event.target.value as SiteTier | "all")}>
            <option value="all">All tiers</option>
            <option value="free">Free</option>
            <option value="premium">Premium</option>
            <option value="pro">Pro</option>
          </select>
          <button className="button-primary" type="submit">
            Search
          </button>
        </form>
      </section>

      {toast ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            toast.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : toast.tone === "error"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      <section className="panel overflow-x-auto">
        {loading ? <p className="text-sm text-slate-600">Loading sites...</p> : null}
        {!loading && sites.length === 0 ? <p className="text-sm text-slate-600">No sites found.</p> : null}
        {sites.length > 0 ? (
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-700">
                <th className="px-2 py-2">Business</th>
                <th className="px-2 py-2">Slug</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Tier</th>
                <th className="px-2 py-2">Updated</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr key={site.id} className="border-b border-slate-100">
                  <td className="px-2 py-2 font-medium text-slate-900">{site.businessName}</td>
                  <td className="px-2 py-2 text-slate-700">{site.slug}</td>
                  <td className="px-2 py-2 text-slate-700">{site.status}</td>
                  <td className="px-2 py-2 text-slate-700">{site.tier}</td>
                  <td className="px-2 py-2 text-slate-700">{new Date(site.updatedAt).toLocaleString()}</td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Link className="button-secondary" href={`/site/${site.slug}`} target="_blank">
                        Open
                      </Link>
                      <Link className="button-secondary" href={`/admin?siteId=${site.id}`}>
                        Edit
                      </Link>
                      <button className="button-secondary" type="button" onClick={() => void quickUnpublish(site.id)}>
                        Unpublish
                      </button>
                      <button className="button-secondary" type="button" onClick={() => void quickArchive(site.id)}>
                        Archive
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>
    </main>
  );
}
