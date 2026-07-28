/** 数据存储设置：本地默认 SQLite，也可连接自建 MySQL。 */
import React, { useEffect, useState } from "react";
import {
  Check, X, Loader2, Database, HardDrive, Server, KeyRound, Lock, ShieldCheck,
} from "lucide-react";

const EMPTY_MYSQL = {
  host: "127.0.0.1", port: 3306, database: "utobond", user: "utobond",
  password: "", ssl: false,
};

const Field = ({ label, hint, children }) => (
  <div className="sp-field">
    <div className="sp-label"><b>{label}</b>{hint && <span>{hint}</span>}</div>
    {children}
  </div>
);

function toForm(config) {
  return {
    driver: config?.driver || "sqlite",
    sqlitePath: config?.sqlitePath || "",
    mysql: { ...EMPTY_MYSQL, ...(config?.mysql || {}), password: "" },
  };
}

export function StorageSettings({ apiFetch }) {
  const [cfg, setCfg] = useState(null);
  const [form, setForm] = useState(toForm(null));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/settings/storage")
      .then((data) => { setCfg(data.config); setForm(toForm(data.config)); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [apiFetch]);

  const locked = !!cfg?.locked;
  const set = (key, value) => {
    setSaved(null); setResult(null);
    setForm((current) => ({ ...current, [key]: value }));
  };
  const setMysql = (key, value) => {
    setSaved(null); setResult(null);
    setForm((current) => ({ ...current, mysql: { ...current.mysql, [key]: value } }));
  };

  async function testConnection() {
    setBusy("test"); setError(""); setResult(null);
    try {
      setResult(await apiFetch("/settings/storage/test", {
        method: "POST", body: JSON.stringify(form),
      }));
    } catch (e) {
      setResult({ ok: false, error: e.message });
    } finally { setBusy(""); }
  }

  async function save() {
    setBusy("save"); setError(""); setSaved(null);
    try {
      const data = await apiFetch("/settings/storage", {
        method: "PUT", body: JSON.stringify(form),
      });
      setCfg(data.config);
      setForm(toForm(data.config));
      setSaved({ migrated: data.migrated, warning: data.warning });
    } catch (e) {
      setError(e.message);
    } finally { setBusy(""); }
  }

  if (loading) {
    return <div className="sp-card"><div className="sp-card-bd" style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <Loader2 size={15} className="sp-spin" />读取存储配置…
    </div></div>;
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="sp-card">
        <div className="sp-card-hd">
          <div>
            <div className="sp-eyebrow" style={{ marginBottom: 2 }}>DATA STORAGE</div>
            <div className="sp-card-title">数据存储</div>
          </div>
          <div className="r">
            <span className="sp-tag profit"><Database size={11} />当前使用 {cfg?.driver === "mysql" ? "MySQL" : "SQLite"}</span>
            {locked && <span className="sp-tag dark"><Lock size={11} />已锁定</span>}
          </div>
        </div>
        <div className="sp-card-bd">
          <div className="sp-note win" style={{ marginBottom: 16 }}>
            <ShieldCheck size={15} />
            <div>
              店铺、清单、预算和候选方案会自动保存。默认 SQLite 无需安装数据库；需要团队共享或独立数据库时可切换 MySQL。
            </div>
          </div>

          {locked && (
            <div className="sp-note risk" style={{ marginBottom: 16 }}>
              <Lock size={15} />
              <div>部署方设置了 <code>STORAGE_CONFIG_LOCKED=1</code>，这里只能查看，修改请使用环境变量。</div>
            </div>
          )}

          <div className="sp-grid g2" style={{ marginBottom: 18 }}>
            {[
              { id: "sqlite", title: "SQLite", desc: "开箱即用，适合单机部署", icon: HardDrive },
              { id: "mysql", title: "MySQL", desc: "适合独立数据库与团队部署", icon: Server },
            ].map((option) => {
              const selected = form.driver === option.id;
              return (
                <button key={option.id} onClick={() => set("driver", option.id)} disabled={locked}
                  style={{
                    border: `1.5px solid ${selected ? "var(--brand)" : "var(--line2)"}`,
                    background: selected ? "var(--brand-soft)" : "#fff", borderRadius: 8,
                    padding: 14, textAlign: "left", cursor: locked ? "not-allowed" : "pointer", color: "inherit",
                  }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <option.icon size={16} color="var(--brand)" /><b>{option.title}</b>
                    {selected && <span className="sp-tag profit" style={{ marginLeft: "auto" }}><Check size={10} />已选择</span>}
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 7 }}>{option.desc}</div>
                </button>
              );
            })}
          </div>

          {form.driver === "sqlite" ? (
            <>
              <Field label="SQLite 文件路径" hint="支持绝对路径或相对启动目录的路径">
                <input className="sp-input" value={form.sqlitePath} disabled={locked}
                  placeholder="apps/server/data/utobond.db"
                  onChange={(e) => set("sqlitePath", e.target.value)} />
              </Field>
              <div className="sp-note" style={{ marginBottom: 14 }}>
                <HardDrive size={15} /><div>数据库文件会自动创建，并启用 WAL 模式提升读写可靠性。</div>
              </div>
            </>
          ) : (
            <>
              <div className="g2" style={{ display: "grid", gap: 14 }}>
                <Field label="主机 Host">
                  <input className="sp-input" value={form.mysql.host} disabled={locked}
                    placeholder="127.0.0.1" onChange={(e) => setMysql("host", e.target.value)} />
                </Field>
                <Field label="端口 Port">
                  <input className="sp-input" type="number" min="1" max="65535"
                    value={form.mysql.port} disabled={locked}
                    onChange={(e) => setMysql("port", e.target.value)} />
                </Field>
                <Field label="数据库名">
                  <input className="sp-input" value={form.mysql.database} disabled={locked}
                    placeholder="utobond" onChange={(e) => setMysql("database", e.target.value)} />
                </Field>
                <Field label="用户名">
                  <input className="sp-input" value={form.mysql.user} disabled={locked}
                    placeholder="utobond" onChange={(e) => setMysql("user", e.target.value)} />
                </Field>
              </div>
              <Field label="密码"
                hint={cfg?.driver === "mysql" && cfg?.mysql?.hasPassword ? "已保存，留空表示不修改" : "必填"}>
                <input className="sp-input" type="password" autoComplete="off"
                  value={form.mysql.password} disabled={locked}
                  placeholder={cfg?.driver === "mysql" && cfg?.mysql?.hasPassword ? "••••••••（留空则沿用已保存密码）" : "MySQL 密码"}
                  onChange={(e) => setMysql("password", e.target.value)} />
              </Field>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, marginBottom: 14 }}>
                <input type="checkbox" checked={!!form.mysql.ssl} disabled={locked}
                  onChange={(e) => setMysql("ssl", e.target.checked)} />
                使用 SSL 加密连接
              </label>
            </>
          )}

          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            <button className="sp-btn" onClick={testConnection} disabled={locked || !!busy}>
              {busy === "test" ? <Loader2 size={15} className="sp-spin" /> : <KeyRound size={15} />}
              {busy === "test" ? "连接中…" : "测试连接"}
            </button>
            <button className="sp-btn pri" onClick={save} disabled={locked || !!busy}>
              {busy === "save" ? <Loader2 size={15} className="sp-spin" /> : <Check size={15} />}
              {busy === "save" ? "切换中…" : "保存并启用"}
            </button>
          </div>

          {result && (
            <div className={`sp-note ${result.ok ? "win" : "risk"}`} style={{ marginTop: 14 }}>
              {result.ok ? <Check size={15} /> : <X size={15} />}
              <div>{result.ok ? `${result.driver === "mysql" ? "MySQL" : "SQLite"} 连接正常 · ${result.ms}ms` : result.error}</div>
            </div>
          )}
          {saved && (
            <div className={`sp-note ${saved.warning ? "tip" : "win"}`} style={{ marginTop: 14 }}>
              <Check size={15} /><div>{saved.warning || (saved.migrated ? "已切换，并复制当前业务数据。" : "存储配置已保存并启用。")}</div>
            </div>
          )}
          {error && <div className="sp-note risk" style={{ marginTop: 14 }}><X size={15} /><div>{error}</div></div>}
        </div>
      </div>

      <div className="sp-card">
        <div className="sp-card-hd">
          <div>
            <div className="sp-eyebrow" style={{ marginBottom: 2 }}>PERSISTENCE</div>
            <div className="sp-card-title">会保存哪些数据</div>
          </div>
        </div>
        <div className="sp-card-bd" style={{ padding: 0 }}>
          <table className="sp-tbl">
            <thead><tr><th>数据</th><th>说明</th></tr></thead>
            <tbody>
              <tr><td>店铺与开店清单</td><td style={{ color: "var(--muted)" }}>店铺资料、任务分组、完成状态</td></tr>
              <tr><td>预算参数</td><td style={{ color: "var(--muted)" }}>线上和线下预算测算输入</td></tr>
              <tr><td>候选方案</td><td style={{ color: "var(--muted)" }}>选址或平台候选与比较结果</td></tr>
              <tr><td>AI 参谋记录</td><td style={{ color: "var(--muted)" }}>当前线上、线下会话快照</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
