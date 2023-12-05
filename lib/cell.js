class Cell {
    #state = false;
    #element = document.createElement('button');
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
        this.#element.classList.add('cell');
        this.#element.onclick = (e) => {
            e.preventDefault();
            this.setState(!this.state());
        };
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
        state
            ? this.#element.classList.add('alive')
            : this.#element.classList.remove('alive');
        return this;
    }

    neighbours() {
        this.#neighbours ||= this.board.getNeighbours(this.x, this.y);
        return this.#neighbours;
    }

    element() {
        return this.#element;
    }

    getNextState() {
        const alive = this.neighbours().filter((cell) => cell.state()).length;
        return alive === 3 || (alive === 2 && this.state());
    }
}

export default Cell;
