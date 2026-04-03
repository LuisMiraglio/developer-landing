const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { alpha: true });
const titleEl = document.getElementById("heroTitle");

let width = window.innerWidth;
let height = window.innerHeight;
let dpr = Math.min(window.devicePixelRatio || 1, 2);

let textParticles = [];
let clickRipples = [];
let nameBounds = null;

const mouse = {
  x: width * 0.5,
  y: height * 0.5,
  lastX: width * 0.5,
  lastY: height * 0.5,
  vx: 0,
  vy: 0,
  radius: 96
};

const SETTINGS = {
  text: "Luis Miraglio",
  spring: 0.145,
  friction: 0.82,
  basePush: 1.05,
  moveBoost: 0.28,
  clickForceDesktop: 9.5,
  clickForceMobile: 6.5,
  rippleGrowthDesktop: 18,
  rippleGrowthMobile: 14,
  gapDesktop: 5,
  gapMobile: 7,
  maxParticlesDesktop: 3800,
  maxParticlesMobile: 2400
};

function isMobile() {
  return width <= 768;
}

function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  mouse.x = width * 0.5;
  mouse.y = height * 0.5;
  mouse.lastX = mouse.x;
  mouse.lastY = mouse.y;
  mouse.radius = isMobile() ? 78 : 96;

  buildTextParticles();
}

function getTitleBounds() {
  const rect = titleEl.getBoundingClientRect();
  const padX = isMobile() ? 12 : 26;
  const padY = isMobile() ? 10 : 14;

  return {
    x: Math.max(0, Math.floor(rect.left - padX)),
    y: Math.max(0, Math.floor(rect.top - padY)),
    width: Math.min(width, Math.ceil(rect.width + padX * 2)),
    height: Math.min(height, Math.ceil(rect.height + padY * 2))
  };
}

function createNameMap(bounds) {
  const off = document.createElement("canvas");
  const offCtx = off.getContext("2d");

  off.width = Math.max(1, bounds.width);
  off.height = Math.max(1, bounds.height);

  const mobile = isMobile();
  offCtx.clearRect(0, 0, off.width, off.height);
  offCtx.fillStyle = "#ffffff";
  offCtx.textAlign = "center";
  offCtx.textBaseline = "middle";

  const fontSize = mobile
    ? Math.min(bounds.width * 0.16, bounds.height * 0.46)
    : Math.min(bounds.width * 0.15, bounds.height * 0.68);

  offCtx.font = `800 ${fontSize}px Inter, Arial, sans-serif`;

  if (mobile && bounds.width < 520) {
    const lineGap = fontSize * 0.82;
    offCtx.fillText("Luis", off.width / 2, off.height / 2 - lineGap / 2);
    offCtx.fillText("Miraglio", off.width / 2, off.height / 2 + lineGap / 2);
  } else {
    offCtx.fillText(SETTINGS.text, off.width / 2, off.height / 2);
  }

  return offCtx.getImageData(0, 0, off.width, off.height);
}

function buildTextParticles() {
  nameBounds = getTitleBounds();
  const imageData = createNameMap(nameBounds);
  const data = imageData.data;
  const mapWidth = imageData.width;
  const mapHeight = imageData.height;

  const gap = isMobile() ? SETTINGS.gapMobile : SETTINGS.gapDesktop;
  const maxParticles = isMobile() ? SETTINGS.maxParticlesMobile : SETTINGS.maxParticlesDesktop;

  const candidates = [];

  for (let y = 0; y < mapHeight; y += gap) {
    for (let x = 0; x < mapWidth; x += gap) {
      const alpha = data[(y * mapWidth + x) * 4 + 3];

      if (alpha > 120) {
        candidates.push({ x, y });
      }
    }
  }

  let stride = 1;
  if (candidates.length > maxParticles) {
    stride = Math.ceil(candidates.length / maxParticles);
  }

  textParticles = [];

  for (let i = 0; i < candidates.length; i += stride) {
    const point = candidates[i];
    const baseX = nameBounds.x + point.x;
    const baseY = nameBounds.y + point.y;

    textParticles.push({
      x: baseX + (Math.random() - 0.5) * (isMobile() ? 1.8 : 2.4),
      y: baseY + (Math.random() - 0.5) * (isMobile() ? 1.8 : 2.4),
      baseX,
      baseY,
      vx: 0,
      vy: 0,
      size: isMobile() ? Math.random() * 0.45 + 1.1 : Math.random() * 0.6 + 1.05,
      alpha: Math.random() * 0.35 + 0.62
    });
  }
}

