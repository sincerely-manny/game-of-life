import { Board, SHAPES } from './lib/board.js';
import eventbus, { APP_EVENTS, $ } from './lib/eventbus.js';

const urlParams = new URLSearchParams(window.location.search);

let board = new Board(
    parseInt(urlParams.get('width')) || undefined,
    parseInt(urlParams.get('height')) || undefined,
    parseInt(urlParams.get('threads')) || undefined
);

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
    $.width = urlParams.get('width') || 30;
    $.height = urlParams.get('height') || 30;
    $.threads = urlParams.get('threads') || 0;

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
        [
            'showhide',
            () => {
                document.getElementById('controls').classList.toggle('hidden');
            },
        ],
    ].forEach(([id, fn]) => {
        document.getElementById(id)?.addEventListener('click', (e) => {
            e.preventDefault();
            fn();
        });
    });
    document.getElementById('speed')?.addEventListener('change', (e) => {
        board.setIntervalValue(1000 - parseInt(e.target.value));
    });
    stopGameEffects();
});
