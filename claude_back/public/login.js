// 로그인: POST /login 으로 확인한 뒤 memberId 를 저장하고 마이페이지로 이동
const API = "http://localhost:10000"

const $ = (id) => document.getElementById(id)

const showError = (text) => {
    $("loginError").textContent = text
    $("loginError").hidden = !text
}

$("togglePw").addEventListener("click", () => {
    const pw = $("l-pw")
    pw.type = pw.type === "password" ? "text" : "password"
})

$("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault()
    const email = $("l-email").value.trim()
    const password = $("l-pw").value
    if (!email || !password) return showError("이메일과 비밀번호를 입력해 주세요.")

    try {
        const res = await fetch(`${API}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) return showError(data.message ?? "로그인에 실패했습니다.")

        localStorage.setItem("memberId", data.id)
        // ?next=/board/new 처럼 돌아갈 곳이 있으면 그곳으로 (같은 사이트 경로만 허용)
        const next = new URLSearchParams(location.search).get("next")
        location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "mypage.html"
    } catch {
        showError("서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해 주세요.")
    }
})
