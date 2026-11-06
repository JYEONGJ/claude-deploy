(() => {
  'use strict';

  /*
   * [코드 설명]
   * 1. fetchJson(url)
   *    - 재사용 가능한 비동기 함수. 어떤 URL이든 넘기면 JSON을 파싱해 반환한다.
   *    - async: 함수가 항상 Promise를 반환하도록 선언
   *    - await fetch(url): ES6 fetch로 HTTP 요청을 보내고 응답(Response)을 기다림
   *    - response.ok 확인: 404, 500 등 HTTP 오류 상태면 예외를 던짐
   *    - await response.json(): 응답 본문을 JSON 객체로 변환하며 기다림
   *
   * 2. renderList(items, container)
   *    - 데이터 배열을 받아 ul/li 목록을 만들어 container에 출력하는 함수
   *    - document.createElement로 ul, li 생성 (textContent 사용 → XSS 안전)
   *    - 각 li에는 "이름 (이메일)" 형태로 표시
   *
   * 3. main()
   *    - 위 두 함수를 조합하는 진입점. try/catch로 네트워크/HTTP 오류를 처리하고
   *      실패 시 화면에 오류 메시지를 출력한다.
   */

  // 1. URL로 요청을 보내고 JSON 데이터를 반환하는 재사용 가능한 비동기 함수
  async function fetchJson(url) {
      const response = await fetch(url);           // 요청 전송 후 응답 대기
      if (!response.ok) {                          // HTTP 오류 상태 검사
          throw new Error(`요청 실패: ${response.status}`);
      }
      return await response.json();                // 본문을 JSON으로 변환
  }

  // 2. 사용자 배열을 ul, li 태그로 만들어 화면에 출력하는 함수
  function renderList(users, container) {
      const ul = document.createElement('ul');     // ul 태그 생성
      users.forEach(({ name, email }) => {         // 이름, 이메일만 구조분해
          const li = document.createElement('li'); // li 태그 생성
          li.textContent = `${name} - (${email})`;   // 텍스트로 안전하게 삽입
          ul.appendChild(li);                      // ul에 li 추가
      });
      container.replaceChildren(ul);               // 기존 내용을 교체하여 출력
  }

  // 3. 진입점: 데이터 요청 → 화면 출력
  async function main() {
      const container = document.getElementById('result');
      try {
          const users = await fetchJson('https://jsonplaceholder.typicode.com/users');
          renderList(users, container);
      } catch (error) {
          container.textContent = `오류가 발생했습니다: ${error.message}`;
      }
  }

  main();
})();
