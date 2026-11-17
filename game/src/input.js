// input.js — one small input state object: mouse position and clicks, the wheel,
// and the keyboard. The game loop consumes it exactly the same way whether the
// events come from a player's hand or from the scripted play test, so the test
// exercises the real input path.

export const input = {
  x: 0, y: 0, inside: false,
  clicked: false, rClicked: false,
  wheel: 0,                 // accumulated wheel delta since last frame
  keys: new Set(),          // currently held
  pressed: new Set(),       // went down this frame
};

export function bindInput(canvas, dom) {
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    input.x = (e.clientX - r.left) * (canvas.width / r.width);
    input.y = (e.clientY - r.top) * (canvas.height / r.height);
  };
  dom.addEventListener('mousemove', (e) => { pos(e); input.inside = true; });
  dom.addEventListener('mouseleave', () => { input.inside = false; });
  dom.addEventListener('mousedown', (e) => {
    pos(e);
    if (e.button === 0) input.clicked = true;
    if (e.button === 2) input.rClicked = true;
  });
  dom.addEventListener('contextmenu', (e) => e.preventDefault());
  dom.addEventListener('wheel', (e) => { input.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  window.addEventListener('keydown', (e) => {
    if (!e.repeat) input.pressed.add(e.code);
    input.keys.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => input.keys.delete(e.code));
}

// Called once at the end of every frame: per-frame signals reset, held keys stay.
export function endFrame() {
  input.clicked = false;
  input.rClicked = false;
  input.wheel = 0;
  input.pressed.clear();
}
