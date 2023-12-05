import { Board } from './lib/board.js';
import eventbus, { APP_EVENTS, $ } from './lib/eventbus.js';

let board = new Board(30, 30);

const startGame = () => {
    board.start();
    $.startButtonDisabled = true;
    $.startButtonText = 'Running...';
    $.stopButtonDisabled = false;
};

const stopGame = () => {
    board.stop();
    $.startButtonDisabled = false;
    $.startButtonText = 'Start';
    $.stopButtonDisabled = true;
};

document.addEventListener('DOMContentLoaded', () => {
    board.render(document.getElementById('gamefield'));
    board.createRandom();
    [
        ['start', startGame],
        ['stop', stopGame],
        [
            'random',
            () => {
                stopGame();
                board.createRandom();
            },
        ],
        [
            'clear',
            () => {
                stopGame();
                board.clear();
            },
        ],
    ].forEach(([id, fn]) => {
        document.getElementById(id)?.addEventListener('click', (e) => {
            e.preventDefault();
            fn();
        });
    });
    stopGame();
});
