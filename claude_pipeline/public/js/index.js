// 인형 목록 화면 (GET /api/dolls)
(function () {
  const listEl = document.getElementById('doll-list');
  const errorEl = document.getElementById('error');

  function renderCard(doll) {
    const stockText = doll.stock === 0
      ? '<span class="badge sold-out">품절</span>'
      : '재고 ' + doll.stock + '개';
    return '<li class="doll-card">' +
      '<a href="doll.html?id=' + doll.id + '">' +
      '<h2>' + escapeHtml(doll.name) + '</h2>' +
      '<p class="price">' + formatPrice(doll.price) + '</p>' +
      '<p>' + stockText + '</p>' +
      '</a></li>';
  }

  async function loadDolls() {
    try {
      const dolls = await apiRequest('GET', API_DOLLS);
      if (!dolls || dolls.length === 0) {
        listEl.innerHTML = '<li class="empty">등록된 인형이 없습니다.</li>';
        return;
      }
      listEl.innerHTML = dolls.map(renderCard).join('');
    } catch (err) {
      listEl.innerHTML = '';
      showMessage(errorEl, err.message);
    }
  }

  loadDolls();
})();
