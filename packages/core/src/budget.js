/**
 * 预算与现金流计算引擎。
 * 两条主线各一套模型:线下看房租/装修/客流,线上看投流/转化/退货。
 * 所有对外展示的金额、比率都来自这里,提示词里也只能引用这里的数字。
 */
import { yuan } from "./format.js";

/** 12 个月爬坡系数:新店不会开门就满负荷 */
export const RAMP = [0.5, 0.7, 0.85, 0.95, 1, 1, 1.02, 1.05, 1.05, 1.08, 1.1, 1.12];

/** 线下实体店默认参数 */
export const DEFAULT_OFFLINE = {
  area: 45, rent: 12000, depositMonths: 3, transfer: 40000, decorPerSqm: 1800,
  equipment: 80000, stock: 30000, license: 5000, launch: 15000,
  staff: 2, salary: 5500, utility: 2500, otherFixed: 1200,
  price: 26, daily: 110, gross: 0.62, days: 30, reserveMonths: 3,
};

/** 线上店铺默认参数 */
export const DEFAULT_ONLINE = {
  bond: 5000, stock: 60000, visual: 12000, gear: 15000, tools: 3600,
  price: 89, visitors: 3000, cvr: 0.023, gross: 0.55, commission: 0.05,
  shipping: 6.5, returnRate: 0.12, adSpend: 40000,
  staff: 2, salary: 6000, otherFixed: 2000, reserveMonths: 3,
};

export function calcOffline(p) {
  const decor = p.area * p.decorPerSqm;
  const depositAmt = p.rent * p.depositMonths;
  const oneTime = p.transfer + depositAmt + decor + p.equipment + p.stock + p.license + p.launch;
  const fixed = p.rent + p.staff * p.salary + p.utility + p.otherFixed;
  const reserve = fixed * p.reserveMonths;
  const startup = oneTime + reserve;
  const revenue = p.daily * p.price * p.days;
  const net = revenue * p.gross - fixed;
  const beRevenue = p.gross > 0 ? fixed / p.gross : Infinity;
  const beDaily = isFinite(beRevenue) ? beRevenue / p.days / p.price : Infinity;
  const payback = net > 0 ? oneTime / net : null;
  let cum = -startup;
  const flow = RAMP.map((r, i) => {
    const rev = revenue * r;
    const m = rev * p.gross - fixed;
    cum += m;
    return { m: `M${i + 1}`, 营业额: Math.round(rev), 月净利: Math.round(m), 累计现金: Math.round(cum) };
  });
  const breakMonth = flow.findIndex((f) => f.累计现金 >= 0);
  return {
    kind: "offline", decor, depositAmt, oneTime, fixed, reserve, startup,
    revenue, net, beRevenue, beDaily, payback, flow,
    breakMonth: breakMonth >= 0 ? breakMonth + 1 : null,
    sqmDay: revenue / p.days / p.area,
    items: [
      ["转让费", p.transfer, "接手上一家的剩余价值"],
      [`押金(押${p.depositMonths}付1)`, depositAmt, "退租时可收回"],
      [`装修 ${p.area}㎡ × ${yuan(p.decorPerSqm)}/㎡`, decor, "含水电改造与消防"],
      ["设备采购", p.equipment, "后厨、前台、家具"],
      ["首批库存", p.stock, "原料与包材"],
      ["证照办理", p.license, "营业执照、食品经营许可"],
      ["开业营销", p.launch, "开业活动与首月投放"],
    ],
    fixedItems: [
      ["房租", p.rent],
      [`人力 ${p.staff}人 × ${yuan(p.salary)}`, p.staff * p.salary],
      ["水电物业", p.utility],
      ["其他固定支出", p.otherFixed],
    ],
  };
}

export function calcOnline(p) {
  const oneTime = p.bond + p.stock + p.visual + p.gear + p.tools;
  const fixed = p.staff * p.salary + p.otherFixed + p.adSpend;
  const reserve = fixed * p.reserveMonths;
  const startup = oneTime + reserve;
  const orders = p.visitors * p.cvr * 30;
  const gmv = orders * p.price;
  const validGmv = gmv * (1 - p.returnRate);
  const cogs = validGmv * (1 - p.gross);
  const fee = validGmv * p.commission;
  const logistics = orders * p.shipping;
  const net = validGmv - cogs - fee - logistics - fixed;
  const roi = p.adSpend > 0 ? validGmv / p.adSpend : Infinity;
  // 有效 GMV 已扣退货，但物流费发生在全部下单量上；统一换算到有效 GMV 口径。
  const validRevenuePerOrder = p.price * (1 - p.returnRate);
  const contributionPerOrder = validRevenuePerOrder * (p.gross - p.commission) - p.shipping;
  const marginRate = validRevenuePerOrder > 0 ? contributionPerOrder / validRevenuePerOrder : -Infinity;
  const beGmv = marginRate > 0 ? fixed / marginRate : Infinity;
  const beOrders = contributionPerOrder > 0 ? fixed / contributionPerOrder : Infinity;
  const payback = net > 0 ? oneTime / net : null;
  let cum = -startup;
  const flow = RAMP.map((r, i) => {
    const g = validGmv * r;
    const m = g * marginRate - fixed;
    cum += m;
    return { m: `M${i + 1}`, 营业额: Math.round(g), 月净利: Math.round(m), 累计现金: Math.round(cum) };
  });
  const breakMonth = flow.findIndex((f) => f.累计现金 >= 0);
  return {
    kind: "online", oneTime, fixed, reserve, startup, orders, gmv, validGmv,
    revenue: validGmv, net, roi, beRevenue: beGmv, beOrders, payback, flow,
    marginRate, breakMonth: breakMonth >= 0 ? breakMonth + 1 : null,
    items: [
      ["平台保证金", p.bond, "闭店后可退"],
      ["首批备货", p.stock, "按 1.5 个月销量备"],
      ["店铺视觉", p.visual, "主图、详情页、模特"],
      ["拍摄设备", p.gear, "灯光、相机、场地"],
      ["软件年费", p.tools, "ERP、数据工具"],
    ],
    fixedItems: [
      ["推广投流", p.adSpend],
      [`人力 ${p.staff}人 × ${yuan(p.salary)}`, p.staff * p.salary],
      ["其他固定支出", p.otherFixed],
    ],
  };
}

/** 按主线分发 */
export const calcByMode = (mode, p) => (mode === "online" ? calcOnline(p) : calcOffline(p));
