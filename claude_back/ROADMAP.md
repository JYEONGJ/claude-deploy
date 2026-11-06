# 신발 쇼핑몰 요구사항 분석 및 구현 로드맵

대상 경로: `C:\Users\DW-RT\Desktop\claude_jyj_1900\workspace\claude_back`
우선순위 표기: M(MVP 필수), S(권장), C(후순위)

## 0. 현재 프로젝트 파악

- 스택: Node.js 24, Express 5, Prisma 6.4.1, MySQL, ES Module. swagger-ui-express, cors 설치됨.
- 기존 파일: 루트에 `auth.js`, `board.js`, `member.js`, `post.js`, `c_back.js` (게시판/회원 실습 코드).
- 화면: `views/`(board.html, layout.html), `public/`(login.html, mypage.html, robots.txt). 서버 템플릿 엔진 없이 fetch로 그리는 CSR 방식이라 SEO 규칙에 위배되므로 쇼핑몰 공개 페이지에는 쓰지 않는다.
- DB 모델: `Member`, `Post` (테이블 접두어 `tbl_`).
- `.env`에 DATABASE_URL, AUTH_SECRET 존재. 커밋 금지 확인 필요.
- 빌드/테스트/린트 설정 없음.
- 방침: 기존 스택 유지, 쇼핑몰은 새 구조로 만들고 기존 게시판 코드는 `legacy/`로 분리.

## 1. 기능 요구사항

### 1.1 회원
- M: 이메일 가입/로그인/로그아웃(bcrypt/argon2), 마이페이지(내 정보, 배송지, 주문 내역)
- S: 비밀번호 찾기, 이메일 인증, 회원 탈퇴
- C: 소셜 로그인, 등급/포인트, 비회원 주문 조회

### 1.2 상품, 카테고리, 옵션
- M: 상품 목록/상세(이름, 브랜드, 가격, 설명, 다중 이미지, 판매 상태)
- M: 카테고리 계층(운동화/구두/샌들/부츠, 성별, 브랜드), 상품의 다중 카테고리
- M: 색상 x 사이즈 SKU, SKU별 재고/추가금, 사이즈는 mm(220~300) 가정
- S: 사이즈 가이드, 입고 알림, 품절 표시, 할인가/기간
- C: 신상/베스트, 연관 상품, 최근 본 상품

### 1.3 검색, 필터
- M: 키워드 검색, 카테고리/가격/사이즈/색상 필터, 정렬(신상/낮은가격/높은가격/인기), 페이지네이션
- S: 재고 있는 사이즈만 필터, 자동완성
- C: 외부 검색엔진, 인기 검색어

### 1.4 장바구니, 위시리스트
- M: SKU 단위 담기, 수량 변경, 삭제, 합계. 회원 장바구니는 DB 저장
- S: 비로그인 장바구니(쿠키/세션) 병합, 찜하기

### 1.5 주문, 결제
- M: 주문서(배송지, 메모, 결제 수단)
- M: 주문 상태 `결제대기 > 결제완료 > 상품준비 > 배송중 > 배송완료 > 구매확정`, 취소/환불 상태
- M: PG 연동(초기 모의 결제), 서버 금액 재검증, 트랜잭션 재고 차감, 이중결제 방지
- S: 쿠폰, 적립금, 부분 취소
- C: 간편결제, 정기배송

### 1.6 배송
- M: 배송비 정책(기본, 기준금액 이상 무료, 도서산간), 택배사, 운송장 입력
- S: 배송 조회 링크, 상태 알림
- C: 택배사 API 자동 추적

### 1.7 교환, 반품, 환불
- M: 교환/반품 신청, 사유, 관리자 승인과 처리 상태
- S: 환불 금액 자동 계산, 반품 배송비 정책

### 1.8 리뷰
- M: 구매 확정자만 별점/텍스트 리뷰
- S: 사진 첨부, 사이즈 후기(정사이즈/작음/큼) 집계
- C: 신고/숨김, 베스트 리뷰

### 1.9 관리자
- M: 관리자 로그인(역할 분리), 대시보드(주문 건수, 매출 요약)
- M: 상품/옵션/재고/카테고리 CRUD, 이미지 업로드
- M: 주문 조회, 상태 변경, 운송장 입력, 취소/환불 처리
- S: 회원 조회, 리뷰 관리, 공지/FAQ, 쿠폰, 재고 부족 알림
- C: 통계 리포트/CSV, 권한 세분화

### 1.10 기타
- M: 약관, 개인정보처리방침
- S: 1:1 문의, 공지

## 2. 비기능 요구사항

