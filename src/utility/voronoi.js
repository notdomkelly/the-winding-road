import * as d3 from "d3";
import { makeRectangle } from 'fractal-noise';
import { makeNoise2D } from "open-simplex-noise";

// const tau = 2 * Math.PI;


export default class VoronoiPainter {
    _props = {}
    canvas = null;
    context = null;
    points = null;
    voronoi = null;
    rectNoise = null;
    rectGradient = [];

    constructor(props) {
        this._props = props;
        this.initialize();
    }

    updateProps(newProps) {
        this._props = Object.assign({}, this._props, newProps);
        this.draw();
    }

    initialize() {
        const { width, height, random, numPoints } = this._props;

        this.canvas = d3
            .select('#container')
            .select('canvas').node()
            ? d3.select('#container').select('canvas')
            : d3.select('#container').append('canvas');
        this.canvas
            .attr('width', width)
            .attr('height', height);
        
        this.context = this.canvas.node().getContext('2d');
        this.points = Array.from({length: numPoints}, () => [random() * width, random() * height]);

        this.voronoi = d3.Delaunay.from(this.points).voronoi([0.5, 0.5, width - 0.5, height - 0.5]);
        const noise2D = makeNoise2D(this._props.seed);
        this.rectNoise = makeRectangle(width, height, noise2D, { frequency: 0.0055, octaves: 3, persistence: 0.8, amplitude: 1 });

        for (let x = 0; x < width; x++) {
            this.rectGradient.push([]);
            for (let y = 0; y < height; y++) {
                var xValue = Math.abs(x * 2.0 - width) / width;
                var yValue = Math.abs(y * 2.0 - height) / height;
                var value = Math.max(xValue, yValue);
                this.rectGradient[x].push(value);
            }
        }
    }

    draw() {
        const { width, height } = this._props;

        this.context.clearRect(0, 0, width, height);
        // this._drawDelaunay();
        this._drawVoronoi();
    }

    relax(numRelax = 1) {
        for (let r = 0; r < numRelax; r++) {
            for (let i = 0; i < this._props.numPoints; i++) {
                const cell = this.voronoi.cellPolygon(i);
                const [x1, y1] = d3.polygonCentroid(cell);
    
                this.voronoi.delaunay.points[i * 2] = x1;
                this.voronoi.delaunay.points[i * 2 + 1] = y1;
            }
    
            this.voronoi.update();
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
        const context = this.context, voronoi = this.voronoi;

        // const cellGen = voronoi.cellPolygons();
        // context.beginPath();
        // while (true) {
        //     const cell = cellGen.next();
        //     if (cell.done) {
        //         break;
        //     }
        //     cell.value.forEach(corner => {
        //         context.moveTo(corner[0] + 2, corner[1]);
        //         context.arc(corner[0], corner[1], 2, 0, tau);
        //     });
        // }
        // context.fill();

        const cutoff = this._props.cutoff / 100.0;
        for (let i = 0; i < this._props.numPoints; i++) {
            const x = voronoi.delaunay.points[i * 2 + 0];
            const y = voronoi.delaunay.points[i * 2 + 1];

            context.beginPath();
            voronoi.renderCell(i, context);
            let noise = this.rectNoise[Math.round(x)][Math.round(y)] * 0.5 + 0.5;
            noise = noise - this.rectGradient[Math.round(x)][Math.round(y)];
            let fillColor = '#000';
            if (noise < cutoff) {
                fillColor = '#363377';
            } else if (noise < cutoff + 0.4) {
                fillColor = '#2D6E12';
            } else if (noise < cutoff + 0.55) {
                fillColor = '#554100';
            } else {
                fillColor = '#fff';
            }
            context.fillStyle = fillColor;
            context.fill();
        }

        context.beginPath();
        voronoi.render(context);
        voronoi.renderBounds(context);
        context.strokeStyle = "#000000";
        context.stroke();
    }
}