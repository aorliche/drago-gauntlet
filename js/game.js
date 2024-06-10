
import {$, $$, drawText} from './util.js';
import {clonePoint, Point, Stage} from './stage.js';
import {addActors, addCells, addPlayerAndExit, addTrees, addWater} from './proc.js';
import {makeRooms} from './rooms.js';
import {Sounds} from './sounds.js';
	
const PLAY_PROC = true;

class Game {
    constructor(params) {
        this.stage = params.stage;
        this.stage.showGrid = false;
        this.levels = params.levels;
        this.levelIdx = 0;
		this.sounds = new Sounds();
		this.stage.sounds = this.sounds;
		// Load sounds
		['hit_player.mp3', 'step.mp3', 'fireball.mp3', 'arrow.mp3', 'level_up.mp3', 'hit_ferris.mp3', 'hit_goblin.mp3'].map(snd => {
			this.sounds.load(snd, 'sounds/' + snd);
		});
		this.sounds.loadMusic('piano_loop.mp3', 'sounds/piano_loop.mp3');
		this.playing = false;
		this.splashLoaded = false;
		this.titleLoaded = false;
		this.lastHealth = 0;
		this.healthBar = ['#8f8', '#8f8', '#beb', '#beb', '#beb', '#faa', '#faa', '#faa', '#f88', '#f88', '#f88'];
		// Load splash screen art
		this.splashImg = new Image();
		this.splashImg.src = 'images/Art/GauntletStart.png';
		this.splashImg.onload = () => {
			this.splashLoaded = true;
		};
		this.titleImg = new Image();
		this.titleImg.src = 'images/Art/title-splash.png';
		this.titleImg.onload = () => {
			this.titleLoaded = true;
		};
		this.startts = 0;
		this.nowts = 0;
		this.score = 0;
    }
    
    draw() {
		if (!this.playing) {
			const w = this.stage.canvas.width;
			const h = this.stage.canvas.height
			this.stage.ctx.fillStyle = '#fff';
			this.stage.ctx.fillRect(0, 0, w, h);
			if (this.splashLoaded && this.titleLoaded) {
				const h1 = this.splashImg.height;
				const h2 = this.titleImg.height;
				const w1 = this.splashImg.width;
				const w2 = this.titleImg.width;
				this.stage.ctx.fillStyle = '#cfc';
				this.stage.ctx.fillRect(0, 75, w, 450);
				this.stage.ctx.strokeRect(0, 75, w, 450);
				this.stage.ctx.drawImage(this.splashImg, w/2-400/2, h/2-300/2-50, 400, 300);
				this.stage.ctx.strokeRect(w/2-400/2, h/2-300/2-50, 400, 300);
				this.stage.ctx.drawImage(this.titleImg, w/2-w2/2, h/2+300/2-60, w2, h2);
				drawText(this.stage.ctx, "Press an action key to start...", {x: w/2, y: h/2+300/2+50}, '#000', '18px sans');
			}
			return;
		}
        this.stage.draw();
        if (this.stage.player) {
			$('#level').innerText = this.levelIdx;
			if (this.stage.player.hp != this.lastHealth) {
				$('#health').innerHTML = '';
				$('#health').style.backgroundColor = this.healthBar[10-this.stage.player.hp];
				for (let i=0; i<this.stage.player.hp; i++) {
					const img = new Image();
					img.src = 'images/Health.png';
					img.width = 20;
					$('#health').appendChild(img);
				}
				this.lastHealth = this.stage.player.hp;
			}
			$('#arrows').innerText = this.stage.player.arrows;
			$('#fireballs').innerText = this.stage.player.fb;
			$('#key').innerText = this.stage.player.keys;
			const time = Math.floor((this.nowts - this.startts)/1000);
			const minutes = Math.floor(time/60);
			let seconds = time%60;
			seconds = seconds <= 9 ? "0" + seconds : seconds;
			$('#time').innerText = `Time: ${minutes}:${seconds}`;
			$('#score').innerText = `Score: ${this.score}`;
			// Death screen
			if (this.stage.player.hp <= 0) {
				this.stage.ctx.save();
				this.stage.ctx.fillStyle = '#f00';
				this.stage.ctx.globalAlpha = 0.3;
				this.stage.ctx.fillRect(0, 100, this.stage.canvas.width, this.stage.canvas.height-200);
				this.stage.ctx.restore();
				drawText(this.stage.ctx, "You have died...", {x: this.stage.canvas.width/2, y: 300}, '#fff', 'bold 64px sans', true);
			}
        }
    }
    
