const scenes = [...document.querySelectorAll(".scene")];
const dots = [...document.querySelectorAll(".progress-dot")];
const envelope = document.querySelector(".envelope");
const replayButton = document.querySelector(".replay-button");
const music = document.getElementById("background-music");
const musicToggle = document.querySelector(".music-toggle");
const canvas = document.getElementById("motes");
const ctx = canvas.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobileQuery = window.matchMedia("(max-width: 760px)");
let envelopeOpening = false;
let targetSceneId = "letter";
let scrollRevealLockUntil = 0;
let revealTimer = 0;
let musicStarted = false;
let musicPlayPending = false;
let activeSceneIndex = 0;
let controlledPaging = false;
let pagingUnlockTimer = 0;
let wheelDeltaY = 0;
let wheelResetTimer = 0;
let touchStartY = 0;
let touchStartX = 0;
let touchStartTime = 0;
const wheelThreshold = 72;
const pagingLockMs = reduceMotion ? 300 : 980;
const moteCount = mobileQuery.matches ? 18 : 42;

if (music) {
  music.volume = 0.46;
}

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

if (document.body.classList.contains("is-locked")) {
  window.scrollTo(0, 0);
}

function pinToLetterStart() {
  if (!document.body.classList.contains("is-locked")) return;
  window.scrollTo(0, 0);
  setActiveScene("letter");
}

window.addEventListener("load", () => {
  pinToLetterStart();
  window.setTimeout(pinToLetterStart, 60);
  window.setTimeout(pinToLetterStart, 180);
  requestAnimationFrame(pinToLetterStart);
});

const observer = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) setActiveScene(visible.target.id);
  },
  { threshold: 0.62 }
);

scenes.forEach((scene) => observer.observe(scene));

function setActiveScene(id) {
  targetSceneId = id;
  scenes.forEach((scene, index) => {
    const isActive = scene.id === id;
    scene.classList.toggle("is-visible", isActive || scene.id === "letter");
    dots[index]?.classList.toggle("is-active", isActive);
    if (isActive) activeSceneIndex = index;
  });
}

function unlockLetter() {
  if (envelopeOpening || envelope?.classList.contains("is-open")) return;
  envelopeOpening = true;
  envelope?.classList.add("is-open");
  if (!musicStarted) playMusic();
  window.setTimeout(() => {
    document.body.classList.add("is-opening");
  }, reduceMotion ? 20 : 520);
  window.setTimeout(() => {
    document.body.classList.remove("is-locked");
    scrollToScene("watch", { behavior: "auto", revealDelay: reduceMotion ? 0 : 620 });
  }, reduceMotion ? 40 : 1180);
  window.setTimeout(() => {
    document.body.classList.remove("is-opening");
    envelopeOpening = false;
  }, reduceMotion ? 80 : 1900);
}

function scrollToScene(id, options = {}) {
  const scene = document.getElementById(id);
  if (!scene) return;
  const revealDelay = options.revealDelay || 0;
  window.clearTimeout(revealTimer);
  if (revealDelay > 0) {
    scrollRevealLockUntil = performance.now() + revealDelay;
  } else {
    setActiveScene(id);
  }
  const top = scene.offsetTop;
  const behavior = options.behavior || (reduceMotion || mobileQuery.matches ? "auto" : "smooth");
  const forceInstant = behavior === "auto";
  requestAnimationFrame(() => {
    if (forceInstant) {
      jumpTo(top);
    } else {
      window.scrollTo({ top, behavior });
    }
  });
  window.setTimeout(() => {
    if (Math.abs(window.scrollY - top) > window.innerHeight * 0.28) {
      jumpTo(top);
    }
  }, reduceMotion ? 80 : 120);
  revealTimer = window.setTimeout(() => {
    setActiveScene(id);
  }, revealDelay + (reduceMotion ? 80 : 120));
}

function jumpTo(top) {
  const root = document.documentElement;
  const previousBehavior = root.style.scrollBehavior;
  const previousSnap = root.style.scrollSnapType;
  root.style.scrollBehavior = "auto";
  root.style.scrollSnapType = "none";
  window.scrollTo(0, top);
  if (document.scrollingElement) document.scrollingElement.scrollTop = top;
  requestAnimationFrame(() => {
    root.style.scrollBehavior = previousBehavior;
    root.style.scrollSnapType = previousSnap;
  });
}

envelope?.addEventListener("pointerdown", () => {
  if (!musicStarted && !envelope?.classList.contains("is-open")) playMusic();
});
envelope?.addEventListener("click", unlockLetter);

function syncMusicButton() {
  const isPlaying = !!music && !music.paused && !music.ended;
  musicToggle?.classList.toggle("is-playing", isPlaying);
  musicToggle?.setAttribute("aria-pressed", String(isPlaying));
  musicToggle?.setAttribute("aria-label", isPlaying ? "暂停音乐" : "播放音乐");
}

function playMusic() {
  if (!music) return;
  if (!music.paused && !music.ended) {
    syncMusicButton();
    return;
  }
  if (musicPlayPending) return;
  musicStarted = true;
  musicPlayPending = true;
  music.dataset.playError = "";
  const playPromise = music.play();
  if (playPromise) {
    playPromise
      .then(() => {
        musicPlayPending = false;
        syncMusicButton();
      })
      .catch((error) => {
        musicPlayPending = false;
        music.dataset.playError = `${error.name}: ${error.message}`;
        syncMusicButton();
      });
  } else {
    musicPlayPending = false;
    syncMusicButton();
  }
}

