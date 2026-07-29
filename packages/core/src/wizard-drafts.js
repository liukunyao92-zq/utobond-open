import { WIZ_DEFAULTS } from "./templates.js";

const MODES = ["offline", "online"];

function normalizeInfo(raw, mode) {
  const defaults = WIZ_DEFAULTS[mode];
  const source = raw && typeof raw === "object" ? raw : {};
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => {
    const value = source[key];
    if (typeof fallback === "number") {
      const number = Number(value);
      return [key, Number.isFinite(number) ? number : fallback];
    }
    return [key, typeof value === "string" ? value : fallback];
  }));
}

function normalizePlan(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.groups) || !raw.groups.length) return null;
  return raw;
}

export function newWizardDraft(mode) {
  const target = mode === "online" ? "online" : "offline";
  return { info: { ...WIZ_DEFAULTS[target] }, step: 0, plan: null };
}

export function normalizeWizardDrafts(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return Object.fromEntries(MODES.map((mode) => {
    const candidate = source[mode] && typeof source[mode] === "object" ? source[mode] : {};
    const plan = normalizePlan(candidate.plan);
    const requestedStep = Number.isInteger(candidate.step) ? candidate.step : 0;
    const step = requestedStep === 2 && !plan ? 1 : Math.max(0, Math.min(2, requestedStep));
    return [mode, { info: normalizeInfo(candidate.info, mode), step, plan }];
  }));
}
