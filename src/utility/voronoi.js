import * as d3 from "d3";
import { makeRectangle } from 'fractal-noise';
import { makeNoise2D } from "open-simplex-noise";
import PoissonDiskSampling from "poisson-disk-sampling";
import { generateHill, generateMountain, renderHill, renderMountain } from '../utility/poiGenerator';

export default class VoronoiPainter {
    _props = {}
    canvas = null;
    context = null;
    points = null;
    voronoi = null;
    rectNoise = null;
    continentGradient = [];
    basicNoise = {x: null, y: null};
    pois = {};

    constructor(props) {
        this._props = props;
        this.pois = {
            hill: [],
            mountain: [],
        }
        this.initialize();
    }

    updateProps(newProps) {
        this._props = Object.assign({}, this._props, newProps);
        this.draw();
    }

    initialize() {
        const { width, height, random, diskSpacing } = this._props;

        this.canvas = d3
            .select('#container')
            .select('canvas').node()
            ? d3.select('#container').select('canvas')
            : d3.select('#container').append('canvas');
        this.canvas
            .attr('width', width)
            .attr('height', height);
        
        this.context = this.canvas.node().getContext('2d');
        var pds = new PoissonDiskSampling({
            shape: [width, height],
            minDistance: diskSpacing,
        }, random);
        this.points = pds.fill();

        this.voronoi = d3.Delaunay.from(this.points).voronoi([0.5, 0.5, width - 0.5, height - 0.5]);
        const noise2D = makeNoise2D(this._props.seed);
        this.rectNoise = makeRectangle(width, height, noise2D, { frequency: 0.009, octaves: 3, persistence: 0.5, amplitude: 1 });
        
        this.basicNoise.x = makeRectangle(width, height, noise2D);
        this.basicNoise.y = makeRectangle(width, height, makeNoise2D(this._props.seed * random() * 10000000 - 5000000));

        this._findContinents();
    }

    draw() {
        const { width, height } = this._props;

        this.context.clearRect(0, 0, width, height);
        this._drawVoronoi();
        // this._drawDelaunay();
    }

    relax(numRelax = 1, voronoi = this.voronoi) {
        for (let r = 0; r < numRelax; r++) {
            for (let i = 0; i < this.voronoi.delaunay.points.length / 2; i++) {
                const cell = voronoi.cellPolygon(i);
                const [x1, y1] = d3.polygonCentroid(cell);
    
                voronoi.delaunay.points[i * 2] = x1;
                voronoi.delaunay.points[i * 2 + 1] = y1;
            }
    
            voronoi.update();
        }
    }

    _findContinents() {
        const { width, height } = this._props;

        const yValues = [];
        for (let x = 0; x < width; x++) {
            const xValue = Math.abs(x * 2.0 - width) / width;
            this.continentGradient.push([]);
            for (let y = 0; y < height; y++) {
                if (yValues.length < y) {
                    yValues.push(Math.abs(y * 2.0 - height) / height);
                }
                const yValue = yValues[y];
                const value = Math.max(xValue, yValue);
                this.continentGradient[x].push(value);
            }
        }
    }

    _drawDelaunay() {
        const context = this.context, voronoi = this.voronoi;
        context.beginPath();
        voronoi.delaunay.render(context);
        context.strokeStyle = "#3A3276";
        context.stroke();

        context.beginPath();
        voronoi.delaunay.renderPoints(context);
        context.fillStyle = "#261758";
        context.fill();
    }

    _drawVoronoi() {
        const context = this.context, voronoi = this.voronoi, cutoff = this._props.cutoff / 100.0;

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

        // need to draw coast on top
        context.lineWidth = 2;
        context.lineJoin = 'round';
        context.strokeStyle = '#5d4122';
        context.beginPath();
        for (let i = 0; i < this.voronoi.delaunay.points.length / 2; i++) {
            this._drawCoastBorders(i, cutoff);
        }
        context.stroke();

        context.beginPath();
        context.lineWidth = 4;
        context.strokeStyle = "#5d4122";
        voronoi.renderBounds(context);
        context.stroke();

        this._reorderPois('mountain');

        ['hill', 'mountain'].forEach(poiType => {
            this.pois[poiType].forEach(poiInfo => {
                const idx = poiInfo[0];
                const poiData = poiInfo[1];
                this._drawPoi(idx, poiType, poiData);
            });
        });
    }


