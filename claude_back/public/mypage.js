// 마이페이지: c_back.js 의 /members/:id API 로 조회·수정·탈퇴
// 대상 회원 id 는 ?id=1 또는 localStorage 의 memberId 에서 가져온다
const API = "http://localhost:10000/members"

const $ = (id) => document.getElementById(id)
const params = new URLSearchParams(location.search)
const memberId = params.get("id") || localStorage.getItem("memberId")

let member = null

const dash = (v) => (v === null || v === undefined || v === "" ? "—" : String(v))

const show = (el, visible) => { el.hidden = !visible }

const setMessage = (text) => {
    $("message").textContent = text
    show($("message"), Boolean(text))
}

const setNotice = (text) => {
    $("notice").textContent = text
    show($("notice"), Boolean(text))
}

// 서버의 로그인 쿠키를 지우고 로그인 화면으로
async function logout() {
    await fetch("/logout", { method: "POST" }).catch(() => {})
    localStorage.removeItem("memberId")
    location.href = "login.html"
}

// 서버 에러 메시지 추출 ({ message } 형식)
const errorMessage = async (res) => {
    try {
        return (await res.json()).message
    } catch {
        return "요청에 실패했습니다."
    }
}

// 조회 화면: 카드 6개
const renderView = () => {
    const rows = [
        ["email", "이메일 주소(아이디)", dash(member.email)],
        ["name", "이름", dash(member.name)],
        ["phone", "휴대폰 번호", dash(member.phone)],
        ["age", "나이", member.age == null ? "—" : `${member.age}세`],
        ["address", "주소", dash(member.address)],
        ["password", "비밀번호", "••••••••"],
    ]
    const grid = $("infoGrid")
    grid.replaceChildren(...rows.map(([key, label, value]) => {
        const card = document.createElement("div")
        card.className = "card blueprint"
        card.innerHTML = '<i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>'
        for (const [cls, text] of [["card-kicker", key], ["card-label", label], ["card-title", value]]) {
            const span = document.createElement("span")
            span.className = cls
            span.textContent = text
            card.append(span)
        }
        return card
    }))
    $("memberTag").textContent = `ID #${member.id}`
}

const setMode = (mode) => {
    const editing = mode === "edit"
    $("kicker").textContent = editing ? "Edit profile" : "My page"
    $("title").textContent = editing ? "회원 정보 수정" : "마이페이지"
    document.title = `${editing ? "회원 정보 수정" : "마이페이지"} | Member`
    show($("viewSection"), !editing)
    show($("editSection"), editing)
    show($("formError"), false)
}

const fillForm = () => {
    $("f-email").value = member.email
    $("f-pw").value = ""
    $("f-name").value = member.name ?? ""
    $("f-age").value = member.age ?? ""
    $("f-phone").value = member.phone
    $("f-addr").value = member.address ?? ""
}

const load = async () => {
    if (!memberId) {
        location.replace("login.html")
        return
    }
    try {
        const res = await fetch(`${API}/${encodeURIComponent(memberId)}`)
        if (!res.ok) {
            setMessage(await errorMessage(res))
            return
        }
        member = await res.json()
    } catch {
        setMessage("서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해 주세요.")
        return
    }
    setMessage("")
    show($("memberTag"), true)
    renderView()
    setMode("view")
}

$("editBtn").addEventListener("click", () => {
    setNotice("")
    fillForm()
    setMode("edit")
})

$("cancelBtn").addEventListener("click", () => setMode("view"))

$("editForm").addEventListener("submit", async (e) => {
    e.preventDefault()
    const formError = $("formError")
    const showError = (text) => {
        formError.textContent = text
        show(formError, true)
    }

    const phone = $("f-phone").value.trim()
    if (!phone) return showError("필수 항목(휴대폰 번호)을 입력해 주세요.")

    // 서버는 전달된 필드만 변경한다. 비밀번호는 입력했을 때만 보낸다
    const body = {
        name: $("f-name").value,
        age: $("f-age").value,
        phone,
        address: $("f-addr").value,
    }
    if ($("f-pw").value) body.password = $("f-pw").value

    try {
        const res = await fetch(`${API}/${member.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        })
        if (!res.ok) return showError(await errorMessage(res))
        member = await res.json()
    } catch {
        return showError("서버에 연결할 수 없습니다.")
    }
    renderView()
    setMode("view")
    setNotice("회원 정보가 수정되었습니다.")
})

// 탈퇴
$("deleteBtn").addEventListener("click", () => {
    $("deleteBody").textContent = `탈퇴하면 ${member.email} 계정의 모든 정보가 삭제되며 복구할 수 없습니다. 계속하시겠습니까?`
    show($("deleteDialog"), true)
})
$("deleteCancel").addEventListener("click", () => show($("deleteDialog"), false))
$("deleteDialog").addEventListener("click", (e) => {
    if (e.target === $("deleteDialog")) show($("deleteDialog"), false)
})
$("deleteConfirm").addEventListener("click", async () => {
    try {
        const res = await fetch(`${API}/${member.id}`, { method: "DELETE" })
        if (!res.ok) {
            show($("deleteDialog"), false)
            setNotice(await errorMessage(res))
            return
        }
    } catch {
        show($("deleteDialog"), false)
        setNotice("서버에 연결할 수 없습니다.")
        return
    }
    await logout()
})

$("logoutBtn").addEventListener("click", logout)

load()
