class Pointer {
    #x = 0;
    #y = 0;
    #width;
    #height;

    /**
     *
     * @param {number} width
     * @param {number} height
     * @param {number} x
     * @param {number} y
     */
    constructor(width, height, x = 0, y = 0) {
        this.#width = width;
        this.#height = height;
        this.#x = x;
        this.#y = y;
    }

    /**
     *
     * @param {number} x col
     * @param {number} y row
     * @returns
     */
    set(x, y) {
        this.#x = x;
        this.#y = y;
        return this;
    }

    goLeft() {
        this.#x - 1 < 0 ? (this.#x = this.#width - 1) : this.#x--;
        return this;
    }

    goRight() {
        this.#x + 1 > this.#width - 1 ? (this.#x = 0) : this.#x++;
        return this;
    }

    goUp() {
        this.#y - 1 < 0 ? (this.#y = this.#height - 1) : this.#y--;
        return this;
    }

    goDown() {
        this.#y + 1 > this.#height - 1 ? (this.#y = 0) : this.#y++;
        return this;
    }
    
    get() {
        return {
            x: this.#x,
            y: this.#y,
        };
    }
}

export default Pointer;
