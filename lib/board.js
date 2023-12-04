import Cell from './cell.js';
import Pointer from './pointer.js';
import { randomIntFromInterval } from './utils.js';

const DEFAULT_WIDTH = 30;
const DEFAULT_HEIGHT = 30;

export class Board {
    #width = DEFAULT_WIDTH;
    #height = DEFAULT_HEIGHT;
    #cells;
    #interval;
    #cellsToLookForNexTick = [];

    /**
     *
     * @param {number} width Number of rows
     * @param {number} height Number of cols
     */
    constructor(width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT) {
        this.#width = width;
        this.#height = height;
        const root = document.querySelector(':root');
        root.style.setProperty('--board-cols-count', width);
        root.style.setProperty('--board-rows-count', height);
        this.#cells = [];
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                const cell = new Cell(x, y, this);
                row.push(cell);
                this.#cellsToLookForNexTick.push(cell);
            }
            this.#cells.push(row);
        }
    }

    width() {
        return this.#width;
    }

    height() {
        return this.#height;
    }

    cells() {
        return this.#cells;
    }

    /**
     *
     * @param {number} x col
     * @param {number} y row
     * @returns {Cell}
     */
    cell(x, y) {
        return this.#cells[x][y];
    }

    /**
     *
     * @param {number} x col
     * @param {number} y row
     * @returns {Cell[]}
     */
    getNeighbours(x, y) {
        let neighbours = [];
        const point = new Pointer(this.#width, this.#height);
        point.set(x, y);
        const trip = [
            'goUp',
            'goRight',
            'goDown',
            'goDown',
            'goLeft',
            'goLeft',
            'goUp',
            'goUp',
        ];
        trip.forEach((move) => {
            point[move]();
            const { x, y } = point.get();
            neighbours.push(this.cell(x, y));
        });
        return neighbours;
    }

    /**
     *
     * @param {HTMLElement} parent
     * @returns {Board}
     */
    render(parent) {
        parent.innerHTML = '';
        this.#cells.forEach((row) => {
            row.forEach((cell) => {
                parent.appendChild(cell.element());
            });
        });
        return this;
    }

    clear() {
        this.stop();
        this.#cells.forEach((row) => {
            row.forEach((cell) => {
                cell.setState(false);
            });
        });
        return this;
    }

    createRandom() {
        this.clear();
        const count = randomIntFromInterval(1, this.#width * this.#height);
        for (let i = 0; i < count; i++) {
            const x = randomIntFromInterval(0, this.#width - 1);
            const y = randomIntFromInterval(0, this.#height - 1);
            this.cell(x, y).setState(true);
        }
    }

    tick() {
        const changes = [];
        this.#cellsToLookForNexTick.forEach((cell) => {
            cell.tick();
        });
    }

    start(interval = 500) {
        this.#interval = setInterval(() => {
            this.tick();
        }, interval);
    }

    stop() {
        this.#interval && clearInterval(this.#interval);
    }
}

export default { Board };
