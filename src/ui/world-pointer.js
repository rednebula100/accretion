// Camera gestures own a pointer only after starting on a non-interactive surface.
export function bindWorldPointer(root, camera, blocked, input) {
  let drag = null;
  const interactive =
    "button,input,select,textarea,dialog,a,[contenteditable],[data-copyable],[data-gesture]";
  const cleanup = (e) => {
    if (!drag || (e?.pointerId !== undefined && e.pointerId !== drag.id))
      return;
    const id = drag.id;
    drag = null;
    root.classList.remove("panning");
    if (root.hasPointerCapture(id)) root.releasePointerCapture(id);
  };
  root.addEventListener("dragstart", (e) => {
    if (!e.target.closest("[data-copyable]")) e.preventDefault();
  });
  root.addEventListener("pointerdown", (e) => {
    if (
      blocked() ||
      drag ||
      e.button !== 0 ||
      !e.isPrimary ||
      e.target.closest(interactive)
    )
      return;
    if (!camera.interrupt()) return;
    e.preventDefault();
    drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
    root.setPointerCapture(e.pointerId);
  });
  root.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (blocked()) return cleanup(e);
    e.preventDefault();
    if (
      !drag.moved &&
      Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 5
    )
      return;
    drag.moved = true;
    root.classList.add("panning");
    input(e.timeStamp);
    camera.pan(e.clientX - drag.x, e.clientY - drag.y);
    drag.x = e.clientX;
    drag.y = e.clientY;
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    root.addEventListener(type, cleanup);
  window.addEventListener("blur", () => cleanup());
  return cleanup;
}
