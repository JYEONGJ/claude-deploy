import express from "express"
import cors from "cors"
import crypto from "crypto"
import swaggerUi from "swagger-ui-express"
import { fileURLToPath } from "url"
import { PrismaClient } from "@prisma/client"
import { createBoardRouter } from "./board.js"
import { setAuthCookie, clearAuthCookie, requireLogin } from "./auth.js"

const app = express()
// http://localhost:10000
const port = Number(process.env.PORT) || 10000

const prisma = new PrismaClient()

app.use(cors())
// json 방식 데이터를 req.body 로 파싱
app.use(express.json())

// 화면(html/css/js)은 public 폴더만 공개 (.env, 소스 파일은 노출하지 않는다)
// http://localhost:10000/login.html, http://localhost:10000/mypage.html
app.use(express.static(fileURLToPath(new URL("./public", import.meta.url))))

// 응답에 비밀번호는 포함하지 않는다
const publicFields = { id: true, email: true, name: true, age: true, address: true, phone: true }

// 비밀번호는 평문 저장하지 않고 scrypt 해시("salt:hash")로 저장
const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString("hex")
    const hash = crypto.scryptSync(password, salt, 64).toString("hex")
    return `${salt}:${hash}`
}

// 저장된 "salt:hash" 와 입력 비밀번호 비교 (형식이 다르면 불일치)
const verifyPassword = (password, stored) => {
    const [salt, hash] = String(stored).split(":")
    if (!salt || !hash) return false
    const actual = crypto.scryptSync(password, salt, 64)
    const expected = Buffer.from(hash, "hex")
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
}

// :id 파라미터를 정수로 검증 (잘못된 값이면 null)
const parseId = (value) => {
    const id = Number(value)
    return Number.isInteger(id) && id > 0 ? id : null
}

// 선택 입력값: 빈 문자열/undefined 는 null 로 정리
const optional = (v) => (v === undefined || v === null || String(v).trim() === "" ? null : String(v).trim())

const optionalAge = (v) => {
    if (v === undefined || v === null || v === "") return null
    const n = Number(v)
    return Number.isInteger(n) && n >= 0 ? n : NaN
}

// 스키마 VarChar 길이 제한 (초과하면 DB 오류 전에 400 으로 막는다)
const maxLengths = { email: 255, phone: 20, name: 50, address: 255 }
const findTooLong = (fields) =>
    Object.keys(maxLengths).find((k) => fields[k] != null && String(fields[k]).trim().length > maxLengths[k])

// Swagger(OpenAPI 3) 문서
// http://localhost:10000/docs
const errorResponse = (description) => ({
    description,
    content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
})
const idParam = {
    name: "id", in: "path", required: true, description: "회원 id", schema: { type: "integer", minimum: 1, example: 1 },
}

