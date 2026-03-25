export type StoryArticle = {
  id: string
  label: string
  title: string
  deck: string
  preview: string
  heroImage: string
  heroAlt: string
  detailTitle: string
  detailSubtitle: string
  paragraphs: string[]
  spotId: string
}

export type AcademyEraArticle = {
  id: string
  era: string
  title: string
  subtitle: string
  summary: string
  imageSrc: string
  imageAlt: string
  paragraphs: string[]
  spotId: string
}

export type SteleCategory = {
  id: string
  era: string
  title: string
  summary: string
  coverImage: string
  coverAlt: string
  gallery: Array<{
    src: string
    alt: string
    caption: string
  }>
  spotId: string
}

export const pptPrimaryNav = [
  { id: 'guide', label: '智能导览' },
  { id: 'stories', label: '鸾翔凤集' },
  { id: 'culture', label: '文脉流长' },
] as const

export const landingHeroMedia = {
  poster: '/ppt/home/hero-poster.png',
  videos: ['/ppt/home/hero-main.mp4', '/ppt/home/hero-alt.mp4'],
}

export const landingIntroParagraphs = [
  '百泉湖古建筑群坐落于豫北苏门山南麓、百泉湖畔，是 2001 年国务院公布的全国重点文物保护单位，亦是河南省现存规模最大、保存最完好的古典园林建筑群，素有“中州颐和园”“北国小西湖”的美誉。',
  '其人文历史可上溯至三千年前的殷商时期，隋唐起大规模营建古建群，经明清两代修缮扩建，最终形成山水相依、园中套园的经典园林格局。澄澈泉湖与千年古建相映成趣，既藏太行山水的灵秀之气，又载中原文明的厚重底蕴。',
  '建筑群融南北建筑艺术之精髓，既有北方殿堂的雄伟恢弘，又具江南园林的玲珑秀丽。苏轼题写“苏门山涌金亭”碑刻，元好问、郑板桥等历代文人墨迹，共同织就跨越千年的中原文脉长廊。',
]

export const landingPanels = [
  {
    id: 'overview',
    title: '总览地图',
    subtitle: '钟灵百泉',
    description: '先从湖山格局辨认全园，再循点位进入各处古建与景中路径。',
    imageSrc: '/landing/reference.jpg',
  },
  {
    id: 'guide',
    title: '智能导览',
    subtitle: '沉浸陪游',
    description: '由导游陪你择路、讲解与跳转，让浏览更像缓慢入园而不是翻页。',
    imageSrc: '/ppt/home/intro-3.jpg',
  },
  {
    id: 'stories',
    title: '鸾翔凤集',
    subtitle: '人物旧事',
    description: '沿岳飞、苏轼、竹林七贤等人物旧事，进入百泉的人文深处。',
    imageSrc: '/ppt/luanxiang/sushi.png',
  },
  {
    id: 'academy',
    title: '文脉流长',
    subtitle: '书院与碑刻',
    description: '从书院千年流变到历代碑刻，沿时间与书风展开一条文脉长卷。',
    imageSrc: '/ppt/wenmai/academy/song.png',
  },
] as const

