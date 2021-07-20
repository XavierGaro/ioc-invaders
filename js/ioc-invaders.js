import {GameEngine} from "./modules/gameEngine.js";
import * as assetManager from "./modules/assetManager.js"
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
    gameEngine,
    gametime,
    gameContext,
    updatedSprites = []
    // ,

    // gameObjectPoolConstructor = function (maxSize, generator, config) {
    //     let that = {},
    //         size = maxSize;
    //
    //
    //     function disable(index) {
    //         that.pool[index].clear();
    //         that.pool.push((that.pool.splice(index, 1))[0]);
    //     }
    //
    //     that.actives = size;
    //
    //     that.pool = [];
    //
    //     for (let i = 0; i < size; i++) {
    //         that.pool[i] = generator(config);
    //     }
    //
    //     that.instantiate = function (type, position, speed) {
    //         let instance = that.pool[size - 1].start(getEntity(type, position, speed));
    //         that.pool.unshift(that.pool.pop());
    //         return instance;
    //     };
    //
    //     that.update = function () {
    //         for (let i = 0; i < size; i++) {
    //             // Només dibuixiem fins que trobem un objecte que no sigui viu
    //             if (that.pool[i].alive) {
    //                 if (that.pool[i].update()) {
    //                     // Si update ha retornat cert es que s'ha de desactivar
    //                     disable(i);
    //                 }
    //             } else {
    //                 that.actives = i;
    //                 break;
    //             }
    //         }
    //     };
    //
    //     that.clear = function () {
    //         for (let i = 0; i < size; i++) {
    //             that.pool[i].alive = false;
    //         }
    //         that.actives = 0;
    //     };
    //
    //     return that;
    // }


export function start(conf, canvas) {
    config = conf;
    gameCanvas = canvas;
    gameEngine = new GameEngine(conf, canvas);
    // gameEngine = gameEngineConstructor(canvas);
    // assetManager = assetManagerConstructor(function (current, total) {
    //     console.log("Carregats:" + current + "/" + total);
    // });

    assetManager.subscribe(function (current, total) {
        console.log("Carregats:" + current + "/" + total)
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
        'Your browser does not support canvas. Please try again with a different browser.' +
        '</canvas>' +
        '<div class="ui">' +
        '   <div class="score">SCORE: <span id="score"></span></div>' +
        '   <div class="distance">DISTANCE: <span id="distance"></span></div>' +
        '</div>' +
        '<div class="game-over" id="game-over">GAME OVER<p><span>TORNAR A JUGAR</span></p></div>' +
        '<div class="game-over" id="start">PREM JUGAR PER COMENÇAR<p><span>JUGAR</span></p></div>' +
        '<div class="messages fadeable" id="messages"></div>';


    document.getElementById('game-over').addEventListener('click', restart);

    let startNode = document.getElementById('start');
    startNode.addEventListener('click', function () {

        startNode.remove();
        canvas = document.getElementById('game-canvas');
        start({
            "asset_data_url": "asset-data.json",
            "entity_data_url": "entity-data.json",
            "levels_data_url": "level-data.json"
        }, canvas);
    });
};