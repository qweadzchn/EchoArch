export type HotspotLayout = {
  x: number
  y: number
  width: number
  height: number
}

export const OVERVIEW_IMAGE_SIZE = {
  width: 1830,
  height: 1280,
}

export const overviewLayoutBySpotId: Record<string, HotspotLayout> = {
  'weiyuan-temple': {
    x: 520,
    y: 440,
    width: 134,
    height: 154,
  },
  'yongjin-pavilion': {
    x: 675,
    y: 495,
    width: 105,
    height: 72,
  },
  'qinghui-pavilion': {
    x: 429,
    y: 683,
    width: 332,
    height: 244,
  },
  'south-hall': {
    x: 955,
    y: 887,
    width: 862,
    height: 401,
  },
  'qianlong-palace': {
    x: 1521,
    y: 479,
    width: 302,
    height: 353,
  },
  'fangyu-pavilion': {
    x: 1180,
    y: 661,
    width: 102,
    height: 84,
  },
  'huxin-pavilion': {
    x: 845,
    y: 617,
    width: 127,
    height: 126,
  },
  'diaoyu-pavilion': {
    x: 826,
    y: 905,
    width: 91,
    height: 81,
  },
  'feishi-stone': {
    x: 845,
    y: 984,
    width: 56,
    height: 42,
  },
  'yuejin-pavilion': {
    x: 334,
    y: 1042,
    width: 286,
    height: 152,
  },
  'boat-house': {
    x: 145,
    y: 838,
    width: 253,
    height: 112,
  },
  'shao-shrine': {
    x: 9,
    y: 576,
    width: 317,
    height: 113,
  },
  anlewo: {
    x: 296,
    y: 453,
    width: 208,
    height: 70,
  },
  'stele-corridor': {
    x: 1066,
    y: 558,
    width: 152,
    height: 72,
  },
  'efu-tomb': {
    x: 1210,
    y: 454,
    width: 130,
    height: 78,
  },
}
