(() => {
  'use strict';

  // 함수의 선언
  function myFunc(num){
      return num * 3
  }

  // // 함수의 사용
  myFunc(10)


  // 두 수를 전달하면 두 수를 더해서 출력하는 함수
  function add(num1, num2){
      console.log(num1 + num2)
  }

  add(100, 200)

  // 성과 이름을 전달하면 풀 네임을 만들어서 반환(return)하는 함수
  function getFullname(lastName, firstName){
      return lastName + firstName
  }

  let name = getFullname("홍", "길동")
  console.log(name)

  // 숫자 1개를 전달받아서 홀수인지 짝수인지 확인 후 출력해주는 함수
  // ex) 
  // myFunc(3)
  // "홀수"
  // myFunc(4)
  // "짝수"
  function printOddOrEven(num){
      console.log(num % 2 === 0 ? "짝수" : "홀수")
  }

  printOddOrEven(12)
  printOddOrEven(11)
})();
