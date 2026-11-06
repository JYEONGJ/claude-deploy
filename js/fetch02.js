(() => {
  'use strict';

  /*
   * fetchData: 재사용 가능한 비동기 데이터 요청 함수
   *  - url: 요청할 API 주소
   *  - fetch()로 요청 → await로 응답 대기
   *  - response.ok 확인 후 실패 시 에러 throw
   *  - response.json()으로 JSON 파싱 후 반환
   */
  async function fetchData(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP 오류: ${response.status}`);
    return await response.json();
  }

  /*
   * renderImages: 재사용 가능한 이미지 렌더링 함수
   *  - photos: 사진 데이터 배열
   *  - container: 카드가 들어갈 DOM 요소
   *  - 각 데이터의 url을 img 태그의 src에 설정하고 title을 캡션으로 표시
   */
  function renderImages(photos, container) {
    container.innerHTML = photos.map(p => `
      <div class="item">
        <img src="${p.url}" alt="${p.title}">
        <p>${p.title}</p>
      </div>`).join('');
  }

  /*
   * loadGallery: 전체 흐름 제어 함수
   *  - apiUrl: 사진 API 주소, count: 가져올 개수 (기본 10 = 2행 x 5열)
   *  - fetchData로 전체 데이터를 받고 slice(0, count)로 앞에서 count개만 사용
   *  - try/catch로 네트워크/HTTP 오류 처리
   */
  async function loadGallery(apiUrl, count = 10) {
    const gallery = document.getElementById('gallery');
    try {
      const photos = await fetchData(apiUrl);
      renderImages(photos.slice(0, count), gallery);
    } catch (error) {
      gallery.textContent = '데이터를 불러오지 못했습니다: ' + error.message;
    }
  }

  /*
   * 팝업 제어
   *  - openModal: 클릭한 카드의 img/제목을 팝업에 복사하고 open 클래스로 표시
   *  - closeModal: open 클래스를 제거해 숨김
   *  - 갤러리에 이벤트 위임: 동적으로 생성된 .item 클릭을 한 번에 처리
   *  - 닫기: X 버튼, 어두운 배경 클릭, ESC 키
   */
  const modal = document.getElementById('modal');
  const openModal = (item) => {
    const img = item.querySelector('img');
    document.getElementById('modal-img').src = img.src;
    document.getElementById('modal-img').alt = img.alt;
    document.getElementById('modal-title').textContent = img.alt;
    modal.classList.add('open');
  };
  const closeModal = () => modal.classList.remove('open');

  document.getElementById('gallery').addEventListener('click', (e) => {
    const item = e.target.closest('.item');
    if (item) openModal(item);
  });
  document.getElementById('modal-close').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  // 실행: photos API에서 10개를 가져와 2행 5열로 표시
  loadGallery('https://jsonplaceholder.typicode.com/photos', 10);
})();
