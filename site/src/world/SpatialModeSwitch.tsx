import type { SpatialViewMode } from './types'
import './world.css'

type SpatialModeSwitchProps = {
  value: SpatialViewMode
  onChange: (mode: SpatialViewMode) => void
  className?: string
}

export function SpatialModeSwitch({ value, onChange, className = '' }: SpatialModeSwitchProps) {
  return (
    <div className={`ea-spatial-switch ${className}`.trim()} role="group" aria-label="空间视图">
      <button
        type="button"
        className={value === '2d' ? 'is-active' : undefined}
        aria-pressed={value === '2d'}
        onClick={() => onChange('2d')}
      >
        2D
      </button>
      <button
        type="button"
        className={value === '3d' ? 'is-active' : undefined}
        aria-pressed={value === '3d'}
        onClick={() => onChange('3d')}
      >
        3D
      </button>
    </div>
  )
}
