
import {drawText} from './util.js';

export {clonePoint, Editor, Stage, Point};

const basicColors = {
    Tree: '#00cc00',
    Rocks: '#aaaaaa',
    Water: '#aaaaff',
    Door: '#88ccff',
    Crate: '#ff8833',
    Spider: '#aa00ff',
    Wizard: '#ff33ff',
    BigBoy: '#ff0000',
    Health: '#ffff00',
    Arrows: '#ffff00',
    Fireballs: '#ffff00',
    Key: '#ffff00',
    Delete: '#ff0000',
    Player: '#0000ff',
    Exit: '#5555ff',
};

const bgColor = '#bbffaa';

// No instance methods to keep JSON serializable
class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

function clonePoint(p) {
    return new Point(p.x, p.y);
}

function dist(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function posStr(p, stage) {
    const x = p.x/stage.gridSize;
    const y = p.y/stage.gridSize;
    const str = x.toString() + ',' + y.toString();
    return str;
}

class Editor {
    constructor(params) {
        this.posSpan = params.posSpan;
        this.stage = params.stage;
        this.stage.showGrid = true;
        this.switchPlacing('Tree');
    }

    draw() {
        this.stage.draw();
        if (!this.mouseOut && !this.stage.collides(this.placing)) {
            this.placing.draw();
        }
    }
    
    keydown(e) {
        if (e.key === 'ArrowLeft') {
            this.stage.pos.x -= 20;
            this.draw();
        }
        if (e.key === 'ArrowRight') {
            this.stage.pos.x += 20;
            this.draw();
        }
        if (e.key === 'ArrowUp') {
            this.stage.pos.y += 20;
            this.draw();
        }
        if (e.key === 'ArrowDown') {
            this.stage.pos.y -= 20;
            this.draw();
        }
    }
    
    minimapclick(e) {
        const p = this.stage.xformClientMini(new Point(e.offsetX, e.offsetY));
        this.stage.pos = p;
        this.draw();
    }
    
    mousedown(e) {
        this.mouseIsDown = true;
        const p = this.stage.xformClient(new Point(e.offsetX, e.offsetY));
        this.placing.pos = this.stage.snapToGrid(p);
        this.tryPlace();
    }

    mouseenter(e) {
        this.mouseOut = false;
    }

    mousemove(e) {
        const p = this.stage.xformClient(new Point(e.offsetX, e.offsetY));
        this.placing.pos = this.stage.snapToGrid(p);   
        if (this.mouseIsDown) {
            this.tryPlace();
        }
        this.draw();
        this.posSpan.innerHTML = `(${this.placing.pos.x}, ${this.placing.pos.y}) (${p.x}, ${p.y})`;
    }

    mouseout(e) {
        this.mouseIsDown = false;
        this.mouseOut = true;
        this.draw();
    }

    mouseup(e) {
        this.mouseIsDown = false;
    }

    switchPlacing(name) {
        const p = this.placing ? this.placing.pos : new Point(0,0);
        if (name === 'Tree' || name == 'Rocks' || name == 'Water' || name == 'Door' || name == 'Exit') {
            this.placing = new Terrain({pos: p, size: new Point(32,32), type: name, stage: this.stage});
        } else if (name === 'Crate') {
            this.placing = new Crate({pos: p, size: new Point(32,32), stage: this.stage});
        } else if (name === 'Spider') {
            this.placing = new Spider({pos: p, size: new Point(32,32), stage: this.stage});
        } else if (name === 'Wizard') {
            this.placing = new Wizard({pos: p, size: new Point(32,32), stage: this.stage});
        } else if (name === 'BigBoy') {
            this.placing = new BigBoy({pos: p, size: new Point(64,64), stage: this.stage});
        } else if (name === 'Delete') {
            this.placing = new Deleter({pos: p, size: new Point(32,32), stage: this.stage});
        } else if (name === 'Player') {
            this.placing = new Player({pos: p, size: new Point(32,32), stage: this.stage});
        } else if (name === 'Arrows' || name === 'Fireballs' || name === 'Health' || name == 'Key') {
            this.placing = new Ammo({pos: p, size: new Point(32,32), type: name, stage: this.stage});
        } 
    }

    tryPlace() {
        // Delete
        const act = this.stage.collides(this.placing);
        if (this.placing instanceof Deleter) {
            if (act) {
                act.remove();
            }
            this.draw();
            return;
        }
        if (act) {
            console.log('Collision!');
            return;
        }
        // Remove existing players
        if (this.placing instanceof Player) {
            for (const pos in this.stage.actors) {
                if (this.stage.actors[pos] instanceof Player) {
                    this.stage.actors[pos].remove();
                }
            }
        }
        this.placing.clone().place();
        this.draw();
        console.log('Placed');
    }
}

class Stage {
    constructor(canvas, miniMap) {
		this.visited = {}; // For mini map
        this.projectiles = [];
        // Terrain and loot
        this.terrain = {};
        // Player, enemies
        this.actors = {};
        this.showGrid = false;
        this.pos = new Point(0,0);
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gridSize = 32;
        this.miniMap = miniMap;
        this.miniCtx = miniMap.getContext('2d');
        this.player = null;
		// Load sprites must be called after constructor for convenience
        //this.loadSprites(loadCb);
    }

    collidesProjectile(proj) {
        // Exploding fireball
        if (proj instanceof Fireball && proj.exploding) {
            const splash = [];
            for (const pos in this.actors) {
                const actor = this.actors[pos];
                if (!actor) {
                    continue;
                }
                if (dist(actor.rpos, proj.pos) < proj.radius) {
                    splash.push(actor);
                }
            }
            return splash;
        }
        const pos = this.snapToGrid(proj.pos);
        let act = this.terrain[posStr(pos, this)];
        // Projectiles pass through Ammo, Water, and Exits
        if (act instanceof Terrain && act.type !== 'Water' && act.type !== 'Exit') {
            return act;
        }
        act = this.actors[posStr(pos, this)];
        // Can't hit yourself
        if (act === proj.shooter) {
            return null;
        }
        // Projectiles hit all actors
        return act;
    }

    collides(obj) {
        // Hack for BigBoy (originally placing in editor)
        if (obj instanceof BigBoy) {
            const parts = obj.parts;
            for (const part of parts) {
                const act = this.collides({pos: part, whole: obj, type: 'BigBoyPart'});
                if (act) {
                    return act;
                }
            }
            return null;
        }
        // Terrain and powerups
        let act = this.terrain[posStr(obj.pos, this)];
        // Delete can collide with anything
        if (obj instanceof Deleter) {
            return act;
        }
        // Enemies can overlap power up and exits
        if (obj instanceof Spider || obj instanceof Wizard || obj.type === 'BigBoyPart') {
            if (act instanceof Terrain && act.type !== 'Exit') {
                return act;
            }
        } else if (act) {
        // Players hit/pick up everything
            return act;
        }
        // Actors
        act = this.actors[posStr(obj.pos, this)];
        // Actors can't collide with themselves
        if (obj === act) {
            return null;
        }
        // BigBoy can't collide with themselves
        if (obj.type === 'BigBoyPart' && obj.whole === act) {
            return null;
        }
        return act;
    }

    draw() {
        this.ctx.save();
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
        this.miniCtx.save();
        this.miniCtx.fillStyle = '#121';
        this.miniCtx.fillRect(0, 0, this.miniMap.width, this.miniMap.height);
        this.miniCtx.restore();
		// Draw visited in mini
		for (let p in this.visited) {
			p = p.split(',');
			p = {x: parseInt(p[0])*this.gridSize, y: parseInt(p[1])*this.gridSize};
			p = this.xformMini(p);
			this.miniCtx.fillStyle = '#252';
			this.miniCtx.fillRect(p.x, p.y, 4, 4);
		}
        if (this.showGrid) {
            let sx = this.pos.x-this.canvas.width/2 - this.gridSize;
            sx = sx - (sx % this.gridSize);
            const ex = this.pos.x+this.canvas.width/2;
            let sy = this.pos.y-this.canvas.height/2 - this.gridSize;
            sy = sy - (sy % this.gridSize);
            const ey = this.pos.y+this.canvas.height/2;
            for (let x=sx; x<ex; x+=this.gridSize) {
                const p1 = this.xform(new Point(x, sy));
                const p2 = this.xform(new Point(x, ey));
                this.ctx.beginPath();
                this.ctx.moveTo(p1.x, p1.y);
                this.ctx.lineTo(p2.x, p2.y);
                this.ctx.stroke();
            }
            for (let y=sy; y<ey; y+=this.gridSize) {
                const p1 = this.xform(new Point(sx, y));
                const p2 = this.xform(new Point(ex, y));
                this.ctx.beginPath();
                this.ctx.moveTo(p1.x, p1.y);
                this.ctx.lineTo(p2.x, p2.y);
                this.ctx.stroke();
            }
        }
        for (const pos in this.terrain) {
            const act = this.terrain[pos];
            if (act) {
                act.draw();
            }
        }
        for (const pos in this.actors) {
            const act = this.actors[pos];
            if (act) {
                act.draw();
            }
        }
        this.projectiles.forEach(p => p.draw());
    }

    loadProc(cols) {
        this.terrain = {};
        this.actors = {};
        for (let i=0; i<cols.length; i++) {
            for (let j=0; j<cols[0].length; j++) {
                const p = new Point(i*this.gridSize, j*this.gridSize);
                const s = posStr(p, this);
                let act = null;
                switch (cols[i][j]) {
                    case 'A':
                        act = {stage: this, pos: clonePoint(p), size: new Point(this.gridSize, this.gridSize), type: 'Wizard'};
                        this.actors[s] = new Wizard(act);
                        break;
                    case 'B':
                        act = {stage: this, pos: clonePoint(p), size: new Point(2*this.gridSize, 2*this.gridSize), type: 'BigBoy'};
                        act = new BigBoy(act);
                        act.parts.forEach(part => {
                            this.actors[posStr(part, this)] = act; 
                        });
                        break;
                    case 'C':
                        act = {stage: this, pos: clonePoint(p), size: new Point(this.gridSize, this.gridSize), type: 'Crate'};
                        this.actors[s] = new Crate(act);
                        break;
                    case 'D':
                        act = {stage: this, pos: clonePoint(p), size: new Point(this.gridSize, this.gridSize), type: 'Door'};
                        this.terrain[s] = new Terrain(act);
                        break;
					case 'E':
                        act = {stage: this, pos: clonePoint(p), size: new Point(this.gridSize, this.gridSize), type: 'Exit'};
                        this.terrain[s] = new Terrain(act);
                        break;
                    case 'F':
                        act = {stage: this, pos: clonePoint(p), size: new Point(this.gridSize, this.gridSize), type: 'Fireballs'};
                        this.terrain[s] = new Ammo(act);
                        break;
                    case 'H':
                        act = {stage: this, pos: clonePoint(p), size: new Point(this.gridSize, this.gridSize), type: 'Health'};
                        this.terrain[s] = new Ammo(act);
                        break;
                    case 'K':
                        act = {stage: this, pos: clonePoint(p), size: new Point(this.gridSize, this.gridSize), type: 'Key'};
                        this.terrain[s] = new Ammo(act);
                        break;
                    case 'O':
                        act = {stage: this, pos: clonePoint(p), size: new Point(this.gridSize, this.gridSize), type: 'Arrows'};
                        this.terrain[s] = new Ammo(act);
                        break;
					case 'P':
						act = {stage: this, pos: clonePoint(p), size: new Point(this.gridSize, this.gridSize)};
						const play = new Player(act);
						this.actors[s] = play;
						this.player = play;
						break;
                    case 'R': 
                        act = {stage: this, pos: clonePoint(p), size: new Point(this.gridSize, this.gridSize), type: 'Rocks'};
                        this.terrain[s] = new Terrain(act);
                        break;
                    case 'S':
                        act = {stage: this, pos: clonePoint(p), size: new Point(this.gridSize, this.gridSize), type: 'Spider'};
                        this.actors[s] = new Spider(act);
                        break;
                    case 'T':
                        act = {stage: this, pos: clonePoint(p), size: new Point(this.gridSize, this.gridSize), type: 'Tree'};
                        this.terrain[s] = new Terrain(act);
                        break;
                    case 'W':
                        act = {stage: this, pos: clonePoint(p), size: new Point(this.gridSize, this.gridSize), type: 'Water'};
                        this.terrain[s] = new Terrain(act);
                        break;
                }
            }
        }
    }

    load(json) {
        this.terrain = json.terrain ?? {};
        this.actors = json.actors ?? {};
        for (const pos in this.terrain) {
            const act = this.terrain[pos];
            if (!act) {
                continue;
            }
            switch (act.type) {
                case 'Tree':
                case 'Rocks':
                case 'Water':
                case 'Door':
                case 'Exit':
                    this.terrain[pos] = new Terrain(act);
                    break;
                case 'Arrows':
                case 'Fireballs':
                case 'Health':
                case 'Key':
                    this.terrain[pos] = new Ammo(act);
                    break;
            }
            this.terrain[pos].stage = this;
        }
        for (const pos in this.actors) {
            const act = this.actors[pos];
            if (!act) {
                continue;
            }
            switch (act.type) {
                case 'Crate':
                    this.actors[pos] = new Crate(act);
                    break;
                case 'Spider':
                    this.actors[pos] = new Spider(act);
                    break;
                case 'Wizard':
                    this.actors[pos] = new Wizard(act);
                    break;
                case 'BigBoy':
                    const bb = new BigBoy(act);
                    bb.stage = this;
                    bb.parts.forEach(part => {
                        this.actors[posStr(part, this)] = bb; 
                    });
                    break;
                case 'Player':
                    const p = new Player(act);
                    this.actors[pos] = p;
                    this.player = p;
                    break;
            }
            if (act.type != 'BigBoy') {
                this.actors[pos].stage = this;
            }
        }
    }

    loadSprites(cb) {
		let nToLoad = 0;
        this.sprites = {};
        const arrows = ['ArrowL', 'ArrowR', 'ArrowU', 'ArrowD'];
        const waters = [
            'Water', 'WaterLRUD',
            'WaterL', 'WaterR', 'WaterU', 'WaterD', 
            'WaterLRU', 'WaterRUD', 'WaterLUD', 'WaterLRD', 
            'WaterLU', 'WaterLR', 'WaterRD', 'WaterLD', 'WaterUD', 'WaterRU'];
        const toLoad = waters.concat(arrows);
        for (const actor in basicColors) {
            toLoad.push(actor);
        }
        for (const actor of toLoad) {
			if (actor != 'Delete') {
				nToLoad++;
			}
            const img = new Image();
            if (actor == 'BigBoy') {
                img.src = 'images/Ferris.png';
            } else if (actor == 'Player') {
                img.src = 'images/Gopher.png';
            } else {
                img.src = `images/${actor}.png`;
            }
            img.addEventListener('load', () => {
                console.log(`Loaded ${actor}`);
                this.sprites[actor] = img; 
				nToLoad--;
				if (nToLoad == 0) {
					cb();
				}
            });
        }
    }

    save(name) {
        // Break loops by nulling stage
        for (const pos in this.actors) {
            if (this.actors[pos]) {
                this.actors[pos].stage = null;
            }
        }
        for (const pos in this.terrain) {
            if (this.terrain[pos]) {
                this.terrain[pos].stage = null;
            }
        }
        const json = JSON.stringify({name, actors: this.actors, terrain: this.terrain});
        // Restore stage
        for (const pos in this.actors) {
            if (this.actors[pos]) {
                this.actors[pos].stage = this;
            }
        }
        for (const pos in this.terrain) {
            if (this.terrain[pos]) {
                this.terrain[pos].stage = this;
            }
        }
        return json;
    }

    snapToGrid(p) {
        let x = p.x - (p.x % this.gridSize);
        let y = p.y - (p.y % this.gridSize);
        if (p.x < 0) {
            x -= this.gridSize;
        }
        if (p.y < 0) {
            y -= this.gridSize;
        }
        return new Point(x, y);
    }

    tick(ts) {
        for (const proj of this.projectiles) {
            proj.tick(ts);
        }
        for (const pos in this.actors) {
            const act = this.actors[pos];
            if (act && act.tick) {
                act.tick(ts);
            }
        }
    }

    xform(p) {
        const x = p.x - this.pos.x + this.canvas.width/2;
        const y = this.pos.y - p.y + this.canvas.height/2;
        return new Point(x, y);
    }

    xformMini(p) {
        /*const cx = this.pos.x/this.gridSize;
        const cy = this.pos.y/this.gridSize;
        const px = p.x/this.gridSize;
        const py = p.y/this.gridSize;*/
        //const x = px - cx + this.miniMap.width/2;
        //const y = cy - py + this.miniMap.height/2;
        const x = (p.x - this.pos.x)/this.gridSize*4 + this.miniMap.width/2;
        const y = (this.pos.y - p.y)/this.gridSize*4 + this.miniMap.height/2;
        return new Point(x, y);
    }

    xformClient(p) {
        const x = p.x + this.pos.x - this.canvas.width/2;
        const y = this.pos.y - p.y + this.canvas.height/2;
        return new Point(x, y);
    }

    xformClientMini(p) {
        let px = p.x - this.miniMap.width/2;
        let py = this.miniMap.height/2 - p.y;
        px = px * this.gridSize;
        py = py * this.gridSize;
        return new Point(px, py);
    }
}

class Actor {
    constructor(params) {
        this.stage = params.stage;
        this.pos = params.pos;
        this.size = params.size;
    }

    // BigBoy has own drawing method
    draw() {
        const ctx = this.stage.ctx;
        const p = this.stage.xform(this.pos);
        ctx.save();
        if (this.stage.sprites[this.type] && this.type !== 'Water') {
            ctx.drawImage(this.stage.sprites[this.type], p.x, p.y-this.size.y, this.size.x, this.size.y); 
        } else if (this.type === 'Water') {
            this.drawSelfWater();
        } else {
            ctx.fillStyle = basicColors[this.type];
            ctx.fillRect(p.x, p.y-this.size.y, this.size.x, this.size.y);
        }
        ctx.restore();
        this.drawMini();
        if (this.hp && this.maxhp !== this.hp) {
            this.drawHealth();
        }
    }

    drawHealth() {
        const ctx = this.stage.ctx;
        let p = clonePoint(this.pos);
        p.y = p.y + this.size.y;
        p = this.stage.xform(p);
        ctx.save();
        ctx.fillStyle = '#00dd00';
        ctx.fillRect(p.x, p.y, this.size.x, 10);
        ctx.fillStyle = 'red';
        ctx.fillRect(p.x + this.size.x * this.hp/this.maxhp, p.y, this.size.x * (1 - this.hp/this.maxhp), 10);
        ctx.restore();
    }

    drawMini() {
        const ctx = this.stage.miniCtx;
        const p = this.stage.xformMini(this.pos);
		const str = posStr(this.pos, this.stage);
		if (!this.stage.visited[str]) return;
        ctx.save();
        ctx.fillStyle = basicColors[this.type];
        ctx.fillRect(p.x, p.y-this.size.y/this.stage.gridSize*4, this.size.x/this.stage.gridSize*4, this.size.y/this.stage.gridSize*4);
        ctx.restore();
    }

    drawSelfWater() {
        const U = new Point(this.pos.x, this.pos.y + this.stage.gridSize);
        const D = new Point(this.pos.x, this.pos.y - this.stage.gridSize);
        const L = new Point(this.pos.x - this.stage.gridSize, this.pos.y);
        const R = new Point(this.pos.x + this.stage.gridSize, this.pos.y);
        const atU = this.stage.terrain[posStr(U, this.stage)];
        const atD = this.stage.terrain[posStr(D, this.stage)];
        const atL = this.stage.terrain[posStr(L, this.stage)];
        const atR = this.stage.terrain[posStr(R, this.stage)];
        const hasU = atU && atU.type === 'Water' ? 'U' : '';
        const hasD = atD && atD.type === 'Water' ? 'D' : '';
        const hasL = atL && atL.type === 'Water' ? 'L' : '';
        const hasR = atR && atR.type === 'Water' ? 'R' : '';
        const suffix = hasL + hasR + hasU + hasD;
        const p = this.stage.xform(this.pos);
        const ctx = this.stage.ctx;
        const sprite = this.stage.sprites[`Water${suffix}`] ?? this.stage.sprites['Water']
        ctx.drawImage(sprite, p.x, p.y-this.size.y, this.stage.gridSize, this.stage.gridSize);
    }

    place() {
        const grid = this instanceof Terrain || this instanceof Ammo ? this.stage.terrain : this.stage.actors;
        const act = grid[posStr(this.pos, this.stage)];
        if (act) {
            throw `Actor ${act.type} already exists at ${this.pos}`;
        }
		const str = posStr(this.pos, this.stage);
        grid[str] = this;
		// Update visited
		if (this instanceof Player) {
			const parts = str.split(',');
			const x = parseInt(parts[0]);
			const y = parseInt(parts[1]);
			for (let i=-8; i<=8; i++) {
				for (let j=-8; j<=8; j++) {
					const vstr = (x+i).toString() + ',' + (y+j).toString();
					this.stage.visited[vstr] = true;
				}
			}
		}
    }

    remove() {
        const grid = this instanceof Terrain || this instanceof Ammo ? this.stage.terrain : this.stage.actors;
        const act = grid[posStr(this.pos, this.stage)];
        if (act != this) {
            console.trace();
            throw `Actor ${this.type} does not exist at ${this.pos}`;
        }
        grid[posStr(this.pos, this.stage)] = null;
    }

    get rpos() {
        const x = this.pos.x + this.size.x/2;
        const y = this.pos.y + this.size.y/2;
        return new Point(x, y);
    }

    wound(hp) {
        if (!this.maxhp && this.maxhp !== 0) {
            return;
        }
        this.hp -= hp;
        if (this.hp < 0) {
            this.hp = 0;
        }
        if (this.hp <= 0) {
            if (this instanceof Player) {
				setTimeout(() => {
					this.stage.game.stoploop = true;
					this.stage.game.sounds.stopMusic('piano_loop.mp3');
				}, 50);
			} else {
				if (this instanceof BigBoy) {
					this.stage.game.score += 5;
				} else {
					this.stage.game.score += 2;
				}
                this.remove();
            }
        }
		if (this instanceof Spider || this instanceof Wizard) {
			this.stage.sounds.play('hit_goblin.mp3');
		} else if (this instanceof Player) {
			this.stage.sounds.play('hit_player.mp3');
		} else if (this instanceof BigBoy) {
			this.stage.sounds.play('hit_ferris.mp3');
		}
    }
}

class Terrain extends Actor {
    constructor(params) {
        super(params);
        this.type = params.type;
    }
    
    clone() {
        return new Terrain({
            pos: clonePoint(this.pos),
            size: clonePoint(this.size),
            stage: this.stage,
            type: this.type,
        });
    }
}

class Crate extends Actor {
    constructor(params) {
        super(params);
        this.type = 'Crate';
    }
    
    clone() {
        return new Crate({
            pos: clonePoint(this.pos),
            size: clonePoint(this.size),
            stage: this.stage,
        });
    }

    move(lr, ud) {
        const sav = clonePoint(this.pos);
        this.remove();
        this.pos.x += lr*this.size.x;
        this.pos.y += ud*this.size.y;
        const obj = this.stage.collides(this);
        if (obj && obj instanceof Terrain && obj.type === 'Water') {
            // Crates fall into water
            obj.remove();
            return true;
        } else if (obj) {
            this.pos = sav;
            this.place();
            return false;
        }
        this.place();
        return true;
    }
}

class Spider extends Actor {
    constructor(params) {
        super(params);
        this.type = 'Spider';
        this.hp = params.hp ?? 3;
        this.maxhp = params.maxhp ?? 3;
        this.lastts = 0;
    }
    
    clone() {
        return new Spider({
            pos: clonePoint(this.pos),
            size: clonePoint(this.size),
            stage: this.stage,
        });
    }

    tick(ts) {
        const p = this.stage.player;
        if (ts - this.lastts < 20) {
            return;
        }
        if (!p) {
            return;
        }
        if (dist(p.rpos, this.rpos) > 300) {
            return;
        }
        if (dist(p.rpos, this.rpos) <= 1.5*this.stage.gridSize) {
            this.lastts = ts;
            p.wound(1);
        } else {
            const dx = p.pos.x - this.pos.x;
            const dy = p.pos.y - this.pos.y;
            const sav = clonePoint(this.pos);
            this.remove();
            if (Math.abs(dx) > 0) {
                this.pos.x += Math.sign(dx)*this.stage.gridSize;
            }
            if (Math.abs(dy) > 0) {
                this.pos.y += Math.sign(dy)*this.stage.gridSize;
            }
            const obj = this.stage.collides(this);
            if (obj) {
                this.pos = sav;
            }
            this.place();
            this.lastts = ts;
        }
    }
}

class Wizard extends Actor {
    constructor(params) {
        super(params);
        this.type = 'Wizard';
        this.hp = params.hp ?? 2;
        this.maxhp = params.maxhp ?? 2;
        this.lastts = 0;
    }
    
    clone() {
        return new Wizard({
            pos: clonePoint(this.pos),
            size: clonePoint(this.size),
            stage: this.stage,
        });
    }

    tick(ts) {
        const p = this.stage.player;
        if (ts - this.lastts < 20) {
            return;
        }
        if (!p) {
            return;
        }
        if (dist(p.pos, this.pos) > 300) {
            return;
        }
        const dx = p.pos.x - this.pos.x;
        const dy = p.pos.y - this.pos.y;
        if (Math.abs(dx) <= this.stage.gridSize-1) {
            const p = clonePoint(this.pos);
            p.x += this.size.x/2;
            p.y += this.size.y/2;
            this.stage.projectiles.push(new Arrow({
                pos: p,
                stage: this.stage,
                lr: 0,
                ud: Math.sign(dy),
                shooter: this,
            }));
			this.stage.sounds.play('arrow.mp3');
        } else if (Math.abs(dy) <= this.stage.gridSize-1) {
            const p = clonePoint(this.pos);
            p.x += this.size.x/2;
            p.y += this.size.y/2;
            this.stage.projectiles.push(new Arrow({
                pos: p,
                stage: this.stage,
                lr: Math.sign(dx),
                ud: 0,
                shooter: this,
            }));
			this.stage.sounds.play('arrow.mp3');
        } else if (Math.abs(dx) < Math.abs(dy)) {
            const sav = clonePoint(this.pos);
            this.remove();
            this.pos.x += Math.sign(dx)*this.stage.gridSize;
            const obj = this.stage.collides(this);
            if (obj) {
                this.pos = sav;
            }
            this.place();
        } else if (Math.abs(dy) <= Math.abs(dx)) {
            const sav = clonePoint(this.pos);
            this.remove();
            this.pos.y += Math.sign(dy)*this.stage.gridSize;
            const obj = this.stage.collides(this);
            if (obj) {
                this.pos = sav;
            }
            this.place();
        }
        this.lastts = ts;
    }
}

class BigBoy extends Actor {
    constructor(params) {
        super(params);
        this.type = 'BigBoy';
        this.hp = params.hp ?? 10;
        this.maxhp = params.maxhp ?? 10;
        this.lastts = 0;
    }
    
    clone() {
        return new BigBoy({
            pos: clonePoint(this.pos),
            size: clonePoint(this.size),
            stage: this.stage,
        });
    }

    draw() {
        const ctx = this.stage.ctx;
        const p = this.stage.xform(this.pos);   
        if (this.stage.sprites[this.type]) {
            ctx.drawImage(this.stage.sprites[this.type], p.x, p.y-this.size.y);
            if (this.hp < this.maxhp) {
                this.drawHealth();
            }
        } else {
            ctx.save();
            ctx.fillStyle = basicColors[this.type];
            ctx.fillRect(p.x, p.y-this.size, this.size.x, this.size.y);
            ctx.restore();
        }
        if (this.hp < this.maxhp) {
            this.drawHealth();
        }
		this.drawMini();
    }
    
    drawHealth() {
        const ctx = this.stage.ctx;
        let p = clonePoint(this.pos);
        p.y = p.y + this.size.y;
        p = this.stage.xform(p);
        ctx.save();
        ctx.fillStyle = '#00dd00';
        ctx.fillRect(p.x, p.y, this.size.x, 10);
        ctx.fillStyle = 'red';
        ctx.fillRect(p.x + this.size.x * this.hp/this.maxhp, p.y, this.size.x * (1 - this.hp/this.maxhp), 10);
        ctx.restore();
    }

    get parts() {
        return [
            new Point(this.pos.x, this.pos.y), 
            new Point(this.pos.x + this.stage.gridSize, this.pos.y), 
            new Point(this.pos.x + this.stage.gridSize, this.pos.y + this.stage.gridSize), 
            new Point(this.pos.x, this.pos.y + this.stage.gridSize), 
        ];
    }
    
    place() {
        const grid = this.stage.actors;
        this.parts.forEach(p => {
            const act = grid[posStr(p, this.stage)];
            if (act) {
                throw `Actor ${act.type} already exists at ${p}`;
            }
            grid[posStr(p, this.stage)] = this;
        });
    }

    remove() {
        const grid = this.stage.actors;
        this.parts.forEach(p => {
            const act = grid[posStr(p, this.stage)];
            if (act != this) {
                throw `Actor ${act.type} does not exist at ${p}`;   
            }
            grid[posStr(p, this.stage)] = null;
        });
    }

    tick(ts) {
        const p = this.stage.player;
        const pos = new Point(
            this.pos.x+this.stage.gridSize, 
            this.pos.y+this.stage.gridSize);
        if (ts - this.lastts < 20) {
            return;
        }
        if (!p) {
            return;
        }
        if (dist(p.rpos, pos) > 300) {
            return;
        }
        if (dist(p.rpos, pos) <= 2.5*this.stage.gridSize) {
            this.lastts = ts;
            p.wound(2);
        } else {
            const dx = p.pos.x - pos.x;
            const dy = p.pos.y - pos.y;
            const sav = clonePoint(this.pos);
            this.remove();
            if (Math.abs(dx) > 0) {
                this.pos.x += Math.sign(dx)*this.stage.gridSize;
            }
            if (Math.abs(dy) > 0) {
                this.pos.y += Math.sign(dy)*this.stage.gridSize;
            }
            const obj = this.stage.collides(this);
            if (obj) {
                this.pos = sav;
            } 
            this.place();
            this.lastts = ts;
        }
    }
}

class Player extends Actor {
    constructor(params) {
        super(params);
        this.type = 'Player';
        this.shooting = false;
        this.fbing = false;
        this.lr = 0;
        this.ud = 0;
        this.lastlr = 0;
        this.lastud = 1;
        this.lastts = 0;
        this.lastshot = 0;
        this.arrows = params.arrows ?? 10;
        this.fb = params.fb ?? 4;
        this.hp = params.hp ?? 10;
        this.keys = params.keys ?? 0;
        this.maxhp = params.maxhp ?? this.hp;
    }

    clone() {
        return new Player({
            pos: clonePoint(this.pos),
            size: clonePoint(this.size),
            stage: this.stage,
        });
    }

    fireball() {
        if (!this.fbing) {
            return false;
        }
        if (this.fb <= 0) {
            return false;
        }
        const p = clonePoint(this.pos);
        p.x += this.size.x/2;
        p.y += this.size.y/2;
        this.stage.projectiles.push(new Fireball({
            pos: p,
            stage: this.stage,
            lr: this.lastlr,
            ud: this.lastud,
            shooter: this,
        }));
        this.fb -= 1;
		this.stage.sounds.play('fireball.mp3');
        return true;
    }
    
    fireballNow(ts) {
        if (ts - this.lastshot < 20) {
            return;
        }
        if (this.fireball()) {
            this.lastshot = ts;
        }
    }

    moveNow(ts) {
        if (ts - this.lastts < 5) {
            return;
        }
        this.lastts = ts;
        this.lastlr = this.lr;
        this.lastud = this.ud;
        this.move();
    }

    move() {
        const sav = clonePoint(this.pos);
        this.remove();
        let moved = false;
        if (this.lr === -1) {
            moved = true;
            this.pos.x -= this.stage.gridSize;
            this.lastlr = -1;
            if (this.ud === 0) {
                this.lastud = 0;
            }
        } else if (this.lr == 1) {
            moved = true;
            this.pos.x += this.stage.gridSize;
            this.lastlr = 1;
            if (this.ud === 0) {
                this.lastud = 0;
            }
        }
        if (this.ud === -1) {
            moved = true;
            this.pos.y -= this.stage.gridSize;
            this.lastud = -1;
            if (this.lr === 0) {
                this.lastlr = 0;
            }
        } else if (this.ud == 1) {
            moved = true;
            this.pos.y += this.stage.gridSize;
            this.lastud = 1;
            if (this.lr === 0) {
                this.lastlr = 0;
            }
        }
        if (moved) {
			/*if (Math.random() > 0.3) {
				this.stage.sounds.play('step.mp3');
			}*/
            const obj = this.stage.collides(this);
            if (obj && obj instanceof Crate) {
                // Shove a crate
                // Can't shove crates diagonally
                if (this.lastlr === 0 || this.lastud === 0) {
                    if (!obj.move(this.lastlr, this.lastud)) {
                        this.pos = sav;
                    }
                } else {
                    this.pos = sav;
                }
                // Pick up ammo
            } else if (obj && obj instanceof Ammo) {
                switch (obj.type) {
                    case 'Health': {
                        this.hp += obj.ammo; 
                        if (this.hp > this.maxhp) {
                            this.hp = this.maxhp;
                        }
                        break;
                    }
                    case 'Arrows': {
                        this.arrows += obj.ammo;
                        break;
                    }
                    case 'Fireballs': {
                        this.fb += obj.ammo;
                        break;
                    }
                    case 'Key': {
                        this.keys += obj.ammo;
                        break;
                    }
                }
                obj.remove();
            } else if (obj && obj.type === 'Exit') {
                // Reach an exit
                if (this.stage.nextLevelCb) {
					this.stage.game.score += (this.stage.game.levelIdx+1)*50;
					this.stage.sounds.play('level_up.mp3');
                    this.stage.nextLevelCb();
                }
            } else if (obj && obj.type === 'Door' && this.keys) {
                // Open a door
                this.keys -= 1;
                obj.remove();  
            } else if (obj) {
                this.pos = sav;
            }
            this.stage.pos = clonePoint(this.pos);
            this.place();
            return true;
        }
        this.place();
        return false;
    }

    shootNow(ts) {
        if (ts - this.lastshot < 20) {
            return;
        }
        if (this.shoot()) {
            this.lastshot = ts;
        }
    }

    shoot() {
        if (!this.shooting) {
            return false;
        }
        if (this.arrows <= 0) {
            return false;
        }
        const p = clonePoint(this.pos);
        p.x += this.size.x/2;
        p.y += this.size.y/2;
        this.stage.projectiles.push(new Arrow({
            pos: p,
            stage: this.stage,
            lr: this.lastlr,
            ud: this.lastud,
            shooter: this,
        }));
		this.stage.sounds.play('arrow.mp3');
        this.arrows -= 1;
        return true;
    }

    get state() {
        return {
            hp: this.hp,
            arrows: this.arrows,
            fb: this.fb,
        }
    }

    set state(st) {
        this.hp = st.hp;    
        this.arrows = st.arrows;
        this.fb = st.fb;
    }

    tick(ts) {
        if (ts - this.lastts > 5) {
            if (this.move()) {
                this.lastts = ts;
            }
        }
        if (ts - this.lastshot > 20) {
            if (this.shoot()) {
                this.lastshot = ts;
            } else if (this.fireball()) {
                this.lastshot = ts;
            }   
        }
    }
}

class Ammo extends Actor {
    constructor(params) {
        super(params);
        this.type = params.type;
        switch (this.type) {
            case 'Health': {
                this.ammo = params.ammo ?? Math.ceil(Math.random()*5);
                break;
            }
            case 'Arrows': {
                this.ammo = params.ammo ?? Math.ceil(Math.random()*10);
                break;
            }
            case 'Fireballs': {
                this.ammo = params.ammo ?? Math.ceil(Math.random()*3);
                break;
            }
            case 'Key': {
                this.ammo = 1;
                break;
            }
        }
    }
    
    clone() {
        return new Ammo({
            pos: clonePoint(this.pos),
            size: clonePoint(this.size),
            stage: this.stage,
            type: this.type,
            ammo: this.ammo,
        });
    }

    draw() {
        super.draw();
        const ctx = this.stage.ctx;
        const p = this.stage.xform(this.pos);
        const letter = this.type[0];
        p.x += this.size.x/2;
        p.y -= this.size.y/2-8;
        if (!this.stage.sprites[this.type]) {
            drawText(ctx, `${letter}:${this.ammo}`, p, 'black', '22px sans-serif');
        }
    }
}

class Fireball extends Actor {
    constructor(params) {
        super(params);
        this.type = 'Fireball';
        this.lr = params.lr;
        this.ud = params.ud;
        this.radius = 10;
        this.shooter = params.shooter;
        this.hurt = [];
    }
    
    clone() {
        return new Fireball({
            pos: clonePoint(this.pos),
            stage: this.stage,
            lr: this.lr,
            ud: this.ud,
        });
    }
    
    draw() {
        const ctx = this.stage.ctx;
        const p = this.stage.xform(this.pos);
        ctx.save();
        ctx.strokeStyle = 'red';
        ctx.beginPath();
        ctx.arc(p.x, p.y, this.radius, 0, 2*Math.PI);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    remove() {
        this.stage.projectiles.splice(this.stage.projectiles.indexOf(this), 1);
    }
    
    tick() {
        if (this.exploding) {
            this.radius += 20;
            if (this.radius > 100) {
                this.remove();
            }
            const splash = this.stage.collidesProjectile(this);
            for (let a of splash) {
                if (a.type === 'BigBoyPart') {
                    a = a.whole;
                }
                if (this.hurt.includes(a)) {
                    continue;
                }
                if (a instanceof Crate) {
                    a.remove();
                }
                if (a instanceof Spider || a instanceof Wizard || a instanceof BigBoy || a instanceof Player) {
                    a.wound(2);
                    this.hurt.push(a);
                }
            }
            return;
        }
        this.pos.x += 0.3*this.lr*this.stage.gridSize;
        this.pos.y += 0.3*this.ud*this.stage.gridSize;
        const obj = this.stage.collidesProjectile(this);
        if (obj) {
            this.exploding = true;
        }
    }
}

class Arrow extends Actor {
    constructor(params) {
        super(params);
        this.type = 'Arrow';
        this.lr = params.lr;
        this.ud = params.ud;
        this.shooter = params.shooter;
    }
    
    clone() {
        return new Arrow({
            pos: clonePoint(this.pos),
            stage: this.stage,
            lr: this.lr,
            ud: this.ud,
        });
    }

    draw() {
        const ctx = this.stage.ctx;
        const p = this.stage.xform(this.pos);
        if (this.lr === -1) {
            if (this.stage.sprites.ArrowL) {
                ctx.drawImage(this.stage.sprites.ArrowL, p.x, p.y+3);
            }
        } else if (this.lr === 1) {
            if (this.stage.sprites.ArrowR) {
                ctx.drawImage(this.stage.sprites.ArrowR, p.x-20, p.y+3);
            }
        } else if (this.ud === -1) {
            if (this.stage.sprites.ArrowD) {
                ctx.drawImage(this.stage.sprites.ArrowD, p.x-3, p.y);
            }
        } else {
            if (this.stage.sprites.ArrowU) {
                ctx.drawImage(this.stage.sprites.ArrowU, p.x-3, p.y-20);
            }
        }
    }

    remove() {
        this.stage.projectiles.splice(this.stage.projectiles.indexOf(this), 1);
    }

    tick() {
        this.pos.x += 0.3*this.lr*this.stage.gridSize;
        this.pos.y += 0.3*this.ud*this.stage.gridSize;
        const obj = this.stage.collidesProjectile(this);
        if (obj) {
            this.remove();
            if (obj instanceof Spider || obj instanceof Player || obj instanceof Wizard || obj instanceof BigBoy) {
                obj.wound(1);
            }
        }
    }
}

class Deleter extends Actor {
    constructor(params) {
        super(params);
        this.type = 'Delete';
    }
}

/*class Exit extends Actor {
    constructor(params) {
        super(params);
        this.type = 'Exit';
    }
    
    clone() {
        return new Exit({
            pos: clonePoint(this.pos),
            size: clonePoint(this.size),
            stage: this.stage,
        });
    }
}*/
