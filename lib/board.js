import Cell from './cell.js';
import eventbus, { APP_EVENTS, $ } from './eventbus.js';
import Pointer from './pointer.js';
import { randomIntFromInterval } from './utils.js';

const DEFAULT_WIDTH = 30;
const DEFAULT_HEIGHT = 30;

export const SHAPES = {
    glider: [
        [2, 0],
        [0, 1],
        [2, 1],
        [1, 2],
        [2, 2],
    ],
};

export class Board {
    #width = DEFAULT_WIDTH;
    #height = DEFAULT_HEIGHT;
    #cells;
    #interval = null;
    #cellsToLookForNexTick = new Set();

    #canvas = document.createElement('canvas');
    #ctx = this.#canvas.getContext('2d');
    #colors = {
        alive: '#000000',
        dead: '#FFFFFF',
    };
    #sizeMultiplier = 10;
    #borderRadius = 0;

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
                this.#cellsToLookForNexTick.add(cell);
            }
            this.#cells.push(row);
        }
        this.#sizeMultiplier = Math.ceil(2000 / width);
        this.#canvas.width = width * this.#sizeMultiplier;
        this.#canvas.height = height * this.#sizeMultiplier;
        this.#borderRadius =
            width * height < 1500 ? Math.ceil(this.#sizeMultiplier / 7) : 0;
        document.getElementById('gamefield-canvas').appendChild(this.#canvas);
        this.#colors = {
            alive: getComputedStyle(document.documentElement).getPropertyValue(
                '--color-alt-a80'
            ),
            dead: getComputedStyle(document.documentElement).getPropertyValue(
                '--color-primary-a30'
            ),
        };
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
        return this.#cells[y][x];
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
     * @param {number} x Coloumn
     * @param {number} y Row
     * @param {boolean} state Alive?
     */
    drawCell(x, y, state) {
        const ctx = this.#ctx;
        ctx.fillStyle = state ? this.#colors.alive : this.#colors.dead;
        ctx.beginPath();
        ctx.roundRect(
            x * this.#sizeMultiplier,
            y * this.#sizeMultiplier,
            this.#sizeMultiplier,
            this.#sizeMultiplier,
            this.#borderRadius
        );
        ctx.fill();
    }

    clear() {
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

    createShape(shape, xOffset = 0, yOffset = 0) {
        shape.forEach(([x, y]) => {
            this.cell(x + xOffset, y + yOffset).setState(true);
        });
        return this;
    }

    tick() {
        const changes = [];
        this.#cellsToLookForNexTick.forEach((cell) => {
            const nextState = cell.getNextState();
            if (nextState !== cell.state()) {
                changes.push({
                    cell,
                    nextState,
                });
            }
        });
        this.#cellsToLookForNexTick.clear();
        if (!changes.length) {
            this.stop();
            return;
        }
        changes.forEach(({ cell, nextState }) => {
            cell.setState(nextState);
            this.#cellsToLookForNexTick.add(cell);
            cell.neighbours().forEach((neighbour) => {
                this.#cellsToLookForNexTick.add(neighbour);
            });
        });
    }

    start(interval = 300) {
        eventbus.emit(APP_EVENTS.GAME_STARTED);
        let avg = 0;
        this.#interval = setInterval(() => {
            const startTime = performance.now();
            this.tick();
            const endTime = performance.now();
            avg = avg ? (avg + endTime - startTime) / 2 : endTime - startTime;
            $.timePerTick =
                'Time per tick: ' +
                (endTime - startTime).toPrecision(4) +
                'ms; Avg: ' +
                avg.toPrecision(4) +
                'ms.';
        }, interval);
    }

    stop() {
        if (this.#interval) {
            clearInterval(this.#interval);
            this.#interval = null;
            this.#cellsToLookForNexTick = new Set(this.#cells.flat());
            eventbus.emit(APP_EVENTS.GAME_STOPPED);
        }
    }

    isRunning() {
        return !!this.#interval;
    }
}

export default { Board };