### 2.1 SEO (`.claude/rules/seo-rule.md` 반영)
렌더링
- 랜딩/목록/상세/카테고리는 SSR(서버 템플릿 EJS 등), 정적 페이지는 SSG 허용. 상품 목록/상세를 클라이언트 fetch로 그리는 방식 금지.
- 필터/정렬/페이지네이션은 쿼리스트링 기반 서버 렌더링, JS는 점진적 향상.
- 장바구니/주문/마이페이지/관리자는 CSR 허용하되 `noindex`.

메타데이터
- 모든 페이지에 고유 `<title>`(`페이지명 | 사이트명`, 60자 이내), `<meta name="description">`(120~155자).
- 상품/카테고리의 title, description, OG는 서버가 DB 값으로 채운다. 상품 상세는 `og:title/description/image`와 canonical 포함.
- 공통 레이아웃 partial로 메타 관리, 누락 시 테스트 실패 처리. 페이지 간 title/description 중복 금지. 필터 조합/페이지네이션은 canonical로 대표 URL 지정.

구조화 데이터, 마크업
- JSON-LD 서버 렌더링: 상품 `Product`(가격, 재고, `AggregateRating`), `BreadcrumbList`, 메인 `Organization`.
- `<h1>` 페이지당 1개, `main/nav/article/section/header/footer` 시맨틱 태그 사용.

URL, 크롤링
- kebab-case + 의미 있는 슬러그 (`/products/air-runner-white-123`, `/categories/sneakers`).
- 슬러그 변경/잘못된 슬러그는 301로 정식 URL 이동(JS 리다이렉트 금지, Express 미들웨어 또는 Nginx).
- `sitemap.xml` 자동 생성, `robots.txt`에서 `/admin`, `/cart`, `/checkout`, `/mypage`, 검색 결과 Disallow, 해당 페이지에 `<meta name="robots" content="noindex, nofollow">`.

이미지
- 모든 `<img>`에 `src`, 의미 있는 `alt`, `width`, `height`. 빈 값/"image"/"photo" 금지.
- LCP 이미지(대표 이미지, 메인 배너)는 `<link rel="preload">`, 그 외 `loading="lazy"`. WebP/AVIF, `srcset`.

### 2.2 성능
- LCP 2.5초 이하, CLS 0.1 이하, INP 200ms 이하.
- 목록 쿼리 인덱스(카테고리, 가격, 생성일), N+1 방지, 응답 캐시(메모리, 이후 Redis).
- 정적 자원 압축/장기 캐시, 이미지 CDN/오브젝트 스토리지.
- 재고 정합성을 위한 트랜잭션과 행 잠금(또는 낙관적 락).

### 2.3 보안
- 비밀번호 해시, httpOnly/Secure/SameSite 쿠키, CSRF 대응, 템플릿 자동 이스케이프(XSS), Prisma 바인딩(SQL 인젝션).
- 서버 입력 검증(zod/joi), helmet, rate limit(로그인/결제), CORS 화이트리스트.
- 관리자 영역 RBAC 서버 검사.
- 카드 정보 직접 저장 금지(PG 위임), 서버 금액 재검증, 웹훅 서명 검증.
- 개인정보 최소 수집, 동의 이력, 파일 업로드 형식/크기 검증, `.env` 커밋 금지, 감사 로그.

### 2.4 반응형
- 모바일 우선, 브레이크포인트 360 / 768 / 1024 / 1280px, 터치 영역 44px 이상, 갤러리 스와이프, 모바일 고정 구매 바.

### 2.5 접근성 (WCAG 2.1 AA)
- 키보드만으로 전 기능 사용, 포커스 표시, 색상 대비 4.5:1 이상, 색상 옵션은 색 이름 병기.
- 폼 label 연결, 오류 안내(`aria-live`), 모달 포커스 트랩, alt는 SEO와 동일 기준.

### 2.6 기타
- 신뢰성: DB 백업, 결제/재고 불일치 방지, 오류 로깅/모니터링
- 유지보수: route/controller/service/repository 계층, 마이그레이션, Swagger API 문서
- 품질: 단위/통합 테스트(주문, 재고, 결제), ESLint/Prettier
- 국제화: 한국어 단일, KRW
- 법규: 전자상거래법(청약철회 고지, 사업자 정보), 개인정보보호법
- 호환: 최신 Chrome, Safari, Edge, 삼성 인터넷

## 3. 사용자 스토리

