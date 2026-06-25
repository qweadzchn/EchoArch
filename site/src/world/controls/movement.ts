export type HorizontalMovement = { x: number; z: number }

export function getHorizontalMovement(
  yaw: number,
  sideInput: number,
  forwardInput: number,
): HorizontalMovement {
  const length = Math.hypot(sideInput, forwardInput)
  if (length <= 0.0001) return { x: 0, z: 0 }

  const side = sideInput / length
  const forward = forwardInput / length
  const sin = Math.sin(yaw)
  const cos = Math.cos(yaw)

  // A camera with yaw 0 looks toward world -Z. Pitch is intentionally ignored.
  return {
    x: side * cos - forward * sin,
    z: -side * sin - forward * cos,
  }
}
