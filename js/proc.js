export {addActors, addCells, addRooms, addTrees, addWater, backtrack, makeEmpty};

function makeEmpty(w, h) {
    const cols = [];
    for (let i=0; i<w; i++) {
        const col = [];
        for (let j=0; j<h; j++) {
            if (i == 0 || j == 0 || i == w-1 || j == h-1) {
                col.push('R');
            } else {
                col.push(' ');
            }
        }
        cols.push(col);
    }
    return cols;
}

// num cells with key in each cell
// key should be reachable from any point in its cell
function addCells(cols, num) {
    function cycle(edges, a, b, visited) {
        if (!visited) visited = [a];
        for (let i=0; i<edges.length; i++) {
            if (edges[i][0] == a && edges[i][1] == b) {
                return true;
            } else if (edges[i][0] == b && edges[i][1] == a) {
                return true;
            } 
            const n0 = edges[i][1] == a && visited.indexOf(edges[i][0]) == -1;
            const n1 = edges[i][0] == a && visited.indexOf(edges[i][1]) == -1;
            if (n0) {
                const nv = [...visited, edges[i][0]];
                if (cycle(edges, edges[i][0], b, nv)) {
                    return true;
                }
            }
            if (n1) {
                const nv = [...visited, edges[i][1]];
                if (cycle(edges, edges[i][1], b, nv)) {
                    return true;
                }
            }
        }
        return false;
    }
    const nx = cols.length;
    const ny = cols[0].length;
    const sz = nx*ny;
    const visited = {};
    const frontiers = [];
    const origins = [];
    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    const walls = [];
    const edges = [];
    outer:
    for (let i=0; i<num; i++) {
        const x = Math.floor(Math.random()*nx);
        const y = Math.floor(Math.random()*ny);
        if (cols[x][y] != ' ' || x == 0 || y == 0 || x == nx-1 || y == ny-1) {
            i--;
            continue;
        }
        // No nearby starts
        for (let i=0; i<frontiers.length; i++) {
            const pt = frontiers[i][0];
            if (Math.abs(x-pt[0]) <= 5 && Math.abs(y-pt[1]) <= 5) {
                i--;
                continue outer;
            }
        }
        // Place key
        cols[x][y] = 'K';
        console.log('key', x, y);
        frontiers.push([[x,y]]);
    }
    let done = false;
    while (!done) {
        done = true;
        for (let i=0; i<frontiers.length; i++) {
            const ft = frontiers[i];
            const nft = [];
            while (ft.length > 0) {
                done = false;
                const pt = ft.pop();
                const vis = visited[pt[0]+','+pt[1]];
                if (vis && vis != i+1) {
                    if (!cycle(edges, i+1, vis)) {
                        edges.push([i+1, vis]);
                        cols[pt[0]][pt[1]] = 'D';
                        console.log('door', pt[0], pt[1]);
                    } else {
                        walls.push(pt);
                    }
                    continue;
                } else if (vis) {
                    continue;
                }
                visited[pt[0]+','+pt[1]] = i+1;
                for (const dir of dirs) {
                    const next = [pt[0]+dir[0], pt[1]+dir[1]];
                    const oth = visited[next[0]+','+next[1]];
                    // Hit edge - place wall and don't expand frontier in this direction
                    if (next[0] == 0 || next[0] == nx-1 || next[1] == 0 || next[1] == ny-1) {
                        walls.push(next);
                    } else if (!oth) {
                        nft.push(next);
                    }
                }
            }
            frontiers[i] = nft;
        }
    }
    // Place walls
    for (const wall of walls) {
        if (cols[wall[0]][wall[1]] == ' ') {
            cols[wall[0]][wall[1]] = 'R';
        }
    }
    // Fill in diagonal walls
    const dirs2 = [[1,1],[1,-1],[-1,1],[-1,-1]];
    for (let i=0; i<nx; i++) {
        for (let j=0; j<ny; j++) {
            if (cols[i][j] == ' ') {
                const v1 = visited[i+','+j];
                for (const dir of dirs2) {
                    const p2 = [i+dir[0], j+dir[1]];
                    if (cols[p2[0]][p2[1]] == ' ') {
                        const v2 = visited[p2[0]+','+p2[1]];
                        if (v1 != v2) {
                            cols[p2[0]][p2[1]] = 'R';
                        }
                    }
                }
            }
        }
    }
    return cols;
}

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
        // BigBoy takes up 2x2 spaces
        if (type == 'B') {
            if (cols[x][y] == ' ' && cols[x+1][y] == ' ' && cols[x][y+1] == ' ' && cols[x+1][y+1] == ' ') {
                cols[x][y] = type;
                cols[x+1][y] = 'b';
                cols[x][y+1] = 'b';
                cols[x+1][y+1] = 'b';
            }
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
