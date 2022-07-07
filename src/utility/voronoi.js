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
    continentGradient = [];
    singleContinent = true;

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
        this.rectNoise = makeRectangle(width, height, noise2D, { frequency: 0.008, octaves: 3, persistence: 0.8, amplitude: 1 });

        this._findContinents()
    }

    draw() {
        const { width, height } = this._props;

        this.context.clearRect(0, 0, width, height);
        // this._drawDelaunay();
        this._drawVoronoi();
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
        const { width, height, random, numContinents } = this._props;

        if (this.singleContinent) {
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
        } else {
            let continentPositions = Array.from({length: numContinents}, () => [random() * width, random() * height]);
            const continentSize = width / (1 + Math.log(numContinents));
            const continentVoronoi = d3.Delaunay.from(continentPositions).voronoi([0.5, 0.5, width - 0.5, height - 0.5]);
            this.relax(5, continentVoronoi);
            continentPositions = [];
            for (let i = 0; i < continentVoronoi.delaunay.points.length / 2; i++) {
                continentPositions.push([continentVoronoi.delaunay.points[i * 2 + 0], continentVoronoi.delaunay.points[i * 2 + 1]]);
            }
    
            for (let x = 0; x < width; x++) {
                // var xValue = Math.abs(x * 2.0 - width) / width;
                this.continentGradient.push([]);
                for (let y = 0; y < height; y++) {
                    // yValues.push(Math.abs(y * 2.0 - height) / height);
                    const dist = continentPositions.reduce((prev, curr) => {
                        const thisDist = Math.sqrt(Math.pow(x - curr[0], 2) + Math.pow(y - curr[1], 2)) / continentSize;
                        return Math.min(thisDist, prev);
                    }, 1);
                    // const dist = Math.sqrt(Math.pow(x - continentPositions[0][0], 2) + Math.pow(y - continentPositions[0][1], 2)) / continentSize;
                    // var value = Math.min(xValue, yValue);
                    this.continentGradient[x].push(dist);
                }
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
            noise = noise - this.continentGradient[Math.round(x)][Math.round(y)];
            let fillColor = '#000';
            if (noise <= cutoff) {
                fillColor = '#363377';
            } else if (noise < cutoff + 0.4) {
                fillColor = '#2D6E12';
            } else if (noise < cutoff + 0.55) {
                fillColor = '#554100';
            } else {
                fillColor = '#fff';
            }
            if (false) {
                noise = this.continentGradient[Math.round(x)][Math.round(y)] * 255;
                fillColor = `rgb(${noise},${noise},${noise})`
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