function toggleMusic() {
  if (!music) return;
  if (music.paused || music.ended) {
    playMusic();
    return;
  }
  music.pause();
  syncMusicButton();
}

musicToggle?.addEventListener("click", toggleMusic);
music?.addEventListener("play", syncMusicButton);
music?.addEventListener("pause", syncMusicButton);
music?.addEventListener("ended", syncMusicButton);

replayButton?.addEventListener("click", () => {
  envelopeOpening = false;
  controlledPaging = false;
  document.documentElement.classList.remove("is-mobile-paging");
  envelope?.classList.remove("is-open");
  document.body.classList.add("is-locked");
  document.body.classList.remove("is-opening");
  setActiveScene("letter");
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
});

dots.forEach((dot, index) => {
  dot.addEventListener("click", (event) => {
    event.preventDefault();
    const scene = scenes[index];
    if (!scene) return;
    if (index > 0 && document.body.classList.contains("is-locked")) {
      unlockLetter();
      return;
    }
    if (index === 0) {
      envelopeOpening = false;
      controlledPaging = false;
      document.documentElement.classList.remove("is-mobile-paging");
      envelope?.classList.remove("is-open");
      document.body.classList.add("is-locked");
      setActiveScene("letter");
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      return;
    }
    scrollToScene(scene.id);
  });
});

window.addEventListener("scroll", () => {
  if (document.body.classList.contains("is-locked")) {
    setActiveScene("letter");
    return;
  }
  if (controlledPaging || mobileQuery.matches) return;
  if (performance.now() < scrollRevealLockUntil) return;
  const index = Math.max(0, Math.min(scenes.length - 1, Math.round(window.scrollY / window.innerHeight)));
  const scene = scenes[index];
  if (scene && scene.id !== targetSceneId) setActiveScene(scene.id);
}, { passive: true });

function pageByStep(direction) {
  if (controlledPaging || document.body.classList.contains("is-locked")) return;
  const nextIndex = Math.max(1, Math.min(scenes.length - 1, activeSceneIndex + direction));
  if (nextIndex === activeSceneIndex) return;
  controlledPaging = true;
  wheelDeltaY = 0;
  window.clearTimeout(wheelResetTimer);
  scrollToScene(scenes[nextIndex].id, { behavior: "auto" });
  schedulePagingUnlock(scenes[nextIndex]);
}

function schedulePagingUnlock(scene, delay = pagingLockMs) {
  window.clearTimeout(pagingUnlockTimer);
  pagingUnlockTimer = window.setTimeout(() => {
    controlledPaging = false;
  }, delay);
}

window.addEventListener("wheel", (event) => {
  if (event.ctrlKey) return;
  if (document.body.classList.contains("is-locked")) {
    event.preventDefault();
    return;
  }

  const absY = Math.abs(event.deltaY);
  const absX = Math.abs(event.deltaX);
  if (absY < 1 || absX > absY * 1.25) return;

  event.preventDefault();
  if (controlledPaging) {
    const scene = scenes[activeSceneIndex];
    if (scene) schedulePagingUnlock(scene);
    return;
  }

  wheelDeltaY += event.deltaY;
  window.clearTimeout(wheelResetTimer);
  wheelResetTimer = window.setTimeout(() => {
    wheelDeltaY = 0;
  }, 180);

  if (Math.abs(wheelDeltaY) >= wheelThreshold) {
    pageByStep(wheelDeltaY > 0 ? 1 : -1);
  }
}, { passive: false });

window.addEventListener("touchstart", (event) => {
  if (!mobileQuery.matches || event.touches.length !== 1) return;
  touchStartY = event.touches[0].clientY;
  touchStartX = event.touches[0].clientX;
  touchStartTime = Date.now();
}, { passive: true });

window.addEventListener("touchmove", (event) => {
  if (!mobileQuery.matches || document.body.classList.contains("is-locked")) return;
  if (event.touches.length !== 1) return;
  const deltaY = event.touches[0].clientY - touchStartY;
  const deltaX = event.touches[0].clientX - touchStartX;
  if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 12) {
    event.preventDefault();
  }
}, { passive: false });

window.addEventListener("touchend", (event) => {
  if (!mobileQuery.matches || document.body.classList.contains("is-locked")) return;
  const touch = event.changedTouches[0];
  if (!touch) return;
  const deltaY = touch.clientY - touchStartY;
  const deltaX = touch.clientX - touchStartX;
  const elapsed = Math.max(Date.now() - touchStartTime, 1);
  const velocity = Math.abs(deltaY) / elapsed;
  if (Math.abs(deltaY) < 42 && velocity < 0.35) return;
  if (Math.abs(deltaY) <= Math.abs(deltaX) * 1.25) return;
  event.preventDefault();
  pageByStep(deltaY < 0 ? 1 : -1);
}, { passive: false });

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

const motes = Array.from({ length: moteCount }, () => ({
  x: Math.random(),
  y: Math.random(),
  r: Math.random() * 2.2 + 0.4,
  alpha: Math.random() * 0.18 + 0.05,
  hue: Math.random() > 0.28 ? "201, 147, 56" : "124, 166, 187",
}));

function draw() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";

  motes.forEach((mote) => {
    const x = mote.x * w;
    const y = mote.y * h;
    ctx.fillStyle = `rgba(${mote.hue}, ${mote.alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, mote.r * 2.8, 0, Math.PI * 2);
    ctx.fill();
  });
}

resizeCanvas();
draw();
window.addEventListener("resize", () => {
  resizeCanvas();
  draw();
});

if (!reduceMotion) {
  window.setTimeout(draw, 120);
}

syncMusicButton();
