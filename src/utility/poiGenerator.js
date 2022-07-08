export function generateHill(x, y, width, noiseX2D, noiseY2D) {
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
}

export function renderHill(hill, context) {
    context.moveTo(hill.s.x, hill.s.y);
    context.bezierCurveTo(hill.cp1.x, hill.cp1.y, hill.cp2.x, hill.cp2.y, hill.e.x, hill.e.y);
}

export function generateMountain(x, y, width, noiseX2D, noiseY2D) {
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
}

export function renderMountain(hill, context) {
    context.moveTo(hill.s.x, hill.s.y);
    context.bezierCurveTo(hill.cp1.x, hill.cp1.y, hill.cp2.x, hill.cp2.y, hill.e.x, hill.e.y);
}