export const storyArticles: StoryArticle[] = [
  {
    id: 'yuefei',
    label: '精忠岳飞',
    title: '精忠岳飞',
    deck: '南宋忠烈',
    preview:
      '南宋建炎初年，岳飞随王彦部北渡黄河抗金，在收复新乡后曾将军营驻扎于百泉湖畔苏门山西侧营盘山。',
    heroImage: '/ppt/luanxiang/yuefei.png',
    heroAlt: '精忠岳飞主题图',
    detailTitle: '岳飞与百泉湖',
    detailSubtitle: '忠烈之气，与碑刻书风一同留在百泉',
    paragraphs: [
      '南宋建炎初年，岳飞随都统制王彦率部北渡黄河抗金，在收复新乡后，将军营驻扎在百泉湖畔苏门山西侧的营盘山。百泉因此与岳飞抗金的英雄叙事发生关联，也让这片湖山具有了更强烈的家国情感。',
      '后世关于岳飞与百泉的记忆，并不止停留在军事驻扎这一层。碑廊中与岳飞相关的书法作品、地方文献中的转述，以及民间长期流传的讲述，共同把“忠”“烈”“书风”三种意象压在了一处场景里。',
      '在百泉的人物谱系中，岳飞一线最具家国气象。若从碑廊回望，再联到岳飞相关书风与传说，这一段文脉会显得更加沉雄有力。',
    ],
    spotId: 'stele-corridor',
  },
  {
    id: 'qixian',
    label: '竹林七贤',
    title: '孙登与竹林七贤',
    deck: '魏晋风骨',
    preview:
      '魏晋时期，苏门山是隐士孙登隐居之地，阮籍、嵇康曾多次来到百泉湖畔、苏门山中寻访孙登，留下“苏门长啸”的经典传说。',
    heroImage: '/ppt/luanxiang/qixian.png',
    heroAlt: '竹林七贤主题图',
    detailTitle: '竹林七贤与百泉湖',
    detailSubtitle: '魏晋高士的精神气质，成为百泉最早的山林底色',
    paragraphs: [
      '苏门山与百泉湖在魏晋时期便已进入名士的精神地理。隐士孙登长期居于苏门山，阮籍、嵇康等人多次前往寻访，谈玄论道、临风长啸，这段“苏门长啸”的记忆也让百泉最早带上了逸士山林的气息。',
      '这组人物最适合先从气韵上感受其与百泉的契合，再慢慢读入各自的独立篇章。这样观看时，人物精神与山林空间会更加贴近。',
      '如果从空间上回看，这组人物最适合与苏门山、安乐窝、邵夫子祠等西岸山径建筑群联动，因为这些景点本身就更接近山居、讲学与隐逸的气质。',
    ],
    spotId: 'anlewo',
  },
  {
    id: 'sushi',
    label: '眉山苏轼',
    title: '眉山苏轼',
    deck: '题亭成名',
    preview:
      '元祐三年，苏轼亲临百泉湖游历，登临苏门山，凭吊先贤，并为湖中涌金亭亲笔题写“苏门山涌金亭”六个大字。',
    heroImage: '/ppt/luanxiang/sushi.png',
    heroAlt: '眉山苏轼主题图',
    detailTitle: '从渑池到百泉题亭：苏轼的豁达心路',
    detailSubtitle: '题亭、追怀与旷达心性，把百泉推入更深的人文叙事',
    paragraphs: [
      '苏轼到百泉，并不是普通题名留念，而是把自己对山水、人生与古人风流的理解投射进了这个园林。涌金亭题刻因此不再只是景点标识，而是百泉最重要的一道文人印记。',
      '苏轼与百泉的相遇，真正动人的并不只是题名本身，而是他在这里如何观山、看水、怀古、寄情。',
      '因此这一条线更像从文人心境进入园林，再由园林回照题刻与碑廊，让百泉的人文气息渐次展开。',
    ],
    spotId: 'yongjin-pavilion',
  },
  {
    id: 'liaofan',
    label: '饿夫了凡',
    title: '饿夫了凡',
    deck: '山径悲歌',
    preview:
      '明末志士彭了凡因痛惜明亡、拒仕清廷，辗转至百泉苏门山，终效仿伯夷叔齐，在啸台旁绝食而亡，留下“饿夫墓”。',
    heroImage: '/ppt/luanxiang/liaofan.png',
    heroAlt: '饿夫了凡主题图',
    detailTitle: '彭了凡与饿夫墓',
    detailSubtitle: '国破家亡的悲愤，被山路与墓冢长期保存下来',
    paragraphs: [
      '彭了凡的故事让百泉西岸山径不只是风景路径，也成为民族气节与个人抉择的历史场。游客进入这一页时，感受到的不应只是“墓”的介绍，而是一个人如何在时代剧变中做出极端而坚决的回应。',
      '读到这里时，百泉西岸山径不再只是景线，而像一条被悲愤与气节浸透的精神路径。',
      '若由人物进入饿夫墓，再从墓与山路回望时代风云，这段历史会比单纯阅读介绍更具分量。',
    ],
    spotId: 'efu-tomb',
  },
  {
    id: 'qianlong',
    label: '乾隆南巡',
    title: '乾隆南巡',
    deck: '驻跸百泉',
    preview:
      '乾隆皇帝曾数次巡幸中州并途经百泉湖，登临苏门山、泛舟百泉、题诗赐额，使百泉叠加了皇家巡幸的仪式感。',
    heroImage: '/ppt/luanxiang/qianlong.png',
    heroAlt: '乾隆南巡主题图',
    detailTitle: '乾隆南巡',
    detailSubtitle: '书院、园林与皇家巡幸在此短暂重叠',
    paragraphs: [
      '清代乾隆年间，百泉从书院文化中心的一部分，转而进入皇家巡幸视野。题诗、赐额、驻跸与行宫改建，使它获得了不同于文人园林的帝王气象。',
      '乾隆南巡为百泉带来了鲜明的皇家仪典气息，也使它与清代行宫、题额、驻跸记忆深深相连。',
      '顺着这条线继续看下去，便能自然进入清代书院改作行宫的转折，感受到百泉身份变化最剧烈的一章。',
    ],
    spotId: 'qianlong-palace',
  },
]

