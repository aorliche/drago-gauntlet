
export {Editor, Stage};

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Editor {
    constructor(params) {
        this.posSpan = params.posSpan;
        this.stage = params.stage;
        this.stage.showGrid = true;
        this.switchPlacing('terrain');
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
        if (name === 'terrain') {
            this.placing = new Terrain({pos: p, size: new Point(32,32), stage: this.stage});
        } else if (name === 'background') {
            this.placing = new Background({pos: p, size: new Point(32,32), stage: this.stage});
        }
    }

    tryPlace() {
        if (this.placing instanceof Terrain) {
            // Check for collisions
            if (this.stage.collides(this.placing)) {
                console.log('Collision!');
                return;
            }
            this.stage.terrain.push(this.placing);
            this.placing = new Terrain({
                pos: new Point(
                    this.placing.pos.x,
                    this.placing.pos.y), 
                size: new Point(32,32), 
                stage: this.stage
            });
            this.draw();
            console.log('Placed');
        }
        if (this.placing instanceof Background) {
            // Check for collisions
            const bg = this.stage.bgCollides(this.placing);
            if (bg) {
                this.stage.background.splice(this.stage.background.indexOf(bg), 1);
            }
            this.stage.background.push(this.placing);
            this.placing = new Background({
                pos: new Point(
                    this.placing.pos.x,
                    this.placing.pos.y), 
                size: new Point(32,32), 
                stage: this.stage
            });
            this.draw();
            console.log(this.stage.background.length);
            console.log('Placed');
        }
    }
}

class Stage {
    constructor(canvas) {
        this.actors = [];
        this.terrain = [];
        this.background = [];
        this.showGrid = false;
        this.pos = new Point(0,0);
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gridSize = 32;
    }

    bgCollides(obj) {
        for (let actor of this.background) {
            if (actor.pos.x === obj.pos.x && actor.pos.y === obj.pos.y) {
                return actor;
            }
        }
        return null;
    }

    collides(obj) {
        for (let actor of this.actors.concat(this.terrain)) {
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
        this.background.forEach(obj => {
            obj.draw();
        });
        this.terrain.forEach(obj => {
            obj.draw();
        });
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
    }

    draw() {
        const ctx = this.stage.ctx;
        const p = this.stage.xform(this.pos);
        ctx.save();
        ctx.fillStyle = 'red';
        ctx.fillRect(p.x, p.y-this.size.y, this.size.x, this.size.y);
        ctx.restore();
    }
}

class Background extends Actor {
    constructor(params) {
        super(params);
    }

    draw() {
        const ctx = this.stage.ctx;
        const p = this.stage.xform(this.pos);
        ctx.save();
        ctx.fillStyle = 'blue';
        ctx.fillRect(p.x, p.y-this.size.y, this.size.x, this.size.y);
        ctx.restore();
    }
}
