
import {$, $$, drawText} from './util.js';
import {Point, Stage} from './stage.js';

class Game {
    constructor(params) {
        this.stage = params.stage;
        this.stage.showGrid = false;
    }
    
    draw() {
        this.stage.draw();
        if (this.stage.player) {
            const ctx = this.stage.ctx;
            const p = new Point(this.stage.canvas.width-100, 20);
            p.ljust = true;
            drawText(ctx, `Ammo: ${this.stage.player.ammo}`, p, 'black', '18px sans-serif');
        }
    }
    
    keydown(e) {
        if (!this.stage.player) {
            return;
        }
        if (e.code === 'ArrowLeft') {
            this.stage.player.lr = -1;
            this.stage.player.moveNow(this.ts);
        }
        if (e.code === 'ArrowRight') {
            this.stage.player.lr = 1;
            this.stage.player.moveNow(this.ts);
        }
        if (e.code === 'ArrowUp') {
            this.stage.player.ud = 1;
            this.stage.player.moveNow(this.ts);
        }
        if (e.code === 'ArrowDown') {
            this.stage.player.ud = -1;
            this.stage.player.moveNow(this.ts);
        }
        if (e.code === 'Space') {
            this.stage.player.shooting = true;
            this.stage.player.shootNow(this.ts);
        }
    }

    keyup(e) {
        if (!this.stage.player) {
            return;
        }
        if (e.code === 'ArrowLeft') {
            this.stage.player.lr = 0;
        }
        if (e.code === 'ArrowRight') {
            this.stage.player.lr = 0;
        }
        if (e.code === 'ArrowUp') {
            this.stage.player.ud = 0;
        }
        if (e.code === 'ArrowDown') {
            this.stage.player.ud = 0;
        }
        if (e.code === 'Space') {
            this.stage.player.shooting = false;
        }

    }

    loop(stop) {
        this.stoploop = stop ? true : false;
        if (stop) return;
        this.ts = 0;
        let prev = null;
        const self = this;
        const fn = function(ts) {
            if (self.stoploop) {
                return;
            }
            if (prev === null) {
                prev = ts;
            } else {
                const dt = Math.round(1000/30);
                const next = prev + dt;
                if (ts < next) {
                    window.requestAnimationFrame(fn);
                    return;
                }
                // Hack for window losing focus
                // And scheduling a billion frames back to back
                if (ts > prev + 5*dt) {
                    prev = ts;
                } else {
                    prev = next;
                }
            }
            self.ts++;
            self.stage.tick(self.ts);
            self.draw();
            window.requestAnimationFrame(fn);
        }
        window.requestAnimationFrame(fn);
    }
}

window.addEventListener('load', () => {
    const canvas = $('#game-canvas');
    const miniMap = $('#game-minimap');
    const stage = new Stage(canvas, miniMap);
    const game = new Game({stage});
        
    fetch(`levels/L0.json`)
    .then(res => res.json())
    .then(data => {
        stage.load(data);
        game.loop();
    });

    document.addEventListener('keydown', (e) => {
        game.keydown(e);
    });
    
    document.addEventListener('keyup', (e) => {
        game.keyup(e);
    });
});
