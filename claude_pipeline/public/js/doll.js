// 인형 상세 + 구매 화면 (GET /api/dolls/:id, POST /api/dolls/:id/purchase)
(function () {
  const errorEl = document.getElementById('error');
  const dollEl = document.getElementById('doll');
  const nameEl = document.getElementById('doll-name');
  const priceEl = document.getElementById('doll-price');
  const stockEl = document.getElementById('doll-stock');
  const editLink = document.getElementById('edit-link');
  const purchaseForm = document.getElementById('purchase-form');
  const quantityInput = document.getElementById('quantity');
  const quantityError = document.getElementById('quantity-error');
  const purchaseBtn = document.getElementById('purchase-btn');
  const purchaseResult = document.getElementById('purchase-result');

  const dollId = getDollIdFromUrl();
  let currentDoll = null;

  // 재고에 따라 표시와 구매 버튼 상태를 갱신
  function renderStock(doll) {
    const soldOut = doll.stock === 0;
    stockEl.innerHTML = soldOut
      ? '<span class="badge sold-out">품절</span>'
      : '재고 ' + doll.stock + '개';
    purchaseBtn.disabled = soldOut;
    quantityInput.disabled = soldOut;
  }

  function renderDoll(doll) {
    currentDoll = doll;
    document.title = doll.name + ' | 인형가게';
    setMetaDescription(doll.name + ' 상품의 상세 정보 페이지입니다. 가격은 ' + formatPrice(doll.price) +
      '이며, 현재 재고를 확인하고 원하는 수량만큼 바로 구매할 수 있습니다. 재고가 없으면 품절로 표시되며 구매 버튼이 비활성화됩니다. 구매 수량은 1 이상의 정수로 입력해 주세요.');
    nameEl.textContent = doll.name;
    priceEl.textContent = formatPrice(doll.price);
    editLink.href = 'doll-form.html?id=' + doll.id;
    renderStock(doll);
    dollEl.hidden = false;
  }

  async function loadDoll() {
    if (!dollId) {
      showMessage(errorEl, '잘못된 인형 ID입니다.');
      return;
    }
    try {
      const doll = await apiRequest('GET', API_DOLLS + '/' + dollId);
      renderDoll(doll);
    } catch (err) {
      showMessage(errorEl, err.message);
    }
  }

  async function purchase(event) {
    event.preventDefault();
    showMessage(quantityError, '');
    showMessage(errorEl, '');
    showMessage(purchaseResult, '');

    const raw = quantityInput.value.trim();
    const quantity = Number(raw);
    if (raw === '' || !Number.isInteger(quantity) || quantity < 1) {
      showMessage(quantityError, '수량은 1 이상의 정수로 입력해 주세요.');
      return;
    }

    purchaseBtn.disabled = true;
    try {
      const result = await apiRequest('POST', API_DOLLS + '/' + dollId + '/purchase', { quantity: quantity });
      currentDoll.stock = result.stock;
      renderStock(currentDoll);
      quantityInput.value = 1;
      showMessage(purchaseResult, quantity + '개 구매가 완료되었습니다. 남은 재고: ' + result.stock + '개');
    } catch (err) {
      // 409 재고 부족 등 서버 메시지를 그대로 표시
      showMessage(errorEl, err.message);
      purchaseBtn.disabled = currentDoll.stock === 0;
    }
  }

  purchaseForm.addEventListener('submit', purchase);
  loadDoll();
})();