### 구매자
- 카테고리와 필터로 내 사이즈의 신발만 보고 싶다.
- 검색엔진에서 원하는 상품 페이지로 바로 들어오고 싶다.
- 상품 상세에서 색상/사이즈를 고르고 재고 여부를 즉시 알고 싶다.
- 사이즈 가이드와 다른 구매자의 사이즈 후기를 보고 싶다.
- 장바구니에 담고 수량을 바꾸고 합계와 배송비를 확인하고 싶다.
- 배송지를 저장해 두고 간편하게 결제하고 싶다.
- 주문 상태와 운송장 번호를 마이페이지에서 확인하고 싶다.
- 사이즈가 안 맞으면 교환/반품을 신청하고 처리 상태를 보고 싶다.
- 구매 확정 후 리뷰를 쓰고 싶다.
- 개인정보를 안전하게 관리하고 싶다.

### 관리자
- 상품, 옵션별 재고, 이미지, 가격을 등록/수정하고 싶다.
- 상품별 SEO용 title/description/슬러그를 확인/수정하고 싶다.
- 신규 주문을 확인하고 상태 변경, 운송장 입력을 하고 싶다.
- 취소/교환/반품 요청을 승인/거절하고 환불 처리하고 싶다.
- 재고 부족 상품을 알림으로 보고 싶다.
- 일별/월별 매출과 주문 현황을 보고 싶다.
- 부적절한 리뷰를 숨기고 싶다.
- 관리자 계정만 관리 화면에 접근하게 하고 싶다.

## 4. 인수 조건 (대표 항목)

1. 회원가입: 유효한 입력이면 계정 생성, 비밀번호는 해시 저장. 중복 이메일/약한 비밀번호는 거부.
2. 목록 SSR: JS를 꺼도 상품 카드, h1, 페이지네이션이 HTML에 있다. 필터는 쿼리스트링에 반영. 결과 없음 안내.
3. 상세 SEO: head에 고유 title(60자 이내), description(120~155자), og 태그, canonical. 서버 렌더링 `Product` JSON-LD. h1 1개. 모든 img에 src/alt/width/height.
4. 슬러그 301: ID가 맞고 슬러그가 틀리면 정식 URL로 301. 없는 상품은 404.
5. 옵션/재고: 재고 0 사이즈는 선택 불가("품절"). 옵션 미선택 시 담기 불가.
6. 장바구니: 같은 SKU는 수량 합산, 재고 초과 불가, 합계/배송비 즉시 갱신.
7. 주문/결제: 서버가 금액 재계산, 불일치 시 거부. 성공 시 "결제완료"+재고 차감, 실패/이탈 시 재고 복구. 동시 주문에도 재고 음수 없음.
8. 주문 상태: 허용된 전이만 가능. 운송장 입력 시 구매자에게 노출.
9. 취소/교환: 배송 전 즉시 취소와 정확한 환불 금액. 배송 후는 신청 + 관리자 승인.
10. 리뷰: 구매 확정 상품만, 중복 불가. 평균 별점이 화면과 JSON-LD에 반영.
11. 관리자 권한: 일반 회원의 `/admin` 접근은 403 또는 로그인 이동. 관리자 페이지 noindex + robots Disallow.
12. sitemap/robots: 신규 상품이 sitemap.xml에 반영. 장바구니/주문/마이페이지는 크롤링 제외.
13. 성능: 모바일 상품 상세 LCP 2.5초 이하, CLS 0.1 이하.
14. 보안: 로그인 연속 실패 rate limit, XSS 입력 무력화, 타인 주문 조회 403.
15. 접근성: 키보드만으로 옵션 선택부터 결제까지 가능, Lighthouse 접근성 90 이상.

## 5. 미확정 사항 및 확인 질문 (우선순위 순)

### 우선순위 1 (범위/방향 결정)
1. 용도와 규모: 실제 운영인가 학습/포트폴리오인가? 상품 수/트래픽은?
2. 결제: 실제 PG(토스페이먼츠, 포트원 등)인가 모의 결제인가? 지원 수단은?
3. 판매 형태: 단일 판매자인가 입점형 마켓인가?
4. 기술 스택: Express + Prisma + MySQL 유지 및 EJS 서버 렌더링으로 갈 것인가, Next.js 등으로 갈 것인가?
5. 회원 정책: 비회원 구매, 소셜 로그인 필요 여부?

### 우선순위 2 (핵심 정책)
6. 옵션 구조: 사이즈 단위(mm만/성인·아동·해외 병행), 색상별 이미지 필요 여부?
7. 재고 차감 시점(주문/결제), 오프라인 재고 연동?
8. 배송비 기준, 도서산간, 택배사, 해외/당일 배송?
9. 교환/반품 기간, 반품 배송비 부담, 사이즈 교환 무료 여부?
10. 쿠폰/적립금/등급/기획전을 첫 버전에 포함할지?

