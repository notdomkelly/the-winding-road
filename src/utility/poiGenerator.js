export function HillGenerator() {
    return {
        generate(pos, size, noise) {
            const { x, y } = pos;
            const width = size;
            const noiseX2D = noise.x, noiseY2D = noise.y;

            const base = {
                s: {x: x - width, y: y},
                e: {x: x + width, y: y},
                cp1: {x: x, y: y - width},
                cp2: {x: x, y: y},
            };
            ['s', 'e'].forEach(key => {
                const {x: _x, y: _y} = base[key];
                base[key].x = _x + noiseX2D[Math.floor(_x)][Math.floor(_y)] * width / 10 * 4;
                base[key].y = _y + noiseY2D[Math.floor(_x)][Math.floor(_y)] * width / 10;
            });
            ['cp1', 'cp2'].forEach(key => {
                const {x: _x, y: _y} = base[key];
                base[key].x = _x + noiseX2D[Math.floor(_x)][Math.floor(_y)] * width / 10 * 4;
                base[key].y = _y + noiseY2D[Math.floor(_x)][Math.floor(_y)] * width / 10;
            });
            return base;
        },

        render(hill, context) {
            context.moveTo(hill.s.x, hill.s.y);
            context.bezierCurveTo(hill.cp1.x, hill.cp1.y, hill.cp2.x, hill.cp2.y, hill.e.x, hill.e.y);
        }
    }
}

export function MountainGenerator() {
    return {
        generate(pos, size, noise) {
            const { x, y } = pos;
            const width = size;
            const noiseX2D = noise.x, noiseY2D = noise.y;

            const base = {
                s: {x: x - width, y: y},
                e: {x: x + width, y: y},
                p: {x: x, y: y - width},
            };
            const update = {
                s: {x: null, y: null},
                e: {x: null, y: null},
                p: {x: null, y: null},
                m_base: {x: null, y: null},
                s_p: [],
                p_e: [],
                mid: [],
            };
            ['s', 'e'].forEach(key => {
                const {x: _x, y: _y} = base[key];
                update[key].x = _x + noiseX2D[Math.floor(_x)][Math.floor(_y)] * width / 10 * 4;
                update[key].y = _y + noiseY2D[Math.floor(_x)][Math.floor(_y)] * width / 10;
            });
            ['p'].forEach(key => {
                const {x: _x, y: _y} = base[key];
                update[key].x = _x + noiseX2D[Math.floor(_x)][Math.floor(_y)] * width / 10 * 4;
                update[key].y = _y + noiseY2D[Math.floor(_x)][Math.floor(_y)] * width / 10 * 4;
            });
            update.m_base.x = update.s.x + (update.e.x - update.s.x) * 2 / 3;
            update.m_base.y = update.s.y + (update.e.y - update.s.y) / 2;
        
            function addPerturb(start, end, arr, noiseY2D, pertSize = width / 5, subdivisions = 10) {
                const dirVec = { x: end.x - start.x, y: end.y - start.y };
                for (let i = 0; i < subdivisions + 1; i++) {
                    const t = i / subdivisions;
                    const curPoint = {x: start.x + dirVec.x * t, y: start.y + dirVec.y * t};
                    curPoint.y = curPoint.y + noiseY2D[Math.floor(curPoint.x)][Math.floor(curPoint.y)] * pertSize - (pertSize * 2 / 3);
                    arr.push(curPoint);
                }
            }
        
            addPerturb(update.s, update.p, update.s_p, noiseY2D);
            addPerturb(update.p, update.e, update.p_e, noiseY2D);
            addPerturb({x: update.p.x, y: update.p.y + 0.001}, update.m_base, update.mid, noiseY2D, width / 10, 10);
            return update;
        },

        render(mtn, context) {
            function drawPerturbedMountainside(p) {
                for (let i = 1; i < p.length; i++) {
                    context.lineTo(p[i].x, p[i].y);
                }
                
            }
            context.moveTo(mtn.s_p[0].x, mtn.s_p[0].y);
            drawPerturbedMountainside(mtn.s_p);
            drawPerturbedMountainside(mtn.p_e);
        }
        
    }
}