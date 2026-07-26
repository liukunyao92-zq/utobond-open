/**
 * 模型设置页 —— 只在自部署版出现。
 *
 * 云端版的 Key 是平台的,绝不能让用户读写,所以 CLOUD_EDITION.settings = false,
 * 服务端那边也不会挂 /api/settings 路由。
 *
 * 页面只用 App.jsx 注入的全局 CSS 类,不反向依赖它的组件,避免循环引用。
 */
import React, { useEffect, useState } from "react";
import {
  Wrench, Check, X, Loader2, Sparkles, AlertTriangle, ExternalLink, Lock, KeyRound,
} from "lucide-react";
import { CAPABILITY_LIST } from "@utobond/core";

const Field = ({ label, hint, children }) => (
  <div className="sp-field">
    <div className="sp-label"><b>{label}</b>{hint && <span>{hint}</span>}</div>
    {children}
  </div>
);

export function LLMSettings({ apiFetch }) {
  const [presets, setPresets] = useState([]);
  const [cfg, setCfg] = useState(null);          // 服务端脱敏回显
  const [form, setForm] = useState({ provider: "", baseURL: "", model: "", apiKey: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");           // "test" | "save"
  const [result, setResult] = useState(null);     // 连通性测试结果
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/settings/llm")
      .then((d) => {
        setPresets(d.presets || []);
        setCfg(d.config);
        setForm({
          provider: d.config.provider || "deepseek",
          baseURL: d.config.baseURL || "",
          model: d.config.model || "",
          apiKey: "",
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [apiFetch]);

  const preset = presets.find((p) => p.id === form.provider);
  const locked = !!cfg?.locked;
  const dirty = (k, v) => {
    setSaved(false); setResult(null);
    setForm((f) => ({ ...f, [k]: v }));
  };

  /** 换供应商时把 baseURL / 模型重置成该家的默认值,少让用户手填 */
  function pickProvider(id) {
    const p = presets.find((x) => x.id === id);
    setSaved(false); setResult(null);
    setForm({ provider: id, baseURL: p?.baseURL || "", model: p?.defaultModel || "", apiKey: "" });
  }

  async function runTest() {
    setBusy("test"); setResult(null); setError("");
    try {
      setResult(await apiFetch("/settings/llm/test", { method: "POST", body: JSON.stringify(form) }));
    } catch (e) {
      setResult({ ok: false, error: e.message });
    } finally { setBusy(""); }
  }

  async function save() {
    setBusy("save"); setError("");
    try {
      const d = await apiFetch("/settings/llm", { method: "PUT", body: JSON.stringify(form) });
      setCfg(d.config);
      setForm((f) => ({ ...f, apiKey: "" })); // Key 存下后不再留在表单里
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally { setBusy(""); }
  }

  if (loading) {
    return <div className="sp-card"><div className="sp-card-bd" style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <Loader2 size={15} className="sp-spin" />读取模型配置…
    </div></div>;
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="sp-card">
        <div className="sp-card-hd">
          <div>
            <div className="sp-eyebrow" style={{ marginBottom: 2 }}>LLM PROVIDER</div>
            <div className="sp-card-title">模型设置</div>
          </div>
          <div className="r" style={{ display: "flex", gap: 6 }}>
            {cfg?.configured
              ? <span className="sp-tag profit"><Check size={11} />已配置</span>
              : <span className="sp-tag amber"><AlertTriangle size={11} />未配置</span>}
            {locked && <span className="sp-tag dark"><Lock size={11} />已锁定</span>}
          </div>
        </div>
        <div className="sp-card-bd">
          <div className="sp-note tip" style={{ marginBottom: 16 }}>
            <Sparkles size={15} />
            <div>
              这是你自己的 Key,只存在这台机器上(<code>{cfg?.configPath || "环境变量"}</code>)。
              请求由本机后端直连你选择的模型供应商,不经过乌托帮平台；仅 Ollama 模式完全离线。
              没配也能用 —— AI 能力会落到内置模板。
            </div>
          </div>

          {locked && (
            <div className="sp-note risk" style={{ marginBottom: 16 }}>
              <Lock size={15} />
              <div>部署方设置了 <code>LLM_CONFIG_LOCKED=1</code>,配置只能通过环境变量修改,这里是只读的。</div>
            </div>
          )}

          <Field label="供应商" hint="选「OpenAI 兼容」可接任意中转站">
            <select className="sp-select" value={form.provider} disabled={locked}
              onChange={(e) => pickProvider(e.target.value)}>
              {presets.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </Field>

          {preset?.note && (
            <div style={{ fontSize: 12, color: "var(--muted)", margin: "-6px 0 14px", display: "flex", gap: 8, alignItems: "center" }}>
              <span>{preset.note}</span>
              {preset.site && (
                <a href={preset.site} target="_blank" rel="noreferrer"
                  style={{ display: "inline-flex", gap: 3, alignItems: "center", color: "var(--brand)" }}>
                  拿 Key <ExternalLink size={11} />
                </a>
              )}
            </div>
          )}

          <div className="g2" style={{ display: "grid", gap: 14 }}>
            <Field label="接口地址 Base URL" hint="通常以 /v1 结尾">
              <input className="sp-input" value={form.baseURL} disabled={locked}
                placeholder="https://api.deepseek.com/v1"
                onChange={(e) => dirty("baseURL", e.target.value)} />
            </Field>
            <Field label="模型名" hint={preset?.models?.length ? "可从下拉选,也可手填" : "填供应商给的模型 ID"}>
              <input className="sp-input" value={form.model} disabled={locked} list="utobond-models"
                placeholder={preset?.defaultModel || "model-id"}
                onChange={(e) => dirty("model", e.target.value)} />
              <datalist id="utobond-models">
                {(preset?.models || []).map((m) => <option key={m} value={m} />)}
              </datalist>
            </Field>
          </div>

          <Field label="API Key"
            hint={cfg?.hasKey ? `已保存 ${cfg.keyMasked},留空表示不修改` : (preset?.keyOptional ? "本机模型可留空" : "必填")}>
            <input className="sp-input" type="password" autoComplete="off" value={form.apiKey} disabled={locked}
              placeholder={cfg?.hasKey ? "••••••••(留空则沿用已保存的)" : (preset?.keyHint || "sk-…")}
              onChange={(e) => dirty("apiKey", e.target.value)} />
          </Field>

          <div style={{ display: "flex", gap: 9, marginTop: 4, flexWrap: "wrap" }}>
            <button className="sp-btn" onClick={runTest} disabled={locked || !!busy}>
              {busy === "test" ? <Loader2 size={15} className="sp-spin" /> : <KeyRound size={15} />}
              {busy === "test" ? "连接中…" : "测试连接"}
            </button>
            <button className="sp-btn pri" onClick={save} disabled={locked || !!busy}>
              {busy === "save" ? <Loader2 size={15} className="sp-spin" /> : <Check size={15} />}
              保存
            </button>
            {saved && <span className="sp-tag profit"><Check size={11} />已保存,立即生效</span>}
          </div>

          {error && (
            <div className="sp-note risk" style={{ marginTop: 14 }}>
              <X size={15} /><div>{error}</div>
            </div>
          )}

          {result && (
            <div className={`sp-note ${result.ok ? "win" : "risk"}`} style={{ marginTop: 14 }}>
              {result.ok ? <Check size={15} /> : <X size={15} />}
              <div>
                {result.ok
                  ? <>连通正常 · {result.model} · {result.ms}ms{result.sample ? ` · 模型回了「${result.sample}」` : ""}</>
                  : <>{result.error}</>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="sp-card">
        <div className="sp-card-hd">
          <div>
            <div className="sp-eyebrow" style={{ marginBottom: 2 }}>CAPABILITIES</div>
            <div className="sp-card-title">这套配置会被哪些能力用到</div>
          </div>
          <div className="r"><span className="sp-tag"><Wrench size={11} />{CAPABILITY_LIST.length} 项</span></div>
        </div>
        <div className="sp-card-bd" style={{ padding: 0 }}>
          <table className="sp-tbl">
            <thead><tr><th>能力</th><th>所在页面</th><th className="r">单次上限</th></tr></thead>
            <tbody>
              {CAPABILITY_LIST.map((c) => (
                <tr key={c.id}>
                  <td>{c.label}</td>
                  <td style={{ color: "var(--muted)" }}>{c.page}</td>
                  <td className="r num">{c.maxTokens} tok</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "12px 16px", fontSize: 12, color: "var(--muted)", borderTop: "1px solid var(--line)" }}>
            任一能力调用失败(超时、解析不出 JSON、没配 Key)都会自动落到内置模板,流程不会中断。
          </div>
        </div>
      </div>
    </div>
  );
}
