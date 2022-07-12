import * as d3 from "d3";
import { HillGenerator, MountainGenerator } from '../utility/poiGenerator';
import { TriangleType } from "./featureGenerator";
import PoissonDiskSampling from "poisson-disk-sampling";

const generators = {
    'hill': HillGenerator(),
    'mountain': MountainGenerator(),
};
const poiSize = {
    'hill': n => 20 * Math.abs(n),
    'mountain': n => 20 * n,
};


class Painter {
    context = null;
    width = 0;
    height = 0;
    noise = null;
    voronoi = null;
    random = null;
    pois = { hill: [], mountain: [] };
    features = null;

    constructor(width, height, voronoi, random, noise, features) {
        this.width = width;
        this.height = height;
        this.random = random;
        this.voronoi = voronoi;
        this.noise = noise;
        this.features = features;


        const canvas = d3
            .select('#container')
            .select('canvas').node()
            ? d3.select('#container').select('canvas')
            : d3.select('#container').append('canvas');
        canvas
            .attr('width', width)
            .attr('height', height);
        
        this.context = canvas.node().getContext('2d');

    }

    paint() {
        this.context.clearRect(0, 0, this.width, this.height);
        this._drawCells();
        // this._drawDelaunay();
        this._drawCoast();
        this._drawMountainRanges();
        this._drawHillRanges();
        // this._drawRivers();

        this._reorderPois('hill');
        this._reorderPois('mountain');

        ['hill', 'mountain'].forEach(poiType => {
            this.pois[poiType].forEach(poiInfo => {
                const idx = poiInfo[0];
                const poiData = poiInfo[1];
                this._drawPoi(idx, poiType, poiData);
            });
        });
    }

    _drawDelaunay() {
        this.context.lineWidth = 1;
        const update = () => {
            this.context.beginPath();
            this.context.strokeStyle = '#00000055';
            this.voronoi.delaunay.render(this.context);
            this.context.stroke();
        }

        this.context.canvas.onmousemove = event => {
            event.preventDefault();
            update();

            const x = event.layerX - 50;
            const y = event.layerY - 50;
            const idx = this.voronoi.delaunay.find(x, y);

            this.context.beginPath();
            this.context.strokeStyle = '#99000077';
            this.context.moveTo(x + 2, y);
            this.context.arc(x, y, 2, 0, 2 * Math.PI);
            this.context.stroke();

            const p_x = this.voronoi.delaunay.points[idx * 2];
            const p_y = this.voronoi.delaunay.points[idx * 2 + 1];

            this.context.beginPath();
            this.context.fillStyle = '#009900';
            this.context.moveTo(p_x + 4, p_y);
            this.context.arc(p_x, p_y, 4, 0, 2 * Math.PI);
            this.context.fill();

            const i_e = this.voronoi.delaunay.inedges[idx]; // this gives a halfedge index
            const t = Math.floor(i_e / 3); // halfedge index per vertex, so 3 per triangle
            console.log(t);

            this.context.beginPath();
            this.context.strokeStyle = '#0000aa';
            this.voronoi.delaunay.renderTriangle(t, this.context);
            this.context.stroke();

            for (let i = 0; i < 3; i++) {
                const neighbor_h = this.voronoi.delaunay.halfedges[t * 3 + i];
                const neighbor = Math.floor(neighbor_h / 3);

                this.context.beginPath();
                this.context.strokeStyle = '#aaaaaa';
                this.voronoi.delaunay.renderTriangle(neighbor, this.context);
                this.context.stroke();
            }
        }
        update();
    }

    _drawCells() {
        // draw water
        for (let i = 0; i < this.voronoi.delaunay.points.length / 2; i++) {
            this._drawCell(i, true);
        }

        this._drawWaves();

        // water opacity pass on waves
        for (let i = 0; i < this.voronoi.delaunay.points.length / 2; i++) {
            this._drawCell(i, true, true);
        }

        // draw land
        for (let i = 0; i < this.voronoi.delaunay.points.length / 2; i++) {
            this._drawCell(i, false);
        }

        // this.context.beginPath();
        // this.context.lineWidth = 4;
        // this.context.strokeStyle = "#5d4122";
        // this.voronoi.renderBounds(this.context);
        // this.context.stroke();
    }


