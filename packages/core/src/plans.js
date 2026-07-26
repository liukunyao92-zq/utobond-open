/**
 * 订阅档位定义。
 * 本地自部署版不使用这里的额度(用户用自己的 Key,不限次);
 * 云端 SaaS 版把它作为门禁与计费的唯一事实来源,前后端共用同一份。
 */

export const PLANS = {
  free: { key: "free", name: "帮一把", price: 0, ai: 3, sites: 1, tag: "" },
  pro: { key: "pro", name: "深度帮", price: 99, ai: 100, sites: 5, tag: "多数人选它" },
  max: { key: "max", name: "全托管", price: 299, ai: Infinity, sites: 10, tag: "" },
};

export const PLAN_FEATURES = [
  ["AI 分析次数", "3 次 / 月", "100 次 / 月", "不限"],
  ["候选点位 / 平台方案", "1 个", "5 个", "10 个"],
  ["预算测算与现金流", true, true, true],
  ["风险识别(规则引擎)", true, true, true],
  ["AI 深度风险扫描", false, true, true],
  ["AI 预算体检", false, true, true],
  ["双线经营看板", true, true, true],
  ["导出 PDF 报告", false, true, true],
  ["多店铺管理", false, "3 家", "不限"],
  ["真人顾问 / 托管对接", false, false, "代运营支持"],
];

/** 档位排序,用于「当前档位是否够用」的比较 */
export const PLAN_RANK = { free: 0, pro: 1, max: 2 };

/** 某档位能否使用某个最低档位要求的能力 */
export const planAllows = (plan, minPlan) =>
  (PLAN_RANK[plan] ?? 0) >= (PLAN_RANK[minPlan] ?? 0);
