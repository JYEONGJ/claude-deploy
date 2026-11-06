import express from "express"
import fs from "fs"
import path from "path"

const app = express()
// http://localhost:10000
const port = 10000

// post 방식(form 전송) 데이터를 req.body 로 파싱
app.use(express.urlencoded({ extended: true }))

app.listen(port, () => {
    console.log("서버 실행")
})

// 임시 데이터 (DB 대신 메모리에 보관, 서버 재시작 시 초기화)
let todos = [
    { id: 1, text: "우유 사기", done: false },
    { id: 2, text: "운동 30분 하기", done: true },
]
let nextId = 3

const template = fs.readFileSync(path.join(import.meta.dirname, "b_todo.html"), "utf-8")

const escapeHtml = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

// 목록 HTML 을 서버에서 렌더링 (editId 가 있으면 해당 항목을 수정 폼으로 표시)
const renderList = (editId) => {
    if (todos.length === 0) return `<li class="empty">등록된 할일이 없습니다.</li>`
    return todos.map((t) => {
        if (t.id === editId) {
            return `<li class="item">
                <form class="edit" action="/todo/${t.id}/edit" method="post">
                    <input type="text" name="text" value="${escapeHtml(t.text)}" required autofocus>
                    <button type="submit" class="primary">저장</button>
                    <a class="btn" href="/">취소</a>
                </form>
            </li>`
        }
        return `<li class="item">
            <form action="/todo/${t.id}/toggle" method="post" class="grow">
                <button type="submit" class="text${t.done ? " done" : ""}">${escapeHtml(t.text)}</button>
            </form>
            <a class="btn" href="/?edit=${t.id}">수정</a>
            <form action="/todo/${t.id}/delete" method="post">
                <button type="submit" class="btn danger">삭제</button>
            </form>
        </li>`
    }).join("")
}

// http://localhost:10000
app.get("/", (req, res) => {
    const editId = Number(req.query.edit) || null
    const remain = todos.filter((t) => !t.done).length
    res.set({"Content-Type": "text/html; charset=utf-8"})
    res.end(template.replace("{{LIST}}", renderList(editId)).replace("{{REMAIN}}", remain))
})

// 추가
app.post("/todo", (req, res) => {
    const text = (req.body.text ?? "").trim()
    console.log({ todo: text })
    if (text) todos.push({ id: nextId++, text, done: false })
    res.redirect(303, "/")
})

// 완료 토글
app.post("/todo/:id/toggle", (req, res) => {
    const t = todos.find((t) => t.id === Number(req.params.id))
    if (t) t.done = !t.done
    res.redirect(303, "/")
})

// 수정
app.post("/todo/:id/edit", (req, res) => {
    const t = todos.find((t) => t.id === Number(req.params.id))
    const text = (req.body.text ?? "").trim()
    if (t && text) t.text = text
    res.redirect(303, "/")
})

// 삭제
app.post("/todo/:id/delete", (req, res) => {
    todos = todos.filter((t) => t.id !== Number(req.params.id))
    res.redirect(303, "/")
})
