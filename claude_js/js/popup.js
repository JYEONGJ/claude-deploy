(() => {
  'use strict';

  const renameBtn = document.querySelector('.rename-btn');
  const modalOverlay = document.getElementById('modalOverlay');

  // 버튼 클릭시 팝업 표시
  renameBtn.addEventListener('click', function() {
      modalOverlay.classList.add('active');
  });

  // 배경 클릭시 팝업 닫기
  modalOverlay.addEventListener('click', function(event) {
      if (event.target === modalOverlay) {
          modalOverlay.classList.remove('active');
      }
  });
})();
