(function () {
  var list = document.getElementById('daisyList');
  var reward = document.getElementById('daisyReward');
  if (!list) return;

  var dragging = null;
  var grabOffsetY = 0;

  function naturalRectOf(el) {
    el.style.transform = 'none';
    return el.getBoundingClientRect();
  }

  var SWAP_THRESHOLD = 0.25;

  function updateDrag(clientY) {
    var naturalRect = naturalRectOf(dragging);
    var desiredTop = clientY - grabOffsetY;
    var ty = desiredTop - naturalRect.top;
    dragging.style.transform = 'translateY(' + ty + 'px)';

    var draggedCenter = desiredTop + naturalRect.height / 2;

    var next = dragging.nextElementSibling;
    if (next) {
      var nRect = next.getBoundingClientRect();
      if (draggedCenter > nRect.top + nRect.height * SWAP_THRESHOLD) {
        list.insertBefore(next, dragging);
        updateDrag(clientY);
        return;
      }
    }

    var prev = dragging.previousElementSibling;
    if (prev) {
      var pRect = prev.getBoundingClientRect();
      if (draggedCenter < pRect.top + pRect.height * (1 - SWAP_THRESHOLD)) {
        list.insertBefore(dragging, prev);
        updateDrag(clientY);
        return;
      }
    }
  }

  function checkOrder() {
    if (!reward) return;
    var order = Array.prototype.map.call(
      list.querySelectorAll('.daisy-block'),
      function (el) { return el.dataset.daisy; }
    );
    var gi = order.indexOf('green');
    var solved = false;
    if (gi > 0 && gi < order.length - 1) {
      var prev = order[gi - 1], next = order[gi + 1];
      solved = (prev === 'yellow' && next === 'blue') || (prev === 'blue' && next === 'yellow');
    }
    reward.classList.toggle('open', solved);
  }

  list.addEventListener('pointerdown', function (e) {
    var handle = e.target.closest('.daisy-drag-handle');
    if (!handle) return;
    var block = handle.closest('.daisy-block');
    if (!block) return;

    dragging = block;
    dragging.classList.add('dragging');
    handle.setPointerCapture(e.pointerId);

    var rect = dragging.getBoundingClientRect();
    grabOffsetY = e.clientY - rect.top;
    e.preventDefault();
  });

  list.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    updateDrag(e.clientY);
  });

  function endDrag() {
    if (!dragging) return;
    dragging.style.transform = '';
    dragging.classList.remove('dragging');
    dragging = null;
    checkOrder();
  }
  list.addEventListener('pointerup', endDrag);
  list.addEventListener('pointercancel', endDrag);

  list.addEventListener('click', function (e) {
    if (e.target.closest('.daisy-drag-handle')) return;
    if (e.target.closest('a')) return;
    var block = e.target.closest('.daisy-block');
    if (!block) return;
    block.classList.toggle('expanded');
  });
})();
