import { generateVoronoi, relaxVoronoi } from "./voronoi";
import { makeRectangle } from 'fractal-noise';
import { makeNoise2D } from "open-simplex-noise";
import Painter from "./painter";
import { findCoasts, findMountainRanges, findRivers, sizeRiver } from "./featureGenerator";

class MapController {
    _props = null;
    painter = null;
    voronoi = null;
    noise = null;

    constructor(props) {
        this._props = props;

        this.initialize();
    }

    initialize() {
        const { width, height, random, diskSpacing, seed } = this._props;


        console.log(seed);
        // Generate Voronoi points
        this.voronoi = generateVoronoi(width, height, diskSpacing, random);

        // setup noise
        this.noise = this.setupNoise(seed, random, width, height, this.voronoi);

        const { triangleTypes, coastList } = findCoasts(this.voronoi, this.noise);
        const { ranges, rangeConstraints, hillRanges, hillRangeConstraints } = findMountainRanges(this.voronoi, this.noise, random);

        const riverTree = findRivers(this.voronoi, this.noise, width, height, random);
        sizeRiver(riverTree);

        const features = {
            riverTree,
            coastList,
            triangleTypes,
            mountainRanges: ranges,
            rangeConstraints,
            hillRanges,
            hillRangeConstraints,
        };
        this.painter = new Painter(width, height, this.voronoi, random, this.noise, features);
    }

    draw() {
        this.painter.paint();
    }

    relax(numRelax = 1, voronoi = this.voronoi) {
        relaxVoronoi(numRelax, voronoi);
    }

    setupNoise(seed, random, width, height, voronoi) {
        const noise2D = makeNoise2D(seed);
        const rectNoise = makeRectangle(width, height, noise2D, { frequency: 0.009, octaves: 3, persistence: 0.7, amplitude: 1 });
        const mountainRect = makeRectangle(width, height, makeNoise2D(seed * random() * 10000000 - 5000000), { frequency: 0.0035, octaves: 3, persistence: 0.5, amplitude: 4.5 });
        const continentRect = makeRectangle(width, height, makeNoise2D(seed * random() * 10000000 - 5000000), { frequency: 0.0025, octaves: 4, persistence: 0.1, amplitude: 4.5 });
        
        const basicNoise = {x: null, y: null};
        basicNoise.x = makeRectangle(width, height, noise2D);
        basicNoise.y = makeRectangle(width, height, makeNoise2D(seed * random() * 10000000 - 5000000));
        
        // Preset noise per cell, used for determining land vs water
        const elevationNoise = [];
        for (let i = 0; i < voronoi.delaunay.points.length / 2; i++) {
            const x = voronoi.delaunay.points[i * 2 + 0];
            const y = voronoi.delaunay.points[i * 2 + 1];
            
            let noise = rectNoise[Math.floor(x)][Math.floor(y)];
            noise = (noise * 0.5 + 0.5) - (continentRect[Math.floor(x)][Math.floor(y)] * -0.5 + 0.5);
            elevationNoise.push(noise);
        }
        
        // Preset separate mountain elevation per cell
        const mountainNoise = [];
        for (let i = 0; i < voronoi.delaunay.points.length / 2; i++) {
            const x = voronoi.delaunay.points[i * 2 + 0];
            const y = voronoi.delaunay.points[i * 2 + 1];
            
            let noise = mountainRect[Math.floor(x)][Math.floor(y)] * 0.5 + 0.5;
            mountainNoise.push(noise);
        }
        
        // Preset noise per cell corner
        const t_centerNoise = [];
        for (let i = 0; i < voronoi.delaunay.triangles.length / 3; i++) {
            let x = voronoi.circumcenters[i * 2 + 0];
            let y = voronoi.circumcenters[i * 2 + 1];
            if (x < 0) x = 0;
            if (y < 0) y = 0;
            if (x > width) x = width - 1;
            if (y > height) y = height - 1;
            let noise = rectNoise[Math.floor(x)][Math.floor(y)] * 0.5 + 0.5;
            noise = noise - (continentRect[Math.floor(x)][Math.floor(y)] * -0.5 + 0.5);
            t_centerNoise.push(noise);
        }

        return {
            elevation: elevationNoise,
            triangleElevation: t_centerNoise,
            rect: rectNoise,
            basic: basicNoise,
            mountainNoise: mountainNoise,
            continentRect: continentRect,
        };
    }

}

export default MapController;