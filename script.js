import { Board, SHAPES } from './lib/board.js';
import eventbus, { APP_EVENTS, $ } from './lib/eventbus.js';

let board = new Board(100, 100);

const startGameEffects = () => {
    $.startButtonDisabled = true;
    $.startButtonText = 'Running...';
    $.stopButtonDisabled = false;
};

const stopGameEffects = () => {
    $.startButtonDisabled = false;
    $.startButtonText = 'Start';
    $.stopButtonDisabled = true;
};

eventbus.subscribe(APP_EVENTS.GAME_STOPPED, stopGameEffects);
eventbus.subscribe(APP_EVENTS.GAME_STARTED, startGameEffects);

document.addEventListener('DOMContentLoaded', () => {
    board.createRandom();
    [
        [
            'start',
            () => {
                board.start();
            },
        ],
        [
            'stop',
            () => {
                board.stop();
            },
        ],
        [
            'random',
            () => {
                board.stop();
                // board.createShape(SHAPES.glider);
                board.createRandom();
            },
        ],
        [
            'clear',
            () => {
                board.stop();
                board.clear();
            },
        ],
    ].forEach(([id, fn]) => {
        document.getElementById(id)?.addEventListener('click', (e) => {
            e.preventDefault();
            fn();
        });
    });
    stopGameEffects();
});
