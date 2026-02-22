"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  createSlug,
  runComplianceChecks,
  type BusinessProfile,
  type ComplianceIssue,
  type ExtractionMode
} from "@bbb/shared";
import {
  createProject,
  extractFromHtml,
  extractFromUrl,
  getApiBase,
  getJobStatus,
  getProject,
  publishProject,
  startGeneration,
  updateProjectProfile,
  uploadProjectImage
} from "../lib/api";
import {
  arrayToCommaList,
  arrayToTextLines,
  commaListToArray,
  createEmptyProfile,
  hoursToText,
  textLinesToArray,
  textToHours
} from "../lib/profile";

type Toast = { tone: "success" | "error" | "info"; message: string };

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

function riskLabel(issue: ComplianceIssue): string {
  return issue.severity === "high" ? "High risk" : issue.severity === "medium" ? "Medium risk" : "Low risk";
}

function absoluteAssetUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `${getApiBase()}${url}`;
}

const modeOptions: Array<{ id: ExtractionMode; title: string; body: string }> = [
  { id: "auto", title: "Auto-inspect", body: "Attempts robots-compliant extraction from a public BBB profile URL." },
  { id: "upload_html", title: "Upload HTML capture", body: "Upload a saved HTML file if direct extraction is blocked." },
  { id: "manual", title: "Manual entry", body: "Type details and upload photos manually." }
];

