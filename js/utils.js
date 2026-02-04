// ゲーム設定定数
export const CONSTANTS = {
    WIDTH: 400,
    HEIGHT: 700,
    MAX_ENERGY: 100,
    CHARGE_FRAMES: 45,
    WIN_ROUNDS: 3,
    ITEM_RATE: 0.003
};

// キャラクター性能定義
export const CHAR_TYPES = {
    standard: { name: "Balanced", color: '#00f2ff', speed: 5, shotCost: 15, recharge: 0.5, bulletSize: 6, power: 1 },
    speed:    { name: "Rapid",    color: '#55ff00', speed: 7, shotCost: 8,  recharge: 0.7, bulletSize: 4, power: 0.8 },
    power:    { name: "Heavy",    color: '#ffaa00', speed: 3, shotCost: 25, recharge: 0.3, bulletSize: 9, power: 1.5 }
};

// 入力管理クラス
export class InputHandler {
    constructor() {
        this.keys = { ArrowLeft: false, ArrowRight: false, " ": false };
        
        window.addEventListener('keydown', e => {
            if (this.keys.hasOwnProperty(e.key)) this.keys[e.key] = true;
        });
        window.addEventListener('keyup', e => {
            if (this.keys.hasOwnProperty(e.key)) this.keys[e.key] = false;
        });

        // スマホ用タッチ操作（簡易）
        const canvas = document.getElementById('gameCanvas');
        canvas.addEventListener('touchstart', (e) => this.handleTouch(e, true));
        canvas.addEventListener('touchend', (e) => this.handleTouch(e, false));
    }

    handleTouch(e, pressed) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        const rect = e.target.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        
        if (!pressed) {
            this.keys.ArrowLeft = false;
            this.keys.ArrowRight = false;
            this.keys[" "] = false;
            return;
        }

        // 画面左側タップで左、右側で右、同時押し判定は簡易実装のため省略
        if (x < rect.width / 2) {
            this.keys.ArrowLeft = true;
            this.keys.ArrowRight = false;
        } else {
            this.keys.ArrowLeft = false;
            this.keys.ArrowRight = true;
        }
        this.keys[" "] = true; // タッチ中は常にショット
    }
}

// 簡易オーディオシンセサイザー
export class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    play(type) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        const now = this.ctx.currentTime;

        switch (type) {
            case 'shoot':
                osc.type = 'square';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            case 'charge_shot':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.linearRampToValueAtTime(50, now + 0.3);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                break;
            case 'explosion':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.exponentialRampToValueAtTime(10, now + 0.2);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
                break;
            case 'powerup':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                osc.start(now);
                osc.stop(now + 0.2);
                break;
        }
    }
}