// 샘플 인형 데이터 시드 (ROADMAP_01.md 3.2절: 3~5건, 재고 0인 건 1건 포함)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const dolls = [
  { name: '곰돌이 인형', price: 15000, stock: 10 },
  { name: '토끼 인형', price: 12000, stock: 5 },
  { name: '고양이 인형', price: 18000, stock: 3 },
  { name: '펭귄 인형', price: 9900, stock: 0 }, // 품절 화면 확인용
  { name: '강아지 인형', price: 21000, stock: 7 },
];

async function main() {
  await prisma.doll.deleteMany();
  const result = await prisma.doll.createMany({ data: dolls });
  console.log(`Doll 샘플 데이터 ${result.count}건 입력 완료`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
