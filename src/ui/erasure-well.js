import { encode } from "../save.js";
export class ErasureSequence {
  constructor() {
    this.reset();
  }
  reset() {
    this.stage = "SEALED";
    this.started = null;
  }
  breakSeal() {
    if (this.stage !== "SEALED") return false;
    this.stage = "OPEN";
    return true;
  }
  hold(now) {
    if (this.stage !== "OPEN") return false;
    this.started = now;
    return true;
  }
  release(now) {
    if (this.started === null) return false;
    const ready = now - this.started >= 2500;
    this.started = null;
    if (ready) this.stage = "ARMED";
    return ready;
  }
  cancel() {
    this.started = null;
  }
  erase(s, storage) {
    if (this.stage !== "ARMED") return false;
    // A backup failure aborts before deleting anything. Progression resets never use this API.
    const snapshot = encode(s);
    storage.setItem("accretion.emergency.pre-erasure", snapshot);
    storage.removeItem("accretion.save.v3");
    storage.removeItem("accretion.save.v2");
    this.reset();
    return true;
  }
}
export function mountErasure(world, getState, onErase, blocked) {
  world.insertAdjacentHTML(
    "beforeend",
    `<section id="erasure" class="erasure" data-gesture><small>DISCONNECTED APPARATUS · NO PRODUCTION</small><div class="well-eye">⊘</div><h2>Erasure Well</h2><p>All progress ends here. Anchor, Convergence and every discovery will be erased.</p><strong id="well-stage">SAFETY SEALED</strong><button id="well-seal">BREAK SAFETY SEAL</button><button id="well-hold" hidden>HOLD 2.5s, THEN RELEASE TO ARM</button><button id="well-final" hidden>ERASE ALL PROGRESS</button><button id="well-safe">Restore safety seal</button><p id="well-message"></p></section>`,
  );
  const $ = (id) => document.getElementById(id),
    sequence = new ErasureSequence();
  let pointer = null;
  const render = () => {
    $("well-stage").textContent = sequence.stage;
    $("erasure").dataset.stage = sequence.stage;
    $("well-seal").hidden = sequence.stage !== "SEALED";
    $("well-hold").hidden = sequence.stage !== "OPEN";
    $("well-final").hidden = sequence.stage !== "ARMED";
  };
  $("well-seal").onclick = () => {
    if (!blocked()) {
      sequence.breakSeal();
      render();
    }
  };
  $("well-safe").onclick = () => {
    sequence.reset();
    render();
  };
  $("well-hold").onpointerdown = (e) => {
    if (blocked() || e.button !== 0) return;
    e.preventDefault();
    pointer = e.pointerId;
    e.currentTarget.setPointerCapture(pointer);
    sequence.hold(performance.now());
    $("well-stage").textContent = "HOLDING · RELEASE EARLY TO CANCEL";
  };
  $("well-hold").onpointerup = (e) => {
    if (e.pointerId !== pointer) return;
    pointer = null;
    sequence.release(performance.now());
    render();
  };
  for (const t of ["pointercancel", "lostpointercapture"])
    $("well-hold").addEventListener(t, () => {
      if (pointer !== null) {
        pointer = null;
        sequence.cancel();
        render();
      }
    });
  $("well-hold").onkeydown = (e) => {
    if (e.code === "Space" && !e.repeat && !blocked()) {
      e.preventDefault();
      sequence.hold(performance.now());
    }
  };
  $("well-hold").onkeyup = (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      sequence.release(performance.now());
      render();
    }
  };
  $("well-hold").onblur = () => sequence.cancel();
  $("well-final").onclick = () => {
    if (blocked()) return;
    try {
      if (sequence.erase(getState(), localStorage)) {
        onErase();
        render();
      }
    } catch {
      $("well-message").textContent =
        "Backup could not be stored. Erasure cancelled.";
      sequence.reset();
      render();
    }
  };
  return {
    get holding() {
      return sequence.started !== null;
    },
    seal: () => {
      sequence.reset();
      render();
    },
  };
}
