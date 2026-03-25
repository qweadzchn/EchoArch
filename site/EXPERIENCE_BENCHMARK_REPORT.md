# 古建筑导游体验参考研究

调研日期：2026-03-20

## 目标

这份调研不是单纯罗列案例，而是回答三个问题：

1. 别的优秀项目怎么把“空间探索”做得不无聊
2. AI 导游应该怎样出现，才不像客服聊天框
3. 哪些设计最适合翻译到百泉古建筑群这个项目里

## 结论先说

最值得学的不是“聊天框长什么样”，而是这三件事：

- 空间先行：先让用户在图、路、场景里游，再让 AI 接话
- 双模式：始终同时保留“自由探索”和“被引导讲述”
- 轻角色感：导游像随行引路人，而不是固定对话窗口

最不建议学的是：

- 一上来就把页面做成大聊天产品
- 导游每次都输出很长的大段解释
- 让模型自由操作页面，而不是返回结构化动作

## 参考项目

### 1. UNESCO Dive into Heritage

链接：

- https://whc.unesco.org/en/dive-into-heritage

值得学的点：

- 同时提供 `guided narratives` 和 `free exploration`
- 用 3D、地理叙事、图像、视频组合出“被引导”和“自由探索”两条路径
- 不只讲建筑本体，还把遗产和相关非遗、文化语境连在一起

对我们项目的启发：

- 首页一定要保留“开放世界模式”
- 但要随时能切进“导游带路模式”
- 导游不应该抢夺主界面，而应该是探索流程上的一种叠层

来源摘录位置：