function updateParticles() {
  const speed = Math.hypot(mouse.vx, mouse.vy);
  const dynamicRadius = mouse.radius + Math.min(speed * 10, isMobile() ? 20 : 35);

  for (const p of textParticles) {
    const dx = p.x - mouse.x;
    const dy = p.y - mouse.y;
    const dist = Math.hypot(dx, dy) || 0.001;

    if (dist < dynamicRadius) {
      const power = (1 - dist / dynamicRadius) * SETTINGS.basePush;
      const angle = Math.atan2(dy, dx);

      p.vx += Math.cos(angle) * power * 4.4;
      p.vy += Math.sin(angle) * power * 4.4;

      p.vx += mouse.vx * SETTINGS.moveBoost * power;
      p.vy += mouse.vy * SETTINGS.moveBoost * power;
    }

    for (const ripple of clickRipples) {
      const rx = p.x - ripple.x;
      const ry = p.y - ripple.y;
      const rDist = Math.hypot(rx, ry) || 0.001;

      if (rDist < ripple.radius) {
        const ripplePower = (1 - rDist / ripple.radius) * ripple.power;
        const angle = Math.atan2(ry, rx);
        p.vx += Math.cos(angle) * ripplePower;
        p.vy += Math.sin(angle) * ripplePower;
      }
    }

    p.vx += (p.baseX - p.x) * SETTINGS.spring;
    p.vy += (p.baseY - p.y) * SETTINGS.spring;

    p.vx *= SETTINGS.friction;
    p.vy *= SETTINGS.friction;

    p.x += p.vx;
    p.y += p.vy;
  }
}

function drawParticles() {
  for (const p of textParticles) {
    ctx.shadowBlur = 10;
    ctx.shadowColor = `rgba(117, 222, 255, ${0.28 * p.alpha})`;

    ctx.fillStyle = `rgba(236, 243, 255, ${p.alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(154, 124, 255, ${0.1 * p.alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function updateRipples() {
  const growth = isMobile() ? SETTINGS.rippleGrowthMobile : SETTINGS.rippleGrowthDesktop;
  clickRipples = clickRipples.filter((r) => r.life > 0.01);

  for (const ripple of clickRipples) {
    ripple.radius += growth;
    ripple.power *= 0.89;
    ripple.life *= 0.84;
  }
}

function drawRipples() {
  for (const ripple of clickRipples) {
    ctx.strokeStyle = `rgba(117, 222, 255, ${ripple.life * 0.42})`;
    ctx.lineWidth = isMobile() ? 1.5 : 1.8;
    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(154, 124, 255, ${ripple.life * 0.22})`;
    ctx.lineWidth = isMobile() ? 3.5 : 4.2;
    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, ripple.radius * 0.64, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawMouseAura() {
  const auraRadius = isMobile() ? mouse.radius * 0.9 : mouse.radius;
  const aura = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, auraRadius);
  aura.addColorStop(0, "rgba(117, 222, 255, 0.12)");
  aura.addColorStop(0.5, "rgba(154, 124, 255, 0.06)");
  aura.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, auraRadius, 0, Math.PI * 2);
  ctx.fill();
}

function animate() {
  ctx.clearRect(0, 0, width, height);

  drawMouseAura();
  updateRipples();
  drawRipples();
  updateParticles();
  drawParticles();

  mouse.vx *= 0.76;
  mouse.vy *= 0.76;

  requestAnimationFrame(animate);
}

function updatePointerPosition(x, y) {
  mouse.vx = x - mouse.lastX;
  mouse.vy = y - mouse.lastY;
  mouse.lastX = x;
  mouse.lastY = y;
  mouse.x = x;
  mouse.y = y;
}

function triggerRipple(x, y) {
  clickRipples.push({
    x,
    y,
    radius: isMobile() ? 14 : 18,
    power: isMobile() ? SETTINGS.clickForceMobile : SETTINGS.clickForceDesktop,
    life: 1
  });

  if (clickRipples.length > 4) {
    clickRipples.shift();
  }
}

window.addEventListener("mousemove", (event) => {
  updatePointerPosition(event.clientX, event.clientY);
});

window.addEventListener("mousedown", (event) => {
  triggerRipple(event.clientX, event.clientY);
});

window.addEventListener(
  "touchstart",
  (event) => {
    const touch = event.touches[0];
    if (!touch) return;
    updatePointerPosition(touch.clientX, touch.clientY);
    triggerRipple(touch.clientX, touch.clientY);
  },
  { passive: true }
);

window.addEventListener(
  "touchmove",
  (event) => {
    const touch = event.touches[0];
    if (!touch) return;
    updatePointerPosition(touch.clientX, touch.clientY);
  },
  { passive: true }
);

window.addEventListener("resize", () => {
  resizeCanvas();
});

resizeCanvas();
animate();
