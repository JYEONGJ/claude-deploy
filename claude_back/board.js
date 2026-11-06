import { Router } from "express"
import fs from "fs"
import { fileURLToPath } from "url"
import { getViewerId } from "./auth.js"

// 게시판: 목록/상세/작성/수정 화면은 서버에서 HTML 을 완성해 응답(SSR), 저장/수정/삭제는 JSON API
// GET /board, /board/:id, /board/new, /board/:id/edit (모두 로그인 후 사용)
// POST /posts, PUT /posts/:id, DELETE /posts/:id

const PER_PAGE = 10
const SITE_NAME = "게시판"
const TITLE_MAX = 200
const CONTENT_MAX = 5000

const readView = (name) => fs.readFileSync(fileURLToPath(new URL(`./views/${name}.html`, import.meta.url)), "utf8")
const templates = {
    layout: readView("layout"),
    list: readView("board"),
    view: readView("board-view"),
    form: readView("board-form"),
}

const escapeHtml = (v) =>
    String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c])

// {{name}} 은 이스케이프, {{{name}}} 은 그대로 삽입
const render = (tpl, vars) =>
    tpl.replace(/\{\{\{(\w+)\}\}\}|\{\{(\w+)\}\}/g, (_, raw, esc) =>
        raw ? String(vars[raw] ?? "") : escapeHtml(vars[esc] ?? ""),
    )

const pad = (n) => String(n).padStart(2, "0")
const formatDate = (d) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
const flat = (s) => s.replace(/\s+/g, " ").trim()

// <title> 은 "페이지명 | 사이트명" 형식, 60자 이내
const makeTitle = (name) => {
    const suffix = ` | ${SITE_NAME}`
    const max = 60 - suffix.length
    return (name.length > max ? `${name.slice(0, max - 1)}…` : name) + suffix
}

// description 은 120~155자
const makeDescription = (text) => {
    let d = flat(text)
    const filler = " 게시판에서 다양한 주제의 이야기와 질문, 꿀팁을 모아 보고 직접 글을 남기며 다른 회원들과 의견을 나눠 보세요. 최신 글부터 확인할 수 있습니다."
    if (d.length < 120) d += filler
    return d.length > 155 ? `${d.slice(0, 152)}...` : d
}

