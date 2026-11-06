(() => {
  'use strict';

  // 반복되는 목록 데이터
  const nav = ['AWARDS 안내', '2026 수상작', '수상안내', '문의하기', '심사등록'];
  const sideMenu = [
    ['WEB 선정작', '- WEB 부문', '- MOBILE 부문'],
    ['심사방법 및 절차', '심사위원', '심사등록', '수상 신청'],
    ['에이전시 검색', '에이전시 순위', '채용뉴스', '무료이미지'],
    ['일본 웹사이트', '해외 웹사이트'],
    ['어워드 이야기']
  ];
  const info = [
    { k: '수상명', v: 'GRAND PRIZE' },
    { k: '선정증서번호', v: '202309070002 (수상신청)' },
    { k: '등록일', v: '2023년 09월 07일' },
    { k: '타겟층', v: '여성, 남성, 초등학생, 중고등학생, 학부모, 30-40대' },
    { k: '표현방법', v: '3D, 모션그래픽' },
    { k: '디자인 컨셉', v: '귀여운, 역동적인, 재미있는, 실험적인, 화려한, 독특한 레이아웃, 깔끔한' },
    { k: '주색상', v: 'GREEN' },
    { k: '제작사', v: '소이정' }
  ];
  const others = ['삼성드림이비전', '소이정 메디컬', '소이정', '케이소울', '드레인울', '안성인삼농협', '법무법인 목련', '아이누리 한의', '골드만 비뇨기'];

  const pool = ['KT온고재센터','커넥트웨이브','스킨답위원','아이더스','메가스터디북스','빌라드아르떼','IR큐더스','하이파이브','숲소리','에티버스','솔트룩스','GS&쿠폰','IM투자파트너스','와커스','HD현대 ESG','씨네큐브','노블리즈','이화여자대학교','히츠','채널A','네이버에서 스토어','타원빌라스','엠넥스','포스코플로우','ORBIT','의왕시청역 SK','신원','효성메타톤','브레인울','메타셋','Saem.','JDB엔터테인먼트','아이엘모빌리티','정다운','셀바스헬스케어','두산지오솔루션','리움미술관','대한민국은 공원'];

  // 샘플 카드 n개 만들기
  function makeItems(n, off) {
    const list = [];
    for (let i = 0; i < n; i++) {
      const year = 21 + ((i + off) % 6);
      const month = String(1 + (i * 5 + off) % 12).padStart(2, '0');
      const day = String(1 + (i * 11 + off) % 28).padStart(2, '0');
      list.push({
        name: pool[(i * 7 + off) % pool.length],
        date: year + '.' + month + '.' + day,
        views: (10000 + ((i + 1) * (off + 3) * 7919) % 80000).toLocaleString()
      });
    }
    return list;
  }

  const history = [
    { name: '서울랜드', date: '21.06.16', views: '105,478' },
    { name: '서울랜드', date: '09.07.03', views: '18,160' },
    { name: '서울랜드', date: '07.07.03', views: '15,291' }
  ];
  const sections = [
    { pre: ' 웹사이트의 ', hl: '히스토리', post: '', items: history },
    { pre: '과 ', hl: '유사한 디자인컨셉', post: '를 가진 사이트들', items: makeItems(10, 0) },
    { pre: '과 ', hl: '유사한 색상', post: '을 가진 사이트들', items: makeItems(10, 10) },
    { pre: '과 ', hl: '유사한 표현방법', post: '을 가진 사이트들', items: makeItems(10, 19) },
    { pre: '과 ', hl: '유사한 업종', post: '의 사이트들', items: makeItems(10, 28) }
  ];

  // 화면에 그리기
  document.getElementById('gnb').outerHTML = nav.map(n => `<a href="#">${n}</a>`).join('');

  const contact = document.querySelector('.contact');
  sideMenu.forEach(group => {
    const div = document.createElement('div');
    div.className = 'side-group';
    div.innerHTML = group.map(m => `<a href="#">${m}</a>`).join('');
    contact.before(div);
  });

  document.getElementById('info').innerHTML = info.map(r => `<dt>${r.k}</dt><dd>${r.v}</dd>`).join('');

  document.getElementById('others').innerHTML = others.map(name => `
    <div class="other">
      <div class="img thumb"></div>
      <div class="cap"><span>${name}</span><span class="red-b">+</span></div>
    </div>`).join('');

  document.getElementById('sections').innerHTML = sections.map(s => `
    <section class="similar">
      <h2>서울랜드${s.pre}<em>${s.hl}</em>${s.post}</h2>
      <div class="cards">
        ${s.items.map(it => `
          <div class="card">
            <div class="img thumb"></div>
            <div class="row"><span class="name">${it.name}</span><span class="date">${it.date}</span></div>
            <div class="row small"><span class="icons"><span>+</span><span>⤓</span></span><span class="views">${it.views}</span></div>
          </div>`).join('')}
      </div>
    </section>`).join('');
})();
