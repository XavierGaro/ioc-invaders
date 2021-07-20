import {getEntity, addEntity} from './modules/entityRepository.js';
import {KEY_STATUS} from "./modules/inputController.js";

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


const GameState = {
        GAME_OVER: "GameOver",
        LOADING_NEXT_LEVEL: "LoadingNextLevel",
        RUNNING: "Running"
    },
    MAX_TIME_OUTSIDE_BOUNDARIES = 180;// nombre de frames fora de la pantalla avans de esborrar-lo. a 60 FPS això equival a 3s

let gameCanvas,
    config,
    gameEngine,
    assetManager,
    gametime,

    gameContext,

    updatedSprites = [],


    backgroundConstructor = function () {
        let that = {},
            layers = {};

        function move(layer) {
            layer.position.x += layer.speed.x;
            layer.position.y += layer.speed.y;

            if (layer.position.x < -layer.image.width || layer.position.x > layer.image.width) {
                layer.position.x = 0;
            }

            if (layer.position.y < -layer.image.height || layer.position.y > layer.image.height) {
                layer.position.y = 0;
            }

        }

        function render(layer) {
            // Imatge actual
            gameContext.drawImage(
                layer.image, layer.position.x, layer.position.y, layer.image.width, layer.image.height);

            // Següent imatge
            gameContext.drawImage(
                layer.image, layer.position.x + layer.image.width - 1,
                layer.position.y, layer.image.width, layer.image.height);
        }


        that.update = function () {
            for (let i = 0; i < layers.length; i++) {
                move(layers[i]);
                render(layers[i]);
            }
        };


        that.start = function (data) {
            layers = data.layers;

            for (let i = 0; i < layers.length; i++) {
                layers[i].image = assetManager.getImage(layers[i].id);
                layers[i].position = {x: 0, y: 0}
            }
        };


        that.clear = function () {
            layers = {};
            speed.reset();
        };


        return that;
    },

    spriteConstructor = function (options) {

        let that = {},
            frameIndex = 0,
            ticksPerFrame = options.ticksPerFrame || 0,
            numberOfFrames = options.numberOfFrames || 1,
            image = options.image,
            width = image.width,
            height = image.height,
            loop = options.loop === undefined ? true : options.loop;

        that.tickCount = 0;
        that.lastTick = gametime;
        that.position = options.position || {x: 0, y: 0};
        that.size = {width: width / numberOfFrames, height: height};
        that.isDone = false;

        that.update = function () {

            if (updatedSprites.includes(that)) {
                return;
            } else {
                updatedSprites.push(that);
            }

            that.tickCount++;
            that.lastTick = gametime;

            if (that.tickCount > ticksPerFrame) {
                that.tickCount = 0;

                if (frameIndex < numberOfFrames - 1) {
                    frameIndex += 1;
                } else {
                    that.isDone = !loop;
                    frameIndex = 0;
                }
            }
        };

        that.render = function () {

            if (that.isDone) {
                return;
            }

            gameContext.drawImage(
                image,
                frameIndex * width / numberOfFrames,
                0,
                width / numberOfFrames,
                height,
                that.position.x,
                that.position.y,
                width / numberOfFrames,
                height);
        };

        return that;
    },

    gameObjectConstructor = function (options) {
        let that = {
            alive: false,
            type: null,
            position: null,
            sprite: null,
            extra: {}
        };

        that.updateSprite = function () {
            that.sprite.position = that.position;
            that.sprite.update();
        };

        that.render = function () {
            that.sprite.render()
        };

        that.start = function (data) {
            console.error("Error. Aquest mètode no està implementat");
            return that;
        };

        that.update = function () {
            console.error("Error. Aquest mètode no està implementat");
        };

        that.clear = function () {
            console.error("Error. Aquest mètode no està implementat");
        };

        return that;
    },

    movingGameObjectConstructor = function (options) {
        let that = gameObjectConstructor(options);

        that.isDestroyed = false;
        that.speed = null;
        that.outsideBoundariesTime = 0;

        that.move = function () {
            console.error("Error. Aquest mètode no està implementat");
        };

        that.checkBoundaries = function () {
            if (this.position.x >= gameCanvas.width
                || this.position.x <= -this.sprite.size.width
                || this.position.y > gameCanvas.height
                || this.position.y < -this.sprite.size.height) {
                this.outsideBoundariesTime++;
            } else {
                this.outsideBoundariesTime = 0;
            }

            return that.outsideBoundariesTime >= MAX_TIME_OUTSIDE_BOUNDARIES;
        };

        that.isCollidingWith = function (gameObject) {
            return (this.position.x < gameObject.position.x + gameObject.sprite.size.width
                && this.position.x + this.sprite.size.width > gameObject.position.x
                && this.position.y < gameObject.position.y + gameObject.sprite.size.height
                && this.position.y + this.sprite.size.height > gameObject.position.y);
        };

        return that;
    },

    explosionConstructor = function (options) {
        let that = gameObjectConstructor(options);

        that.start = function (data) {
            that.alive = true;
            that.type = data.type;
            that.position = data.position;
            that.sprite = assetManager.getSprite(data.sprite);
            that.sprite.isDone = false;
            assetManager.getSound(data.sound);
            return that;
        };

        that.clear = function () {
            that.alive = false;
            that.type = null;
            that.position = {x: 0, y: 0};
            that.sprite = null;
        };

        that.update = function () {
            if (that.sprite.isDone) {
                return true;
            }
            that.updateSprite();
            that.render();
        };


        return that;

    },

    shotConstructor = function (options) {
        let that = movingGameObjectConstructor(options);

        that.start = function (data) {
            that.alive = true;

            that.type = data.type;
            that.position = data.position;
            that.sprite = assetManager.getSprite(data.sprite);

            assetManager.getSound(data.sound);

            that.speed = data.speed;

            // Dades i Funcions especifiques de cada tipus de enemic
            that.extra = data.extra || {};
            that.move = data.move.bind(that);
            that.outsideBoundariesTime = 0;

            return that;
        };

        that.clear = function () {
            that.isDestroyed = false;
            that.alive = false;
            that.outsideBoundariesTime = 0;

            that.type = null;
            that.position = {x: 0, y: 0};
            that.sprite = null;

            that.speed = {x: 0, y: 0};

            // Dades i Funcions especifiques de cada tipus de enemic
            that.extra = {};
            that.move = null;

        };

        that.update = function () {

            if (that.isDestroyed) {
                return true;
            }

            that.updateSprite();

            that.move();

            if (that.checkBoundaries()) {
                return true;
            }

            that.render();
        };


        return that;
    },

    spaceshipConstructor = function (options) {
        let that = movingGameObjectConstructor(options);

        // that.move = null;

        that.bulletPool = options.pool.bullet;
        that.explosionPool = options.pool.explosion;

        that.fire = function () { // @protected
            for (let i = 0; i < that.cannon.length; i++) {
                that.shoot(that.cannon[i]);
            }
        };

        that.shoot = function (cannon) { // @protected
            let origin;

            if (Math.random() < cannon.fireRate / 100) {
                origin = {x: that.position.x + cannon.position.x, y: that.position.y + cannon.position.y};
                that.bulletPool.instantiate(cannon.bullet, origin, cannon.direction);
            }
        };


        that.start = function (data) {

            that.alive = true;

            that.type = data.type;
            that.position = data.position;
            that.sprite = assetManager.getSprite(data.sprite);
            that.cannon = data.cannon;
            that.explosion = data.explosion;

            that.speed = data.speed;
            that.points = data.points;

            that.outsideBoundariesTime = 0;

            // Dades i Funcions especifiques de cada tipus de enemic
            that.extra = data.extra || {};
            if (data.move) {
                that.move = data.move.bind(that);
            }

            return that;
        };

        that.clear = function () {
            that.isDestroyed = false;
            that.alive = false;

            that.type = null;
            that.position = {x: 0, y: 0};
            that.sprite = null;

            that.speed = {x: 0, y: 0};
            that.points = 0;
            that.cannon = null;

            // Dades i Funcions especifiques de cada tipus de enemic
            that.extra = null;
            that.move = null;
            that.outsideBoundariesTime = 0;

        };

        that.update = function () {

            if (that.isDestroyed) {
                that.explosionPool.instantiate(that.explosion, that.position);
                return true;
            }


            that.updateSprite();

            that.move();
            that.fire();

            if (that.checkBoundaries()) {
                return true;
            }

            that.render();
        };


        return that;

    },

    playerConstructor = function (options) {
        let that = spaceshipConstructor(options);


        function getInput() {

            if (KEY_STATUS.ArrowLeft) {
                that.position.x -= that.speed.x;

            } else if (KEY_STATUS.ArrowRight) {
                that.position.x += that.speed.x;

            }

            if (KEY_STATUS.ArrowUp) {
                that.position.y -= that.speed.y;

            } else if (KEY_STATUS.ArrowDown) {
                that.position.y += that.speed.y;
            }

            if (KEY_STATUS.Space && !that.isDestroyed) {
                that.fire();
            }

            // S'evita que surti de la pantalla
            that.position.x = that.position.x.clamp(0, gameCanvas.width - that.sprite.size.width);
            that.position.y = that.position.y.clamp(0, gameCanvas.height - that.sprite.size.height);

        }

        function updateCannon() {
            for (let i = 0; i < that.cannon.length; i++) {
                if (that.cannon[i].lastShot === undefined) {
                    that.cannon[i].lastShot = that.cannon[i].fireRate + 1;
                }
                that.cannon[i].lastShot++;
            }
        }

        that.start(getEntity('player', options.position, options.speed));

        that.shoot = function (cannon) {
            let origin;
            if (cannon.lastShot > cannon.fireRate) {
                cannon.lastShot = 0;
                origin = {x: that.position.x + cannon.position.x, y: that.position.y + cannon.position.y};
                that.bulletPool.instantiate(cannon.bullet, origin, cannon.direction);
            }
        };

        that.update = function () {
            updateCannon();

            // Si ha sigut impactat, s'elimina. Aquí també es podria afegir la animació de la explosió
            if (this.isDestroyed) {
                that.explosionPool.instantiate(that.explosion, that.position);
                return true;
            }

            getInput();
            this.updateSprite();
            this.render();
        };

        return that;
    },

    assetManagerConstructor = function (progressCallback) {
        let that = {},
            successCount = 0,
            errorCount = 0,
            queue = {
                images: [],
                sprites: [],
                sounds: [],
                music: []
            },
            cache = {
                images: {},
                sprites: {},
                sounds: {},
                music: {}
            },
            timeIntervals = {},
            currentSong;

        function updateProgress() {
            if (progressCallback) {
                progressCallback(successCount + errorCount, queue.images.length);
            }
        }

        function generateSprites() {
            let pool, poolSize;

            for (let i = 0; i < queue.sprites.length; i++) {

                pool = [];
                poolSize = 10;

                for (let j = 0; j < poolSize; j++) {
                    pool.push(spriteConstructor({
                            image: that.getImage(queue.sprites[i].id),
                            numberOfFrames: queue.sprites[i].numberOfFrames,
                            ticksPerFrame: queue.sprites[i].ticksPerFrame,
                            loop: queue.sprites[i].loop === undefined ? true : queue.sprites[i].loop
                        }
                    ));
                }

                cache.sprites[queue.sprites[i].id] = pool;
            }
        }

        function generateSounds() {
            let pool, poolSize, sound;

            for (let i = 0; i < queue.sounds.length; i++) {
                pool = [];
                poolSize = 10; // nombre màxim de sons identics que es reprodueixen al mateix temps
                for (let j = 0; j < poolSize; j++) {
                    sound = new Audio(queue.sounds[i].path);
                    sound.volume = queue.sounds[i].volume;
                    pool.push(sound);
                }
                cache.sounds[queue.sounds[i].id] = {
                    currentSound: 0,
                    pool: pool,
                    volume: queue.sounds[i].volume,
                }

            }
        }

        function isDone() {
            return (queue.images.length == successCount + errorCount);
        }

        function fadeOutAudio() {
            for (let id in cache.sounds) {
                for (let i = 0; i < cache.sounds[id].pool.length; i++) {
                    let sound = cache.sounds[id].pool[i];
                    sound.volume = 0;
                }
            }
        }

        function generateMusic() {
            for (let i = 0; i < queue.music.length; i++) {
                let sound = new Audio(queue.music[i].path);
                sound.volume = queue.music[i].volume;
                sound.loop = queue.music[i].loop;
                cache.music[queue.music[i].id] = sound;
            }
        }

        that.queueAsset = function (type, asset) {
            queue[type].push(asset);
        };

        that.downloadAll = function (callback, args) {

            if (queue.images.length === 0) {
                callback();
            }

            for (let i = 0; i < queue.images.length; i++) {
                let path = queue.images[i].path,
                    id = queue.images[i].id,
                    img = new Image();

                img.addEventListener("load", function () {
                    successCount += 1;
                    updateProgress();
                    if (isDone()) {
                        generateSprites();
                        callback(args);
                    }
                }, false);
                img.addEventListener("error", function () {
                    errorCount += 1;
                    updateProgress();
                    if (isDone()) {
                        generateSprites();
                        callback(args);
                    }
                }, false);
                img.src = path;
                cache.images[id] = img;
            }

            generateSounds();
            generateMusic();
        };


        that.getImage = function (id) {
            return cache.images[id];
        };


        that.getSprite = function (id) {
            let pool = cache.sprites[id];
            let sprite = pool[pool.length - 1];
            pool.unshift(pool.pop());
            return sprite;
        };

        that.getSound = function (id) {
            let sounds = cache.sounds[id];

            if (sounds.pool[sounds.currentSound].currentTime === 0
                || sounds.pool[sounds.currentSound].ended) {
                sounds.pool[sounds.currentSound].play();
            }
            sounds.currentSound = (sounds.currentSound + 1) % sounds.pool.length;
        };

        that.fadeOutAudio = function (timeBeforeFadeOut) {
            that.clearIntervals();
            if (timeBeforeFadeOut) {
                timeIntervals.fadeOutAudio = setTimeout(fadeOutAudio, timeBeforeFadeOut);
            } else {
                fadeOutAudio();
            }

        };

        that.fadeInAudio = function () {
            that.clearIntervals();

            for (let id in cache.sounds) {
                for (let i = 0; i < cache.sounds[id].pool.length; i++) {
                    let sound = cache.sounds[id].pool[i];
                    sound.volume = cache.sounds[id].volume;
                }
            }
        };

        that.clearIntervals = function () {
            clearInterval(timeIntervals.fadeInAudio);
            clearInterval(timeIntervals.fadeOutAudio);
        };

        that.getMusic = function (id) {
            that.resetMusic(currentSong);
            cache.music[id].play();
            currentSong = id;
        };

        that.resetMusic = function (id) {
            if (!id) {
                return;
            }

            if (!cache.music[id].ended) {
                cache.music[id].pause();
            }

            if (cache.music[id].currentTime > 0) {
                cache.music[id].currentTime = 0;
            }

        };

        return that;
    },

    gameObjectPoolConstructor = function (maxSize, generator, config) {
        let that = {},
            size = maxSize;


        function disable(index) {
            that.pool[index].clear();
            that.pool.push((that.pool.splice(index, 1))[0]);
        }

        that.actives = size;

        that.pool = [];

        for (let i = 0; i < size; i++) {
            that.pool[i] = generator(config);
        }

        that.instantiate = function (type, position, speed) {
            let instance = that.pool[size - 1].start(getEntity(type, position, speed));
            that.pool.unshift(that.pool.pop());
            return instance;
        };

        that.update = function () {
            for (let i = 0; i < size; i++) {
                // Només dibuixiem fins que trobem un objecte que no sigui viu
                if (that.pool[i].alive) {
                    if (that.pool[i].update()) {
                        // Si update ha retornat cert es que s'ha de desactivar
                        disable(i);
                    }
                } else {
                    that.actives = i;
                    break;
                }
            }
        };

        that.clear = function () {
            for (let i = 0; i < size; i++) {
                that.pool[i].alive = false;
            }
            that.actives = 0;
        };

        return that;
    },

    gameEngineConstructor = function () {
        let that = {},
            levels = {},
            currentLevel,
            levelEnded,
            score,
            distance, // Relativa al nivell actual
            nextWave, // Relativa al nivell actual

            enemyPool,
            enemyShotPool,
            playerShotPool,
            explosionPool,

            background,

            player,

            state,

            ui = (function () {
                let scoreText = document.getElementById('score'),
                    distanceText = document.getElementById('distance'),
                    messageText = document.getElementById('messages');

                return {
                    update: function () {
                        scoreText.innerHTML = score;
                        distanceText.innerHTML = distance;
                    },
                    showMessage: function (message, duration) { // Temps en milisegons
                        messageText.innerHTML = message;
                        messageText.style.opacity = 1;

                        setTimeout(function () {
                            messageText.style.opacity = 0;
                        }, duration);
                    },

                    hideMessage: function () {
                        messageText.style.opacity = 0;
                    },

                    showGameOver: function () {
                        document.getElementById('game-over').style.display = "block";
                    },

                    hideGameOver: function () {
                        document.getElementById('game-over').style.display = "none";
                    },

                    transitionScreen: function (callback) {
                        gameCanvas.style.opacity = 0;

                        setTimeout(function () {
                            gameCanvas.style.opacity = 1;
                            callback();
                        }, 3000); // la transicion dura 3s
                    },

                    fadeIn: function () {
                        gameCanvas.style.opacity = 1;
                    },

                    fadeOut: function () {
                        gameCanvas.style.opacity = 0;
                    }


                };
            })();

        function initEnvironment(data) {
            gameContext = gameCanvas.getContext("2d");

            explosionPool = gameObjectPoolConstructor(100, explosionConstructor);
            enemyShotPool = gameObjectPoolConstructor(500, shotConstructor);
            enemyPool = gameObjectPoolConstructor(100, spaceshipConstructor, {
                pool: {
                    bullet: enemyShotPool,
                    explosion: explosionPool
                }
            });

            playerShotPool = gameObjectPoolConstructor(100, shotConstructor);

            that.loadAssets(data.assets);
        }

        function update() {
            window.requestAnimationFrame(update);

            updatedSprites = [];

            updateWaves();
            detectCollisions();

            background.update();
            enemyPool.update();
            enemyShotPool.update();
            playerShotPool.update();


            if (player.isDestroyed && state != GameState.GAME_OVER) {
                setGameOver();

            } else if (enemyPool.actives === 0 && levelEnded && state != GameState.GAME_OVER
                && state != GameState.LOADING_NEXT_LEVEL) {

                ui.transitionScreen(setEndLevel)
                state = GameState.LOADING_NEXT_LEVEL;
            } else if (state != GameState.GAME_OVER) {
                player.update();
                distance++;
            }

            explosionPool.update();

            ui.update();


        }

        function detectCollisions() {
            let impactInfo,
                i;

            // bala del jugador amb enemic
            impactInfo = detectCollisionsPoolWithPool(playerShotPool, enemyPool);

            if (impactInfo.length > 0) {
                for (i = 0; i < impactInfo.length; i++) {
                    impactInfo[i].source.isDestroyed = true;
                    impactInfo[i].target.isDestroyed = true;
                    score += impactInfo[i].target.points;
                }
            }

            // bala del enemic amb jugador
            impactInfo = detectCollisionsPoolWithGameObject(enemyShotPool, player);

            if (impactInfo.length > 0) {
                for (i = 0; i < impactInfo.length; i++) {
                    impactInfo[i].source.isDestroyed = true;
                    impactInfo[i].target.isDestroyed = true;

                }
            }

            // enemic amb jugador
            impactInfo = detectCollisionsPoolWithGameObject(enemyPool, player);
            if (impactInfo.length > 0) {
                for (i = 0; i < impactInfo.length; i++) {
                    impactInfo[i].source.isDestroyed = true;
                    impactInfo[i].target.isDestroyed = true;
                }
            }


        }

        function detectCollisionsPoolWithPool(poolA, poolB) {
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

        function detectCollisionsPoolWithGameObject(pool, gameObject) {
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

        function updateWaves() {
            let waves = levels[currentLevel].waves,
                currentWave;

            if (nextWave < waves.length && distance >= waves[nextWave].distance) {
                currentWave = waves[nextWave];
                spawner(currentWave.spawns);
                nextWave++;
            }

            if (distance > levels[currentLevel].end) {
                levelEnded = true;
            }
        }

        function spawner(spawns) {
            for (let i = 0; i < spawns.length; i++) {
                if (!spawns[i].formation) {
                    spawnEnemy(spawns[i]);
                } else {
                    spawnFormation(spawns[i]);
                }
            }
        }

        function spawnEnemy(enemy) {
            enemyPool.instantiate(enemy.type, enemy.position, enemy.speed);
        }

        function spawnFormation(wave) {
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

                        enemyPool.instantiate(wave.type, {
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
                            enemyPool.instantiate(wave.type, {
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
                        enemyPool.instantiate(wave.type, {
                            x: originPosition.x + (spacer * i),
                            y: originPosition.y
                        }, wave.speed);
                    }
                    break;

                case "column":
                    originPosition = {x: wave.position.x, y: wave.position.y};
                    spacer = wave.formation.spacer;

                    for (i = 0; i < wave.formation.amount; i++) {
                        enemyPool.instantiate(wave.type, {
                            x: originPosition.x,
                            y: originPosition.y + (spacer * i)
                        }, wave.speed);
                    }
                    break;


                default:
                    console.log("Error, no es reconeix el tipus de formació");
            }

        }

        function setEndLevel() {

            currentLevel++;

            if (currentLevel >= levels.length) {
                currentLevel = 0;
            }

            enemyPool.clear();
            explosionPool.clear();
            enemyShotPool.clear();
            playerShotPool.clear();

            that.startLevel(currentLevel);
            state = GameState.RUNNING;
        }


        function setGameOver() {
            player.update();
            state = GameState.GAME_OVER;

            ui.hideMessage();
            ui.showGameOver();
            ui.fadeOut();
            assetManager.fadeOutAudio(2000); // Donem temps per que es produeixi la explosió
            setTimeout(function () {
                assetManager.getMusic("game-over");
            }, 2000);

        }

        that.init = function () {
            that.loadData(config.asset_data_url, initEnvironment);
        };

        that.loadData = function (url, callback) {
            let httpRequest = new XMLHttpRequest();

            httpRequest.open("GET", url, true);
            httpRequest.overrideMimeType('text/plain');
            httpRequest.send(null);

            httpRequest.onload = function () {
                let data = JSON.parse(httpRequest.responseText);
                callback(data);
            };
        };

        that.loadAssets = function (assets) {
            for (let type in assets) {
                for (let i = 0; i < assets[type].length; i++) {
                    assetManager.queueAsset(type, assets[type][i]);
                }
            }

            assetManager.downloadAll(that.loadEntititesData);
        };


        that.loadEntititesData = function () {
            that.loadData(config.entity_data_url, function (data) {

                addEntity(data);
                that.loadLevelsData();
            })
        };

        that.loadLevelsData = function () {
            that.loadData(config.levels_data_url, function (data) {
                levels = data.levels;
                that.start();
            });
        };

        that.start = function () {

            background = backgroundConstructor({
                context: gameContext
            });

            that.restart();
            update();

        };

        that.startLevel = function (level) {
            let message = levels[level].name
                + "<p><span>"
                + levels[level].description
                + "</span></p>";
            ui.showMessage(message, 3000);

            background.start(levels[level].background);
            assetManager.getMusic(levels[currentLevel].music);

            levelEnded = false;
            nextWave = 0;
            distance = 0;

            player.position = {x: 10, y: 256};
        };


        that.restart = function () {

            ui.hideGameOver();
            assetManager.fadeInAudio();

            player = playerConstructor(
                {
                    pool: {
                        bullet: playerShotPool,
                        explosion: explosionPool
                    },
                    position: {x: 10, y: 256},
                    speed: {x: 4, y: 4}
                });

            currentLevel = 0;
            score = 0;
            state = GameState.RUNNING;

            enemyPool.clear();
            explosionPool.clear();
            enemyShotPool.clear();
            playerShotPool.clear();

            assetManager.resetMusic(levels[currentLevel].music);

            ui.fadeIn();
            that.startLevel(currentLevel);
        };

        return that;
    };

export function start(conf, canvas) {
    config = conf;
    gameCanvas = canvas;
    gameEngine = gameEngineConstructor();
    assetManager = assetManagerConstructor(function (current, total) {
        console.log("Carregats:" + current + "/" + total);
    });

    gameEngine.init();
}

export function restart() {
    gameEngine.restart();
}


window.onload = function () {
    let gameContainer = document.getElementById('game-background'),
        canvas,
        game;

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