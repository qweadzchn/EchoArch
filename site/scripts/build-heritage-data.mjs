import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SITE_ROOT = path.resolve(__dirname, '..')
const RAW_CONTENT_ROOT = path.resolve(SITE_ROOT, '..', '各建筑介绍')
const PUBLIC_OUTPUT_ROOT = path.join(SITE_ROOT, 'public', 'heritage')
const LANDING_OUTPUT_ROOT = path.join(SITE_ROOT, 'public', 'landing')
const DATA_OUTPUT_FILE = path.join(SITE_ROOT, 'src', 'data', 'heritage-data.ts')
const LANDING_ASSETS = [
  {
    source: path.resolve(SITE_ROOT, '..', '首页.jpg'),
    output: path.join(LANDING_OUTPUT_ROOT, 'overview.jpg'),
  },
  {
    source: path.resolve(SITE_ROOT, '..', '首页和建筑点位对照.jpg'),
    output: path.join(LANDING_OUTPUT_ROOT, 'reference.jpg'),
  },
]

const CURATION = {
  卫源庙: {
    id: 'weiyuan-temple',
    world: 'north-shore',
    region: '北岸门庭',
    era: '隋启明清风貌',
    highlight: '百泉“点睛之笔”',
    mood: '中轴古庙',
    accent: '#b88a4b',
    position: { x: 324, y: 220 },
    description:
      '百泉现存最古老、体量最完整的古建组群之一，庙宇中轴与湖山关系紧密。',
    related: ['yongjin-pavilion', 'south-hall', 'qianlong-palace'],
  },
  涌金亭: {
    id: 'yongjin-pavilion',
    world: 'north-shore',
    region: '北岸门庭',
    era: '苏轼题名遗韵',
    highlight: '因泉涌映日如金得名',
    mood: '题刻与文人记忆',
    accent: '#cc9b4c',
    position: { x: 466, y: 286 },
    description: '与苏轼题名、碑刻故事相连的小亭，是北岸游赏与文脉记忆的节点。',
    related: ['weiyuan-temple', 'fangyu-pavilion'],
  },
  清晖阁: {
    id: 'qinghui-pavilion',
    world: 'lake-core',
    region: '湖心亭榭',
    era: '明清重修水阁',
    highlight: '百泉湖中的核心景观',
    mood: '湖阁与桥影',
    accent: '#4c8d79',
    position: { x: 820, y: 438 },
    description: '位于湖中的标志性阁楼，是百泉水景空间最具辨识度的视觉中心。',
    related: ['boat-house', 'huxin-pavilion', 'diaoyu-pavilion'],
  },
  南大厅: {
    id: 'south-hall',
    world: 'academy-axis',
    region: '书院行宫',
    era: '百泉书院旧址',
    highlight: '书院文脉的重要空间',
    mood: '讲学与政务',
    accent: '#915b4f',
    position: { x: 534, y: 620 },
    description: '百泉书院旧址的重要组成部分，承接了讲学、治事与地方文化记忆。',
    related: ['qianlong-palace', 'feishi-stone', 'weiyuan-temple'],
  },
  乾隆行宫: {
    id: 'qianlong-palace',
    world: 'academy-axis',
    region: '书院行宫',
    era: '1750年行宫改建',
    highlight: '由百泉书院改建而成',
    mood: '书院与皇迹',
    accent: '#a36b52',
    position: { x: 426, y: 734 },
    description: '由书院空间转化而来的行宫建筑，叠合了学脉与皇家巡幸两种记忆。',
    related: ['south-hall', 'weiyuan-temple'],
  },
  放鱼亭: {
    id: 'fangyu-pavilion',
    world: 'north-shore',
    region: '北岸门庭',
    era: '临湖古亭',
    highlight: '因放鱼养性之俗得名',
    mood: '临岸观湖',
    accent: '#6e8c68',
    position: { x: 1136, y: 238 },
    description: '北岸临水的小亭，以放鱼养性、对望湖景的古典游赏方式而闻名。',
    related: ['huxin-pavilion', 'diaoyu-pavilion', 'yuejin-pavilion'],
  },
  湖心亭: {
    id: 'huxin-pavilion',
    world: 'lake-core',
    region: '湖心亭榭',
    era: '1928年湖心新亭',
    highlight: '梦境与纪念性的湖心地标',
    mood: '湖心与桥影',
    accent: '#4a967c',
    position: { x: 962, y: 324 },
    description: '湖中央最具识别性的纪念性亭阁，让整片水域拥有了故事感和仪式感。',
    related: ['fangyu-pavilion', 'qinghui-pavilion', 'yuejin-pavilion'],
  },
  钓鱼亭: {
    id: 'diaoyu-pavilion',
    world: 'lake-core',
    region: '湖心亭榭',
    era: '明代古亭',
    highlight: '乾隆为母垂钓而更名',
    mood: '孝养与临水',
    accent: '#3f7d69',
    position: { x: 1150, y: 492 },
    description: '临水而立的古亭，承载着帝王孝养与园林水岸游赏的双重意象。',
    related: ['fangyu-pavilion', 'qinghui-pavilion'],
  },
  肺石: {
    id: 'feishi-stone',
    world: 'academy-axis',
    region: '书院行宫',
    era: '奇石陈设',
    highlight: '因形似肺而得名',
    mood: '官民同息的象征',
    accent: '#7a6d5f',
    position: { x: 650, y: 576 },
    description: '位于南大厅附近的奇石景观，兼具赏石趣味与地方政治象征。',
    related: ['south-hall'],
  },
  跃进亭: {
    id: 'yuejin-pavilion',
    world: 'lake-core',
    region: '湖心亭榭',
    era: '现代修缮地标',
    highlight: '连接湖岸与湖心古建群的重要通道',
    mood: '桥廊与视线中轴',
    accent: '#5f8879',
    position: { x: 1236, y: 360 },
    description: '兼具通行与观景功能的桥亭节点，让湖岸与湖心空间联结成完整游线。',
    related: ['huxin-pavilion', 'fangyu-pavilion'],
  },
  船房: {
    id: 'boat-house',
    world: 'lake-core',
    region: '湖心亭榭',
    era: '清晖阁前置空间',
    highlight: '湖心建筑群的水上前厅',
    mood: '船政与云石旧事',
    accent: '#4d7468',
    position: { x: 892, y: 572 },
    description: '紧邻清晖阁的前置节点，既是湖上交通的接口，也保留着云石故事。',
    related: ['qinghui-pavilion', 'huxin-pavilion'],
  },
  邵夫子祠: {
    id: 'shao-shrine',
    world: 'west-mountain',
    region: '西岸山径',
    era: '邵雍纪念祠',
    highlight: '桃竹园中的理学纪念地',
    mood: '纪念、书香与山居',
    accent: '#657085',
    position: { x: 252, y: 458 },
    description: '西岸桃竹园中的纪念空间，让山水、理学与祠祀传统交织在一起。',
    related: ['anlewo', 'stele-corridor'],
  },
  安乐窝: {
    id: 'anlewo',
    world: 'west-mountain',
    region: '西岸山径',
    era: '邵雍讲学故地',
    highlight: '理学家邵雍少时读书讲学处',
    mood: '山居与理学',
    accent: '#72798c',
    position: { x: 228, y: 176 },
    description: '苏门山旁的山居遗址，是理解邵雍精神气质与百泉理学文脉的关键点位。',
    related: ['shao-shrine', 'efu-tomb', 'stele-corridor'],
  },
  碑廊: {
    id: 'stele-corridor',
    world: 'west-mountain',
    region: '西岸山径',
    era: '近现代碑廊营建',
    highlight: '集中陈列历代碑刻的山中长廊',
    mood: '石刻与山路',
    accent: '#666f82',
    position: { x: 126, y: 94 },
    description: '依山势铺开的碑刻长廊，将百泉历代文人题刻与历史记忆集中呈现。',
    related: ['anlewo', 'shao-shrine', 'efu-tomb'],
  },
  饿夫墓: {
    id: 'efu-tomb',
    world: 'west-mountain',
    region: '西岸山径',
    era: '明遗民故事',
    highlight: '民族精神记忆的山腰墓冢',
    mood: '山径与遗民气节',
    accent: '#7f655a',
    position: { x: 314, y: 88 },
    description: '山腰间的墓冢与题刻，保存着明遗民气节与地方记忆的厚重情绪。',
    related: ['anlewo', 'stele-corridor'],
  },
}

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function clearDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true })
  }
  ensureDir(dirPath)
}

