import { getNeighborTriangles } from "./voronoi";

const MOUNTAIN_RANGE_CUTOFF = 0.8;
export const TriangleType = {
    LAND: 0,
    WATER: 1,
    COAST: 2,
};


export function findCoasts(voronoi, noise) {
    const triangleTypes = [];
    const triangleToNode = [];
    const coastLinkedListNodes = [];
    const coastLinkedLists = [];
    const edges = []; // more important! start with these!

    const buildLinkedList = (node) => {
        let nNode = null;
        for (let i = 0; i < node.c_neighbors.length; i++){ 
            if (node.c_neighbors[i] === -1) continue;
            const t_nNode = coastLinkedListNodes[triangleToNode[node.c_neighbors[i]]];
            if (t_nNode.next?.triangle === node.triangle) continue;

            nNode = t_nNode;
            break;
        }
        if (nNode === null) return;

        node.next = nNode;
        nNode.prev = node;
        nNode.state = 1;

        if (nNode.next) return;
        
        buildLinkedList(nNode);
    } 

    for (let i = 0; i < voronoi.delaunay.triangles.length / 3; i++) {
        const v0 = voronoi.delaunay.triangles[i * 3 + 0];
        const v1 = voronoi.delaunay.triangles[i * 3 + 1];
        const v2 = voronoi.delaunay.triangles[i * 3 + 2];

        const n0 = noise.elevation[v0] > 0;
        const n1 = noise.elevation[v1] > 0;
        const n2 = noise.elevation[v2] > 0;

        if (n0 === n1 && n0 === n2) {
            triangleToNode.push(null);
            triangleTypes.push(n0 ? TriangleType.LAND : TriangleType.OCEAN);
        } else {
            const node = { next: null, prev: null, triangle: i, c_neighbors: null };
            let c_neighbors = [];
            let pushedEdge = false;
            if (n0 !== n1) {
                const n = Math.floor(voronoi.delaunay.halfedges[i * 3 + 0] / 3);
                if (n === -1) {
                    edges.push(node);
                } else {
                    c_neighbors.push(n);
                }
            }
            if (n1 !== n2) {
                const n = Math.floor(voronoi.delaunay.halfedges[i * 3 + 1] / 3);
                if (n === -1 && !pushedEdge) {
                    edges.push(node);
                } else {
                    c_neighbors.push(n);
                }
            }
            if (n2 !== n0) {
                const n = Math.floor(voronoi.delaunay.halfedges[i * 3 + 2] / 3);
                if (n === -1 && !pushedEdge) {
                    edges.push(node);
                } else {
                    c_neighbors.push(n);
                }
            }
            node.c_neighbors = c_neighbors;
            triangleToNode.push(coastLinkedListNodes.length);
            triangleTypes.push(TriangleType.COAST);
            coastLinkedListNodes.push(node);
        }
    }

    for (let i = 0; i < edges.length; i++) {
        const node = edges[i];
        if (node.prev) continue;
        
        coastLinkedLists.push(node);
        buildLinkedList(node);
    }

    for (let i = 0; i < coastLinkedListNodes.length; i++) {
        const node = coastLinkedListNodes[i];
        if (node.prev) continue;
        
        coastLinkedLists.push(node);
        buildLinkedList(node);
    }
    return {
        triangleTypes: triangleTypes,
        coastList: coastLinkedLists,
    };
}


