import {GameEngine} from "./gameEngine.js";
import * as assetManager from "./assetManager.js"

/**
 * Aquesta utilitat afegeix el mètode clamp a la prototip Number. El que fa es afegir el métode clamp a tots els
 * nombres de manera que podem encaixonar-lo dins d'uns limits. En cas de que el nombre sigui menor que el mínim el
 * valor retornat es aquest mínim, i en cas de que sigui superior al màxim el valor retornat es el màxim.
 *
 * @param {number} min - valor mínim
 * @param {number} max - valor máxim
 * @returns {number} - El nombre si està dins del limit o el valor corresponent al limit
 */
Number.prototype.clamp = function (min, max) {
    return Math.min(Math.max(this, min), max);
};

let gameCanvas,
    config,
    gameEngine;

export function start(conf, canvas) {
    config = conf;
    gameCanvas = canvas;
    gameEngine = new GameEngine(conf, canvas);

    assetManager.subscribe((current, total) => {
        let node = document.getElementById('loading-info');
        node.innerHTML = `RECURSOS CARREGATS: ${current}/${total}`;
    });

    gameEngine.init();
}

export function restart() {
    gameEngine.restart();
}

window.onload = function () {
    let gameContainer = document.getElementById('game-background'),
        canvas;

    gameContainer.innerHTML = '' +
        '<canvas id="game-canvas" width="1024" height="512" class="fadeable">' +
        'El teu navegador no admet canvas. Si us plau, prova amb un altre navegador.' +
        '</canvas>' +
        '<ul class="ui">' +
        '   <li class="score">PUNTUACIÓ: <span id="score">0</span></li>' +
        '   <li class="distance">DISTÀNCIA: <span id="distance">0</span></li>' +
        '   <li class="fpsCounter">FPS: <span id="fps">0</span></li>' +
        '</ul>' +
        '<div class="game-over" id="game-over">GAME OVER<p><span>TORNAR A JUGAR</span></p></div>' +
        '<div class="game-over" id="start">PREM JUGAR PER COMENÇAR<p><span>JUGAR</span></p></div>' +
        '<div class="messages fadeable" id="messages"></div>' +
        '<div id="loading-info"> </div>';

    document.getElementById('game-over').addEventListener('click', restart);

    let startNode = document.getElementById('start');
    startNode.addEventListener('click', ()  => {
        startNode.remove();
        canvas = document.getElementById('game-canvas');
        start({
            "asset_data_url": "asset-data.json",
            "entity_data_url": "entity-data.json",
            "levels_data_url": "level-data.json"
        }, canvas);
    });
};