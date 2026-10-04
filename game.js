const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const splashScreen = document.getElementById('splashScreen');
const pauseOverlay = document.getElementById('pauseOverlay');
const caughtOverlay = document.getElementById('caughtOverlay');
const toastEl = document.getElementById('toast');
const resumeBtn = document.getElementById('resumeBtn');
const watchAdBtn = document.getElementById('watchAdBtn');

const game = {
  state: 'splash',
  width: 1920,
  height: 1080,
  lastTime: 0,
  spawnTimer: 1.2,
  score: 0,
  coins: 0,
  lvlSpeed: 380,
  minSpeed: 360,
  maxSpeed: 980,
  player: {
    lane: 1,
    x: 0,
    y: 0,
    targetY: 0,
    vy: 0,
    jumpPower: 760,
    height: 0,
    slideTimer: 0,
    shieldTimer: 0,
    throwCooldown: 0,
    invulnerable: 0,
    isJumping: false,
    isSliding: false,
  },
  obstacles: [],
  collectibles: [],
  particles: [],
  chaseMeter: 0.85,
  slowTimer: 0,
  adReady: true,
  uiText: 'Cheza! Cheza!',
  toastTimer: 0,
  lastNoiseAt: 0,
};

const laneCenters = [0.29, 0.5, 0.71];
const startupMessages = [
  'Cheza! Cheza!',
  'Kanjo! Kimbia!',
  'Weh Deree!',
  'Kimbia Nairobi!'
];

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  game.width = rect.width * dpr;
  game.height = rect.height * dpr;
  canvas.width = game.width;
  canvas.height = game.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function speak(text) {
  if ('speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.1;
    utter.pitch = 1.1;
    utter.volume = 0.7;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }
}

function toast(msg, duration = 1.5) {
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  game.toastTimer = duration;
  if (msg) {
    speak(msg);
  }
}

function updateToast(dt) {
  if (game.toastTimer > 0) {
    game.toastTimer -= dt;
    if (game.toastTimer <= 0) {
      toastEl.classList.add('hidden');
    }
  }
}

function setState(nextState) {
  game.state = nextState;
  splashScreen.classList.toggle('active', nextState === 'splash');
  splashScreen.classList.toggle('hidden', nextState !== 'splash');
  pauseOverlay.classList.toggle('hidden', nextState !== 'paused');
  caughtOverlay.classList.toggle('hidden', nextState !== 'caught');
}

function startGame() {
  resetGame();
  setState('playing');
  toast('Cheza! Cheza!', 1.6);
}

function resetGame() {
  game.score = 0;
  game.coins = 0;
  game.lvlSpeed = game.minSpeed;
  game.spawnTimer = 0.8;
  game.obstacles = [];
  game.collectibles = [];
  game.particles = [];
  game.chaseMeter = 0.82;
  game.slowTimer = 0;
  game.player.lane = 1;
  game.player.y = 0;
  game.player.vy = 0;
  game.player.slideTimer = 0;
  game.player.shieldTimer = 0;
  game.player.throwCooldown = 0;
  game.player.invulnerable = 0;
  game.player.isJumping = false;
  game.player.isSliding = false;
}

function spawnObstacle() {
  const lane = Math.floor(Math.random() * 3);
  const types = ['pothole', 'boda', 'mama', 'garbage', 'cone', 'mtumba'];
  const type = types[Math.floor(Math.random() * types.length)];
  game.obstacles.push({
    type,
    lane,
    z: 1.2,
    passed: false,
    bob: Math.random() * 100,
  });
}

function spawnCollectible() {
  const lane = Math.floor(Math.random() * 3);
  const types = ['smokie', 'mayai', 'ketchup', 'shield'];
  const type = types[Math.floor(Math.random() * types.length)];
  game.collectibles.push({
    type,
    lane,
    z: 1.2,
    value: 0,
    bob: Math.random() * 100,
  });
}

function getLaneX(lane) {
  return game.width * laneCenters[lane];
}

function playerPhysics(dt) {
  const p = game.player;

  if (p.isJumping) {
    p.vy -= 1550 * dt;
    p.y += p.vy * dt;
    if (p.y <= 0) {
      p.y = 0;
      p.vy = 0;
      p.isJumping = false;
    }
  }

  if (p.slideTimer > 0) {
    p.slideTimer -= dt;
    if (p.slideTimer <= 0) {
      p.isSliding = false;
    }
  }

  p.throwCooldown = Math.max(0, p.throwCooldown - dt);
  p.invulnerable = Math.max(0, p.invulnerable - dt);
  p.shieldTimer = Math.max(0, p.shieldTimer - dt);
}

