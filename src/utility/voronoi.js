import * as d3 from "d3";
import PoissonDiskSampling from "poisson-disk-sampling";


export function generateVoronoi(width, height, diskSpacing, random) {
    var pds = new PoissonDiskSampling({
        shape: [width, height],
        minDistance: diskSpacing,
    }, random);
    const points = pds.fill();

    return d3.Delaunay.from(points).voronoi([0.5, 0.5, width - 0.5, height - 0.5]);
}


export function relaxVoronoi(numRelax, voronoi) {
    for (let r = 0; r < numRelax; r++) {
        for (let i = 0; i < voronoi.delaunay.points.length / 2; i++) {
            const cell = voronoi.cellPolygon(i);
            const [x1, y1] = d3.polygonCentroid(cell);

            voronoi.delaunay.points[i * 2] = x1;
            voronoi.delaunay.points[i * 2 + 1] = y1;
        }

        voronoi.update();
    }
}


export function getNeighborTriangles(idx, voronoi) {
    return [
        Math.floor(voronoi.delaunay.halfedges[idx * 3 + 0] / 3),
        Math.floor(voronoi.delaunay.halfedges[idx * 3 + 1] / 3),
        Math.floor(voronoi.delaunay.halfedges[idx * 3 + 2] / 3),
    ];
}