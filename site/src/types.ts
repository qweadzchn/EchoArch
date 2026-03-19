export type WorldZone =
  | 'north-shore'
  | 'lake-core'
  | 'academy-axis'
  | 'west-mountain'

export type HeritageImage = {
  id: string
  src: string
  caption: string
  alt: string
}

export type HeritageSpot = {
  id: string
  order: number
  name: string
  region: string
  world: WorldZone
  era: string
  highlight: string
  mood: string
  accent: string
  position: {
    x: number
    y: number
  }
  description: string
  excerpt: string
  fullText: string
  related: string[]
  images: HeritageImage[]
}
