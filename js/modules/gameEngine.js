import {addEntity} from "./entityRepository.js";
import * as assetManager from "./assetManager.js";
import {GameObjectPool} from "./gameObjectPool.js";
import {Background, Explosion, Player, Shot, Spaceship} from "./gameObjects.js";

const GameState = {
    GAME_OVER: "GameOver",
    LOADING_NEXT_LEVEL: "LoadingNextLevel",
    RUNNING: "Running"
};

class UserInterface {

    scoreText = document.getElementById('score');
    distanceText = document.getElementById('distance');
    messageText = document.getElementById('messages');
    canvas = null;

    constructor(canvas) {
        this.canvas = canvas;
    }

    update(score, distance) {
        this.scoreText.innerHTML = score;
        this.distanceText.innerHTML = distance;
    }

    showMessage(message, duration) { // Temps en milisegons
        this.messageText.innerHTML = message;
        this.messageText.style.opacity = '1';

        let context = this;
        setTimeout(function () {
            context.messageText.style.opacity = '0';
        }, duration);
    }

    hideMessage() {
        this.messageText.style.opacity = '0';
    }

    showGameOver() {
        document.getElementById('game-over').style.display = "block";
    }

    hideGameOver() {
        document.getElementById('game-over').style.display = "none";
    }

    transitionScreen(callback) {
        this.canvas.style.opacity = '0';

        let context = this;
        setTimeout(function () {
            context.canvas.style.opacity = '1';
            callback();
        }, 3000); // la transicion dura 3s
    }

    fadeIn() {
        this.canvas.style.opacity = '1';
    }

    fadeOut() {
        this.canvas.style.opacity = '0';
    }
}

export class GameEngine {
    levels = {};

    currentLevel = 0;
    levelEnded = false;
    score = 0;
    distance = 0; // Relativa al nivell actual
    nextWave = null; // Relativa al nivell actual
    enemyPool = null;
    enemyShotPool = null;
    playerShotPool = null;
    explosionPool = null;
    background = null;
    player = null;
    state = null;
    canvas = null;
    ui = null;

    constructor(config, canvas) {
        this.config = config;
        this.canvas = canvas;
        this.ui = new UserInterface(canvas);
    }

    initEnvironment(data) {
        this.gameContext = this.canvas.getContext("2d");

        this.explosionPool = new GameObjectPool(100, Explosion);
        this.enemyShotPool = new GameObjectPool(500, Shot, {
            gameWidth: this.canvas.width,
            gameHeight: this.canvas.height
        });
        this.enemyPool = new GameObjectPool(100, Spaceship, {
            pool: {
                bullet: this.enemyShotPool,
                explosion: this.explosionPool
            },
            gameWidth: this.canvas.width,
            gameHeight: this.canvas.height
        });

        this.playerShotPool = new GameObjectPool(100, Shot, {
            gameWidth: this.canvas.width,
            gameHeight: this.canvas.height
        });

        this.loadAssets(data.assets);
    }

    update() {
        window.requestAnimationFrame(this.update.bind(this));

        this.updateWaves();
        this.detectCollisions();

        this.background.update();
        this.enemyPool.update();
        this.enemyShotPool.update();
        this.playerShotPool.update();

        if (this.player.isDestroyed && this.state !== GameState.GAME_OVER) {
            this.setGameOver();

        } else if (this.enemyPool.actives === 0 && this.levelEnded && this.state !== GameState.GAME_OVER
            && this.state !== GameState.LOADING_NEXT_LEVEL) {

            this.ui.transitionScreen(this.setEndLevel.bind(this))
            this.state = GameState.LOADING_NEXT_LEVEL;
        } else if (this.state !== GameState.GAME_OVER) {
            this.player.update();
            this.distance++;
        }

        this.explosionPool.update();

        this.ui.update(this.score, this.distance);
    }

