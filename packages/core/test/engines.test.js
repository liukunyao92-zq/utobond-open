import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcOffline, calcOnline, detectRisks, tplChecklist, parseJSON,
  calcByMode, tplCampaign, capabilityMinPlan, CAPABILITY_LIST,
  yuan, wan, pct, clamp, seeded,
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

test("线下预约制:按时段容量与利用率估算收入和保本利用率", () => {
  const p = {
    ...DEFAULT_OFFLINE,
    revenueModel: "booking",
    price: 60,
    slotMinutes: 30,
    capacityUnits: 4,
    openHours: 12,
    utilization: 0.5,
    days: 30,
  };
  const c = calcOffline(p);
  assert.equal(c.dailyCapacitySlots, 96);
  assert.equal(c.dailyBookedSlots, 48);
  assert.equal(c.monthlyBookedSlots, 1440);
  assert.equal(c.revenue, 86400);
  assert.equal(c.hourlyRate, 120);
  assert.ok(Math.abs(c.beUtilization - c.beRevenue / 30 / 60 / 96) < 1e-9);

  const low = { ...p, utilization: 0.01 };
  const risks = detectRisks("offline", low, calcOffline(low));
  assert.ok(risks.risks.some((risk) => risk.title.includes("预约利用率低于保本线")));
});

test("线上:退货率吃掉 GMV,单均模型为负时应报高风险", () => {
  const c = calcOnline(DEFAULT_ONLINE);
  assert.ok(c.validGmv < c.gmv);
  const bad = { ...DEFAULT_ONLINE, gross: 0.05, commission: 0.2 };
  const r = detectRisks("online", bad, calcOnline(bad));
  assert.ok(r.risks.some((x) => x.title.includes("单均经济模型为负")));
});

test("线上:净利、现金流与保本单量使用同一退货及物流口径", () => {
  const p = DEFAULT_ONLINE;
  const c = calcOnline(p);
  const validRevenuePerOrder = p.price * (1 - p.returnRate);
  const contributionPerOrder = validRevenuePerOrder * (p.gross - p.commission) - p.shipping;
  assert.ok(Math.abs(c.beOrders * contributionPerOrder - c.fixed) < 1e-6);
  assert.ok(Math.abs(c.beRevenue - c.beOrders * validRevenuePerOrder) < 1e-6);
  assert.equal(c.flow[4].月净利, Math.round(c.net), "满产月份现金流应与月净利一致");
});

test("风险分随高危项增加而下降,且始终在 5–98 区间", () => {
  const good = detectRisks("offline", DEFAULT_OFFLINE, calcOffline(DEFAULT_OFFLINE));
  const bad = { ...DEFAULT_OFFLINE, rent: 60000, reserveMonths: 1, daily: 20 };
  const worse = detectRisks("offline", bad, calcOffline(bad));
  assert.ok(worse.score < good.score);
  for (const s of [good.score, worse.score]) assert.ok(s >= 5 && s <= 98);
  assert.equal(good.radar.length, 5);
});

test("风险识别联动项目品类与选址报告", () => {
  const p = { ...DEFAULT_OFFLINE, license: 1000 };
  const context = {
    category: "网球训练馆",
    core: "网球场地预约与教练训练",
    sites: [{
      name: "城西候选馆",
      form: { rent: 20000 },
      report: { score: 58, risks: ["停车位不足"], actions: ["晚高峰实测停车"] },
    }],
  };
  const risks = detectRisks("offline", p, calcOffline(p), context).risks;
  assert.ok(risks.some((risk) => risk.title.includes("选址评分 58 分")));
  assert.ok(risks.some((risk) => risk.title === "候选点位租金与预算未同步"));
  assert.ok(risks.some((risk) => risk.title === "核心场地与人员依赖"));
  assert.ok(!risks.some((risk) => risk.title === "证照预算偏紧"), "非餐饮项目不应套用食品证照风险");

  const foodRisks = detectRisks("offline", p, calcOffline(p), { category: "精品咖啡" }).risks;
  assert.ok(foodRisks.some((risk) => risk.title === "证照预算偏紧"));
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

test("公共格式化、分发与能力契约", () => {
  assert.equal(yuan(1234.4), "1,234");
  assert.equal(wan(12345), "1.2");
  assert.equal(pct(0.123), "12.3");
  assert.equal(clamp(12, 0, 10), 10);
  assert.equal(seeded(7)(), seeded(7)(), "同一 seed 应复现相同结果");
  assert.equal(calcByMode("online", DEFAULT_ONLINE).kind, "online");
  assert.equal(calcByMode("offline", DEFAULT_OFFLINE).kind, "offline");
  assert.equal(capabilityMinPlan("budgetAudit"), "pro");
  assert.equal(capabilityMinPlan("unknown"), "free");
  assert.equal(CAPABILITY_LIST.length, 7);
});

test("营销兜底模板覆盖线上与线下", () => {
  const online = tplCampaign("online", "日常拉新", 10000, 7);
  const offline = tplCampaign("offline", "开业引爆", 8000, 5);
  assert.equal(online.plays.length, 3);
  assert.equal(offline.plays.length, 3);
  assert.notDeepEqual(online.channels, offline.channels);
  assert.match(online.title, /7 天/);
});