export default function HomePage() {
  const [mode, setMode] = useState<ExtractionMode>("auto");
  const [url, setUrl] = useState("");
  const [htmlFile, setHtmlFile] = useState<File | null>(null);
  const [manualName, setManualName] = useState("");

  const [projectId, setProjectId] = useState<string | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [fallbackSuggestions, setFallbackSuggestions] = useState<string[]>([]);
  const [substantiationNotes, setSubstantiationNotes] = useState<Record<string, string>>({});

  const [jobState, setJobState] = useState<"idle" | "queued" | "running" | "done" | "failed">("idle");
  const [previewUrl, setPreviewUrl] = useState("");
  const [publishFeedback, setPublishFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const compliance = useMemo(() => (profile ? runComplianceChecks(profile) : null), [profile]);
  const highRiskIssues = useMemo(() => (compliance?.issues || []).filter((issue) => issue.severity === "high"), [compliance]);
  const missingSubstantiation = useMemo(
    () => highRiskIssues.filter((issue) => !(substantiationNotes[issue.id] || "").trim()),
    [highRiskIssues, substantiationNotes]
  );

  const seoPreview = useMemo(() => {
    if (!profile) return null;
    const title = `${profile.name} | ${profile.categories[0] || "Local Services"}`;
    const description = profile.description || profile.about || "Local business website generated from provided details.";
    return {
      title,
      description,
      ogImage: profile.images[0]?.url || "(none)",
      schema: {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: profile.name,
        description,
        areaServed: profile.serviceAreas,
        telephone: profile.contact.phone,
        email: profile.contact.email,
        address: profile.contact.address,
        serviceType: profile.services
      }
    };
  }, [profile]);

  async function handleStartFromMode(event: FormEvent) {
    event.preventDefault();
    setToast(null);
    setFallbackSuggestions([]);
    setPublishFeedback("");
    setPreviewUrl("");

    try {
      setBusy(true);
      if (mode === "auto") {
        const extracted = await extractFromUrl(url.trim());
        if (!extracted.ok || !extracted.data) {
          setFallbackSuggestions(extracted.fallbackSuggestions || []);
          throw new Error(extracted.error || "Auto-inspection failed.");
        }
        setProfile(extracted.data);
        setProjectId(null);
        setToast({ tone: "success", message: "Profile extracted. Review and edit before generation." });
        return;
      }

      if (mode === "upload_html") {
        if (!htmlFile) {
          throw new Error("Select an HTML file to continue.");
        }
        const html = await htmlFile.text();
        const extracted = await extractFromHtml(html, url.trim() || "https://www.bbb.org/profile/");
        setProfile({ ...extracted.data, mode: "upload_html" });
        setProjectId(null);
        setToast({ tone: "success", message: "HTML capture parsed. Review data before generation." });
        return;
      }

      setProfile(createEmptyProfile(manualName || "Manual Business Profile"));
      setProjectId(null);
      setToast({ tone: "success", message: "Manual workspace ready." });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Unable to start selected mode." });
    } finally {
      setBusy(false);
    }
  }

  async function ensureProjectSynced(currentProfile: BusinessProfile): Promise<string> {
    if (!projectId) {
      const created = await createProject(currentProfile);
      setProjectId(created.project.id);
      setProfile(created.project.profile);
      return created.project.id;
    }

    const updated = await updateProjectProfile(projectId, currentProfile);
    setProfile(updated.project.profile);
    return updated.project.id;
  }

  async function uploadFiles(fileList: FileList | File[]) {
    if (!profile) {
      setToast({ tone: "error", message: "Create or extract a profile before uploading images." });
      return;
    }

    const files = Array.from(fileList);
    if (files.length === 0) {
      return;
    }

    try {
      setBusy(true);
      const id = await ensureProjectSynced(profile);
      let latest = profile;
      for (const file of files) {
        const uploaded = await uploadProjectImage(id, file);
        latest = uploaded.project.profile;
      }
      setProfile(latest);
      setToast({ tone: "success", message: `${files.length} image(s) uploaded.` });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Image upload failed." });
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateSite() {
    if (!profile) {
      return;
    }
    if (missingSubstantiation.length > 0) {
      setToast({ tone: "error", message: "Add substantiation notes for all high-risk compliance flags before generating." });
      return;
    }

    try {
      setBusy(true);
      setJobState("queued");
      setPreviewUrl("");
      const id = await ensureProjectSynced(profile);
      const started = await startGeneration(id);

      for (let attempt = 0; attempt < 120; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const status = await getJobStatus(started.jobId);

        if (status.job.status === "running" || status.job.status === "queued") {
          setJobState(status.job.status === "running" ? "running" : "queued");
          continue;
        }

        if (status.job.status === "failed") {
          setJobState("failed");
          throw new Error(status.job.error || "Generation failed.");
        }

        if (status.job.status === "completed") {
          setJobState("done");
          const refreshed = await getProject(id);
          setProfile(refreshed.project.profile);
          const previewPath = status.job.result?.previewUrl;
          if (previewPath) {
            setPreviewUrl(`${getApiBase()}${previewPath}`);
          }
          setToast({ tone: "success", message: "Static site generated successfully." });
          return;
        }
      }

      throw new Error("Generation timed out.");
    } catch (error) {
      setJobState("failed");
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Generation failed." });
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish(createPr: boolean) {
    if (!projectId) {
      setToast({ tone: "error", message: "Generate a site first." });
      return;
    }

    try {
      setBusy(true);
      const result = await publishProject(projectId, createPr);
      setPublishFeedback(result.prUrl ? `PR created: ${result.prUrl}` : result.instructions || `Published files to ${result.publishedPath}`);
    } catch (error) {
      setPublishFeedback(error instanceof Error ? error.message : "Publish action failed.");
    } finally {
      setBusy(false);
    }
  }

  function updateProfile(next: Partial<BusinessProfile>) {
    if (!profile) return;
    setProfile({ ...profile, ...next, slug: createSlug(next.slug || next.name || profile.name) });
  }

  function updateFaq(index: number, field: "question" | "answer", value: string) {
    if (!profile) return;
    const faqs = [...profile.faqs];
    if (!faqs[index]) return;
    faqs[index] = { ...faqs[index], [field]: value };
    setProfile({ ...profile, faqs, quickAnswers: faqs.slice(0, 3) });
  }

  function moveImage(index: number, direction: -1 | 1) {
    if (!profile) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= profile.images.length) return;
    const images = [...profile.images];
    const tmp = images[index];
    images[index] = images[nextIndex];
    images[nextIndex] = tmp;
    setProfile({ ...profile, images });
  }

  function removeImage(imageId: string) {
    if (!profile) return;
    const images = profile.images.filter((img) => img.id !== imageId);
    if (!images.some((img) => img.selectedHero) && images[0]) {
      images[0] = { ...images[0], selectedHero: true };
    }
    setProfile({ ...profile, images });
  }

  function setHeroImage(imageId: string) {
    if (!profile) return;
    setProfile({ ...profile, images: profile.images.map((img) => ({ ...img, selectedHero: img.id === imageId })) });
  }

  function removeFaq(index: number) {
    if (!profile) return;
    const faqs = profile.faqs.filter((_, idx) => idx !== index);
    setProfile({ ...profile, faqs, quickAnswers: faqs.slice(0, 3) });
  }

  function downloadComplianceSummary() {
    if (!compliance) return;
    const payload = { ...compliance, substantiationNotes };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${profile?.slug || "compliance"}-summary.json`;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  return (
    <main className="mx-auto grid min-h-screen w-[min(1200px,95vw)] gap-4 py-6">
      <section className="panel bg-gradient-to-r from-cyan-50 via-white to-emerald-50">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">BBB Profile Website Builder</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Generate privacy-first local business websites</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-700">
          This tool transforms BBB profile captures into static websites with SEO + AEO structure, accessibility, and
          advertising-compliance guardrails. It does not bypass paywalls, authentication, rate limits, anti-bot
          systems, robots.txt, or profile Terms of Use.
        </p>
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

      <Panel title="Input Mode">
        <form className="grid gap-4" onSubmit={handleStartFromMode}>
          <fieldset className="grid gap-3 md:grid-cols-3">
            {modeOptions.map((option) => (
              <label key={option.id} className="cursor-pointer rounded-xl border border-slate-200 p-3 hover:border-accent">
                <div className="mb-2 flex items-center gap-2">
                  <input type="radio" name="mode" value={option.id} checked={mode === option.id} onChange={() => setMode(option.id)} />
                  <span className="font-semibold text-slate-900">{option.title}</span>
                </div>
                <p className="text-sm text-slate-600">{option.body}</p>
              </label>
            ))}
          </fieldset>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="bbb-url">BBB profile URL</label>
              <input id="bbb-url" className="input" placeholder="https://www.bbb.org/.../profile/..." value={url} onChange={(event) => setUrl(event.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="manual-name">Business name (manual mode)</label>
              <input id="manual-name" className="input" placeholder="Acme Service Co." value={manualName} onChange={(event) => setManualName(event.target.value)} />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="html-capture">HTML file (upload mode)</label>
            <input id="html-capture" className="input" type="file" accept=".html,text/html" onChange={(event) => setHtmlFile(event.target.files?.[0] || null)} />
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="button-primary" type="submit" disabled={busy}>{busy ? "Working..." : "Start Workspace"}</button>
          </div>
        </form>

        {fallbackSuggestions.length > 0 ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">Fallback suggestions</p>
            <ul className="ml-5 list-disc">
              {fallbackSuggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}
            </ul>
          </div>
        ) : null}
      </Panel>

      {profile ? (
        <>
          <Panel title="Extracted Data">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="name">Business name</label>
                <input id="name" className="input" value={profile.name} onChange={(event) => updateProfile({ name: event.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="slug">Slug</label>
                <input id="slug" className="input" value={profile.slug} onChange={(event) => updateProfile({ slug: event.target.value })} />
              </div>
            </div>

            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="categories">Categories (comma separated)</label>
                <input id="categories" className="input" value={arrayToCommaList(profile.categories)} onChange={(event) => updateProfile({ categories: commaListToArray(event.target.value) })} />
              </div>
              <div>
                <label className="label" htmlFor="areas">Service areas (comma separated)</label>
                <input id="areas" className="input" value={arrayToCommaList(profile.serviceAreas)} onChange={(event) => updateProfile({ serviceAreas: commaListToArray(event.target.value) })} />
              </div>
            </div>

            <div className="mt-3">
              <label className="label" htmlFor="services">Services (one per line)</label>
              <textarea id="services" className="input min-h-28" value={arrayToTextLines(profile.services)} onChange={(event) => updateProfile({ services: textLinesToArray(event.target.value) })} />
            </div>

            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="description">Description</label>
                <textarea id="description" className="input min-h-24" value={profile.description} onChange={(event) => updateProfile({ description: event.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="about">About</label>
                <textarea id="about" className="input min-h-24" value={profile.about} onChange={(event) => updateProfile({ about: event.target.value })} />
              </div>
            </div>

            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="phone">Phone</label>
                <input id="phone" className="input" value={profile.contact.phone} onChange={(event) => updateProfile({ contact: { ...profile.contact, phone: event.target.value } })} />
              </div>
              <div>
                <label className="label" htmlFor="email">Email</label>
                <input id="email" className="input" value={profile.contact.email} onChange={(event) => updateProfile({ contact: { ...profile.contact, email: event.target.value } })} />
              </div>
            </div>

            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="website">Website</label>
                <input id="website" className="input" value={profile.contact.website} onChange={(event) => updateProfile({ contact: { ...profile.contact, website: event.target.value } })} />
              </div>
              <div>
                <label className="label" htmlFor="address">Address</label>
                <input id="address" className="input" value={profile.contact.address} onChange={(event) => updateProfile({ contact: { ...profile.contact, address: event.target.value } })} />
              </div>
            </div>

            <div className="mt-3">
              <label className="label" htmlFor="hours">Hours (format: Day: open-close)</label>
              <textarea id="hours" className="input min-h-24" value={hoursToText(profile.hours)} onChange={(event) => updateProfile({ hours: textToHours(event.target.value) })} />
            </div>
          </Panel>

          <Panel title="Images">
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-4 text-center" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void uploadFiles(event.dataTransfer.files); }}>
              <p className="text-sm text-slate-700">Drag and drop photos here, or upload from disk.</p>
              <label className="mt-3 inline-flex cursor-pointer rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm">
                Upload photos
                <input className="hidden" type="file" accept="image/*" multiple onChange={(event) => { if (event.target.files) { void uploadFiles(event.target.files); event.target.value = ""; } }} />
              </label>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {profile.images.map((image, index) => (
                <article key={image.id} className="rounded-xl border border-slate-200 p-3">
                  <img alt={image.alt || `Image ${index + 1}`} src={absoluteAssetUrl(image.url)} className="h-40 w-full rounded-lg object-cover" />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="text-xs font-medium text-slate-600">
                      <input type="radio" name="hero" checked={Boolean(image.selectedHero)} onChange={() => setHeroImage(image.id)} /> Hero image
                    </label>
                    <button className="button-secondary" type="button" onClick={() => moveImage(index, -1)}>Up</button>
                    <button className="button-secondary" type="button" onClick={() => moveImage(index, 1)}>Down</button>
                    <button className="button-secondary" type="button" onClick={() => removeImage(image.id)}>Remove</button>
                  </div>
                </article>
              ))}
            </div>
          </Panel>
          <Panel title="Compliance Checks (BBB Advertising Guardrails)">
            {compliance && compliance.issues.length === 0 ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">No risky phrases detected in current copy.</p>
            ) : null}

            <div className="grid gap-3">
              {(compliance?.issues || []).map((issue) => (
                <article key={issue.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                  <p className="font-semibold text-amber-900">{riskLabel(issue)}: "{issue.phrase}" ({issue.field})</p>
                  <p className="mt-1 text-amber-900">Why risky: {issue.whyRisky}</p>
                  <p className="mt-1 text-amber-900">Needed substantiation: {issue.requiredSubstantiation}</p>
                  <p className="mt-1 text-amber-900">Safer rewrite: {issue.saferRewrite}</p>
                  <label className="label mt-2" htmlFor={`note-${issue.id}`}>Substantiation note</label>
                  <textarea id={`note-${issue.id}`} className="input min-h-20" value={substantiationNotes[issue.id] || ""} onChange={(event) => setSubstantiationNotes((current) => ({ ...current, [issue.id]: event.target.value }))} />
                </article>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button className="button-secondary" type="button" onClick={downloadComplianceSummary}>Download Compliance Summary</button>
              <span className="text-sm text-slate-600">{missingSubstantiation.length > 0 ? `${missingSubstantiation.length} high-risk claim(s) still missing substantiation notes.` : "All high-risk claims have substantiation notes."}</span>
            </div>
          </Panel>

          <Panel title="SEO + AEO">
            {seoPreview ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Search snippet preview</p>
                  <article className="mt-2 rounded-xl border border-slate-200 p-3">
                    <p className="text-lg text-blue-700">{seoPreview.title}</p>
                    <p className="text-xs text-emerald-700">{profile.contact.website || "https://example.com"}</p>
                    <p className="mt-1 text-sm text-slate-700">{seoPreview.description}</p>
                  </article>

                  <p className="mt-4 text-sm font-semibold text-slate-900">Open Graph</p>
                  <p className="text-sm text-slate-700">Title: {seoPreview.title}</p>
                  <p className="text-sm text-slate-700">Description: {seoPreview.description}</p>
                  <p className="text-sm text-slate-700">Image: {seoPreview.ogImage}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900">FAQ Builder</p>
                  <div className="mt-2 grid gap-2">
                    {profile.faqs.map((faq, index) => (
                      <div key={`${faq.question}-${index}`} className="rounded-xl border border-slate-200 p-2">
                        <input className="input mb-2" placeholder="Question" value={faq.question} onChange={(event) => updateFaq(index, "question", event.target.value)} />
                        <textarea className="input" placeholder="Answer" value={faq.answer} onChange={(event) => updateFaq(index, "answer", event.target.value)} />
                        <button className="button-secondary mt-2" type="button" onClick={() => removeFaq(index)}>Remove FAQ</button>
                      </div>
                    ))}
                  </div>

                  <button className="button-secondary mt-2" type="button" onClick={() => { if (!profile) return; const faqs = [...profile.faqs, { question: "", answer: "" }]; setProfile({ ...profile, faqs, quickAnswers: faqs.slice(0, 3) }); }}>Add FAQ</button>
                </div>
              </div>
            ) : null}

            <p className="mt-3 text-sm font-semibold text-slate-900">Schema markup preview</p>
            <pre className="mt-2 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(seoPreview?.schema || {}, null, 2)}</pre>
          </Panel>

          <Panel title="Privacy">
            <div className="grid gap-3 md:grid-cols-2">
              <article className="rounded-xl border border-slate-200 p-3">
                <p className="font-semibold text-slate-900">Cookie categories</p>
                <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
                  <li>Essential only by default</li>
                  <li>No tracking until explicit opt-in</li>
                  <li>Analytics toggle available through cookie manager</li>
                </ul>
              </article>

              <article className="rounded-xl border border-slate-200 p-3">
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <input type="checkbox" checked={profile.privacyTrackerOptIn} onChange={(event) => updateProfile({ privacyTrackerOptIn: event.target.checked })} /> Enable analytics hooks after opt-in
                </label>
                <textarea className="input min-h-20" placeholder="Privacy policy notes" value={profile.privacyNotes} onChange={(event) => updateProfile({ privacyNotes: event.target.value })} />
              </article>
            </div>
          </Panel>

          <Panel title="Generate and Publish">
            <div className="flex flex-wrap gap-2">
              <button className="button-primary" type="button" onClick={() => void handleGenerateSite()} disabled={busy}>Generate Site</button>
              {projectId ? <a className="button-secondary" href={`${getApiBase()}/api/projects/${projectId}/download`}>Download ZIP</a> : null}
              <button className="button-secondary" type="button" onClick={() => void handlePublish(false)} disabled={busy}>Publish to repo</button>
              <button className="button-secondary" type="button" onClick={() => void handlePublish(true)} disabled={busy}>Create PR</button>
            </div>

            <div className="mt-3 text-sm text-slate-700">
              <p>Generation status: <strong>{jobState}</strong></p>
              {publishFeedback ? <p className="mt-1">{publishFeedback}</p> : null}
            </div>

            {previewUrl ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-300">
                <iframe src={previewUrl} className="h-[560px] w-full" title="Generated site preview" loading="lazy" />
              </div>
            ) : null}
          </Panel>
        </>
      ) : null}
    </main>
  );
}