    _drawCell(idx, drawOcean = false, postWavePass = false) {
        let noise = this.noise.elevation[idx];

        const pert = noise * 30;
        let r, g, b;
        if (drawOcean) {
            r = 191;
            g = 196;
            b = 176;
        } else if(noise > 0) {
            r = 192;
            g = 149;
            b = 100;
        } else {
            return;
        }
        let alpha = 1;
        if (postWavePass) {
            const x = this.voronoi.delaunay.points[idx * 2 + 0];
            const y = this.voronoi.delaunay.points[idx * 2 + 1];
            if (noise < -0.14) {
                alpha = 1;
            } else if (noise < -0.075) {
                alpha = 0.5 + (this.noise.continentRect[Math.floor(x)][Math.floor(y)] * -0.5 + 0.5) / 2;
            } else {
                alpha = 0 + (this.noise.continentRect[Math.floor(x)][Math.floor(y)] * -0.5 + 0.5) / 2;
            }
        }
        const fillColor = `rgba(${r + pert}, ${g + pert}, ${b + pert}, ${alpha})`;
        this.context.fillStyle = fillColor;
        this.context.strokeStyle = fillColor;
        this.context.beginPath();
        this.voronoi.renderCell(idx, this.context);
        this.context.stroke();
        this.context.fill();
    }

    _drawCoastRecur(node, start) {
        if (!node.next) return false
        if (node.next.triangle === start) return true

        const next = node.next;
        const x = this.voronoi.circumcenters[next.triangle * 2 + 0], y = this.voronoi.circumcenters[next.triangle * 2 + 1];
        this.context.lineTo(x, y);
        return this._drawCoastRecur(next, start);    
    }

    _drawCoast() {
        this.context.beginPath();
        this.context.lineWidth = 2;
        this.context.strokeStyle = '#5d4122';
        for (let i = 0; i < this.features.coastList.length; i++) {
            const node = this.features.coastList[i];
            const x = this.voronoi.circumcenters[node.triangle * 2 + 0], y = this.voronoi.circumcenters[node.triangle * 2 + 1];
            this.context.moveTo(x, y);
            const moveToStart = this._drawCoastRecur(node, node.triangle);
            if (moveToStart) {
                this.context.lineTo(x, y);
            }
        }
        this.context.stroke();
    }

    _drawWaves() {
        for (let i = 0; i < this.height; i += Math.floor(this.height / 100)) {
            this._drawWaveLine(i);
        }
    }

    _drawWaveLine(baseHeight) {
        this.context.beginPath();
        this.context.lineWidth = 0.5;
        this.context.strokeStyle = '#5d4122';
        this.context.moveTo(-1, baseHeight);
        for (let i = 0; i < this.width; i++) {
            const noise = this.noise.rect[i][Math.floor(baseHeight)]
            this.context.lineTo(i + noise * 10, Math.sin(i) + baseHeight + noise * 2);
        }
        this.context.stroke();

    }

    _reorderPois(poiType) {
        if (poiType === 'mountain') {
            this.pois[poiType].sort((a, b) => a[1].m_base.y - b[1].m_base.y)
        }
        if (poiType === 'hill') {
            this.pois[poiType].sort((a, b) => a[1].m_base.y - b[1].m_base.y)
        }
    }

    _drawPoi(idx, poiType, poiData) {
        const noise = this.noise.elevation[idx];

        this.context.beginPath();
        this.context.strokeStyle = '#5d4122';
        let r = 192, g = 149, b = 100;
        const noiseOff = noise * 60 - 15;
        this.context.fillStyle = `rgb(${r + noiseOff},${g + noiseOff},${b + noiseOff})`;
        this.context.lineWidth = 1;
        generators[poiType].render(poiData, this.context);
        this.context.fill();
        this.context.stroke();
    }

    _drawRivers = async() => {
        this.context.lineWidth = 1;
        for (let i = 0; i < this.features.riverTree.length; i++) {
            if (this.features.riverTree[i].size < 5) continue;
            this._drawRiverRecur(this.features.riverTree[i], `rgb(${this.random() * 255},${this.random() * 255},${this.random() * 255})`);
        }
        // await new Promise(resolve => setTimeout(resolve, 0));
    }