    keydown(e) {
		if (e.key !== 'Alt' && !this.playing) {
			this.sounds.playMusic('piano_loop.mp3');
			this.playing = true;
			return;
		}
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
        if (e.key === 'Alt') {
            this.stage.player.fbing = true;
            this.stage.player.fireballNow(this.ts);
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
        if (e.key === 'Alt') {
            this.stage.player.fbing = false;
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
				self.startts = ts;
                prev = ts;
            } else {
				self.nowts = ts;
                const dt = Math.round(1000/30);
                const next = prev + dt;
                if (ts < next) {
                    window.requestAnimationFrame(fn);
                    return;
                }
                // Hack for window losing focus
                // And scheduling a billion frames back to back
				// Also for requestAnimationFrame being too slow
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
    const levels = $$('#levels option').map(opt => opt.value);
    let stage = new Stage(canvas, miniMap);
    const game = new Game({stage, levels});
	stage.game = game;

    function nextLevel(first) {
        if (!first) {
            game.levelIdx++;
        }
		// Play procedurally generated game
		if (PLAY_PROC) {
			const idx = game.levelIdx;
			const levelSize = 20+idx*5;
			let data = makeRooms({size: [levelSize, levelSize], roomSize: [12, 10], roomSizeSigma: [3, 3], nearLimit: 6});
            data = addWater(data, 0.08, 10, 5);
            data = addTrees(data, 0.25);
            data = addActors(data, 'C', 0.03);	// Crates
			data = addPlayerAndExit(data);
            data = addActors(data, 'S', 0.015+idx*0.002);  // Melee
            data = addActors(data, 'A', 0.015+idx*0.002);  // Archer
            data = addActors(data, 'B', 0.005+idx*0.001);  // BigBoy
            data = addActors(data, 'O', 0.010+idx*0.0015);  // Arrows
            data = addActors(data, 'F', 0.005+idx*0.0005);  // Fireballs
            data = addActors(data, 'H', idx > 5 ? 0.005 : 0.01-idx*0.001);	// Health
			if (first) {
				stage.loadProc(data);
				game.loop();
            } else {
                // Copy player health and items
                const st = stage.player.state;
				// Make a whole new stage because of ridiculous player duplication
				// and possibly actor duplication bug
				// Maybe due to requestAnimationFrame ticks, never figured it out
				const nstage = new Stage(canvas, miniMap);
				nstage.sprites = stage.sprites;
				stage = nstage;
				stage.game = game;
				game.stage = stage;
				game.stage.nextLevelCb = nextLevel;
				game.stage.sounds = game.sounds;
                stage.loadProc(data);
                stage.player.state = st;
            }
            stage.pos = clonePoint(stage.player.pos);
			return;
		}
		// Play hand-crafted levels
        if (game.levelIdx >= game.levels.length) {
            game.levelIdx = 0;
        }
        fetch(`levels/${game.levels[game.levelIdx]}`)
        .then(res => res.json())
        .then(data => {
            if (first) {
                // Start loop
                stage.load(data);
                game.loop();
            } else {
                // Copy player health and items
                const st = stage.player.state;
                stage.load(data);
                stage.player.state = st;
            }
            stage.pos = clonePoint(stage.player.pos);
        });
    }

    game.stage.nextLevelCb = nextLevel;
	game.stage.loadSprites(() => nextLevel(true));

    document.addEventListener('keydown', (e) => {
		e.preventDefault();
        game.keydown(e);
    });
    
    document.addEventListener('keyup', (e) => {
		e.preventDefault();
        game.keyup(e);
    });

	document.addEventListener('click', (e) => {
		document.dispatchEvent(new KeyboardEvent('keydown', {code: 'ArrowLeft'}));
		document.dispatchEvent(new KeyboardEvent('keyup', {code: 'ArrowLeft'}));
	});
});
