import { CONSTANTS, CHAR_TYPES, InputHandler, SoundManager } from './utils.js';
import { Character, Bullet, Particle, Item } from './entities.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = CONSTANTS.WIDTH;
canvas.height = CONSTANTS.HEIGHT;

// システム変数
const input = new InputHandler();
const sound = new SoundManager();
let gameState = 'title'; // title, playing, round_end, result
let animationId;
let selectedCharType = 'standard';
let scores = { player: 0, enemy: 0 };
let shakeAmount = 0;

// ゲームオブジェクト
let player, enemy;
let bullets = [], particles = [], items = [], stars = [];

// --- 初期化関連 ---
function initStars() {
    stars = [];
    for(let i=0; i<60; i++) {
        stars.push({
            x: Math.random() * CONSTANTS.WIDTH,
            y: Math.random() * CONSTANTS.HEIGHT,
            size: Math.random() * 2,
            speed: 0.5 + Math.random() * 2
        });
    }
}

function initRound() {
    player = new Character(true, CHAR_TYPES[selectedCharType]);
    enemy = new Character(false, CHAR_TYPES.standard); // 敵は標準タイプ固定
    bullets = [];
    items = [];
    particles = [];
    gameState = 'playing';
}

function initTitle() {
    // キャラ選択ボタン生成
    const container = document.getElementById('char-select');
    container.innerHTML = '';
    Object.keys(CHAR_TYPES).forEach(key => {
        const div = document.createElement('div');
        div.className = `char-card ${key === selectedCharType ? 'selected' : ''}`;
        div.innerHTML = `<div>${CHAR_TYPES[key].name}</div>`;
        div.onclick = () => {
            selectedCharType = key;
            document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
            div.classList.add('selected');
        };
        container.appendChild(div);
    });
}

// --- ゲームループ ---
function update() {
    if (gameState !== 'playing' && gameState !== 'round_end') return;

    // 背景の星
    stars.forEach(s => {
        s.y += s.speed;
        if (s.y > CONSTANTS.HEIGHT) s.y = 0;
    });

    // プレイヤー更新
    const pAction = player.update(input, CONSTANTS.WIDTH);
    if (pAction) handleShoot(player, pAction);

    // 敵更新
    const eAction = enemy.update(null, CONSTANTS.WIDTH);
    if (eAction) handleShoot(enemy, eAction);

    // 弾更新
    bullets.forEach(b => b.update());
    bullets = bullets.filter(b => b.active);

    // アイテム生成と更新
    if (Math.random() < CONSTANTS.ITEM_RATE && items.length === 0) {
        items.push(new Item());
    }
    items.forEach(i => i.update(player, enemy));
    items = items.filter(i => i.active);

    // パーティクル
    particles.forEach(p => p.update());
    particles = particles.filter(p => p.active);

    checkCollisions();
    updateUI();
}

function handleShoot(actor, action) {
    if (action === 'charge_shoot' && actor.energy >= actor.shotCost * 2) {
        actor.energy -= actor.shotCost * 2;
        bullets.push(new Bullet(actor.x + actor.width/2, actor.isPlayer ? actor.y : actor.y + actor.height, actor.isPlayer, actor.bulletSize * 3, actor.color, true));
        sound.play('charge_shot');
        shakeAmount = 10;
    } else if (action === 'shoot' && actor.energy >= actor.shotCost) {
        actor.energy -= actor.shotCost;
        bullets.push(new Bullet(actor.x + actor.width/2, actor.isPlayer ? actor.y : actor.y + actor.height, actor.isPlayer, actor.bulletSize, actor.color, false));
        sound.play('shoot');
    }
}

function checkCollisions() {
    // 弾同士の相殺
    for (let i = 0; i < bullets.length; i++) {
        for (let j = 0; j < bullets.length; j++) {
            let b1 = bullets[i], b2 = bullets[j];
            if (b1.isPlayer !== b2.isPlayer && b1.active && b2.active) {
                const dist = Math.hypot(b1.x - b2.x, b1.y - b2.y);
                if (dist < b1.size + b2.size) {
                    createExplosion((b1.x+b2.x)/2, (b1.y+b2.y)/2, '#fff', 5);
                    // HPを削り合う
                    b1.hp--; b2.hp--;
                    if (b1.hp <= 0) b1.active = false;
                    if (b2.hp <= 0) b2.active = false;
                }
            }
        }
    }

    // 弾 vs キャラ / アイテム
    bullets.forEach(b => {
        if (!b.active) return;
        
        // vs 敵
        if (b.isPlayer && isHit(b, enemy)) {
            b.active = false;
            handleRoundEnd('player');
        }
        // vs プレイヤー
        else if (!b.isPlayer && isHit(b, player)) {
            b.active = false;
            handleRoundEnd('enemy');
        }
        // vs アイテム
        items.forEach(item => {
            if (!item.target && Math.hypot(b.x - item.x, b.y - item.y) < b.size + item.radius) {
                b.active = false;
                item.target = b.isPlayer ? 'player' : 'enemy';
                sound.play('powerup');
            }
        });
    });

    // アイテム回収
    items.forEach(item => {
        if (item.target === 'player' && Math.hypot(player.x+20 - item.x, player.y+20 - item.y) < 30) {
            item.active = false; player.energy = CONSTANTS.MAX_ENERGY;
        }
        if (item.target === 'enemy' && Math.hypot(enemy.x+20 - item.x, enemy.y+20 - item.y) < 30) {
            item.active = false; enemy.energy = CONSTANTS.MAX_ENERGY;
        }
    });
}