const swaggerSpec = {
    openapi: "3.0.3",
    info: { title: "Member API", version: "1.0.0", description: "tbl_member 테이블 CRUD API (Express + Prisma)" },
    servers: [{ url: `http://localhost:${port}` }],
    tags: [{ name: "Members", description: "회원 관리" }, { name: "Auth", description: "로그인" }, { name: "Posts", description: "게시판 (tbl_post)" }],
    paths: {
        "/me": {
            get: {
                tags: ["Members"],
                summary: "내 정보 (로그인 필요)",
                responses: {
                    200: { description: "로그인한 회원", content: { "application/json": { schema: { $ref: "#/components/schemas/Member" } } } },
                    401: errorResponse("로그인 필요"),
                },
            },
        },
        "/posts": {
            get: {
                tags: ["Posts"],
                summary: "게시글 목록 (기본 공개 글, mine=1 이면 내 글)",
                parameters: [
                    { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                    { name: "size", in: "query", schema: { type: "integer", default: 10, maximum: 100 } },
                    { name: "q", in: "query", description: "제목 검색", schema: { type: "string" } },
                    { name: "mine", in: "query", description: "1 이면 내 글(비공개 포함, 로그인 필요)", schema: { type: "string", enum: ["1"] } },
                ],
                responses: {
                    200: { description: "{ items, total, page, size }" },
                    401: errorResponse("mine=1 인데 비로그인"),
                },
            },
            post: {
                tags: ["Posts"],
                summary: "게시글 추가 (로그인 필요, 작성자는 로그인한 회원)",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/PostInput" } } },
                },
                responses: {
                    201: { description: "생성된 게시글", content: { "application/json": { schema: { $ref: "#/components/schemas/Post" } } } },
                    400: errorResponse("제목 또는 내용 누락/길이 초과"),
                    401: errorResponse("로그인 필요"),
                },
            },
        },
        "/posts/{id}": {
            get: {
                tags: ["Posts"],
                summary: "게시글 단건 (비공개 글은 작성자만)",
                parameters: [{ ...idParam, description: "게시글 id" }],
                responses: {
                    200: { description: "게시글 + 작성자(id, name)" },
                    400: errorResponse("잘못된 id"),
                    404: errorResponse("게시글 없음 또는 비공개"),
                },
            },
            put: {
                tags: ["Posts"],
                summary: "게시글 수정 (작성자만)",
                parameters: [{ ...idParam, description: "게시글 id" }],
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/PostInput" } } },
                },
                responses: {
                    200: { description: "수정된 게시글", content: { "application/json": { schema: { $ref: "#/components/schemas/Post" } } } },
                    400: errorResponse("잘못된 id, 제목 또는 내용 누락/길이 초과"),
                    401: errorResponse("로그인 필요"),
                    403: errorResponse("작성자가 아님"),
                    404: errorResponse("게시글 없음"),
                },
            },
            delete: {
                tags: ["Posts"],
                summary: "게시글 삭제 (작성자만)",
                parameters: [{ ...idParam, description: "게시글 id" }],
                responses: {
                    204: { description: "삭제 완료" },
                    400: errorResponse("잘못된 id"),
                    401: errorResponse("로그인 필요"),
                    403: errorResponse("작성자가 아님"),
                    404: errorResponse("게시글 없음"),
                },
            },
        },
        "/logout": {
            post: {
                tags: ["Auth"],
                summary: "로그아웃 (token 쿠키 삭제)",
                responses: { 204: { description: "로그아웃 완료" } },
            },
        },
        "/login": {
            post: {
                tags: ["Auth"],
                summary: "로그인 (email + password 확인, 성공 시 token 쿠키 발급)",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/Login" } } },
                },
                responses: {
                    200: { description: "로그인한 회원", content: { "application/json": { schema: { $ref: "#/components/schemas/Member" } } } },
                    400: errorResponse("email 또는 password 누락"),
                    401: errorResponse("email 또는 password 불일치"),
                },
            },
        },
        "/members": {
            get: {
                tags: ["Members"],
                summary: "회원 목록 조회",
                responses: {
                    200: {
                        description: "회원 목록 (id 오름차순)",
                        content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Member" } } } },
                    },
                },
            },
            post: {
                tags: ["Members"],
                summary: "회원 추가",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/MemberCreate" } } },
                },
                responses: {
                    201: { description: "생성된 회원", content: { "application/json": { schema: { $ref: "#/components/schemas/Member" } } } },
                    400: errorResponse("필수값 누락 또는 형식 오류"),
                    409: errorResponse("이미 사용 중인 email"),
                },
            },
        },
        "/members/{id}": {
            get: {
                tags: ["Members"],
                summary: "회원 단건 조회",
                parameters: [idParam],
                responses: {
                    200: { description: "회원 정보", content: { "application/json": { schema: { $ref: "#/components/schemas/Member" } } } },
                    400: errorResponse("잘못된 id"),
                    404: errorResponse("회원 없음"),
                },
            },
            put: {
                tags: ["Members"],
                summary: "회원 수정 (전달된 필드만 변경)",
                parameters: [idParam],
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/MemberUpdate" } } },
                },
                responses: {
                    200: { description: "수정된 회원", content: { "application/json": { schema: { $ref: "#/components/schemas/Member" } } } },
                    400: errorResponse("잘못된 id, 형식 오류 또는 수정할 값 없음"),
                    404: errorResponse("회원 없음"),
                    409: errorResponse("이미 사용 중인 email"),
                },
            },
            delete: {
                tags: ["Members"],
                summary: "회원 삭제",
                parameters: [idParam],
                responses: {
                    204: { description: "삭제 완료" },
                    400: errorResponse("잘못된 id"),
                    404: errorResponse("회원 없음"),
                },
            },
        },
    },
    components: {
        schemas: {
            Member: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 1 },
                    email: { type: "string", format: "email", example: "a@a.com" },
                    name: { type: "string", nullable: true, example: "홍길동" },
                    age: { type: "integer", nullable: true, example: 30 },
                    address: { type: "string", nullable: true, example: "서울시 강남구" },
                    phone: { type: "string", example: "010-1111-2222" },
                },
            },
            Post: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 1 },
                    title: { type: "string", maxLength: 200, example: "오늘의 여행 이야기" },
                    content: { type: "string", maxLength: 5000, example: "오늘은 오랜만에 시간을 내서 다녀왔습니다." },
                    createdAt: { type: "string", format: "date-time" },
                    isPublic: { type: "boolean", example: true },
                    memberId: { type: "integer", nullable: true, example: 1 },
                },
            },
            PostInput: {
                type: "object",
                required: ["title", "content"],
                properties: {
                    title: { type: "string", maxLength: 200, example: "오늘의 여행 이야기" },
                    content: { type: "string", maxLength: 5000, example: "오늘은 오랜만에 시간을 내서 다녀왔습니다." },
                    isPublic: { type: "boolean", default: true },
                },
            },
            Login: {
                type: "object",
                required: ["email", "password"],
                properties: {
                    email: { type: "string", format: "email", example: "a@a.com" },
                    password: { type: "string", format: "password", example: "1234" },
                },
            },
            MemberCreate: {
                type: "object",
                required: ["email", "password", "phone"],
                properties: {
                    email: { type: "string", format: "email", example: "a@a.com" },
                    password: { type: "string", format: "password", example: "1234" },
                    phone: { type: "string", example: "010-1111-2222" },
                    name: { type: "string", example: "홍길동" },
                    age: { type: "integer", minimum: 0, example: 30 },
                    address: { type: "string", example: "서울시 강남구" },
                },
            },
            MemberUpdate: {
                type: "object",
                properties: {
                    email: { type: "string", format: "email", example: "b@b.com" },
                    password: { type: "string", format: "password", example: "5678" },
                    phone: { type: "string", example: "010-3333-4444" },
                    name: { type: "string", example: "김철수" },
                    age: { type: "integer", minimum: 0, example: 31 },
                    address: { type: "string", example: "부산시 해운대구" },
                },
            },
            Error: {
                type: "object",
                properties: { message: { type: "string", example: "회원을 찾을 수 없습니다." } },
            },
        },
    },
}

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// 게시판 화면(SSR) 및 /posts API
// http://localhost:10000/board
app.use(createBoardRouter(prisma, { siteUrl: `http://localhost:${port}` }))