### 우선순위 3 (운영/콘텐츠)
11. 운영자 수와 권한 분리, 상품 대량 등록(엑셀) 필요 여부?
12. 상품 이미지/설명 준비 주체, 이미지 저장소?
13. 사이트명, 로고, 디자인 시안/참고 사이트?
14. 사업자/통신판매업 신고, 약관/개인정보처리방침 준비 여부?
15. 알림 채널(이메일, 문자, 알림톡)?

### 우선순위 4 (환경/일정)
16. 호스팅, 도메인, HTTPS, CDN (canonical/sitemap에 필요)?
17. 목표 오픈일과 개발 인원?
18. GA, Search Console, 네이버 서치어드바이저 계획?
19. 리뷰 정책(사진, 포인트, 사전 검수)?
20. 기존 상품/회원 데이터 이전 여부?

### 확인 전 가정
단일 판매자, 한국어/KRW, 회원 구매 중심, 모의 결제로 시작(PG 교체 가능한 어댑터), 기존 Express + Prisma + MySQL 유지, EJS 서버 렌더링, 사이즈 mm 단위.

## 6. MVP 범위

목표: 회원이 상품을 검색해 옵션을 골라 주문하고 관리자가 처리하는 전체 흐름이 SEO 규칙을 지키며 동작.

포함
- 회원(가입/로그인/마이페이지/배송지)
- 카테고리, 상품, 색상 x 사이즈 SKU 재고
- 목록(필터/정렬/페이지네이션)과 상세 SSR, 메타/OG/JSON-LD, sitemap/robots
- 장바구니, 주문/결제(모의), 배송비 계산
- 주문 상태 관리, 운송장 입력, 배송 전 취소
- 관리자 상품/재고/주문 관리
- 구매 확정 후 리뷰(텍스트, 별점)
- 약관 페이지

제외(2단계 이후)
쿠폰/적립금, 소셜 로그인, 비회원 주문, 교환/반품 자동화, 사진 리뷰, 검색 자동완성, 통계 리포트, 입점형, 알림톡, 간편결제

## 7. 단계별 구현 로드맵 (1인 개발 기준 대략치)

### Phase 0. 기반 정비 (3~5일)
- 기존 게시판/실습 코드를 `legacy/`로 분리, `src/` 신설.
- ESM + Express 5 부트스트랩, 환경변수 검증, 에러/로깅, helmet, rate limit.
- EJS 도입, 공통 레이아웃과 SEO partial(title, description, OG, canonical, JSON-LD 슬롯, robots).
- ESLint/Prettier, 테스트(vitest/jest + supertest), `.env.example`, `.gitignore`에 `.env` 확인.
- 완료 기준: 빈 홈이 SSR로 뜨고 메타태그 검증 테스트 통과.

### Phase 1. DB 모델과 인증 (1주)
- Prisma 모델: User(role), Address, Category, Product, ProductImage, Sku, Cart, CartItem, Order, OrderItem, Payment, Shipment, Review, AuditLog. 금액은 정수(원), 주문 시점 가격 스냅샷.
- 가입/로그인/로그아웃, 해시, 세션 또는 JWT 쿠키, CSRF, RBAC.
- 시드 스크립트(샘플 상품).
- 완료 기준: 인수 조건 1, 11, 14 일부 통과.

### Phase 2. 카탈로그 SSR + SEO (1.5주)
- 목록(카테고리/필터/정렬/페이지네이션), 상세(옵션 선택 UI) 서버 렌더링.
- 슬러그, 301, 메타/OG/canonical, `Product`/`BreadcrumbList` JSON-LD.
- `sitemap.xml` 동적 생성, `robots.txt` 정비, 이미지 규칙.
- 반응형 레이아웃, 접근성 기초.
- 완료 기준: 인수 조건 2~5, 12, Lighthouse SEO 100 목표.

### Phase 3. 장바구니, 주문, 결제 (2주)
- 장바구니 CRUD와 재고 검증.
- 주문서/배송지, 주문 생성 트랜잭션(재고 차감), 결제 어댑터(모의 > PG), 금액 재검증, 웹훅/콜백.
- 주문 완료, 마이페이지 주문 내역, 배송 전 취소와 재고 복구.
- 재고 경합 동시성 테스트, 멱등성 키.
- 완료 기준: 인수 조건 6, 7, 9(취소).

