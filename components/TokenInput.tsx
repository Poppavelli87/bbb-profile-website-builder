"use client";

import { useState } from "react";
import { addToken, normalizeTokens, removeToken } from "@/lib/shared";

type TokenInputProps = {
  id: string;
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

export function TokenInput({ id, label, values, onChange, placeholder }: TokenInputProps) {
  const [draft, setDraft] = useState("");

  function commitToken(raw: string) {
    const nextTokens = normalizeTokens(raw);
    if (nextTokens.length === 0) return;
    const merged = nextTokens.reduce((list, token) => addToken(list, token), values);
    onChange(merged);
    setDraft("");
  }

  function commitPaste(raw: string) {
    const next = normalizeTokens([...values, ...normalizeTokens(raw)]);
    onChange(next);
  }

  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="mb-2 flex flex-wrap gap-2">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
            onClick={() => onChange(removeToken(values, value))}
            aria-label={`Remove ${value}`}
            title="Remove"
          >
            <span>{value}</span>
            <span aria-hidden>x</span>
          </button>
        ))}
      </div>
      <input
        id={id}
        className="input"
        value={draft}
        placeholder={placeholder || "Type and press Enter"}
        onChange={(event) => setDraft(event.target.value)}
        onPaste={(event) => {
          const text = event.clipboardData.getData("text");
          if (/[,\n]/.test(text)) {
            event.preventDefault();
            commitPaste(text);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            commitToken(draft);
            return;
          }
          if (event.key === "Backspace" && draft.trim() === "" && values.length > 0) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={() => {
          if (draft.trim()) {
            commitToken(draft);
          }
        }}
      />
      <p className="mt-1 text-xs text-slate-500">Press Enter to add. Commas and new lines are supported on paste.</p>
    </div>
  );
}

