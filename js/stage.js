
import {drawText} from './util.js';

export {Editor, Stage, Point};

const basicColors = {
    Tree: '#00ff00',
    Rocks: '#aaaaaa',
    Water: '#aaaaff',
    Door: '#88ccff',
    Crate: '#ff8833',
    Spider: '#aa00ff',
    Wizard: '#ff33ff',
    BigBoy: '#000000',
    Health: '#ffff00',
    Arrows: '#ffff00',
    Fireballs: '#ffff00',
    Key: '#ffff00',
    Delete: '#ff0000',
    Player: '#0000ff',
    Exit: '#ffaaaa',
};

const bgColor = '#ffffff';

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
            this.stage.pos.x -= 5;
            this.draw();
        }
        if (e.key === 'ArrowRight') {
            this.stage.pos.x += 5;
            this.draw();
        }
        if (e.key === 'ArrowUp') {
            this.stage.pos.y += 5;
            this.draw();
        }
        if (e.key === 'ArrowDown') {
            this.stage.pos.y -= 5;
            this.draw();
        }
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
        if (name === 'Tree' || name == 'Rocks' || name == 'Water' || name == 'Door') {
            this.placing = new Terrain({pos: p, size: new Point(32,32), type: name, stage: this.stage});
        } else if (name === 'Crate') {
            this.placing = new Crate({pos: p, size: new Point(32,32), stage: this.stage});
        } else if (name === 'Spider') {
            this.placing = new Spider({pos: p, size: new Point(32,32), stage: this.stage});
        } else if (name === 'Wizard') {
            this.placing = new Wizard({pos: p, size: new Point(32,32), stage: this.stage});
        } else if (name === 'BigBoy') {
            this.placing = new BigBoy({pos: p, size: new Point(32,32), stage: this.stage});
        } else if (name === 'Delete') {
            this.placing = new Deleter({pos: p, size: new Point(32,32), stage: this.stage});
        } else if (name === 'Player') {
            this.placing = new Player({pos: p, size: new Point(32,32), stage: this.stage});
        } else if (name === 'Arrows' || name === 'Fireballs' || name === 'Health' || name == 'Key') {
            this.placing = new Ammo({pos: p, size: new Point(32,32), type: name, stage: this.stage});
        } else if (name === 'Exit') {
            this.placing = new Exit({pos: p, size: new Point(32,32), stage: this.stage});
        }
    }

    tryPlace() {
        // Delete
        if (this.placing instanceof Deleter) {
            const actor = this.stage.collides(this.placing);
            if (actor) {
                this.stage.actors.splice(this.stage.actors.indexOf(actor), 1);
            }
            this.draw();
            return;
        } else {
            // Check for collisions
            if (this.stage.collides(this.placing)) {
                console.log('Collision!');
                return;
            }
            // Remove existing players
            if (this.placing instanceof Player) {
                const toRemove = [];
                for (let actor of this.stage.actors) {
                    if (actor instanceof Player) {
                        toRemove.push(actor);
                    }
                }
                for (let actor of toRemove) {
                    this.stage.actors.splice(this.stage.actors.indexOf(actor), 1);
                }
            }
            // Remove existing exits
            if (this.placing instanceof Exit) {
                const toRemove = [];
                for (let actor of this.stage.actors) {
                    if (actor instanceof Exit) {
                        toRemove.push(actor);
                    }
                }
                for (let actor of toRemove) {
                    this.stage.actors.splice(this.stage.actors.indexOf(actor), 1);
                }
            }
            this.stage.actors.push(this.placing);
            this.placing = this.placing.clone();
            this.draw();
            console.log('Placed');
        }
    }
}

class Stage {
    constructor(canvas, miniMap) {
        this.actors = [];
        this.grid = {};
        this.showGrid = false;
        this.pos = new Point(0,0);
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gridSize = 32;
        this.miniMap = miniMap;
        this.miniCtx = miniMap.getContext('2d');
        this.player = null;
    }