function slowEnemyFor(dt) {
  if (game.slowTimer > 0) {
    game.slowTimer -= dt;
    if (game.slowTimer <= 0) {
      toast('Kanjo anafika tena!', 1.2);
    }
  }
}

function updateGame(dt) {
  if (game.state !== 'playing') return;

  game.lvlSpeed = clamp(game.minSpeed + (game.score * 0.12), game.minSpeed, game.maxSpeed);
  game.spawnTimer -= dt;

  if (game.spawnTimer <= 0) {
    const roll = Math.random();
    if (roll < 0.66) {
      spawnObstacle();
    } else {
      spawnCollectible();
    }
    game.spawnTimer = randomRange(0.82, 1.55) - Math.min(0.3, game.score * 0.008);
  }

  for (const o of game.obstacles) {
    o.z -= dt * (0.22 + game.lvlSpeed / 900) * (game.slowTimer > 0 ? 0.55 : 1);
    if (o.z < 0.08 && !o.passed) {
      o.passed = true;
    }
  }

  for (const c of game.collectibles) {
    c.z -= dt * (0.2 + game.lvlSpeed / 900) * (game.slowTimer > 0 ? 0.55 : 1);
  }

  game.obstacles = game.obstacles.filter((o) => o.z > -0.15);
  game.collectibles = game.collectibles.filter((c) => c.z > -0.15);

  playerPhysics(dt);
  slowEnemyFor(dt);
  updateToast(dt);
  updateChase(dt);
  handleCollisions();
  handleCollectibles();

  if (Math.random() < 0.007 && game.state === 'playing') {
    const msg = startupMessages[Math.floor(Math.random() * startupMessages.length)];
    if (Math.random() < 0.5) {
      toast(msg, 1.1);
    }
  }
}

function updateChase(dt) {
  const catchRate = (0.060 + game.lvlSpeed / 15000) * (game.slowTimer > 0 ? 0.42 : 1);
  game.chaseMeter -= dt * catchRate;

  if (game.chaseMeter < 0.06) {
    game.chaseMeter = 0;
    triggerCaught();
  }
}

function handleCollisions() {
  const p = game.player;

  for (const o of game.obstacles) {
    const closeEnough = o.z < 0.18 && o.z > -0.08;
    if (!closeEnough) continue;
    if (o.lane !== p.lane) continue;

    const obstaclePassed =
      (o.type === 'pothole' && p.isJumping && p.y > 65) ||
      (o.type === 'cone' && p.isJumping && p.y > 60) ||
      (o.type === 'boda' && p.isJumping && p.y > 70) ||
      (o.type === 'garbage' && p.isJumping && p.y > 60) ||
      (o.type === 'mama' && p.isJumping && p.y > 70) ||
      (o.type === 'mtumba' && p.isSliding) ||
      // shield allows one-time protection
      (p.shieldTimer > 0);

    if (!obstaclePassed) {
      if (p.invulnerable <= 0) {
        if (p.shieldTimer > 0) {
          p.shieldTimer = 0;
          toast('Shield saved you!');
          p.invulnerable = 0.8;
          o.z = -0.5;
        } else {
          triggerCaught();
          return;
        }
      }
    }
  }
}

function handleCollectibles() {
  const p = game.player;

  for (const c of game.collectibles) {
    const closeEnough = c.z < 0.22 && c.z > -0.06;
    if (!closeEnough) continue;
    if (c.lane !== p.lane) continue;

    if (c.type === 'smokie') {
      game.coins += 10;
      toast('+10 coins', 0.7);
    } else if (c.type === 'mayai') {
      game.coins += 20;
      toast('+20 coins', 0.7);
    } else if (c.type === 'ketchup') {
      game.coins += 50;
      game.lvlSpeed = clamp(game.lvlSpeed + 80, game.minSpeed, game.maxSpeed + 160);
      game.chaseMeter = clamp(game.chaseMeter + 0.12, 0, 1);
      toast('Ketchup boost! +50', 1.2);
      game.slowTimer = 5;
      triggerSlowBurst();
    } else if (c.type === 'shield') {
      game.coins += 0;
      p.shieldTimer = 7;
      toast('KPLC shield ready!', 1.2);
      game.chaseMeter = clamp(game.chaseMeter + 0.08, 0, 1);
    }

    game.score += 10;
    c.z = -0.5;
    spawnBurst(c.lane, c.type);
  }
}

