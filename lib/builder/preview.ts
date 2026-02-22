export type PreviewPanelState =
  | { mode: "placeholder"; message: string }
  | { mode: "iframe"; src: string };

const DEFAULT_PLACEHOLDER = "No preview yet. Click Generate Site.";

export function getPreviewPanelState(hasGeneratedPreview: boolean, previewUrl: string): PreviewPanelState {
  const src = previewUrl.trim();
  if (!hasGeneratedPreview || !src) {
    return { mode: "placeholder", message: DEFAULT_PLACEHOLDER };
  }
  return { mode: "iframe", src };
}
