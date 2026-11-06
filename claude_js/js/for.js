(() => {
  'use strict';

  for(let i = 0; i < 10; i++){
      console.log("홍길동")
  }

  for(let i = 0; i < 10; i++){
      console.log("123412341234")
  }

  for(let i = 0; i <= 100; i += 2){
      console.log(i)
  }

  // 1~100까지 짝수만 누적
  let sum = 0
  for(let i = 0; i <= 100; i+=2){
      sum += i
  }
  console.log(sum)

  // 1~100까지중 7의 배수를 출력하세요.

  // 2단 ~ 9단까지 구구단 만들기
  for(let i = 0; i < 8; i++){
      let dan = i + 2
      for(let j = 0; j < 9; j++){
          let value = j + 1
          console.log(`${dan} * ${value} = ${dan * value}`)
      }
  }
})();
