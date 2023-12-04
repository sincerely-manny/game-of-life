export const APP_EVENTS = {
    INIT_APP_LOADING: 'INIT_APP_LOADING',
    INIT_APP_SUCCESS: 'INIT_APP_SUCCESS',
    INIT_APP_ERROR: 'INIT_APP_ERROR',
    APP_STARTED: 'APP_STARTED',
    APP_STOPPED: 'APP_STOPPED',
};

class Eventbus {
    #subscribers = {};
    #signalListeners = [];
    #signals = {};

    constructor() {
        this.subscribe(APP_EVENTS.INIT_APP_SUCCESS, this.connectSignals);
    }

    /**
     *
     * @param {keyof APP_EVENTS} event
     * @param {Function} callback
     */
    subscribe(event, callback) {
        if (!this.#subscribers[event]) {
            this.#subscribers[event] = [];
        }
        this.#subscribers[event].push(callback);
        return this;
    }

    unsubscribe(event, callback) {
        if (this.#subscribers[event]) {
            this.#subscribers[event] = this.#subscribers[event].filter(
                (cb) => cb !== callback
            );
        }
        return this;
    }

    emit(event, ...args) {
        if (this.#subscribers[event]) {
            this.#subscribers[event].forEach((cb) => cb(...args));
        }

        return this;
    }

    #connectSignals() {
        const signalRe = /\{([a-zA-Z_$][0-9a-zA-Z_$]+)\}/g;
        const attrUpdateFn = (el, attrName) => (value) =>
            el.setAttribute(attrName, value);
        const htmlUpdateFn = (el, value) => (newValue) => (el.innerHTML = st);
        const elements = document.querySelectorAll('[signal]');
        elements.forEach((element) => {
            for (const attr of element.attributes) {
                const macthes = attr.value.matchAll(signalRe);
                const signals = [...macthes].map((match) => match[1]);
                console.log(signals);
                // [...macthes].forEach((match) => {
                //     signals.push(match[1]);
                // });
                // this.#signalListeners.push({

                // });
            }
        });
        console.log(this.#signalListeners);
    }

    connectSignals = this.#connectSignals.bind(this);

    createSignal = () => {};
}

const eventbus = new Eventbus();

export default eventbus;