function triggerSlowBurst() {
  speak('Ketchup! Kanjo!');
  for (let i = 0; i < 28; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 140 + Math.random() * 220;
    game.particles.push({
      x: getLaneX(game.player.lane),
      y: game.height * 0.6,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 4 + Math.random() * 6,
      life: 0.8 + Math.random() * 0.8,
      color: i % 2 === 0 ? '#ff9e00' : '#d94b2a',
    });
  }
}

function triggerCaught() {
  if (game.state !== 'playing') return;
  game.state = 'caught';
  setState('caught');
  toast('UMEKAMATWA!', 2.5);
  showInterstitialAd();
}

function showInterstitialAd() {
  if (window.__admob && window.__admob.showInterstitial) {
    window.__admob.showInterstitial();
  } else {
    console.log('AdMob interstitial placeholder triggered.');
  }
}

function showBannerAd() {
  if (window.__admob && window.__admob.showBanner) {
    window.__admob.showBanner();
  } else {
    console.log('AdMob banner placeholder ready.');
  }
}

function continueAfterAd() {
  setState('playing');
  game.chaseMeter = 0.35;
  game.player.invulnerable = 1.8;
  toast('Toka kwa ad! Kimbia tena!', 1.5);
  speak('Kimbia tena!');
}

function moveLane(dir) {
  if (game.state === 'splash') {
    startGame();
    return;
  }

  if (game.state !== 'playing') return;
  const p = game.player;
  p.lane = clamp(p.lane + dir, 0, 2);
}

function jump() {
  if (game.state === 'splash') {
    startGame();
    return;
  }

  if (game.state !== 'playing') return;
  const p = game.player;
  if (p.y <= 0 && !p.isSliding) {
    p.isJumping = true;
    p.vy = p.jumpPower;
    p.y = 0.1;
    toast('Jump!', 0.2);
  }
}

function slide() {
  if (game.state === 'splash') {
    startGame();
    return;
  }

  if (game.state !== 'playing') return;
  const p = game.player;
  if (p.y <= 0 && !p.isJumping) {
    p.isSliding = true;
    p.slideTimer = 0.7;
    toast('Slide!', 0.2);
  }
}

function throwKetchup() {
  if (game.state !== 'playing') return;
  const p = game.player;
  if (p.throwCooldown > 0) return;

  p.throwCooldown = 1.2;
  game.slowTimer = 5;
  game.chaseMeter = clamp(game.chaseMeter + 0.14, 0, 1);
  toast('KETCHUP THROW!', 1.1);
  speak('Ketchup!');
  for (let i = 0; i < 26; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 240 + Math.random() * 200;
    game.particles.push({
      x: getLaneX(p.lane),
      y: game.height * 0.7,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 5 + Math.random() * 8,
      life: 0.7 + Math.random() * 0.8,
      color: '#f05b2c',
    });
  }
}

function handleSwipe(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) {
    if (Math.abs(dx) > 40) {
      moveLane(dx > 0 ? 1 : -1);
    }
  } else {
    if (dy < -40) jump();
    if (dy > 40) slide();
  }
}

let touchStart = null;
let lastTapTime = 0;

document.addEventListener('pointerdown', (event) => {
  if (game.state === 'splash') {
    startGame();
    return;
  }

  const now = performance.now();
  if (now - lastTapTime < 250 && game.state === 'playing') {
    throwKetchup();
    lastTapTime = 0;
  } else {
    lastTapTime = now;
  }

  touchStart = { x: event.clientX, y: event.clientY };
});

document.addEventListener('pointerup', (event) => {
  if (!touchStart) return;
  const dx = event.clientX - touchStart.x;
  const dy = event.clientY - touchStart.y;
  handleSwipe(dx, dy);
  touchStart = null;
});

window.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'ArrowLeft':
      moveLane(-1);
      break;
    case 'ArrowRight':
      moveLane(1);
      break;
    case 'ArrowUp':
      jump();
      break;
    case 'ArrowDown':
      slide();
      break;
    case ' ':
      throwKetchup();
      break;
    case 'p':
    case 'P':
      togglePause();
      break;
  }
});

