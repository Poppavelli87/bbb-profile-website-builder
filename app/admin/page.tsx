
"use client";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  applyLayoutPreset,
  contrastRatio,
  createSlug,
  getLayoutPreset,
  getThemePreset,
  normalizeGeneratedContent,
  resolveTheme,
  runComplianceChecks,
  suggestLayout,
  toComplianceProfile,
  type SiteRecord,
  type SiteTier,
  type ComplianceIssue,
  type ExtractionMode,
  type GeneratedContent,
  type ThemeVars
} from "@/lib/shared";
import {
  builderReducer,
  createBuilderPresentFromProfile,
  createBuilderPresentFromSiteDefinition,
  initialBuilderState,
  type BuilderPresent
} from "@/lib/builder/reducer";
import { getPreviewPanelState } from "@/lib/builder/preview";
import {
  archiveAdminSite,
  createAdminSite,
  getAdminSite,
  createProject,
  extractFromHtml,
  extractFromUrl,
  getApiBase,
  renderProject,
  resetProject,
  unpublishAdminSite,
  updateAdminSite,
  updateProject,
  uploadProjectImage
} from "@/lib/api";
import { createEmptyProfile, hoursToText, textToHours } from "@/lib/profile";
import { AppFooter } from "@/components/AppFooter";
import { TokenInput } from "@/components/TokenInput";

type Toast = { tone: "success" | "error" | "info"; message: string };
type TabId = "source" | "themes" | "layout" | "editor" | "compliance";

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

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const modeOptions: Array<{ id: ExtractionMode; title: string; body: string }> = [
  { id: "auto", title: "Auto-inspect", body: "Attempts robots-compliant extraction from a public BBB profile URL." },
  { id: "upload_html", title: "Upload HTML capture", body: "Upload a saved HTML file if direct extraction is blocked." },
  { id: "manual", title: "Manual entry", body: "Type details and upload photos manually." }
];

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "source", label: "Source Data" },
  { id: "themes", label: "Themes" },
  { id: "layout", label: "Layout" },
  { id: "editor", label: "Editor" },
  { id: "compliance", label: "Compliance" }
];

const themeVarFields: Array<{ key: keyof ThemeVars; label: string }> = [
  { key: "bg", label: "Background" },
  { key: "surface", label: "Surface" },
  { key: "text", label: "Text" },
  { key: "muted", label: "Muted Text" },
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent" },
  { key: "border", label: "Border" }
];

