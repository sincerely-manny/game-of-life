self.addEventListener('message', function (e) {
    const {
        cells,
        neighbours,
        imagedata,
        colors,
        cellSize,
        bodredRadius,
        start,
        end,
        imageWidth,
        imageHeight,
        height,
        nextTickCells: thisTickCells,
        threadsCount,
    } = e.data;

    const canvas = new OffscreenCanvas(imageWidth, imageHeight);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.putImageData(imagedata, 0, 0);

    const nextTickCells = new Array(height);
    const changes = [];
    for (let y = start; y <= end; y++) {
        nextTickCells[y] ||= new Set();
        const row = thisTickCells[y];
        row.forEach((x) => {
            const currentState = cells[y][x];
            const aliveNeighbours = neighbours[y][x].reduce(
                (a, b) => a + cells[b[1]][b[0]],
                0
            );
            const nextState =
                aliveNeighbours === 3 ||
                (aliveNeighbours === 2 && currentState === 1)
                    ? 1
                    : 0;
            if (nextState !== currentState) {
                changes.push([x, y, nextState]);
                ctx.fillStyle = nextState === 1 ? colors.alive : colors.dead;
                ctx.beginPath();
                ctx.roundRect(
                    x * cellSize,
                    (y - start) * cellSize,
                    cellSize,
                    cellSize,
                    bodredRadius
                );
                ctx.fill();
                if (threadsCount === 1) {
                    [[x, y], ...neighbours[y][x]].forEach(([x, y]) => {
                        nextTickCells[y] ||= new Set();
                        nextTickCells[y].add(x);
                    });
                }
            }
        });
    }

    const newImagedata = ctx.getImageData(0, 0, imageWidth, imageHeight);

    self.postMessage({
        imagedata: newImagedata,
        start,
        changes,
        nextTickCells,
    });
});