function togglePause() {
  if (game.state === 'playing') {
    setState('paused');
    toast('Paused', 0.8);
  } else if (game.state === 'paused') {
    setState('playing');
    toast('Back on the road!', 1.1);
  }
}

resumeBtn.addEventListener('click', () => {
  if (game.state === 'paused') {
    setState('playing');
  }
});

watchAdBtn.addEventListener('click', () => {
  continueAfterAd();
});

function spawnBurst(lane, type) {
  for (let i = 0; i < 18; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 100 + Math.random() * 180;
    const color = type === 'shield' ? '#63d4ff' : type === 'ketchup' ? '#ff7d2f' : '#fde047';
    game.particles.push({
      x: getLaneX(lane),
      y: game.height * 0.54,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 5 + Math.random() * 8,
      life: 0.7 + Math.random() * 0.7,
      color,
    });
  }
}

function drawUI() {
  const w = game.width;
  const h = game.height;
  const leftPad = 36;

  ctx.fillStyle = 'rgba(3, 10, 18, 0.46)';
  ctx.fillRect(18, 18, 320, 80);
  ctx.fillRect(w * 0.5 - 220, 18, 440, 80);
  ctx.fillRect(w - 260, 18, 220, 80);

  ctx.font = 'bold 30px Arial';
  ctx.fillStyle = '#ffe084';
  ctx.fillText('Coins', leftPad + 26, 48);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${game.coins}`, leftPad + 26, 82);

  ctx.fillStyle = '#ffd154';
  ctx.fillText('You vs Kanjo', w * 0.5 - 150, 48);
  const barX = w * 0.5 - 180;
  const barY = 58;
  const barW = 360;
  const barH = 18;
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = '#3be274';
  ctx.fillRect(barX, barY, barW * game.chaseMeter, barH);
  ctx.fillStyle = '#ff514b';
  ctx.fillRect(barX + barW * game.chaseMeter, barY, barW * (1 - game.chaseMeter), barH);

  ctx.fillStyle = '#fff';
  ctx.fillText('Pause', w - 175, 48);
}

function drawPlayer() {
  const p = game.player;
  const x = getLaneX(p.lane);
  const baseY = game.height * 0.82 + p.y;

  const runSwing = Math.sin((performance.now() / 90) * 0.9) * 14;
  const bodyY = baseY - 100;
  const slideExtra = p.isSliding ? 42 : 0;

  ctx.save();
  ctx.translate(x, bodyY + slideExtra);

  ctx.fillStyle = '#d72d2d';
  ctx.fillRect(-22, -24, 44, 52);
  ctx.fillStyle = '#1a5bbd';
  ctx.fillRect(-20, 18, 40, 28);
  ctx.fillStyle = '#f1bc7c';
  ctx.beginPath();
  ctx.arc(0, -56, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1d1b2b';
  ctx.fillRect(-16, -8, 10, 42);
  ctx.fillRect(6, -8, 10, 42);
  ctx.fillStyle = '#75d5ff';
  ctx.fillRect(-20, -30, 40, 12);

  if (p.isSliding) {
    ctx.fillStyle = '#1a5bbd';
    ctx.fillRect(-36, 24, 72, 18);
  }

  if (p.shieldTimer > 0) {
    ctx.strokeStyle = 'rgba(99, 212, 255, 0.95)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, -8, 54, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();

  if (p.isJumping || p.isSliding) {
    ctx.fillStyle = '#a5a5a5';
    ctx.fillRect(x - 22, baseY + 26, 44, 8);
  }

  // trolley
  ctx.save();
  ctx.translate(x + 75, baseY + 10);
  ctx.fillStyle = '#667580';
  ctx.fillRect(-52, -22, 100, 42);
  ctx.fillStyle = '#404f58';
  ctx.fillRect(-40, -30, 82, 12);
  ctx.fillStyle = '#ffca28';
  ctx.fillRect(-36, -42, 18, 20);
  ctx.fillRect(-2, -42, 18, 20);
  ctx.fillRect(28, -42, 18, 20);
  ctx.fillStyle = '#3a7c47';
  ctx.fillRect(-58, 18, 112, 8);
  ctx.restore();
}

function drawObstacle(o) {
  const laneX = getLaneX(o.lane);
  const screenY = (1 - o.z) * game.height * 0.9 + 100;
  const scale = clamp(0.45 + (1 - o.z) * 1.7, 0.6, 2.2);

  ctx.save();
  ctx.translate(laneX, screenY);
  ctx.scale(scale, scale);

  if (o.type === 'pothole') {
    ctx.fillStyle = '#2d2f33';
    ctx.beginPath();
    ctx.ellipse(0, 24, 60, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5c7d88';
    ctx.fillRect(-24, 16, 48, 18);
  }

  if (o.type === 'boda') {
    ctx.fillStyle = '#f4b942';
    ctx.fillRect(-48, -48, 96, 36);
    ctx.fillStyle = '#26354f';
    ctx.fillRect(-40, -12, 80, 36);
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(-26, -62, 52, 14);
  }

  if (o.type === 'mama') {
    ctx.fillStyle = '#a65d2a';
    ctx.fillRect(-42, -48, 84, 72);
    ctx.fillStyle = '#c79753';
    ctx.fillRect(-30, -60, 60, 18);
    ctx.fillStyle = '#b76d34';
    ctx.fillRect(-56, 18, 112, 18);
  }

  if (o.type === 'garbage') {
    ctx.fillStyle = '#2e2f38';
    ctx.fillRect(-42, -52, 84, 72);
    ctx.strokeStyle = '#979ea1';
    ctx.lineWidth = 5;
    ctx.strokeRect(-42, -52, 84, 72);
  }

  if (o.type === 'cone') {
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(0, -70);
    ctx.lineTo(34, 42);
    ctx.lineTo(-34, 42);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-18, 18, 36, 16);
  }

  if (o.type === 'mtumba') {
    ctx.fillStyle = '#7a5c37';
    ctx.fillRect(-60, -34, 120, 54);
    ctx.fillStyle = '#c39b62';
    ctx.fillRect(-58, 18, 116, 12);
  }

  ctx.restore();
}

function drawCollectible(c) {
  const laneX = getLaneX(c.lane);
  const screenY = (1 - c.z) * game.height * 0.9 + 100;
  const scale = clamp(0.4 + (1 - c.z) * 1.6, 0.5, 2.0);

  ctx.save();
  ctx.translate(laneX, screenY);
  ctx.scale(scale, scale);

  if (c.type === 'smokie') {
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-28, -18, 56, 36);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-20, -26, 40, 12);
  }

  if (c.type === 'mayai') {
    ctx.fillStyle = '#f8fafc';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(-22 + i * 14, 8, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (c.type === 'ketchup') {
    ctx.fillStyle = '#c8141c';
    ctx.fillRect(-18, -26, 36, 52);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(-10, -34, 20, 12);
  }

  if (c.type === 'shield') {
    ctx.fillStyle = '#4cc9f0';
    ctx.beginPath();
    ctx.moveTo(0, -38);
    ctx.lineTo(34, -8);
    ctx.lineTo(24, 42);
    ctx.lineTo(0, 54);
    ctx.lineTo(-24, 42);
    ctx.lineTo(-34, -8);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawParticles() {
  for (const p of game.particles) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBackground() {
  const w = game.width;
  const h = game.height;

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#70d0ff');
  sky.addColorStop(0.35, '#dff7ff');
  sky.addColorStop(0.7, '#abefd2');
  sky.addColorStop(1, '#448a6d');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(255, 210, 87, 0.92)';
  ctx.beginPath();
  ctx.arc(w * 0.8, h * 0.2, 54, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 16; i++) {
    const x = i * (w / 16);
    const h1 = 100 + (i % 5) * 40;
    ctx.fillStyle = '#1f2c3d';
    ctx.fillRect(x + 14, h * 0.45 - h1, 70, h1);
    for (let y = 0; y < 8; y++) {
      ctx.fillStyle = '#ffd483';
      ctx.fillRect(x + 24 + (y % 2) * 16, h * 0.45 - h1 + 18 + y * 16, 10, 10);
    }
  }

  ctx.fillStyle = '#d9e7f2';
  ctx.fillRect(0, h * 0.65, w, h * 0.08);

  ctx.fillStyle = '#7da2bd';
  ctx.fillRect(0, h * 0.72, w, h * 0.2);

  ctx.strokeStyle = '#edf7ff';
  ctx.lineWidth = 4;
  for (let i = -2; i <= 3; i++) {
    const x = w * 0.16 + i * w * 0.16;
    ctx.beginPath();
    ctx.moveTo(x, h * 0.74);
    ctx.lineTo(x + 170, h * 0.96);
    ctx.stroke();
  }

  ctx.fillStyle = '#e1f0ff';
  ctx.fillRect(0, h * 0.73, w, h * 0.18);

  ctx.fillStyle = '#2d3748';
  const roadTop = h * 0.75;
  const roadBottom = h * 1;
  ctx.beginPath();
  ctx.moveTo(w * 0.18, roadTop);
  ctx.lineTo(w * 0.82, roadTop);
  ctx.lineTo(w * 1, roadBottom);
  ctx.lineTo(0, roadBottom);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#f5f5f5';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(w * 0.34, roadTop);
  ctx.lineTo(w * 0.5, roadBottom);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.66, roadTop);
  ctx.lineTo(w * 0.5, roadBottom);
  ctx.stroke();

  ctx.strokeStyle = '#f8e588';
  ctx.lineWidth = 4;
  for (let i = 0; i < 12; i++) {
    const y = roadTop + i * 58;
    ctx.beginPath();
    ctx.moveTo(w * 0.33, y);
    ctx.lineTo(w * 0.5, y + 26);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.67, y);
    ctx.lineTo(w * 0.5, y + 26);
    ctx.stroke();
  }

  ctx.fillStyle = '#2f4057';
  ctx.fillRect(0, h * 0.82, w, h * 0.2);

  ctx.fillStyle = '#f5f7ff';
  ctx.font = 'bold 32px Arial';
  ctx.fillText('TOM MOYA STREET', w * 0.12, h * 0.26);
  ctx.fillText('JAVA', w * 0.68, h * 0.31);
  ctx.fillText('NAIVAS', w * 0.74, h * 0.35);
}

function drawVan() {
  const baseX = game.width * 0.14;
  const baseY = game.height * 0.20;
  const chaseX = baseX + (game.chaseMeter * 1300);

  ctx.save();
  ctx.translate(chaseX, baseY + 30);
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(-76, -28, 152, 82);
  ctx.fillStyle = '#2d9df7';
  ctx.fillRect(-52, -40, 104, 32);
  ctx.fillStyle = '#0b4a7f';
  ctx.fillRect(-28, -52, 56, 18);
  ctx.fillStyle = '#e0f0ff';
  ctx.fillRect(-62, 54, 38, 18);
  ctx.fillRect(24, 54, 38, 18);
  ctx.fillStyle = '#f4c542';
  ctx.fillRect(-68, 2, 20, 14);
  ctx.fillRect(48, 2, 20, 14);

  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(-80, -10, 12, 54);
  ctx.fillRect(68, -10, 12, 54);

  ctx.fillStyle = '#fefefe';
  ctx.fillRect(-12, -84, 24, 20);

  ctx.fillStyle = '#f5d642';
  ctx.fillRect(-28, -88, 12, 16);
  ctx.fillRect(16, -88, 12, 16);

  ctx.restore();
}

function render() {
  const w = game.width;
  const h = game.height;
  ctx.clearRect(0, 0, w, h);

  drawBackground();
  drawVan();

  for (const c of game.collectibles) {
    drawCollectible(c);
  }

  for (const o of game.obstacles) {
    drawObstacle(o);
  }

  drawPlayer();
  drawParticles();
  drawUI();

  if (game.state === 'splash') {
    ctx.fillStyle = 'rgba(5, 15, 25, 0.12)';
    ctx.fillRect(0, 0, w, h);
  }
}

function updateParticles(dt) {
  for (const p of game.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  game.particles = game.particles.filter((p) => p.life > 0);
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - game.lastTime) / 1000 || 0.016, 0.032);
  game.lastTime = timestamp;

  updateGame(dt);
  updateParticles(dt);
  render();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('load', () => {
  resizeCanvas();
  setState('splash');
  toast('Cheza! Cheza!', 2.2);
  showBannerAd();
  requestAnimationFrame(gameLoop);
});

window.addEventListener('resize', resizeCanvas);

window.__admob = window.__admob || {
  showInterstitial() {
    console.log('AdMob interstitial placeholder fired.');
  },
  showBanner() {
    console.log('AdMob banner placeholder fired.');
  },
};
