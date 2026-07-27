/**
 * AI 能力登记表。
 * 每次调用带上 capability id,云端据此做门禁、计量与成本归因;
 * 当前应用只用来在「模型设置」页展示能力清单,不做拦截。
 */

export const CAPABILITIES = {
  checklist: { id: "checklist", label: "开店清单生成", page: "开店设置 / 开店清单", minPlan: "free", maxTokens: 1400 },
  site: { id: "site", label: "选址 / 平台评估", page: "选址分析", minPlan: "free", maxTokens: 1200 },
  budgetAudit: { id: "budgetAudit", label: "预算体检", page: "预算测算", minPlan: "pro", maxTokens: 1100 },
  riskScan: { id: "riskScan", label: "深度风险扫描", page: "风险识别", minPlan: "pro", maxTokens: 1200 },
  opsDiag: { id: "opsDiag", label: "运营诊断", page: "日常运营", minPlan: "free", maxTokens: 1100 },
  campaign: { id: "campaign", label: "营销方案", page: "营销活动", minPlan: "free", maxTokens: 1200 },
  advisor: { id: "advisor", label: "参谋对话", page: "AI 参谋", minPlan: "free", maxTokens: 900 },
};

export const CAPABILITY_LIST = Object.values(CAPABILITIES);

/** 未知 capability 一律按免费档处理,避免前端漏传就把用户挡在门外 */
export const capabilityMinPlan = (id) => CAPABILITIES[id]?.minPlan || "free";
