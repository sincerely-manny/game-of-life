import eventbus, { APP_EVENTS, $ } from './eventbus.js';
import Pointer from './pointer.js';
import { randomIntFromInterval } from './utils.js';

const DEFAULT_WIDTH = 30;
const DEFAULT_HEIGHT = 30;

const WORKER_THREADS_COUNT = 3;

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
    #cells = [];
    #cellsToLookForNexTick = new Map();

    #canvas = document.createElement('canvas');
    #ctx = this.#canvas.getContext('2d');
    #colors = {
        alive: '#000000',
        dead: '#FFFFFF',
    };
    #sizeMultiplier = 10;
    #borderRadius = 0;

    #workerThreads = WORKER_THREADS_COUNT;
    #workers = [];

    #isRunning = false;

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

        this.#sizeMultiplier = Math.ceil(2000 / width);
        this.#canvas.width = width * this.#sizeMultiplier;
        this.#canvas.height = height * this.#sizeMultiplier;
        this.#borderRadius =
            width * height < 1500 ? Math.ceil(this.#sizeMultiplier / 7) : 0;

        this.#colors = {
            alive: getComputedStyle(document.documentElement).getPropertyValue(
                '--color-alt-a80'
            ),
            dead: getComputedStyle(document.documentElement).getPropertyValue(
                '--color-primary-a30'
            ),
        };

        document.getElementById('gamefield-canvas').appendChild(this.#canvas);

        for (let y = 0; y < height; y++) {
            const row = [];
            this.#cellsToLookForNexTick.set(y, new Set());
            for (let x = 0; x < width; x++) {
                const cell = {
                    x,
                    y,
                    neighbours: [],
                    state: false,
                };
                row.push(cell);
                this.drawCell(cell);
                this.#cellsToLookForNexTick.get(cell.y).add(cell.x);
            }
            this.#cells.push(row);
        }
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const cell = this.cell(x, y);
                cell.neighbours = this.getNeighbours(x, y);
            }
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
        return this.#cells[y][x];
    }

    setCellState(cell, state) {
        if (cell.state === state) return this;
        cell.state = state;
        this.drawCell(cell);
        return this;
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

    getCellNextState(cell) {
        const alive = cell.neighbours.filter((n) => n.state).length;
        return alive === 3 || (alive === 2 && cell.state);
    }

    drawCell(cell) {
        const { x, y, state } = cell;
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
                this.setCellState(cell, false);
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
            const cell = this.cell(x, y);
            this.setCellState(cell, true);
        }
    }

    createShape(shape, xOffset = 0, yOffset = 0) {
        shape.forEach(([x, y]) => {
            const cell = this.cell(x + xOffset, y + yOffset);
            if (cell) {
                this.setCellState(cell, true);
            }
        });
        return this;
    }

    tick() {
        if (!this.#isRunning) {
            return;
        }
        const partLength = Math.floor(this.#height / this.#workerThreads);

        const dataSlices = [];
        this.#cellsToLookForNexTick.forEach((row, y) => {
            row.forEach((x) => {
                const { state, neighbours } = this.cell(x, y);
                const neighboursShallow = neighbours.map((n) => ({
                    x: n.x,
                    y: n.y,
                    state: n.state,
                }));
                const p = Math.floor(y / partLength);
                const i = p < this.#workerThreads ? p : this.#workerThreads - 1;
                dataSlices[i] ||= [];
                dataSlices[i].push({
                    x,
                    y,
                    state,
                    neighbours: neighboursShallow,
                });
            });
        });
        for (let i = 0; i < this.#workerThreads; i++) {
            const worker = this.#workers[i];
            const start = partLength * i;
            const end =
                i === this.#workerThreads - 1 ? undefined : start + partLength;
            const imagedata = this.#ctx.getImageData(
                0,
                partLength * i * this.#sizeMultiplier,
                this.#width * this.#sizeMultiplier,
                end
                    ? partLength * this.#sizeMultiplier
                    : this.#height * this.#sizeMultiplier
            );
            worker?.postMessage({
                cells: dataSlices[i],
                imagedata,
                buffer: imagedata.data.buffer,
                workerNum: i,
                start,
                end: end ? end - 1 : this.#height - 1,
                colors: this.#colors,
                cellSize: this.#sizeMultiplier,
                bodredRadius: this.#borderRadius,
                imageWidth: imagedata.width,
                imageHeight: imagedata.height,
            });
        }
    }

    async callTick(interval) {
        if (!this.#isRunning) {
            return;
        }
        const startTime = performance.now();
        const promises = [];
        for (const worker of this.#workers) {
            let resolveWorker, rejectWorker;
            const promise = new Promise((resolve, reject) => {
                resolveWorker = resolve;
                rejectWorker = reject;
            });
            promises.push(promise);
            worker.onmessage = (event) => {
                resolveWorker(event.data);
            };
            worker.onerror = (error) => {
                console.error(error);
                this.stop();
                rejectWorker(error);
            };
        }
        promises.push(new Promise((resolve) => setTimeout(resolve, interval)));
        this.tick();
        this.#cellsToLookForNexTick = new Map();
        promises.forEach((promise) => {
            promise.then((data) => {
                if (data) {
                    const { imagedata, start, changes, cellsForNextTick } =
                        data;
                    this.#ctx.putImageData(
                        imagedata,
                        0,
                        start * this.#sizeMultiplier
                    );
                    changes.forEach(({ cell, nextState }) => {
                        this.cell(cell.x, cell.y).state = nextState;
                    });
                    cellsForNextTick.forEach((row, y) => {
                        if (!this.#cellsToLookForNexTick.has(y)) {
                            this.#cellsToLookForNexTick.set(y, new Set());
                        }
                        row.forEach((x) => {
                            this.#cellsToLookForNexTick.get(y).add(x);
                        });
                    });
                }
            });
        });
        await Promise.allSettled(promises);
        const endTime = performance.now();
        $.timePerTick =
            'Time per tick: ' +
            Math.round((endTime - startTime) * 100) / 100 +
            'ms';
        this.callTick(interval);
    }

    start(interval = 0) {
        eventbus.emit(APP_EVENTS.GAME_STARTED);
        this.#isRunning = true;
        for (let i = 0; i < this.#workerThreads; i++) {
            const worker = new Worker('./lib/nextStateWorker.js');
            this.#workers.push(worker);
        }
        this.callTick(interval);
    }

    stop() {
        this.#workers.forEach((worker) => worker.terminate());
        this.#workers = [];
        eventbus.emit(APP_EVENTS.GAME_STOPPED);
        this.#isRunning = false;
    }

    isRunning() {
        return this.#isRunning;
    }
}

export default { Board };
