
export {Editor, Stage};

const basicColors = {
    Tree: '#00ff00',
    Rocks: '#aaaaaa',
    Crate: '#ff8833',
    Spider: '#aa00ff',
    Ammo: '#ffff00',
    Delete: '#ff0000',
    Player: '#0000ff',
};

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
        if (name === 'Tree' || name == 'Rocks') {
            this.placing = new Terrain({pos: p, size: new Point(32,32), type: name, stage: this.stage});
        } else if (name === 'Crate') {
            this.placing = new Crate({pos: p, size: new Point(32,32), stage: this.stage});
        } else if (name === 'Spider') {
            this.placing = new Spider({pos: p, size: new Point(32,32), stage: this.stage});
        } else if (name === 'Delete') {
            this.placing = new Deleter({pos: p, size: new Point(32,32), stage: this.stage});
        } else if (name === 'Player') {
            this.placing = new Player({pos: p, size: new Point(32,32), stage: this.stage});
        } else if (name === 'Ammo') {
            this.placing = new Ammo({pos: p, size: new Point(32,32), stage: this.stage});
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
        for (let actor of this.actors) {
            if (actor === obj) {
                continue;
            }
            if (actor instanceof Arrow) {
                continue;
            }
            // Old locked to grid
            if (actor.pos.x === obj.pos.x && actor.pos.y === obj.pos.y) {
                return actor;
            }
            // Projectiles
            if (obj instanceof Arrow) {
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
        }
        return null;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.miniCtx.clearRect(0, 0, this.miniMap.width, this.miniMap.height);
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
                    this.actors.push(new Terrain(actor));
                    break;
                case 'Crate':
                    this.actors.push(new Crate(actor));
                    break;
                case 'Spider':
                    this.actors.push(new Spider(actor));
                    break;
                case 'Player':
                    this.actors.push(new Player(actor));
                    this.player = this.actors.at(-1);
                    break;
                case 'Ammo':
                    this.actors.push(new Ammo(actor));
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
        this.pos = params.pos;
        this.size = params.size;
        this.stage = params.stage;
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
        if (obj) {
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
    }
    
    clone() {
        return new Spider({
            pos: clonePoint(this.pos),
            size: clonePoint(this.size),
            stage: this.stage,
        });
    }

    tick() {
        const p = this.stage.player;
        if (dist(p.pos, this.pos) > 300) {
            return;
        }
    }

    wound(hp) {
        this.hp -= hp;
        if (this.hp <= 0) {
            this.stage.actors.splice(this.stage.actors.indexOf(this), 1);
        }
    }
}

class Player extends Actor {
    constructor(params) {
        super(params);
        this.type = 'Player';
        this.shooting = false;
        this.lr = 0;
        this.ud = 0;
        this.lastlr = 0;
        this.lastud = 1;
        this.lastts = 0;
        this.lastshot = 0;
    }

    clone() {
        return new Player({
            pos: clonePoint(this.pos),
            size: clonePoint(this.size),
            stage: this.stage,
        });
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
                // Can't shove crates diagonally
                if (this.lastlr === 0 || this.lastud === 0) {
                    if (!obj.move(this.lastlr, this.lastud)) {
                        this.pos = sav;
                    }
                }
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
        this.shoot();
        this.lastshot = ts;
    }

    shoot() {
        if (!this.shooting) {
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
        return true;
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
            }
        }
    }
}

class Ammo extends Actor {
    constructor(params) {
        super(params);
        this.type = 'Ammo';
    }
    
    clone() {
        return new Ammo({
            pos: clonePoint(this.pos),
            size: clonePoint(this.size),
            stage: this.stage,
        });
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
            if (obj instanceof Spider) {
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
