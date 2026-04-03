const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let width = window.innerWidth;
let height = window.innerHeight;
let dpr = Math.min(window.devicePixelRatio || 1, 2);

let textParticles = [];
let ambientParticles = [];
let clickWaves = [];

const mouse = {
  x: width * 0.5,
  y: height * 0.5,
  lastX: width * 0.5,
  lastY: height * 0.5,
  vx: 0,
  vy: 0,
  radius: 105,
  moved: false
};

const SETTINGS = {
  text: "Luis Miraglio",
  gap: window.innerWidth < 768 ? 4 : 5,
  ambientCount: window.innerWidth < 768 ? 48 : 70,
  connectionDistance: window.innerWidth < 768 ? 52 : 62,
  spring: 0.26,
  friction: 0.76,
  mouseForce: 1.45,
  moveBoost: 0.62,
  clickForce: 18,
  clickRadius: 260
};

function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  mouse.x = width * 0.5;
  mouse.y = height * 0.5;
  mouse.lastX = mouse.x;
  mouse.lastY = mouse.y;

  SETTINGS.gap = width < 768 ? 4 : 5;
  SETTINGS.ambientCount = width < 768 ? 48 : 70;
  SETTINGS.connectionDistance = width < 768 ? 52 : 62;
  mouse.radius = width < 768 ? 82 : 105;

  buildScene();
}

function createTextMap() {
  const off = document.createElement("canvas");
  const offCtx = off.getContext("2d");

  off.width = width;
  off.height = height;

  const isMobile = width < 768;
  const fontSize = isMobile
    ? Math.min(width * 0.14, 62)
    : Math.min(width * 0.11, 126);

  const textY = isMobile ? height / 2 - 10 : height / 2 - 26;

  offCtx.clearRect(0, 0, width, height);
  offCtx.fillStyle = "#ffffff";
  offCtx.textAlign = "center";
  offCtx.textBaseline = "middle";
  offCtx.font = `800 ${fontSize}px Inter, Arial, sans-serif`;
  offCtx.fillText(SETTINGS.text, width / 2, textY);

  return offCtx.getImageData(0, 0, width, height);
}

function buildTextParticles() {
  textParticles = [];
  const imageData = createTextMap();
  const data = imageData.data;
  const gap = SETTINGS.gap;

  for (let y = 0; y < height; y += gap) {
    for (let x = 0; x < width; x += gap) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3];

      if (alpha > 150) {
        textParticles.push({
          x: x + (Math.random() - 0.5) * (width < 768 ? 4 : 8),
          y: y + (Math.random() - 0.5) * (width < 768 ? 4 : 8),
          baseX: x,
          baseY: y,
          vx: 0,
          vy: 0,
          size: Math.random() * 1.1 + 1.05,
          alpha: Math.random() * 0.35 + 0.65
        });
      }
    }
  }
}

function buildAmbientParticles() {
  ambientParticles = [];

  for (let i = 0; i < SETTINGS.ambientCount; i++) {
    ambientParticles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.14,
      vy: (Math.random() - 0.5) * 0.14,
      size: Math.random() * 1.5 + 0.6,
      alpha: Math.random() * 0.18 + 0.05
    });
  }
}

function buildScene() {
  buildTextParticles();
  buildAmbientParticles();
  clickWaves = [];
}

