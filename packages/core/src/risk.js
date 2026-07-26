/**
 * 风险规则引擎(免费层)。
 * 只吃预算引擎的输出,不调模型 —— 所以离线可用、结果可复现、能实时联动参数。
 * AI 深度扫描是在这之上补盲区,不替代它。
 */
import { clamp, pct } from "./format.js";

/** 扣分权重 */
const WEIGHT = { 高: 18, 中: 9, 低: 4 };
const CATS = ["现金流", "市场", "运营", "供给", "合规"];

export function detectRisks(mode, p, calc) {
  const R = [];
  const add = (cat, level, title, detail, fix) => R.push({ cat, level, title, detail, fix });
  if (mode === "offline") {
    const rentRatio = p.rent / calc.revenue;
    if (rentRatio > 0.2) add("现金流", "高", `房租占营业额 ${pct(rentRatio)}%`, "超过 20% 的警戒线,旺季也难覆盖", "谈免租期或降租;或先验证客单价能否提 10%");
    else if (rentRatio > 0.13) add("现金流", "中", `房租占营业额 ${pct(rentRatio)}%`, "处于 13–20% 的敏感区", "合同里锁定两年租金涨幅上限");
    if (p.reserveMonths < 3) add("现金流", "中", `备用金仅 ${p.reserveMonths} 个月`, "爬坡期通常要 3–4 个月才稳", "备用金补足到 3 个月固定支出");
    if (!calc.payback || calc.payback > 18) add("现金流", "高", "回本周期超过 18 个月", "期间任何波动都会被放大", "装修和设备砍 20%,先轻资产验证");
    else if (calc.payback > 12) add("现金流", "低", `回本约 ${calc.payback.toFixed(1)} 个月`, "在 12–18 个月区间,可接受但偏慢", "开业前三个月每周对一次现金流");
    if (p.daily < calc.beDaily) add("市场", "高", "客流假设低于保本线", `保本要 ${Math.round(calc.beDaily)} 人/天,当前假设 ${p.daily} 人`, "签约前先蹲点两周实数人流");
    const sunk = (calc.depositAmt + p.transfer) / calc.startup;
    if (sunk > 0.35) add("市场", "中", `沉没成本占启动资金 ${pct(sunk)}%`, "押金加转让费不产生任何营收", "转让费谈分期,整体压到 30% 以内");
    const laborRatio = (p.staff * p.salary) / calc.revenue;
    if (laborRatio > 0.25) add("运营", "中", `人力占营业额 ${pct(laborRatio)}%`, "超过 25% 说明排班有冗余", "高峰时段兼职化:1 全职 + 2 兼职起步");
    if (p.license < 3000) add("合规", "低", "证照预算偏紧", "餐饮类含食品经营许可通常 3000 元起", "签约前确认物业能过环评和消防");
    add("供给", "低", "单一供应商依赖", "主要原料断供,门店直接停摆", "关键原料至少备两家供应商比价");
  } else {
    const adRatio = p.adSpend / calc.validGmv;
    if (adRatio > 0.3) add("现金流", "高", `投流占 GMV ${pct(adRatio)}%`, "停投即停单,现金消耗极快", "ROI 低于 1.8 的计划全停,先做自然流");
    else if (adRatio > 0.2) add("现金流", "中", `投流占 GMV ${pct(adRatio)}%`, "处于 20–30% 的敏感区", "逐周降 3 个点,用内容流量补位");
    if (calc.roi < 1.5) add("市场", "高", `投流 ROI 仅 ${isFinite(calc.roi) ? calc.roi.toFixed(2) : "—"}`, "低于 1.5 基本是亏钱买量", "停投,复盘素材和人群包再开");
    else if (calc.roi < 2.5) add("市场", "中", `投流 ROI ${calc.roi.toFixed(2)}`, "未到 2.5 的安全线", "素材周更 5 条,跑赢衰减速度");
    if (p.returnRate > 0.15) add("运营", "高", `退货率 ${pct(p.returnRate)}%`, "高于 15%,吞掉利润还拉低店铺权重", "按 SKU 拉退货理由,集中项先改");
    else if (p.returnRate > 0.1) add("运营", "中", `退货率 ${pct(p.returnRate)}%`, "高于多数品类均值", "详情页管理预期,减少过度承诺");
    if (p.cvr < 0.02) add("市场", "中", `转化率 ${pct(p.cvr)}%`, "低于行业 2% 的基准", "主图做 A/B,首屏卖点重排");
    const cover = p.stock / (calc.validGmv * (1 - p.gross) || 1);
    if (cover < 1) add("供给", "中", `备货仅覆盖 ${cover.toFixed(1)} 个月`, "一起量就断货,流量白买", "按 1.5 个月销量滚动补货");
    else if (cover > 2.5) add("供给", "中", `备货压了 ${cover.toFixed(1)} 个月`, "现金被压在库存上", "首批砍半,用预售试深度");
    if (calc.marginRate <= 0) add("现金流", "高", "单均经济模型为负", "每多卖一单就多亏一单", "先调价或换品,再谈投放");
    add("合规", "低", "平台规则依赖", "佣金与流量政策随时可能调整", "双平台起步,私域承接 20% 复购");
  }
  const score = clamp(Math.round(98 - R.reduce((a, r) => a + WEIGHT[r.level], 0)), 5, 98);
  const radar = CATS.map((c) => ({
    name: c,
    score: clamp(100 - R.filter((r) => r.cat === c).reduce((a, r) => a + WEIGHT[r.level] * 1.6, 0), 25, 100),
  }));
  return { risks: R, score, radar };
}
