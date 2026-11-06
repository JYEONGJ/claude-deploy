// 게시판 화면 동작: 작성/수정 저장, 삭제 확인 (목록/상세 본문은 서버에서 이미 렌더링됨)
const $ = (id) => document.getElementById(id)

const errorMessage = async (res) => {
    try {
        return (await res.json()).message
    } catch {
        return "요청에 실패했습니다."
    }
}

// 로그인이 풀렸으면 로그인 후 현재 페이지로 돌아오도록 이동
const toLogin = () => { location.href = `/login.html?next=${encodeURIComponent(location.pathname)}` }

// 작성/수정
const form = $("postForm")
if (form) {
    const id = form.dataset.id
    const showError = (text) => {
        $("formError").textContent = text
        $("formError").hidden = !text
    }
    const counter = () => { $("contentLen").textContent = `${$("f-content").value.length} / 5000` }
    $("f-content").addEventListener("input", counter)
    counter()

    form.addEventListener("submit", async (e) => {
        e.preventDefault()
        const title = $("f-title").value.trim()
        const content = $("f-content").value.trim()
        if (!title) return showError("제목을 입력해 주세요.")
        if (!content) return showError("내용을 입력해 주세요.")

        try {
            const res = await fetch(id ? `/posts/${id}` : "/posts", {
                method: id ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content, isPublic: $("f-public").checked }),
            })
            if (res.status === 401) return toLogin()
            if (!res.ok) return showError(await errorMessage(res))
            const post = await res.json()
            location.href = `/board/${post.id}`
        } catch {
            showError("서버에 연결할 수 없습니다.")
        }
    })
}

// 삭제
const deleteBtn = $("deleteBtn")
if (deleteBtn) {
    const dialog = $("deleteDialog")
    deleteBtn.addEventListener("click", () => { dialog.hidden = false })
    $("deleteCancel").addEventListener("click", () => { dialog.hidden = true })
    dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.hidden = true })
    $("deleteConfirm").addEventListener("click", async () => {
        try {
            const res = await fetch(`/posts/${deleteBtn.dataset.id}`, { method: "DELETE" })
            if (res.status === 401) return toLogin()
            if (!res.ok) throw new Error(await errorMessage(res))
            location.href = "/board"
        } catch (err) {
            dialog.hidden = true
            alert(err.message || "삭제하지 못했습니다.")
        }
    })
}
