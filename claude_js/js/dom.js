(() => {
  'use strict';

  // //console.log(document.getElementById("claude"))
  // const h1 = document.getElementById("claude")
  // h1.innerText = "안녕!"

  // // DOM을 이용해서 이름을 변경하기
  // // 단, 클래스를 활용하기!
  // const name = document.getElementsByClassName("name")[0]
  // console.log(name)
  // name.innerText = "김철수"

  // 이벤트, 화면 조작
  const button = document.querySelector("button")
  const p = document.querySelector("p")

  button.addEventListener("click", (e) => {
      // console.log(e)
      // console.log("버튼 눌림!")
      p.innerText = "김길동"
  })
})();