### Phase 4. 관리자 (2주)
- 관리자 레이아웃(noindex), 대시보드.
- 상품/카테고리/SKU 재고 CRUD, 이미지 업로드(검증, 리사이즈, WebP).
- 주문 목록/상세, 상태 전이 규칙, 운송장, 취소/환불, 감사 로그.
- 완료 기준: 인수 조건 8, 11.

### Phase 5. 리뷰, 안정화, MVP 출시 (1주)
- 구매 확정, 리뷰 작성/목록/평균 별점(`AggregateRating` 연동).
- 약관/개인정보 페이지, 404/500.
- 성능/접근성/보안(OWASP Top 10) 점검.
- 배포(HTTPS, 압축, 301 설정), Search Console 등록.
- 완료 기준: 인수 조건 10, 13, 15, E2E 시나리오(가입 > 검색 > 주문 > 처리 > 리뷰) 성공.

### Phase 6~7. 확장 (MVP 이후)
- 2차: 실 PG(웹훅), 교환/반품 워크플로, 쿠폰/적립금, 비밀번호 찾기/이메일 인증, 비로그인 장바구니 병합, 찜, 사이즈 가이드, 입고 알림.
- 3차: 소셜 로그인, 사진 리뷰, 검색 고도화, 통계 리포트, 알림톡, Redis, 이미지 CDN, 간편결제.

### 주요 리스크
- 재고 동시성과 결제 정합성: Phase 3에서 테스트 우선.
- CSR 습관(기존 `public/*.js`)이 SEO 규칙 위반으로 이어지기 쉬움: 공개 페이지는 SSR 통일.
- 필터 조합 URL의 중복 콘텐츠: canonical/noindex 정책 사전 결정.
- `.env`(DB 접속 정보, AUTH_SECRET) 노출 방지.

## 8. 권장 디렉토리 구조

```
claude_back/
├─ .env                     # 커밋 금지
├─ .env.example
├─ package.json
├─ ROADMAP.md
├─ legacy/                  # 기존 board.js, post.js, member.js, c_back.js, a_intro.*, b_todo.*, views/, public/ 이동
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.js
├─ src/
│  ├─ server.js             # 진입점(listen)
│  ├─ app.js                # Express 구성
│  ├─ config/               # env 검증, 상수, PG/스토리지 설정
│  ├─ db/prisma.js          # PrismaClient 싱글턴
│  ├─ middlewares/          # auth, requireAdmin, csrf, rateLimit, errorHandler, notFound, seoDefaults
│  ├─ routes/
│  │  ├─ web/               # SSR: home, products, categories, search, cart, checkout, mypage, auth, static
│  │  ├─ admin/             # products, skus, orders, reviews, dashboard
│  │  ├─ api/               # 장바구니 수정, 결제 콜백/웹훅 등
│  │  └─ seo/               # sitemap.xml, robots.txt
│  ├─ controllers/
│  ├─ services/             # orderService, stockService, paymentService, cartService, shippingFeeService
│  ├─ repositories/         # Prisma 쿼리 캡슐화(선택)
│  ├─ payments/             # mockGateway.js, tossGateway.js(이후)
│  ├─ validators/           # zod/joi 스키마
│  ├─ utils/                # slug, money, pagination, seo(metaBuilder, jsonLd)
│  └─ jobs/                 # 미결제 주문 만료, 재고 복구, 구매확정 자동화
├─ views/                   # SSR 템플릿(EJS)
│  ├─ layouts/              # base.ejs
│  ├─ partials/             # head-meta.ejs, jsonld.ejs, header, footer, breadcrumb, product-card, pagination
│  ├─ pages/                # home, product-list, product-detail, cart, checkout, order-complete, mypage/*, auth/*, error/*
│  └─ admin/                # 관리자 템플릿(noindex 고정)
├─ public/
│  ├─ css/
│  ├─ js/                   # 점진적 향상용 소량 JS
│  ├─ images/
│  └─ favicon.ico
├─ uploads/                 # 임시(gitignore), 운영은 오브젝트 스토리지
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  └─ seo/                  # 메타/JSON-LD/alt/h1 검사
└─ docs/                    # Swagger 정의, 정책 문서
```

구조 원칙
- 라우트는 얇게, 비즈니스 로직은 `services/`에 두고 재고 차감/결제는 트랜잭션 처리.
- 결제는 `payments/` 어댑터로 격리해 모의에서 실결제로 교체.
- SEO 로직(`utils/seo`, `partials/head-meta.ejs`)을 한 곳에 모아 누락을 구조적으로 방지.
- 공개 페이지는 `routes/web` + `views/pages`(SSR), 비공개 페이지는 noindex로 분리.
- Prisma 모델/테이블은 기존 규칙(`tbl_`, `@@map`)을 따른다.