function updateTextParticles() {
  const mouseSpeed = Math.hypot(mouse.vx, mouse.vy);
  const dynamicRadius = mouse.radius + Math.min(mouseSpeed * 18, 60);

  for (const p of textParticles) {
    const dx = p.x - mouse.x;
    const dy = p.y - mouse.y;
    const distance = Math.hypot(dx, dy) || 0.001;

    if (distance < dynamicRadius) {
      const force = (1 - distance / dynamicRadius) * SETTINGS.mouseForce;
      const angle = Math.atan2(dy, dx);

      p.vx += Math.cos(angle) * force * 8.5;
      p.vy += Math.sin(angle) * force * 8.5;

      p.vx += mouse.vx * SETTINGS.moveBoost * force;
      p.vy += mouse.vy * SETTINGS.moveBoost * force;
    }

    for (const wave of clickWaves) {
      const cdx = p.x - wave.x;
      const cdy = p.y - wave.y;
      const cDist = Math.hypot(cdx, cdy) || 0.001;

      if (cDist < wave.radius) {
        const clickForce = (1 - cDist / wave.radius) * wave.power;
        const clickAngle = Math.atan2(cdy, cdx);

        p.vx += Math.cos(clickAngle) * clickForce;
        p.vy += Math.sin(clickAngle) * clickForce;
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

function drawTextParticles() {
  ctx.save();

  for (const p of textParticles) {
    ctx.shadowBlur = 14;
    ctx.shadowColor = `rgba(112, 225, 255, ${0.5 * p.alpha})`;
    ctx.fillStyle = `rgba(241, 246, 255, ${p.alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(139, 92, 246, ${0.14 * p.alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function updateAmbientParticles() {
  for (const p of ambientParticles) {
    p.x += p.vx;
    p.y += p.vy;

    if (p.x < -20) p.x = width + 20;
    if (p.x > width + 20) p.x = -20;
    if (p.y < -20) p.y = height + 20;
    if (p.y > height + 20) p.y = -20;
  }
}

function drawAmbientParticles() {
  for (const p of ambientParticles) {
    ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawConnections() {
  for (let i = 0; i < ambientParticles.length; i++) {
    const a = ambientParticles[i];

    for (let j = i + 1; j < ambientParticles.length; j++) {
      const b = ambientParticles[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.hypot(dx, dy);

      if (dist < SETTINGS.connectionDistance) {
        const alpha = (1 - dist / SETTINGS.connectionDistance) * 0.04;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }
}

function drawMouseGlow() {
  const radius = width < 768 ? mouse.radius * 0.9 : mouse.radius * 1.05;
  const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, radius);
  gradient.addColorStop(0, "rgba(112, 225, 255, 0.18)");
  gradient.addColorStop(0.45, "rgba(139, 92, 246, 0.08)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function updateClickWaves() {
  clickWaves = clickWaves.filter((wave) => wave.life > 0);

  for (const wave of clickWaves) {
    wave.radius += width < 768 ? 28 : 38;
    wave.life -= 1;
    wave.power *= width < 768 ? 0.86 : 0.84;
  }
}

function drawClickWaves() {
  for (const wave of clickWaves) {
    const alpha = wave.life / wave.maxLife;

    ctx.strokeStyle = `rgba(112, 225, 255, ${alpha * 0.55})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(139, 92, 246, ${alpha * 0.28})`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.radius * 0.58, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function animate() {
  ctx.clearRect(0, 0, width, height);

  updateAmbientParticles();
  drawConnections();
  drawAmbientParticles();

  drawMouseGlow();

  updateClickWaves();
  drawClickWaves();

  updateTextParticles();
  drawTextParticles();

  mouse.vx *= 0.78;
  mouse.vy *= 0.78;

  requestAnimationFrame(animate);
}

function updateMousePosition(x, y) {
  mouse.vx = x - mouse.lastX;
  mouse.vy = y - mouse.lastY;
  mouse.lastX = x;
  mouse.lastY = y;
  mouse.x = x;
  mouse.y = y;
  mouse.moved = true;
}

function triggerClickEffect(x, y) {
  clickWaves.push({
    x,
    y,
    radius: 22,
    power: SETTINGS.clickForce,
    life: 8,
    maxLife: 8
  });

  if (clickWaves.length > 4) {
    clickWaves.shift();
  }
}

window.addEventListener("mousemove", (e) => {
  updateMousePosition(e.clientX, e.clientY);
});

window.addEventListener("mousedown", (e) => {
  triggerClickEffect(e.clientX, e.clientY);
});

window.addEventListener(
  "touchmove",
  (e) => {
    const touch = e.touches[0];
    if (!touch) return;
    updateMousePosition(touch.clientX, touch.clientY);
  },
  { passive: true }
);

window.addEventListener(
  "touchstart",
  (e) => {
    const touch = e.touches[0];
    if (!touch) return;
    updateMousePosition(touch.clientX, touch.clientY);
    triggerClickEffect(touch.clientX, touch.clientY);
  },
  { passive: true }
);

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
animate();