    collides(obj) {
        const splash = [];
        const actors = [];
        // Split BigBoy into multiple actors
        for (const actor of this.actors) {
            if (actor instanceof BigBoy) {
                for (const a of actor.parts) {
                    actors.push(a);
                }
            } else {
                actors.push(actor);
            }
        }
        for (const actor of actors) {
            if (actor === obj) {
                continue;
            }
            // BigBoy can't collide with themselves
            if (actor instanceof BigBoyPart && obj instanceof BigBoyPart) {
                if (actor.whole == obj.whole) {
                    continue;
                }
            }
            // Delete can collide with everything
            if (!(obj instanceof Deleter)) {
                if (actor instanceof Arrow || actor instanceof Fireball) {
                    continue;
                }
                // Stuff arrows or fireballs can't collide with
                if (obj instanceof Arrow || obj instanceof Fireball) {
                    if (actor.type === 'Water' || actor instanceof Exit || actor instanceof Ammo) {
                        continue;
                    }
                }
                // Ammos and exits can be stepped on by non-players
                if ((actor instanceof Ammo || actor instanceof Exit) && !(obj instanceof Player)) {
                    continue;
                }
            }
            // Old locked to grid
            if (actor.pos.x === obj.pos.x && actor.pos.y === obj.pos.y) {
                return actor;
            }
            // Projectiles
            if (obj instanceof Arrow || (obj instanceof Fireball && !obj.exploding)) {
                if (actor == obj.shooter) {
                    continue;
                }
                if (obj.pos.x >= actor.pos.x
                    && obj.pos.x <= actor.pos.x + actor.size.x
                    && obj.pos.y >= actor.pos.y
                    && obj.pos.y <= actor.pos.y + actor.size.y) {
                    return actor;
                }
            }
            // Exploding fireball
            if (obj instanceof Fireball && obj.exploding) {
                // Return all actors hit by fireball
                if (dist(actor.rpos, obj.pos) < obj.radius) {
                    splash.push(actor);
                }
            }
        }
        if (obj instanceof Fireball && obj.exploding) {
            return splash;
        }
        return null;
    }

    draw() {
        this.ctx.save();
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
        this.miniCtx.save();
        this.miniCtx.fillStyle = bgColor;
        this.miniCtx.fillRect(0, 0, this.miniMap.width, this.miniMap.height);
        this.miniCtx.restore();
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
        this.actors.forEach(obj => {
            obj.draw();
        });
    }

    load(json) {
        this.actors = [];
        for (let actor of json.actors) {
            switch (actor.type) {
                case 'Tree':
                case 'Rocks':
                case 'Water':
                case 'Door':
                    this.actors.push(new Terrain(actor));
                    break;
                case 'Crate':
                    this.actors.push(new Crate(actor));
                    break;
                case 'Spider':
                    this.actors.push(new Spider(actor));
                    break;
                case 'Wizard':
                    this.actors.push(new Wizard(actor));
                    break;
                case 'BigBoy':
                    this.actors.push(new BigBoy(actor));
                    break;
                case 'Player':
                    this.actors.push(new Player(actor));
                    this.player = this.actors.at(-1);
                    break;
                case 'Arrows':
                case 'Fireballs':
                case 'Health':
                case 'Key':
                    this.actors.push(new Ammo(actor));
                    break;
                case 'Exit':
                    this.actors.push(new Exit(actor));
                    break;
            }
            this.actors.at(-1).stage = this;
        }
    }

    save(name) {
        for (let actor of this.actors) {
            actor.stage = null;
        }
        const json = JSON.stringify({name, actors: this.actors});
        for (let actor of this.actors) {
            actor.stage = this;
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
        this.actors.forEach(obj => {
            if (obj instanceof Arrow) {
                obj.tick(ts);
            } else if (obj.tick) {
                obj.tick(ts);
            }
        });
    }

    xform(p) {
        const x = p.x - this.pos.x + this.canvas.width/2;
        const y = this.pos.y - p.y + this.canvas.height/2;
        return new Point(x, y);
    }

    xformMini(p) {
        const cx = this.pos.x/this.gridSize;
        const cy = this.pos.y/this.gridSize;
        const px = p.x/this.gridSize;
        const py = p.y/this.gridSize;
        const x = px - cx + this.miniMap.width/2;
        const y = cy - py + this.miniMap.height/2;
        return new Point(x, y);
    }

    xformClient(p) {
        const x = p.x + this.pos.x - this.canvas.width/2;
        const y = this.pos.y - p.y + this.canvas.height/2;
        return new Point(x, y);
    }
}

class Actor {
    constructor(params) {
        this.stage = params.stage;
        this.pos = params.pos;
        this.size = params.size;
    }