function copyLandingAssets() {
  ensureDir(LANDING_OUTPUT_ROOT)

  for (const asset of LANDING_ASSETS) {
    if (!fs.existsSync(asset.source)) {
      continue
    }

    fs.copyFileSync(asset.source, asset.output)
  }
}

function normalizeText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\uFEFF/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractExcerpt(text) {
  const normalized = text.replace(/\n/g, '')
  const sentence = normalized.match(/^.{0,96}?[。！？]/u)
  if (sentence) {
    return sentence[0]
  }

  return `${normalized.slice(0, 88)}…`
}

function toSluggedFileName(index, originalFile) {
  const ext = path.extname(originalFile).toLowerCase()
  return `${String(index + 1).padStart(2, '0')}${ext}`
}

function parseOrder(dirName) {
  const match = dirName.match(/^(\d+)\./)
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER
}

function stripOrder(dirName) {
  return dirName.replace(/^\d+\./, '')
}

function collectImageFiles(dirPath, displayName) {
  const entries = []

  function walk(currentPath) {
    const children = fs.readdirSync(currentPath, { withFileTypes: true })

    for (const child of children) {
      const fullPath = path.join(currentPath, child.name)

      if (child.isDirectory()) {
        walk(fullPath)
        continue
      }

      if (!IMAGE_EXTENSIONS.has(path.extname(child.name).toLowerCase())) {
        continue
      }

      const basename = path.parse(child.name).name
      const score =
        (basename.includes(displayName) ? 12 : 0) +
        (path.dirname(fullPath) === dirPath ? 5 : 0) +
        (basename.includes('全景') || basename.includes('正面') ? 3 : 0)

      entries.push({
        fullPath,
        originalName: child.name,
        caption: basename,
        score,
      })
    }
  }

  walk(dirPath)

  return entries.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score
    }

    return left.originalName.localeCompare(right.originalName, 'zh-CN')
  })
}