export const academyIntro = {
  title: '百泉书院历史变迁',
  lead:
    '百泉书院（前身为太极书院）自宋元时期起便是全国著名学府，长期作为中原文化教育中心，在中国教育史上占有独特地位。',
  paragraphs: [
    '书院实行“门户开放”的教学原则，学生可以自由流动，不受地域和学派限制，来者不拒，走者不留，这种开放性的教学思想和方式在古代书院中独树一帜。',
    '据不完全统计，书院在千年历史中累计培养学生两万余名，这些人才活跃于政治、军事、经济、文化教育与学术思想等多个领域。',
  ],
}

export const academyEraArticles: AcademyEraArticle[] = [
  {
    id: 'jin',
    era: '晋朝',
    title: '孙登授学',
    subtitle: '晋代初设讲堂',
    summary: '百泉与苏门山的讲学传统，在晋代已现端倪。',
    imageSrc: '/ppt/wenmai/academy/jin.png',
    imageAlt: '晋代孙登讲学场所',
    paragraphs: [
      '孙登，字公和，号苏门先生，长年隐居苏门山，在山下开设学堂，博才多识，熟读《易经》《老子》《庄子》之书。阮籍、嵇康都曾前来求教。',
      '孙登性情温和，从不轻易动怒，后世关于他的记载不仅强调其隐逸，也强调其授学与修身方式。这使百泉与苏门山在更早时期就具备了“讲学场”的雏形。',
      '这一时期虽未形成后世规模完备的书院格局，却已为百泉后来千年讲学传统埋下最早伏笔。',
    ],
    spotId: 'anlewo',
  },
  {
    id: 'wudai',
    era: '五代',
    title: '后周广顺元年建学',
    subtitle: '五代十国初设书院',
    summary: '太极书院在五代乱世中正式创办，成为中原少见的稳定教育场所。',
    imageSrc: '/ppt/wenmai/academy/wudai.png',
    imageAlt: '五代十国建书院',
    paragraphs: [
      '百泉书院历经魏晋至五代的文化积淀，于后周广顺元年（951 年）正式以“太极书院”之名创办，成为中原乱世中少有的稳定教育空间。',
      '它以简朴屋舍为载体，传承儒家经典与《易经》义理，在兵戈不息的环境里延续文化火种，也为后来北宋理学在此兴盛打下基础。',
      '从这一刻起，百泉由山林讲学之地渐渐走向制度化书院，也为北宋理学群贤到来准备了土壤。',
    ],
    spotId: 'south-hall',
  },
  {
    id: 'song',
    era: '北宋',
    title: '北宋邵雍讲学',
    subtitle: '理学高光时刻',
    summary: '百泉在北宋进入文脉高光，成为北方核心的理学传播中心。',
    imageSrc: '/ppt/wenmai/academy/song.png',
    imageAlt: '北宋邵雍讲学',
    paragraphs: [
      '北宋时期国泰民安、文教兴盛，理学宗师邵雍长期定居苏门百泉，在此筑堂讲学、推演先天易学、阐释太极思想，四方学子慕名而来。',
      '此后程颢、程颐等理学大家也先后到此游学论道、开坛授课，使百泉正式奠定了北方理学重镇的地位。',
      '也正因如此，北宋成为百泉书院文脉最为耀眼的一段，并奠定了它在北方学术版图中的核心位置。',
    ],
    spotId: 'shao-shrine',
  },
  {
    id: 'yuan',
    era: '元朝',
    title: '元朝太极书院的发展',
    subtitle: '大儒齐聚，北方理学重地成型',
    summary: '元代书院规模扩建，姚枢、赵复、许衡等大儒齐聚百泉。',
    imageSrc: '/ppt/wenmai/academy/yuan.png',
    imageAlt: '元代太极书院',
    paragraphs: [
      '元代，这里的书院正式定名太极书院，规模在北宋基础上再度扩建，建筑改为元代规制，布局宏大。姚枢、赵复、许衡、窦默等大儒聚众讲学，使百泉成为当时中原最重要的讲学群体所在地。',
      '赵复将南方程朱理学系统传入北方后，百泉书院进一步扩大影响，学风极盛，成为元代北方传播理学的核心重地。',
      '这一阶段的扩建与名儒云集，使百泉真正完成由地方书院到北方理学重镇的跃升。',
    ],
    spotId: 'south-hall',
  },
  {
    id: 'ming',
    era: '明朝',
    title: '明代百泉书院',
    subtitle: '书院鼎盛时期',
    summary: '明代是百泉书院的鼎盛阶段，正式定名百泉书院。',
    imageSrc: '/ppt/wenmai/academy/ming.png',
    imageAlt: '明代百泉书院',
    paragraphs: [
      '明代朝廷大兴文教，多次对书院进行大规模重修与扩建，规模宏大，布局完备，并正式定名百泉书院。制度日趋规范，办学条件明显改善。',
      '名儒与地方官员先后在此讲学，主讲程朱理学，兼顾科举课业，四方士子云集，使百泉书院成为中原地区最重要的文教中心之一。',
      '也正是在这一时期，书院形制、学规与声望一并成熟，百泉之名远播中原。',
    ],
    spotId: 'south-hall',
  },
  {
    id: 'qing',
    era: '清朝',
    title: '清朝百泉书院与翠华行宫',
    subtitle: '书院转为行宫',
    summary: '乾隆年间，书院被改建为翠华行宫，百泉叠上皇家驻跸气象。',
    imageSrc: '/ppt/wenmai/academy/qing.png',
    imageAlt: '清朝乾隆行宫',
    paragraphs: [
      '百泉书院历经五代至明代发展，原本是中原著名的理学圣地与文教中心。到了清代乾隆年间，为迎接皇帝巡游，官府将书院大规模改建为翠华行宫。',
      '行宫建成后，原址停止讲学。后来道光年间，当地将书院迁至辉县城内复建，继续传承文教。由此，百泉同时拥有千年书院的书香文脉与皇家行宫的帝王气象。',
      '书院改为行宫之后，百泉的身份发生剧烈转变，书香与帝王仪典自此并存，形成今日独特的历史层次。',
    ],
    spotId: 'qianlong-palace',
  },
]

