import crypto from "crypto"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// 비밀번호는 평문 저장하지 않고 scrypt 해시("salt:hash")로 저장 (c_back.js 와 동일)
const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString("hex")
    const hash = crypto.scryptSync(password, salt, 64).toString("hex")
    return `${salt}:${hash}`
}

const lastNames = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"]
const firstNames = ["민준", "서연", "지호", "하윤", "도윤", "서준", "지우", "예은", "현우", "수아"]
const addresses = ["서울시 강남구", "서울시 마포구", "부산시 해운대구", "대구시 수성구", "인천시 연수구", "광주시 북구", "대전시 유성구", "수원시 팔달구"]

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const digits = (n) => String(randInt(0, 10 ** n - 1)).padStart(n, "0")

// node member.js 로 실행하면 더미 회원 100명을 tbl_member 에 추가
// 재실행해도 email 이 겹치면 건너뛴다 (dummy001@example.com ~ dummy100@example.com)
;(async () => {
    try {
        const data = Array.from({ length: 100 }, (_, i) => ({
            email: `dummy${String(i + 1).padStart(3, "0")}@example.com`,
            password: hashPassword("1234"),
            name: pick(lastNames) + pick(firstNames),
            age: randInt(18, 70),
            address: pick(addresses),
            phone: `010-${digits(4)}-${digits(4)}`,
        }))

        const { count } = await prisma.member.createMany({ data, skipDuplicates: true })
        console.log(`더미 회원 ${count}명 추가 완료 (중복 ${data.length - count}명 건너뜀)`)
    } catch (err) {
        console.error(err)
        process.exitCode = 1
    } finally {
        await prisma.$disconnect()
    }
})()
