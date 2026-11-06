(() => {
  'use strict';

  const user = {
      name: "홍길동",
      age: 20,
      hobby: "코딩",
      address: "서울시 강남구"
  }

  // 닷(.) 접근법
  console.log(user.name)

  // 대괄호 접근법
  console.log(user["age"])

  // 값이 있으면 수정, 없으면 추가
  console.log(user)
  user.name = "김길동"
  user.phone = "010-1234-5678"
  console.log(user)
})();
