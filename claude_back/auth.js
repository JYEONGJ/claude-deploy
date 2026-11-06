import crypto from "crypto"

// 로그인 토큰: base64url(payload).HMAC-SHA256 서명 (의존성 없는 간단한 JWT 형태)
// .env 에 AUTH_SECRET 을 지정하면 서버를 재시작해도 로그인이 유지된다
try { process.loadEnvFile() } catch {} // .env 가 없으면 무시
const SECRET = process.env.AUTH_SECRET || crypto.randomBytes(32).toString("hex")
if (!process.env.AUTH_SECRET) console.warn("AUTH_SECRET 이 없어 임시 키를 사용합니다. 서버를 재시작하면 모두 로그아웃됩니다.")

const COOKIE = "token"
const MAX_AGE_SEC = 7 * 24 * 60 * 60

const sign = (data) => crypto.createHmac("sha256", SECRET).update(data).digest("base64url")

export const createToken = (memberId) => {
    const payload = Buffer.from(JSON.stringify({ sub: memberId, exp: Date.now() + MAX_AGE_SEC * 1000 })).toString("base64url")
    return `${payload}.${sign(payload)}`
}

// 유효한 토큰이면 회원 id, 아니면 null
const verifyToken = (token) => {
    const [payload, signature] = String(token ?? "").split(".")
    if (!payload || !signature) return null
    const expected = Buffer.from(sign(payload))
    const actual = Buffer.from(signature)
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null
    try {
        const { sub, exp } = JSON.parse(Buffer.from(payload, "base64url").toString())
        return Number.isInteger(sub) && exp > Date.now() ? sub : null
    } catch {
        return null
    }
}

// 요청의 쿠키에서 로그인한 회원 id 를 꺼낸다 (비로그인이면 null)
export const getViewerId = (req) => {
    const pair = (req.headers.cookie ?? "").split(";").map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE}=`))
    return pair ? verifyToken(pair.slice(COOKIE.length + 1)) : null
}

// 로그인 필수 미들웨어: 통과하면 req.viewerId 에 회원 id 를 넣는다
export const requireLogin = (req, res, next) => {
    const viewer = getViewerId(req)
    if (!viewer) return res.status(401).json({ message: "로그인이 필요합니다." })
    req.viewerId = viewer
    next()
}

const cookieOptions = `HttpOnly; SameSite=Lax; Path=/${process.env.NODE_ENV === "production" ? "; Secure" : ""}`

export const setAuthCookie = (res, memberId) =>
    res.setHeader("Set-Cookie", `${COOKIE}=${createToken(memberId)}; Max-Age=${MAX_AGE_SEC}; ${cookieOptions}`)

export const clearAuthCookie = (res) => res.setHeader("Set-Cookie", `${COOKIE}=; Max-Age=0; ${cookieOptions}`)
