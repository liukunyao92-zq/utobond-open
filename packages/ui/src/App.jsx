import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Store, Globe, MapPin, Calculator, Bot, CreditCard, Sparkles, TrendingUp,
  Users, Building2, Check, X, Lock, ChevronRight, AlertTriangle, Lightbulb,
  Plus, Send, Crown, Target, Clock, Loader2, ArrowRight, ShieldAlert,
  CheckCircle2, Circle, LayoutGrid, Ruler, Receipt, Wallet, ShieldCheck, Flame,
  Radar as RadarIcon, Gauge, Search, HandHelping, Server, Activity, UserRound,
  BadgePercent, Eye, MousePointerClick, ShoppingCart, PackageCheck, Wrench,
  Megaphone, Headset, Star
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, RadarChart, PolarGrid,
  PolarAngleAxis, Radar, Cell
} from "recharts";
import {
  yuan, wan, pct, clamp, seeded, parseJSON,
  calcOffline, calcOnline, detectRisks,
  DEFAULT_OFFLINE, DEFAULT_ONLINE,
  tplChecklist, tplCampaign, WIZ_DEFAULTS, MKT_GOALS,
  PLANS, PLAN_FEATURES, CAPABILITIES,
} from "@utobond/core";
import { LOCAL_EDITION } from "./editions.js";
import { LLMSettings } from "./LLMSettings.jsx";

/* ============================================================
   乌托帮 UTOBANG — 先帮后托的开店服务台
   两条参谋主线:线下实体店(青)/ 线上店铺(黛紫)
   双视图:业务前台(商户)/ 管理后台(平台运营)
   视觉语言:工程图纸网格 + 记账凭证,等宽数字,尺寸标注
   ============================================================ */

