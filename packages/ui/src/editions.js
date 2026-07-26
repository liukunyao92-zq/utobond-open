/**
 * Edition —— 同一套界面装配出两个产品。
 *
 * 业务功能(向导 / 清单 / 预算 / 选址 / 风险 / 参谋 / 运营 / 报表 / 营销)两版完全一致,
 * 差别只在这几个开关上,所以两个仓库不会出现界面逻辑漂移。
 */

/** 开源自部署版:用户用自己的 Key,不限次,没有订阅也没有平台后台 */
export const LOCAL_EDITION = {
  id: "local",
  brandSub: "UTOBANG · 自部署版",
  metering: false,   // 不计次、不显示额度条
  billing: false,    // 无订阅页与付费墙
  admin: false,      // 无平台管理后台
  hosting: false,    // 真人托管是商业服务,开源版不含
  settings: true,    // 有「模型设置」页
  auth: false,       // 不需要登录
  /** 所有原本按档位上锁的能力一律放行 */
  plan: "max",
  showPlanTag: false,
};

/** 云端 SaaS 版:平台统一出 Key,按注册用户 + 订阅档位计费 */
export const CLOUD_EDITION = {
  id: "cloud",
  brandSub: "UTOBANG · 先帮后托",
  metering: true,
  billing: true,
  admin: true,
  hosting: true,
  settings: false,   // 平台 Key 绝不暴露给用户
  auth: true,
  plan: null,        // 由服务端下发
  showPlanTag: true,
};

export const EDITIONS = { local: LOCAL_EDITION, cloud: CLOUD_EDITION };