// 로그인
// POST http://localhost:10000/login  { email, password }
app.post("/login", async (req, res) => {
    const { email, password } = req.body ?? {}
    if (!email?.trim() || !password) return res.status(400).json({ message: "email, password 를 입력해 주세요." })

    const found = await prisma.member.findUnique({ where: { email: email.trim() } })
    // 이메일이 없는지 비밀번호가 틀린지 구분하지 않는다
    if (!found || !verifyPassword(String(password), found.password)) {
        return res.status(401).json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." })
    }
    const { password: _password, ...member } = found
    // 게시판 등에서 작성자를 확인할 수 있도록 로그인 쿠키 발급
    setAuthCookie(res, member.id)
    res.json(member)
})

// 로그아웃: 로그인 쿠키 삭제
// POST http://localhost:10000/logout
app.post("/logout", (req, res) => {
    clearAuthCookie(res)
    res.status(204).end()
})

// 목록 조회 (R)
// GET http://localhost:10000/members
// GET http://localhost:10000/members?page=1&size=20 (로그인 필요)
app.get("/members", requireLogin, async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const size = Math.min(100, Math.max(1, parseInt(req.query.size, 10) || 20))
    const members = await prisma.member.findMany({
        select: publicFields,
        orderBy: { id: "asc" },
        skip: (page - 1) * size,
        take: size,
    })
    res.json(members)
})

// 내 정보 (로그인 필요)
// GET http://localhost:10000/me
app.get("/me", requireLogin, async (req, res) => {
    const member = await prisma.member.findUnique({ where: { id: req.viewerId }, select: publicFields })
    if (!member) return res.status(401).json({ message: "로그인이 필요합니다." })
    res.json(member)
})

// 본인 확인: 로그인한 회원 id 와 :id 가 같아야 통과 (실패 시 응답하고 null)
const authorizeSelf = (req, res) => {
    const id = parseId(req.params.id)
    if (!id) return void res.status(400).json({ message: "잘못된 id 입니다." })
    if (id !== req.viewerId) return void res.status(403).json({ message: "본인 정보만 수정/삭제할 수 있습니다." })
    return id
}