    detectCollisions() {
        let impactInfo,
            i;

        // bala del jugador amb enemic
        impactInfo = this.detectCollisionsPoolWithPool(this.playerShotPool, this.enemyPool);

        for (i = 0; i < impactInfo.length; i++) {
            impactInfo[i].source.isDestroyed = true;
            impactInfo[i].target.isDestroyed = true;
            this.score += impactInfo[i].target.points;
        }

        // bala del enemic amb jugador
        impactInfo = this.detectCollisionsPoolWithGameObject(this.enemyShotPool, this.player);

        for (i = 0; i < impactInfo.length; i++) {
            impactInfo[i].source.isDestroyed = true;
            impactInfo[i].target.isDestroyed = true;

        }

        // enemic amb jugador
        impactInfo = this.detectCollisionsPoolWithGameObject(this.enemyPool, this.player);
        for (i = 0; i < impactInfo.length; i++) {
            impactInfo[i].source.isDestroyed = true;
            impactInfo[i].target.isDestroyed = true;
        }
    }

    detectCollisionsPoolWithPool(poolA, poolB) {
        let i = 0,
            j = 0,
            impacts = [];

        while (poolA.pool[i] && poolA.pool[i].alive) {
            while (poolB.pool[j] && poolB.pool[j].alive) {
                if (poolA.pool[i].isCollidingWith(poolB.pool[j])) {
                    impacts.push({
                        source: poolA.pool[i],
                        target: poolB.pool[j]
                    });
                }
                j++;
            }
            j = 0;
            i++;
        }

        return impacts;
    }

    detectCollisionsPoolWithGameObject(pool, gameObject) {
        let i = 0,
            impacts = [];

        while (pool.pool[i] && pool.pool[i].alive) {
            if (pool.pool[i].isCollidingWith(gameObject)) {
                impacts.push({
                    source: pool.pool[i],
                    target: gameObject
                });
            }
            i++;
        }

        return impacts;
    }

    updateWaves() {
        let waves = this.levels[this.currentLevel].waves,
            currentWave;

        if (this.nextWave < waves.length && this.distance >= waves[this.nextWave].distance) {
            currentWave = waves[this.nextWave];
            this.spawner(currentWave.spawns);
            this.nextWave++;
        }

        if (this.distance > this.levels[this.currentLevel].end) {
            this.levelEnded = true;
        }
    }

    spawner(spawns) {
        for (let i = 0; i < spawns.length; i++) {
            if (!spawns[i].formation) {
                this.spawnEnemy(spawns[i]);
            } else {
                this.spawnFormation(spawns[i]);
            }
        }
    }

    spawnEnemy(enemy) {
        this.enemyPool.instantiate(enemy.type, enemy.position, enemy.speed);
    }

    spawnFormation(wave) {
        let i, j,
            originPosition,
            spacer,
            nextColumn,
            currentPosition,
            side;

        switch (wave.formation.type) {
            case "columns":

                originPosition = {x: wave.position.x, y: wave.position.y};
                spacer = wave.formation.spacer;
                nextColumn = originPosition.y + wave.formation.column_height;
                currentPosition = {x: wave.position.x, y: wave.position.y};

                for (i = 0; i < wave.formation.amount; i++) {

                    this.enemyPool.instantiate(wave.type, {
                        x: currentPosition.x,
                        y: currentPosition.y
                    }, wave.speed);

                    currentPosition.y += spacer;

                    if (currentPosition.y >= nextColumn) {

                        currentPosition.x += spacer;
                        currentPosition.y = originPosition.y;
                    }
                }
                break;

            case "grid":
                originPosition = {x: wave.position.x, y: wave.position.y};
                spacer = wave.formation.spacer;
                side = Math.round(Math.sqrt(wave.formation.amount));

                for (i = 0; i < side; i++) {
                    for (j = 0; j < side; j++) {
                        this.enemyPool.instantiate(wave.type, {
                            x: originPosition.x + (spacer * i),
                            y: originPosition.y + (spacer * j)
                        }, wave.speed);

                    }
                }

                break;

            case "row":
                originPosition = {x: wave.position.x, y: wave.position.y};
                spacer = wave.formation.spacer;

                for (i = 0; i < wave.formation.amount; i++) {
                    this.enemyPool.instantiate(wave.type, {
                        x: originPosition.x + (spacer * i),
                        y: originPosition.y
                    }, wave.speed);
                }
                break;

            case "column":
                originPosition = {x: wave.position.x, y: wave.position.y};
                spacer = wave.formation.spacer;

                for (i = 0; i < wave.formation.amount; i++) {
                    this.enemyPool.instantiate(wave.type, {
                        x: originPosition.x,
                        y: originPosition.y + (spacer * i)
                    }, wave.speed);
                }
                break;


            default:
                console.log("Error, no es reconeix el tipus de formació");
        }
    }

