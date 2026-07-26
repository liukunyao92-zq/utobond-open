/**
 * 内置模板(降级兜底)。
 * AI 超时、未配置 Key、返回不可解析时都落到这里 —— 流程永不中断。
 * 金额全部由预算参数实时算出,不是写死的样例数字。
 */
import { yuan } from "./format.js";

export const WIZ_DEFAULTS = {
  offline: { name: "拾豆咖啡 · 文三路店", city: "杭州", category: "精品咖啡", core: "手冲咖啡 + 轻食简餐,做社区第三空间", price: 26, area: 45, circle: "社区底商", cap: 30 },
  online: { name: "拾豆手冲 · 线上旗舰", city: "全国", category: "咖啡器具", core: "手冲壶、滤杯、家用冲煮套装", price: 89, supply: "自有工厂", platform: "抖音 + 小红书", content: "能拍短视频", cap: 15 },
};

export const MKT_GOALS = ["开业引爆", "日常拉新", "复购唤醒", "清库存"];

/** 五阶段开店清单 */
export function tplChecklist(mode, p) {
  if (mode === "offline") return {
    source: "tpl",
    tips: ["先试营业一周再办开业活动,把动线和出品磨顺了,流量来了才接得住", "每一笔支出留发票,月底和「预算测算」页对一次账"],
    groups: [
      { name: "证照与合规", items: [
        { t: "核名并办理营业执照", cost: 0, note: "线上可办" },
        { t: "食品经营许可证", cost: p.license, note: "餐饮必备" },
        { t: "确认消防与环评可过", cost: 0, note: "签约之前" }] },
      { name: "场地与签约", items: [
        { t: "商圈蹲点数客流(两周)", cost: 0, note: "早中晚各1小时" },
        { t: "租约谈判与签约付押金", cost: Math.round(p.rent * p.depositMonths), note: `押${p.depositMonths}付1` },
        { t: "支付转让费", cost: p.transfer, note: "可谈分期" }] },
      { name: "装修与设备", items: [
        { t: "装修设计与施工", cost: Math.round(p.area * p.decorPerSqm), note: `约${p.area}㎡` },
        { t: "设备与家具采购", cost: p.equipment, note: "含安装调试" },
        { t: "水电与网络开通", cost: 2000, note: "提前预约" }] },
      { name: "人员与供应", items: [
        { t: "招聘与岗前培训", cost: Math.round(p.staff * p.salary * 0.5), note: `${p.staff}人` },
        { t: "供应商比价与签约", cost: 0, note: "至少两家" },
        { t: "首批原料入库", cost: p.stock, note: "按两周量" }] },
      { name: "开业启动", items: [
        { t: "收银点单系统上线", cost: 3000, note: "含小程序" },
        { t: "开业活动与首月投放", cost: p.launch, note: "" },
        { t: "试营业一周跑通流程", cost: 0, note: "再正式开业" }] },
    ],
  };
  return {
    source: "tpl",
    tips: ["冷启动期 ROI 会难看,先盯转化率和素材点击率,别急着加预算", "退货率是隐形成本,首批 SKU 宁少勿多,跑出数据再加深度"],
    groups: [
      { name: "店铺入驻", items: [
        { t: "选定主攻平台并注册", cost: 0, note: "先单平台" },
        { t: "缴纳类目保证金", cost: p.bond, note: "闭店可退" },
        { t: "提交资质与授权", cost: 0, note: "" }] },
      { name: "视觉与内容", items: [
        { t: "店铺视觉与详情页", cost: p.visual, note: "含主图" },
        { t: "拍摄设备与布光", cost: p.gear, note: "" },
        { t: "首批短视频/图文 20 条", cost: 3000, note: "冷启动素材" }] },
      { name: "供应链与备货", items: [
        { t: "供应商签约与打样", cost: 0, note: "" },
        { t: "首批备货入仓", cost: p.stock, note: "1.5个月量" },
        { t: "打包物料与快递签约", cost: 2000, note: "谈月结价" }] },
      { name: "工具与合规", items: [
        { t: "ERP 与数据工具", cost: p.tools, note: "年费" },
        { t: "客服话术与售后流程", cost: 0, note: "" },
        { t: "平台规则与红线学习", cost: 0, note: "避免扣分" }] },
      { name: "冷启动", items: [
        { t: "种子用户与首评计划", cost: 1500, note: "" },
        { t: "首月投流小额测试", cost: p.adSpend, note: "多计划跑" },
        { t: "达人合作洽谈", cost: 0, note: "先纯佣" }] },
    ],
  };
}

/** 营销活动方案 */
export function tplCampaign(mode, goal, budget, days) {
  const online = mode === "online";
  return {
    source: "tpl",
    title: `${goal} · ${days} 天行动方案`,
    hook: online ? "用一个钩子品把新客带进店,再用私域把人留下来" : "用一个引流品把人带进门,再用动线把客单做上去",
    plays: online ? [
      { n: "钩子品 9.9 包邮", detail: `选一款成本可控的入门 SKU 做钩子,预算的 30%(约 ${yuan(budget * 0.3)} 元)补运费与差价` },
      { n: "满减赠品阶梯", detail: "满 99 减 15、满 199 减 40,赠品选高感知低成本的周边" },
      { n: "老客券私发", detail: "30 天内老客私域一对一发 20 元券,唤醒复购" },
    ] : [
      { n: "闲时第二杯半价", detail: "限 14–16 点使用,把最大的闲置产能变成客流" },
      { n: "集章卡", detail: "买 5 赠 1,把回头率从一次性买卖里拉出来" },
      { n: "社区地推", detail: `预算的 40%(约 ${yuan(budget * 0.4)} 元)做传单 + 首单立减,半径 800 米` },
    ],
    channels: online
      ? [["投流", 45], ["达人", 25], ["私域", 20], ["站内活动", 10]]
      : [["到店物料", 35], ["本地点评", 30], ["社群", 20], ["地推", 15]],
    kpi: [`按客单价与预算估,活动期新增约 ${Math.max(20, Math.round(budget / 40))} 单`, "活动 ROI 目标 ≥ 1.5,低于 1 立即停"],
    warn: "折扣一旦变成常态就收不回来了。写死截止时间,严格执行。",
  };
}
