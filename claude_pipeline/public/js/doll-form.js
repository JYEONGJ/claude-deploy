// 인형 등록/수정 화면 (?id= 있으면 수정). POST/PUT/DELETE /api/dolls
(function () {
  const titleEl = document.getElementById('form-title');
  const errorEl = document.getElementById('error');
  const formEl = document.getElementById('doll-form');
  const nameInput = document.getElementById('name');
  const priceInput = document.getElementById('price');
  const stockInput = document.getElementById('stock');
  const nameError = document.getElementById('name-error');
  const priceError = document.getElementById('price-error');
  const stockError = document.getElementById('stock-error');
  const saveBtn = document.getElementById('save-btn');
  const deleteBtn = document.getElementById('delete-btn');
  const cancelLink = document.getElementById('cancel-link');

  const dollId = getDollIdFromUrl();
  const isEdit = dollId !== null;

  // 빈 값이 아닌 0 이상 정수인지 검사
  function isNonNegativeInt(raw) {
    const value = raw.trim();
    return value !== '' && Number.isInteger(Number(value)) && Number(value) >= 0;
  }

  function validate() {
    const name = nameInput.value.trim();
    const nameOk = name.length >= 1 && name.length <= 100;
    const priceOk = isNonNegativeInt(priceInput.value);
    const stockOk = isNonNegativeInt(stockInput.value);

    showMessage(nameError, nameOk ? '' : '상품명은 1자 이상 100자 이하로 입력해 주세요.');
    showMessage(priceError, priceOk ? '' : '가격은 0 이상의 정수로 입력해 주세요.');
    showMessage(stockError, stockOk ? '' : '재고는 0 이상의 정수로 입력해 주세요.');
    return nameOk && priceOk && stockOk;
  }

  function fillForm(doll) {
    nameInput.value = doll.name;
    priceInput.value = doll.price;
    stockInput.value = doll.stock;
    document.title = '인형 수정 | 인형가게';
    titleEl.textContent = '인형 수정';
    cancelLink.href = 'doll.html?id=' + doll.id;
    deleteBtn.hidden = false;
  }

  function setFormDisabled(disabled) {
    saveBtn.disabled = disabled;
    deleteBtn.disabled = disabled;
  }

  async function loadDoll() {
    if (!isEdit) return;
    try {
      const doll = await apiRequest('GET', API_DOLLS + '/' + dollId);
      fillForm(doll);
    } catch (err) {
      showMessage(errorEl, err.message);
      setFormDisabled(true);
    }
  }

  async function submitForm(event) {
    event.preventDefault();
    showMessage(errorEl, '');
    if (!validate()) return;

    const payload = {
      name: nameInput.value.trim(),
      price: Number(priceInput.value),
      stock: Number(stockInput.value)
    };

    saveBtn.disabled = true;
    try {
      const saved = isEdit
        ? await apiRequest('PUT', API_DOLLS + '/' + dollId, payload)
        : await apiRequest('POST', API_DOLLS, payload);
      window.location.href = 'doll.html?id=' + saved.id;
    } catch (err) {
      showMessage(errorEl, err.message);
      saveBtn.disabled = false;
    }
  }

  async function deleteDoll() {
    if (!window.confirm('정말 이 인형을 삭제하시겠습니까?')) return;
    showMessage(errorEl, '');
    setFormDisabled(true);
    try {
      await apiRequest('DELETE', API_DOLLS + '/' + dollId);
      window.location.href = 'index.html';
    } catch (err) {
      showMessage(errorEl, err.message);
      setFormDisabled(false);
    }
  }

  formEl.addEventListener('submit', submitForm);
  deleteBtn.addEventListener('click', deleteDoll);
  loadDoll();
})();