- `free, interactive and guided experiences`: [UNESCO](https://whc.unesco.org/en/dive-into-heritage)
- `Guided Narratives` 与 `Free Exploration`: [UNESCO](https://whc.unesco.org/en/dive-into-heritage)

### 2. CyArk Tapestry / Guided Tours

链接：

- https://tapestry.cyark.org/
- https://cyark.org/tapestry/ptc-lng-es

值得学的点：

- 强调 “Every Place Has a Story”
- 导览是“站点式”而不是“问答式”
- 进入前有教程，用户先学会怎么逛
- 明确有 `Next / Previous`、字幕、音频、图像库、Learn More

对我们项目的启发：

- 百泉导游很适合做成“报站 + 下一站 + 深入看图”
- “前情回声”这种设计方向是对的，应该继续强化
- 低门槛引导很重要，用户第一次进入时要知道怎么逛

来源摘录位置：

- `Every Place Has a Story`: [CyArk Tapestry](https://tapestry.cyark.org/)
- `Tour Stop Titles`、`Next & Previous`、`Image Gallery & Video`: [CyArk Guided Tour](https://cyark.org/tapestry/ptc-lng-es)

### 3. Google Arts & Culture - Historic Jeddah

链接：

- https://blog.google/company-news/outreach-and-initiatives/arts-culture/explore-historic-jeddah-on-google-arts-culture/

值得学的点：

- AI 不是独立悬浮出来，而是附着在“虚拟街区游览”上
- 核心不是聊天，而是 `Talking Tours`
- 讲述内容与建筑、工艺、贸易、朝圣等历史语境绑定
- 还加入了“今昔对照”的 Pocket Gallery

对我们项目的启发：

- 你的导游应该更像“边走边讲”
- 除了建筑详情，还要加入“今昔对照”“修复前后”“实景与古风图对照”
- 导游入口不需要像客服入口，更像“语音路引”或“报站器”

来源摘录位置：

- `AI-powered Talking Tours`: [Google Blog](https://blog.google/company-news/outreach-and-initiatives/arts-culture/explore-historic-jeddah-on-google-arts-culture/)
- `Pocket Gallery` 与历史变迁对照： [Google Blog](https://blog.google/company-news/outreach-and-initiatives/arts-culture/explore-historic-jeddah-on-google-arts-culture/)

### 4. Google Arts & Culture - City Guide / Comic Postcards

链接：

- https://blog.google/company-news/outreach-and-initiatives/arts-culture/city-guide-and-comic-postcards/

值得学的点：

- 导览不是静态目录，而是根据兴趣和时间适配
- 用户被设计成“故事主角”
- AI 产物不是只为了回答问题，也能制造记忆点

对我们项目的启发：

- 后期可以加入“今日游线”“十分钟快游”“文气路线”“湖心听水路线”
- 可以把用户放进叙事里，而不是只看站点说明
- 后续很适合做“游园纪念页”“我的百泉行旅卷轴”

来源摘录位置：

- `guide adapts to your schedule`: [Google Blog](https://blog.google/company-news/outreach-and-initiatives/arts-culture/city-guide-and-comic-postcards/)
- `become the protagonist of a unique story`: [Google Blog](https://blog.google/company-news/outreach-and-initiatives/arts-culture/city-guide-and-comic-postcards/)

### 5. Open Heritage

链接：

- https://artsandculture.google.com/project/cyark

值得学的点：

- 内容组织不是“一个点一篇文章”，而是专题化、故事化
- 同一平台里混合 3D 模型、幕后故事、修复技术、开放数据
- 通过不同入口让用户用不同方式进入同一个遗产

对我们项目的启发：

- 百泉后期可以有不同入口：
- 建筑入口
- 主题入口
- 修复入口
- 图像入口
- 路线入口

来源摘录位置：

- 多种 `EXPLORE` / `NOTES FROM THE FIELD` / `PRESERVATION IN ACTION` 入口： [Open Heritage](https://artsandculture.google.com/project/cyark)

### 6. Gen-Diaolou 研究

链接：

- https://arxiv.org/abs/2602.03095

值得学的点：

- 研究目标不是“做一个能聊的 AI”，而是提升遗产理解和保护意识
- 说明建筑遗产场景里，AI 应该帮助用户建立时间感、语境感、演变感

对我们项目的启发：

- 你的导游不应只回答“这是什么建筑”
- 还应回答：
- 它为什么在这里
- 它与哪条游线相关
- 它前后承接哪一段空间叙事
- 它在历史上处于什么脉络

来源摘录位置：

- `supports heritage understanding and preservation`: [Gen-Diaolou](https://arxiv.org/abs/2602.03095)

### 7. VIOLA / ReInHerit Toolkit

链接：

- https://www.mdpi.com/2571-9408/8/7/277

值得学的点：

- 聊天功能基于馆方验证内容，而不是纯模型自由发挥
- BYOD 模式适合游客用自己的设备直接访问
- 强调伦理、透明、准确性

对我们项目的启发：

- 百泉导游的回答应该尽量基于你现有建筑资料与整理后的导游语料
- 后端最好使用“已验证内容 + 模型组织语言”的模式
- 前端只负责呈现和执行动作

来源摘录位置：

- `museum-provided content ensures a higher degree of accuracy`: [MDPI](https://www.mdpi.com/2571-9408/8/7/277)
- `BYOD`: [MDPI](https://www.mdpi.com/2571-9408/8/7/277)

## 适合百泉项目的设计翻译

### A. 导游不再叫“聊天”

建议改成以下语义：

- 路引
- 报站
- 游伴
- 泉上引游人
- 耳语

不要强调：

- chat
- assistant
- AI
- 智能问答

### B. 入口像“随身物件”

已经在做的灯笼方向是对的，但还可以更像：

- 提灯
- 纸页签
- 玉牌
- 题签
- 游线罗盘

交互上：

- 默认只露出一个小物件
- 悬停轻呼吸
- 拖动改变停靠位置
- 点击后展开路引层

### C. 内容分三层

第一层：一句到站

- 很短
- 只负责把人带进场景

第二层：一段主讲

- 80 到 150 字
- 讲最该看的部分

第三层：下一步可选动作

- 去下一站
- 回总览
- 切图像解读
- 改走另一条线

### D. AI 只做两种高价值能力

第一种：空间引导

- 去哪里
- 下一站是什么
- 我时间少怎么逛
- 走湖心还是走书院

第二种：语境讲述

- 这里最值得看什么
- 它与附近建筑有什么关系
- 为什么这张古风图和实景图感觉不同

不建议优先做：

- 大段自由闲聊
- 泛知识问答
- 脱离场景的开放问天

## 我认为最适合你项目的 5 个新玩法

### 1. 报站模式

用户每到一个点，导游只先说一句：

- “此刻到卫源庙，先看门庭气口。”
- “到了乾隆行宫，先别急着看字，先看它与书院旧址的关系。”

然后用户再决定是否展开详细讲解。

### 2. 游线切换模式

导游不只是回答，而是改道：

- “走湖心听水”
- “我想看书院文脉”
- “给我十分钟快游”

这特别适合开放世界结构。

### 3. 图像解读模式

同一个建筑，把图片分成：

- 实景看空间
- 古风看意境
- 素描看轮廓

导游用不同口气解释同一处。

### 4. 今昔对照模式

学习 Jeddah 的 Pocket Gallery：

- 修复前 / 修复后
- 实景 / 古风图
- 当前全景 / 局部细节

这会让网站一下子从“资料页”变成“数字展陈”。

### 5. 游园纪念模式

学习 “become the main character” 的思路，但不要做得太像娱乐产品。

可做成：

- 今日游线卷轴
- 你走过的建筑题签
- 你的百泉行旅卡

更文雅，也更适合古风网站。

## 不建议直接照搬的东西

- 不建议照搬国外产品那种强产品化按钮和导航语言
- 不建议把首页改成满屏对话界面
- 不建议过度游戏化到失去古建筑气质
- 不建议让 AI 每次都“热情欢迎 + 长篇解释”

## 建议的下一步

### 第一阶段

- 把导游进一步从“对话框”改成“路引层”
- 补每个点位的短讲稿
- 补路线导语和收束语

### 第二阶段

- 增加“报站 + 下一站 + 图像解读”三段式体验
- 加今昔对照和图像解释

### 第三阶段

- 接真实后端 API
- 让导游根据用户指令切路线、跳转点位、回总览

## 我的判断

如果只选一个方向继续深挖，最值得做的是：

**把导游从“聊天助手”彻底升级成“开放世界中的伴游路引”。**

这个方向和你的网站气质最合，也最容易做出“新奇但不浮夸”的感觉。
