import {dist, make2dArray, shuffle} from './util.js';

export {makeRooms};

function makeRooms(params) {
	const size = params.size;
	const roomSize = params.roomSize;
	const roomSizeSigma = params.roomSizeSigma;
	const nearLimit = params.nearLimit ?? 5;
	const roomsTgt = 0.8*size[0]*size[1];
	const centers = [];
	const rooms = make2dArray(size[0], size[1], -1);
	const roomPoints = [];
	let nInRooms = 0;
	outer:
	for (let i=0; i<500; i++) {
		if (nInRooms > roomsTgt) {
			break;
		}
		roomPoints.push([]);
		const c = Math.floor(Math.random()*size[0]);
		const r = Math.floor(Math.random()*size[1]);
		const p = {x: c, y: r};
		for (let j=0; j<centers.length; j++) {
			if (dist(p, centers[j]) < nearLimit) {
				continue outer;
			}
		}
		centers.push(p);
		let rs = [
			roomSize[0] + Math.floor(Math.random()*roomSizeSigma[0]), 
			roomSize[1] + Math.floor(Math.random()*roomSizeSigma[1])];
		rs = Math.random() > 0.5 ? rs : [rs[1], rs[0]];
		const xi = Math.floor(p.x-rs[0]/2);
		const xf = Math.floor(p.x+rs[0]/2);
		const yi = Math.floor(p.y-rs[1]/2);
		const yf = Math.floor(p.y+rs[1]/2);
		for (let x=xi; x<xf; x++) {
			if (x < 0 || x >= size[0]) continue;
			for (let y=yi; y<yf; y++) {
				if (y < 0 || y >= size[1]) continue;
				if (rooms[x][y] == -1) {
					rooms[x][y] = i;
					roomPoints[i].push([x, y]);
					nInRooms++;
				}
			}
		}
	}
	const map = make2dArray(size[0], size[1], ' ');
	const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
	const doorPlaces = [];
	for (let i=0; i<size[0]; i++) {
		for (let j=0; j<size[1]; j++) {
			for (let k=0; k<dirs.length; k++) {
				const x = i+dirs[k][0];
				const y = j+dirs[k][1];
				if (x < 0 || x >= size[0] || y < 0 || y >= size[1]) {
					continue;
				}
				const r1 = rooms[i][j];
				const r2 = rooms[x][y];
				if (r1 < r2) {
					map[i][j] = 'R';
					doorPlaces.push([r1, r2, i, j]);
				}
			}
		}
	}
	// Place doors or openings
	const doors = [];
	shuffle(doorPlaces);
	outer2:
	for (let i=0; i<doorPlaces.length; i++) {
		const r1 = doorPlaces[i][0];
		const r2 = doorPlaces[i][1];
		const x = doorPlaces[i][2];
		const y = doorPlaces[i][3];
		for (let j=0; j<doors.length; j++) {
			if (doors[j][0] == r1 && doors[j][1] == r2) {
				continue outer2;
			}
		}
		doors.push([r1, r2]);
		if (Math.random() < 0.3) {
			map[x][y] = 'D';
		} else {
			map[x][y] = ' ';
		}
	}
	// Place keys
	for (let i=0; i<roomPoints.length; i++) {
		// This can sometimes happen
		if (roomPoints[i].length == 0) {
			continue;
		}
		const idx = Math.floor(Math.random()*roomPoints[i].length);
		const r = roomPoints[i][idx][0];
		const c = roomPoints[i][idx][1]; 
		map[r][c] = 'K';
	}
	const map2 = make2dArray(size[0]+2, size[1]+2, 'R');
	for (let i=0; i<size[0]; i++) {
		for (let j=0; j<size[1]; j++) {
			map2[i+1][j+1] = map[i][j];
		}
	}
	return map2;
}