    _drawCell(idx, drawOcean = false, postWavePass = false) {
        const context = this.context, voronoi = this.voronoi, cutoff = this._props.cutoff / 100.0;
        let noise = this._getNoiseForCell(idx);

        const pert = noise * 30;
        let r, g, b;
        if (drawOcean) {
            r = 191;
            g = 196;
            b = 176;
        } else if(noise > cutoff) {
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
                alpha = 0.5 + this.continentGradient[Math.round(x)][Math.round(y)] / 2;
            } else {
                alpha = 0 + this.continentGradient[Math.round(x)][Math.round(y)] / 2;
            }
        }
        const fillColor = `rgba(${r + pert}, ${g + pert}, ${b + pert}, ${alpha})`;
        context.fillStyle = fillColor;
        context.strokeStyle = fillColor;
        context.beginPath();
        voronoi.renderCell(idx, context);
        context.stroke();
        context.fill();

        if (noise < cutoff + 0.30) return;
        const poiType = (noise > cutoff + 0.45) ? 'mountain' : 'hill';
        const x = this.voronoi.delaunay.points[idx * 2 + 0];
        const y = this.voronoi.delaunay.points[idx * 2 + 1];
        let poi = null;
        let shouldDraw = false;
        if (poiType === 'hill') {
            shouldDraw = this._props.random() > 0.85;
            if (shouldDraw) poi = generateHill(x, y, 20 * noise, this.basicNoise.x, this.basicNoise.y);
        } else if (poiType === 'mountain') {
            shouldDraw = this._props.random() > 0.5;
            if (shouldDraw) poi = generateMountain(x, y, 20 * noise, this.basicNoise.x, this.basicNoise.y);
        }
        if (shouldDraw) this.pois[poiType].push([idx, poi]);
    }

    _getNoiseForCell(idx) {
        const x = this.voronoi.delaunay.points[idx * 2 + 0];
        const y = this.voronoi.delaunay.points[idx * 2 + 1];
        
        let noise = this.rectNoise[Math.round(x)][Math.round(y)] * 0.5 + 0.5;
        noise = noise - this.continentGradient[Math.round(x)][Math.round(y)];

        return noise;
    }

    _drawCoastBorders(idx, cutoff) {
        const voronoi = this.voronoi;
        const myNoise = this._getNoiseForCell(idx);

        const e0 = voronoi.delaunay.inedges[idx];
        let e = e0;
        do {
            const t0 = Math.floor(e / 3);
            e = e % 3 === 2 ? e - 2 : e + 1;
            if (voronoi.delaunay.triangles[e] !== idx) break; // bad triangulation
            e = voronoi.delaunay.halfedges[e];
            if (e === -1) break;
            const t1 = Math.floor(e / 3);

            const neighborCell = voronoi.delaunay.triangles[e];
            if (neighborCell > idx) {
                continue;
            }

            const neighborNoise = this._getNoiseForCell(neighborCell);

            const shoreLine = ((neighborNoise <= cutoff && myNoise > cutoff) || (myNoise <= cutoff && neighborNoise > cutoff));
            if (shoreLine) {
                this._drawSingleBorder(t0, t1);
            }
        } while (e !== e0 && e !== -1);
    }

    _drawSingleBorder(t0, t1) {
        const context = this.context, voronoi = this.voronoi;

        const t0x = voronoi.circumcenters[t0 * 2 + 0];
        const t0y = voronoi.circumcenters[t0 * 2 + 1];

        const t1x = voronoi.circumcenters[t1 * 2 + 0];
        const t1y = voronoi.circumcenters[t1 * 2 + 1];
        
        context.moveTo(t0x, t0y);
        context.lineTo(t1x, t1y);
    }

    _drawWaves() {
        for (let i = 0; i < this._props.height; i += Math.floor(this._props.height / 100)) {
            this._drawWaveLine(i);
        }
    }

    _drawWaveLine(baseHeight) {
        const context = this.context;

        context.beginPath();
        context.lineWidth = 0.5;
        context.strokeStyle = '#5d4122';
        context.moveTo(-1, baseHeight);
        for (let i = 0; i < this._props.width; i++) {
            const noise = this.rectNoise[i][Math.round(baseHeight)]
            context.lineTo(i + noise * 10, Math.sin(i) + baseHeight + noise * 2);
        }
        context.stroke();

    }

    _reorderPois(poiType) {
        if (poiType === 'mountain') {
            this.pois[poiType].sort((a, b) => a[1].m_base.y - b[1].m_base.y)
        }
    }

    _drawPoi(idx, poiType, poiData) {
        const context = this.context;
        const noise = this._getNoiseForCell(idx);

        context.beginPath();
        context.strokeStyle = '#5d4122';
        let r = 192, g = 149, b = 100;
        const noiseOff = noise * 60 - 15;
        context.fillStyle = `rgb(${r + noiseOff},${g + noiseOff},${b + noiseOff})`;
        context.lineWidth = 1;
        if (poiType === 'hill') {
            renderHill(poiData, context);

        } else if (poiType === 'mountain') {
            renderMountain(poiData, context);
        }
        context.fill();
        context.stroke();
    }
}