const C = {
  seal: "#BE3A2B", profit: "#1F6B4A", amber: "#B87514",
  ink: "#16232B", muted: "#5F7078", line: "#D7DEDA",
};
const ACCENTS = {
  offline: { main: "#14606E", deep: "#0E4753", soft: "#E1EDEF", bright: "#3E97A8" },
  online: { main: "#5A4FA2", deep: "#443B80", soft: "#ECEAF7", bright: "#8F86DC" },
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap');

.sp *,.sp *::before,.sp *::after{box-sizing:border-box}
.sp{
  --ink:#16232B; --paper:#EDF0EE; --card:#fff;
  --line:#D7DEDA; --line2:#BDC8C3; --muted:#5F7078;
  --brand:#14606E; --brand-deep:#0E4753; --brand-soft:#E1EDEF; --bright:#3E97A8;
  --seal:#BE3A2B; --seal-soft:#FAEAE6;
  --profit:#1F6B4A; --profit-soft:#E5F0EA;
  --amber:#B87514; --amber-soft:#FBF0DD;
  --mono:"IBM Plex Mono","SFMono-Regular",Menlo,Consolas,monospace;
  --sans:-apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC","Helvetica Neue",Arial,sans-serif;
  font-family:var(--sans); color:var(--ink);
  display:flex; height:100%; min-height:760px; background:var(--paper);
  font-size:14px; line-height:1.6; -webkit-font-smoothing:antialiased;
}
.sp[data-line="online"]{
  --brand:#5A4FA2; --brand-deep:#443B80; --brand-soft:#ECEAF7; --bright:#8F86DC;
}
.sp button{font-family:inherit}
.sp input,.sp select,.sp textarea{font-family:inherit}

/* ---------- 侧栏 ---------- */
.sp-nav{
  width:216px; flex-shrink:0; background:#101C23; color:#B9C9CE;
  display:flex; flex-direction:column; border-right:1px solid #0A1318;
}
.sp-brand{padding:18px 16px 14px;border-bottom:1px solid #1D2E37}
.sp-brand-row{display:flex;align-items:center;gap:9px}
.sp-mark{
  width:28px;height:28px;border:1.5px solid var(--brand);border-radius:5px;
  display:grid;place-items:center;color:var(--bright);flex-shrink:0;
  background:linear-gradient(135deg,rgba(255,255,255,.06),transparent);
  transition:border-color .3s,color .3s;
}
.sp-brand-name{color:#F1F6F5;font-size:16px;font-weight:700;letter-spacing:.04em}
.sp-brand-sub{font-family:var(--mono);font-size:9px;letter-spacing:.18em;color:#5C737C;margin-top:3px;text-transform:uppercase}
.sp-viewseg{display:flex;margin:12px 12px 0;border:1px solid #22333C;border-radius:7px;overflow:hidden;background:#0B151A}
.sp-viewseg button{
  flex:1;border:0;background:transparent;color:#7E939A;padding:7px 4px;font-size:12px;
  cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;transition:all .15s;
}
.sp-viewseg button.on{background:#1D2E37;color:#fff;font-weight:600}

.sp-navlist{padding:10px;flex:1;overflow-y:auto}
.sp-navgroup{font-family:var(--mono);font-size:9.5px;letter-spacing:.15em;color:#4E656E;padding:12px 8px 6px;text-transform:uppercase;display:flex;align-items:center;gap:6px}
.sp-navgroup i{width:7px;height:7px;border-radius:2px;background:var(--bright);display:inline-block;transition:background .3s}
.sp-navitem{
  display:flex;align-items:center;gap:10px;width:100%;padding:9px 10px;
  border:0;background:transparent;color:#9FB4BA;border-radius:6px;cursor:pointer;
  font-size:13.5px;text-align:left;position:relative;transition:background .15s,color .15s;
}
.sp-navitem:hover{background:rgba(255,255,255,.05);color:#DCE8EA}
.sp-navitem.on{background:rgba(255,255,255,.08);color:#fff;font-weight:600}
.sp-navitem.on::before{content:"";position:absolute;left:-10px;top:6px;bottom:6px;width:3px;background:var(--bright);border-radius:0 2px 2px 0;transition:background .3s}
.sp-navitem .badge{
  margin-left:auto;font-family:var(--mono);font-size:9px;letter-spacing:.08em;
  border:1px solid #2A4B55;border-radius:3px;padding:1px 5px;color:#7FC2CE;
}

.sp-quota{margin:10px;padding:12px;border:1px solid #22333C;border-radius:8px;background:#0B151A}
.sp-quota-top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}
.sp-quota-label{font-family:var(--mono);font-size:9.5px;letter-spacing:.13em;color:#5C737C;text-transform:uppercase}
.sp-quota-num{font-family:var(--mono);font-size:13px;color:#DCE8EA;font-weight:600}
.sp-bar{height:4px;background:#1D2E37;border-radius:2px;overflow:hidden}
.sp-bar>i{display:block;height:100%;background:var(--bright);transition:width .4s ease,background .3s}
.sp-upsell{
  margin-top:10px;width:100%;padding:7px;border:1px solid #2A4B55;background:transparent;
  color:#7FC2CE;border-radius:6px;font-size:12px;cursor:pointer;display:flex;
  align-items:center;justify-content:center;gap:5px;transition:all .15s;
}
.sp-upsell:hover{background:var(--brand);color:#fff;border-color:var(--brand)}

/* ---------- 主区 ---------- */
.sp-main{
  flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden;
  background-color:var(--paper);
  background-image:linear-gradient(rgba(22,35,43,.05) 1px,transparent 1px),
                   linear-gradient(90deg,rgba(22,35,43,.05) 1px,transparent 1px);
  background-size:22px 22px;
}
.sp-top{
  background:#fff;border-bottom:1px solid var(--line);padding:0 22px;
  display:flex;align-items:center;gap:16px;min-height:58px;flex-wrap:wrap;
}
.sp-proj{display:flex;align-items:center;gap:10px;padding:10px 0}
.sp-proj-name{font-weight:700;font-size:15px;letter-spacing:.01em}
.sp-proj-meta{font-family:var(--mono);font-size:11px;color:var(--muted)}
.sp-seg{display:flex;border:1px solid var(--line2);border-radius:7px;overflow:hidden;background:#F5F7F6}
.sp-seg button{
  border:0;background:transparent;padding:6px 13px;font-size:12.5px;cursor:pointer;
  color:var(--muted);display:flex;align-items:center;gap:6px;transition:all .15s;
}
.sp-seg button.on{background:var(--brand);color:#fff;font-weight:600}
.sp-topright{margin-left:auto;display:flex;align-items:center;gap:10px;padding:10px 0}

.sp-body{flex:1;overflow-y:auto;padding:22px}
.sp-page{max-width:1180px;margin:0 auto;display:flex;flex-direction:column;gap:16px}
.sp-h1{font-size:21px;font-weight:700;letter-spacing:-.01em;margin:0;display:flex;align-items:center;gap:10px}
.sp-sub{color:var(--muted);font-size:13px;margin:4px 0 0}
.sp-head{display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:2px}
.sp-head .sp-actions{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.sp-linechip{
  font-family:var(--mono);font-size:10px;letter-spacing:.12em;color:#fff;
  background:var(--brand);border-radius:4px;padding:3px 8px;text-transform:uppercase;
}

/* ---------- 卡片 ---------- */
.sp-card{background:#fff;border:1px solid var(--line);border-radius:10px;box-shadow:0 1px 2px rgba(22,35,43,.04)}
.sp-card-hd{
  padding:13px 16px;border-bottom:1px solid var(--line);display:flex;
  align-items:center;gap:10px;flex-wrap:wrap;
}
.sp-card-title{font-weight:650;font-size:14px}
.sp-card-hd .r{margin-left:auto;display:flex;gap:8px;align-items:center}
.sp-card-bd{padding:16px}
.sp-eyebrow{font-family:var(--mono);font-size:10px;letter-spacing:.15em;color:var(--muted);text-transform:uppercase}

.sp-grid{display:grid;gap:14px}
.g2{grid-template-columns:repeat(2,minmax(0,1fr))}
.g3{grid-template-columns:repeat(3,minmax(0,1fr))}
.g4{grid-template-columns:repeat(4,minmax(0,1fr))}
.gside{grid-template-columns:minmax(0,1.55fr) minmax(0,1fr)}
.gform{grid-template-columns:minmax(0,1fr) minmax(0,1.35fr)}

/* ---------- 指标 ---------- */
.sp-stat{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px 15px;position:relative;overflow:hidden}
.sp-stat::after{content:"";position:absolute;left:0;top:0;bottom:0;width:2.5px;background:var(--line2)}
.sp-stat.t-brand::after{background:var(--brand)}
.sp-stat.t-profit::after{background:var(--profit)}
.sp-stat.t-seal::after{background:var(--seal)}
.sp-stat.t-amber::after{background:var(--amber)}
.sp-stat-l{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:5px}
.sp-stat-v{font-family:var(--mono);font-size:24px;font-weight:600;letter-spacing:-.02em;margin-top:5px;font-variant-numeric:tabular-nums;line-height:1.15}
.sp-stat-v small{font-size:12px;font-weight:500;color:var(--muted);margin-left:3px;letter-spacing:0}
.sp-stat-s{font-size:11.5px;color:var(--muted);margin-top:5px;font-family:var(--mono)}
.num{font-family:var(--mono);font-variant-numeric:tabular-nums}

/* ---------- 标签 ---------- */
.sp-tag{
  display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:2.5px 8px;
  border-radius:20px;border:1px solid var(--line2);color:var(--muted);
  font-family:var(--mono);letter-spacing:.02em;white-space:nowrap;
}
.sp-tag.brand{background:var(--brand-soft);border-color:var(--brand);color:var(--brand-deep)}
.sp-tag.profit{background:var(--profit-soft);border-color:#B6D5C3;color:var(--profit)}
.sp-tag.seal{background:var(--seal-soft);border-color:#EDC2BB;color:var(--seal)}
.sp-tag.amber{background:var(--amber-soft);border-color:#E7D2A6;color:var(--amber)}
.sp-tag.dark{background:var(--ink);border-color:var(--ink);color:#fff}
.sp-seal-badge{
  font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;color:var(--seal);
  border:1.5px solid var(--seal);border-radius:4px;padding:3px 8px;
  transform:rotate(-2deg);display:inline-block;opacity:.9;text-transform:uppercase;
}

/* ---------- 按钮 ---------- */
.sp-btn{
  display:inline-flex;align-items:center;justify-content:center;gap:6px;
  padding:8px 14px;border-radius:7px;font-size:13px;cursor:pointer;
  border:1px solid var(--line2);background:#fff;color:var(--ink);
  transition:all .15s;white-space:nowrap;font-weight:500;
}
.sp-btn:hover:not(:disabled){border-color:#93A5A0;background:#FAFBFA}
.sp-btn:disabled{opacity:.5;cursor:not-allowed}
.sp-btn.pri{background:var(--brand);border-color:var(--brand);color:#fff}
.sp-btn.pri:hover:not(:disabled){background:var(--brand-deep);border-color:var(--brand-deep)}
.sp-btn.dark{background:var(--ink);border-color:var(--ink);color:#fff}
.sp-btn.dark:hover:not(:disabled){background:#0A1318}
.sp-btn.ghost{border-color:transparent;background:transparent;color:var(--muted)}
.sp-btn.ghost:hover:not(:disabled){background:#E8EDEB;color:var(--ink)}
.sp-btn.sm{padding:5px 10px;font-size:12px}
.sp-btn:focus-visible{outline:2px solid var(--brand);outline-offset:2px}

/* ---------- 表单 ---------- */
.sp-field{margin-bottom:13px}
.sp-label{display:flex;align-items:baseline;gap:6px;font-size:12.5px;color:var(--muted);margin-bottom:5px}
.sp-label b{color:var(--ink);font-weight:600}
.sp-input,.sp-select{
  width:100%;padding:8px 11px;border:1px solid var(--line2);border-radius:6px;
  font-size:13.5px;background:#fff;color:var(--ink);transition:border-color .15s,box-shadow .15s;
}
.sp-input:focus,.sp-select:focus{outline:0;border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-soft)}
.sp-numwrap{position:relative;display:flex;align-items:center}
.sp-numwrap .sp-input{font-family:var(--mono);font-variant-numeric:tabular-nums;padding-right:44px}
.sp-unit{position:absolute;right:11px;font-family:var(--mono);font-size:11.5px;color:var(--muted);pointer-events:none}
.sp-range{width:100%;accent-color:var(--brand);height:4px;margin:6px 0 0}
.sp-rowsplit{display:grid;grid-template-columns:1fr 1fr;gap:10px}

/* ---------- 保本刻度尺(签名元素)---------- */
.sp-ruler{padding:8px 4px 4px}
.sp-ruler-track{position:relative;height:34px;margin:26px 0 0}
.sp-ruler-line{position:absolute;left:0;right:0;top:0;height:1.5px;background:var(--ink)}
.sp-tick{position:absolute;top:0;width:1px;background:var(--line2)}
.sp-tick.maj{background:#8FA09B}
.sp-ruler-fill{position:absolute;left:0;top:0;height:6px;background:repeating-linear-gradient(90deg,var(--brand-soft) 0 5px,transparent 5px 10px);transition:width .45s cubic-bezier(.4,0,.2,1)}
.sp-be{position:absolute;top:-22px;bottom:-14px;width:0;border-left:1.5px dashed var(--seal);transition:left .45s cubic-bezier(.4,0,.2,1)}
.sp-be-lab{
  position:absolute;top:-22px;transform:translateX(-50%);white-space:nowrap;
  font-family:var(--mono);font-size:10px;color:var(--seal);letter-spacing:.06em;
  background:#fff;padding:0 4px;transition:left .45s cubic-bezier(.4,0,.2,1);
}
.sp-cursor{position:absolute;top:-7px;transform:translateX(-50%);transition:left .45s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;align-items:center}
.sp-cursor-tri{width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid var(--profit)}
.sp-cursor-stem{width:1.5px;height:16px;background:var(--profit)}
.sp-cursor.miss .sp-cursor-tri{border-top-color:var(--seal)}
.sp-cursor.miss .sp-cursor-stem{background:var(--seal)}
.sp-cursor-lab{
  font-family:var(--mono);font-size:11px;font-weight:600;margin-top:3px;
  white-space:nowrap;background:#fff;padding:1px 5px;border-radius:3px;color:var(--profit);
}
.sp-cursor.miss .sp-cursor-lab{color:var(--seal)}
.sp-dim{position:absolute;top:20px;height:12px;transition:all .45s cubic-bezier(.4,0,.2,1)}
.sp-dim-line{position:absolute;left:0;right:0;top:6px;height:1px;background:var(--muted)}
.sp-dim-cap{position:absolute;top:0;height:12px;width:1px;background:var(--muted)}
.sp-dim-lab{
  position:absolute;top:12px;left:50%;transform:translateX(-50%);white-space:nowrap;
  font-family:var(--mono);font-size:10.5px;color:var(--muted);background:#fff;padding:0 5px;
}
.sp-ruler-scale{display:flex;justify-content:space-between;font-family:var(--mono);font-size:10px;color:var(--muted);margin-top:24px}

/* ---------- 明细表 / 后台表 ---------- */
.sp-ledger{width:100%;border-collapse:collapse;font-size:13px}
.sp-ledger th{
  text-align:left;font-family:var(--mono);font-size:10px;letter-spacing:.13em;
  color:var(--muted);font-weight:500;padding:0 0 8px;text-transform:uppercase;
  border-bottom:1px solid var(--line);
}
.sp-ledger th.r,.sp-ledger td.r{text-align:right}
.sp-ledger td{padding:8px 0;border-bottom:1px dotted var(--line)}
.sp-ledger td.r{font-family:var(--mono);font-variant-numeric:tabular-nums}
.sp-ledger tr.total td{border-bottom:0;border-top:2px solid var(--ink);font-weight:700;padding-top:11px}
.sp-ledger tr.total td.r{font-size:15px}
.sp-ledger .dim{color:var(--muted);font-size:11.5px}
.sp-tbl{width:100%;border-collapse:collapse;font-size:12.8px}
.sp-tbl th{
  text-align:left;font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;
  color:var(--muted);font-weight:500;padding:0 8px 8px;text-transform:uppercase;
  border-bottom:1px solid var(--line);
}
.sp-tbl td{padding:9px 8px;border-bottom:1px solid #EAEEEC;vertical-align:middle}
.sp-tbl tr:hover td{background:#F7FAF9}
.sp-tbl th.r,.sp-tbl td.r{text-align:right;font-family:var(--mono);font-variant-numeric:tabular-nums}

/* ---------- 列表 / 提示 ---------- */
.sp-item{
  display:flex;gap:10px;padding:11px 13px;border:1px solid var(--line);
  border-radius:8px;background:#fff;cursor:pointer;transition:all .15s;text-align:left;width:100%;
}
.sp-item:hover{border-color:var(--brand);background:#FAFCFC}
.sp-item.on{border-color:var(--brand);background:var(--brand-soft);box-shadow:inset 0 0 0 1px var(--brand)}
.sp-idx{
  font-family:var(--mono);font-size:10.5px;color:var(--muted);border:1px solid var(--line2);
  border-radius:3px;width:22px;height:22px;display:grid;place-items:center;flex-shrink:0;
}
.sp-note{
  display:flex;gap:9px;padding:10px 12px;border-radius:7px;font-size:13px;line-height:1.6;
  background:#F5F8F7;border:1px solid var(--line);
}
.sp-note.risk{background:var(--seal-soft);border-color:#EDC2BB}
.sp-note.win{background:var(--profit-soft);border-color:#B6D5C3}
.sp-note.tip{background:var(--amber-soft);border-color:#E7D2A6}
.sp-note svg{flex-shrink:0;margin-top:2px}

/* ---------- 风险卡 ---------- */
.sp-risk{
  border:1px solid var(--line);border-left-width:3px;border-radius:8px;
  padding:11px 13px;background:#fff;
}
.sp-risk.h{border-left-color:var(--seal)}
.sp-risk.m{border-left-color:var(--amber)}
.sp-risk.l{border-left-color:var(--line2)}
.sp-risk-t{display:flex;align-items:center;gap:8px;font-weight:650;font-size:13.5px}
.sp-risk-d{font-size:12.5px;color:var(--muted);margin-top:3px}
.sp-risk-f{font-size:13px;margin-top:7px;display:flex;gap:6px;align-items:flex-start}

/* ---------- AI 能力条 ---------- */
.sp-aicap{
  display:flex;gap:11px;padding:13px 14px;border:1px solid var(--line);border-radius:10px;
  background:#fff;cursor:pointer;text-align:left;transition:all .15s;align-items:flex-start;width:100%;
}
.sp-aicap:hover{border-color:var(--brand);box-shadow:0 3px 12px rgba(22,35,43,.08);transform:translateY(-1px)}
.sp-aicap-ic{
  width:32px;height:32px;border-radius:7px;background:var(--brand-soft);color:var(--brand-deep);
  display:grid;place-items:center;flex-shrink:0;
}
.sp-aicap b{font-size:13.5px;display:block}
.sp-aicap p{font-size:12px;color:var(--muted);margin:2px 0 0;line-height:1.5}

/* ---------- 漏斗 ---------- */
.sp-fn-row{display:grid;grid-template-columns:52px minmax(0,1fr) 96px;gap:10px;align-items:center;margin-bottom:9px}
.sp-fn-lab{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:5px}
.sp-fn-track{position:relative;height:26px}
.sp-fn-bar{
  position:absolute;left:0;top:0;height:100%;border-radius:4px;background:var(--brand);
  display:flex;align-items:center;padding:0 8px;color:#fff;font-family:var(--mono);
  font-size:11px;font-weight:600;min-width:58px;transition:width .5s cubic-bezier(.4,0,.2,1);
}
.sp-fn-cv{font-family:var(--mono);font-size:11px;color:var(--muted);text-align:right}
.sp-fn-cv b{color:var(--ink)}

/* ---------- 弹层 ---------- */
.sp-mask{position:fixed;inset:0;background:rgba(16,28,35,.55);display:grid;place-items:center;z-index:60;padding:20px;backdrop-filter:blur(2px)}
.sp-modal{background:#fff;border-radius:12px;width:100%;max-height:88vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.sp-modal-hd{padding:16px 20px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:10px}
.sp-modal-hd .t{font-weight:700;font-size:16px}
.sp-modal-bd{padding:20px}

/* ---------- 定价 ---------- */
.sp-plan{border:1px solid var(--line);border-radius:12px;background:#fff;padding:20px;display:flex;flex-direction:column;position:relative}
.sp-plan.hot{border:1.5px solid var(--brand);box-shadow:0 6px 24px rgba(22,35,43,.12)}
.sp-plan-flag{position:absolute;top:-10px;left:20px;background:var(--brand);color:#fff;font-family:var(--mono);font-size:10px;letter-spacing:.12em;padding:3px 9px;border-radius:4px}
.sp-price{font-family:var(--mono);font-size:32px;font-weight:600;letter-spacing:-.02em;margin:10px 0 2px}
.sp-price small{font-size:13px;color:var(--muted);font-weight:400}
.sp-plan ul{list-style:none;padding:0;margin:14px 0 18px;flex:1;display:flex;flex-direction:column;gap:9px}
.sp-plan li{display:flex;gap:8px;font-size:13px;align-items:flex-start;line-height:1.5}
.sp-plan li svg{flex-shrink:0;margin-top:3px}
.sp-plan li.off{color:#9AA8A4}

/* ---------- 对话 ---------- */
.sp-chat{display:flex;flex-direction:column;height:calc(100vh - 250px);min-height:420px}
.sp-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:14px}
.sp-msg{display:flex;gap:10px;max-width:82%}
.sp-msg.me{margin-left:auto;flex-direction:row-reverse}
.sp-av{width:28px;height:28px;border-radius:6px;display:grid;place-items:center;flex-shrink:0;background:var(--brand);color:#fff}
.sp-msg.me .sp-av{background:var(--brand-soft);color:var(--brand-deep);border:1px solid var(--brand)}
.sp-bubble{padding:10px 13px;border-radius:9px;background:#F5F8F7;border:1px solid var(--line);font-size:13.5px;line-height:1.65;white-space:pre-wrap}
.sp-msg.me .sp-bubble{background:var(--ink);color:#fff;border-color:var(--ink)}
.sp-composer{border-top:1px solid var(--line);padding:12px 16px;display:flex;gap:9px;align-items:flex-end;background:#fff;border-radius:0 0 10px 10px}
.sp-composer textarea{
  flex:1;resize:none;border:1px solid var(--line2);border-radius:7px;padding:9px 11px;
  font-size:13.5px;max-height:110px;min-height:38px;line-height:1.5;
}
.sp-composer textarea:focus{outline:0;border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-soft)}
.sp-chip{
  border:1px solid var(--line2);background:#fff;border-radius:20px;padding:5px 11px;
  font-size:12px;cursor:pointer;color:var(--muted);transition:all .15s;
}
.sp-chip:hover{border-color:var(--brand);color:var(--brand-deep);background:var(--brand-soft)}

/* ---------- 其他 ---------- */
.sp-empty{text-align:center;padding:40px 20px;color:var(--muted)}
.sp-empty h4{color:var(--ink);font-size:15px;margin:12px 0 5px}
.sp-empty p{font-size:13px;margin:0 auto;max-width:340px}
.sp-spin{animation:sp-rot 1s linear infinite}
@keyframes sp-rot{to{transform:rotate(360deg)}}
.sp-dial{position:relative;flex-shrink:0}
.sp-dial-v{
  position:absolute;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center;font-family:var(--mono);
}
.sp-dial-v b{font-size:29px;font-weight:600;letter-spacing:-.02em;line-height:1}
.sp-dial-v span{font-size:9.5px;letter-spacing:.13em;color:var(--muted);margin-top:4px}
.sp-todo{display:flex;align-items:flex-start;gap:9px;padding:9px 0;border-bottom:1px dotted var(--line);cursor:pointer;background:none;border-left:0;border-right:0;border-top:0;width:100%;text-align:left;font-size:13px}
.sp-todo.done{color:#9AA8A4;text-decoration:line-through}
.sp-tt{background:#fff;border:1px solid var(--line);border-radius:7px;padding:9px 11px;font-size:12px;box-shadow:0 4px 14px rgba(0,0,0,.1)}
.sp-tt .k{font-family:var(--mono);color:var(--muted);font-size:10.5px;letter-spacing:.08em}
.sp-tt .v{font-family:var(--mono);font-weight:600}

@media (max-width:980px){
  .sp{flex-direction:column;height:auto}
  .sp-nav{width:100%;flex-direction:column;border-right:0;border-bottom:1px solid #0A1318}
  .sp-navlist{display:flex;padding:8px;gap:4px;flex-wrap:wrap}
  .sp-navgroup{display:none}
  .sp-navitem{white-space:nowrap;width:auto}
  .sp-navitem.on::before{display:none}
  .sp-quota{display:none}
  .gside,.gform,.g4,.g3,.g2{grid-template-columns:minmax(0,1fr)}
  .sp-body{padding:14px}
  .sp-chat{height:auto;min-height:480px}
}
@media (prefers-reduced-motion:reduce){
  .sp *{transition:none!important;animation:none!important}
}
`;

/* ---------------- AI ---------------- */
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) || "/api";

/**
 * 前端永远不碰模型,只认自家网关。
 * 云端版要带登录态,所以请求头由外壳注入,这里不写死。
 */
const api = { base: API_BASE, headers: () => ({}) };
export function configureApi(patch = {}) { Object.assign(api, patch); }

export async function apiFetch(path, init = {}) {
  const res = await fetch(`${api.base}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...api.headers(), ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.code = data.code;
    throw err;
  }
  return data;
}

/**
 * capability 会一起发给网关:本地版只用来做日志,
 * 云端版据此判档位、扣额度、归因成本。
 */
async function callAI(capability, messages, system, maxTokens) {
  const data = await apiFetch("/ai/complete", {
    method: "POST",
    body: JSON.stringify({
      messages, system, capability,
      maxTokens: maxTokens || CAPABILITIES[capability]?.maxTokens || 1000,
    }),
  });
  return data.text || "";
}

/**
 * 校验一份持久化下来的店铺数据。缺关键字段就丢掉,让用户回到开店向导重来,
 * 好过带着半截数据渲染出一堆 undefined。
 */
function validStore(s) {
  if (!s || typeof s !== "object") return null;
  if (!s.info?.name || !Array.isArray(s.groups)) return null;
  return { tips: [], source: "tpl", done: {}, opened: false, ...s };
}

/* ---------------- 通用组件 ---------------- */
const AppCtx = React.createContext(null);
const useApp = () => React.useContext(AppCtx);

function Btn({ variant = "", size = "", icon: Icon, children, ...rest }) {
  return (
    <button className={`sp-btn ${variant} ${size}`} {...rest}>
      {Icon && <Icon size={size === "sm" ? 13 : 15} strokeWidth={2} />}
      {children}
    </button>
  );
}
function Card({ title, eyebrow, right, children, noPad, style }) {
  return (
    <div className="sp-card" style={style}>
      {(title || right) && (
        <div className="sp-card-hd">
          <div>
            {eyebrow && <div className="sp-eyebrow" style={{ marginBottom: 2 }}>{eyebrow}</div>}
            <div className="sp-card-title">{title}</div>
          </div>
          {right && <div className="r">{right}</div>}
        </div>
      )}
      <div className="sp-card-bd" style={noPad ? { padding: 0 } : undefined}>{children}</div>
    </div>
  );
}
function Stat({ label, value, unit, sub, tone = "", icon: Icon }) {
  return (
    <div className={`sp-stat ${tone}`}>
      <div className="sp-stat-l">{Icon && <Icon size={13} />}{label}</div>
      <div className="sp-stat-v">{value}{unit && <small>{unit}</small>}</div>
      {sub && <div className="sp-stat-s">{sub}</div>}
    </div>
  );
}
function Tag({ tone = "", children }) {
  return <span className={`sp-tag ${tone}`}>{children}</span>;
}
function Field({ label, hint, children }) {
  return (
    <div className="sp-field">
      <div className="sp-label"><b>{label}</b>{hint && <span>{hint}</span>}</div>
      {children}
    </div>
  );
}
function NumIn({ value, onChange, unit, step = 1, min = 0 }) {
  return (
    <div className="sp-numwrap">
      <input className="sp-input" type="number" value={value} step={step} min={min}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} />
      {unit && <span className="sp-unit">{unit}</span>}
    </div>
  );
}
function RateIn({ value, onChange, min = 0, max = 100, step = 0.1, unit = "%" }) {
  return (
    <>
      <div className="sp-numwrap">
        <input className="sp-input" type="number" value={(value * 100).toFixed(step < 1 ? 1 : 0)}
          step={step} min={min} max={max}
          onChange={(e) => onChange(clamp(Number(e.target.value || 0) / 100, 0, 1))} />
        <span className="sp-unit">{unit}</span>
      </div>
      <input className="sp-range" type="range" min={min} max={max} step={step}
        value={value * 100} onChange={(e) => onChange(Number(e.target.value) / 100)} />
    </>
  );
}
function Modal({ open, onClose, title, icon: Icon, children, width = 560 }) {
  const { accent } = useApp() || { accent: ACCENTS.offline };
  if (!open) return null;
  return (
    <div className="sp-mask" onClick={onClose}>
      <div className="sp-modal" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="sp-modal-hd">
          {Icon && <Icon size={17} color={accent.main} />}
          <div className="t">{title}</div>
          <Btn variant="ghost" size="sm" onClick={onClose} style={{ marginLeft: "auto" }}><X size={15} /></Btn>
        </div>
        <div className="sp-modal-bd">{children}</div>
      </div>
    </div>
  );
}
function Empty({ icon: Icon = LayoutGrid, title, desc, action }) {
  return (
    <div className="sp-empty">
      <Icon size={26} strokeWidth={1.4} color={C.muted} />
      <h4>{title}</h4>
      <p>{desc}</p>
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}
function Dial({ score, size = 112 }) {
  const r = 46, cir = 2 * Math.PI * r;
  const tone = score >= 75 ? C.profit : score >= 55 ? C.amber : C.seal;
  return (
    <div className="sp-dial" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 112 112">
        <circle cx="56" cy="56" r={r} fill="none" stroke="#E4E9E7" strokeWidth="7" />
        <circle cx="56" cy="56" r={r} fill="none" stroke={tone} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${(score / 100) * cir} ${cir}`} transform="rotate(-90 56 56)" />
        {Array.from({ length: 20 }, (_, i) => {
          const a = (i / 20) * 2 * Math.PI - Math.PI / 2;
          return <line key={i} x1={56 + Math.cos(a) * 53} y1={56 + Math.sin(a) * 53}
            x2={56 + Math.cos(a) * 56} y2={56 + Math.sin(a) * 56} stroke="#C6D0CC" strokeWidth="1" />;
        })}
      </svg>
      <div className="sp-dial-v"><b style={{ color: tone, fontSize: size < 100 ? 23 : 29 }}>{score}</b><span>SCORE</span></div>
    </div>
  );
}
function BreakevenRuler({ current, breakeven, fmt = yuan, unit = "元", curLabel = "当前预估", scaleUnit = "万" }) {
  const max = Math.max(current, breakeven) * 1.32 || 1;
  const cp = clamp((current / max) * 100, 0, 100);
  const bp = clamp((breakeven / max) * 100, 0, 100);
  const ok = current >= breakeven;
  const gap = Math.abs(current - breakeven);
  const lo = Math.min(cp, bp), hi = Math.max(cp, bp);
  return (
    <div className="sp-ruler">
      <div className="sp-ruler-track">
        <div className="sp-ruler-fill" style={{ width: `${cp}%` }} />
        <div className="sp-ruler-line" />
        {Array.from({ length: 41 }, (_, i) => (
          <div key={i} className={`sp-tick ${i % 5 === 0 ? "maj" : ""}`}
            style={{ left: `${(i / 40) * 100}%`, height: i % 5 === 0 ? 9 : 5, top: 1.5 }} />
        ))}
        <div className="sp-be" style={{ left: `${bp}%` }} />
        <div className="sp-be-lab" style={{ left: `${bp}%` }}>保本线 {fmt(breakeven)}</div>
        <div className={`sp-cursor ${ok ? "" : "miss"}`} style={{ left: `${cp}%` }}>
          <div className="sp-cursor-tri" /><div className="sp-cursor-stem" />
          <div className="sp-cursor-lab">{fmt(current)}</div>
        </div>
        {hi - lo > 3 && (
          <div className="sp-dim" style={{ left: `${lo}%`, width: `${hi - lo}%` }}>
            <div className="sp-dim-line" /><div className="sp-dim-cap" style={{ left: 0 }} />
            <div className="sp-dim-cap" style={{ right: 0 }} />
            <div className="sp-dim-lab" style={{ color: ok ? C.profit : C.seal }}>
              {ok ? "+" : "缺口 "}{fmt(gap)}
            </div>
          </div>
        )}
      </div>
      <div className="sp-ruler-scale">
        <span>0</span><span>{(max / 2 / (scaleUnit === "万" ? 10000 : 1)).toFixed(1)}{scaleUnit}</span>
        <span>{(max / (scaleUnit === "万" ? 10000 : 1)).toFixed(1)}{scaleUnit}</span>
      </div>
      <div style={{ marginTop: 10, fontSize: 12.5, color: ok ? C.profit : C.seal, display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
        {ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
        <span>{curLabel}{ok ? "越过保本线 " : "距保本线还差 "}</span>
        <b className="num">{fmt(gap)} {unit}</b>
        <span>{ok ? ",这部分才开始产生利润。" : ",补上才不亏。"}</span>
      </div>
    </div>
  );
}
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="sp-tt">
      <div className="k">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="v" style={{ color: p.color }}>{p.name} {yuan(p.value)}</div>
      ))}
    </div>
  );
}
function Funnel({ steps }) {
  const max = steps[0]?.v || 1;
  return (
    <div>
      {steps.map((s, i) => {
        const w = clamp((s.v / max) * 100, 7, 100);
        const cv = i > 0 && steps[i - 1].v > 0 ? (s.v / steps[i - 1].v) * 100 : null;
        return (
          <div className="sp-fn-row" key={s.n}>
            <div className="sp-fn-lab">{s.icon && <s.icon size={13} />}{s.n}</div>
            <div className="sp-fn-track">
              <div className="sp-fn-bar" style={{ width: `${w}%`, opacity: 1 - i * 0.14 }}>
                {s.v >= 10000 ? wan(s.v) + "万" : Math.round(s.v).toLocaleString("zh-CN")}
              </div>
            </div>
            <div className="sp-fn-cv">{cv != null ? <>转化 <b>{cv.toFixed(1)}%</b></> : "起点"}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ================= 前台:总览 ================= */
function Overview({ go }) {
  const { mode, calc, riskInfo, accent, store, setStore, off, on } = useApp();
  const online = mode === "online";
  const total = store.groups.reduce((a, g) => a + g.items.length, 0);
  const doneN = store.groups.reduce((a, g, gi) => a + g.items.filter((_, ii) => store.done[`${gi}-${ii}`]).length, 0);
  const prog = total ? doneN / total : 0;
  const next = [];
  store.groups.forEach((g, gi) => g.items.forEach((it, ii) => {
    if (!store.done[`${gi}-${ii}`] && next.length < 3) next.push({ ...it, g: g.name });
  }));
  const caps = [
    { k: "checklist", icon: CheckCircle2, t: "AI 开店清单", d: `${doneN}/${total} 项完成,按阶段推进` },
    { k: "budget", icon: Gauge, t: "AI 预算体检", d: "逐项比对同品类真实水平" },
    { k: "risk", icon: RadarIcon, t: "AI 风险扫描", d: `已识别 ${riskInfo.risks.length} 项,${riskInfo.risks.filter((r) => r.level === "高").length} 项高危` },
    { k: "advisor", icon: Bot, t: online ? "线上参谋" : "线下参谋", d: "把清单里任何一项聊透" },
  ];
  return (
    <div className="sp-page">
      <div className="sp-head">
        <div>
          <h2 className="sp-h1">
            {store.info.name}
            <span className="sp-linechip">{online ? "线上主线" : "线下主线"}</span>
            <Tag tone={store.opened ? "profit" : "amber"}>{store.opened ? "营业中" : "筹备中"}</Tag>
          </h2>
          <p className="sp-sub">{store.info.category} · {store.info.core}</p>
        </div>
        <div className="sp-actions">
          <Btn icon={Calculator} onClick={() => go("budget")}>调整测算</Btn>
          <Btn variant="pri" icon={Sparkles} onClick={() => go("advisor")}>问问{online ? "线上" : "线下"}参谋</Btn>
        </div>
      </div>

      <div className="sp-grid g4">
        {caps.map((c) => (
          <button key={c.k} className="sp-aicap" onClick={() => go(c.k)}>
            <div className="sp-aicap-ic"><c.icon size={16} /></div>
            <div style={{ flex: 1, minWidth: 0 }}><b>{c.t}</b><p>{c.d}</p></div>
            <ChevronRight size={14} color={C.muted} style={{ marginTop: 8, flexShrink: 0 }} />
          </button>
        ))}
      </div>

      <div className="sp-grid g4">
        <Stat tone="t-brand" icon={Wallet} label="启动资金需求" value={wan(calc.startup)} unit="万"
          sub={`一次性 ${wan(calc.oneTime)}万 + 备用金 ${wan(calc.reserve)}万`} />
        <Stat tone="t-seal" icon={Target} label={online ? "保本月 GMV" : "保本月营业额"} value={wan(calc.beRevenue)} unit="万"
          sub={online ? `约 ${Math.round(calc.beOrders)} 单/月` : `日均 ${Math.round(calc.beDaily)} 人`} />
        <Stat tone={calc.net > 0 ? "t-profit" : "t-seal"} icon={TrendingUp} label="满产月净利"
          value={yuan(calc.net)} unit="元" sub={calc.net > 0 ? "按当前假设满产测算" : "当前假设下亏损"} />
        <Stat tone="t-amber" icon={ShieldAlert} label="风险健康分"
          value={riskInfo.score} unit="/100" sub={`${riskInfo.risks.filter((r) => r.level === "高").length} 高 · ${riskInfo.risks.filter((r) => r.level === "中").length} 中 · ${riskInfo.risks.filter((r) => r.level === "低").length} 低`} />
      </div>

      <div className="sp-grid gside">
        <Card title="离保本还有多远" eyebrow="BREAK-EVEN"
          right={<Tag tone={calc.revenue >= calc.beRevenue ? "profit" : "seal"}>
            {calc.revenue >= calc.beRevenue ? "已过线" : "未过线"}</Tag>}>
          <BreakevenRuler current={calc.revenue} breakeven={calc.beRevenue}
            curLabel={online ? "预估月 GMV" : "预估月营业额"} />
          <div style={{ marginTop: 18, height: 158 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={calc.flow} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="cf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent.main} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={accent.main} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.line} strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="m" tick={{ fontSize: 10, fill: C.muted, fontFamily: "monospace" }} axisLine={{ stroke: C.line }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.muted, fontFamily: "monospace" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => (v / 10000).toFixed(0) + "万"} />
                <Tooltip content={<ChartTip />} />
                <ReferenceLine y={0} stroke={C.seal} strokeDasharray="4 3" />
                <Area type="monotone" dataKey="累计现金" stroke={accent.main} strokeWidth={2} fill="url(#cf)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="sp-eyebrow" style={{ marginTop: 6 }}>12 个月累计现金流(含爬坡期)</div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {store.opened ? (
            <Card title="运营托" eyebrow="OPERATING" right={<Tag tone="profit">已解锁</Tag>}>
              <p style={{ fontSize: 13, color: C.muted, margin: "0 0 12px" }}>店已经开起来了,重心从「算得准」转到「跑得稳」。</p>
              <button className="sp-item" style={{ marginBottom: 8 }} onClick={() => go("ops")}>
                <div className="sp-aicap-ic"><Activity size={15} /></div>
                <div style={{ flex: 1 }}><b style={{ fontSize: 13.5 }}>日常运营</b>
                  <div style={{ fontSize: 12, color: C.muted }}>本周待办 + AI 运营诊断</div></div>
                <ChevronRight size={14} color={C.muted} style={{ marginTop: 8 }} />
              </button>
              <button className="sp-item" onClick={() => go("report")}>
                <div className="sp-aicap-ic"><TrendingUp size={15} /></div>
                <div style={{ flex: 1 }}><b style={{ fontSize: 13.5 }}>数据报表</b>
                  <div style={{ fontSize: 12, color: C.muted }}>{online ? "GMV、漏斗与渠道结构" : "营业额、客流与时段分布"}</div></div>
                <ChevronRight size={14} color={C.muted} style={{ marginTop: 8 }} />
              </button>
              <button className="sp-item" style={{ marginTop: 8 }} onClick={() => go("marketing")}>
                <div className="sp-aicap-ic"><Megaphone size={15} /></div>
                <div style={{ flex: 1 }}><b style={{ fontSize: 13.5 }}>营销活动</b>
                  <div style={{ fontSize: 12, color: C.muted }}>AI 出一版能直接执行的活动方案</div></div>
                <ChevronRight size={14} color={C.muted} style={{ marginTop: 8 }} />
              </button>
            </Card>
          ) : (
            <Card title="开店进度" eyebrow="CHECKLIST"
              right={<Btn size="sm" variant="ghost" onClick={() => go("checklist")}>去清单<ChevronRight size={13} /></Btn>}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontSize: 13 }}>已完成 <b className="num">{doneN}</b> / {total} 项</span>
                <b className="num" style={{ color: accent.main }}>{Math.round(prog * 100)}%</b>
              </div>
              <div style={{ height: 7, background: "#EEF1EF", borderRadius: 4, overflow: "hidden", marginBottom: 13 }}>
                <div style={{ width: `${prog * 100}%`, height: "100%", background: accent.main, borderRadius: 4, transition: "width .4s" }} />
              </div>
              <div className="sp-eyebrow" style={{ marginBottom: 7 }}>接下来该做的</div>
              {next.length === 0 ? (
                <div className="sp-note win"><CheckCircle2 size={15} color={C.profit} /><div>清单全部完成。去「开店清单」页点「标记已开业」,解锁运营板块。</div></div>
              ) : next.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < next.length - 1 ? `1px dotted ${C.line}` : 0 }}>
                  <div className="sp-idx">{String(i + 1).padStart(2, "0")}</div>
                  <div style={{ flex: 1, fontSize: 13 }}>{t.t}<span style={{ color: C.muted, fontSize: 11.5, marginLeft: 7 }}>{t.g}</span></div>
                  {t.cost > 0 && <span className="num" style={{ fontSize: 12, color: C.muted }}>{yuan(t.cost)} 元</span>}
                </div>
              ))}
            </Card>
          )}

          <Card title="AI 今日提示" eyebrow="DAILY BRIEF" right={<Sparkles size={15} color={accent.main} />}>
            <div className="sp-note tip">
              <Lightbulb size={15} color={C.amber} />
              <div>{online
                ? `推广费占预估 GMV 的 ${pct(on.adSpend / calc.validGmv)}%。先把自然流量的转化率从 ${pct(on.cvr)}% 拉到 3%,再加投,同样的钱能多带三成单。`
                : `保本需要日均 ${Math.round(calc.beDaily)} 人到店,你填的假设是 ${off.daily} 人,${off.daily >= calc.beDaily ? `富余 ${off.daily - Math.round(calc.beDaily)} 人,但爬坡期通常只有六成` : `还差 ${Math.round(calc.beDaily) - off.daily} 人`}。先把工作日午市的到店率打上去。`}</div>
            </div>
            {riskInfo.risks.filter((r) => r.level === "高").slice(0, 1).map((r, i) => (
              <div key={i} className="sp-note risk" style={{ marginTop: 9 }}>
                <ShieldAlert size={15} color={C.seal} />
                <div><b>{r.title}</b> — {r.fix}<button onClick={() => go("risk")} style={{ border: 0, background: "none", color: C.seal, cursor: "pointer", padding: 0, marginLeft: 6, textDecoration: "underline", fontSize: 12.5 }}>查看全部风险</button></div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ================= 前台:选址 / 平台 ================= */
const SITE_FORM = {
  name: "文三路 · 嘉绿苑南门", circle: "社区底商",
  area: 45, rent: 12000, floor: "一层", frontage: 4.5, rivals: 3, note: "地铁口步行 6 分钟,门口有公交站",
};
const ONLINE_FORM = {
  name: "手冲咖啡器具 · 抖音+小红书",
  supply: "自有工厂", price: 89, budget: 15, content: "能拍短视频", audience: "25-35 岁一线城市女性",
};

function SiteFinder() {
  const { mode, project, sites, setSites, plan, useAI, aiLeft, openPay, accent } = useApp();
  const online = mode === "online";
  const [form, setForm] = useState(online ? ONLINE_FORM : SITE_FORM);
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const cur = sites[sel];
  const limit = PLANS[plan].sites;

  useEffect(() => { setForm(online ? ONLINE_FORM : SITE_FORM); setSel(0); setErr(""); }, [online]);

  async function run() {
    if (sites.length >= limit && !sites.find((s) => s.name === form.name)) {
      openPay(`「帮一把」只能保存 ${limit} 个候选。升级后可以并排对比多个方案。`);
      return;
    }
    if (!useAI()) return;
    setBusy(true); setErr("");
    try {
      const sys = online
        ? "你是中国电商操盘手。只输出 JSON,不要任何解释或代码块标记。字段:score(0-100整数,综合开店可行性),verdict(一句话结论,30字内),dimensions(6项数组,每项{name,score,comment},name固定为:平台匹配、货源优势、内容门槛、竞争强度、获客成本、利润空间),primary(主攻平台名),secondary(辅攻平台名),strengths(2条,各25字内),risks(2条,各25字内),actions(3条冷启动动作,各30字内),costHint(预估单个获客成本区间,20字内)"
        : "你是中国线下零售选址顾问。只输出 JSON,不要任何解释或代码块标记。字段:score(0-100整数),verdict(一句话结论,30字内),dimensions(6项数组,每项{name,score,comment},name固定为:人流量、客群匹配、竞争强度、租金性价比、门店可见度、配套证照),strengths(2条,各25字内),risks(2条,各25字内),actions(3条落地动作,各30字内),costHint(该点位合理租金区间与谈判要点,25字内)";
      const q = online
        ? `品类:${project.category};方案:${form.name};货源:${form.supply};客单价:${form.price}元;启动预算:${form.budget}万;内容能力:${form.content};目标人群:${form.audience}`
        : `城市:${project.city};品类:${project.category};点位:${form.name};商圈类型:${form.circle};面积:${form.area}㎡;月租:${form.rent}元;楼层:${form.floor};临街面:${form.frontage}米;周边同类竞品:${form.rivals}家;补充:${form.note}`;
      const rep = parseJSON(await callAI("site", [{ role: "user", content: q }], sys));
      const item = { id: Date.now(), name: form.name, report: rep, form: { ...form } };
      setSites((prev) => {
        const idx = prev.findIndex((s) => s.name === form.name);
        if (idx >= 0) { const c = [...prev]; c[idx] = item; setSel(idx); return c; }
        setSel(prev.length); return [...prev, item];
      });
    } catch (e) {
      setErr("没连上 AI,或返回格式异常。稍等片刻再试一次。");
    } finally { setBusy(false); }
  }

  return (
    <div className="sp-page">
      <div className="sp-head">
        <div>
          <h2 className="sp-h1">{online ? "平台选择" : "选址分析"}<span className="sp-linechip">{online ? "线上主线" : "线下主线"}</span></h2>
          <p className="sp-sub">{online
            ? "把货源和内容能力说清楚,AI 给出各平台匹配度和冷启动路径。"
            : "填一个真实点位,AI 从人流、客群、竞争、租金六个维度打分。"}</p>
        </div>
        <div className="sp-actions">
          <Tag>已保存 {sites.length} / {limit === Infinity ? "∞" : limit}</Tag>
          <Tag tone="brand">剩余 AI {aiLeft === Infinity ? "∞" : aiLeft} 次</Tag>
        </div>
      </div>

      <div className="sp-grid gform">
        <Card title={online ? "方案信息" : "点位信息"} eyebrow="INPUT">
          <Field label={online ? "方案名称" : "点位名称"}>
            <input className="sp-input" value={form.name} onChange={(e) => set("name")(e.target.value)} />
          </Field>
          {online ? (
            <>
              <Field label="货源类型">
                <select className="sp-select" value={form.supply} onChange={(e) => set("supply")(e.target.value)}>
                  {["自有工厂", "一件代发", "批发档口", "品牌代理", "手工自制"].map((x) => <option key={x}>{x}</option>)}
                </select>
              </Field>
              <div className="sp-rowsplit">
                <Field label="客单价"><NumIn value={form.price} onChange={set("price")} unit="元" /></Field>
                <Field label="启动预算"><NumIn value={form.budget} onChange={set("budget")} unit="万" /></Field>
              </div>
              <Field label="内容能力">
                <select className="sp-select" value={form.content} onChange={(e) => set("content")(e.target.value)}>
                  {["只能发图文", "能拍短视频", "能直播", "有专业团队"].map((x) => <option key={x}>{x}</option>)}
                </select>
              </Field>
              <Field label="目标人群">
                <input className="sp-input" value={form.audience} onChange={(e) => set("audience")(e.target.value)} />
              </Field>
            </>
          ) : (
            <>
              <Field label="商圈类型">
                <select className="sp-select" value={form.circle} onChange={(e) => set("circle")(e.target.value)}>
                  {["社区底商", "写字楼", "购物中心", "学校周边", "交通枢纽", "临街商业", "产业园区"].map((x) => <option key={x}>{x}</option>)}
                </select>
              </Field>
              <div className="sp-rowsplit">
                <Field label="使用面积"><NumIn value={form.area} onChange={set("area")} unit="㎡" /></Field>
                <Field label="月租金"><NumIn value={form.rent} onChange={set("rent")} step={500} unit="元" /></Field>
              </div>
              <div className="sp-rowsplit">
                <Field label="楼层">
                  <select className="sp-select" value={form.floor} onChange={(e) => set("floor")(e.target.value)}>
                    {["一层", "二层", "地下一层", "三层及以上"].map((x) => <option key={x}>{x}</option>)}
                  </select>
                </Field>
                <Field label="临街面"><NumIn value={form.frontage} onChange={set("frontage")} step={0.5} unit="米" /></Field>
              </div>
              <Field label="周边同类竞品"><NumIn value={form.rivals} onChange={set("rivals")} unit="家" /></Field>
              <Field label="补充说明" hint="越具体越准">
                <textarea className="sp-input" rows={2} value={form.note} onChange={(e) => set("note")(e.target.value)} />
              </Field>
            </>
          )}
          <Btn variant="pri" onClick={run} disabled={busy} style={{ width: "100%", marginTop: 4 }}>
            {busy ? <><Loader2 size={15} className="sp-spin" />正在分析…</> : <><Sparkles size={15} />生成评估报告</>}
          </Btn>
          {err && <div className="sp-note risk" style={{ marginTop: 10 }}><AlertTriangle size={15} color={C.seal} /><div>{err}</div></div>}
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {sites.length > 1 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {sites.map((s, i) => (
                <button key={s.id} className={`sp-item ${i === sel ? "on" : ""}`} style={{ width: "auto" }} onClick={() => setSel(i)}>
                  <div className="sp-idx">{String(i + 1).padStart(2, "0")}</div>
                  <div style={{ fontSize: 13 }}>{s.name}</div>
                  <b className="num" style={{ marginLeft: 8, color: s.report.score >= 75 ? C.profit : C.seal }}>{s.report.score}</b>
                </button>
              ))}
            </div>
          )}

          {!cur ? (
            <Card><Empty icon={online ? Globe : MapPin} title="还没有评估报告"
              desc={online ? "左边填完方案,点生成。AI 会比对六大平台的匹配度。" : "左边填完点位,点生成。几秒后拿到一份六维评分。"} /></Card>
          ) : (
            <>
              <Card title={cur.name} eyebrow="报告" right={<Tag tone="dark">{new Date(cur.id).toLocaleDateString("zh-CN")}</Tag>}>
                <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
                  <Dial score={cur.report.score} />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div className="sp-eyebrow">结论</div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5, marginTop: 4 }}>{cur.report.verdict}</div>
                    {online && cur.report.primary && (
                      <div style={{ display: "flex", gap: 7, marginTop: 10, flexWrap: "wrap" }}>
                        <Tag tone="brand">主攻 {cur.report.primary}</Tag>
                        <Tag>辅攻 {cur.report.secondary}</Tag>
                      </div>
                    )}
                    {cur.report.costHint && (
                      <div className="sp-note" style={{ marginTop: 11 }}>
                        <Ruler size={15} color={accent.main} /><div>{cur.report.costHint}</div>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ height: 232, marginTop: 12 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={cur.report.dimensions} outerRadius="72%">
                      <PolarGrid stroke={C.line} />
                      <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: C.muted }} />
                      <Radar dataKey="score" stroke={accent.main} fill={accent.main} fillOpacity={0.18} strokeWidth={2} />
                      <Tooltip content={<ChartTip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="sp-grid g2" style={{ marginTop: 4 }}>
                  {cur.report.dimensions?.map((d) => (
                    <div key={d.name} style={{ borderTop: `1px solid ${C.line}`, paddingTop: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                        <b>{d.name}</b>
                        <span className="num" style={{ color: d.score >= 70 ? C.profit : d.score >= 50 ? C.amber : C.seal, fontWeight: 600 }}>{d.score}</span>
                      </div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{d.comment}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="sp-grid g2">
                <Card title="值得利用的" eyebrow="STRENGTHS">
                  {cur.report.strengths?.map((s, i) => (
                    <div key={i} className="sp-note win" style={{ marginBottom: 8 }}>
                      <CheckCircle2 size={15} color={C.profit} /><div>{s}</div>
                    </div>
                  ))}
                </Card>
                <Card title="要盯住的" eyebrow="RISKS">
                  {cur.report.risks?.map((s, i) => (
                    <div key={i} className="sp-note risk" style={{ marginBottom: 8 }}>
                      <AlertTriangle size={15} color={C.seal} /><div>{s}</div>
                    </div>
                  ))}
                </Card>
              </div>

              <Card title="接下来三步" eyebrow="NEXT ACTIONS">
                {cur.report.actions?.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 11, padding: "9px 0", borderBottom: i < 2 ? `1px dotted ${C.line}` : 0 }}>
                    <div className="sp-idx">{String(i + 1).padStart(2, "0")}</div>
                    <div style={{ fontSize: 13.5, paddingTop: 1 }}>{a}</div>
                  </div>
                ))}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= 前台:预算测算 ================= */
function Budget() {
  const { mode, off, setOff, on, setOn, calc, useAI, openPay, plan, accent } = useApp();
  const online = mode === "online";
  const p = online ? on : off;
  const setP = (k) => (v) => (online ? setOn : setOff)((s) => ({ ...s, [k]: v }));
  const [diag, setDiag] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setDiag(null), [online]);

  async function check() {
    if (plan === "free") { openPay("AI 预算体检会逐项比对你的数字和同品类实际水平,「深度帮」起可用。"); return; }
    if (!useAI()) return;
    setBusy(true);
    try {
      const sys = "你是中国小微创业财务顾问。只输出 JSON,不要解释或代码块标记。字段:verdict(整体判断,20字内),score(0-100,预算合理度),issues(3项数组,每项{item,level:高/中/低,comment(30字内)}),suggestions(3条,各30字内),cashTip(现金流提醒,35字内)";
      const q = online
        ? `线上店铺:客单价${p.price}元,日均访客${p.visitors},转化率${pct(p.cvr)}%,毛利率${pct(p.gross)}%,佣金${pct(p.commission)}%,单均物流${p.shipping}元,退货率${pct(p.returnRate)}%,月推广${yuan(p.adSpend)}元,人力${p.staff}人×${yuan(p.salary)}元。启动资金${wan(calc.startup)}万,保本GMV${wan(calc.beRevenue)}万/月,预估月净利${yuan(calc.net)}元。`
        : `线下门店:${p.area}㎡,月租${yuan(p.rent)}元,装修${yuan(p.decorPerSqm)}元/㎡,设备${yuan(p.equipment)}元,客单价${p.price}元,日均客流${p.daily}人,毛利率${pct(p.gross)}%,${p.staff}人×${yuan(p.salary)}元。启动资金${wan(calc.startup)}万,保本月营业额${wan(calc.beRevenue)}万,预估月净利${yuan(calc.net)}元,回本${calc.payback ? calc.payback.toFixed(1) + "个月" : "无法回本"}。`;
      setDiag(parseJSON(await callAI("budgetAudit", [{ role: "user", content: q }], sys)));
    } catch { setDiag({ error: true }); } finally { setBusy(false); }
  }

  return (
    <div className="sp-page">
      <div className="sp-head">
        <div>
          <h2 className="sp-h1">预算测算<span className="sp-linechip">{online ? "线上主线" : "线下主线"}</span></h2>
          <p className="sp-sub">改任何一个数字,右边的账立刻重算。先把最不确定的几项试出区间。</p>
        </div>
        <div className="sp-actions">
          <Btn icon={Sparkles} onClick={check} disabled={busy}>
            {busy ? "体检中…" : "AI 预算体检"}{plan === "free" && <Lock size={12} />}
          </Btn>
        </div>
      </div>

      <div className="sp-grid gform">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card title={online ? "一次性投入" : "开店一次性投入"} eyebrow="CAPEX">
            {online ? (
              <>
                <Field label="平台保证金"><NumIn value={p.bond} onChange={setP("bond")} step={500} unit="元" /></Field>
                <Field label="首批备货"><NumIn value={p.stock} onChange={setP("stock")} step={5000} unit="元" /></Field>
                <div className="sp-rowsplit">
                  <Field label="店铺视觉"><NumIn value={p.visual} onChange={setP("visual")} step={1000} unit="元" /></Field>
                  <Field label="拍摄设备"><NumIn value={p.gear} onChange={setP("gear")} step={1000} unit="元" /></Field>
                </div>
                <Field label="软件年费"><NumIn value={p.tools} onChange={setP("tools")} step={500} unit="元" /></Field>
              </>
            ) : (
              <>
                <div className="sp-rowsplit">
                  <Field label="使用面积"><NumIn value={p.area} onChange={setP("area")} unit="㎡" /></Field>
                  <Field label="月租金"><NumIn value={p.rent} onChange={setP("rent")} step={500} unit="元" /></Field>
                </div>
                <div className="sp-rowsplit">
                  <Field label="转让费"><NumIn value={p.transfer} onChange={setP("transfer")} step={5000} unit="元" /></Field>
                  <Field label="押金月数"><NumIn value={p.depositMonths} onChange={setP("depositMonths")} unit="个月" /></Field>
                </div>
                <Field label="装修单价" hint={`合计 ${yuan(p.area * p.decorPerSqm)} 元`}>
                  <NumIn value={p.decorPerSqm} onChange={setP("decorPerSqm")} step={100} unit="元/㎡" />
                </Field>
                <div className="sp-rowsplit">
                  <Field label="设备采购"><NumIn value={p.equipment} onChange={setP("equipment")} step={5000} unit="元" /></Field>
                  <Field label="首批库存"><NumIn value={p.stock} onChange={setP("stock")} step={5000} unit="元" /></Field>
                </div>
                <div className="sp-rowsplit">
                  <Field label="证照办理"><NumIn value={p.license} onChange={setP("license")} step={500} unit="元" /></Field>
                  <Field label="开业营销"><NumIn value={p.launch} onChange={setP("launch")} step={1000} unit="元" /></Field>
                </div>
              </>
            )}
          </Card>

          <Card title="每月固定支出" eyebrow="OPEX">
            <div className="sp-rowsplit">
              <Field label="员工人数"><NumIn value={p.staff} onChange={setP("staff")} unit="人" /></Field>
              <Field label="人均月薪"><NumIn value={p.salary} onChange={setP("salary")} step={500} unit="元" /></Field>
            </div>
            {online ? (
              <>
                <Field label="月推广投流"><NumIn value={p.adSpend} onChange={setP("adSpend")} step={5000} unit="元" /></Field>
                <Field label="其他固定支出"><NumIn value={p.otherFixed} onChange={setP("otherFixed")} step={500} unit="元" /></Field>
              </>
            ) : (
              <div className="sp-rowsplit">
                <Field label="水电物业"><NumIn value={p.utility} onChange={setP("utility")} step={500} unit="元" /></Field>
                <Field label="其他固定"><NumIn value={p.otherFixed} onChange={setP("otherFixed")} step={200} unit="元" /></Field>
              </div>
            )}
            <Field label="备用金" hint="建议 3 个月固定支出"><NumIn value={p.reserveMonths} onChange={setP("reserveMonths")} unit="个月" /></Field>
          </Card>

          <Card title="经营假设" eyebrow="ASSUMPTIONS">
            <div className="sp-rowsplit">
              <Field label="客单价"><NumIn value={p.price} onChange={setP("price")} unit="元" /></Field>
              {online
                ? <Field label="日均访客"><NumIn value={p.visitors} onChange={setP("visitors")} step={100} unit="人" /></Field>
                : <Field label="日均客流"><NumIn value={p.daily} onChange={setP("daily")} unit="人" /></Field>}
            </div>
            <Field label="毛利率"><RateIn value={p.gross} onChange={setP("gross")} max={95} /></Field>
            {online ? (
              <>
                <Field label="下单转化率"><RateIn value={p.cvr} onChange={setP("cvr")} max={20} step={0.1} /></Field>
                <div className="sp-rowsplit">
                  <Field label="平台佣金"><NumIn value={(p.commission * 100).toFixed(1)} onChange={(v) => setP("commission")(v / 100)} step={0.5} unit="%" /></Field>
                  <Field label="单均物流"><NumIn value={p.shipping} onChange={setP("shipping")} step={0.5} unit="元" /></Field>
                </div>
                <Field label="退货率"><RateIn value={p.returnRate} onChange={setP("returnRate")} max={50} step={0.5} /></Field>
              </>
            ) : (
              <Field label="月营业天数"><NumIn value={p.days} onChange={setP("days")} min={1} unit="天" /></Field>
            )}
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="sp-grid g2">
            <Stat tone="t-brand" label="启动资金合计" value={wan(calc.startup)} unit="万" sub={`含 ${p.reserveMonths} 个月备用金`} />
            <Stat tone={calc.net > 0 ? "t-profit" : "t-seal"} label="满产月净利" value={yuan(calc.net)} unit="元"
              sub={calc.payback ? `约 ${calc.payback.toFixed(1)} 个月回本` : "当前假设无法回本"} />
          </div>

          <Card title={online ? "离保本 GMV 还有多远" : "离保本营业额还有多远"} eyebrow="BREAK-EVEN"
            right={<Tag tone={calc.revenue >= calc.beRevenue ? "profit" : "seal"}>
              {calc.revenue >= calc.beRevenue ? "已过线" : "未过线"}</Tag>}>
            <BreakevenRuler current={calc.revenue} breakeven={calc.beRevenue}
              curLabel={online ? "预估有效 GMV" : "预估月营业额"} />
            <div className="sp-grid g3" style={{ marginTop: 14, gap: 10 }}>
              <div><div className="sp-eyebrow">{online ? "保本单量" : "保本日客流"}</div>
                <div className="num" style={{ fontSize: 17, fontWeight: 600, marginTop: 3 }}>
                  {online ? Math.round(calc.beOrders) : Math.round(calc.beDaily)}
                  <small style={{ fontSize: 11, color: C.muted, marginLeft: 3 }}>{online ? "单/月" : "人/天"}</small></div></div>
              <div><div className="sp-eyebrow">{online ? "推广 ROI" : "坪效"}</div>
                <div className="num" style={{ fontSize: 17, fontWeight: 600, marginTop: 3 }}>
                  {online ? (isFinite(calc.roi) ? calc.roi.toFixed(2) : "—") : calc.sqmDay.toFixed(0)}
                  <small style={{ fontSize: 11, color: C.muted, marginLeft: 3 }}>{online ? "" : "元/㎡/天"}</small></div></div>
              <div><div className="sp-eyebrow">现金流转正</div>
                <div className="num" style={{ fontSize: 17, fontWeight: 600, marginTop: 3 }}>
                  {calc.breakMonth ? `第 ${calc.breakMonth}` : "> 12"}
                  <small style={{ fontSize: 11, color: C.muted, marginLeft: 3 }}>个月</small></div></div>
            </div>
          </Card>

          <Card title="12 个月现金流" eyebrow="CASH FLOW">
            <div style={{ height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calc.flow} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke={C.line} strokeDasharray="2 4" />
                  <XAxis dataKey="m" tick={{ fontSize: 10, fill: C.muted, fontFamily: "monospace" }} axisLine={{ stroke: C.line }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: C.muted, fontFamily: "monospace" }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => (v / 10000).toFixed(0) + "万"} />
                  <Tooltip content={<ChartTip />} />
                  <ReferenceLine y={0} stroke={C.seal} strokeDasharray="4 3" />
                  <Line type="monotone" dataKey="月净利" stroke={C.amber} strokeWidth={1.6} dot={false} />
                  <Line type="monotone" dataKey="累计现金" stroke={accent.main} strokeWidth={2.2} dot={{ r: 2.5, fill: accent.main }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="投入明细" eyebrow="LEDGER">
            <table className="sp-ledger">
              <thead><tr><th>项目</th><th className="r">金额 / 元</th><th className="r" style={{ width: 62 }}>占比</th></tr></thead>
              <tbody>
                {calc.items.map(([n, v, d]) => (
                  <tr key={n}><td>{n}{d && <div className="dim">{d}</div>}</td>
                    <td className="r">{yuan(v)}</td><td className="r dim">{pct(v / calc.oneTime)}%</td></tr>
                ))}
                <tr className="total"><td>一次性投入合计</td><td className="r">{yuan(calc.oneTime)}</td><td className="r"></td></tr>
              </tbody>
            </table>
            <table className="sp-ledger" style={{ marginTop: 20 }}>
              <thead><tr><th>每月固定支出</th><th className="r">金额 / 元</th><th className="r" style={{ width: 62 }}>占比</th></tr></thead>
              <tbody>
                {calc.fixedItems.map(([n, v]) => (
                  <tr key={n}><td>{n}</td><td className="r">{yuan(v)}</td><td className="r dim">{pct(v / calc.fixed)}%</td></tr>
                ))}
                <tr className="total"><td>月固定支出合计</td><td className="r">{yuan(calc.fixed)}</td><td className="r"></td></tr>
              </tbody>
            </table>
          </Card>

          {diag && (
            <Card title="AI 预算体检" eyebrow="DIAGNOSIS" right={<Sparkles size={15} color={accent.main} />}>
              {diag.error ? (
                <div className="sp-note risk"><AlertTriangle size={15} color={C.seal} /><div>没连上 AI。检查网络后重试。</div></div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
                    <Dial score={diag.score} size={88} />
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div className="sp-eyebrow">整体判断</div>
                      <div style={{ fontSize: 15, fontWeight: 600, marginTop: 3 }}>{diag.verdict}</div>
                    </div>
                  </div>
                  <table className="sp-ledger">
                    <thead><tr><th>存疑项</th><th style={{ width: 52 }}>风险</th></tr></thead>
                    <tbody>
                      {diag.issues?.map((it, i) => (
                        <tr key={i}><td><b>{it.item}</b><div className="dim">{it.comment}</div></td>
                          <td><Tag tone={it.level === "高" ? "seal" : it.level === "中" ? "amber" : ""}>{it.level}</Tag></td></tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 14 }}>
                    {diag.suggestions?.map((s, i) => (
                      <div key={i} className="sp-note win" style={{ marginBottom: 8 }}>
                        <Lightbulb size={15} color={C.profit} /><div>{s}</div></div>
                    ))}
                    {diag.cashTip && <div className="sp-note tip"><Wallet size={15} color={C.amber} /><div>{diag.cashTip}</div></div>}
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= 前台:日常运营(线下)================= */
function useOpsDiag(buildQuery) {
  const { useAI } = useApp();
  const [diag, setDiag] = useState(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    if (!useAI()) return;
    setBusy(true);
    try {
      const sys = "你是中国门店运营教练。只输出 JSON,不要解释或代码块标记。字段:summary(整体点评,35字内),highlights(2条做得好的,各25字内),problems(3项数组,每项{title(10字内),why(25字内),fix(30字内)}),todos(3条本周动作,各22字内)";
      setDiag(parseJSON(await callAI("opsDiag", [{ role: "user", content: buildQuery() }], sys)));
    } catch { setDiag({ error: true }); } finally { setBusy(false); }
  }
  return { diag, busy, run };
}

function DiagCard({ diag, busy, run, accent }) {
  if (!diag) return (
    <Card title="AI 运营诊断" eyebrow="DIAGNOSIS">
      <Empty icon={Bot} title="还没诊断过这个月"
        desc="AI 会拿这 30 天的曲线,找出掉单的那几天在发生什么,给三条本周能做的动作。"
        action={<Btn variant="pri" icon={busy ? Loader2 : Sparkles} onClick={run} disabled={busy}>{busy ? "诊断中…" : "开始诊断"}</Btn>} />
    </Card>
  );
  return (
    <Card title="AI 运营诊断" eyebrow="DIAGNOSIS" right={<Sparkles size={15} color={accent.main} />}>
      {diag.error ? (
        <div className="sp-note risk"><AlertTriangle size={15} color={C.seal} /><div>没连上 AI。检查网络后重试。</div></div>
      ) : (
        <>
          <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 12, lineHeight: 1.55 }}>{diag.summary}</div>
          {diag.highlights?.map((h, i) => (
            <div key={i} className="sp-note win" style={{ marginBottom: 8 }}>
              <CheckCircle2 size={15} color={C.profit} /><div>{h}</div></div>
          ))}
          <div style={{ marginTop: 14 }}>
            {diag.problems?.map((pb, i) => (
              <div key={i} style={{ borderLeft: `2px solid ${C.seal}`, paddingLeft: 12, marginBottom: 14 }}>
                <div style={{ fontWeight: 650, fontSize: 13.5 }}>{pb.title}</div>
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>{pb.why}</div>
                <div style={{ fontSize: 13, marginTop: 6, display: "flex", gap: 6 }}>
                  <ArrowRight size={14} color={accent.main} style={{ flexShrink: 0, marginTop: 3 }} />{pb.fix}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function TodoCard({ todos, setTodos, aiTodos }) {
  return (
    <Card title="本周待办" eyebrow="TODO" right={<Tag>{todos.filter((t) => t.d).length}/{todos.length}</Tag>}>
      {todos.map((t, i) => (
        <button key={i} className={`sp-todo ${t.d ? "done" : ""}`}
          onClick={() => setTodos((p) => p.map((x, j) => (j === i ? { ...x, d: !x.d } : x)))}>
          {t.d ? <CheckCircle2 size={16} color={C.profit} style={{ flexShrink: 0, marginTop: 1 }} />
            : <Circle size={16} color={C.line} style={{ flexShrink: 0, marginTop: 1 }} />}
          <span>{t.t}</span>
        </button>
      ))}
      {aiTodos && (
        <div style={{ marginTop: 12 }}>
          <div className="sp-eyebrow" style={{ marginBottom: 7 }}>AI 建议加入</div>
          {aiTodos.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0" }}>
              <span style={{ fontSize: 13, flex: 1 }}>{t}</span>
              <Btn size="sm" variant="ghost" icon={Plus}
                onClick={() => setTodos((p) => [...p, { t, d: false }])}>加入</Btn>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---- 模拟经营数据(开业后)---- */
function useOfflineSim() {
  const { calc, off } = useApp();
  const days = useMemo(() => {
    const rnd = seeded(421);
    const base = calc.revenue / 30;
    return Array.from({ length: 30 }, (_, i) => {
      const wk = [0, 6].includes((i + 2) % 7) ? 1.28 : 0.92;
      const rev = base * wk * (0.82 + rnd() * 0.38);
      return { d: `${i + 1}`, 营业额: Math.round(rev), 客流: Math.max(1, Math.round(rev / off.price)), 保本线: Math.round(calc.beRevenue / 30) };
    });
  }, [calc.revenue, calc.beRevenue, off.price]);
  const hours = useMemo(() => {
    const rnd = seeded(88);
    return Array.from({ length: 14 }, (_, i) => {
      const h = i + 8;
      const peak = h >= 11 && h <= 13 ? 2.6 : h >= 17 && h <= 19 ? 2.1 : h >= 14 && h <= 16 ? 0.7 : 1;
      return { h: `${h}时`, 客流: Math.round((off.daily / 14) * peak * (0.85 + rnd() * 0.3)) };
    });
  }, [off.daily]);
  const mtd = days.reduce((a, b) => a + b.营业额, 0);
  const traffic = days.reduce((a, b) => a + b.客流, 0);
  return { days, hours, mtd, traffic, hit: mtd / calc.beRevenue, overDays: days.filter((d) => d.营业额 >= d.保本线).length };
}
const ONLINE_CHANNELS = [
  { n: "付费投流", v: 46 }, { n: "自然推荐", v: 28 }, { n: "达人带货", v: 16 }, { n: "私域复购", v: 10 },
];
function useOnlineSim() {
  const { calc, on } = useApp();
  const days = useMemo(() => {
    const rnd = seeded(777);
    const base = calc.validGmv / 30;
    return Array.from({ length: 30 }, (_, i) => {
      const burst = i % 9 === 4 ? 1.55 : 1;
      const g = base * burst * (0.78 + rnd() * 0.44);
      return { d: `${i + 1}`, GMV: Math.round(g), 保本线: Math.round(calc.beRevenue / 30) };
    });
  }, [calc.validGmv, calc.beRevenue]);
  const funnel = useMemo(() => {
    const visits = on.visitors * 30;
    return [
      { n: "曝光", v: visits * 9, icon: Eye },
      { n: "进店", v: visits, icon: MousePointerClick },
      { n: "下单", v: calc.orders, icon: ShoppingCart },
      { n: "成交", v: calc.orders * (1 - on.returnRate), icon: PackageCheck },
    ];
  }, [on.visitors, on.returnRate, calc.orders]);
  const mtd = days.reduce((a, b) => a + b.GMV, 0);
  return { days, funnel, mtd, hit: mtd / calc.beRevenue, overDays: days.filter((d) => d.GMV >= d.保本线).length };
}

/* ---- 日常运营(工具)---- */
function OpsToolsOffline() {
  const { calc, accent, store } = useApp();
  const sim = useOfflineSim();
  const [todos, setTodos] = useState([
    { t: "核对上周原料损耗,超过 5% 的品项列出来", d: false },
    { t: "把工作日下午的闲时套餐挂到点评", d: true },
    { t: "回复 3 条差评,当天内", d: false },
    { t: "和房东谈第二年租金,提前 45 天开口", d: false },
  ]);
  const { diag, busy, run } = useOpsDiag(() =>
    `线下门店,品类${store.info.category}。近30天累计营业额${yuan(sim.mtd)}元,保本线${yuan(calc.beRevenue)}元,达成率${pct(sim.hit)}%,到店${sim.traffic}人,30天里${sim.overDays}天过保本线。午市11-13点和晚市17-19点是双峰,下午14-16点客流只有峰值的27%。周末比工作日高约30%。`);
  return (
    <div className="sp-page">
      <div className="sp-head">
        <div>
          <h2 className="sp-h1">日常运营<span className="sp-linechip">线下主线</span></h2>
          <p className="sp-sub">每周把这几件事跑完,数据的解释权就在你手里。详细曲线在「数据报表」。</p>
        </div>
        <div className="sp-actions">
          <Btn variant="pri" icon={busy ? Loader2 : Sparkles} onClick={run} disabled={busy}>
            {busy ? "诊断中…" : "AI 运营诊断"}
          </Btn>
        </div>
      </div>
      <div className="sp-grid g3">
        <Stat tone="t-brand" label="30 天累计营业额" value={wan(sim.mtd)} unit="万" sub={`${sim.overDays} 天过保本线`} />
        <Stat tone={sim.hit >= 1 ? "t-profit" : "t-amber"} label="保本达成率" value={pct(sim.hit)} unit="%" sub={`保本线 ${wan(calc.beRevenue)} 万/月`} />
        <Stat label="到店人次" value={sim.traffic.toLocaleString("zh-CN")} unit="人" sub={`日均 ${Math.round(sim.traffic / 30)} 人`} />
      </div>
      <div className="sp-grid gside">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card title="闲时经营策略" eyebrow="STRATEGY" right={<Tag tone="amber">下午谷值 27%</Tag>}>
            <div className="sp-note tip">
              <Clock size={15} color={C.amber} />
              <div>14–16 点是最大的闲置产能。这个时段做「第二杯半价」或自习座位,边际成本几乎为零。时段分布图在数据报表页。</div>
            </div>
          </Card>
          <DiagCard diag={diag} busy={busy} run={run} accent={accent} />
        </div>
        <TodoCard todos={todos} setTodos={setTodos} aiTodos={diag?.todos} />
      </div>
    </div>
  );
}

function OpsToolsOnline() {
  const { calc, on, accent, store } = useApp();
  const sim = useOnlineSim();
  const [todos, setTodos] = useState([
    { t: "把退货理由按 SKU 拉一遍,找出集中项", d: false },
    { t: "主图换第二版,做 7 天 A/B", d: true },
    { t: "补 20 条买家秀,给运费券", d: false },
    { t: "ROI 低于 1.8 的投放计划先停掉", d: false },
  ]);
  const { diag, busy, run } = useOpsDiag(() =>
    `线上店铺,品类${store.info.category}。近30天有效GMV ${yuan(sim.mtd)}元,保本线${yuan(calc.beRevenue)}元,达成率${pct(sim.hit)}%,${sim.overDays}天过线。进店→下单转化${pct(on.cvr)}%,退货率${pct(on.returnRate)}%。渠道:付费投流占46%,自然28%,达人16%,私域10%。投流ROI约${isFinite(calc.roi) ? calc.roi.toFixed(2) : "—"}。`);
  return (
    <div className="sp-page">
      <div className="sp-head">
        <div>
          <h2 className="sp-h1">日常运营<span className="sp-linechip">线上主线</span></h2>
          <p className="sp-sub">线上店每天都在花钱买流量,这页盯的是「钱花得对不对」。曲线在「数据报表」。</p>
        </div>
        <div className="sp-actions">
          <Btn variant="pri" icon={busy ? Loader2 : Sparkles} onClick={run} disabled={busy}>
            {busy ? "诊断中…" : "AI 运营诊断"}
          </Btn>
        </div>
      </div>
      <div className="sp-grid g3">
        <Stat tone="t-brand" label="30 天有效 GMV" value={wan(sim.mtd)} unit="万" sub={`${sim.overDays} 天过保本线`} />
        <Stat tone={calc.roi >= 2.5 ? "t-profit" : "t-seal"} label="投流 ROI" value={isFinite(calc.roi) ? calc.roi.toFixed(2) : "—"} sub="安全线 2.5" />
        <Stat tone={on.returnRate > 0.12 ? "t-seal" : ""} label="退货率" value={pct(on.returnRate)} unit="%" sub={`月退货约 ${yuan(calc.gmv - calc.validGmv)} 元`} />
      </div>
      <div className="sp-grid gside">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card title="GMV 渠道结构" eyebrow="CHANNELS">
            {ONLINE_CHANNELS.map((c, ci) => (
              <div key={c.n} style={{ marginBottom: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                  <span>{c.n}</span><b className="num">{c.v}%</b>
                </div>
                <div style={{ height: 7, background: "#EEF1EF", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${c.v}%`, height: "100%", background: accent.main, opacity: 1 - ci * 0.18, borderRadius: 4 }} />
                </div>
              </div>
            ))}
            <div className="sp-note" style={{ marginTop: 4 }}>
              <Flame size={15} color={C.seal} />
              <div>付费占比 46%,停投风险高。健康结构是付费不超过 35%,私域拉到 20%。</div>
            </div>
          </Card>
          <DiagCard diag={diag} busy={busy} run={run} accent={accent} />
        </div>
        <TodoCard todos={todos} setTodos={setTodos} aiTodos={diag?.todos} />
      </div>
    </div>
  );
}

/* ---- 数据报表 ---- */
function ReportOffline() {
  const { calc, accent } = useApp();
  const sim = useOfflineSim();
  return (
    <div className="sp-page">
      <div className="sp-head">
        <div>
          <h2 className="sp-h1">数据报表<span className="sp-linechip">线下主线</span></h2>
          <p className="sp-sub">营业额、客流与时段分布。每一天和保本线的距离,都画在同一张图上。</p>
        </div>
      </div>
      <div className="sp-grid g4">
        <Stat tone="t-brand" label="30 天累计营业额" value={wan(sim.mtd)} unit="万" sub={`${sim.overDays} 天过保本线`} />
        <Stat tone={sim.hit >= 1 ? "t-profit" : "t-amber"} label="保本达成率" value={pct(sim.hit)} unit="%" sub={`保本线 ${wan(calc.beRevenue)} 万/月`} />
        <Stat label="到店人次" value={sim.traffic.toLocaleString("zh-CN")} unit="人" sub={`日均 ${Math.round(sim.traffic / 30)} 人`} />
        <Stat label="坪效" value={calc.sqmDay.toFixed(0)} unit="元/㎡/天" sub={`客单价 ${(sim.mtd / sim.traffic).toFixed(1)} 元`} />
      </div>
      <Card title="每日营业额 vs 保本线" eyebrow="DAILY" right={<><Tag tone="profit">过线</Tag><Tag tone="seal">未过线</Tag></>}>
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sim.days} margin={{ top: 5, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid stroke={C.line} strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="d" tick={{ fontSize: 9.5, fill: C.muted, fontFamily: "monospace" }} axisLine={{ stroke: C.line }} tickLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: C.muted, fontFamily: "monospace" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
              <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(22,35,43,.05)" }} />
              <ReferenceLine y={calc.beRevenue / 30} stroke={C.seal} strokeDasharray="4 3"
                label={{ value: "保本线", position: "right", fill: C.seal, fontSize: 10 }} />
              <Bar dataKey="营业额" radius={[2, 2, 0, 0]}>
                {sim.days.map((d, i) => <Cell key={i} fill={d.营业额 >= d.保本线 ? C.profit : C.seal} fillOpacity={0.75} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="时段客流分布" eyebrow="HOURLY" right={<Tag tone="amber">下午谷值 27%</Tag>}>
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sim.hours} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid stroke={C.line} strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="h" tick={{ fontSize: 9.5, fill: C.muted, fontFamily: "monospace" }} axisLine={{ stroke: C.line }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: C.muted, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(22,35,43,.05)" }} />
              <Bar dataKey="客流" fill={accent.main} fillOpacity={0.8} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function ReportOnline() {
  const { calc, on, accent } = useApp();
  const sim = useOnlineSim();
  return (
    <div className="sp-page">
      <div className="sp-head">
        <div>
          <h2 className="sp-h1">数据报表<span className="sp-linechip">线上主线</span></h2>
          <p className="sp-sub">GMV、漏斗与保本线。每一层的流失,都对应一笔白花的推广费。</p>
        </div>
      </div>
      <div className="sp-grid g4">
        <Stat tone="t-brand" label="30 天有效 GMV" value={wan(sim.mtd)} unit="万" sub={`${sim.overDays} 天过保本线`} />
        <Stat tone={sim.hit >= 1 ? "t-profit" : "t-amber"} label="保本达成率" value={pct(sim.hit)} unit="%" sub={`保本线 ${wan(calc.beRevenue)} 万/月`} />
        <Stat tone={calc.roi >= 2.5 ? "t-profit" : "t-seal"} label="投流 ROI" value={isFinite(calc.roi) ? calc.roi.toFixed(2) : "—"} sub="安全线 2.5" />
        <Stat tone={on.returnRate > 0.12 ? "t-seal" : ""} label="退货率" value={pct(on.returnRate)} unit="%" sub={`月退货约 ${yuan(calc.gmv - calc.validGmv)} 元`} />
      </div>
      <Card title="30 天转化漏斗" eyebrow="FUNNEL" right={<Tag tone="brand">曝光 → 成交</Tag>}>
        <Funnel steps={sim.funnel} />
        <div className="sp-note tip" style={{ marginTop: 10 }}>
          <BadgePercent size={15} color={C.amber} />
          <div>进店 → 下单是最薄的一层({pct(on.cvr)}%)。转化率每提 0.5 个点,当前流量下每月多 {yuan(on.visitors * 30 * 0.005 * on.price * (1 - on.returnRate))} 元有效 GMV。</div>
        </div>
      </Card>
      <Card title="每日 GMV vs 保本线" eyebrow="DAILY" right={<><Tag tone="profit">过线</Tag><Tag tone="seal">未过线</Tag></>}>
        <div style={{ height: 230 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sim.days} margin={{ top: 5, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid stroke={C.line} strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="d" tick={{ fontSize: 9.5, fill: C.muted, fontFamily: "monospace" }} axisLine={{ stroke: C.line }} tickLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: C.muted, fontFamily: "monospace" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
              <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(22,35,43,.05)" }} />
              <ReferenceLine y={calc.beRevenue / 30} stroke={C.seal} strokeDasharray="4 3"
                label={{ value: "保本线", position: "right", fill: C.seal, fontSize: 10 }} />
              <Bar dataKey="GMV" radius={[2, 2, 0, 0]}>
                {sim.days.map((d, i) => <Cell key={i} fill={d.GMV >= d.保本线 ? C.profit : C.seal} fillOpacity={0.75} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="sp-eyebrow" style={{ marginTop: 6 }}>每 9 天左右的峰值来自达人直播场次</div>
      </Card>
    </div>
  );
}

/* ================= 前台:风险识别 ================= */
function RiskPage() {
  const { mode, riskInfo, calc, off, on, project, plan, useAI, openPay, accent } = useApp();
  const online = mode === "online";
  const p = online ? on : off;
  const [scan, setScan] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setScan(null), [online]);
  const { risks, score, radar } = riskInfo;
  const lvMap = { 高: "h", 中: "m", 低: "l" };
  const lvTone = { 高: "seal", 中: "amber", 低: "" };

  async function deepScan() {
    if (plan === "free") { openPay("AI 深度扫描会在规则引擎之外补盲区、给监测指标,「深度帮」起可用。"); return; }
    if (!useAI()) return;
    setBusy(true);
    try {
      const sys = "你是中国小微创业风控顾问。只输出 JSON,不要解释或代码块标记。字段:summary(总体风险判断,40字内),extra(2-3项数组,规则引擎容易漏掉的风险,每项{title(12字内),level:高/中/低,why(28字内),fix(30字内)}),watchlist(3条监测指标,每条含指标名和预警阈值,各25字内)";
      const known = risks.map((r) => r.title).join("、");
      const q = online
        ? `线上店铺,品类${project.category}。客单价${p.price}元,转化率${pct(p.cvr)}%,退货率${pct(p.returnRate)}%,佣金${pct(p.commission)}%,月投流${yuan(p.adSpend)}元,备货${yuan(p.stock)}元,ROI${isFinite(calc.roi) ? calc.roi.toFixed(2) : "负"},月净利${yuan(calc.net)}元。规则引擎已识别:${known}。请补充它没覆盖的风险。`
        : `线下门店,${project.city},品类${project.category}。${p.area}㎡,月租${yuan(p.rent)}元,转让费${yuan(p.transfer)}元,${p.staff}名员工,日均客流假设${p.daily}人,月净利${yuan(calc.net)}元,回本${calc.payback ? calc.payback.toFixed(1) + "个月" : "无法回本"}。规则引擎已识别:${known}。请补充它没覆盖的风险(如租约条款、证照时序、季节性等)。`;
      setScan(parseJSON(await callAI("riskScan", [{ role: "user", content: q }], sys)));
    } catch { setScan({ error: true }); } finally { setBusy(false); }
  }

  return (
    <div className="sp-page">
      <div className="sp-head">
        <div>
          <h2 className="sp-h1">风险识别<span className="sp-linechip">{online ? "线上主线" : "线下主线"}</span></h2>
          <p className="sp-sub">规则引擎实时盯着你的每个数字;AI 深度扫描负责补规则看不到的盲区。</p>
        </div>
        <div className="sp-actions">
          <Btn variant="pri" icon={busy ? Loader2 : RadarIcon} onClick={deepScan} disabled={busy}>
            {busy ? "扫描中…" : "AI 深度扫描"}{plan === "free" && <Lock size={12} />}
          </Btn>
        </div>
      </div>

      <div className="sp-grid gside">
        <Card title="风险健康分" eyebrow="HEALTH"
          right={<Tag tone={score >= 75 ? "profit" : score >= 55 ? "amber" : "seal"}>
            {score >= 75 ? "结构健康" : score >= 55 ? "带病可开" : "先治再开"}</Tag>}>
          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <Dial score={score} />
            <div style={{ flex: 1, minWidth: 230, height: 208 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radar} outerRadius="74%">
                  <PolarGrid stroke={C.line} />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: C.muted }} />
                  <Radar dataKey="score" stroke={accent.main} fill={accent.main} fillOpacity={0.16} strokeWidth={2} />
                  <Tooltip content={<ChartTip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <Tag tone="seal">{risks.filter((r) => r.level === "高").length} 项高危</Tag>
            <Tag tone="amber">{risks.filter((r) => r.level === "中").length} 项中危</Tag>
            <Tag>{risks.filter((r) => r.level === "低").length} 项提示</Tag>
            <span style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>改预算页的数字,这里实时重算</span>
          </div>
        </Card>

        <Card title="AI 深度扫描" eyebrow="DEEP SCAN" right={<Sparkles size={15} color={accent.main} />}>
          {!scan ? (
            <Empty icon={RadarIcon} title="规则之外的盲区"
              desc={online ? "平台政策突变、素材侵权、类目保证金调整——这些规则引擎看不到,AI 来补。" : "租约条款陷阱、证照时序、季节性波动——这些规则引擎看不到,AI 来补。"}
              action={<Btn variant="pri" icon={RadarIcon} onClick={deepScan} disabled={busy}>{busy ? "扫描中…" : "开始扫描"}{plan === "free" && <Lock size={12} />}</Btn>} />
          ) : scan.error ? (
            <div className="sp-note risk"><AlertTriangle size={15} color={C.seal} /><div>没连上 AI。检查网络后重试。</div></div>
          ) : (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.55, marginBottom: 12 }}>{scan.summary}</div>
              {scan.extra?.map((r, i) => (
                <div key={i} className={`sp-risk ${lvMap[r.level] || "l"}`} style={{ marginBottom: 9 }}>
                  <div className="sp-risk-t"><Tag tone={lvTone[r.level]}>{r.level}</Tag>{r.title}</div>
                  <div className="sp-risk-d">{r.why}</div>
                  <div className="sp-risk-f"><Wrench size={13} color={accent.main} style={{ flexShrink: 0, marginTop: 3 }} />{r.fix}</div>
                </div>
              ))}
              {scan.watchlist && (
                <>
                  <div className="sp-eyebrow" style={{ margin: "13px 0 7px" }}>建议长期监测</div>
                  {scan.watchlist.map((w, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, padding: "6px 0", borderBottom: i < scan.watchlist.length - 1 ? `1px dotted ${C.line}` : 0 }}>
                      <Activity size={14} color={accent.main} style={{ flexShrink: 0, marginTop: 3 }} />{w}
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </Card>
      </div>

      <Card title={`规则引擎识别到 ${risks.length} 项风险`} eyebrow="RULE ENGINE"
        right={<Tag tone="brand">实时联动预算数据</Tag>}>
        <div className="sp-grid g2">
          {risks.map((r, i) => (
            <div key={i} className={`sp-risk ${lvMap[r.level]}`}>
              <div className="sp-risk-t">
                <Tag tone={lvTone[r.level]}>{r.level}</Tag>{r.title}
                <span style={{ marginLeft: "auto" }}><Tag>{r.cat}</Tag></span>
              </div>
              <div className="sp-risk-d">{r.detail}</div>
              <div className="sp-risk-f"><Wrench size={13} color={accent.main} style={{ flexShrink: 0, marginTop: 3 }} />{r.fix}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ================= 前台:AI 参谋(双主线独立)================= */
const ADVISOR_META = {
  offline: {
    title: "线下开店参谋",
    persona: "沉浸线下零售 15 年,选址、谈租、排班、动线都趟过坑",
    tools: ["写一版和房东谈降租的话术", "给我开业前 14 天的筹备清单", "设计一个不伤毛利的开业活动", "写 3 条差评回复模板"],
    chips: ["房东要涨 15% 租金,该怎么谈", "工作日下午没人怎么办", "第一批员工招几个合适", "隔壁开了家同品类,怎么应对"],
  },
  online: {
    title: "线上电商参谋",
    persona: "操盘过 0 到千万 GMV 的店铺,投流、内容、直播、供应链都在行",
    tools: ["写 3 条冷启动短视频脚本框架", "详情页首屏卖点怎么排", "帮我做投流预算的分配方案", "设计一个降退货率的售后流程"],
    chips: ["投流预算怎么分配才不亏", "退货率降到 8% 有哪些办法", "第一个月该主推哪几个 SKU", "什么时候该开直播"],
  },
};

function Advisor() {
  const { mode, calc, project, useAI, aiLeft, chats, setChats, accent } = useApp();
  const online = mode === "online";
  const meta = ADVISOR_META[mode];
  const msgs = chats[mode] || [];
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!chats[mode]) {
      setChats((c) => ({
        ...c,
        [mode]: [{ role: "assistant", content: `我是你的${meta.title}。${project.name} 的账我看过了:启动资金 ${wan(calc.startup)} 万,保本${online ? "月 GMV" : "月营业额"} ${wan(calc.beRevenue)} 万。\n\n想聊哪一块?左下角的工具箱里也有几件现成的活儿。` }],
      }));
    }
  }, [mode]);
  useEffect(() => { boxRef.current?.scrollTo({ top: 99999, behavior: "smooth" }); }, [msgs, busy]);

  async function send(q) {
    const content = (q ?? text).trim();
    if (!content || busy) return;
    if (!useAI()) return;
    setText("");
    const next = [...msgs, { role: "user", content }];
    setChats((c) => ({ ...c, [mode]: next }));
    setBusy(true);
    try {
      const sys = `你是乌托帮里的「${meta.title}」,${meta.persona}。服务中国小微创业者,回答要具体、能落地、给数字,不说套话。控制在 250 字内,可用短列表。
当前项目:${project.name},${online ? "线上店铺" : "线下实体店"},城市${project.city},品类${project.category}。
关键数字:启动资金${wan(calc.startup)}万,月固定支出${yuan(calc.fixed)}元,保本${online ? "月GMV" : "月营业额"}${wan(calc.beRevenue)}万,预估月净利${yuan(calc.net)}元,回本${calc.payback ? calc.payback.toFixed(1) + "个月" : "当前假设下无法回本"}。
回答时把这些数字用起来。`;
      const reply = await callAI("advisor", next.slice(-8).map((m) => ({ role: m.role, content: m.content })), sys);
      setChats((c) => ({ ...c, [mode]: [...next, { role: "assistant", content: reply }] }));
    } catch {
      setChats((c) => ({ ...c, [mode]: [...next, { role: "assistant", content: "没连上 AI。检查网络后再发一次。" }] }));
    } finally { setBusy(false); }
  }

  return (
    <div className="sp-page">
      <div className="sp-head">
        <div>
          <h2 className="sp-h1">{meta.title}<span className="sp-linechip">{online ? "线上主线" : "线下主线"}</span></h2>
          <p className="sp-sub">{meta.persona}。两条主线的对话各自独立,互不串台。</p>
        </div>
        <div className="sp-actions"><Tag tone="brand">剩余 {aiLeft === Infinity ? "∞" : aiLeft} 次</Tag></div>
      </div>

      <div className="sp-grid gside" style={{ alignItems: "start" }}>
        <div className="sp-card sp-chat">
          <div className="sp-msgs" ref={boxRef}>
            {msgs.map((m, i) => (
              <div key={i} className={`sp-msg ${m.role === "user" ? "me" : ""}`}>
                <div className="sp-av">{m.role === "user" ? <UserRound size={14} /> : <Bot size={15} />}</div>
                <div className="sp-bubble">{m.content}</div>
              </div>
            ))}
            {busy && (
              <div className="sp-msg">
                <div className="sp-av"><Bot size={15} /></div>
                <div className="sp-bubble" style={{ display: "flex", gap: 7, alignItems: "center", color: C.muted }}>
                  <Loader2 size={14} className="sp-spin" />正在翻你的账本…
                </div>
              </div>
            )}
          </div>
          {msgs.length <= 2 && (
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", padding: "0 16px 12px" }}>
              {meta.chips.map((c) => <button key={c} className="sp-chip" onClick={() => send(c)}>{c}</button>)}
            </div>
          )}
          <div className="sp-composer">
            <textarea placeholder={online ? "问点具体的,比如「达人坑位费怎么谈」" : "问点具体的,比如「房租占比多少算安全」"} value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <Btn variant="pri" onClick={() => send()} disabled={busy || !text.trim()} icon={Send}>发送</Btn>
          </div>
        </div>

        <Card title="参谋工具箱" eyebrow="TOOLKIT" right={<HandHelping size={15} color={accent.main} />}>
          <p style={{ fontSize: 12.5, color: C.muted, margin: "0 0 11px" }}>点一下,参谋直接开工,产出可以直接拿去用。</p>
          {meta.tools.map((t, i) => (
            <button key={t} className="sp-item" style={{ marginBottom: 8 }} onClick={() => send(t)}>
              <div className="sp-idx">{String(i + 1).padStart(2, "0")}</div>
              <div style={{ fontSize: 13, flex: 1 }}>{t}</div>
              <Sparkles size={13} color={accent.main} style={{ marginTop: 3 }} />
            </button>
          ))}
          <div className="sp-note" style={{ marginTop: 6, fontSize: 12 }}>
            <Bot size={14} color={C.muted} />
            <div>参谋记得这条主线里聊过的一切;切到另一条主线,是另一位参谋。</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ================= 前台:订阅 ================= */
function Billing() {
  const { plan, setPlan, aiUsed, onCheckout } = useApp();
  const [pick, setPick] = useState(null);
  const [pay, setPay] = useState("wechat");
  const [step, setStep] = useState("choose");
  const [payErr, setPayErr] = useState("");

  /**
   * 没有 onCheckout 时(演示模式)本地直接切档;
   * 云端版传进来,真去服务端下单 —— 档位以服务端为准,改前端绕不过去。
   */
  async function confirm() {
    setStep("doing"); setPayErr("");
    try {
      if (onCheckout) {
        await onCheckout({ plan: pick, channel: pay });
      } else {
        await new Promise((r) => setTimeout(r, 1400));
        setPlan(pick);
      }
      setStep("done");
    } catch (e) {
      setPayErr(e.message || "支付失败,请重试");
      setStep("choose");
    }
  }
  function close() { setPick(null); setStep("choose"); setPayErr(""); }

  return (
    <div className="sp-page">
      <div className="sp-head">
        <div>
          <h2 className="sp-h1">订阅方案</h2>
          <p className="sp-sub">先帮后托:「帮一把」免费算账,「深度帮」全量 AI,「全托管」连真人代运营一起上。按月付,随时可停。</p>
        </div>
        <div className="sp-actions">
          <Tag tone="dark">当前 {PLANS[plan].name}</Tag>
          <Tag>本月已用 AI {aiUsed} 次</Tag>
        </div>
      </div>

      <div className="sp-grid g3">
        {Object.values(PLANS).map((pl) => {
          const cur = pl.key === plan;
          return (
            <div key={pl.key} className={`sp-plan ${pl.key === "pro" ? "hot" : ""}`}>
              {pl.tag && <div className="sp-plan-flag">{pl.tag}</div>}
              <div className="sp-eyebrow">{pl.key.toUpperCase()}</div>
              <div style={{ fontWeight: 700, fontSize: 17, marginTop: 4 }}>{pl.name}</div>
              <div className="sp-price">
                {pl.price === 0 ? "免费" : <>¥{pl.price}<small> / 月</small></>}
              </div>
              <div style={{ fontSize: 12, color: C.muted }}>
                {pl.key === "free" ? "先把账算明白" : pl.key === "pro" ? "开一家店够用" : "帮到托,一步到位"}
              </div>
              <ul>
                {PLAN_FEATURES.map(([label, ...vals]) => {
                  const idx = ["free", "pro", "max"].indexOf(pl.key);
                  const v = vals[idx];
                  const isOff = v === false;
                  return (
                    <li key={label} className={isOff ? "off" : ""}>
                      {isOff ? <X size={14} color="#B6C2BE" /> : <Check size={14} color={C.profit} />}
                      <span>{label}{typeof v === "string" && <b style={{ fontFamily: "var(--mono)", marginLeft: 5 }}>{v}</b>}</span>
                    </li>
                  );
                })}
              </ul>
              {cur ? <Btn disabled style={{ width: "100%" }}>当前方案</Btn>
                : pl.price === 0
                  ? <Btn style={{ width: "100%" }} onClick={() => setPlan("free")}>切回帮一把</Btn>
                  : <Btn variant={pl.key === "pro" ? "pri" : "dark"} style={{ width: "100%" }}
                    icon={pl.key === "max" ? Crown : undefined} onClick={() => setPick(pl.key)}>
                    升级到{pl.name}
                  </Btn>}
            </div>
          );
        })}
      </div>

      <Card title="常见问题" eyebrow="FAQ">
        <div className="sp-grid g2">
          {[
            ["AI 次数怎么算?", "一次选址评估、预算体检、运营诊断、风险扫描,或参谋里的一次提问,各算一次。"],
            ["「全托管」的托管是什么?", "配一位真人顾问,每月两次 1v1;需要时对接乌托帮认证的代运营团队,费用另计。"],
            ["中途换方案怎么收费?", "升级按剩余天数补差价,降级在下个账期生效,已用次数不退。"],
            ["数据存在哪?能开发票吗?", "数据存在你的账号下,可导出、注销即删。付款后当天开电子发票。"],
          ].map(([q, a]) => (
            <div key={q} style={{ borderTop: `1px solid ${C.line}`, paddingTop: 11 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{q}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 1.6 }}>{a}</div>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={!!pick} onClose={close} title={step === "done" ? "开通成功" : `升级到${pick ? PLANS[pick].name : ""}`}
        icon={step === "done" ? CheckCircle2 : CreditCard} width={440}>
        {step === "done" ? (
          <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
            <CheckCircle2 size={40} color={C.profit} strokeWidth={1.6} />
            <div style={{ fontSize: 17, fontWeight: 700, margin: "12px 0 5px" }}>{PLANS[pick].name}已开通</div>
            <div style={{ fontSize: 13, color: C.muted }}>
              AI 次数已重置为 {PLANS[pick].ai === Infinity ? "不限" : PLANS[pick].ai} 次,候选上限 {PLANS[pick].sites} 个。
            </div>
            <div style={{ marginTop: 16 }}><span className="sp-seal-badge">已付款 · 演示</span></div>
            <Btn variant="pri" style={{ width: "100%", marginTop: 18 }} onClick={close}>开始使用</Btn>
          </div>
        ) : step === "doing" ? (
          <div style={{ textAlign: "center", padding: "26px 0" }}>
            <Loader2 size={30} className="sp-spin" color={C.ink} />
            <div style={{ marginTop: 14, fontSize: 13.5, color: C.muted }}>正在确认支付结果…</div>
          </div>
        ) : (
          <>
            <table className="sp-ledger" style={{ marginBottom: 16 }}>
              <tbody>
                <tr><td>{PLANS[pick]?.name} · 按月</td><td className="r">¥{PLANS[pick]?.price}.00</td></tr>
                <tr><td>首月优惠</td><td className="r" style={{ color: C.seal }}>-¥{Math.round((PLANS[pick]?.price || 0) * 0.3)}.00</td></tr>
                <tr className="total"><td>本次应付</td><td className="r">¥{Math.round((PLANS[pick]?.price || 0) * 0.7)}.00</td></tr>
              </tbody>
            </table>
            <div className="sp-eyebrow" style={{ marginBottom: 8 }}>支付方式</div>
            {[["wechat", "微信支付", "扫码或跳转微信"], ["alipay", "支付宝", "支持花呗分期"], ["card", "银行卡", "储蓄卡 / 信用卡"]].map(([k, n, d]) => (
              <button key={k} className={`sp-item ${pay === k ? "on" : ""}`} style={{ marginBottom: 8 }} onClick={() => setPay(k)}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{n}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{d}</div>
                </div>
                {pay === k && <Check size={16} color={C.profit} />}
              </button>
            ))}
            {payErr && (
              <div className="sp-note risk" style={{ marginTop: 12, fontSize: 12 }}>
                <X size={15} color={C.seal} /><div>{payErr}</div>
              </div>
            )}
            <div className="sp-note" style={{ marginTop: 12, fontSize: 12 }}>
              <ShieldCheck size={15} color={C.muted} />
              <div>当前走的是模拟支付通道,不会真的扣款。点确认后直接解锁功能。</div>
            </div>
            <Btn variant="pri" style={{ width: "100%", marginTop: 14 }} onClick={confirm}>
              确认支付 ¥{Math.round((PLANS[pick]?.price || 0) * 0.7)}
            </Btn>
          </>
        )}
      </Modal>
    </div>
  );
}

/* ================= 后台:管理数据(演示)================= */
const ADMIN = (() => {
  const rnd = seeded(2026);
  const mrr = Array.from({ length: 12 }, (_, i) => ({
    m: `${i + 1}月`,
    MRR: Math.round(38000 * Math.pow(1.115, i) * (0.95 + rnd() * 0.1)),
    新增付费: Math.round(60 * Math.pow(1.1, i) * (0.9 + rnd() * 0.2)),
  }));
  const daily = Array.from({ length: 30 }, (_, i) => ({
    d: `${i + 1}`,
    调用: Math.round(9200 + i * 95 + rnd() * 2200),
  }));
  const features = [
    { n: "参谋对话", v: 128400, ok: 99.1, ms: 2.8 },
    { n: "选址/平台评估", v: 61200, ok: 97.8, ms: 4.6 },
    { n: "运营诊断", v: 48900, ok: 98.4, ms: 3.9 },
    { n: "风险深度扫描", v: 41300, ok: 98.9, ms: 4.2 },
    { n: "预算体检", v: 32600, ok: 98.1, ms: 3.5 },
  ];
  const users = [
    { n: "拾豆咖啡 · 文三路店", t: "线下", p: "深度帮", mrr: 99, ai: 62, s: "活跃", d: "2026-03-14" },
    { n: "山青文创 · 抖音旗舰", t: "线上", p: "全托管", mrr: 299, ai: 418, s: "活跃", d: "2026-01-08" },
    { n: "老陈牛杂 · 江南西店", t: "线下", p: "深度帮", mrr: 99, ai: 87, s: "活跃", d: "2026-05-02" },
    { n: "苔上花植物工作室", t: "线上", p: "帮一把", mrr: 0, ai: 3, s: "待转化", d: "2026-07-11" },
    { n: "北岸书店 · 社区店", t: "线下", p: "全托管", mrr: 299, ai: 231, s: "活跃", d: "2025-11-20" },
    { n: "轻装出行 · 户外装备", t: "线上", p: "深度帮", mrr: 99, ai: 96, s: "活跃", d: "2026-04-17" },
    { n: "禾时甜品 · 万象城店", t: "线下", p: "帮一把", mrr: 0, ai: 2, s: "流失风险", d: "2026-06-01" },
    { n: "字里行间 · 文具电商", t: "线上", p: "深度帮", mrr: 99, ai: 54, s: "活跃", d: "2026-02-26" },
  ];
  return { mrr, daily, features, users };
})();

function AdminDash() {
  const cur = ADMIN.mrr[11];
  return (
    <div className="sp-page">
      <div className="sp-head">
        <div>
          <h2 className="sp-h1">平台看板</h2>
          <p className="sp-sub">乌托帮整体经营状况。前台商户看不到这里。</p>
        </div>
        <div className="sp-actions"><Tag tone="amber">演示数据</Tag></div>
      </div>
      <div className="sp-grid g4">
        <Stat tone="t-brand" icon={Wallet} label="MRR 月度经常性收入" value={wan(cur.MRR)} unit="万" sub={`环比 +${pct((cur.MRR - ADMIN.mrr[10].MRR) / ADMIN.mrr[10].MRR)}%`} />
        <Stat tone="t-profit" icon={Users} label="付费商户" value="1,382" sub="免费商户 18,450" />
        <Stat icon={BadgePercent} label="免费 → 付费转化" value="6.8" unit="%" sub="30 日窗口" />
        <Stat icon={Activity} label="本月 AI 调用" value="31.2" unit="万次" sub="人均 15.8 次/月" />
      </div>
      <div className="sp-grid gside">
        <Card title="MRR 趋势" eyebrow="REVENUE">
          <div style={{ height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ADMIN.mrr} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="mrr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14606E" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#14606E" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.line} strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="m" tick={{ fontSize: 10, fill: C.muted, fontFamily: "monospace" }} axisLine={{ stroke: C.line }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.muted, fontFamily: "monospace" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => (v / 10000).toFixed(0) + "万"} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="MRR" stroke="#14606E" strokeWidth={2.2} fill="url(#mrr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card title="商户增长漏斗" eyebrow="GROWTH">
            <Funnel steps={[
              { n: "注册", v: 19832, icon: UserRound },
              { n: "激活", v: 12408, icon: MousePointerClick },
              { n: "付费", v: 1382, icon: CreditCard },
            ]} />
          </Card>
          <Card title="方案分布" eyebrow="PLANS">
            {[["帮一把", 18450, "#8FA09B"], ["深度帮", 1102, "#14606E"], ["全托管", 280, "#0E4753"]].map(([n, v, c]) => (
              <div key={n} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                  <span>{n}</span><b className="num">{v.toLocaleString("zh-CN")}</b>
                </div>
                <div style={{ height: 7, background: "#EEF1EF", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${(v / 18450) * 100}%`, minWidth: 6, height: "100%", background: c, borderRadius: 4 }} />
                </div>
              </div>
            ))}
            <div className="sp-note tip" style={{ marginTop: 6, fontSize: 12 }}>
              <Lightbulb size={14} color={C.amber} />
              <div>「深度帮」→「全托管」升级率 25.4%,托管叙事在起作用。</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AdminUsers() {
  const [q, setQ] = useState("");
  const list = ADMIN.users.filter((u) => !q || u.n.includes(q) || u.p.includes(q) || u.t.includes(q));
  const sTone = { 活跃: "profit", 待转化: "amber", 流失风险: "seal" };
  return (
    <div className="sp-page">
      <div className="sp-head">
        <div>
          <h2 className="sp-h1">用户与订阅</h2>
          <p className="sp-sub">商户列表、方案与 AI 用量。点任何一行可以进入商户详情(演示中未开)。</p>
        </div>
        <div className="sp-actions"><Tag tone="amber">演示数据</Tag></div>
      </div>
      <div className="sp-grid g4">
        <Stat tone="t-brand" label="总商户" value="19,832" sub="近 30 天 +2,148" />
        <Stat tone="t-profit" label="付费商户" value="1,382" sub="ARPU ¥138 / 月" />
        <Stat label="月流失率" value="3.1" unit="%" sub="上月 3.8%" />
        <Stat tone="t-amber" label="流失风险商户" value="112" sub="额度用尽未续费" />
      </div>
      <Card title="商户列表" eyebrow="MERCHANTS"
        right={<div className="sp-numwrap" style={{ width: 200 }}>
          <input className="sp-input" placeholder="搜店名 / 方案 / 类型" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingRight: 30 }} />
          <Search size={13} style={{ position: "absolute", right: 10, color: C.muted }} />
        </div>}>
        <div style={{ overflowX: "auto" }}>
          <table className="sp-tbl">
            <thead><tr>
              <th>商户</th><th>主线</th><th>方案</th><th className="r">MRR</th>
              <th className="r">本月 AI</th><th>状态</th><th>注册</th>
            </tr></thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.n}>
                  <td style={{ fontWeight: 600 }}>{u.n}</td>
                  <td><Tag tone={u.t === "线上" ? "brand" : ""}>{u.t === "线上" ? <Globe size={11} /> : <Store size={11} />}{u.t}</Tag></td>
                  <td>{u.p}</td>
                  <td className="r">{u.mrr ? `¥${u.mrr}` : "—"}</td>
                  <td className="r">{u.ai} 次</td>
                  <td><Tag tone={sTone[u.s]}>{u.s}</Tag></td>
                  <td className="num" style={{ color: C.muted, fontSize: 11.5 }}>{u.d}</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", color: C.muted, padding: 24 }}>没有匹配的商户。换个关键词试试。</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function AdminAI() {
  const total = ADMIN.features.reduce((a, f) => a + f.v, 0);
  return (
    <div className="sp-page">
      <div className="sp-head">
        <div>
          <h2 className="sp-h1">AI 用量监控</h2>
          <p className="sp-sub">各 AI 能力的调用量、成功率与耗时。这是乌托帮的成本中心,也是价值中心。</p>
        </div>
        <div className="sp-actions"><Tag tone="amber">演示数据</Tag></div>
      </div>
      <div className="sp-grid g4">
        <Stat tone="t-brand" icon={Activity} label="本月总调用" value={wan(total)} unit="万次" sub="日均约 1.04 万次" />
        <Stat tone="t-profit" label="综合成功率" value="98.5" unit="%" sub="失败自动重试一次" />
        <Stat label="平均耗时" value="3.6" unit="秒" sub="P95 · 7.8 秒" />
        <Stat tone="t-amber" icon={Server} label="本月模型成本" value="4.2" unit="万元" sub="占 MRR 的 32.7%" />
      </div>
      <div className="sp-grid gside">
        <Card title="近 30 天调用量" eyebrow="VOLUME">
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ADMIN.daily} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={C.line} strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 9.5, fill: C.muted, fontFamily: "monospace" }} axisLine={{ stroke: C.line }} tickLine={false} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: C.muted, fontFamily: "monospace" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
                <Tooltip content={<ChartTip />} />
                <Line type="monotone" dataKey="调用" stroke="#14606E" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="能力分布" eyebrow="BY FEATURE">
          <table className="sp-tbl">
            <thead><tr><th>AI 能力</th><th className="r">调用</th><th className="r">成功率</th><th className="r">耗时</th></tr></thead>
            <tbody>
              {ADMIN.features.map((f) => (
                <tr key={f.n}>
                  <td style={{ fontWeight: 600 }}>{f.n}</td>
                  <td className="r">{wan(f.v)}万</td>
                  <td className="r" style={{ color: f.ok >= 98.5 ? C.profit : C.amber }}>{f.ok}%</td>
                  <td className="r">{f.ms}s</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="sp-note" style={{ marginTop: 12, fontSize: 12 }}>
            <Bot size={14} color={C.muted} />
            <div>参谋对话占 41%,是最高频入口。选址评估耗时最长,提示词可以再压。</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ================= 前台:开店向导 ================= */
function Wizard({ mode, setMode, onDone }) {
  const { off, on, setOff, setOn, useAI, aiLeft } = useApp();
  const online = mode === "online";
  const [step, setStep] = useState(0);
  const [info, setInfo] = useState(WIZ_DEFAULTS[mode]);
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState(null);
  useEffect(() => { setInfo(WIZ_DEFAULTS[mode]); setPlan(null); }, [mode]);
  const set = (k) => (v) => setInfo((s) => ({ ...s, [k]: v }));

  async function generate() {
    setBusy(true); setPlan(null);
    const price = Number(info.price) || (online ? on.price : off.price);
    if (online) setOn((s) => ({ ...s, price }));
    else setOff((s) => ({ ...s, price, area: Number(info.area) || s.area }));
    const params = online ? { ...on, price } : { ...off, price, area: Number(info.area) || off.area };
    let result = null;
    if (useAI()) {
      try {
        const sys = "你是中国开店筹备顾问。只输出 JSON,不要解释或代码块标记。字段:groups(5组数组,每组{name(阶段名,6字内),items(3-4项数组,每项{t(任务,18字内),cost(预估花费,整数元,可为0),note(备注,12字内)})}),tips(2条开店提醒,各28字内)。金额要贴合输入的城市、品类与客单价的真实行情。";
        const q = online
          ? `线上店铺。店名${info.name},品类${info.category},核心产品:${info.core},客单价${price}元,货源${info.supply},意向平台${info.platform},内容能力${info.content},总预算上限${info.cap}万。生成从入驻到冷启动的分阶段开店清单。`
          : `线下实体店。店名${info.name},城市${info.city},品类${info.category},核心产品:${info.core},客单价${price}元,意向面积${info.area}㎡,商圈${info.circle},总预算上限${info.cap}万。生成从筹备到开业的分阶段开店清单。`;
        const rep = parseJSON(await callAI("checklist", [{ role: "user", content: q }], sys));
        if (rep.groups?.length) result = { ...rep, source: "ai" };
      } catch { /* 落到模板 */ }
    }
    if (!result) result = tplChecklist(mode, params);
    setPlan(result); setBusy(false);
  }

  const cost = plan ? plan.groups.reduce((a, g) => a + g.items.reduce((x, it) => x + (it.cost || 0), 0), 0) : 0;
  const steps = ["选择主线", "店铺信息", "生成方案"];

  return (
    <div className="sp-page" style={{ maxWidth: 860 }}>
      <div className="sp-head">
        <div>
          <h2 className="sp-h1"><HandHelping size={20} color="var(--brand)" />开一家店,从这里开始</h2>
          <p className="sp-sub">三步:选主线 → 说清楚你卖什么 → AI 生成开店清单和预算。全程约两分钟。</p>
        </div>
        <div className="sp-actions"><Tag tone="brand">剩余 AI {aiLeft === Infinity ? "∞" : aiLeft} 次</Tag></div>
      </div>

      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", marginBottom: 2 }}>
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: i === step ? "var(--ink)" : C.muted, fontWeight: i === step ? 650 : 400 }}>
              <b style={{
                width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center",
                fontFamily: "var(--mono)", fontSize: 11,
                border: i === step ? "2px solid var(--brand)" : "1.5px solid var(--line2)",
                background: i < step ? "var(--brand)" : "transparent",
                color: i < step ? "#fff" : i === step ? "var(--brand)" : C.muted,
              }}>{i < step ? <Check size={12} /> : i + 1}</b>{s}
            </div>
            {i < 2 && <div style={{ width: 34, height: 1, background: "var(--line2)", margin: "0 10px" }} />}
          </React.Fragment>
        ))}
      </div>

      {step === 0 && (
        <div className="sp-grid g2">
          {[
            { k: "offline", icon: Store, t: "线下实体店", d: "有门面、有到店客流。选址、装修、证照、排班是主战场。", pts: ["选址六维评估", "房租与回本测算", "时段客流经营"] },
            { k: "online", icon: Globe, t: "线上店铺", d: "开在平台上。流量、转化、投流、退货率是主战场。", pts: ["平台匹配度评估", "ROI 与投流测算", "漏斗转化经营"] },
          ].map((c) => (
            <button key={c.k} className={`sp-item ${mode === c.k ? "on" : ""}`}
              style={{ flexDirection: "column", alignItems: "flex-start", padding: 20, gap: 8 }}
              onClick={() => setMode(c.k)}>
              <div className="sp-aicap-ic" style={{ width: 38, height: 38 }}><c.icon size={18} /></div>
              <b style={{ fontSize: 16 }}>{c.t}</b>
              <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.6 }}>{c.d}</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                {c.pts.map((x) => <Tag key={x} tone={mode === c.k ? "brand" : ""}>{x}</Tag>)}
              </div>
            </button>
          ))}
          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
            <Btn variant="pri" onClick={() => setStep(1)}>下一步:填店铺信息<ArrowRight size={14} /></Btn>
          </div>
        </div>
      )}

      {step === 1 && (
        <Card title={online ? "你的线上店" : "你的线下店"} eyebrow="STORE INFO">
          <div className="sp-rowsplit">
            <Field label="店铺名称"><input className="sp-input" value={info.name} onChange={(e) => set("name")(e.target.value)} /></Field>
            <Field label="经营品类"><input className="sp-input" value={info.category} onChange={(e) => set("category")(e.target.value)} placeholder="如:精品咖啡 / 女装 / 文具" /></Field>
          </div>
          <Field label="核心商品或服务" hint="AI 靠这个理解你的生意,越具体越好">
            <textarea className="sp-input" rows={2} value={info.core} onChange={(e) => set("core")(e.target.value)} />
          </Field>
          <div className="sp-rowsplit">
            <Field label="客单价"><NumIn value={info.price} onChange={set("price")} unit="元" /></Field>
            <Field label="总预算上限"><NumIn value={info.cap} onChange={set("cap")} unit="万" /></Field>
          </div>
          {online ? (
            <>
              <div className="sp-rowsplit">
                <Field label="货源类型">
                  <select className="sp-select" value={info.supply} onChange={(e) => set("supply")(e.target.value)}>
                    {["自有工厂", "一件代发", "批发档口", "品牌代理", "手工自制"].map((x) => <option key={x}>{x}</option>)}
                  </select>
                </Field>
                <Field label="内容能力">
                  <select className="sp-select" value={info.content} onChange={(e) => set("content")(e.target.value)}>
                    {["只能发图文", "能拍短视频", "能直播", "有专业团队"].map((x) => <option key={x}>{x}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="意向平台"><input className="sp-input" value={info.platform} onChange={(e) => set("platform")(e.target.value)} /></Field>
            </>
          ) : (
            <div className="sp-rowsplit">
              <Field label="城市"><input className="sp-input" value={info.city} onChange={(e) => set("city")(e.target.value)} /></Field>
              <Field label="意向面积"><NumIn value={info.area} onChange={set("area")} unit="㎡" /></Field>
            </div>
          )}
          {!online && (
            <Field label="意向商圈">
              <select className="sp-select" value={info.circle} onChange={(e) => set("circle")(e.target.value)}>
                {["社区底商", "写字楼", "购物中心", "学校周边", "交通枢纽", "临街商业"].map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <Btn variant="ghost" onClick={() => setStep(0)}>上一步</Btn>
            <Btn variant="pri" onClick={() => { setStep(2); generate(); }}>
              <Sparkles size={15} />生成开店清单与预算
            </Btn>
          </div>
        </Card>
      )}

      {step === 2 && (
        <>
          {busy && (
            <Card>
              <div style={{ textAlign: "center", padding: "34px 0" }}>
                <Loader2 size={30} className="sp-spin" color="var(--brand)" />
                <div style={{ marginTop: 14, fontSize: 14, fontWeight: 600 }}>AI 正在为「{info.name}」定制开店方案…</div>
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 5 }}>拆阶段、估费用、排先后,大约需要十秒</div>
              </div>
            </Card>
          )}
          {plan && (
            <>
              <Card title="方案已生成" eyebrow="RESULT"
                right={<Tag tone={plan.source === "ai" ? "brand" : "amber"}>{plan.source === "ai" ? "AI 定制" : "内置模板"}</Tag>}>
                <div className="sp-grid g3">
                  <Stat tone="t-brand" label="开店阶段" value={plan.groups.length} unit="个" sub="按先后排序" />
                  <Stat label="任务总数" value={plan.groups.reduce((a, g) => a + g.items.length, 0)} unit="项" sub="逐项打勾推进" />
                  <Stat tone="t-amber" label="清单预估投入" value={wan(cost)} unit="万" sub="不含备用金" />
                </div>
                {plan.source === "tpl" && (
                  <div className="sp-note tip" style={{ marginTop: 12 }}>
                    <Lightbulb size={15} color={C.amber} />
                    <div>AI 暂时没连上,先用内置模板起步。进入工作台后,清单页可以随时让 AI 重新定制。</div>
                  </div>
                )}
                <div style={{ marginTop: 12 }}>
                  {plan.tips?.map((t, i) => (
                    <div key={i} className="sp-note win" style={{ marginBottom: 8 }}>
                      <Lightbulb size={15} color={C.profit} /><div>{t}</div></div>
                  ))}
                </div>
              </Card>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Btn variant="ghost" onClick={() => setStep(1)}>改信息重新生成</Btn>
                <Btn variant="pri" onClick={() => onDone(info, plan)}>进入工作台<ArrowRight size={14} /></Btn>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ================= 前台:开店清单 ================= */
function Checklist({ go }) {
  const { mode, store, setStore, useAI, accent, off, on, plan: userPlan } = useApp();
  const online = mode === "online";
  const [busy, setBusy] = useState(false);
  const total = store.groups.reduce((a, g) => a + g.items.length, 0);
  const doneN = store.groups.reduce((a, g, gi) => a + g.items.filter((_, ii) => store.done[`${gi}-${ii}`]).length, 0);
  const prog = total ? doneN / total : 0;
  const cost = store.groups.reduce((a, g) => a + g.items.reduce((x, it) => x + (it.cost || 0), 0), 0);
  const toggle = (gi, ii) => setStore((s) => ({ done: { ...s.done, [`${gi}-${ii}`]: !s.done[`${gi}-${ii}`] } }));

  async function regen() {
    if (!useAI()) return;
    setBusy(true);
    try {
      const sys = "你是中国开店筹备顾问。只输出 JSON,不要解释或代码块标记。字段:groups(5组数组,每组{name(阶段名,6字内),items(3-4项数组,每项{t(任务,18字内),cost(预估花费,整数元,可为0),note(备注,12字内)})}),tips(2条开店提醒,各28字内)。金额要贴合品类与客单价的真实行情。";
      const inf = store.info;
      const q = online
        ? `线上店铺。店名${inf.name},品类${inf.category},核心产品:${inf.core},客单价${inf.price}元,货源${inf.supply},意向平台${inf.platform}。生成从入驻到冷启动的分阶段开店清单。`
        : `线下实体店。店名${inf.name},城市${inf.city},品类${inf.category},核心产品:${inf.core},客单价${inf.price}元,面积${inf.area}㎡,商圈${inf.circle}。生成从筹备到开业的分阶段开店清单。`;
      const rep = parseJSON(await callAI("checklist", [{ role: "user", content: q }], sys));
      if (rep.groups?.length) setStore({ groups: rep.groups, tips: rep.tips, source: "ai", done: {} });
    } catch { /* 保留原清单 */ } finally { setBusy(false); }
  }

  return (
    <div className="sp-page">
      <div className="sp-head">
        <div>
          <h2 className="sp-h1">开店清单<span className="sp-linechip">{online ? "线上主线" : "线下主线"}</span></h2>
          <p className="sp-sub">按阶段推进,做完一项勾一项。带金额的任务,合计就是你的开店账。</p>
        </div>
        <div className="sp-actions">
          <Btn icon={busy ? Loader2 : Sparkles} onClick={regen} disabled={busy}>{busy ? "重新生成中…" : "AI 重新定制"}</Btn>
          {!store.opened && (
            <Btn variant="pri" icon={Flame} disabled={prog < 0.6}
              onClick={() => { setStore({ opened: true }); }}
              title={prog < 0.6 ? "完成 60% 以上任务后可标记开业" : ""}>
              标记已开业
            </Btn>
          )}
        </div>
      </div>

      <div className="sp-grid g3">
        <Stat tone="t-brand" label="完成进度" value={`${doneN}/${total}`} sub={`${Math.round(prog * 100)}% · ${prog >= 0.6 ? "可以标记开业了" : "完成 60% 可标记开业"}`} />
        <Stat tone="t-amber" label="清单预估投入" value={wan(cost)} unit="万" sub="点右侧任务金额可去预算页细算" />
        <Stat tone={store.opened ? "t-profit" : ""} label="店铺状态" value={store.opened ? "营业中" : "筹备中"}
          sub={store.opened ? "运营与报表已解锁" : "开业后解锁运营板块"} />
      </div>

      {store.opened && (
        <div className="sp-note win">
          <CheckCircle2 size={15} color={C.profit} />
          <div><b>恭喜开业。</b>「运营托」板块已全部解锁——日常运营、数据报表、营销活动都开了,乌托帮从「帮你算」切换到「帮你跑」。
            <button onClick={() => go("ops")} style={{ border: 0, background: "none", color: C.profit, cursor: "pointer", padding: 0, marginLeft: 6, textDecoration: "underline", fontSize: 13 }}>去日常运营</button>
          </div>
        </div>
      )}

      <div style={{ height: 7, background: "#E4E9E7", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${prog * 100}%`, height: "100%", background: accent.main, borderRadius: 4, transition: "width .4s" }} />
      </div>

      <div className="sp-grid g2" style={{ alignItems: "start" }}>
        {store.groups.map((g, gi) => {
          const gDone = g.items.filter((_, ii) => store.done[`${gi}-${ii}`]).length;
          return (
            <Card key={gi} title={`${String(gi + 1).padStart(2, "0")} · ${g.name}`} eyebrow="STAGE"
              right={<Tag tone={gDone === g.items.length ? "profit" : ""}>{gDone}/{g.items.length}</Tag>}>
              {g.items.map((it, ii) => {
                const k = `${gi}-${ii}`;
                const d = !!store.done[k];
                return (
                  <button key={k} className={`sp-todo ${d ? "done" : ""}`} onClick={() => toggle(gi, ii)}>
                    {d ? <CheckCircle2 size={16} color={C.profit} style={{ flexShrink: 0, marginTop: 1 }} />
                      : <Circle size={16} color={C.line} style={{ flexShrink: 0, marginTop: 1 }} />}
                    <span style={{ flex: 1 }}>{it.t}{it.note && <span style={{ color: C.muted, fontSize: 11.5, marginLeft: 6 }}>{it.note}</span>}</span>
                    {it.cost > 0 && <span className="num" style={{ fontSize: 12, color: d ? "#9AA8A4" : C.muted, flexShrink: 0 }}>{yuan(it.cost)} 元</span>}
                  </button>
                );
              })}
            </Card>
          );
        })}
      </div>

      {store.tips?.length > 0 && (
        <Card title="开店提醒" eyebrow="TIPS">
          {store.tips.map((t, i) => (
            <div key={i} className="sp-note tip" style={{ marginBottom: i < store.tips.length - 1 ? 8 : 0 }}>
              <Lightbulb size={15} color={C.amber} /><div>{t}</div></div>
          ))}
        </Card>
      )}
    </div>
  );
}

/* ================= 前台:营销活动(运营托)================= */
function Marketing() {
  const { mode, store, useAI, accent } = useApp();
  const online = mode === "online";
  const [goal, setGoal] = useState("日常拉新");
  const [budget, setBudget] = useState(3000);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [camp, setCamp] = useState(null);

  async function gen() {
    setBusy(true); setCamp(null);
    let result = null;
    if (useAI()) {
      try {
        const sys = "你是中国零售营销操盘手。只输出 JSON,不要解释或代码块标记。字段:title(方案名,14字内),hook(核心主张,24字内),plays(3项数组,每项{n(玩法名,10字内),detail(执行细节含金额,40字内)}),channels(4项数组,每项[渠道名,预算占比数字]),kpi(2条预期效果,各22字内),warn(1条风险提醒,30字内)";
        const q = `${online ? "线上店铺" : "线下门店"},品类${store.info.category},核心产品:${store.info.core},客单价${store.info.price}元。活动目标:${goal},预算${budget}元,时长${days}天。给出可直接执行的营销方案。`;
        const rep = parseJSON(await callAI("campaign", [{ role: "user", content: q }], sys));
        if (rep.plays?.length) result = { ...rep, source: "ai" };
      } catch { /* 落到模板 */ }
    }
    if (!result) result = tplCampaign(mode, goal, budget, days);
    setCamp(result); setBusy(false);
  }

  return (
    <div className="sp-page">
      <div className="sp-head">
        <div>
          <h2 className="sp-h1">营销活动<span className="sp-linechip">{online ? "线上主线" : "线下主线"}</span></h2>
          <p className="sp-sub">说清目标和预算,AI 出一版能直接执行的活动方案——玩法、渠道分配、预期效果、风险提醒。</p>
        </div>
      </div>

      <div className="sp-grid gform">
        <Card title="活动设置" eyebrow="BRIEF">
          <Field label="活动目标">
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {MKT_GOALS.map((g) => (
                <button key={g} className="sp-chip"
                  style={goal === g ? { background: "var(--brand-soft)", borderColor: "var(--brand)", color: "var(--brand-deep)", fontWeight: 600 } : undefined}
                  onClick={() => setGoal(g)}>{g}</button>
              ))}
            </div>
          </Field>
          <div className="sp-rowsplit">
            <Field label="活动预算"><NumIn value={budget} onChange={setBudget} step={500} unit="元" /></Field>
            <Field label="活动时长"><NumIn value={days} onChange={setDays} min={1} unit="天" /></Field>
          </div>
          <Btn variant="pri" style={{ width: "100%", marginTop: 4 }} onClick={gen} disabled={busy}>
            {busy ? <><Loader2 size={15} className="sp-spin" />方案生成中…</> : <><Megaphone size={15} />生成活动方案</>}
          </Btn>
          <div className="sp-note" style={{ marginTop: 12, fontSize: 12 }}>
            <Lightbulb size={14} color={C.muted} />
            <div>提示:同一目标可以多生成几版对比。方案会用到你店铺信息里的品类和客单价。</div>
          </div>
        </Card>

        {!camp ? (
          <Card><Empty icon={Megaphone} title="还没有活动方案"
            desc="左边选好目标和预算,点生成。方案精确到每个玩法花多少钱。" /></Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card title={camp.title} eyebrow="CAMPAIGN"
              right={<Tag tone={camp.source === "ai" ? "brand" : "amber"}>{camp.source === "ai" ? "AI 定制" : "内置模板"}</Tag>}>
              <div style={{ fontSize: 15, fontWeight: 650, lineHeight: 1.5, marginBottom: 13 }}>{camp.hook}</div>
              {camp.plays?.map((p, i) => (
                <div key={i} style={{ display: "flex", gap: 11, padding: "10px 0", borderBottom: i < camp.plays.length - 1 ? `1px dotted ${C.line}` : 0 }}>
                  <div className="sp-idx">{String(i + 1).padStart(2, "0")}</div>
                  <div style={{ flex: 1 }}>
                    <b style={{ fontSize: 13.5 }}>{p.n}</b>
                    <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>{p.detail}</div>
                  </div>
                </div>
              ))}
            </Card>
            <div className="sp-grid g2">
              <Card title="预算分配" eyebrow="CHANNELS">
                {camp.channels?.map(([n, v], ci) => (
                  <div key={n} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                      <span>{n}</span><b className="num">{v}% · {yuan(budget * v / 100)} 元</b>
                    </div>
                    <div style={{ height: 7, background: "#EEF1EF", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${v}%`, height: "100%", background: accent.main, opacity: 1 - ci * 0.16, borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </Card>
              <Card title="预期与风险" eyebrow="KPI & RISK">
                {camp.kpi?.map((k, i) => (
                  <div key={i} className="sp-note win" style={{ marginBottom: 8 }}>
                    <Target size={15} color={C.profit} /><div>{k}</div></div>
                ))}
                {camp.warn && <div className="sp-note risk"><AlertTriangle size={15} color={C.seal} /><div>{camp.warn}</div></div>}
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= 前台:托管服务(运营托)================= */
const ADVISORS = [
  { n: "陈默", tag: "线下连锁 · 12 年", good: "选址谈判 / 单店盈利模型", score: 4.9, done: 217 },
  { n: "苏澄", tag: "电商操盘 · 9 年", good: "投流放量 / 直播起号", score: 4.8, done: 183 },
  { n: "老聂", tag: "餐饮供应链 · 15 年", good: "供应商体系 / 成本管控", score: 4.9, done: 142 },
];
function Hosting() {
  const { plan, openPay, nav } = useApp();
  const isMax = plan === "max";
  const [booked, setBooked] = useState(null);
  const [req, setReq] = useState("");
  const [sent, setSent] = useState(false);

  function book(name) {
    if (!isMax) { openPay("真人顾问 1v1 是「全托管」的服务。升级后每月两次,想约谁都行。"); return; }
    setBooked(name);
  }
  function submit() {
    if (!isMax) { openPay("代运营需求单是「全托管」的服务。升级后 24 小时内有人响应。"); return; }
    if (req.trim()) setSent(true);
  }

  return (
    <div className="sp-page">
      <div className="sp-head">
        <div>
          <h2 className="sp-h1"><Headset size={20} color="var(--brand)" />托管服务</h2>
          <p className="sp-sub">「帮」是 AI 把账算明白,「托」是真人把活儿接过去。这一页是乌托帮的下半场。</p>
        </div>
        <div className="sp-actions">
          {isMax ? <Tag tone="profit"><Crown size={11} />全托管已开通</Tag>
            : <Btn variant="pri" size="sm" icon={Crown} onClick={() => nav("billing")}>开通全托管 ¥299/月</Btn>}
        </div>
      </div>

      <div className="sp-grid g3">
        {[
          { icon: UserRound, t: "真人顾问 1v1", d: "每月两次视频通话,拿着你的报表逐项过,给出下个月的动作清单。" },
          { icon: HandHelping, t: "代运营对接", d: "内容、投流、客服可拆项托管。乌托帮认证团队,按效果结算,费用另计。" },
          { icon: Receipt, t: "月度经营复盘", d: "每月一份人工复核的经营报告:哪里赚的、哪里漏的、下月怎么办。" },
        ].map((s) => (
          <div key={s.t} className="sp-card" style={{ padding: 18 }}>
            <div className="sp-aicap-ic" style={{ width: 36, height: 36, marginBottom: 10 }}><s.icon size={17} /></div>
            <b style={{ fontSize: 14.5 }}>{s.t}</b>
            <p style={{ fontSize: 12.5, color: C.muted, margin: "5px 0 0", lineHeight: 1.65 }}>{s.d}</p>
          </div>
        ))}
      </div>

      <Card title="认证顾问" eyebrow="ADVISORS" right={!isMax && <Tag tone="amber"><Lock size={11} />全托管专属</Tag>}>
        <div className="sp-grid g3">
          {ADVISORS.map((a) => (
            <div key={a.n} style={{ border: `1px solid ${C.line}`, borderRadius: 9, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--brand-soft)", color: "var(--brand-deep)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 15 }}>{a.n[0]}</div>
                <div>
                  <b style={{ fontSize: 14 }}>{a.n}</b>
                  <div style={{ fontSize: 11.5, color: C.muted, fontFamily: "var(--mono)" }}>{a.tag}</div>
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>擅长:{a.good}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 11, fontSize: 12 }}>
                <Star size={13} color={C.amber} fill={C.amber} />
                <b className="num">{a.score}</b>
                <span style={{ color: C.muted }}>· 服务过 {a.done} 家店</span>
              </div>
              {booked === a.n
                ? <Btn size="sm" disabled style={{ width: "100%" }} icon={CheckCircle2}>已预约(演示)</Btn>
                : <Btn size="sm" variant={isMax ? "pri" : ""} style={{ width: "100%" }} onClick={() => book(a.n)}>
                  预约 1v1{!isMax && <Lock size={11} />}
                </Btn>}
            </div>
          ))}
        </div>
      </Card>

      <Card title="提交代运营需求" eyebrow="REQUEST" right={!isMax && <Tag tone="amber"><Lock size={11} />全托管专属</Tag>}>
        {sent ? (
          <div className="sp-note win">
            <CheckCircle2 size={15} color={C.profit} />
            <div><b>需求已提交(演示)。</b>真实环境中,顾问会在 24 小时内联系你拆解需求并给报价。</div>
          </div>
        ) : (
          <>
            <textarea className="sp-input" rows={3} value={req} onChange={(e) => setReq(e.target.value)}
              placeholder="例:想把抖音店的投流托管出去,月预算 4 万,目标 ROI 2.5 以上;或:门店周年庆想找人整体策划执行。" />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <Btn variant="pri" icon={Send} onClick={submit} disabled={isMax && !req.trim()}>提交需求{!isMax && <Lock size={12} />}</Btn>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

/* ================= 应用主壳 ================= */
/**
 * 业务主壳。
 *
 * edition 决定装配出哪个版本(见 editions.js):自部署版没有订阅、后台和托管,
 * 多一个「模型设置」;云端版反过来。业务页面两版共用,不分叉。
 *
 * account / onPlanChange 只有云端版会传:账号信息与档位由服务端下发,
 * 本地版走 edition.plan 常量。
 */
export default function UtobangApp({
  edition = LOCAL_EDITION,
  account = null,
  onPlanChange,
  onCheckout = null,
  onSignOut,
  extraPages = {},
  persistence = null,
} = {}) {
  const [view, setView] = useState("front");
  const [tab, setTab] = useState("overview");
  const [adminTab, setAdminTab] = useState("dash");
  const [mode, setMode] = useState("offline");
  const [localPlan, setLocalPlan] = useState("free");
  const [aiUsed, setAiUsed] = useState(0);
  const [payOpen, setPayOpen] = useState(false);
  const [payMsg, setPayMsg] = useState("");
  const [lockInfo, setLockInfo] = useState(null);
  const [sitesAll, setSitesAll] = useState({ offline: [], online: [] });
  const [chats, setChats] = useState({ offline: null, online: null });
  const [stores, setStores] = useState({ offline: null, online: null });

  // 不计次的版本一律按最高档跑,页面里那些 plan === "free" 的门禁自然全开
  const plan = edition.metering ? (account?.plan || localPlan) : (edition.plan || "max");
  const setPlan = (p) => (onPlanChange ? onPlanChange(p) : setLocalPlan(p));

  const [off, setOff] = useState(DEFAULT_OFFLINE);
  const [on, setOn] = useState(DEFAULT_ONLINE);

  /**
   * 数据持久化(可选)。
   * 自部署版不传 persistence —— 数据只在内存里,关掉标签页就没了,这是刻意的:
   * 零数据库、零运维、隐私最好。云端版传进来,业务数据落库,换设备也在。
   */
  const [hydrated, setHydrated] = useState(!persistence);
  useEffect(() => {
    if (!persistence) return;
    let alive = true;
    persistence.load()
      .then((snap) => {
        if (!alive || !snap) return;
        // 快照可能来自旧版本或被改坏了,形状不对就当没有 —— 不能让用户卡在白屏上
        if (snap.stores) setStores({
          offline: validStore(snap.stores.offline),
          online: validStore(snap.stores.online),
        });
        if (snap.sitesAll) setSitesAll({
          offline: Array.isArray(snap.sitesAll.offline) ? snap.sitesAll.offline : [],
          online: Array.isArray(snap.sitesAll.online) ? snap.sitesAll.online : [],
        });
        if (snap.chats) setChats({ offline: snap.chats.offline ?? null, online: snap.chats.online ?? null });
        if (snap.off) setOff({ ...DEFAULT_OFFLINE, ...snap.off });
        if (snap.on) setOn({ ...DEFAULT_ONLINE, ...snap.on });
      })
      .catch(() => { /* 读不到就当新用户,不挡在门外 */ })
      .finally(() => alive && setHydrated(true));
    return () => { alive = false; };
  }, [persistence]);

  // 防抖写回:改一个数字就发一次请求太浪费
  useEffect(() => {
    if (!persistence || !hydrated) return;
    const t = setTimeout(() => {
      persistence.save({ stores, sitesAll, chats, off, on }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [persistence, hydrated, stores, sitesAll, chats, off, on]);

  const store = stores[mode];
  const setStore = (patch) => setStores((all) => ({
    ...all,
    [mode]: { ...all[mode], ...(typeof patch === "function" ? patch(all[mode]) : patch) },
  }));

  const project = store
    ? { name: store.info.name, city: store.info.city || "全国", category: store.info.category, stage: store.opened ? 4 : 2 }
    : (mode === "online"
      ? { name: "未创建的线上店", city: "全国", category: "—", stage: 0 }
      : { name: "未创建的线下店", city: "—", category: "—", stage: 0 });

  const calc = useMemo(() => (mode === "online" ? calcOnline(on) : calcOffline(off)), [mode, on, off]);
  const riskInfo = useMemo(() => detectRisks(mode, mode === "online" ? on : off, calc), [mode, on, off, calc]);
  const accent = ACCENTS[mode];

  const quota = edition.metering ? PLANS[plan].ai : Infinity;
  const aiLeft = quota === Infinity ? Infinity : Math.max(0, quota - aiUsed);

  // 本地先自增让额度条立刻动;服务端每次回传真实用量时校正过来
  const serverUsed = account?.aiUsed;
  useEffect(() => {
    if (typeof serverUsed === "number") setAiUsed(serverUsed);
  }, [serverUsed]);

  /** 不带订阅的版本没有付费墙,提示直接吞掉 */
  function openPay(msg) {
    if (!edition.billing) return;
    setPayMsg(msg); setPayOpen(true);
  }
  function useAI() {
    if (!edition.metering) return true;
    if (aiLeft === Infinity) return true;
    if (aiLeft <= 0) {
      openPay(plan === "free"
        ? "「帮一把」的 3 次免费 AI 已用完。升级「深度帮」得到每月 100 次,外加深度扫描和预算体检。"
        : "本月 AI 次数已用完。升级「全托管」不限次数,还有真人顾问。");
      return false;
    }
    setAiUsed((n) => n + 1);
    return true;
  }

  const ctx = {
    edition, account, onSignOut, onCheckout,
    mode, plan, setPlan, aiUsed, aiLeft, useAI, openPay,
    sites: sitesAll[mode],
    setSites: (updater) => setSitesAll((all) => ({
      ...all, [mode]: typeof updater === "function" ? updater(all[mode]) : updater,
    })),
    off, setOff, on, setOn, calc, project, riskInfo, accent, chats, setChats,
    store, setStore, nav: setTab,
  };

  const NAV_PREP = [
    { k: "overview", label: "总览", icon: LayoutGrid },
    { k: "checklist", label: "开店清单", icon: CheckCircle2, ai: true },
    { k: "budget", label: "预算测算", icon: Calculator },
    mode === "online"
      ? { k: "site", label: "平台选择", icon: Globe, ai: true }
      : { k: "site", label: "选址分析", icon: MapPin, ai: true },
    { k: "risk", label: "风险识别", icon: ShieldAlert, ai: true },
    { k: "advisor", label: "AI 参谋", icon: Bot, ai: true },
  ];
  /** 「托」板块整组随 edition.ops 走 —— 自部署版没有这一板块 */
  const NAV_OPS = edition.ops ? [
    { k: "ops", label: "日常运营", icon: Activity, ai: true },
    { k: "report", label: "数据报表", icon: TrendingUp },
    { k: "marketing", label: "营销活动", icon: Megaphone, ai: true },
    ...(edition.hosting ? [{ k: "hosting", label: "托管服务", icon: Headset }] : []),
  ] : [];
  /** 「自定义」板块:云端是订阅账单,自部署是模型设置 */
  const NAV_COMMON = [
    ...(edition.billing ? [{ k: "billing", label: "订阅与账单", icon: Receipt }] : []),
    ...(edition.settings ? [{ k: "settings", label: "模型设置", icon: Wrench }] : []),
  ];
  const ADMIN_NAV = [
    { k: "dash", label: "平台看板", icon: TrendingUp },
    { k: "users", label: "用户与订阅", icon: Users },
    { k: "ai", label: "AI 用量监控", icon: Server },
  ];

  const isAdmin = edition.admin && view === "admin";
  const opened = !!store?.opened;
  /** 这些页面不依赖店铺,未建店也能直接进 */
  const STANDALONE = new Set(["billing", "settings", "hosting"]);
  /**
   * 线上/线下主线切换只属于「帮」板块 —— 只有这些页面(和未建店的向导)
   * 的内容跟主线绑定。托、自定义板块不显示切换。
   */
  const PREP_TABS = new Set(["overview", "checklist", "budget", "site", "risk", "advisor"]);
  const showModeSeg = PREP_TABS.has(tab) || (!store && !STANDALONE.has(tab));

  let page;
  if (isAdmin) {
    page = adminTab === "dash" ? <AdminDash /> : adminTab === "users" ? <AdminUsers /> : <AdminAI />;
  } else if (!store && !STANDALONE.has(tab)) {
    page = <Wizard mode={mode} setMode={setMode}
      onDone={(info, planObj) => {
        setStores((all) => ({
          ...all,
          [mode]: { info, groups: planObj.groups, tips: planObj.tips || [], source: planObj.source, done: {}, opened: false },
        }));
        setTab("checklist");
      }} />;
  } else {
    page = tab === "overview" ? <Overview go={setTab} />
      : tab === "checklist" ? <Checklist go={setTab} />
      : tab === "site" ? <SiteFinder />
      : tab === "budget" ? <Budget />
      : tab === "ops" ? (mode === "online" ? <OpsToolsOnline /> : <OpsToolsOffline />)
      : tab === "report" ? (mode === "online" ? <ReportOnline /> : <ReportOffline />)
      : tab === "marketing" ? <Marketing />
      : tab === "hosting" ? <Hosting />
      : tab === "risk" ? <RiskPage />
      : tab === "advisor" ? <Advisor />
      : tab === "settings" ? <LLMSettings apiFetch={apiFetch} />
      : extraPages[tab] ? extraPages[tab]()
      : edition.billing ? <Billing />
      : <Overview go={setTab} />;
  }

  function clickNav(k, locked) {
    if (!locked) { setTab(k); return; }
    if (!store) {
      setLockInfo({
        title: "先完成开店设置",
        msg: "先走完「开店设置」的三步——选主线、说清楚你卖什么、AI 生成方案。开店清单、预算、风险都会基于你的店铺信息生成。",
        btn: "去开店设置", to: "overview",
      });
    } else {
      setLockInfo({
        title: "开业后解锁",
        msg: `「日常运营」「数据报表」「营销活动」在开业后解锁${edition.hosting ? "(托管服务随时可看)" : ""}。先到「开店清单」把主要任务(60% 以上)做完,点「标记已开业」。`,
        btn: "去开店清单", to: "checklist",
      });
    }
  }

  return (
    <AppCtx.Provider value={ctx}>
      <style>{CSS}</style>
      {/* 主线配色只在「帮」板块生效,托/自定义板块用默认青色,不泄漏线上线下的区别 */}
      <div className="sp" data-line={!isAdmin && showModeSeg ? mode : "offline"}>
        <nav className="sp-nav">
          <div className="sp-brand">
            <div className="sp-brand-row">
              <div className="sp-mark"><HandHelping size={15} /></div>
              <div>
                <div className="sp-brand-name">乌托帮</div>
                <div className="sp-brand-sub">{edition.brandSub}</div>
              </div>
            </div>
          </div>

          {edition.admin && (
            <div className="sp-viewseg">
              <button className={!isAdmin ? "on" : ""} onClick={() => setView("front")}>
                <Store size={13} />业务前台
              </button>
              <button className={isAdmin ? "on" : ""} onClick={() => setView("admin")}>
                <Building2 size={13} />管理后台
              </button>
            </div>
          )}

          <div className="sp-navlist">
            {isAdmin ? (
              <>
                <div className="sp-navgroup"><i />平台运营</div>
                {ADMIN_NAV.map((n) => (
                  <button key={n.k} className={`sp-navitem ${adminTab === n.k ? "on" : ""}`} onClick={() => setAdminTab(n.k)}>
                    <n.icon size={16} strokeWidth={1.9} />{n.label}
                  </button>
                ))}
              </>
            ) : (
              <>
                <div className="sp-navgroup"><i />帮 · 开店帮助</div>
                {!store && (
                  <button className={`sp-navitem ${!STANDALONE.has(tab) ? "on" : ""}`}
                    onClick={() => setTab("overview")}>
                    <Sparkles size={16} strokeWidth={1.9} />开店设置
                    <span className="badge">3 步</span>
                  </button>
                )}
                {NAV_PREP.map((n) => {
                  const locked = !store;
                  return (
                    <button key={n.k} className={`sp-navitem ${store && tab === n.k ? "on" : ""}`}
                      style={locked ? { opacity: 0.45 } : undefined}
                      onClick={() => clickNav(n.k, locked)}>
                      {locked ? <Lock size={16} strokeWidth={1.9} /> : <n.icon size={16} strokeWidth={1.9} />}
                      {n.label}
                      {n.ai && !locked && <span className="badge">AI</span>}
                    </button>
                  );
                })}
                {NAV_OPS.length > 0 && <div className="sp-navgroup"><i />托 · 运营托管</div>}
                {NAV_OPS.map((n) => {
                  const locked = !opened && n.k !== "hosting";
                  return (
                    <button key={n.k} className={`sp-navitem ${tab === n.k ? "on" : ""}`}
                      style={locked ? { opacity: 0.45 } : undefined}
                      onClick={() => clickNav(n.k, locked)}>
                      {locked ? <Lock size={16} strokeWidth={1.9} /> : <n.icon size={16} strokeWidth={1.9} />}
                      {n.label}
                      {n.ai && !locked && <span className="badge">AI</span>}
                    </button>
                  );
                })}
                {NAV_COMMON.length > 0 && <div className="sp-navgroup"><i />自定义</div>}
                {NAV_COMMON.map((n) => (
                  <button key={n.k} className={`sp-navitem ${tab === n.k ? "on" : ""}`} onClick={() => setTab(n.k)}>
                    <n.icon size={16} strokeWidth={1.9} />{n.label}
                  </button>
                ))}
              </>
            )}
          </div>

          {!isAdmin && edition.metering && (
            <div className="sp-quota">
              <div className="sp-quota-top">
                <span className="sp-quota-label">AI 额度 · {PLANS[plan].name}</span>
                <span className="sp-quota-num">{aiLeft === Infinity ? "∞" : `${aiLeft}/${quota}`}</span>
              </div>
              <div className="sp-bar">
                <i style={{ width: aiLeft === Infinity ? "100%" : `${(aiLeft / quota) * 100}%` }} />
              </div>
              {plan !== "max" && (
                <button className="sp-upsell" onClick={() => setTab("billing")}>
                  <Crown size={12} />{plan === "free" ? "升级深度帮" : "升级全托管"}
                </button>
              )}
            </div>
          )}
        </nav>

        <div className="sp-main">
          <div className="sp-top">
            {isAdmin ? (
              <>
                <div className="sp-proj">
                  <Building2 size={16} color={C.muted} />
                  <span className="sp-proj-name">乌托帮 · 管理后台</span>
                  <span className="sp-proj-meta">ADMIN CONSOLE</span>
                </div>
                <div className="sp-topright"><Tag tone="amber">演示数据</Tag><Tag tone="dark">运营视角</Tag></div>
              </>
            ) : (
              <>
                <div className="sp-proj">
                  {mode === "online" ? <Globe size={16} color={accent.main} /> : <Store size={16} color={accent.main} />}
                  <span className="sp-proj-name">{store ? store.info.name : "开店设置"}</span>
                  <span className="sp-proj-meta">
                    {store ? `${project.city} · ${project.category}` : "三步创建你的店"}
                  </span>
                  {store && <Tag tone={opened ? "profit" : "amber"}>{opened ? "营业中" : "筹备中"}</Tag>}
                </div>
                {showModeSeg && (
                  <div className="sp-seg">
                    <button className={mode === "offline" ? "on" : ""} onClick={() => setMode("offline")}>
                      <Store size={13} />线下实体店
                    </button>
                    <button className={mode === "online" ? "on" : ""} onClick={() => setMode("online")}>
                      <Globe size={13} />线上店铺
                    </button>
                  </div>
                )}
                <div className="sp-topright">
                  {edition.showPlanTag && (
                    <Tag tone={plan === "free" ? "" : "brand"}>{plan !== "free" && <Crown size={11} />}{PLANS[plan].name}</Tag>
                  )}
                  {account && <Tag tone="dark"><UserRound size={11} />{account.email}</Tag>}
                  {onSignOut && <Btn size="sm" onClick={onSignOut}>退出</Btn>}
                </div>
              </>
            )}
          </div>
          <div className="sp-body">{page}</div>
        </div>

        <Modal open={payOpen} onClose={() => setPayOpen(false)} title="需要更高的方案" icon={Lock} width={430}>
          <div className="sp-note tip" style={{ marginBottom: 14 }}>
            <Sparkles size={15} color={C.amber} /><div>{payMsg}</div>
          </div>
          <div style={{ display: "flex", gap: 9 }}>
            <Btn style={{ flex: 1 }} onClick={() => setPayOpen(false)}>先不用</Btn>
            <Btn variant="pri" style={{ flex: 1 }} icon={Crown}
              onClick={() => { setPayOpen(false); setView("front"); setTab("billing"); }}>
              看看方案
            </Btn>
          </div>
        </Modal>

        <Modal open={!!lockInfo} onClose={() => setLockInfo(null)} title={lockInfo?.title || ""} icon={Lock} width={420}>
          <div className="sp-note tip" style={{ marginBottom: 14 }}>
            <Lock size={15} color={C.amber} /><div>{lockInfo?.msg}</div>
          </div>
          <Btn variant="pri" style={{ width: "100%" }}
            onClick={() => { const to = lockInfo?.to || "overview"; setLockInfo(null); setTab(to); }}>
            {lockInfo?.btn || "好的"}
          </Btn>
        </Modal>
      </div>
    </AppCtx.Provider>
  );
}
