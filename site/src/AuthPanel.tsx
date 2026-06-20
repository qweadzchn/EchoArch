import { useEffect, useState, type FormEvent } from 'react'
import {
  getMyBookings,
  loginUser,
  logoutUser,
  registerUser,
  type PublicUser,
  type VisitBooking,
} from './api'

type AuthPanelProps = {
  user: PublicUser | null
  isOpen: boolean
  onClose: () => void
  onUserChange: (user: PublicUser | null) => void
}

type AuthMode = 'login' | 'register'

const statusLabels: Record<VisitBooking['status'], string> = {
  pending: '待确认',
  confirmed: '已确认',
  cancelled: '已取消',
  completed: '已完成',
}

export function AuthPanel({ user, isOpen, onClose, onUserChange }: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [account, setAccount] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [bookings, setBookings] = useState<VisitBooking[]>([])

  useEffect(() => {
    if (!isOpen || !user) {
      return
    }

    let cancelled = false

    getMyBookings()
      .then((result) => {
        if (!cancelled) {
          setBookings(result.bookings)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : '预约记录暂时读取失败。')
        }
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, user])

  if (!isOpen) {
    return null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsPending(true)
    setMessage('')

    try {
      const result =
        mode === 'login'
          ? await loginUser({ account, password })
          : await registerUser({
              account,
              displayName: displayName.trim() || account,
              password,
            })

      onUserChange(result.user)
      setPassword('')
      setMessage(mode === 'login' ? '已登录，预约和导览会关联到你的账号。' : '注册成功，已为你登录。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '账号操作失败。')
    } finally {
      setIsPending(false)
    }
  }

  async function handleLogout() {
    setIsPending(true)
    setMessage('')

    try {
      await logoutUser()
      onUserChange(null)
      setBookings([])
      setMessage('已退出登录。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '退出失败。')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="auth-dock" role="dialog" aria-modal="true" aria-label="账号与预约">
      <button type="button" className="auth-dock__backdrop" aria-label="关闭账号面板" onClick={onClose} />

      <section className="auth-dock__panel">
        <header className="auth-dock__header">
          <div>
            <span>游客账号</span>
            <strong>{user ? user.displayName : '登录后保存预约'}</strong>
          </div>
          <button type="button" onClick={onClose}>
            收起
          </button>
        </header>

        {user ? (
          <div className="auth-dock__body">
            <div className="auth-card">
              <span>{user.role === 'admin' ? '管理员' : '游客'}</span>
              <strong>{user.displayName}</strong>
              <p>账号：{user.account}</p>
              <button type="button" disabled={isPending} onClick={() => void handleLogout()}>
                退出登录
              </button>
            </div>

            <div className="auth-bookings">
              <div className="auth-dock__subhead">
                <span>我的预约</span>
                <strong>{bookings.length ? `${bookings.length} 条到访意向` : '暂无预约'}</strong>
              </div>

              {bookings.length ? (
                bookings.map((booking) => (
                  <article key={booking.id} className="auth-booking">
                    <span>{statusLabels[booking.status]}</span>
                    <strong>{booking.bookingNo}</strong>
                    <p>
                      {booking.visitDate}，{booking.timeSlotLabel}，{booking.visitorCount} 人
                    </p>
                    <small>{booking.routeTitle}</small>
                  </article>
                ))
              ) : (
                <p className="auth-dock__empty">提交预约后，会在这里看到状态。</p>
              )}
            </div>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <p className="auth-dock__hint">
              不登录也可以继续探访；预约到访、查看预约状态时使用账号保存。
            </p>

            <div className="auth-tabs" role="tablist" aria-label="账号操作">
              <button
                type="button"
                className={mode === 'login' ? 'is-active' : undefined}
                onClick={() => setMode('login')}
              >
                登录
              </button>
              <button
                type="button"
                className={mode === 'register' ? 'is-active' : undefined}
                onClick={() => setMode('register')}
              >
                注册
              </button>
            </div>

            <label>
              <span>账号</span>
              <input
                value={account}
                onChange={(event) => setAccount(event.target.value)}
                placeholder="用户名 / 邮箱 / 手机"
                autoComplete="username"
                required
              />
            </label>

            {mode === 'register' ? (
              <label>
                <span>显示名称</span>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="例如：百泉访客"
                  autoComplete="name"
                />
              </label>
            ) : null}

            <label>
              <span>密码</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </label>

            <button type="submit" disabled={isPending}>
              {isPending ? '处理中' : mode === 'login' ? '登录' : '注册并登录'}
            </button>
          </form>
        )}

        {message ? <p className="auth-dock__message">{message}</p> : null}
      </section>
    </div>
  )
}