function pickPrimaryTextFile(dirPath) {
  const children = fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.txt')
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'zh-CN'))

  if (!children.length) {
    throw new Error(`No text file found in ${dirPath}`)
  }

  return path.join(dirPath, children[0])
}

function buildSpotRecord(directoryEntry) {
  const dirPath = path.join(RAW_CONTENT_ROOT, directoryEntry.name)
  const name = stripOrder(directoryEntry.name)
  const metadata = CURATION[name]

  if (!metadata) {
    throw new Error(`Missing curation metadata for ${name}`)
  }

  const textFilePath = pickPrimaryTextFile(dirPath)
  const fullText = normalizeText(fs.readFileSync(textFilePath, 'utf8'))
  const excerpt = extractExcerpt(fullText)
  const images = collectImageFiles(dirPath, name)
  const outputDir = path.join(PUBLIC_OUTPUT_ROOT, metadata.id)

  clearDir(outputDir)

  const imageRecords = images.map((image, index) => {
    const outputName = toSluggedFileName(index, image.originalName)
    const outputPath = path.join(outputDir, outputName)
    fs.copyFileSync(image.fullPath, outputPath)

    return {
      id: `${metadata.id}-${index + 1}`,
      src: `/heritage/${metadata.id}/${outputName}`,
      caption: image.caption,
      alt: `${name} - ${image.caption}`,
    }
  })

  return {
    id: metadata.id,
    order: parseOrder(directoryEntry.name),
    name,
    region: metadata.region,
    world: metadata.world,
    era: metadata.era,
    highlight: metadata.highlight,
    mood: metadata.mood,
    accent: metadata.accent,
    position: metadata.position,
    description: metadata.description,
    excerpt,
    fullText,
    related: metadata.related,
    images: imageRecords,
  }
}

function main() {
  if (!fs.existsSync(RAW_CONTENT_ROOT)) {
    throw new Error(`Raw content directory not found: ${RAW_CONTENT_ROOT}`)
  }

  clearDir(PUBLIC_OUTPUT_ROOT)
  clearDir(LANDING_OUTPUT_ROOT)
  ensureDir(path.dirname(DATA_OUTPUT_FILE))
  copyLandingAssets()

  const spotDirectories = fs
    .readdirSync(RAW_CONTENT_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => parseOrder(left.name) - parseOrder(right.name))

  const records = spotDirectories.map(buildSpotRecord)
  const fileContents = `import type { HeritageSpot } from '../types'\n\nexport const heritageSpots: HeritageSpot[] = ${JSON.stringify(
    records,
    null,
    2,
  )}\n`

  fs.writeFileSync(DATA_OUTPUT_FILE, fileContents, 'utf8')

  console.log(`Synced ${records.length} heritage spots.`)
}

main()