export function findRivers(voronoi, noise, width, height, random) {
    // TODO: Instead of starting with the set of all possible triangles, start with only edge triangles, and add siblings
    //      once a triangle has been worked
    //      That should let us more randomly walk up the trees, and get longer-forming rivers maybe.
    //      Not something huge, though

    const riverTree = [];
    const riverTreeNodes = [];
    const triangleQueue = [];

    for (let i = voronoi.delaunay.triangles.length / 3 - 1; i >= 0; i--) {
        const x = voronoi.circumcenters[i * 2 + 0];
        const y = voronoi.circumcenters[i * 2 + 1];
        const edgeTriangle = (
            (x <= 0 || x >= width) ||
            (y <= 0 || y >= height)
        );
        riverTreeNodes.push({ size: 0, left: null, right: null, index: voronoi.delaunay.triangles.length / 3 - 1 -i, state: 0 });
        if (edgeTriangle) {
            riverTreeNodes[voronoi.delaunay.triangles.length / 3 - 1 - i].state = 1;
            triangleQueue.push(i);
        }
    }

    
    while (triangleQueue.length > 0) {
        const next = Math.floor(random() * triangleQueue.length);
        const i = triangleQueue.splice(next, 1)[0];
        if (i === undefined) {
            break;
        }
        if (riverTreeNodes[i].state === 2){
            continue;
        }
        const x = voronoi.circumcenters[i * 2 + 0];
        const y = voronoi.circumcenters[i * 2 + 1];
        const edgeTriangle = (
            (x <= 0 || x >= width) ||
            (y <= 0 || y >= height)
        );

        const neighbors = getNeighborTriangles(i, voronoi);
        let lowestElevation = 999;
        let nIdx = -1;
        let nIdxLowest = -1;
        neighbors.forEach(n => {
            if (n === -1) return;
            if (riverTreeNodes[n].state === 0) {
                riverTreeNodes[n].state = 1;
                triangleQueue.push(n);
            }

            const nElevation = noise.triangleElevation[n];
            if (riverTreeNodes[n].state === 2 && (riverTreeNodes[n].left === null || riverTreeNodes[n].right === null)) {
                if (nElevation < lowestElevation) {
                    lowestElevation = nElevation;
                    nIdxLowest = n;
                }
                nIdx = n;
            }
        })
        if (nIdxLowest > -1) {
            riverTreeNodes[i].state = 2;
            if (riverTreeNodes[nIdxLowest].left === null) {
                riverTreeNodes[nIdxLowest].left = riverTreeNodes[i];
            } else if (riverTreeNodes[nIdxLowest].right === null) {
                riverTreeNodes[nIdxLowest].right = riverTreeNodes[i];
            }
        }
        else if (nIdx === -1 && !edgeTriangle) {
            triangleQueue.push(i);
        }
        else if (nIdx > -1) {
            riverTreeNodes[i].state = 2;
            if (riverTreeNodes[nIdx].left === null) {
                riverTreeNodes[nIdx].left = riverTreeNodes[i];
            } else if (riverTreeNodes[nIdx].right === null) {
                riverTreeNodes[nIdx].right = riverTreeNodes[i];
            }
        }
        else if (edgeTriangle) {
            riverTreeNodes[i].state = 2;
            riverTree.push(riverTreeNodes[i]);
        }

    }
    return riverTree;
}

export function sizeRiver(riverTree) {
    let reverse = []
    function populateReverseArray(node) {
        reverse.unshift(node);
        if (node.left) {
            populateReverseArray(node.left);
        }
        if (node.right) {
            populateReverseArray(node.right);
        }
    }

    for (let i = 0; i < riverTree.length; i++) {
        populateReverseArray(riverTree[i]);
    }

    for (let i = 0; i < reverse.length; i++) {
        const node = reverse[i];
        const lSize = node.left?.size ?? 0;
        const rSize = node.right?.size ?? 0;

        if (lSize === rSize) {
            node.size = lSize + 1;
        } else {
            node.size = Math.max(lSize, rSize);
        }
    }
}


export function findMountainRanges(voronoi, noise, random) {
    const rangeConstraints = [];
    const ranges = [];
    const cellNodes = [];
    for (let i = 0; i < voronoi.delaunay.points.length / 2; i++) {
        const node = { range: null, cell: i, elevation: noise.mountainNoise[i], land: noise.elevation[i] > 0 };
        cellNodes.push(node);
    }

    const addToRangeRecur = (node, rangeIdx) => {
        node.range = rangeIdx;
        ranges[rangeIdx].push(node);

        const x = voronoi.delaunay.points[node.cell * 2], y = voronoi.delaunay.points[node.cell * 2 + 1];
        if (x < rangeConstraints[rangeIdx].min.x) rangeConstraints[rangeIdx].min.x = x
        if (x > rangeConstraints[rangeIdx].max.x) rangeConstraints[rangeIdx].max.x = x
        if (y < rangeConstraints[rangeIdx].min.y) rangeConstraints[rangeIdx].min.y = y
        if (y > rangeConstraints[rangeIdx].max.y) rangeConstraints[rangeIdx].max.y = y

        const nGen = voronoi.neighbors(node.cell);
        let neighbor = nGen.next();
        while (!neighbor.done) {
            const n = neighbor.value;
            neighbor = nGen.next();

            if (n === -1) continue;
            if (cellNodes[n].range !== null) continue;
            if (!cellNodes[n].land) continue;
            if (cellNodes[n].elevation < MOUNTAIN_RANGE_CUTOFF && random() < 0.8) continue;

            addToRangeRecur(cellNodes[n], rangeIdx);
        }
    }

    for (let i = 0; i < voronoi.delaunay.points.length / 2; i++) {
        if (noise.elevation[i] < 0) continue;
        if (noise.mountainNoise[i] < MOUNTAIN_RANGE_CUTOFF) continue;
        if (cellNodes[i].range !== null) continue;

        ranges.push([]);
        rangeConstraints.push({ min: { x: 9999999, y: 9999999 }, max: { x: 0, y: 0}});
        addToRangeRecur(cellNodes[i], ranges.length - 1);

        if (ranges[ranges.length - 1].length < 100)  ranges.pop();
    }
    return {
        ranges,
        rangeConstraints
    };
}