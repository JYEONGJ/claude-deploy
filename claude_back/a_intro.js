import express from "express"
import path from "path"

const app = express()
// http://localhost:10000
const port = 10000

// post 방식(form 전송) 데이터를 req.body 로 파싱
app.use(express.urlencoded({ extended: true }))

app.listen(port, () => {
    console.log("서버 실행")
})

app.get("/", (_, res) => {
    res.set({"Content-Type": "text/html; charset=utf-8"})
    res.end("<h1>Hello, World!😎</h1>")
})

// http://localhost:10000/intro
app.get("/intro", (_, res) => {
    res.sendFile(path.join(import.meta.dirname, "a_intro.html"))
})

// get 방식: 입력값은 req.query 로 전달됨
app.get("/join", (req, res) => {
    const { email, password, name } = req.query
    console.log({ email, password, name })
    res.set({"Content-Type": "text/html; charset=utf-8"})
    res.end("<h1>전송 완료</h1>")
})

// post 방식: 입력값은 req.body 로 전달됨
app.post("/join", (req, res) => {
    const { email, password, name } = req.body // 페이로드
    console.log({ email, password, name })
    res.set({"Content-Type": "text/html; charset=utf-8"})
    res.end("<h1>전송 완료</h1>")
})

