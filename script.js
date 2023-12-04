import { Board } from './lib/board.js';
import eventbus, { APP_EVENTS } from './lib/eventbus.js';

let board = new Board(30, 30);

const bindControl = ([id, fn]) => {
    document.getElementById(id).addEventListener('click', (e) => {
        e.preventDefault();
        board[fn]();
    });
};

/**
 *
 * @param {[id, fn][]} list [ElementId, BoardMethodName]
 */
const bindAllControls = (list) => {
    list.forEach(bindControl);
};

document.addEventListener('DOMContentLoaded', () => {
    board.render(document.getElementById('gamefield'));
    board.createRandom();
    bindAllControls([
        ['start', 'start'],
        ['stop', 'stop'],
        ['random', 'createRandom'],
    ]);
    eventbus.emit(APP_EVENTS.INIT_APP_SUCCESS);
    const fff = eventbus.createSignal();
});
