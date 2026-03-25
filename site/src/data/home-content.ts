export type HomeStoryEntry = {
  id: string
  title: string
  subtitle: string
  description: string
  imageSrc: string
  imageAlt: string
  spotId: string
}

export type HomeTimelineEntry = {
  era: string
  title: string
  description: string
  imageSrc: string
  imageAlt: string
  spotId: string
}

export type HomeSteleEntry = {
  era: string
  title: string
  description: string
  imageSrc: string
  imageAlt: string
  spotId: string
}

export const homeHeroChapters = ['钟灵百泉', '鸾翔凤集', '文脉流长']

export const homeIntroParagraphs = [
  '百泉湖古建筑群坐落于豫北苏门山南麓、百泉湖畔，是 2001 年国务院公布的全国重点文物保护单位，亦是河南省现存规模最大、保存最完好的古典园林建筑群，素有“中州颐和园”“北国小西湖”的美誉。',
  '其人文历史可上溯至三千年前的殷商时期，隋唐起大规模营建古建群，经明清两代修缮扩建，最终形成山水相依、园中套园的经典园林格局。澄澈泉湖与千年古建相映成趣，既藏太行山水的灵秀之气，又载中原文明的厚重底蕴。',
  '建筑群融南北建筑艺术之精髓，既有北方殿堂的雄伟恢弘，又具江南园林的玲珑秀丽。苏轼题写“苏门山涌金亭”碑刻，元好问、郑板桥等历代文人墨迹，共同织就跨越千年的中原文脉长廊。',
]

export const homeIntroStats = [
  {
    label: '重点文保',
    value: '2001',
    note: '全国重点文物保护单位',
  },
  {
    label: '园林气象',
    value: '山水相依',
    note: '园中套园，殿阁与湖山交融',
  },
  {
    label: '人文积淀',
    value: '千年文脉',
    note: '书院、碑刻、行宫共生于一园',
  },
]

export const homeStoryEntries: HomeStoryEntry[] = [
  {
    id: 'yuefei',
    title: '精忠岳飞',
    subtitle: '忠烈书风',
    description:
      '南宋名将的忠烈形象，与百泉碑刻中的草书遗痕一同被后世反复追忆。英气不只停留在传说，也落在石上、园中与游人的回望里。',
    imageSrc: '/ppt/luanxiang/yuefei.png',
    imageAlt: '精忠岳飞主题插画',
    spotId: 'stele-corridor',
  },
  {
    id: 'qixian',
    title: '竹林七贤',
    subtitle: '魏晋风骨',
    description:
      '苏门山与百泉湖一带，常被想象为魏晋高士寄情山水的场域。孙登、阮籍、嵇康的逸兴，在山林与书院文脉之间彼此映照。',
    imageSrc: '/ppt/luanxiang/qixian.png',
    imageAlt: '竹林七贤主题插画',
    spotId: 'anlewo',
  },
  {
    id: 'sushi',
    title: '眉山苏轼',
    subtitle: '题亭成名',
    description:
      '苏轼题写“苏门山涌金亭”之后，百泉有了更鲜明的文人印记。豁达、旷朗与临水观景的气度，也成为这片园林最迷人的精神风景。',
    imageSrc: '/ppt/luanxiang/sushi.png',
    imageAlt: '眉山苏轼主题插画',
    spotId: 'yongjin-pavilion',
  },
  {
    id: 'liaofan',
    title: '饿夫了凡',
    subtitle: '山径悲歌',
    description:
      '明亡之后，彭了凡绝食殉节，留下“饿夫墓”这一沉痛而峻烈的历史印记。山路间的静默，也因此多了一层民族气节的回声。',
    imageSrc: '/ppt/luanxiang/liaofan.png',
    imageAlt: '饿夫了凡主题插画',
    spotId: 'efu-tomb',
  },
  {
    id: 'qianlong',
    title: '乾隆南巡',
    subtitle: '驻跸百泉',
    description:
      '清代帝王的驻跸、题咏与行宫改建，让百泉在书院气质之外，又叠上一层皇家巡幸的仪式感。园林、政务与观景在此短暂交汇。',
    imageSrc: '/ppt/luanxiang/qianlong.png',
    imageAlt: '乾隆南巡主题插画',
    spotId: 'qianlong-palace',
  },
]

