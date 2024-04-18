export {addActors, addRooms, addTrees, addWater, backtrack};

// Add rooms
// fct: fraction of cells to clear
// mu: mean room size
// sigma: standard deviation
function addRooms(cols, fct, mu, sigma) {
    const nx = cols.length; 
    const ny = cols[0].length;
    const sz = nx*ny;
    const n = Math.round(fct*sz/mu);
    for (let i=0; i<n; i++) {
        const x = Math.floor(Math.random()*nx); 
        const y = Math.floor(Math.random()*ny);
        if (x == 0 || y == 0 || x == nx-1 || y == ny-1) {
            i--;
            continue;
        }
        const rsz = mu + Math.round((Math.random()-0.5)*sigma);
        const visited = {};
        const frontier = [[x,y]];
        for (let j=0; j<rsz; j++) {
            if (frontier.length == 0) {
                break;
            }
            const pt = frontier.pop();
            if (visited[pt[0]+','+pt[1]]) {
                j--;
                continue;
            }
            cols[pt[0]][pt[1]] = ' ';
            visited[pt[0]+','+pt[1]] = true;
            if (pt[0] > 0) {
                frontier.push([pt[0]-1, pt[1]]);
            }
            if (pt[0] < nx-1) {
                frontier.push([pt[0]+1, pt[1]]);
            }
            if (pt[1] > 0) {
                frontier.push([pt[0], pt[1]-1]);
            }
            if (pt[1] < ny-1) {
                frontier.push([pt[0], pt[1]+1]);
            }
        }
    }
    return cols;
}

function addTrees(cols, fct) {
    const visited = {};
    for (let i=0; i<cols.length; i++) {
        for (let j=0; j<cols[0].length; j++) {
            if (visited[i+','+j] || cols[i][j] != 'R') {
                continue;
            }
            const frontier = [[i,j]];
            const tree = Math.random() < fct ? 'T' : 'R';
            while (frontier.length > 0) {
                const pt = frontier.pop();
                if (visited[pt[0]+','+pt[1]] || cols[pt[0]][pt[1]] != 'R') {
                    continue;
                }
                visited[pt[0]+','+pt[1]] = true;
                cols[pt[0]][pt[1]] = tree;
                if (pt[0] > 0) {
                    frontier.push([pt[0]-1, pt[1]]);
                }
                if (pt[0] < cols.length-1) {
                    frontier.push([pt[0]+1, pt[1]]);
                }
                if (pt[1] > 0) {
                    frontier.push([pt[0], pt[1]-1]);
                }
                if (pt[1] < cols[0].length-1) {
                    frontier.push([pt[0], pt[1]+1]);
                }
            }
        }
    }
    return cols;
}

function addWater(cols, fct, mu, sigma) {
    const nx = cols.length;
    const ny = cols[0].length;
    const sz = nx*ny;
    const n = Math.round(fct*sz/mu);
    for (let i=0; i<n; i++) {
        const x = Math.floor(Math.random()*nx); 
        const y = Math.floor(Math.random()*ny);
        if (x == 0 || y == 0 || x == nx-1 || y == ny-1) {
            i--;
            continue;
        }
        const rsz = mu + Math.round((Math.random()-0.5)*sigma);
        const frontier = [[x,y]];
        const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
        let prev2 = null;
        let prev = [x,y];
        for (let j=0; j<rsz; j++) {
            const rnd = Math.random();
            let next = null;
            if (prev2 == null || Math.random() > 0.8) {
                const d = dirs[Math.floor(Math.random()*4)];
                next = [prev[0]+d[0], prev[1]+d[1]];
            } else {
                const d = [prev[0]-prev2[0], prev[1]-prev2[1]];
                next = [prev[0]+d[0], prev[1]+d[1]];
            }
            if (next[0] == 0 || next[0] == nx-1 || next[1] == 0 || next[1] == ny-1) {
                j--;
                continue;
            }
            cols[next[0]][next[1]] = 'W';
            prev2 = prev;
            prev = next;
        }
    }
    return cols;
}

function addActors(cols, type, fct) {
    const nx = cols.length;
    const ny = cols[0].length;
    const sz = nx*ny;
    const n = Math.round(fct*sz);
    for (let i=0; i<n; i++) {
        const x = Math.floor(Math.random()*nx); 
        const y = Math.floor(Math.random()*ny);
        if (type == 'C') {
            if (cols[x][y] == ' ') {
                cols[x][y] = type;
            }
            continue;
        }
        if (x <= 7 || y <= 7) {
            continue;
        }
        if (cols[x][y] == ' ') {
            cols[x][y] = type;
        }
    }
    return cols;
}

// Create a maze based on the backtracking maze creation algorithm
// 3-wide hallways 1-wide walls
function backtrack(w, h) {
    const cols = [];
    for (let i=0; i<w; i++) {
        const col = [];
        for (let j=0; j<h; j++) {
            col.push('R');
        }
        cols.push(col);
    }
    function expand(pt) {
        for (let i=-1; i<=1; i++) {
            for (let j=-1; j<=1; j++) {
                cols[pt[0]+i][pt[1]+j] = ' ';
            }
        }
    }
    function expandDoor(dir, pt) {
        if (Math.abs(dir[0]) > 0) {
            cols[pt[0]][pt[1]-1] = ' ';
            cols[pt[0]][pt[1]] = ' ';
            cols[pt[0]][pt[1]+1] = ' ';
        } else {
            cols[pt[0]-1][pt[1]] = ' ';
            cols[pt[0]][pt[1]] = ' ';
            cols[pt[0]+1][pt[1]] = ' ';
        }
    }
    function neighbors(pt) {
        const dirs = [[-4,0],[4,0],[0,-4],[0,4]];
        const good = [];
        outer:
        for (const dir of dirs) {
            const tst = [pt[0]+dir[0], pt[1]+dir[1]];
            for (let i=-2; i<=2; i++) {
                if (tst[0]+i < 0 || tst[0]+i >= cols.length) {
                    continue outer;
                }
                for (let j=-2; j<=2; j++) {
                    if (tst[1]+j < 0 || tst[1]+j >= cols[0].length) {
                        continue outer;
                    }
                    if (cols[tst[0]+i][tst[1]+j] != 'R') {
                        continue outer;
                    }
                }
            }
            good.push(dir);
        }
        return good;
    }
    expand([2,2]);
    const stk = [[2,2]];
    do {
        let cur = stk.pop();
        let ns = neighbors(cur); 
        while (ns.length > 0) {
            const dir = ns[Math.floor(Math.random()*ns.length)];
            const half = [cur[0]+dir[0]/2,cur[1]+dir[1]/2];
            const next = [cur[0]+dir[0],cur[1]+dir[1]];
            //cols[half[0]][half[1]] = ' ';
            //cols[next[0]][next[1]] = ' ';
            expand(next);
            expandDoor(dir, half);
            cur = next;
            stk.push(next);
            ns = neighbors(cur);
        }
    } while (stk.length > 0);
    return cols;
}