    _drawRiverRecur = async(node, color) => {
        const drawPath = (n, p) => {
            if (!(this.features.triangleTypes[n.index] === TriangleType.LAND || this.features.triangleTypes[p.index] === TriangleType.LAND)) return;
            // if (p.size === 1) return;

            const sx = this.voronoi.circumcenters[n.index * 2], sy = this.voronoi.circumcenters[n.index * 2 + 1];
            const ex = this.voronoi.circumcenters[p.index * 2], ey = this.voronoi.circumcenters[p.index * 2 + 1];

            this.context.beginPath();
            this.context.lineWidth = p.size / 3;
            this.context.strokeStyle = '#3557a9' // color;
            this.context.moveTo(sx, sy);
            this.context.quadraticCurveTo((sx + ex) / 2 + this.random() * 2 - 1, (sy + ey) / 2 + this.random() * 2 - 1, ex, ey)
            this.context.stroke();

        }

        if (node.left) {
            if (!node.right) {
                drawPath(node, node.left);
                this._drawRiverRecur(node.left);
            }
            else if (node.right && node.right.size <= node.left.size) {
                drawPath(node, node.left);
                this._drawRiverRecur(node.left);
            }
        }
        if (node.right) {
            if (!node.left) {
                drawPath(node, node.right);
                this._drawRiverRecur(node.right);
            }
            else if (node.left && node.left.size <= node.right.size) {
                drawPath(node, node.right);
                this._drawRiverRecur(node.right);
            }
        }
    }

    _drawMountainRanges() {
        for (let i = 0; i < this.features.mountainRanges.length; i++) {
            const constraint = this.features.rangeConstraints[i];
            const width = constraint.max.x - constraint.min.x;
            const height = constraint.max.y - constraint.min.y;
            var pds = new PoissonDiskSampling({
                shape: [width, height],
                minDistance: 20,
            }, this.random);
            const points = pds.fill();

            const range = this.features.mountainRanges[i];

            const cellsInRange = range.map(c => c.cell);
            const poiType = 'mountain';

            for (let j = 0; j < points.length; j++) {
                const p = points[j];
                const x = p[0] + constraint.min.x, y = p[1] + constraint.min.y
                const cell = this.voronoi.delaunay.find(x, y);
                if (!cellsInRange.includes(cell)) continue;

                const cellElevation = range.find(c => c.cell === cell).elevation
                
                const poi = generators[poiType].generate({ x, y }, poiSize[poiType](cellElevation), this.noise.basic);

                
                const s_cell = this.voronoi.delaunay.find(poi.s.x, poi.s.y); 
                const e_cell = this.voronoi.delaunay.find(poi.e.x, poi.e.y);
                if (this.noise.elevation[s_cell] <= 0 || this.noise.elevation[e_cell] <= 0) continue;

                this.pois[poiType].push([cell, poi]);
            }
        }
    }

    _drawHillRanges() {
        for (let i = 0; i < this.features.hillRanges.length; i++) {
            const constraint = this.features.hillRangeConstraints[i];
            const width = constraint.max.x - constraint.min.x;
            const height = constraint.max.y - constraint.min.y;
            var pds = new PoissonDiskSampling({
                shape: [width, height],
                minDistance: 20,
            }, this.random);
            const points = pds.fill();

            const range = this.features.hillRanges[i];

            const cellsInRange = range.map(c => c.cell);
            const poiType = 'hill';

            for (let j = 0; j < points.length; j++) {
                const p = points[j];
                const x = p[0] + constraint.min.x, y = p[1] + constraint.min.y
                const cell = this.voronoi.delaunay.find(x, y);
                if (!cellsInRange.includes(cell)) continue;

                const cellElevation = range.find(c => c.cell === cell).elevation
                
                const poi = generators[poiType].generate({ x, y }, poiSize[poiType](cellElevation), this.noise.basic);

                
                const s_cell = this.voronoi.delaunay.find(poi.s.x, poi.s.y); 
                const e_cell = this.voronoi.delaunay.find(poi.e.x, poi.e.y);
                if (this.noise.elevation[s_cell] <= 0 || this.noise.elevation[e_cell] <= 0) continue;

                this.pois[poiType].push([cell, poi]);
            }
        }
    }
}

export default Painter;