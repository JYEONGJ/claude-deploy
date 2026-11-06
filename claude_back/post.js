import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const topics = ["여행", "맛집", "운동", "독서", "영화", "개발", "공부", "취미", "일상", "재테크"]
const titleForms = [
    (t) => `오늘의 ${t} 이야기`,
    (t) => `${t} 입문자를 위한 가이드`,
    (t) => `${t} 관련 질문이 있습니다`,
    (t) => `요즘 푹 빠진 ${t} 후기`,
    (t) => `${t} 꿀팁 공유합니다`,
    (t) => `이번 주 ${t} 기록`,
]
const sentences = [
    "오늘은 오랜만에 시간을 내서 직접 해 봤습니다.",
    "처음에는 어려웠지만 하다 보니 금방 익숙해졌어요.",
    "주변 사람들에게 추천받아 시작하게 되었습니다.",
    "생각보다 준비할 것이 많아서 놀랐습니다.",
    "결과적으로 만족스러운 경험이었습니다.",
    "다음에는 조금 더 다양한 방법을 시도해 볼 생각입니다.",
    "비슷한 경험이 있으신 분들의 의견을 듣고 싶습니다.",
    "예산과 시간을 미리 정해 두면 훨씬 수월합니다.",
    "꾸준히 하는 것이 가장 중요하다는 걸 다시 느꼈습니다.",
    "도움이 되셨다면 댓글로 의견 남겨 주세요.",
]

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

// 최근 1년 안의 임의 시각
const randomDate = () => new Date(Date.now() - randInt(0, 365 * 24 * 60 * 60 * 1000))

// 작성자가 없는(member_id 가 NULL) 기존 글에 랜덤 회원을 작성자로 지정
const fillAuthors = async (memberIds) => {
    const posts = await prisma.post.findMany({ where: { memberId: null }, select: { id: true } })
    const byMember = new Map()
    for (const { id } of posts) {
        const memberId = pick(memberIds)
        byMember.set(memberId, [...(byMember.get(memberId) ?? []), id])
    }
    for (const [memberId, ids] of byMember) {
        await prisma.post.updateMany({ where: { id: { in: ids } }, data: { memberId } })
    }
    return posts.length
}

// node post.js              작성자 없는 기존 글을 채우고, 더미 게시글 1000개를 tbl_post 에 추가
// node post.js --fill-only  기존 글의 작성자만 채움 (새 글은 추가하지 않음)
// 고유값이 없어서 추가 모드는 실행할 때마다 1000개씩 더 쌓인다
;(async () => {
    try {
        const members = await prisma.member.findMany({ select: { id: true } })
        if (members.length === 0) throw new Error("회원이 없습니다. 먼저 node member.js 로 회원을 추가하세요.")
        const memberIds = members.map((m) => m.id)

        const filled = await fillAuthors(memberIds)
        console.log(`작성자 지정 ${filled}개`)
        if (process.argv.includes("--fill-only")) return

        const data = Array.from({ length: 1000 }, (_, i) => ({
            title: `${pick(titleForms)(pick(topics))} #${i + 1}`,
            content: Array.from({ length: randInt(3, 8) }, () => pick(sentences)).join(" "),
            createdAt: randomDate(),
            isPublic: Math.random() < 0.8,
            memberId: pick(memberIds),
        }))

        const { count } = await prisma.post.createMany({ data })
        console.log(`더미 게시글 ${count}개 추가 완료`)
    } catch (err) {
        console.error(err)
        process.exitCode = 1
    } finally {
        await prisma.$disconnect()
    }
})()
