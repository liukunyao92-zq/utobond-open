/** 模型设置页：在本机管理多套模型连接，并明确选择当前启用项。 */
import React, { useEffect, useState } from "react";
import {
  Wrench, Check, X, Loader2, Sparkles, AlertTriangle, ExternalLink, Lock,
  KeyRound, Plus, Power, Trash2, Pencil, Server,
} from "lucide-react";
import { CAPABILITY_LIST } from "@utobond/core";

const BLANK = { name: "", provider: "", baseURL: "", model: "", apiKey: "" };

const Field = ({ label, hint, children }) => (
  <div className="sp-field">
    <div className="sp-label"><b>{label}</b>{hint && <span>{hint}</span>}</div>
    {children}
  </div>
);

export function LLMSettings({ apiFetch }) {
  const [presets, setPresets] = useState([]);
  const [cfg, setCfg] = useState(null); // 当前启用项的脱敏回显
  const [configs, setConfigs] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [selectedId, setSelectedId] = useState(null); // null 表示正在新增
  const [form, setForm] = useState(BLANK);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function formFrom(item, presetList = presets) {
    if (item) {
      return {
        name: item.name || "", provider: item.provider || "deepseek",
        baseURL: item.baseURL || "", model: item.model || "", apiKey: "",
      };
    }
    const p = presetList.find((x) => x.id === "deepseek") || presetList[0];
    return {
      ...BLANK, provider: p?.id || "deepseek", baseURL: p?.baseURL || "",
      model: p?.defaultModel || "",
    };
  }

  function applyPayload(d, preferredId) {
    const next = d.configs || [];
    setCfg(d.config || null);
    setConfigs(next);
    setActiveId(d.activeId || "");
    const wanted = preferredId && next.some((x) => x.id === preferredId)
      ? preferredId : (d.activeId || next[0]?.id || null);
    setSelectedId(wanted);
    setForm(formFrom(next.find((x) => x.id === wanted)));
  }

  useEffect(() => {
    apiFetch("/settings/llm")
      .then((d) => {
        const nextPresets = d.presets || [];
        setPresets(nextPresets);
        const next = d.configs || (d.config?.provider ? [d.config] : []);
        setCfg(d.config || null);
        setConfigs(next);
        setActiveId(d.activeId || d.config?.id || "");
        const initialId = d.activeId || next[0]?.id || null;
        setSelectedId(initialId);
        setForm(formFrom(next.find((x) => x.id === initialId), nextPresets));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [apiFetch]);

  const preset = presets.find((p) => p.id === form.provider);
  const selected = configs.find((item) => item.id === selectedId);
  const locked = !!cfg?.locked;

  const dirty = (key, value) => {
    setSaved(false); setResult(null);
    setForm((current) => ({ ...current, [key]: value }));
  };

  function selectConfig(item) {
    setSelectedId(item.id);
    setForm(formFrom(item));
    setSaved(false); setResult(null); setError("");
  }

  function addConfig() {
    setSelectedId(null);
    setForm(formFrom(null));
    setSaved(false); setResult(null); setError("");
  }

  /** 换供应商时补上该家的默认地址和模型，但保留用户填写的配置名称。 */
  function pickProvider(id) {
    const p = presets.find((x) => x.id === id);
    setSaved(false); setResult(null);
    setForm((current) => ({
      ...current, provider: id, baseURL: p?.baseURL || "",
      model: p?.defaultModel || "", apiKey: "",
    }));
  }

  async function runTest() {
    setBusy("test"); setResult(null); setError("");
    try {
      setResult(await apiFetch("/settings/llm/test", {
        method: "POST", body: JSON.stringify({ ...form, configId: selectedId }),
      }));
    } catch (e) {
      setResult({ ok: false, error: e.message });
    } finally { setBusy(""); }
  }

  async function save() {
    setBusy("save"); setError("");
    try {
      const path = selectedId
        ? `/settings/llm/configs/${encodeURIComponent(selectedId)}`
        : "/settings/llm/configs";
      const d = await apiFetch(path, {
        method: selectedId ? "PUT" : "POST", body: JSON.stringify(form),
      });
      applyPayload(d, d.savedId || selectedId);
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally { setBusy(""); }
  }

  async function activate(id) {
    setBusy(`activate:${id}`); setError("");
    try {
      const d = await apiFetch(`/settings/llm/configs/${encodeURIComponent(id)}/activate`, {
        method: "POST", body: "{}",
      });
      applyPayload(d, id);
      setSaved(false); setResult(null);
    } catch (e) {
      setError(e.message);
    } finally { setBusy(""); }
  }

  async function remove(item) {
    if (!window.confirm(`确定删除模型配置“${item.name}”吗？本机保存的 Key 也会一起删除。`)) return;
    setBusy(`delete:${item.id}`); setError("");
    try {
      const d = await apiFetch(`/settings/llm/configs/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      applyPayload(d);
      setSaved(false); setResult(null);
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
              ? <span className="sp-tag profit"><Check size={11} />已启用</span>
              : <span className="sp-tag amber"><AlertTriangle size={11} />未启用可用配置</span>}
            {locked && <span className="sp-tag dark"><Lock size={11} />已锁定</span>}
          </div>
        </div>
        <div className="sp-card-bd">
          <div className="sp-note tip" style={{ marginBottom: 16 }}>
            <Sparkles size={15} />
            <div>
              每套 API 配置和 Key 都只保存在这台机器上（<code>{cfg?.configPath || "环境变量"}</code>）。
              AI 请求只使用标记为“当前启用”的一套配置；切换立即生效，不需要重启。
            </div>
          </div>

          {locked && (
            <div className="sp-note risk" style={{ marginBottom: 16 }}>
              <Lock size={15} />
              <div>部署方设置了 <code>LLM_CONFIG_LOCKED=1</code>，配置只能通过环境变量修改，这里是只读的。</div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 650, fontSize: 13.5 }}>已保存的 API</div>
              <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>
                {configs.length ? `${configs.length} 套配置，任一时刻仅启用一套` : "还没有配置，新增后即可启用"}
              </div>
            </div>
            <button className="sp-btn sm" style={{ marginLeft: "auto" }} onClick={addConfig}
              disabled={locked || !!busy}>
              <Plus size={14} />新增配置
            </button>
          </div>

          {configs.length > 0 && (
            <div className="sp-grid g2" style={{ marginBottom: 18 }}>
              {configs.map((item) => {
                const isActive = item.id === activeId;
                const isSelected = item.id === selectedId;
                const providerLabel = presets.find((p) => p.id === item.provider)?.label || item.provider;
                return (
                  <div key={item.id} style={{
                    border: `1.5px solid ${isSelected ? "var(--brand)" : "var(--line2)"}`,
                    background: isSelected ? "var(--brand-soft)" : "#fff",
                    borderRadius: 8, padding: 12, minWidth: 0,
                  }}>
                    <button onClick={() => selectConfig(item)} disabled={!!busy}
                      style={{ border: 0, padding: 0, width: "100%", background: "transparent", color: "inherit", cursor: "pointer", textAlign: "left" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Server size={15} color="var(--brand)" />
                        <b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>{item.name}</b>
                        {isActive && <span className="sp-tag profit" style={{ marginLeft: "auto" }}><Power size={10} />当前启用</span>}
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {providerLabel} · {item.model || "未填写模型"} · {item.hasKey ? item.keyMasked : "未保存 Key"}
                      </div>
                    </button>
                    <div style={{ display: "flex", gap: 6, marginTop: 10, borderTop: "1px solid var(--line)", paddingTop: 9 }}>
                      {!isActive && (
                        <button className="sp-btn sm pri" onClick={() => activate(item.id)} disabled={locked || !!busy || !item.configured}>
                          {busy === `activate:${item.id}` ? <Loader2 size={13} className="sp-spin" /> : <Power size={13} />}启用
                        </button>
                      )}
                      <button className="sp-btn sm" onClick={() => selectConfig(item)} disabled={!!busy}>
                        <Pencil size={13} />编辑
                      </button>
                      <button className="sp-btn sm ghost" onClick={() => remove(item)} disabled={locked || !!busy}
                        style={{ marginLeft: "auto", color: "var(--seal)" }}>
                        {busy === `delete:${item.id}` ? <Loader2 size={13} className="sp-spin" /> : <Trash2 size={13} />}删除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ fontWeight: 650, fontSize: 13.5 }}>{selectedId ? "编辑配置" : "新增配置"}</div>
              {selectedId === activeId && <span className="sp-tag profit"><Power size={10} />正在使用</span>}
            </div>

            <Field label="配置名称" hint="用于在列表中识别这套 API">
              <input className="sp-input" value={form.name} disabled={locked}
                placeholder={preset ? `${preset.label} · ${form.model || "默认模型"}` : "例如：日常主力模型"}
                onChange={(e) => dirty("name", e.target.value)} />
            </Field>

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
              <Field label="模型名" hint={preset?.models?.length ? "可从下拉选，也可手填" : "填供应商给的模型 ID"}>
                <input className="sp-input" value={form.model} disabled={locked} list="utobond-models"
                  placeholder={preset?.defaultModel || "model-id"}
                  onChange={(e) => dirty("model", e.target.value)} />
                <datalist id="utobond-models">
                  {(preset?.models || []).map((model) => <option key={model} value={model} />)}
                </datalist>
              </Field>
            </div>

            <Field label="API Key"
              hint={selected?.hasKey ? `已保存 ${selected.keyMasked}，留空表示不修改` : (preset?.keyOptional ? "本机模型可留空" : "必填")}>
              <input className="sp-input" type="password" autoComplete="off" value={form.apiKey} disabled={locked}
                placeholder={selected?.hasKey ? "••••••••（留空则沿用这条配置的 Key）" : (preset?.keyHint || "sk-…")}
                onChange={(e) => dirty("apiKey", e.target.value)} />
            </Field>

            <div style={{ display: "flex", gap: 9, marginTop: 4, flexWrap: "wrap" }}>
              <button className="sp-btn" onClick={runTest} disabled={locked || !!busy}>
                {busy === "test" ? <Loader2 size={15} className="sp-spin" /> : <KeyRound size={15} />}
                {busy === "test" ? "连接中…" : "测试连接"}
              </button>
              <button className="sp-btn pri" onClick={save} disabled={locked || !!busy}>
                {busy === "save" ? <Loader2 size={15} className="sp-spin" /> : <Check size={15} />}
                {selectedId ? "保存修改" : "保存配置"}
              </button>
              {saved && <span className="sp-tag profit"><Check size={11} />已保存</span>}
            </div>

            {error && (
              <div className="sp-note risk" style={{ marginTop: 14 }}>
                <X size={15} /><div>{error}</div>
              </div>
            )}

            {result && (
              <div className={`sp-note ${result.ok ? "win" : "risk"}`} style={{ marginTop: 14 }}>
                {result.ok ? <Check size={15} /> : <X size={15} />}
                <div>{result.ok
                  ? <>连通正常 · {result.model} · {result.ms}ms{result.sample ? ` · 模型回了「${result.sample}」` : ""}</>
                  : result.error}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="sp-card">
        <div className="sp-card-hd">
          <div>
            <div className="sp-eyebrow" style={{ marginBottom: 2 }}>CAPABILITIES</div>
            <div className="sp-card-title">当前启用配置会被哪些能力用到</div>
          </div>
          <div className="r"><span className="sp-tag"><Wrench size={11} />{CAPABILITY_LIST.length} 项</span></div>
        </div>
        <div className="sp-card-bd" style={{ padding: 0 }}>
          <table className="sp-tbl">
            <thead><tr><th>能力</th><th>所在页面</th><th className="r">单次上限</th></tr></thead>
            <tbody>
              {CAPABILITY_LIST.map((capability) => (
                <tr key={capability.id}>
                  <td>{capability.label}</td>
                  <td style={{ color: "var(--muted)" }}>{capability.page}</td>
                  <td className="r num">{capability.maxTokens} tok</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "12px 16px", fontSize: 12, color: "var(--muted)", borderTop: "1px solid var(--line)" }}>
            任一能力调用失败（超时、解析不出 JSON、没配 Key）都会自动落到内置模板，流程不会中断。
          </div>
        </div>
      </div>
    </div>
  );
}
