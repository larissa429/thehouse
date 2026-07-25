document.addEventListener('DOMContentLoaded', function () {

  // ---- popup notes ----
  const overlay = document.getElementById('note-overlay');
  const noteEl = document.getElementById('note-content');
  const noteBody = document.getElementById('note-body');
  const closeBtn = document.getElementById('note-close');
  if (overlay) {
    document.querySelectorAll('.connection-pin[data-color]').forEach(function (pin) {
      pin.addEventListener('click', function () {
        const tpl = pin.querySelector('template');
        noteBody.innerHTML = '';
        if (tpl) noteBody.appendChild(tpl.content.cloneNode(true));
        noteEl.setAttribute('data-color', pin.getAttribute('data-color'));
        overlay.classList.add('open');
      });
    });
    function closeNote() { overlay.classList.remove('open'); }
    closeBtn.addEventListener('click', closeNote);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeNote(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNote(); });
  }

  // ---- strings + pin dots: independent layers, so stacking is
  // always photos < strings < dots, no matter what -------------
  document.querySelectorAll('.connections-board').forEach(function (board) {
    const svg = board.querySelector('.connections-strings');
    const selfPin = board.querySelector('.connection-self');
    if (!svg || !selfPin) return;

    let dotLayer = board.querySelector('.connections-dots');
    if (!dotLayer) {
      dotLayer = document.createElement('div');
      dotLayer.className = 'connections-dots';
      board.appendChild(dotLayer);
    }

    function centerOf(pin) {
      const r = pin.getBoundingClientRect();
      const b = board.getBoundingClientRect();
      return { x: r.left + r.width / 2 - b.left, y: r.top - b.top };
    }

    function placeDot(x, y) {
      const dot = document.createElement('span');
      dot.className = 'connection-dot';
      dot.style.left = x + 'px';
      dot.style.top = y + 'px';
      dotLayer.appendChild(dot);
    }

    function draw() {
      const b = board.getBoundingClientRect();
      svg.setAttribute('viewBox', '0 0 ' + b.width + ' ' + b.height);
      svg.innerHTML = '';
      dotLayer.innerHTML = '';

      const from = centerOf(selfPin);
      placeDot(from.x, from.y);

    board.querySelectorAll('.connection-pin[data-color]').forEach(function (pin) {
        const to = centerOf(pin);
        if (!pin.hasAttribute('data-no-line')) {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', from.x);
          line.setAttribute('y1', from.y);
          line.setAttribute('x2', to.x);
          line.setAttribute('y2', to.y);
          svg.appendChild(line);
        }
        placeDot(to.x, to.y);
      });
    }

    window.addEventListener('load', draw);
    window.addEventListener('resize', draw);
    draw();
  });
});