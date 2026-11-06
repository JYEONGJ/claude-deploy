import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

app.use(express.json());
app.use(express.static(publicDir));

const ok = (res, status, data) => res.status(status).json({ data });
const fail = (res, status, message) => res.status(status).json({ error: message });

const MAX_INT = 2147483647;
const parseId = (raw) => {
  const n = Number(raw);
  return /^\d+$/.test(raw) && n <= MAX_INT ? n : null;
};
const isNonNegInt = (v) => Number.isInteger(v) && v >= 0;

// 인형 입력 검증: 성공 시 { data }, 실패 시 { error }
function parseDollInput(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length < 1 || name.length > 100) return { error: 'name은 공백 제외 1~100자여야 합니다.' };
  if (!isNonNegInt(body.price)) return { error: 'price는 0 이상의 정수여야 합니다.' };
  if (!isNonNegInt(body.stock)) return { error: 'stock은 0 이상의 정수여야 합니다.' };
  return { data: { name, price: body.price, stock: body.stock } };
}

const ID_ERROR = 'id가 올바르지 않습니다.';
const NOT_FOUND = '인형을 찾을 수 없습니다.';

// A-01 목록
app.get('/api/dolls', async (req, res) => {
  ok(res, 200, await prisma.doll.findMany({ orderBy: { id: 'asc' } }));
});

// A-02 상세
app.get('/api/dolls/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return fail(res, 400, ID_ERROR);
  const doll = await prisma.doll.findUnique({ where: { id } });
  if (!doll) return fail(res, 404, NOT_FOUND);
  ok(res, 200, doll);
});

// A-03 등록
app.post('/api/dolls', async (req, res) => {
  const input = parseDollInput(req.body ?? {});
  if (input.error) return fail(res, 400, input.error);
  ok(res, 201, await prisma.doll.create({ data: input.data }));
});

// A-04 수정 (전체 필드)
app.put('/api/dolls/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return fail(res, 400, ID_ERROR);
  const input = parseDollInput(req.body ?? {});
  if (input.error) return fail(res, 400, input.error);
  try {
    ok(res, 200, await prisma.doll.update({ where: { id }, data: input.data }));
  } catch (e) {
    if (e.code === 'P2025') return fail(res, 404, NOT_FOUND);
    throw e;
  }
});

// A-05 삭제 (물리 삭제, 응답은 삭제된 데이터)
app.delete('/api/dolls/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return fail(res, 400, ID_ERROR);
  try {
    ok(res, 200, await prisma.doll.delete({ where: { id } }));
  } catch (e) {
    if (e.code === 'P2025') return fail(res, 404, NOT_FOUND);
    throw e;
  }
});

// A-06 구매 (재고 원자적 차감)
app.post('/api/dolls/:id/purchase', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return fail(res, 400, ID_ERROR);
  const quantity = req.body?.quantity;
  if (!Number.isInteger(quantity) || quantity < 1) {
    return fail(res, 400, 'quantity는 1 이상의 정수여야 합니다.');
  }
  const { count } = await prisma.doll.updateMany({
    where: { id, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });
  if (count === 0) {
    const exists = await prisma.doll.findUnique({ where: { id } });
    return exists ? fail(res, 409, '재고가 부족합니다.') : fail(res, 404, NOT_FOUND);
  }
  ok(res, 200, await prisma.doll.findUnique({ where: { id } }));
});

// 정의되지 않은 API 경로
app.use('/api', (req, res) => fail(res, 404, '존재하지 않는 API입니다.'));

// 공통 오류 처리 (JSON 파싱 오류 등)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return fail(res, 400, '잘못된 JSON 형식입니다.');
  const status = err.status ?? 500;
  if (status >= 500) console.error(err);
  fail(res, status, status >= 500 ? '서버 오류가 발생했습니다.' : err.message);
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