    draw() {
        const ctx = this.stage.ctx;
        const p = this.stage.xform(this.pos);
        ctx.save();
        ctx.fillStyle = basicColors[this.type];
        ctx.fillRect(p.x, p.y-this.size.y, this.size.x, this.size.y);
        ctx.restore();
        this.drawMini();
        if (this.hp && this.maxhp !== this.hp) {
            this.drawHealth();
        }
    }

    drawMini() {
        const ctx = this.stage.miniCtx;
        const p = this.stage.xformMini(this.pos);
        ctx.save();
        ctx.fillStyle = basicColors[this.type];
        ctx.fillRect(p.x, p.y-this.size.y/this.stage.gridSize, this.size.x/this.stage.gridSize, this.size.y/this.stage.gridSize);
        ctx.restore();
    }

    drawHealth() {
        const ctx = this.stage.ctx;
        let p = clonePoint(this.pos);
        p.y = p.y + this.size.y;
        p = this.stage.xform(p);
        ctx.save();
        ctx.fillStyle = 'green';
        ctx.fillRect(p.x, p.y, this.size.x, 10);
        ctx.fillStyle = 'red';
        ctx.fillRect(p.x + this.size.x * this.hp/this.maxhp, p.y, this.size.x * (1 - this.hp/this.maxhp), 10);
        ctx.restore();
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
            if (!(this instanceof Player)) {
                this.stage.actors.splice(this.stage.actors.indexOf(this), 1);
            }
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
        this.pos.x += lr*this.size.x;
        this.pos.y += ud*this.size.y;
        const obj = this.stage.collides(this);
        if (obj && obj instanceof Terrain && obj.type === 'Water') {
            // Crates fall into water
            this.stage.actors.splice(this.stage.actors.indexOf(this), 1);
            this.stage.actors.splice(this.stage.actors.indexOf(obj), 1);
            return true;
        } else if (obj) {
            this.pos = sav;
            return false;
        }
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
        if (dist(p.pos, this.pos) > 300) {
            return;
        }
        if (dist(p.pos, this.pos) <= this.stage.gridSize) {
            this.lastts = ts;
            p.wound(1);
        } else {
            const dx = p.pos.x - this.pos.x;
            const dy = p.pos.y - this.pos.y;
            const sav = clonePoint(this.pos);
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
            this.stage.actors.push(new Arrow({
                pos: p,
                stage: this.stage,
                lr: 0,
                ud: Math.sign(dy),
                shooter: this,
            }));
        } else if (Math.abs(dy) <= this.stage.gridSize-1) {
            const p = clonePoint(this.pos);
            p.x += this.size.x/2;
            p.y += this.size.y/2;
            this.stage.actors.push(new Arrow({
                pos: p,
                stage: this.stage,
                lr: Math.sign(dx),
                ud: 0,
                shooter: this,
            }));
        } else if (Math.abs(dx) < Math.abs(dy)) {
            const sav = clonePoint(this.pos);
            this.pos.x += Math.sign(dx)*this.stage.gridSize;
            const obj = this.stage.collides(this);
            if (obj) {
                this.pos = sav;
            }
        } else if (Math.abs(dy) <= Math.abs(dx)) {
            const sav = clonePoint(this.pos);
            this.pos.y += Math.sign(dy)*this.stage.gridSize;
            const obj = this.stage.collides(this);
            if (obj) {
                this.pos = sav;
            }
        }
        this.lastts = ts;
    }
}

class BigBoyPart extends Actor {
    constructor(params) {
        super(params);
        this.whole = params.whole;
        this.stage = params.whole.stage;
        this.type = 'BigBoy';
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
        this.parts.forEach(part => part.draw());
        if (this.hp < this.maxhp) {
            this.drawHealth();
        }
    }
    
