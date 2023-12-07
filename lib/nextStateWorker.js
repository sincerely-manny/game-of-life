self.addEventListener('message', function (e) {
    const {
        cells,
        workerNum,
        imagedata,
        colors,
        cellSize,
        bodredRadius,
        start,
        imageWidth,
        imageHeight,
    } = e.data;

    const changes = [];
    const cellsForNextTick = new Set();
    cells?.forEach((cell) => {
        const aliveNeighbours = cell.neighbours.filter((n) => n.state).length;
        const nextState =
            aliveNeighbours === 3 || (aliveNeighbours === 2 && cell.state);
        // const nextState = cell.nextState;
        if (nextState !== cell.state) {
            changes.push({
                cell,
                nextState,
            });
        }
        [cell, ...cell.neighbours].forEach((c) => {
            cellsForNextTick.add(`${c.x},${c.y}`);
        });
    });

    const canvas = new OffscreenCanvas(imageWidth, imageHeight);
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imagedata, 0, 0);
    changes.forEach((change) => {
        const { cell } = change;
        ctx.fillStyle = change.nextState ? colors.alive : colors.dead;
        ctx.beginPath();
        ctx.roundRect(
            cell.x * cellSize,
            (cell.y - start) * cellSize,
            cellSize,
            cellSize,
            bodredRadius
        );
        ctx.fill();
    });

    const newImagedata = ctx.getImageData(0, 0, imageWidth, imageHeight);

    self.postMessage({
        cellsForNextTick,
        workerNum,
        imagedata: newImagedata,
        start,
        changes,
    });
});
