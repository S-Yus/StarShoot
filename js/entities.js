import { CONSTANTS } from './utils.js';

// 基本エンティティクラス
class Entity {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.active = true;
    }
}

// プレイヤークラス（自機・敵機共通）
export class Character extends Entity {
    constructor(isPlayer, typeData) {
        super(isPlayer ? CONSTANTS.WIDTH / 2 - 20 : CONSTANTS.WIDTH / 2 - 20, isPlayer ? CONSTANTS.HEIGHT - 80 : 50);
        this.isPlayer = isPlayer;
        this.width = 40;
        this.height = 40;
        
        // ステータス反映
        this.color = isPlayer ? typeData.color : '#ff0055'; 
        this.speed = typeData.speed;
        this.shotCost = typeData.shotCost;
        this.recharge = typeData.recharge;
        this.bulletSize = typeData.bulletSize;
        
        this.energy = 50;
        this.chargeCount = 0;
        this.isCharging = false;
        
        // AI用
        this.aiDir = 1;
        this.aiTimer = 0;
    }

    update(input, widthBound) {
        // エネルギー回復
        if (this.energy < CONSTANTS.MAX_ENERGY && !this.isCharging) {
            this.energy += this.recharge;
        }

        if (this.isPlayer) {
            // プレイヤー操作
            if (input.keys.ArrowLeft) this.x -= this.speed;
            if (input.keys.ArrowRight) this.x += this.speed;

            if (input.keys[" "]) {
                this.isCharging = true;
                if (this.energy > 10) this.chargeCount++;
            } else {
                this.isCharging = false;
            }
        } else {
            // 敵AI（簡易）
            this.aiTimer++;
            if (this.aiTimer > 30) {
                if (Math.random() < 0.1) this.aiDir *= -1;
                this.aiTimer = 0;
            }
            this.x += this.speed * 0.7 * this.aiDir;
            
            // 敵の攻撃ロジック
            if (this.energy > 40 && Math.random() < 0.02) {
                return 'shoot'; // 発射合図
            }
        }

        // 画面端制限
        this.x = Math.max(0, Math.min(widthBound - this.width, this.x));
        this.energy = Math.min(CONSTANTS.MAX_ENERGY, Math.max(0, this.energy));
        
        // チャージ完了判定（リリース時に発射）
        if (this.isPlayer && !input.keys[" "] && this.chargeCount > 0) {
            const count = this.chargeCount;
            this.chargeCount = 0;
            return count >= CONSTANTS.CHARGE_FRAMES ? 'charge_shoot' : 'shoot';
        }
        
        return null;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        
        // チャージエフェクト
        if (this.isCharging) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = this.color;
        } else {
            ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        if (this.isPlayer) {
            ctx.moveTo(this.x + this.width/2, this.y);
            ctx.lineTo(this.x + this.width, this.y + this.height);
            ctx.lineTo(this.x, this.y + this.height);
        } else {
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + this.width, this.y);
            ctx.lineTo(this.x + this.width/2, this.y + this.height);
        }
        ctx.fill();
        ctx.shadowBlur = 0; // リセット
    }
}

// 弾クラス
export class Bullet extends Entity {
    constructor(x, y, isPlayer, size, color, isCharge) {
        super(x, y);
        this.isPlayer = isPlayer;
        this.vy = isPlayer ? -8 : 8;
        this.size = size;
        this.color = color;
        this.isCharge = isCharge;
        this.hp = isCharge ? 3 : 1; // チャージ弾は耐久力がある（貫通する）
    }

    update() {
        this.y += this.vy;
        if (this.y < -50 || this.y > CONSTANTS.HEIGHT + 50) this.active = false;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        // 核
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

// パーティクル（爆発など）
export class Particle extends Entity {
    constructor(x, y, color) {
        super(x, y);
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.life = 1.0;
        this.color = color;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.05;
        if (this.life <= 0) this.active = false;
    }
    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 4, 4);
        ctx.globalAlpha = 1.0;
    }
}

// Pアイテム
export class Item extends Entity {
    constructor() {
        super(-30, CONSTANTS.HEIGHT / 2);
        this.vx = 2;
        this.radius = 15;
        this.target = null;
    }
    
    update(player, enemy) {
        if (!this.target) {
            this.x += this.vx;
            this.y = CONSTANTS.HEIGHT/2 + Math.sin(Date.now()/300) * 50;
            if (this.x > CONSTANTS.WIDTH + 30) this.active = false;
        } else {
            // ホーミング
            const t = this.target === 'player' ? player : enemy;
            this.x += (t.x + t.width/2 - this.x) * 0.1;
            this.y += (t.y + t.height/2 - this.y) * 0.1;
        }
    }
    
    draw(ctx) {
        ctx.fillStyle = '#fb0';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center'; 
        ctx.fillText('P', this.x, this.y + 6);
    }
}