    setEndLevel() {
        this.currentLevel++;

        if (this.currentLevel >= this.levels.length) {
            this.currentLevel = 0;
        }

        this.enemyPool.clear();
        this.explosionPool.clear();
        this.enemyShotPool.clear();
        this.playerShotPool.clear();

        this.startLevel(this.currentLevel);
        this.state = GameState.RUNNING;
    }


    setGameOver() {
        this.player.update();
        this.state = GameState.GAME_OVER;

        this.ui.hideMessage();
        this.ui.showGameOver();
        this.ui.fadeOut();
        assetManager.fadeOutAudio(2000); // Donem temps per que es produeixi la explosió

        setTimeout(function () {
            assetManager.getMusic("game-over");
        }, 2000);

    }

    init() {
        this.loadData(this.config.asset_data_url, this.initEnvironment.bind(this));
    };

    loadData(url, callback) {
        let httpRequest = new XMLHttpRequest();

        httpRequest.open("GET", url, true);
        httpRequest.overrideMimeType('text/plain');
        httpRequest.send(null);

        httpRequest.onload = function () {
            let data = JSON.parse(httpRequest.responseText);
            callback(data);
        };
    };

    loadAssets(assets) {
        for (let type in assets) {
            for (let i = 0; i < assets[type].length; i++) {
                assetManager.queueAsset(type, assets[type][i]);
            }
        }

        assetManager.downloadAll(this.loadEntititesData.bind(this), this.gameContext);
    };

    loadEntititesData() {
        let context = this;

        this.loadData(this.config.entity_data_url, function (data) {
            addEntity(data);
            context.loadLevelsData();
        })
    };

    loadLevelsData() {
        let context = this;

        this.loadData(this.config.levels_data_url, function (data) {
            context.levels = data.levels;
            context.start();
        });
    };

    start() {
        this.background = new Background(this.gameContext);

        this.restart();
        this.update();
    };

    startLevel(level) {
        let message = this.levels[level].name
            + "<p><span>"
            + this.levels[level].description
            + "</span></p>";
        this.ui.showMessage(message, 3000);

        this.background.start(this.levels[level].background);
        assetManager.getMusic(this.levels[this.currentLevel].music);

        this.levelEnded = false;
        this.nextWave = 0;
        this.distance = 0;

        this.player.position = {x: 10, y: 256};
    };

    restart() {
        this.ui.hideGameOver();
        assetManager.fadeInAudio();

        this.player = new Player(
            {
                pool: {
                    bullet: this.playerShotPool,
                    explosion: this.explosionPool
                },
                position: {x: 10, y: 256},
                speed: {x: 4, y: 4},
                gameWidth: this.canvas.width,
                gameHeight: this.canvas.height
            });

        this.currentLevel = 0;
        this.score = 0;
        this.state = GameState.RUNNING;

        this.enemyPool.clear();
        this.explosionPool.clear();
        this.enemyShotPool.clear();
        this.playerShotPool.clear();

        assetManager.resetMusic(this.levels[this.currentLevel].music);

        this.ui.fadeIn();
        this.startLevel(this.currentLevel);
    };
}