export const steleIntro = {
  title: '百泉碑刻欣赏',
  paragraphs: [
    '百泉湖畔留存着三百五十余通历代碑刻，跨越北魏、唐、宋、元、明、清直至民国，集中陈列于碑廊与亭阁之中，依山傍水、错落分布，是浓缩的活态历史。',
    '这里名家笔墨荟萃，既有苏轼题写“苏门山涌金亭”，也有元好问、赵孟頫、乾隆、郑板桥等名人书碑。碑刻不仅可赏，更是研究书院发展、书法演变与中原文脉的珍贵实物。',
  ],
}

export const steleCategories: SteleCategory[] = [
  {
    id: 'han',
    era: '汉代',
    title: '汉代碑刻鉴赏',
    summary: '以古朴笔意与早期图像气质，为百泉碑刻时间长廊开篇。',
    coverImage: '/ppt/wenmai/stele/han.jpg',
    coverAlt: '汉代碑刻鉴赏封面',
    gallery: [
      {
        src: '/ppt/wenmai/stele/han.jpg',
        alt: '汉寿亭侯关羽诗竹画',
        caption: '汉寿亭侯关羽《诗竹》画',
      },
    ],
    spotId: 'stele-corridor',
  },
  {
    id: 'song',
    era: '宋代',
    title: '宋代碑刻鉴赏',
    summary: '文人题刻与画像并行，把百泉推入更鲜明的宋代人文景观。',
    coverImage: '/ppt/wenmai/stele/song.jpg',
    coverAlt: '宋代碑刻鉴赏封面',
    gallery: [
      {
        src: '/ppt/wenmai/stele/song.jpg',
        alt: '宋朝苏轼涌金亭碑刻',
        caption: '宋朝苏轼涌金亭碑刻',
      },
      {
        src: '/ppt/wenmai/stele/details/song-budai.png',
        alt: '宋朝布袋僧真仪像',
        caption: '宋朝《布袋僧真仪像》',
      },
      {
        src: '/ppt/wenmai/stele/details/song-yuefei.png',
        alt: '宋朝岳飞草书四条屏',
        caption: '宋朝岳飞草书四条屏',
      },
    ],
    spotId: 'yongjin-pavilion',
  },
  {
    id: 'yuan',
    era: '元代',
    title: '元代碑刻鉴赏',
    summary: '赵孟頫、吴澄等人的作品，让碑廊呈现出元代典雅沉着的书风。',
    coverImage: '/ppt/wenmai/stele/yuan.png',
    coverAlt: '元代碑刻鉴赏封面',
    gallery: [
      {
        src: '/ppt/wenmai/stele/yuan.png',
        alt: '元朝赵孟頫盘古序碑',
        caption: '元朝赵孟頫《盘古序》碑',
      },
      {
        src: '/ppt/wenmai/stele/details/yuan-wucheng.png',
        alt: '元朝吴澄诗碑',
        caption: '元朝吴澄诗碑',
      },
    ],
    spotId: 'stele-corridor',
  },
  {
    id: 'ming',
    era: '明代',
    title: '明代碑刻鉴赏',
    summary: '明代名家手笔让百泉碑廊兼具园林景观与书法展卷双重属性。',
    coverImage: '/ppt/wenmai/stele/ming.jpg',
    coverAlt: '明代碑刻鉴赏封面',
    gallery: [
      {
        src: '/ppt/wenmai/stele/ming.jpg',
        alt: '明朝董其昌碑刻',
        caption: '明朝董其昌碑刻',
      },
      {
        src: '/ppt/wenmai/stele/details/ming-yebingjing.png',
        alt: '明朝叶秉敬大草碑',
        caption: '明朝叶秉敬大草碑',
      },
      {
        src: '/ppt/wenmai/stele/details/ming-tangyin.jpg',
        alt: '明朝唐寅诗碑',
        caption: '明朝唐寅诗碑',
      },
    ],
    spotId: 'stele-corridor',
  },
  {
    id: 'qing',
    era: '清代',
    title: '清代碑刻鉴赏',
    summary: '御笔与文人题刻并置，是百泉碑刻中最具皇家与文人双重气象的一组。',
    coverImage: '/ppt/wenmai/stele/qing.png',
    coverAlt: '清代碑刻鉴赏封面',
    gallery: [
      {
        src: '/ppt/wenmai/stele/qing.png',
        alt: '清朝郑板桥雨竹图',
        caption: '清朝郑板桥《雨竹图》',
      },
      {
        src: '/ppt/wenmai/stele/details/qing-qianlong.jpg',
        alt: '清朝乾隆皇帝御笔',
        caption: '清朝乾隆皇帝御笔',
      },
      {
        src: '/ppt/wenmai/stele/details/qing-zhangying.png',
        alt: '清朝张英诗碑',
        caption: '清朝张英诗碑',
      },
      {
        src: '/ppt/wenmai/stele/details/qing-zhoujie.png',
        alt: '清朝周劼寿碑',
        caption: '清朝周劼《寿》碑',
      },
    ],
    spotId: 'stele-corridor',
  },
]
