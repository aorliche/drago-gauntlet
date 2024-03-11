
export {Editor, Stage};

const basicColors = {
    Tree: '#00ff00',
    Rocks: '#aaaaaa',
    Crate: '#ff8833',
    Spider: '#aa00ff',
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
    constructor(canvas) {
        this.actors = [];
        this.showGrid = false;
        this.pos = new Point(0,0);
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gridSize = 32;
    }

    collides(obj) {
        for (let actor of this.actors) {
            if (actor.pos.x === obj.pos.x && actor.pos.y === obj.pos.y) {
                return actor;
            }
        }
        return null;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
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
                case 'Rock':
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

    xform(p) {
        const x = p.x - this.pos.x + this.canvas.width/2;
        const y = this.pos.y - p.y + this.canvas.height/2;
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

    draw() {
        const ctx = this.stage.ctx;
        const p = this.stage.xform(this.pos);
        ctx.save();
        ctx.fillStyle = basicColors[this.type];
        ctx.fillRect(p.x, p.y-this.size.y, this.size.x, this.size.y);
        ctx.restore();
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

    draw() {
        const ctx = this.stage.ctx;
        const p = this.stage.xform(this.pos);
        ctx.save();
        ctx.fillStyle = basicColors['Crate'];
        ctx.fillRect(p.x, p.y-this.size.y, this.size.x, this.size.y);
        ctx.restore();
    }
}

class Spider extends Actor {
    constructor(params) {
        super(params);
        this.type = 'Spider';
    }
    
    clone() {
        return new Spider({
            pos: clonePoint(this.pos),
            size: clonePoint(this.size),
            stage: this.stage,
        });
    }

    draw() {
        const ctx = this.stage.ctx;
        const p = this.stage.xform(this.pos);
        ctx.save();
        ctx.fillStyle = basicColors['Spider'];
        ctx.fillRect(p.x, p.y-this.size.y, this.size.x, this.size.y);
        ctx.restore();
    }
}

class Player extends Actor {
    constructor(params) {
        super(params);
        this.type = 'Player';
    }

    clone() {
        return new Player({
            pos: clonePoint(this.pos),
            size: clonePoint(this.size),
            stage: this.stage,
        });
    }
    
    draw() {
        const ctx = this.stage.ctx;
        const p = this.stage.xform(this.pos);
        ctx.save();
        ctx.fillStyle = basicColors['Player'];
        ctx.fillRect(p.x, p.y-this.size.y, this.size.x, this.size.y);
        ctx.restore();
    }
}

class Deleter extends Actor {
    constructor(params) {
        super(params);
    }

    draw() {
        const ctx = this.stage.ctx;
        const p = this.stage.xform(this.pos);
        ctx.save();
        ctx.fillStyle = basicColors['Delete'];
        ctx.fillRect(p.x, p.y-this.size.y, this.size.x, this.size.y);
        ctx.restore();
    }
}