export const homeTimelineLead =
  '百泉书院前身为太极书院，自宋元时期起便是全国著名学府。它以“门户开放”的教学原则、持续千年的讲学传统，以及跨越朝代的空间变迁，成为中原文化教育史中极具辨识度的一处坐标。'

export const homeTimelineEntries: HomeTimelineEntry[] = [
  {
    era: '晋朝',
    title: '孙登讲学场所',
    description: '百泉与苏门山的清峻气质，在魏晋时期就已成为高士讲学与栖居的理想场域。',
    imageSrc: '/ppt/wenmai/academy/jin.png',
    imageAlt: '晋代孙登讲学场所',
    spotId: 'anlewo',
  },
  {
    era: '五代',
    title: '太极书院肇建',
    description: '五代十国时建书院，百泉由山水清游之境，渐渐转入系统的教育空间。',
    imageSrc: '/ppt/wenmai/academy/wudai.png',
    imageAlt: '五代十国建书院',
    spotId: 'south-hall',
  },
  {
    era: '北宋',
    title: '邵雍讲学',
    description: '理学气象在此隆起，百泉书院成为中原乃至全国书院网络中的重要节点。',
    imageSrc: '/ppt/wenmai/academy/song.png',
    imageAlt: '北宋邵雍讲学',
    spotId: 'shao-shrine',
  },
  {
    era: '元朝',
    title: '太极书院声名远播',
    description: '元代书院重振，其讲学传统与学术影响力持续扩展，形成稳定的文教地位。',
    imageSrc: '/ppt/wenmai/academy/yuan.png',
    imageAlt: '元代太极书院',
    spotId: 'south-hall',
  },
  {
    era: '明朝',
    title: '百泉书院复兴',
    description: '明代重修百泉书院，讲学、藏书与地方文化记忆重新聚拢于这一空间。',
    imageSrc: '/ppt/wenmai/academy/ming.png',
    imageAlt: '明代百泉书院',
    spotId: 'south-hall',
  },
  {
    era: '清朝',
    title: '乾隆行宫改建',
    description: '书院格局被纳入皇家巡幸体系，百泉因此叠加了行宫、贡院与园林的多重身份。',
    imageSrc: '/ppt/wenmai/academy/qing.png',
    imageAlt: '清朝乾隆行宫',
    spotId: 'qianlong-palace',
  },
]

export const homeSteleEntries: HomeSteleEntry[] = [
  {
    era: '汉代',
    title: '诗竹与古意',
    description: '从图像与题咏中看到早期碑刻的古拙气韵，也为百泉碑廊奠定时间纵深。',
    imageSrc: '/ppt/wenmai/stele/han.jpg',
    imageAlt: '汉代碑刻作品',
    spotId: 'stele-corridor',
  },
  {
    era: '宋代',
    title: '苏轼涌金亭碑刻',
    description: '宋代文人的题名、画像与书法，把百泉的湖山之景推入更鲜明的人文叙事。',
    imageSrc: '/ppt/wenmai/stele/song.jpg',
    imageAlt: '宋代苏轼涌金亭碑刻',
    spotId: 'yongjin-pavilion',
  },
  {
    era: '元代',
    title: '赵孟頫与盘古序',
    description: '元代碑刻在书风上更显典雅沉着，也让碑廊呈现出连续不断的书法谱系。',
    imageSrc: '/ppt/wenmai/stele/yuan.png',
    imageAlt: '元代赵孟頫盘古序碑',
    spotId: 'stele-corridor',
  },
  {
    era: '明代',
    title: '董其昌碑刻',
    description: '明代名家笔墨进入百泉，使此地不只是园林，也是可以步入其间的书法展卷。',
    imageSrc: '/ppt/wenmai/stele/ming.jpg',
    imageAlt: '明代董其昌碑刻',
    spotId: 'stele-corridor',
  },
  {
    era: '清代',
    title: '郑板桥雨竹图',
    description: '清代御笔与文人题刻并置，皇家审美与士人风骨在碑廊之中交相映照。',
    imageSrc: '/ppt/wenmai/stele/qing.png',
    imageAlt: '清代郑板桥雨竹图碑刻',
    spotId: 'stele-corridor',
  },
]
