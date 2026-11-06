-- =====================================================================
-- 신발 쇼핑몰 MVP 테이블 (MySQL 8.0+, InnoDB, utf8mb4)
-- 테스트용 간단 버전. ROADMAP.md 6장(MVP 범위) 기준 최소 테이블만 포함.
--
-- 주의: 아래 DROP 문은 이 파일의 테이블만 지우고 다시 만든다.
--       기존 실습용 tbl_member / tbl_post(Prisma 모델)와 이름이 겹치므로
--       반드시 쇼핑몰 전용 DB에서 실행할 것.
-- 금액은 모두 정수(원). 주문 시점 가격/상품명/옵션은 order_item에 스냅샷.
-- 주문 상태: PENDING_PAYMENT(결제대기) > PAID(결제완료) > PREPARING(상품준비)
--            > SHIPPING(배송중) > DELIVERED(배송완료) > CONFIRMED(구매확정)
--            / CANCELLED(취소)
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS tbl_review;
DROP TABLE IF EXISTS tbl_shipment;
DROP TABLE IF EXISTS tbl_payment;
DROP TABLE IF EXISTS tbl_order_item;
DROP TABLE IF EXISTS tbl_order;
DROP TABLE IF EXISTS tbl_cart_item;
DROP TABLE IF EXISTS tbl_sku;
DROP TABLE IF EXISTS tbl_product_image;
DROP TABLE IF EXISTS tbl_product_category;
DROP TABLE IF EXISTS tbl_product;
DROP TABLE IF EXISTS tbl_category;
DROP TABLE IF EXISTS tbl_address;
DROP TABLE IF EXISTS tbl_member;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- 회원 / 배송지
-- ---------------------------------------------------------------------
CREATE TABLE tbl_member (
  id            INT          AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,                       -- bcrypt/argon2 해시만 저장
  name          VARCHAR(50)  NOT NULL,
  phone         VARCHAR(20)  NOT NULL,
  role          ENUM('USER','ADMIN') NOT NULL DEFAULT 'USER',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tbl_address (
  id          INT          AUTO_INCREMENT PRIMARY KEY,
  member_id   INT          NOT NULL,
  recipient   VARCHAR(50)  NOT NULL,
  phone       VARCHAR(20)  NOT NULL,
  zipcode     VARCHAR(10)  NOT NULL,
  address1    VARCHAR(255) NOT NULL,
  address2    VARCHAR(255) NULL,
  is_default  TINYINT(1)   NOT NULL DEFAULT 0,
  CONSTRAINT fk_address_member FOREIGN KEY (member_id) REFERENCES tbl_member (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 카테고리 (계층: parent_id 자기참조)
-- ---------------------------------------------------------------------
CREATE TABLE tbl_category (
  id          INT          AUTO_INCREMENT PRIMARY KEY,
  parent_id   INT          NULL,
  name        VARCHAR(50)  NOT NULL,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  sort_order  INT          NOT NULL DEFAULT 0,
  CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES tbl_category (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 상품 / 다중 카테고리 / 이미지 / SKU(색상 x 사이즈 재고)
-- ---------------------------------------------------------------------
CREATE TABLE tbl_product (
  id               INT          AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(100) NOT NULL,
  brand            VARCHAR(50)  NOT NULL,
  description      TEXT         NULL,
  price            INT UNSIGNED NOT NULL,                    -- 기본 판매가(원)
  status           ENUM('ON_SALE','HIDDEN') NOT NULL DEFAULT 'ON_SALE',
  slug             VARCHAR(150) NOT NULL UNIQUE,             -- SEO용 슬러그 (예: air-runner)
  meta_title       VARCHAR(60)  NOT NULL,                    -- SEO title (60자 이내)
  meta_description VARCHAR(160) NOT NULL,                    -- SEO description (120~155자 권장)
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_product_status_price (status, price),
  INDEX idx_product_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tbl_product_category (
  product_id   INT NOT NULL,
  category_id  INT NOT NULL,
  PRIMARY KEY (product_id, category_id),
  INDEX idx_product_category_category (category_id),
  CONSTRAINT fk_pc_product  FOREIGN KEY (product_id)  REFERENCES tbl_product (id)  ON DELETE CASCADE,
  CONSTRAINT fk_pc_category FOREIGN KEY (category_id) REFERENCES tbl_category (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tbl_product_image (
  id          INT          AUTO_INCREMENT PRIMARY KEY,
  product_id  INT          NOT NULL,
  url         VARCHAR(500) NOT NULL,
  alt         VARCHAR(200) NOT NULL,
  sort_order  INT          NOT NULL DEFAULT 0,
  CONSTRAINT fk_image_product FOREIGN KEY (product_id) REFERENCES tbl_product (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tbl_sku (
  id           INT          AUTO_INCREMENT PRIMARY KEY,
  product_id   INT          NOT NULL,
  color        VARCHAR(30)  NOT NULL,
  size_mm      SMALLINT UNSIGNED NOT NULL,                   -- 사이즈(mm), 220~300
  extra_price  INT          NOT NULL DEFAULT 0,              -- 옵션 추가금(원)
  stock        INT          NOT NULL DEFAULT 0,              -- 재고 수량
  UNIQUE KEY uq_sku_option (product_id, color, size_mm),
  CONSTRAINT chk_sku_stock CHECK (stock >= 0),
  CONSTRAINT chk_sku_size  CHECK (size_mm BETWEEN 220 AND 300),
  CONSTRAINT fk_sku_product FOREIGN KEY (product_id) REFERENCES tbl_product (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 장바구니 (회원별 SKU 단위 담기)
-- ---------------------------------------------------------------------
CREATE TABLE tbl_cart_item (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  member_id  INT NOT NULL,
  sku_id     INT NOT NULL,
  quantity   INT NOT NULL,
  UNIQUE KEY uq_cart_member_sku (member_id, sku_id),        -- 같은 SKU는 수량 합산
  CONSTRAINT chk_cart_quantity CHECK (quantity > 0),
  CONSTRAINT fk_cart_member FOREIGN KEY (member_id) REFERENCES tbl_member (id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_sku    FOREIGN KEY (sku_id)    REFERENCES tbl_sku (id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 주문 / 주문상품(스냅샷) / 결제 / 배송
-- ---------------------------------------------------------------------
CREATE TABLE tbl_order (
  id            INT          AUTO_INCREMENT PRIMARY KEY,
  order_no      VARCHAR(40)  NOT NULL UNIQUE,
  member_id     INT          NOT NULL,
  status        ENUM('PENDING_PAYMENT','PAID','PREPARING','SHIPPING','DELIVERED','CONFIRMED','CANCELLED')
                             NOT NULL DEFAULT 'PENDING_PAYMENT',
  items_amount  INT          NOT NULL,                       -- 상품 금액 합계(원)
  shipping_fee  INT          NOT NULL DEFAULT 0,             -- 배송비(원)
  total_amount  INT          NOT NULL,                       -- items_amount + shipping_fee
  recipient     VARCHAR(50)  NOT NULL,                       -- 배송지 스냅샷
  phone         VARCHAR(20)  NOT NULL,
  zipcode       VARCHAR(10)  NOT NULL,
  address1      VARCHAR(255) NOT NULL,
  address2      VARCHAR(255) NULL,
  memo          VARCHAR(255) NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order_member_created (member_id, created_at),
  INDEX idx_order_status (status),
  CONSTRAINT fk_order_member FOREIGN KEY (member_id) REFERENCES tbl_member (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tbl_order_item (
  id            INT          AUTO_INCREMENT PRIMARY KEY,
  order_id      INT          NOT NULL,
  sku_id        INT          NOT NULL,
  product_name  VARCHAR(100) NOT NULL,                       -- 주문 시점 스냅샷
  color         VARCHAR(30)  NOT NULL,
  size_mm       SMALLINT UNSIGNED NOT NULL,
  unit_price    INT          NOT NULL,                       -- 주문 시점 단가(기본가 + 추가금)
  quantity      INT          NOT NULL,
  line_amount   INT          NOT NULL,                       -- unit_price * quantity
  INDEX idx_order_item_order (order_id),
  INDEX idx_order_item_sku (sku_id),
  CONSTRAINT fk_order_item_order FOREIGN KEY (order_id) REFERENCES tbl_order (id) ON DELETE CASCADE,
  CONSTRAINT fk_order_item_sku   FOREIGN KEY (sku_id)   REFERENCES tbl_sku (id)   ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tbl_payment (
  id           INT          AUTO_INCREMENT PRIMARY KEY,
  order_id     INT          NOT NULL,
  method       VARCHAR(20)  NOT NULL DEFAULT 'MOCK',         -- 모의 결제 시작, 이후 PG 코드 추가
  status       ENUM('READY','APPROVED','FAILED','CANCELLED') NOT NULL DEFAULT 'READY',
  amount       INT          NOT NULL,                        -- 서버 재계산 금액(원)
  pg_tid       VARCHAR(100) NULL UNIQUE,                     -- PG 거래 ID (이중결제 방지 키)
  approved_at  DATETIME     NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payment_order (order_id),
  CONSTRAINT fk_payment_order FOREIGN KEY (order_id) REFERENCES tbl_order (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tbl_shipment (
  id           INT          AUTO_INCREMENT PRIMARY KEY,
  order_id     INT          NOT NULL UNIQUE,                 -- 주문당 배송 1건
  carrier      VARCHAR(30)  NULL,                            -- 택배사
  tracking_no  VARCHAR(50)  NULL,                            -- 운송장 번호
  shipped_at   DATETIME     NULL,
  delivered_at DATETIME     NULL,
  CONSTRAINT fk_shipment_order FOREIGN KEY (order_id) REFERENCES tbl_order (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 리뷰 (구매 확정된 주문상품 1건당 1개)
-- ---------------------------------------------------------------------
CREATE TABLE tbl_review (
  id             INT         AUTO_INCREMENT PRIMARY KEY,
  product_id     INT         NOT NULL,
  member_id      INT         NOT NULL,
  order_item_id  INT         NOT NULL UNIQUE,                -- 중복 리뷰 방지
  rating         TINYINT UNSIGNED NOT NULL,
  content        TEXT        NOT NULL,
  is_hidden      TINYINT(1)  NOT NULL DEFAULT 0,             -- 관리자 숨김
  created_at     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_review_product (product_id),
  CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_review_product    FOREIGN KEY (product_id)    REFERENCES tbl_product (id)    ON DELETE CASCADE,
  CONSTRAINT fk_review_member     FOREIGN KEY (member_id)     REFERENCES tbl_member (id)     ON DELETE CASCADE,
  CONSTRAINT fk_review_order_item FOREIGN KEY (order_item_id) REFERENCES tbl_order_item (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 샘플 데이터 (테스트용, 명시적 id 사용)
-- 비밀번호 해시는 더미 값이라 실제 로그인은 불가 (인증 구현 후 교체)
-- =====================================================================

-- 회원: 관리자 1, 일반 회원 1
INSERT INTO tbl_member (id, email, password_hash, name, phone, role) VALUES
  (1, 'admin@shop.test', '$2b$10$DUMMYHASHDUMMYHASHDUMMYHASHDUMMYHASHDUMMYHASHDUMMY', '관리자', '010-0000-0000', 'ADMIN'),
  (2, 'user@shop.test',  '$2b$10$DUMMYHASHDUMMYHASHDUMMYHASHDUMMYHASHDUMMYHASHDUMMY', '홍길동', '010-1234-5678', 'USER');

INSERT INTO tbl_address (id, member_id, recipient, phone, zipcode, address1, address2, is_default) VALUES
  (1, 2, '홍길동', '010-1234-5678', '06236', '서울특별시 강남구 테헤란로 123', '101동 1001호', 1);

-- 카테고리: 운동화 > 러닝화, 구두, 부츠
INSERT INTO tbl_category (id, parent_id, name, slug, sort_order) VALUES
  (1, NULL, '운동화', 'sneakers',    1),
  (2, 1,    '러닝화', 'running',     1),
  (3, NULL, '구두',   'dress-shoes', 2),
  (4, NULL, '부츠',   'boots',       3);

-- 상품 3종
INSERT INTO tbl_product (id, name, brand, description, price, status, slug, meta_title, meta_description) VALUES
  (1, '에어 러너', 'STRIDE',
     '가볍고 통기성 좋은 메쉬 어퍼의 데일리 러닝화입니다. 색상과 사이즈(220~300mm)별 재고를 확인하고 주문하세요. 50,000원 이상 구매 시 배송비가 무료입니다.',
     99000, 'ON_SALE', 'air-runner', '에어 러너 러닝화 | MyStore',
     '가볍고 통기성 좋은 메쉬 어퍼의 데일리 러닝화입니다. 색상과 사이즈(220~300mm)별 재고를 바로 확인하고, 50,000원 이상 구매 시 배송비 무료로 주문할 수 있습니다. 쿠션이 좋아 달리기와 일상 걷기에 모두 편합니다.'),
  (2, '시티 옥스퍼드', 'CLASSIC',
     '출근과 캐주얼 어디에나 어울리는 가죽 옥스퍼드 구두입니다. 부드러운 쿠션 인솔로 장시간 착용도 편안하며 블랙과 브라운 두 가지 색상으로 준비되었습니다.',
     129000, 'ON_SALE', 'city-oxford', '시티 옥스퍼드 구두 | MyStore',
     '출근과 캐주얼 어디에나 어울리는 가죽 옥스퍼드 구두입니다. 부드러운 쿠션 인솔로 장시간 착용도 편안하며, 블랙과 브라운 두 가지 색상으로 사이즈별 재고를 확인하세요. 정품 가죽 소재로 오래 신을 수 있고, 출근길과 모임 자리 모두 깔끔하게 어울립니다.'),
  (3, '트레일 부츠 하이', 'PEAK',
     '방수 코팅 어퍼와 미끄럼 방지 아웃솔을 적용한 하이컷 트레킹 부츠입니다. 발목을 든든하게 잡아주어 산행과 야외 활동에 적합합니다.',
     159000, 'ON_SALE', 'trail-boot-high', '트레일 부츠 하이 | MyStore',
     '방수 코팅 어퍼와 미끄럼 방지 아웃솔을 적용한 하이컷 트레킹 부츠입니다. 발목을 든든하게 잡아주어 산행과 야외 활동에 적합하며, 브라운과 블랙 색상으로 준비되어 있습니다. 젖은 노면에서도 안정적인 착용감을 제공합니다.');

INSERT INTO tbl_product_category (product_id, category_id) VALUES
  (1, 1), (1, 2),   -- 에어 러너: 운동화 + 러닝화 (다중 카테고리)
  (2, 3),
  (3, 4);

INSERT INTO tbl_product_image (id, product_id, url, alt, sort_order) VALUES
  (1, 1, 'https://cdn.example.com/products/air-runner-white-1.webp', '에어 러너 화이트 측면 이미지', 0),
  (2, 1, 'https://cdn.example.com/products/air-runner-black-1.webp', '에어 러너 블랙 측면 이미지', 1),
  (3, 2, 'https://cdn.example.com/products/city-oxford-black-1.webp', '시티 옥스퍼드 블랙 정면 이미지', 0),
  (4, 3, 'https://cdn.example.com/products/trail-boot-brown-1.webp', '트레일 부츠 하이 브라운 측면 이미지', 0);

-- SKU (색상 x 사이즈 재고, 추가금은 기본가에 더해짐)
INSERT INTO tbl_sku (id, product_id, color, size_mm, extra_price, stock) VALUES
  (1, 1, 'white', 250,     0,     9),   -- 주문 1에서 1개 차감된 상태
  (2, 1, 'white', 260,     0,    10),
  (3, 1, 'black', 250,     0,     8),   -- 주문 2에서 2개 차감된 상태
  (4, 1, 'black', 270,  3000,     0),   -- 품절 예시
  (5, 2, 'black', 260,     0,     5),
  (6, 2, 'brown', 270,  5000,     3),
  (7, 3, 'brown', 280, 10000,     6),
  (8, 3, 'black', 270, 10000,     4);

INSERT INTO tbl_cart_item (id, member_id, sku_id, quantity) VALUES
  (1, 2, 5, 1);

-- 주문 2건
INSERT INTO tbl_order (id, order_no, member_id, status, items_amount, shipping_fee, total_amount,
                       recipient, phone, zipcode, address1, address2, memo, created_at, updated_at) VALUES
  (1, 'ORD-20261101-0001', 2, 'SHIPPING',  99000, 0, 99000,
      '홍길동', '010-1234-5678', '06236', '서울특별시 강남구 테헤란로 123', '101동 1001호', '문 앞에 놔주세요',
      '2026-11-01 10:00:00', '2026-11-03 09:00:00'),
  (2, 'ORD-20261102-0002', 2, 'CONFIRMED', 198000, 0, 198000,
      '홍길동', '010-1234-5678', '06236', '서울특별시 강남구 테헤란로 123', '101동 1001호', NULL,
      '2026-11-02 14:20:00', '2026-11-04 10:00:00');

INSERT INTO tbl_order_item (id, order_id, sku_id, product_name, color, size_mm, unit_price, quantity, line_amount) VALUES
  (1, 1, 1, '에어 러너', 'white', 250,  99000, 1,  99000),
  (2, 2, 3, '에어 러너', 'black', 250,  99000, 2, 198000);

INSERT INTO tbl_payment (id, order_id, method, status, amount, pg_tid, approved_at, created_at) VALUES
  (1, 1, 'MOCK', 'APPROVED',  99000, 'MOCK-TID-0001', '2026-11-01 10:01:00', '2026-11-01 10:00:30'),
  (2, 2, 'MOCK', 'APPROVED', 198000, 'MOCK-TID-0002', '2026-11-02 14:21:00', '2026-11-02 14:20:30');

INSERT INTO tbl_shipment (id, order_id, carrier, tracking_no, shipped_at, delivered_at) VALUES
  (1, 1, 'CJ대한통운', '123456789012', '2026-11-03 09:00:00', NULL),                       -- 배송중
  (2, 2, 'CJ대한통운', '987654321098', '2026-11-02 18:00:00', '2026-11-03 15:00:00');     -- 배송완료 후 구매확정

-- 리뷰: 구매 확정된 주문상품(order_item 2)에 대해서만 작성 가능
INSERT INTO tbl_review (id, product_id, member_id, order_item_id, rating, content, is_hidden, created_at) VALUES
  (1, 1, 2, 2, 5, '가볍고 통기성이 좋아요. 평소 250 사이즈 그대로 신으면 잘 맞습니다.', 0, '2026-11-04 11:00:00');