// JSON-LD 를 <script> 안에 안전하게 넣기 위해 "<" 이스케이프
const jsonLd = (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`

const parseId = (value) => {
    const id = Number(value)
    return Number.isInteger(id) && id > 0 ? id : null
}

// 저장 요청 검증: 제목, 내용은 필수
const parsePost = (body) => {
    const title = String(body?.title ?? "").trim()
    const content = String(body?.content ?? "").trim()
    if (!title) return { error: "제목을 입력해 주세요." }
    if (title.length > TITLE_MAX) return { error: `제목은 ${TITLE_MAX}자 이내로 입력해 주세요.` }
    if (!content) return { error: "내용을 입력해 주세요." }
    if (content.length > CONTENT_MAX) return { error: `내용은 ${CONTENT_MAX}자 이내로 입력해 주세요.` }
    return { data: { title, content, isPublic: body?.isPublic !== false } }
}

// 작성자 표시: 이메일 앞 3글자만 보여 주고 나머지는 가린다 (탈퇴한 회원/더미 글은 익명)
const maskAuthor = (member) => (member ? `${member.email.split("@")[0].slice(0, 3)}*****` : "익명")
const authorSelect = { select: { email: true } }

const loginUrl = (next) => `/login.html?next=${encodeURIComponent(next)}`

export const createBoardRouter = (prisma, { siteUrl }) => {
    const router = Router()

    // 게시판 화면은 로그인한 회원만 사용: 비로그인이면 로그인 후 원래 주소로 돌아오도록 이동
    router.use("/board", (req, res, next) => (getViewerId(req) ? next() : res.redirect(302, loginUrl(req.originalUrl))))

    // 로그인한 회원이 볼 수 있는 글: 공개 글 + 본인이 쓴 비공개 글
    const visibleTo = (viewer) => ({ OR: [{ isPublic: true }, ...(viewer ? [{ memberId: viewer }] : [])] })

    const sendPage = (res, { title, description, canonical, robots = "noindex, nofollow", ogType = "website", jsonld = "", body, script = "", status = 200 }) =>
        res.status(status).type("html").send(
            render(templates.layout, { title, description, canonical, robots, ogType, jsonld, body, script }),
        )

    const notFound = (res) =>
        sendPage(res, {
            title: makeTitle("게시글을 찾을 수 없어요"),
            description: makeDescription("요청하신 게시글이 없거나 비공개 상태입니다."),
            canonical: `${siteUrl}/board`,
            robots: "noindex, nofollow",
            body: '<section class="bd-wrap bd-narrow"><div class="bd-empty"><p class="bd-empty-title">게시글을 찾을 수 없어요</p><p>삭제되었거나 비공개 상태일 수 있어요.</p><a class="bd-btn bd-btn-line" href="/board">목록으로</a></div></section>',
            status: 404,
        })

    const forbidden = (res) =>
        sendPage(res, {
            title: makeTitle("접근 권한이 없어요"),
            description: makeDescription("작성자만 게시글을 수정하거나 삭제할 수 있습니다."),
            canonical: `${siteUrl}/board`,
            robots: "noindex, nofollow",
            body: '<section class="bd-wrap bd-narrow"><div class="bd-empty"><p class="bd-empty-title">작성자만 수정할 수 있어요</p><p>내가 쓴 글이 맞는지 확인해 주세요.</p><a class="bd-btn bd-btn-line" href="/board">목록으로</a></div></section>',
            status: 403,
        })

    // 목록 (검색: ?q=&field=all|title|content, 페이지: ?page=)
    router.get("/board", async (req, res) => {
        const q = String(req.query.q ?? "").trim().slice(0, 100)
        const field = ["title", "content"].includes(req.query.field) ? req.query.field : "all"
        const requested = Math.max(1, parseInt(req.query.page, 10) || 1)

        const where = { isPublic: true }
        if (q) {
            const byTitle = { title: { contains: q } }
            const byContent = { content: { contains: q } }
            where.OR = field === "title" ? [byTitle] : field === "content" ? [byContent] : [byTitle, byContent]
        }

        const total = await prisma.post.count({ where })
        const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
        const query = (p) => {
            const params = new URLSearchParams()
            if (q) {
                params.set("q", q)
                params.set("field", field)
            }
            if (p > 1) params.set("page", p)
            const s = params.toString()
            return `/board${s ? `?${s}` : ""}`
        }

        // 없는 페이지는 마지막 페이지로 301
        if (requested > totalPages) return res.redirect(301, query(totalPages))
        const page = requested

        const posts = await prisma.post.findMany({
            where,
            orderBy: { id: "desc" },
            skip: (page - 1) * PER_PAGE,
            take: PER_PAGE,
            include: { member: authorSelect },
        })

        const items = posts.length
            ? `<div class="bd-grid">${posts
                  .map(
                      (p) => `<article class="bd-card">
    <h2 class="bd-card-title"><a href="/board/${p.id}">${escapeHtml(p.title)}</a></h2>
    <p class="bd-card-body">${escapeHtml(flat(p.content).slice(0, 220))}</p>
    <p class="bd-card-meta"><span>${escapeHtml(maskAuthor(p.member))}</span><time datetime="${p.createdAt.toISOString()}">${formatDate(p.createdAt)}</time></p>
</article>`,
                  )
                  .join("\n")}</div>`
            : `<div class="bd-empty"><p class="bd-empty-title">검색 결과가 없어요</p><p>다른 검색어로 다시 찾아보세요.</p><a class="bd-btn bd-btn-line" href="/board">전체 글 보기</a></div>`

        // 페이지 번호: 현재 페이지 기준 최대 5개
        const end = Math.min(totalPages, Math.max(1, page - 2) + 4)
        const start = Math.max(1, end - 4)
        const link = (p, label, aria, disabled) =>
            disabled
                ? `<span class="bd-pg bd-pg-off" aria-label="${aria}">${label}</span>`
                : `<a class="bd-pg" href="${escapeHtml(query(p))}" aria-label="${aria}">${label}</a>`
        let pagination = ""
        if (total > 0) {
            const nums = []
            for (let p = start; p <= end; p++) {
                nums.push(
                    p === page
                        ? `<span class="bd-pg bd-pg-on" aria-current="page">${p}</span>`
                        : `<a class="bd-pg" href="${escapeHtml(query(p))}">${p}</a>`,
                )
            }
            pagination = `<nav class="bd-pager" aria-label="페이지 이동">${link(1, "«", "처음", page === 1)}${link(page - 1, "‹", "이전", page === 1)}${nums.join("")}${link(page + 1, "›", "다음", page === totalPages)}${link(totalPages, "»", "마지막", page === totalPages)}</nav>`
        }

        const searching = Boolean(q)
        const fieldName = { all: "제목+내용", title: "제목", content: "내용" }[field]
        const baseDesc = "게시판에서 여행, 맛집, 운동, 독서, 개발 등 다양한 주제로 회원들이 공유한 이야기와 질문, 꿀팁을 최신순으로 모아 보고 직접 글을 남겨 보세요."
        sendPage(res, {
            title: makeTitle(searching ? `“${q.slice(0, 20)}” 검색 결과` : page > 1 ? `글 목록 ${page}페이지` : "글 목록"),
            description: makeDescription(
                searching
                    ? `게시판에서 ${fieldName} “${q.slice(0, 30)}” 검색 결과 ${total}건을 최신순으로 확인해 보세요.`
                    : page > 1 ? `${page}페이지 · ${baseDesc}` : baseDesc,
            ),
            canonical: `${siteUrl}${query(page)}`,
            body: render(templates.list, {
                total,
                searchLabel: searching ? ` (${fieldName} “${q}” 검색)` : "",
                q,
                selAll: field === "all" ? " selected" : "",
                selTitle: field === "title" ? " selected" : "",
                selContent: field === "content" ? " selected" : "",
                items,
                pagination,
            }),
        })
    })

    // 작성 화면 (/board/:id 보다 먼저 등록)
    router.get("/board/new", (req, res) => {
        sendPage(res, {
            title: makeTitle("글 작성"),
            description: makeDescription("게시판에 새 글을 작성하는 화면입니다. 제목과 내용을 입력하고 공개 여부를 선택해 등록하세요."),
            canonical: `${siteUrl}/board/new`,
            robots: "noindex, nofollow",
            body: render(templates.form, { heading: "글 작성", id: "", title: "", content: "", checked: " checked", cancelHref: "/board", submitLabel: "등록하기" }),
            script: '<script src="/board-client.js"></script>',
        })
    })

    // 상세
    router.get("/board/:id", async (req, res) => {
        const id = parseId(req.params.id)
        const viewer = getViewerId(req)
        const post = id && (await prisma.post.findFirst({ where: { id, ...visibleTo(viewer) }, include: { member: authorSelect } }))
        if (!post) return notFound(res)

        const canonical = `${siteUrl}/board/${post.id}`
        const description = makeDescription(post.content)
        const isOwner = viewer !== null && post.memberId === viewer
        const ownerActions = isOwner
            ? `<div class="bd-actions-right"><button type="button" class="bd-btn bd-btn-line bd-danger" id="deleteBtn" data-id="${post.id}">삭제</button><a class="bd-btn bd-btn-primary" href="/board/${post.id}/edit">수정</a></div>`
            : ""
        sendPage(res, {
            title: makeTitle(post.title),
            description,
            canonical,
            ogType: "article",
            jsonld: jsonLd({
                "@context": "https://schema.org",
                "@type": "Article",
                headline: post.title.slice(0, 110),
                description,
                datePublished: post.createdAt.toISOString(),
                author: { "@type": "Person", name: maskAuthor(post.member) },
                mainEntityOfPage: canonical,
            }),
            body: render(templates.view, {
                id: post.id,
                title: post.title,
                content: post.content,
                author: maskAuthor(post.member),
                badge: post.isPublic ? "" : '<span class="bd-badge">비공개</span>',
                iso: post.createdAt.toISOString(),
                date: formatDate(post.createdAt),
                ownerActions,
            }),
            script: '<script src="/board-client.js"></script>',
        })
    })

    // 수정 화면
    router.get("/board/:id/edit", async (req, res) => {
        const id = parseId(req.params.id)
        const viewer = getViewerId(req)
        const post = id && (await prisma.post.findFirst({ where: { id, ...visibleTo(viewer) } }))
        if (!post) return notFound(res)
        if (post.memberId !== viewer) return forbidden(res)

        sendPage(res, {
            title: makeTitle("글 수정"),
            description: makeDescription("게시판에 작성한 글의 제목, 내용, 공개 여부를 수정하는 화면입니다. 수정을 마치면 수정 완료 버튼을 눌러 주세요."),
            canonical: `${siteUrl}/board/${post.id}/edit`,
            robots: "noindex, nofollow",
            body: render(templates.form, {
                heading: "글 수정",
                id: post.id,
                title: post.title,
                content: post.content,
                checked: post.isPublic ? " checked" : "",
                cancelHref: `/board/${post.id}`,
                submitLabel: "수정 완료",
            }),
            script: '<script src="/board-client.js"></script>',
        })
    })

    // 목록 (R) - 기본은 공개 글만, mine=1 이면 로그인한 본인 글(비공개 포함)
    // GET http://localhost:10000/posts?page=1&size=10&q=검색어&mine=1
    router.get("/posts", async (req, res) => {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1)
        const size = Math.min(100, Math.max(1, parseInt(req.query.size, 10) || PER_PAGE))
        const q = String(req.query.q ?? "").trim()
        const viewer = getViewerId(req)

        let where
        if (req.query.mine === "1") {
            if (!viewer) return res.status(401).json({ message: "로그인이 필요합니다." })
            where = { memberId: viewer }
        } else {
            where = { isPublic: true }
        }
        if (q) where = { AND: [where, { title: { contains: q } }] }

        const [total, items] = await Promise.all([
            prisma.post.count({ where }),
            prisma.post.findMany({
                where,
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                skip: (page - 1) * size,
                take: size,
                include: { member: { select: { id: true, name: true } } },
            }),
        ])
        res.json({ items, total, page, size })
    })

    // 단건 (R) - 비공개 글은 작성자만, 그 외에는 404 로 존재를 숨긴다
    // GET http://localhost:10000/posts/1
    router.get("/posts/:id", async (req, res) => {
        const id = parseId(req.params.id)
        if (!id) return res.status(400).json({ message: "잘못된 id 입니다." })
        const post = await prisma.post.findFirst({
            where: { id, ...visibleTo(getViewerId(req)) },
            include: { member: { select: { id: true, name: true } } },
        })
        if (!post) return res.status(404).json({ message: "게시글을 찾을 수 없습니다." })
        res.json(post)
    })

    // 추가 (C)
    // POST http://localhost:10000/posts  { title, content, isPublic? }
    router.post("/posts", async (req, res) => {
        const viewer = getViewerId(req)
        if (!viewer) return res.status(401).json({ message: "로그인이 필요합니다." })
        const { data, error } = parsePost(req.body)
        if (error) return res.status(400).json({ message: error })
        try {
            res.status(201).json(await prisma.post.create({ data: { ...data, memberId: viewer } }))
        } catch (err) {
            // 탈퇴한 회원의 토큰: 외래키 위반
            if (err.code === "P2003") return res.status(401).json({ message: "로그인이 필요합니다." })
            throw err
        }
    })

    // 수정/삭제 공통: 로그인 확인 → 글 존재 확인 → 작성자 확인 (실패 시 응답하고 null)
    const authorizeOwner = async (req, res) => {
        const viewer = getViewerId(req)
        if (!viewer) return void res.status(401).json({ message: "로그인이 필요합니다." })
        const id = parseId(req.params.id)
        if (!id) return void res.status(400).json({ message: "잘못된 id 입니다." })
        const post = await prisma.post.findUnique({ where: { id }, select: { id: true, memberId: true } })
        if (!post) return void res.status(404).json({ message: "게시글을 찾을 수 없습니다." })
        if (post.memberId !== viewer) return void res.status(403).json({ message: "작성자만 수정/삭제할 수 있습니다." })
        return id
    }

    // 수정 (U)
    // PUT http://localhost:10000/posts/1  { title, content, isPublic? }
    router.put("/posts/:id", async (req, res) => {
        const id = await authorizeOwner(req, res)
        if (!id) return
        const { data, error } = parsePost(req.body)
        if (error) return res.status(400).json({ message: error })
        try {
            res.json(await prisma.post.update({ where: { id }, data }))
        } catch (err) {
            if (err.code === "P2025") return res.status(404).json({ message: "게시글을 찾을 수 없습니다." })
            throw err
        }
    })

    // 삭제 (D)
    // DELETE http://localhost:10000/posts/1
    router.delete("/posts/:id", async (req, res) => {
        const id = await authorizeOwner(req, res)
        if (!id) return
        try {
            await prisma.post.delete({ where: { id } })
            res.status(204).end()
        } catch (err) {
            if (err.code === "P2025") return res.status(404).json({ message: "게시글을 찾을 수 없습니다." })
            throw err
        }
    })

    return router
}