// 단건 조회 (R, 로그인 필요)
// GET http://localhost:10000/members/1
app.get("/members/:id", requireLogin, async (req, res) => {
    const id = parseId(req.params.id)
    if (!id) return res.status(400).json({ message: "잘못된 id 입니다." })

    const member = await prisma.member.findUnique({ where: { id }, select: publicFields })
    if (!member) return res.status(404).json({ message: "회원을 찾을 수 없습니다." })
    res.json(member)
})

// 추가 (C)
// POST http://localhost:10000/members  { email, password, phone, name?, age?, address? }
app.post("/members", async (req, res) => {
    const { email, password, phone, name, age, address } = req.body ?? {}
    if (!email?.trim() || !password || !phone?.trim()) {
        return res.status(400).json({ message: "email, password, phone 은 필수입니다." })
    }
    const tooLong = findTooLong({ email, phone, name, address })
    if (tooLong) return res.status(400).json({ message: `${tooLong} 의 길이가 너무 깁니다.` })
    const ageValue = optionalAge(age)
    if (Number.isNaN(ageValue)) return res.status(400).json({ message: "age 는 0 이상의 정수여야 합니다." })

    const member = await prisma.member.create({
        data: {
            email: email.trim(),
            password: hashPassword(String(password)),
            phone: phone.trim(),
            name: optional(name),
            age: ageValue,
            address: optional(address),
        },
        select: publicFields,
    })
    res.status(201).json(member)
})

// 수정 (U) - 전달된 필드만 변경
// PUT http://localhost:10000/members/1  { email?, password?, phone?, name?, age?, address? }
app.put("/members/:id", requireLogin, async (req, res) => {
    const id = authorizeSelf(req, res)
    if (!id) return

    const { email, password, phone, name, age, address } = req.body ?? {}
    const tooLong = findTooLong({ email, phone, name, address })
    if (tooLong) return res.status(400).json({ message: `${tooLong} 의 길이가 너무 깁니다.` })
    const data = {}

    if (email !== undefined) {
        if (!String(email).trim()) return res.status(400).json({ message: "email 은 비울 수 없습니다." })
        data.email = String(email).trim()
    }
    if (password !== undefined) {
        if (!password) return res.status(400).json({ message: "password 는 비울 수 없습니다." })
        data.password = hashPassword(String(password))
    }
    if (phone !== undefined) {
        if (!String(phone).trim()) return res.status(400).json({ message: "phone 은 비울 수 없습니다." })
        data.phone = String(phone).trim()
    }
    if (name !== undefined) data.name = optional(name)
    if (address !== undefined) data.address = optional(address)
    if (age !== undefined) {
        data.age = optionalAge(age)
        if (Number.isNaN(data.age)) return res.status(400).json({ message: "age 는 0 이상의 정수여야 합니다." })
    }

    if (Object.keys(data).length === 0) return res.status(400).json({ message: "수정할 값이 없습니다." })

    // 대상이 없으면 Prisma 가 P2025 를 던지고 아래 에러 핸들러에서 404 처리
    const member = await prisma.member.update({ where: { id }, data, select: publicFields })
    res.json(member)
})

// 삭제 (D)
// DELETE http://localhost:10000/members/1
app.delete("/members/:id", requireLogin, async (req, res) => {
    const id = authorizeSelf(req, res)
    if (!id) return

    // 작성한 글은 남고 memberId 만 NULL 이 된다 (onDelete: SetNull)
    await prisma.member.delete({ where: { id } })
    clearAuthCookie(res)
    res.status(204).end()
})

// 공통 에러 처리 (Express 5 는 async 핸들러의 throw 를 자동으로 여기로 전달)
app.use((err, req, res, next) => {
    if (err.code === "P2002") return res.status(409).json({ message: "이미 사용 중인 email 입니다." })
    if (err.code === "P2025") return res.status(404).json({ message: "대상을 찾을 수 없습니다." })
    if (err.code === "P2003") return res.status(401).json({ message: "로그인이 필요합니다." })
    if (err.code === "P2000") return res.status(400).json({ message: "입력값이 너무 깁니다." })
    if (err.type === "entity.parse.failed") return res.status(400).json({ message: "JSON 형식이 올바르지 않습니다." })

    console.error(err)
    res.status(500).json({ message: "서버 오류가 발생했습니다." })
})

const server = app.listen(port, () => {
    console.log("서버 실행")
})

// 종료 시 DB 연결 정리
process.on("SIGINT", async () => {
    server.close()
    await prisma.$disconnect()
    process.exit(0)
})
