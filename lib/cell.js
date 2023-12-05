class Cell {
    #state = false;
    #neighbours;
    /**
     *
     * @param {number} x Coloumn
     * @param {number} y Row
     * @param {Board} board Board
     * @param {boolean} state Alive?
     */
    constructor(x, y, board, state = false) {
        this.x = x;
        this.y = y;
        this.board = board;
        this.#state = state;
    }

    state() {
        return this.#state;
    }

    /**
     *
     * @param {boolean} state Alive?
     * @returns {Cell}
     */
    setState(state) {
        this.#state = state;
        this.board.drawCell(this.x, this.y, state);
        return this;
    }

    neighbours() {
        this.#neighbours ||= this.board.getNeighbours(this.x, this.y);
        return this.#neighbours;
    }

    getNextState() {
        const alive = this.neighbours().filter((cell) => cell.state()).length;
        return alive === 3 || (alive === 2 && this.state());
    }
}

export default Cell;