    drawHealth() {
        const ctx = this.stage.ctx;
        let p = clonePoint(this.pos);
        p.y = p.y + 2*this.size.y;
        p = this.stage.xform(p);
        ctx.save();
        ctx.fillStyle = 'green';
        ctx.fillRect(p.x, p.y, 2*this.size.x, 10);
        ctx.fillStyle = 'red';
        ctx.fillRect(p.x + 2 * this.size.x * this.hp/this.maxhp, p.y, 2 * this.size.x * (1 - this.hp/this.maxhp), 10);
        ctx.restore();
    }

    get parts() {
        return [
            new BigBoyPart({pos: new Point(this.pos.x, this.pos.y), size: this.size, whole: this}),
            new BigBoyPart({pos: new Point(this.pos.x+this.size.x, this.pos.y), size: this.size, whole: this}),
            new BigBoyPart({pos: new Point(this.pos.x+this.size.x, this.pos.y+this.size.y), size: this.size, whole: this}),
            new BigBoyPart({pos: new Point(this.pos.x, this.pos.y+this.size.y), size: this.size, whole: this}),
        ];
    }

    tick(ts) {
        const p = this.stage.player;
        const pos = new Point(this.pos.x+this.size.x, this.pos.y+this.size.y);
        if (ts - this.lastts < 20) {
            return;
        }
        if (!p) {
            return;
        }
        if (dist(p.pos, pos) > 300) {
            return;
        }
        if (dist(p.pos, pos) <= 2*this.stage.gridSize) {
            this.lastts = ts;
            p.wound(1);
        } else {
            const dx = p.pos.x - pos.x;
            const dy = p.pos.y - pos.y;
            const sav = clonePoint(this.pos);
            if (Math.abs(dx) > 0) {
                this.pos.x += Math.sign(dx)*this.stage.gridSize;
            }
            if (Math.abs(dy) > 0) {
                this.pos.y += Math.sign(dy)*this.stage.gridSize;
            }
            for (const part of this.parts) {
                const obj = this.stage.collides(part);
                if (obj) {
                    this.pos = sav;
                    break;
                }
            }
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
        this.stage.actors.push(new Fireball({
            pos: p,
            stage: this.stage,
            lr: this.lastlr,
            ud: this.lastud,
            shooter: this,
        }));
        this.fb -= 1;
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
                this.stage.actors.splice(this.stage.actors.indexOf(obj), 1);
            } else if (obj && obj instanceof Exit) {
                // Reach an exit
                if (this.stage.nextLevelCb) {
                    this.stage.nextLevelCb();
                }
            } else if (obj && obj.type === 'Door' && this.keys) {
                // Open a door
                this.keys -= 1;
                this.stage.actors.splice(this.stage.actors.indexOf(obj), 1);
            } else if (obj) {
                this.pos = sav;
            }
            this.stage.pos = clonePoint(this.pos);
            return true;
        }
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
        this.stage.actors.push(new Arrow({
            pos: p,
            stage: this.stage,
            lr: this.lastlr,
            ud: this.lastud,
            shooter: this,
        }));
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
        drawText(ctx, `${letter}:${this.ammo}`, p, 'black', '22px sans-serif');
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
    
    tick() {
        if (this.exploding) {
            this.radius += 20;
            if (this.radius > 100) {
                this.stage.actors.splice(this.stage.actors.indexOf(this), 1);
            }
            const splash = this.stage.collides(this);
            for (let a of splash) {
                if (a instanceof BigBoyPart) {
                    a = a.whole;
                }
                if (this.hurt.includes(a)) {
                    continue;
                }
                if (a instanceof Crate) {
                    this.stage.actors.splice(this.stage.actors.indexOf(a), 1);
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
        const obj = this.stage.collides(this);
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
        const to = this.stage.xform(new Point(this.pos.x+this.lr*this.stage.gridSize, this.pos.y+this.ud*this.stage.gridSize));
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        ctx.restore();
    }

    tick() {
        this.pos.x += 0.3*this.lr*this.stage.gridSize;
        this.pos.y += 0.3*this.ud*this.stage.gridSize;
        const obj = this.stage.collides(this);
        if (obj) {
            this.stage.actors.splice(this.stage.actors.indexOf(this), 1);
            if (obj instanceof Spider || obj instanceof Player || obj instanceof Wizard) {
                obj.wound(1);
            }
            if (obj instanceof BigBoyPart) {
                obj.whole.wound(1);
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

class Exit extends Actor {
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
}
