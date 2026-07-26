import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcOffline, calcOnline, detectRisks, tplChecklist, parseJSON,
  DEFAULT_OFFLINE, DEFAULT_ONLINE, planAllows,
} from "../src/index.js";

test("线下:启动资金 = 一次性投入 + 备用金", () => {
  const c = calcOffline(DEFAULT_OFFLINE);
  assert.equal(Math.round(c.startup), Math.round(c.oneTime + c.reserve));
  assert.equal(c.flow.length, 12);
});

test("线下:保本日客流处按保本营业额换算,且与毛利率联动", () => {
  const c = calcOffline(DEFAULT_OFFLINE);
  assert.ok(Math.abs(c.beRevenue - c.fixed / DEFAULT_OFFLINE.gross) < 1e-6);
  const worse = calcOffline({ ...DEFAULT_OFFLINE, gross: 0.4 });
  assert.ok(worse.beDaily > c.beDaily, "毛利率降低,保本客流应上升");
});

test("线上:退货率吃掉 GMV,单均模型为负时应报高风险", () => {
  const c = calcOnline(DEFAULT_ONLINE);
  assert.ok(c.validGmv < c.gmv);
  const bad = { ...DEFAULT_ONLINE, gross: 0.05, commission: 0.2 };
  const r = detectRisks("online", bad, calcOnline(bad));
  assert.ok(r.risks.some((x) => x.title.includes("单均经济模型为负")));
});

test("风险分随高危项增加而下降,且始终在 5–98 区间", () => {
  const good = detectRisks("offline", DEFAULT_OFFLINE, calcOffline(DEFAULT_OFFLINE));
  const bad = { ...DEFAULT_OFFLINE, rent: 60000, reserveMonths: 1, daily: 20 };
  const worse = detectRisks("offline", bad, calcOffline(bad));
  assert.ok(worse.score < good.score);
  for (const s of [good.score, worse.score]) assert.ok(s >= 5 && s <= 98);
  assert.equal(good.radar.length, 5);
});

test("内置模板:五个阶段,金额跟着预算参数走", () => {
  const p = { ...DEFAULT_OFFLINE, transfer: 99999 };
  const tpl = tplChecklist("offline", p);
  assert.equal(tpl.groups.length, 5);
  assert.equal(tpl.source, "tpl");
  const all = tpl.groups.flatMap((g) => g.items);
  assert.ok(all.some((i) => i.cost === 99999), "转让费应取自参数");
  assert.equal(tplChecklist("online", DEFAULT_ONLINE).groups.length, 5);
});

test("parseJSON 能剥掉代码块标记与前后解释", () => {
  assert.deepEqual(parseJSON('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJSON('好的,结果是:{"a":2} 以上'), { a: 2 });
});

test("档位比较", () => {
  assert.ok(planAllows("pro", "free"));
  assert.ok(!planAllows("free", "pro"));
  assert.ok(planAllows("max", "pro"));
});
