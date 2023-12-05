export const APP_EVENTS = {
    INIT_APP_LOADING: 'INIT_APP_LOADING',
    INIT_APP_SUCCESS: 'INIT_APP_SUCCESS',
    INIT_APP_ERROR: 'INIT_APP_ERROR',
    APP_STARTED: 'APP_STARTED',
    APP_STOPPED: 'APP_STOPPED',
};

class Eventbus {
    #subscribers = {};
    #signals = new Map();

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
        const setSignalIfNotExits = (name) => {
            if (!this.#signals.has(name)) {
                this.#signals.set(name, {
                    value: '',
                    listeners: new Map(),
                });
            }
            return this.#signals.get(name);
        };
        const elements = document.querySelectorAll('[signal]');
        const attributesToCleanup = [];
        elements.forEach((element) => {
            const listener = {
                html: null,
                attributes: null,
                signals: new Set(),
            };
            for (const attr of element.attributes) {
                [...attr.value.matchAll(signalRe)].forEach((match) => {
                    const signal = setSignalIfNotExits(match[1]);
                    signal.listeners.set(element, listener);
                    listener.attributes ||= {};
                    listener.attributes[attr.name] = attr.value;
                    listener.signals.add(match[1]);
                    const updatedVal = element
                        .getAttribute(attr.name)
                        .replaceAll(match[0], '')
                        .trim();
                    updatedVal
                        ? element.setAttribute(attr.name, updatedVal)
                        : element.removeAttribute(attr.name);
                });
            }
            const html = element.innerHTML;
            [...html.matchAll(signalRe)].forEach((match) => {
                const signal = setSignalIfNotExits(match[1]);
                signal.listeners.set(element, listener);
                listener.html = element.innerHTML;
                listener.signals.add(match[1]);
                element.innerHTML = html.replaceAll(match[0], '').trim();
            });
            element.removeAttribute('signal');
        });
    }

    connectSignals = this.#connectSignals.bind(this);

    useSignals = () => {
        this.#connectSignals();
        const proxy = new Proxy(this.#signals, {
            get: (target, prop) => {
                const signal = target.get(prop);
                if (!signal) {
                    return null;
                }
                return signal.value;
            },
            set: (target, prop, value) => {
                const signal = target.get(prop);
                if (!signal) {
                    return false;
                }
                signal.value = value;
                signal.listeners.forEach((listener, element) => {
                    if (listener.html) {
                        let str = listener.html;
                        for (const signal of listener.signals) {
                            str = str.replaceAll(
                                `{${signal}}`,
                                this.#signals.get(signal).value
                            );
                        }
                        element.innerHTML = str;
                    }
                    if (listener.attributes) {
                        for (const [name, value] of Object.entries(
                            listener.attributes
                        )) {
                            let str = value;
                            for (const signal of listener.signals) {
                                str = str.replaceAll(
                                    `{${signal}}`,
                                    this.#signals.get(signal).value
                                );
                            }
                            str == 'false' || !str
                                ? element.removeAttribute(name)
                                : element.setAttribute(name, str);
                        }
                    }
                });
                return true;
            },
        });
        return proxy;
    };
}

const eventbus = new Eventbus();

export const $ = eventbus.useSignals();

export default eventbus;
