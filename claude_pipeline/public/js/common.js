// 공통 유틸: API 호출, 가격 포맷, 메시지 표시
const API_DOLLS = '/api/dolls';

// 성공 시 json.data 반환(204는 null), 실패 시 서버 error 메시지로 Error throw
async function apiRequest(method, path, body) {
  const options = { method: method, headers: {} };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(path, options);
  } catch (networkErr) {
    throw new Error('서버에 연결할 수 없습니다.');
  }

  if (res.status === 204) return null;

  let json = null;
  try {
    json = await res.json();
  } catch (parseErr) {
    json = null;
  }

  if (!res.ok) {
    const err = json && json.error;
    const message = typeof err === 'string' ? err : (err && err.message);
    throw new Error(message || '요청을 처리하지 못했습니다. (' + res.status + ')');
  }
  return json ? json.data : null;
}

// 1000 -> "1,000원"
function formatPrice(value) {
  return new Intl.NumberFormat('ko-KR').format(value) + '원';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 빈 문자열이면 요소를 숨김
function showMessage(el, message) {
  el.textContent = message || '';
  el.hidden = !message;
}

// URL ?id= 값을 양의 정수 문자열로 반환, 없거나 잘못되면 null
function getDollIdFromUrl() {
  const raw = new URLSearchParams(window.location.search).get('id');
  return raw && /^\d+$/.test(raw) ? raw : null;
}

function setMetaDescription(text) {
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', text);
}