export default function HomePage() {
  const router = useRouter();
  const [siteIdFromQuery, setSiteIdFromQuery] = useState<string | null>(null);

  const [mode, setMode] = useState<ExtractionMode>("auto");
  const [url, setUrl] = useState("");
  const [htmlFile, setHtmlFile] = useState<File | null>(null);
  const [manualName, setManualName] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [fallbackSuggestions, setFallbackSuggestions] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [hasGeneratedPreview, setHasGeneratedPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncingPreview, setSyncingPreview] = useState(false);
  const [autoRenderEnabled, setAutoRenderEnabled] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("source");
  const [customizeTheme, setCustomizeTheme] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [siteStatus, setSiteStatus] = useState<SiteRecord["status"] | null>(null);
  const [siteTier, setSiteTier] = useState<SiteTier>("free");
  const [publishedLiveUrl, setPublishedLiveUrl] = useState("");

  useEffect(() => {
    const queryId = new URLSearchParams(window.location.search).get("siteId");
    setSiteIdFromQuery(queryId);
  }, []);

  const [builderState, dispatch] = useReducer(builderReducer, undefined, initialBuilderState);
  const renderSequence = useRef(0);

  const present = builderState.present;
  const profile = present.profile;
  const content = present.content;
  const editorUnlocked = builderState.status !== "draft" || autoRenderEnabled || hasGeneratedPreview;

  const themeResolved = useMemo(() => resolveTheme(present.theme), [present.theme]);
  const contrast = useMemo(() => contrastRatio(themeResolved.vars.text, themeResolved.vars.bg), [themeResolved]);

  const compliance = useMemo(() => {
    if (!profile || !content) return null;
    return runComplianceChecks(toComplianceProfile(profile, content));
  }, [profile, content]);
  const highRiskIssues = useMemo(
    () => (compliance?.issues || []).filter((issue) => issue.severity === "high"),
    [compliance]
  );
  const missingSubstantiation = useMemo(
    () => highRiskIssues.filter((issue) => !(present.substantiationNotes[issue.id] || "").trim()),
    [highRiskIssues, present.substantiationNotes]
  );

  const layoutSuggestion = useMemo(() => {
    if (!profile || !content) return null;
    return suggestLayout(profile, content);
  }, [profile, content]);

  const previewFingerprint = useMemo(() => {
    if (!profile || !content) {
      return "";
    }
    return JSON.stringify({
      profile,
      content,
      theme: present.theme,
      layout: present.layout,
      sections: present.sections
    });
  }, [profile, content, present.theme, present.layout, present.sections]);
  const previewPanelState = useMemo(
    () => getPreviewPanelState(hasGeneratedPreview, previewUrl),
    [hasGeneratedPreview, previewUrl]
  );

  function applyEdit(updater: (current: BuilderPresent) => BuilderPresent) {
    const next = updater(present);
    dispatch({ type: "edit", present: deepClone(next) });
  }

  function applyLoad(next: BuilderPresent) {
    dispatch({ type: "load", present: deepClone(next), status: "draft" });
  }

  function currentSiteDefinition() {
    if (!profile || !content) {
      return null;
    }
    return {
      profile,
      theme: present.theme,
      layout: present.layout,
      sections: present.sections,
      content,
      substantiationNotes: present.substantiationNotes
    };
  }

  async function syncSiteDraftRecord(): Promise<string | null> {
    const definition = currentSiteDefinition();
    if (!definition || !profile) {
      return null;
    }
    if (siteId) {
      const updated = await updateAdminSite(siteId, {
        slug: profile.slug,
        businessName: profile.name,
        tier: siteTier,
        siteDefinitionJson: definition,
        status: siteStatus || undefined
      });
      setSiteStatus(updated.site.status);
      setSiteTier(updated.site.tier);
      return updated.site.id;
    }
    const created = await createAdminSite({
      slug: profile.slug,
      businessName: profile.name,
      tier: siteTier,
      siteDefinitionJson: definition
    });
    setSiteId(created.site.id);
    setSiteStatus(created.site.status);
    setSiteTier(created.site.tier);
    setPublishedLiveUrl(created.liveUrl);
    return created.site.id;
  }

  async function ensureProjectId(): Promise<string> {
    if (!profile) {
      throw new Error("Create or extract a profile first.");
    }
    if (projectId) {
      return projectId;
    }
    const created = await createProject(profile);
    setProjectId(created.project.id);
    return created.project.id;
  }

  async function persistProject(status?: "draft" | "generated" | "edited" | "saved"): Promise<string> {
    if (!profile || !content) {
      throw new Error("Project content is not ready.");
    }
    const id = await ensureProjectId();
    await updateProject(id, {
      profile,
      content,
      theme: present.theme,
      layout: present.layout,
      sections: present.sections,
      substantiationNotes: present.substantiationNotes,
      status
    });
    return id;
  }

  async function persistAndRender(status: "generated" | "edited" | "saved"): Promise<string> {
    const id = await persistProject(status);
    const rendered = await renderProject(id, status);
    setPreviewUrl(`${getApiBase()}${rendered.previewUrl}`);
    setHasGeneratedPreview(true);
    return id;
  }

  useEffect(() => {
    if (!autoRenderEnabled || !projectId || !profile || !content || builderState.status !== "edited") {
      return;
    }
    const sequence = ++renderSequence.current;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          setSyncingPreview(true);
          await updateProject(projectId, {
            profile,
            content,
            theme: present.theme,
            layout: present.layout,
            sections: present.sections,
            status: "edited"
          });
          const rendered = await renderProject(projectId, "edited");
          if (sequence !== renderSequence.current) {
            return;
          }
          setPreviewUrl(`${getApiBase()}${rendered.previewUrl}`);
          setHasGeneratedPreview(true);
        } catch (error) {
          if (sequence !== renderSequence.current) {
            return;
          }
          setToast({
            tone: "error",
            message: error instanceof Error ? error.message : "Failed to refresh preview."
          });
        } finally {
          if (sequence === renderSequence.current) {
            setSyncingPreview(false);
          }
        }
      })();
    }, 320);

    return () => {
      clearTimeout(timer);
    };
  }, [autoRenderEnabled, projectId, previewFingerprint, builderState.status, profile, content, present.layout, present.sections, present.theme]);

  useEffect(() => {
    if (!siteIdFromQuery) {
      return;
    }
    setPreviewUrl("");
    setHasGeneratedPreview(false);
    void (async () => {
      try {
        setBusy(true);
        const loaded = await getAdminSite(siteIdFromQuery);
        applyLoad(createBuilderPresentFromSiteDefinition(loaded.site.siteDefinitionJson));
        setSiteId(loaded.site.id);
        setSiteStatus(loaded.site.status);
        setSiteTier(loaded.site.tier);
        setPublishedLiveUrl(loaded.liveUrl);
        setMode(loaded.site.siteDefinitionJson.profile.mode || "manual");
        setToast({ tone: "success", message: `Loaded site ${loaded.site.slug} for editing.` });
      } catch (error) {
        setToast({
          tone: "error",
          message: error instanceof Error ? error.message : "Failed to load selected site."
        });
      } finally {
        setBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteIdFromQuery]);

  async function handleStartFromMode(event: FormEvent) {
    event.preventDefault();
    setToast(null);
    setFallbackSuggestions([]);
    setProjectId(null);
    setSiteIdFromQuery(null);
    setSiteId(null);
    setSiteStatus(null);
    setSiteTier("free");
    setPublishedLiveUrl("");
    setPreviewUrl("");
    setHasGeneratedPreview(false);
    setAutoRenderEnabled(false);
    dispatch({ type: "reset" });

    try {
      setBusy(true);
      if (mode === "auto") {
        const extracted = await extractFromUrl(url.trim());
        if (!extracted.ok || !extracted.data) {
          setFallbackSuggestions(extracted.fallbackSuggestions || []);
          throw new Error(extracted.error || "Auto-inspection failed.");
        }
        applyLoad(createBuilderPresentFromProfile(extracted.data));
        setToast({ tone: "success", message: "Profile extracted. Review and edit before generation." });
        return;
      }

      if (mode === "upload_html") {
        if (!htmlFile) {
          throw new Error("Select an HTML file to continue.");
        }
        const html = await htmlFile.text();
        const extracted = await extractFromHtml(html, url.trim() || "https://www.bbb.org/profile/");
        applyLoad(createBuilderPresentFromProfile({ ...extracted.data, mode: "upload_html" }));
        setToast({ tone: "success", message: "HTML capture parsed. Review data before generation." });
        return;
      }

      applyLoad(createBuilderPresentFromProfile(createEmptyProfile(manualName || "Manual Business Profile")));
      setToast({ tone: "success", message: "Manual workspace ready." });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Unable to start selected mode." });
    } finally {
      setBusy(false);
    }
  }

  function updateSourceProfile(next: Partial<NonNullable<typeof profile>>) {
    if (!profile) return;
    const updatedProfile = {
      ...profile,
      ...next,
      slug: createSlug(next.slug || next.name || profile.name)
    };
    applyEdit((current) => ({
      ...current,
      profile: updatedProfile,
      content: builderState.status === "draft" ? normalizeGeneratedContent(updatedProfile) : current.content
    }));
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
      const id = await ensureProjectId();
      let latest = profile;
      for (const file of files) {
        const uploaded = await uploadProjectImage(id, file);
        latest = uploaded.project.profile;
      }
      applyEdit((current) => ({
        ...current,
        profile: latest,
        content: builderState.status === "draft" ? normalizeGeneratedContent(latest) : current.content
      }));
      setToast({ tone: "success", message: `${files.length} image(s) uploaded.` });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Image upload failed." });
    } finally {
      setBusy(false);
    }
  }

  function moveImage(index: number, direction: -1 | 1) {
    if (!profile) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= profile.images.length) return;
    const images = [...profile.images];
    const tmp = images[index];
    images[index] = images[nextIndex];
    images[nextIndex] = tmp;
    updateSourceProfile({ images });
  }

  function removeImage(imageId: string) {
    if (!profile) return;
    const images = profile.images.filter((img) => img.id !== imageId);
    if (!images.some((img) => img.selectedHero) && images[0]) {
      images[0] = { ...images[0], selectedHero: true };
    }
    updateSourceProfile({ images });
  }

  function setHeroImage(imageId: string) {
    if (!profile) return;
    updateSourceProfile({
      images: profile.images.map((img) => ({ ...img, selectedHero: img.id === imageId }))
    });
  }

  function updateContent(
    next: Partial<Omit<GeneratedContent, "contact">> & { contact?: Partial<GeneratedContent["contact"]> }
  ) {
    if (!content) return;
    applyEdit((current) => ({
      ...current,
      content: {
        ...content,
        ...next,
        contact: next.contact ? { ...content.contact, ...next.contact } : content.contact
      }
    }));
  }

  function moveSection(index: number, direction: -1 | 1) {
    if (!present.sections[index]) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= present.sections.length) return;
    const next = [...present.sections];
    const tmp = next[index];
    next[index] = next[nextIndex];
    next[nextIndex] = tmp;
    applyEdit((current) => ({
      ...current,
      sections: next
    }));
  }

  function updateFaq(index: number, field: "question" | "answer", value: string) {
    if (!content) return;
    const faqs = [...content.faqs];
    if (!faqs[index]) return;
    faqs[index] = { ...faqs[index], [field]: value };
    updateContent({ faqs, quickAnswers: faqs.slice(0, 3) });
  }

  function removeFaq(index: number) {
    if (!content) return;
    const faqs = content.faqs.filter((_, idx) => idx !== index);
    updateContent({ faqs, quickAnswers: faqs.slice(0, 3) });
  }

  function updateService(index: number, field: "name" | "description", value: string) {
    if (!content) return;
    const services = [...content.services];
    if (!services[index]) return;
    services[index] = { ...services[index], [field]: value };
    updateContent({ services });
  }

  function removeService(index: number) {
    if (!content) return;
    const services = content.services.filter((_, idx) => idx !== index);
    updateContent({ services });
  }

  async function handleGenerateSite() {
    if (!profile || !content) return;
    if (missingSubstantiation.length > 0) {
      setToast({
        tone: "error",
        message: "Add substantiation notes for all high-risk compliance flags before generating."
      });
      return;
    }

    try {
      setBusy(true);
      renderSequence.current += 1;
      const id = await persistAndRender("generated");
      setProjectId(id);
      dispatch({ type: "markGenerated" });
      setAutoRenderEnabled(true);
      setActiveTab("editor");
      setToast({ tone: "success", message: "Site generated. You can now edit and preview in real time." });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Generation failed." });
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!profile || !content) return;
    try {
      setBusy(true);
      renderSequence.current += 1;
      const id = await persistAndRender("saved");
      setProjectId(id);
      dispatch({ type: "markSaved" });
      setAutoRenderEnabled(true);
      const savedSiteId = await syncSiteDraftRecord();
      if (savedSiteId && !siteId) {
        setSiteIdFromQuery(savedSiteId);
        router.replace(`/admin?siteId=${savedSiteId}`);
      }
      setToast({ tone: "success", message: "Draft saved and export refreshed." });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Save failed." });
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadZip() {
    if (!profile || !content) return;
    try {
      setBusy(true);
      renderSequence.current += 1;
      const id = await persistAndRender("saved");
      setProjectId(id);
      dispatch({ type: "markSaved" });
      window.location.assign(`${getApiBase()}/api/projects/${id}/download`);
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Download failed." });
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish(force = false) {
    if (!profile || !content) return;
    const definition = currentSiteDefinition();
    if (!definition) return;

    try {
      setBusy(true);
      renderSequence.current += 1;
      const id = await persistAndRender("saved");
      setProjectId(id);
      dispatch({ type: "markSaved" });
      const draftId = (await syncSiteDraftRecord()) || siteId;
      if (!draftId) {
        throw new Error("Unable to create a draft site record before publishing.");
      }

      const response = await fetch(`/api/admin/sites/${draftId}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: profile.slug,
          businessName: profile.name,
          tier: siteTier,
          siteDefinitionJson: definition,
          force
        })
      });

      if (response.status === 409 && !force) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; requiresConfirmation?: boolean }
          | null;
        const message =
          payload?.error ||
          "High-risk compliance warnings were detected. Publish anyway?";
        const accepted = window.confirm(`${message} Click OK to publish with warnings.`);
        if (accepted) {
          await handlePublish(true);
        }
        return;
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to publish site.");
      }

      const published = (await response.json()) as {
        site: SiteRecord;
        liveUrl: string;
      };
      setSiteId(published.site.id);
      setSiteStatus(published.site.status);
      setSiteTier(published.site.tier);
      setPublishedLiveUrl(published.liveUrl);
      setToast({
        tone: "success",
        message: `Site published at ${published.liveUrl}`
      });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Publish failed." });
    } finally {
      setBusy(false);
    }
  }

  async function handleUnpublish() {
    if (!siteId) return;
    try {
      setBusy(true);
      const result = await unpublishAdminSite(siteId);
      setSiteStatus(result.site.status);
      setPublishedLiveUrl(result.liveUrl);
      setToast({ tone: "success", message: "Site moved back to draft status." });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Unpublish failed." });
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive() {
    if (!siteId) return;
    try {
      setBusy(true);
      const result = await archiveAdminSite(siteId);
      setSiteStatus(result.site.status);
      setPublishedLiveUrl(result.liveUrl);
      setToast({ tone: "success", message: "Site archived." });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Archive failed." });
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  async function confirmReset() {
    try {
      setBusy(true);
      if (projectId) {
        await resetProject(projectId);
      }
      dispatch({ type: "reset" });
      setMode("auto");
      setUrl("");
      setHtmlFile(null);
      setManualName("");
      setProjectId(null);
      setSiteIdFromQuery(null);
      setSiteId(null);
      setSiteStatus(null);
      setSiteTier("free");
      setPublishedLiveUrl("");
      setPreviewUrl("");
      setHasGeneratedPreview(false);
      setAutoRenderEnabled(false);
      setFallbackSuggestions([]);
      setActiveTab("source");
      router.replace("/admin");
      setToast({ tone: "success", message: "Workspace reset complete." });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Reset failed." });
    } finally {
      setBusy(false);
      setShowResetConfirm(false);
    }
  }

  function confirmRegenerateFromSource() {
    if (!profile) return;
    const regenerated = normalizeGeneratedContent(profile);
    const layoutApplied = applyLayoutPreset(present.layout.presetId);
    applyEdit((current) => ({
      ...current,
      content: regenerated,
      sections: layoutApplied.sections
    }));
    setShowRegenerateConfirm(false);
    setToast({ tone: "info", message: "Source data reapplied. Your custom edits were replaced." });
  }

  function downloadComplianceSummary() {
    if (!compliance) return;
    const payload = { ...compliance, substantiationNotes: present.substantiationNotes };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${profile?.slug || "compliance"}-summary.json`;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  return (
    <main className="mx-auto grid min-h-screen w-[min(1360px,96vw)] gap-4 py-4">
      <section className="panel sticky top-0 z-30 border-slate-300 bg-white/95 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">BBB Profile Website Builder</p>
            <p className="text-sm text-slate-700">
              Status: <strong className="capitalize">{builderState.status}</strong>
              {syncingPreview ? " | syncing preview" : ""}
              {siteStatus ? ` | site ${siteStatus}` : ""}
            </p>
            {publishedLiveUrl ? (
              <p className="text-xs text-slate-600">
                Live URL:{" "}
                <a className="text-blue-700 underline" href={publishedLiveUrl} target="_blank" rel="noreferrer">
                  {publishedLiveUrl}
                </a>
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="input w-auto"
              value={siteTier}
              onChange={(event) => setSiteTier(event.target.value as SiteTier)}
            >
              <option value="free">Tier: Free</option>
              <option value="premium">Tier: Premium</option>
              <option value="pro">Tier: Pro</option>
            </select>
            <button className="button-secondary" type="button" onClick={() => setShowResetConfirm(true)} disabled={busy}>
              Reset
            </button>
            <button className="button-secondary" type="button" onClick={() => void handleSave()} disabled={!profile || busy}>
              Save
            </button>
            <button className="button-primary" type="button" onClick={() => void handlePublish()} disabled={!profile || busy}>
              Publish
            </button>
            <button className="button-primary" type="button" onClick={() => void handleDownloadZip()} disabled={!profile || busy}>
              Download ZIP
            </button>
            {siteId ? (
              <>
                <button className="button-secondary" type="button" onClick={() => void handleUnpublish()} disabled={busy}>
                  Unpublish
                </button>
                <button className="button-secondary" type="button" onClick={() => void handleArchive()} disabled={busy}>
                  Archive
                </button>
              </>
            ) : null}
            <a className="button-secondary" href="/admin/sites">
              Manage Sites
            </a>
            <button className="button-secondary" type="button" onClick={() => void handleLogout()}>
              Logout
            </button>
          </div>
        </div>
      </section>

      <section className="panel bg-gradient-to-r from-cyan-50 via-white to-emerald-50">
        <h1 className="text-3xl font-bold text-slate-900">Generate and edit privacy-first business websites</h1>
        <p className="mt-2 max-w-4xl text-sm text-slate-700">
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

      {!profile ? (
        <Panel title="Input Mode">
          <p className="mb-3 text-sm text-slate-600">
            URL extraction is best-effort and may be blocked by access rules, robots policies, or terms. If that
            happens, switch to Upload HTML or Manual Entry.
          </p>
          <form className="grid gap-4" onSubmit={handleStartFromMode}>
            <fieldset className="grid gap-3 md:grid-cols-3">
              {modeOptions.map((option) => (
                <label key={option.id} className="cursor-pointer rounded-xl border border-slate-200 p-3 hover:border-accent">
                  <div className="mb-2 flex items-center gap-2">
                    <input
                      type="radio"
                      name="mode"
                      value={option.id}
                      checked={mode === option.id}
                      onChange={() => setMode(option.id)}
                    />
                    <span className="font-semibold text-slate-900">{option.title}</span>
                  </div>
                  <p className="text-sm text-slate-600">{option.body}</p>
                </label>
              ))}
            </fieldset>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="bbb-url">BBB profile URL</label>
                <input
                  id="bbb-url"
                  className="input"
                  placeholder="https://www.bbb.org/.../profile/..."
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="manual-name">Business name (manual mode)</label>
                <input
                  id="manual-name"
                  className="input"
                  placeholder="Acme Service Co."
                  value={manualName}
                  onChange={(event) => setManualName(event.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="html-capture">HTML file (upload mode)</label>
              <input
                id="html-capture"
                className="input"
                type="file"
                accept=".html,text/html"
                onChange={(event) => setHtmlFile(event.target.files?.[0] || null)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button className="button-primary" type="submit" disabled={busy}>{busy ? "Working..." : "Start Workspace"}</button>
            </div>
          </form>

          {fallbackSuggestions.length > 0 ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">Fallback suggestions</p>
              <ul className="ml-5 list-disc">
                {fallbackSuggestions.map((suggestion) => (
                  <li key={suggestion}>{suggestion}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </Panel>
      ) : (
        <section className="grid gap-4 lg:grid-cols-[1.18fr_0.82fr]">
          <div className="grid gap-4">
            <section className="panel">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => {
                  const disabled = tab.id === "editor" && !editorUnlocked;
                  return (
                    <button
                      key={tab.id}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                        activeTab === tab.id
                          ? "border-accent bg-accent text-white"
                          : "border-slate-300 bg-white text-slate-700"
                      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                      type="button"
                      disabled={disabled}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {activeTab === "source" ? (
              <>
                <Panel title="Extracted Data">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="name">Business name</label>
                      <input id="name" className="input" value={profile.name} onChange={(event) => updateSourceProfile({ name: event.target.value })} />
                    </div>
                    <div>
                      <label className="label" htmlFor="slug">Slug</label>
                      <input id="slug" className="input" value={profile.slug} onChange={(event) => updateSourceProfile({ slug: event.target.value })} />
                    </div>
                  </div>

                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <TokenInput
                      id="types-of-business"
                      label="Types of Business"
                      values={profile.typesOfBusiness}
                      onChange={(next) => updateSourceProfile({ typesOfBusiness: next })}
                      placeholder="Type a business type and press Enter"
                    />
                    <TokenInput
                      id="source-service-areas"
                      label="Service Areas"
                      values={profile.serviceAreas}
                      onChange={(next) => updateSourceProfile({ serviceAreas: next })}
                      placeholder="Type a city or region and press Enter"
                    />
                  </div>

                  <div className="mt-3">
                    <TokenInput
                      id="products-and-services"
                      label="Products and Services"
                      values={profile.productsAndServices}
                      onChange={(next) => updateSourceProfile({ productsAndServices: next })}
                      placeholder="Type a product or service and press Enter"
                    />
                  </div>

                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="description">Description</label>
                      <textarea id="description" className="input min-h-24" value={profile.description} onChange={(event) => updateSourceProfile({ description: event.target.value })} />
                    </div>
                    <div>
                      <label className="label" htmlFor="about">About</label>
                      <textarea id="about" className="input min-h-24" value={profile.about} onChange={(event) => updateSourceProfile({ about: event.target.value })} />
                    </div>
                  </div>

                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="phone">Phone</label>
                      <input id="phone" className="input" value={profile.contact.phone} onChange={(event) => updateSourceProfile({ contact: { ...profile.contact, phone: event.target.value } })} />
                    </div>
                    <div>
                      <label className="label" htmlFor="email">Email</label>
                      <input id="email" className="input" value={profile.contact.email} onChange={(event) => updateSourceProfile({ contact: { ...profile.contact, email: event.target.value } })} />
                    </div>
                  </div>

                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="website">Website</label>
                      <input id="website" className="input" value={profile.contact.website} onChange={(event) => updateSourceProfile({ contact: { ...profile.contact, website: event.target.value } })} />
                    </div>
                    <div>
                      <label className="label" htmlFor="address">Address</label>
                      <input id="address" className="input" value={profile.contact.address} onChange={(event) => updateSourceProfile({ contact: { ...profile.contact, address: event.target.value } })} />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="label" htmlFor="hours">Hours (format: Day: open-close)</label>
                    <textarea id="hours" className="input min-h-24" value={hoursToText(profile.hours)} onChange={(event) => updateSourceProfile({ hours: textToHours(event.target.value) })} />
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
              </>
            ) : null}

            {activeTab === "themes" ? (
              <Panel title="Themes">
                <div className="grid gap-3 md:grid-cols-2">
                  {["minimal-light", "minimal-dark", "modern-neutral", "bold-contrast", "coastal", "earthy", "classic-blue", "warm-sunset", "clean-green", "slate-pro"].map((themeId) => {
                    const preset = getThemePreset(themeId);
                    const selected = present.theme.presetId === preset.id;
                    return (
                      <button key={preset.id} type="button" onClick={() => applyEdit((current) => ({ ...current, theme: { presetId: preset.id, overrides: {}, buttonStyle: preset.buttonStyle } }))} className={`rounded-xl border p-3 text-left ${selected ? "border-accent bg-cyan-50" : "border-slate-200 hover:border-accent"}`}>
                        <p className="font-semibold text-slate-900">{preset.label}</p>
                        <p className="text-xs text-slate-600">Primary {preset.vars.primary} • Accent {preset.vars.accent}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <input type="checkbox" checked={customizeTheme} onChange={(event) => setCustomizeTheme(event.target.checked)} />
                    Customize colors
                  </label>
                  <button className="button-secondary" type="button" onClick={() => {
                    const preset = getThemePreset(present.theme.presetId);
                    applyEdit((current) => ({ ...current, theme: { presetId: preset.id, overrides: {}, buttonStyle: preset.buttonStyle } }));
                  }}>
                    Reset to preset
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {(["rounded", "pill", "square"] as const).map((style) => (
                    <label key={style} className="flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-sm">
                      <input type="radio" name="button-style" checked={themeResolved.buttonStyle === style} onChange={() => applyEdit((current) => ({ ...current, theme: { ...current.theme, buttonStyle: style } }))} />
                      {style}
                    </label>
                  ))}
                </div>

                {customizeTheme ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {themeVarFields.map((field) => {
                      const preset = getThemePreset(present.theme.presetId);
                      const value = (present.theme.overrides?.[field.key] as string) || themeResolved.vars[field.key];
                      return (
                        <label key={field.key} className="text-sm">
                          <span className="mb-1 block font-semibold text-slate-800">{field.label}</span>
                          <div className="flex items-center gap-2">
                            <input type="color" value={value} onChange={(event) => {
                              const nextValue = event.target.value;
                              applyEdit((current) => {
                                const overrides = { ...(current.theme.overrides || {}) };
                                if (nextValue.toLowerCase() === preset.vars[field.key].toLowerCase()) {
                                  delete overrides[field.key];
                                } else {
                                  overrides[field.key] = nextValue;
                                }
                                return { ...current, theme: { ...current.theme, overrides } };
                              });
                            }} />
                            <input className="input" value={value} onChange={(event) => applyEdit((current) => ({ ...current, theme: { ...current.theme, overrides: { ...(current.theme.overrides || {}), [field.key]: event.target.value } } }))} />
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : null}

                {contrast < 4.5 ? (
                  <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Contrast warning: text and background contrast is below recommended readability levels.
                  </p>
                ) : null}
              </Panel>
            ) : null}

            {activeTab === "layout" ? (
              <Panel title="Layout Presets">
                <div className="grid gap-3 md:grid-cols-2">
                  {["local-service-classic", "product-retail", "high-trust", "minimal-one-page", "story-first"].map((layoutId) => {
                    const preset = getLayoutPreset(layoutId);
                    const selected = present.layout.presetId === preset.id;
                    return (
                      <button key={preset.id} type="button" onClick={() => {
                        const applied = applyLayoutPreset(preset.id);
                        applyEdit((current) => ({ ...current, layout: applied.layout, sections: applied.sections }));
                      }} className={`rounded-xl border p-3 text-left ${selected ? "border-accent bg-cyan-50" : "border-slate-200 hover:border-accent"}`}>
                        <p className="font-semibold text-slate-900">{preset.label}</p>
                        <p className="text-xs text-slate-600">{preset.sections.join(" • ")}</p>
                      </button>
                    );
                  })}
                </div>

                {layoutSuggestion ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">Suggested layout: {getLayoutPreset(layoutSuggestion.recommendedPresetId).label}</p>
                    <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
                      {layoutSuggestion.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                    <button type="button" className="button-secondary mt-3" onClick={() => {
                      const applied = applyLayoutPreset(layoutSuggestion.recommendedPresetId, layoutSuggestion.sectionToggles);
                      applyEdit((current) => ({ ...current, layout: applied.layout, sections: applied.sections }));
                    }}>
                      Apply suggestion
                    </button>
                  </div>
                ) : null}
              </Panel>
            ) : null}

            {activeTab === "editor" ? (
              <Panel title="Editor">
                {content ? (
                  <div className="grid gap-4">
                    <div className="flex flex-wrap gap-2">
                      <button className="button-secondary" type="button" onClick={() => dispatch({ type: "undo" })}>Undo</button>
                      <button className="button-secondary" type="button" onClick={() => dispatch({ type: "redo" })}>Redo</button>
                      <button className="button-secondary" type="button" onClick={() => setShowRegenerateConfirm(true)}>Regenerate from source</button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="label">Site title</label>
                        <input className="input" value={content.siteTitle} onChange={(event) => updateContent({ siteTitle: event.target.value })} />
                      </div>
                      <div>
                        <label className="label">Meta description</label>
                        <textarea className="input min-h-20" value={content.metaDescription} onChange={(event) => updateContent({ metaDescription: event.target.value })} />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <label className="label">Hero headline</label>
                        <input className="input" value={content.heroHeadline} onChange={(event) => updateContent({ heroHeadline: event.target.value })} />
                      </div>
                      <div>
                        <label className="label">Hero subheadline</label>
                        <input className="input" value={content.heroSubheadline} onChange={(event) => updateContent({ heroSubheadline: event.target.value })} />
                      </div>
                      <div>
                        <label className="label">Hero CTA text</label>
                        <input className="input" value={content.heroCtaText} onChange={(event) => updateContent({ heroCtaText: event.target.value })} />
                      </div>
                    </div>

                    <div>
                      <label className="label">About text</label>
                      <textarea className="input min-h-24" value={content.aboutText} onChange={(event) => updateContent({ aboutText: event.target.value })} />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-900">Products and Services</p>
                      <div className="mt-2 grid gap-2">
                        {content.services.map((service, index) => (
                          <div key={`${service.name}-${index}`} className="rounded-xl border border-slate-200 p-3">
                            <input className="input mb-2" placeholder="Product or service name" value={service.name} onChange={(event) => updateService(index, "name", event.target.value)} />
                            <textarea className="input" placeholder="Product or service description" value={service.description} onChange={(event) => updateService(index, "description", event.target.value)} />
                            <button className="button-secondary mt-2" type="button" onClick={() => removeService(index)}>Remove item</button>
                          </div>
                        ))}
                      </div>
                      <button className="button-secondary mt-2" type="button" onClick={() => updateContent({ services: [...content.services, { name: "", description: "" }] })}>Add item</button>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-900">FAQs</p>
                      <div className="mt-2 grid gap-2">
                        {content.faqs.map((faq, index) => (
                          <div key={`${faq.question}-${index}`} className="rounded-xl border border-slate-200 p-3">
                            <input className="input mb-2" placeholder="Question" value={faq.question} onChange={(event) => updateFaq(index, "question", event.target.value)} />
                            <textarea className="input" placeholder="Answer" value={faq.answer} onChange={(event) => updateFaq(index, "answer", event.target.value)} />
                            <button className="button-secondary mt-2" type="button" onClick={() => removeFaq(index)}>Remove FAQ</button>
                          </div>
                        ))}
                      </div>
                      <button className="button-secondary mt-2" type="button" onClick={() => updateContent({ faqs: [...content.faqs, { question: "", answer: "" }], quickAnswers: [...content.faqs, { question: "", answer: "" }].slice(0, 3) })}>Add FAQ</button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="label">Contact phone</label>
                        <input className="input" value={content.contact.phone} onChange={(event) => updateContent({ contact: { phone: event.target.value } })} />
                        <label className="label mt-2">Contact email</label>
                        <input className="input" value={content.contact.email} onChange={(event) => updateContent({ contact: { email: event.target.value } })} />
                        <label className="label mt-2">Address</label>
                        <input className="input" value={content.contact.address} onChange={(event) => updateContent({ contact: { address: event.target.value } })} />
                      </div>
                      <div>
                        <TokenInput
                          id="editor-service-areas"
                          label="Service Areas"
                          values={content.contact.serviceAreas}
                          onChange={(next) => updateContent({ contact: { serviceAreas: next } })}
                          placeholder="Type a city or region and press Enter"
                        />
                        <label className="label mt-2">Hours (format: Day: open-close)</label>
                        <textarea className="input min-h-28" value={hoursToText(content.contact.hours)} onChange={(event) => updateContent({ contact: { hours: textToHours(event.target.value) } })} />
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-900">Section controls</p>
                      <div className="mt-2 grid gap-2">
                        {present.sections.map((section, index) => (
                          <div key={section.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                              <input type="checkbox" checked={section.enabled} onChange={(event) => applyEdit((current) => ({ ...current, sections: current.sections.map((item, idx) => (idx === index ? { ...item, enabled: event.target.checked } : item)) }))} />
                              {section.id}
                            </label>
                            <button className="button-secondary" type="button" onClick={() => moveSection(index, -1)}>Up</button>
                            <button className="button-secondary" type="button" onClick={() => moveSection(index, 1)}>Down</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button className="button-primary" type="button" onClick={() => void handleGenerateSite()} disabled={busy}>Generate Site</button>
                    </div>
                  </div>
                ) : null}
              </Panel>
            ) : null}

            {activeTab === "compliance" ? (
              <Panel title="Compliance Checks (BBB Advertising Guardrails)">
                {compliance && compliance.issues.length === 0 ? (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">No risky phrases detected in current copy.</p>
                ) : null}

                <div className="grid gap-3">
                  {(compliance?.issues || []).map((issue) => (
                    <article key={issue.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                      <p className="font-semibold text-amber-900">{riskLabel(issue)}: &quot;{issue.phrase}&quot; ({issue.field})</p>
                      <p className="mt-1 text-amber-900">Why risky: {issue.whyRisky}</p>
                      <p className="mt-1 text-amber-900">Needed substantiation: {issue.requiredSubstantiation}</p>
                      <p className="mt-1 text-amber-900">Safer rewrite: {issue.saferRewrite}</p>
                      <label className="label mt-2" htmlFor={`note-${issue.id}`}>Substantiation note</label>
                      <textarea id={`note-${issue.id}`} className="input min-h-20" value={present.substantiationNotes[issue.id] || ""} onChange={(event) => applyEdit((current) => ({ ...current, substantiationNotes: { ...current.substantiationNotes, [issue.id]: event.target.value } }))} />
                    </article>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="button-secondary" type="button" onClick={downloadComplianceSummary}>Download Compliance Summary</button>
                  <span className="text-sm text-slate-600">{missingSubstantiation.length > 0 ? `${missingSubstantiation.length} high-risk claim(s) still missing substantiation notes.` : "All high-risk claims have substantiation notes."}</span>
                </div>
              </Panel>
            ) : null}
          </div>

          <aside className="panel h-fit lg:sticky lg:top-24">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">Preview</p>
              <button className="button-primary" type="button" onClick={() => void handleGenerateSite()} disabled={busy}>Generate Site</button>
            </div>
            {previewPanelState.mode === "iframe" ? (
              <div className="overflow-hidden rounded-xl border border-slate-300">
                <iframe
                  src={previewPanelState.src}
                  className="h-[680px] w-full"
                  title="Generated site preview"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">
                {previewPanelState.message}
              </div>
            )}
          </aside>
        </section>
      )}

      <AppFooter />

      {showResetConfirm ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <p className="text-lg font-semibold text-slate-900">Reset everything?</p>
            <p className="mt-2 text-sm text-slate-700">This clears current data and generated output.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="button-secondary" type="button" onClick={() => setShowResetConfirm(false)}>Cancel</button>
              <button className="button-primary" type="button" onClick={() => void confirmReset()} disabled={busy}>Reset</button>
            </div>
          </div>
        </div>
      ) : null}

      {showRegenerateConfirm ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <p className="text-lg font-semibold text-slate-900">Regenerate from source data?</p>
            <p className="mt-2 text-sm text-slate-700">This rebuilds generated content from extracted data and your current layout preset. Existing edits will be replaced.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="button-secondary" type="button" onClick={() => setShowRegenerateConfirm(false)}>Cancel</button>
              <button className="button-primary" type="button" onClick={confirmRegenerateFromSource}>Regenerate</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