function isHit(circle, rect) {
    return circle.x > rect.x && circle.x < rect.x + rect.width &&
           circle.y > rect.y && circle.y < rect.y + rect.height;
}

function createExplosion(x, y, color, count) {
    for(let i=0; i<count; i++) particles.push(new Particle(x, y, color));
}

function handleRoundEnd(winner) {
    if (gameState === 'round_end') return;
    gameState = 'round_end';
    sound.play('explosion');
    createExplosion(winner==='player'?enemy.x:player.x, winner==='player'?enemy.y:player.y, '#f00', 30);
    shakeAmount = 20;

    setTimeout(() => {
        scores[winner]++;
        updateScoreUI();
        if (scores[winner] >= CONSTANTS.WIN_ROUNDS) {
            showResult(winner);
        } else {
            initRound();
        }
    }, 1500);
}

// --- 描画 ---
function draw() {
    // 画面揺れ
    let sx = 0, sy = 0;
    if (shakeAmount > 0) {
        sx = (Math.random() - 0.5) * shakeAmount;
        sy = (Math.random() - 0.5) * shakeAmount;
        shakeAmount *= 0.9;
        if (shakeAmount < 0.5) shakeAmount = 0;
    }
    ctx.setTransform(1, 0, 0, 1, sx, sy);
    
    ctx.clearRect(0, 0, CONSTANTS.WIDTH, CONSTANTS.HEIGHT);

    // 星
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    stars.forEach(s => ctx.fillRect(s.x, s.y, s.size, s.size));

    if (gameState === 'playing' || gameState === 'round_end') {
        player.draw(ctx);
        enemy.draw(ctx);
        items.forEach(i => i.draw(ctx));
        bullets.forEach(b => b.draw(ctx));
        particles.forEach(p => p.draw(ctx));
    }
    
    ctx.setTransform(1, 0, 0, 1, 0, 0); // リセット
}

// --- UI更新 ---
function updateUI() {
    document.getElementById('player-energy').style.width = (player.energy / CONSTANTS.MAX_ENERGY * 100) + '%';
    document.getElementById('enemy-energy').style.width = (enemy.energy / CONSTANTS.MAX_ENERGY * 100) + '%';
    
    // チャージバー
    const chargeBar = document.getElementById('charge-bar');
    if (player.isCharging) {
        chargeBar.style.width = Math.min(player.chargeCount / CONSTANTS.CHARGE_FRAMES * 100, 100) + '%';
        chargeBar.style.backgroundColor = player.chargeCount >= CONSTANTS.CHARGE_FRAMES ? '#fff' : '#fb0';
    } else {
        chargeBar.style.width = '0%';
    }
}

function updateScoreUI() {
    const drawPips = (id, score) => {
        const el = document.getElementById(id);
        el.innerHTML = '';
        for(let i=0; i<CONSTANTS.WIN_ROUNDS; i++) {
            const pip = document.createElement('div');
            pip.className = `pip ${i < score ? 'active' : ''}`;
            el.appendChild(pip);
        }
    };
    drawPips('player-score', scores.player);
    drawPips('enemy-score', scores.enemy);
}

function showResult(winner) {
    gameState = 'result';
    document.getElementById('result-screen').classList.remove('hidden');
    const txt = document.getElementById('result-text');
    txt.innerText = winner === 'player' ? "VICTORY" : "DEFEAT";
    txt.style.color = winner === 'player' ? "#0ff" : "#f05";
}

// --- メインフロー ---
function loop() {
    update();
    draw();
    animationId = requestAnimationFrame(loop);
}

// イベントリスナー
document.addEventListener('keydown', e => {
    if (gameState === 'title' && e.code === 'Space') {
        document.getElementById('title-screen').classList.add('hidden');
        scores = { player: 0, enemy: 0 };
        updateScoreUI();
        initRound();
    }
});

document.getElementById('retry-btn').onclick = () => {
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('title-screen').classList.remove('hidden');
    gameState = 'title';
    scores = { player: 0, enemy: 0 };
};

// 開始処理
initStars();
initTitle();
loop();