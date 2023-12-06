self.addEventListener('message', function (e) {
    const { cells } = e.data;
    const changes = [];
    cells.forEach((cell) => {
        const aliveNeighbours = cell.neighbours.filter((n) => n.state).length;
        const nextState =
            aliveNeighbours === 3 || (aliveNeighbours === 2 && cell.state);
        if (nextState !== cell.state) {
            changes.push({
                cell,
                nextState,
            });
        }
    });
    self.postMessage(changes);
});
