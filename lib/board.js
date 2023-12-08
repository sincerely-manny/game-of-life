import eventbus, { APP_EVENTS, $ } from './eventbus.js';
import Pointer from './pointer.js';
import { randomIntFromInterval } from './utils.js';

const DEFAULT_WIDTH = 30;
const DEFAULT_HEIGHT = 30;

const WORKER_THREADS_COUNT = 0;

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
    #neighbours = [];
    #nextTickCells = [];
    #interval = 100;

    #canvas = document.createElement('canvas');
    #ctx = this.#canvas.getContext('2d', { willReadFrequently: true });
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
    constructor(
        width = DEFAULT_WIDTH,
        height = DEFAULT_HEIGHT,
        workerThreads = WORKER_THREADS_COUNT
    ) {
        this.#width = width;
        this.#height = height;
        this.#workerThreads = workerThreads;
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

        this.#cells = Array(height);
        for (let y = 0; y < height; y++) {
            this.#cells[y] = Array(width).fill(undefined);
            this.#nextTickCells[y] ||= new Set();
            for (let x = 0; x < width; x++) {
                this.#neighbours[y] ||= [];
                this.#neighbours[y].push(this.getNeighbours(x, y));
                this.#nextTickCells[y].add(x);
            }
        }

        this.#canvas.addEventListener('click', (e) => {
            const el = e.target;
            if (el.tagName !== 'CANVAS') {
                return;
            }
            if (this.#isRunning) {
                return;
            }
            const { top, bottom, left, right } = el.getBoundingClientRect();
            const [centerX, centerY] = [(left + right) / 2, (top + bottom) / 2];
            const clientScale = Math.min(
                el.clientWidth / (this.#width * this.#sizeMultiplier),
                el.clientHeight / (this.#height * this.#sizeMultiplier)
            );
            const [realLeft, realTop] = [
                centerX -
                    (this.#width * this.#sizeMultiplier * clientScale) / 2,
                centerY -
                    (this.#height * this.#sizeMultiplier * clientScale) / 2,
            ];
            const [clickColDirty, clickRowDirty] = [
                Math.floor(
                    (e.x - realLeft) / clientScale / this.#sizeMultiplier
                ),
                Math.floor(
                    (e.y - realTop) / clientScale / this.#sizeMultiplier
                ),
            ];
            const [clickCol, clickRow] = [
                clickColDirty >= 0 && clickColDirty < this.#width
                    ? clickColDirty
                    : null,
                clickRowDirty >= 0 && clickRowDirty < this.#height
                    ? clickRowDirty
                    : null,
            ];

            const cellState = this.#cells[clickRow][clickCol];
            if (cellState !== undefined) {
                this.setCellState(clickCol, clickRow, cellState === 1 ? 0 : 1);
            }
        });
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
     * @param {number} x
     * @param {number} y
     * @param {0 | 1} state
     * @returns
     */
    setCellState(x, y, state) {
        const cell = this.#cells[y][x];
        if (cell === state) return this;
        this.#cells[y][x] = state;
        this.drawCell(x, y, state);
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
            neighbours.push([x, y]);
        });
        return neighbours;
    }

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
        this.#cells.forEach((row, y) => {
            row.forEach((cell, x) => {
                this.setCellState(x, y, 0);
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
            this.setCellState(x, y, 1);
        }
    }

    callWorker() {
        if (!this.#isRunning) {
            return;
        }
        const partLength = Math.floor(this.#height / this.#workerThreads);
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
                cells: this.#cells,
                neighbours: this.#neighbours,
                imagedata,
                workerNum: i,
                start,
                end: end ? end - 1 : this.#height - 1,
                colors: this.#colors,
                cellSize: this.#sizeMultiplier,
                bodredRadius: this.#borderRadius,
                imageWidth: imagedata.width,
                imageHeight: imagedata.height,
                width: this.#width,
                height: this.#height,
                nextTickCells: this.#nextTickCells,
                threadsCount: this.#workerThreads,
            });
        }
    }

    async tick() {
        if (!this.#isRunning) {
            return;
        }
        const startTime = performance.now();
        const promises = [];
        if (this.#workerThreads > 0) {
            for (const worker of this.#workers) {
                let resolveWorker, rejectWorker;
                const promise = new Promise((resolve, reject) => {
                    resolveWorker = resolve;
                    rejectWorker = reject;
                });
                worker.onmessage = (event) => {
                    resolveWorker(event.data);
                };
                worker.onerror = (error) => {
                    console.error(error);
                    this.stop();
                    rejectWorker(error);
                };
                promises.push(promise);
            }
        } else {
            promises.push(this.makeTurn());
        }
        promises.push(
            new Promise((resolve) => setTimeout(resolve, this.#interval))
        );
        if (this.#workerThreads > 0) {
            this.callWorker();
        }
        if (this.#workerThreads > 1) {
            this.#nextTickCells.forEach((row) => {
                row.clear();
            });
        }
        let changesLen = 0;
        promises.forEach((promise) => {
            promise.then((data) => {
                if (data) {
                    const { imagedata, start, changes, nextTickCells } = data;
                    if (this.#workerThreads > 0) {
                        this.#ctx.putImageData(
                            imagedata,
                            0,
                            start * this.#sizeMultiplier
                        );
                    }
                    changes.forEach(([x, y, nextState]) => {
                        changesLen++;
                        this.#cells[y][x] = nextState;
                        if (this.#workerThreads <= 1) {
                            this.#nextTickCells = nextTickCells;
                        } else {
                            [[x, y], ...this.#neighbours[y][x]].forEach(
                                ([x, y]) => {
                                    this.#nextTickCells[y].add(x);
                                }
                            );
                        }
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
        if (changesLen === 0) {
            this.stop();
        } else {
            this.tick();
        }
    }

    makeTurn() {
        return new Promise((resolve) => {
            const cellSize = this.#sizeMultiplier;
            const nextTickCells = new Array(this.#height);
            const changes = [];
            for (let y = 0; y < this.#height; y++) {
                nextTickCells[y] ||= new Set();
                const row = this.#nextTickCells[y];
                row?.forEach((x) => {
                    const currentState = this.#cells[y][x];
                    const aliveNeighbours = this.#neighbours[y][x].reduce(
                        (a, b) => a + this.#cells[b[1]][b[0]],
                        0
                    );
                    const nextState =
                        aliveNeighbours === 3 ||
                        (aliveNeighbours === 2 && currentState === 1)
                            ? 1
                            : 0;
                    if (nextState !== currentState) {
                        changes.push([x, y, nextState]);
                        this.#ctx.fillStyle =
                            nextState === 1
                                ? this.#colors.alive
                                : this.#colors.dead;
                        this.#ctx.beginPath();
                        this.#ctx.roundRect(
                            x * cellSize,
                            y * cellSize,
                            cellSize,
                            cellSize,
                            this.#borderRadius
                        );
                        this.#ctx.fill();
                        [[x, y], ...this.#neighbours[y][x]].forEach(
                            ([x, y]) => {
                                nextTickCells[y] ||= new Set();
                                nextTickCells[y].add(x);
                            }
                        );
                    }
                });
            }
            resolve({ changes, nextTickCells });
        });
    }

    start() {
        eventbus.emit(APP_EVENTS.GAME_STARTED);
        this.#isRunning = true;
        for (let i = 0; i < this.#workerThreads; i++) {
            const worker = new Worker('./lib/nextStateWorker.js');
            this.#workers.push(worker);
        }
        this.tick();
    }

    stop() {
        this.#workers.forEach((worker) => worker.terminate());
        this.#workers = [];
        eventbus.emit(APP_EVENTS.GAME_STOPPED);
        this.#isRunning = false;
        for (let y = 0; y < this.#height; y++) {
            this.#nextTickCells[y].clear();
            for (let x = 0; x < this.#width; x++) {
                this.#nextTickCells[y].add(x);
            }
        }
    }

    setIntervalValue(value) {
        this.#interval = value;
    }

    isRunning() {
        return this.#isRunning;
    }
}

export default { Board };
