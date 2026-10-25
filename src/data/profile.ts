/**
 * Resume facts and answers Aria has already confirmed.
 * No site passwords, SMS codes, or employer login credentials.
 */

export type Role = {
  company: string;
  aliases: string[];
  title: string;
  location: string;
  start: string;
  end: string;
  description: string;
};

export type School = {
  school: string;
  aliases: string[];
  dates: string;
  degreeLine: string;
};

const skillsLines = [
  "数据与工程：Python, SQL, Snowflake, ETL, 数据仓库, 数据管道设计, 生产级数据集成",
  "AI / ML：LLM应用开发, RAG, 智能体工作流, 机器学习, 统计建模, 模型评测与护栏, MLOps, AWS, 云上模型部署与监控",
  "商业智能与交付：Tableau, PowerBI, A/B测试与因果推断, 商业价值论证, 跨团队协作, Git, AI辅助开发工作流, 快速原型与生产级交付，PMP认证",
];

export const profile = {
  name: {
    family: "戴",
    given: "杨阳",
    full: "戴杨阳",
    english: "Aria",
    preferred: "戴杨阳",
  },
  phone: "18068166342",
  email: "yangyangd95@163.com",
  location: {
    country: "中国",
    province: "上海",
    city: "上海",
    postalCode: "201102",
  },
  gender: "女",
  atLeast18: "是" as const,
  workAuthorization: "是" as const,
  needsVisaSponsorship: "否" as const,
  everEmployedByApple: "否" as const,
  everAppleContractor: "否" as const,
  summary:
    "应用数据科学家，7 年使用 Python 驱动经营分析与商业决策的经验。擅长将业务数据转化为可执行的经营洞察，并构建面向商业场景的数据科学解决方案，包括经营预测模型、自动化经营分析流程、AI 辅助管理决策工具与大语言模型应用。能够跨团队协作，在复杂技术方案与非技术业务需求之间建立高效沟通，推动数据驱动的经营优化与决策落地。",
  skills: {
    fullText: skillsLines.join("\n"),
    lines: skillsLines,
  },
  education: [
    {
      school: "芝加哥大学 (University of Chicago)",
      aliases: ["芝加哥大学", "university of chicago"],
      dates: "2017年9月 – 2019年6月",
      degreeLine: "计算社会科学硕士学位，获得奖学金",
    },
    {
      school: "范德堡大学 (Vanderbilt University)",
      aliases: ["范德堡大学", "范德堡", "vanderbilt"],
      dates: "2013年8月 – 2017年5月",
      degreeLine: "数学与经济学双学士学位，荣登优秀学生名册",
    },
  ] satisfies School[],
  educationText: [
    "芝加哥大学 (University of Chicago), 美国",
    "2017年9月 – 2019年6月",
    "计算社会科学硕士学位，获得奖学金",
    "",
    "范德堡大学 (Vanderbilt University), 美国",
    "2013年8月 – 2017年5月",
    "数学与经济学双学士学位，荣登优秀学生名册",
  ].join("\n"),
  experience: [
    {
      company: "eBest",
      aliases: ["ebest"],
      title: "数据科学家",
      location: "上海, 中国",
      start: "2025年12月",
      end: "2026年5月(项目取消)",
      description: [
        "背景：面向快消与零售行业（主要服务可口可乐、马石油等头部企业），主导 B 端商业智能与数据赋能产品的规划与落地，通过数据驱动一线销售转化与门店精细化运营。",
        "智能推荐与销售赋能",
        "针对一线销售人员“找客难、推品难”的业务痛点，主导设计并落地智能推荐系统产品方案。将复杂的算法能力封装为可解释的业务动作框架，为业代提供千人千面的产品推荐策略，有效降低一线操作门槛。",
        "设计完整的“推荐-反馈-优化”产品闭环与 A/B 实验机制，明确以“门店拜访转化率”与“GMV 提升”为核心北极星指标，保障产品迭代始终对齐最终商业结果。",
        "跨销售、产品与区域团队协作，推动推荐策略在多地多区域的协同落地，沉淀可复用的业务赋能资产。",
        "企业知识库与业务赋能",
        "主导搭建面向一线业代与内部团队的智能业务知识库（AI 助手），将运维手册、业务规则、促销政策等非结构化数据转化为可检索的智能知识资产。",
        "有效降低了人工答疑成本与新人培训周期，支撑一线人员（如店长、业代）在巡店与销售场景中快速决策，大幅提升业务响应效率。同步推动 AI 工作流与 Prompt 规范的团队级应用，提升整体产品与研发团队的交付效率。",
        "客户智能与门店精细化运营",
        "针对快消/零售多门店管理场景，主导构建智能门店评分与客户分层产品体系。精准识别高潜力客户与高流失风险门店，帮助区域团队制定差异化的拜访优先级与资源分配策略。",
        "建立活跃度、留存率及 ROI 异动归因分析模型，不仅定位账户级根因，更输出可落地的一线跟进动作指南。将原本复杂的底层数据转化为管理层可读的商业报告，直接驱动一线业绩提升。",
        "设计覆盖业代绩效、推荐采纳率等维度的产品评估指标体系，确保数据产品始终以业务赋能和效果达成为导向。",
      ].join("\n"),
    },
    {
      company: "QIMA Inc.",
      aliases: ["qima"],
      title: "商业智能工程师",
      location: "深圳, 中国",
      start: "2023年5月",
      end: "2025年11月",
      description: [
        "一体化经营指标监控与商业分析",
        "主导公司一体化经营指标监控系统建设，负责数据管道搭建、指标体系确立与看板交付，覆盖多部门多团队需求定位、持续改进与后期监控，为经营决策提供统一数据口径。",
        "支持销售分析与客户分析等商业分析场景，输出可落地的业务洞察，为区域与业务团队提供定价、跟进与资源配置的决策参考。",
        "交付追踪毛利、收入趋势与运营费用的互动式仪表盘，为高级利益相关者提供业务盈利能力的清晰可见性，支撑数据驱动的商业决策。",
        "通过 Python 自动化建模（现金流预测、应收/应付账款对账、成本分析）提升营运资金效率，改善流动性管理并减少 40% 人工处理开销。",
        "数据治理与流程自动化",
        "主导多子公司数据集成与统一数据框架搭建，推动流程优化、预警机制与企业智能报表自动输送，为跨子公司经营分析提供一致的数据基础；并通过自动化数据验证检查，使关键业务流中的财务记录错误减少 15%。",
        "领导与 30 多位财务及业务负责人的跨部门项目管理，交付数据驱动预测框架，使预算准确性提升 25% 并优化资本配置。",
        "优化核心 ETL 管道，将商业智能交付周期缩短 87%，报告生成时间从 8 小时压缩至 1 小时，支撑领导层快速且具时效性的市场决策。",
      ].join("\n"),
    },
    {
      company: "好未来 (TAL Inc.)",
      aliases: ["好未来", "tal"],
      title: "数据分析师",
      location: "深圳, 中国",
      start: "2021年6月",
      end: "2023年5月",
      description: [
        "消费者行为与留存分析",
        "针对 C 端学员（消费者）行为进行深度挖掘，主导构建留存率与流失预警分析模型。运用回归分析等方法，精准识别影响消费者复购/留存的核心驱动因素（如课程体验、服务频次等），为前端运营及教学策略提供数据支撑，有效指导用户生命周期管理。",
        "将数据洞察转化为业务动作，协助运营团队制定差异化的用户触达与挽留策略，支撑区域资源的精准投放与优化配置。",
        "门店（教学点）运营与单店盈利模型",
        "搭建教学点（门店）与班级维度的盈利分析模型，深入拆解收入结构与成本构成。通过量化分析识别高潜/低效网点，为管理层的网点布局、资源倾斜及排班策略提供科学依据。",
        "通过优化单店（班级）的资源利用率与排课效率，直接推动单店盈利模型的健康度提升，支撑区域整体利润目标的达成。",
        "财务可视化与数据基建",
        "独立设计并交付 10+ 核心财务与运营仪表盘，实时追踪广东区域 50+ 教学点（门店）的收入、支出与预算执行情况。将复杂的业务数据转化为清晰的管理层洞察，大幅提升跨区域多店管理的决策效率。",
        "主导搭建自动化成本监控预警体系，实现超支风险的提前识别与快速响应，将财务运营效率提升 50%；同步重构底层数据架构，将日常数据检索与报表产出时间缩短 60%，极大释放业务团队的取数精力。",
      ].join("\n"),
    },
    {
      company: "艾伯维 (AbbVie Inc.)",
      aliases: ["艾伯维", "abbvie"],
      title: "数据科学家",
      location: "芝加哥, 美国",
      start: "2019年8月",
      end: "2021年5月",
      description: [
        "设计机器学习模型（Python/R）预测病人停药、退出试验与试验时长，并挖掘背后驱动因素，为试验方案调整提供数据依据，支撑百万美元级收入影响。",
        "围绕病人情况与用药数据构建分析报表，交付 20 多个可视化作品（Python/R/Tableau/Spotfire），使技术分析与业务目标保持一致。",
        "作为数据 PM 组织跨团队数据会议并汇报进展，推动分析需求对齐与落地。",
      ].join("\n"),
    },
    {
      company: "芝加哥大学医学中心, 研究信息学中心",
      aliases: ["芝加哥大学医学中心", "研究信息学"],
      title: "数据科学研究分析师",
      location: "美国",
      start: "2018年6月",
      end: "2019年5月",
      description: [
        "在美国《儿童重症监护》（Pediatrics Critical Care）杂志上发表了两篇关于医院患者结局预测的论文。",
        "使用R语言处理了超过300万患者的数据，构建了逻辑回归和随机森林机器学习模型，并创建了可视化图表以向利益相关者展示。",
      ].join("\n"),
    },
  ] satisfies Role[],
  /** Asked on forms, and not present in the resume or the confirmed profile. */
  notOnFile: [
    "区、街道、详细地址",
    "期望薪资",
    "到岗时间",
    "微信",
    "LinkedIn",
    "推荐人",
  ],
};

export function matchRole(blob: string): Role | null {
  const hay = blob.toLowerCase();
  for (const role of profile.experience) {
    if (role.aliases.some((alias) => hay.includes(alias.toLowerCase()))) {
      return role;
    }
  }
  return null;
}

export function matchSchool(blob: string): School | null {
  if (/医学中心|研究信息学/.test(blob)) return null;
  const hay = blob.toLowerCase();
  for (const school of profile.education) {
    if (school.aliases.some((alias) => hay.includes(alias.toLowerCase()))) {
      return school;
    }
  }
  return null;
}
