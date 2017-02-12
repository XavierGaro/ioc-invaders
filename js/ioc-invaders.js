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

/**
 * Aquesta utilitat afegeix el mètode contains al prototip de Array per permetre comprov
 *
 * @param {*} needle - objecte a cercar dins del array
 * @returns {boolean} - cert si es troba o false en cas contrari
 */
Array.prototype.contains = function (needle) {
    for (var i in this) {
        if (this[i] == needle) return true;
    }
    return false;
};


/**
 * Aquest es el mòdul que conté el joc evitant contaminar l'espai global.
 */
var IOC_INVADERS = function (config) {
    var gameManager,
        assetManager,
        gametime,

        gameCanvas,// TODO: per acabar de definir si aquests dos valors els injectem on calgui o els deixem globals (ara es fa servir de les dues maneras)
        gameContext,

        MAX_TIME_OUTSIDE_BOUNDARIES = 180,// nombre de frames fora de la pantalla avans de esborrar-lo. a 60 FPS això equival a 3s

        updatedSprites = [],// TODO: cercar altre solució, això hauria de ser una propietar stàtica de Sprite en ES6

        entitiesRepository = (function () {
            var entities = {},

                addEntity = function (name, data) {
                    var entity = data;

                    entity.sprite = data.sprite;

                    if (data.move) {
                        entity.move = strategiesRepository.get(data.move);
                    }

                    entities[name] = entity;
                };


            return {
                add: function (entity) {
                    if (Array.isArray(entity)) {
                        for (var i = 0; i < entity.length; i++) {
                            addEntity(entity[i].name, entity[i].data);
                        }
                    } else {
                        addEntity(entity.name, entity.data);
                    }

                },

                // Retorna un nou objecte amb les propietats originals més les mesclades
                get: function (name, position, speed) {
                    var entity = entities[name];
                    if (!entity) {
                        console.error("No es troba la entitat: ", entity);
                    }
                    entity.position = position;
                    entity.speedController = speed;

                    return entity;
                }
            }
        })(),

        strategiesRepository = (function () { //IIFE només exposa el mètode get, no cal constructor.
            var strategies = {
                movement_pattern_a: function () {
                    // Inicialització
                    if (!this.extra.ready) {
                        this.extra.speedController = Math.max(Math.abs(this.speedController.x), Math.abs(this.speedController.y));
                        this.extra.leftEdge = this.position.x - 10 * this.extra.speedController;
                        this.extra.rightEdge = this.position.x + 10 * this.extra.speedController;
                        this.extra.topEdge = this.position.y + 10 * this.extra.speedController;
                        this.extra.bottomEdge = this.position.y - 10 * this.extra.speedController;
                        this.extra.direction = {x: this.speedController.x <= 0 ? -1 : 1, y: 1};
                        this.extra.ready = true;
                    }

                    this.position.x += this.speedController.x;
                    this.position.y += this.speedController.y * this.extra.direction.y;


                    if (this.position.y > this.extra.topEdge || this.position.y < this.extra.bottomEdge) {
                        this.speedController.x = this.extra.direction.x >= 0 ? this.extra.speedController : -this.extra.speedController;
                        this.speedController.y = 0;
                        this.extra.direction.y = -this.extra.direction.y;
                    }

                    if (this.position.x <= this.extra.leftEdge) {
                        this.speedController.x = 0;
                        this.speedController.y = this.extra.speedController;
                        this.extra.leftEdge = this.position.x - 10 * this.extra.speedController;
                    } else if (this.position.x >= this.extra.rightEdge) {
                        this.speedController.x = 0;
                        this.speedController.y = this.extra.speedController;
                        this.extra.rightEdge = this.position.x + 10 * this.extra.speedController;
                    }

                    this.position.y = this.position.y.clamp(this.extra.bottomEdge, this.extra.topEdge);
                },

                movement_pattern_b: function () { // TODO falta solucionar como se añaden los extras
                    // Inicialització

                    this.position.x += this.speedController.x;
                    this.position.y += this.speedController.y;

                },

                movement_pattern_c: function () {
                    // Inicialització

                    if (!this.extra.ready) {
                        this.extra.age = 0;
                        this.extra.speedController = Math.max(Math.abs(this.speedController.x), Math.abs(this.speedController.y));
                        this.extra.ready = true;
                        this.extra.vertical = this.speedController.x > this.speedController.y;
                    }

                    if (this.extra.direction === 1) {
                        this.speedController.x = this.extra.speedController * Math.cos(-this.extra.age * Math.PI / 64);

                    } else {
                        this.speedController.y = this.extra.speedController * Math.sin(this.extra.age * Math.PI / 64);

                    }

                    this.extra.age++;
                    this.position.x += this.speedController.x;
                    this.position.y += this.speedController.y;

                },

                movement_pattern_d: function () { // TODO identic a movement_pattern_d però amb cos
                    // Inicialització

                    if (!this.extra.ready) {
                        this.extra.age = 0;
                        this.extra.speedController = Math.max(Math.abs(this.speedController.x), Math.abs(this.speedController.y));
                        this.extra.ready = true;
                        this.extra.vertical = this.speedController.x > this.speedController.y;
                    }

                    if (this.extra.direction === 1) {
                        this.speedController.x = this.extra.speedController * Math.cos(this.extra.age * Math.PI / 64);

                    } else {
                        this.speedController.y = this.extra.speedController * Math.cos(this.extra.age * Math.PI / 64);

                    }

                    this.extra.age++;
                    this.position.x += this.speedController.x;
                    this.position.y += this.speedController.y;

                }

            };

            return {
                get: function (strategy) {
                    return strategies[strategy];
                }
            }

        }()),


        inputController = (function () {
            var KEY_CODES = {
                    32: 'space',
                    37: 'left',
                    38: 'up',
                    39: 'right',
                    40: 'down'
                },

                KEY_STATUS = {};

            for (var code in KEY_CODES) {
                KEY_STATUS[KEY_CODES[code]] = false;
            }

            document.onkeydown = function (e) {
                var keyCode = (e.keyCode) ? e.keyCode : e.charCode;

                if (KEY_CODES[keyCode]) {
                    e.preventDefault();
                    KEY_STATUS[KEY_CODES[keyCode]] = true;
                }
            };

            document.onkeyup = function (e) {
                var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
                if (KEY_CODES[keyCode]) {
                    e.preventDefault();
                    KEY_STATUS[KEY_CODES[keyCode]] = false;
                }
            };

            return {
                KEY_CODES: KEY_CODES,
                KEY_STATUS: KEY_STATUS
            }
        })(),

        poolConstructor = function (maxSize, generator, config) {
            var that = {},
                size = maxSize,
                disable = function (index) {
                    that.pool[index].clear();
                    that.pool.push((that.pool.splice(index, 1))[0]);
                };

            that.actives = size;
            that.pool = [];

            for (var i = 0; i < size; i++) {
                that.pool[i] = generator(config);
            }

            that.instantiate = function (type, position, speed) {
                var instance = that.pool[size - 1].start(entitiesRepository.get(type, position, speed));
                that.pool.unshift(that.pool.pop());
                return instance;
            };

            that.update = function () {
                for (var i = 0; i < size; i++) {
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
                for (var i = 0; i < size; i++) {
                    that.pool[i].alive = false;
                }
                that.actives = 0;
            };


            return that;

        },

        gameObjectConstructor = function (options) {
            var that = {
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
            var that = gameObjectConstructor(options);

            that.isColliding = false;
            that.speedController = null;
            that.outsideBoundariesTime = 0;

            that.update = function () {
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
            var that = gameObjectConstructor(options);

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
            var that = movingGameObjectConstructor(options);

            that.start = function (data) {
                // that.isColliding = false;
                that.alive = true;

                that.type = data.type;
                that.position = data.position;
                that.sprite = assetManager.getSprite(data.sprite);

                assetManager.getSound(data.sound);

                that.speedController = data.speedController;

                // Dades i Funcions especifiques de cada tipus de enemic
                that.extra = data.extra || {};
                that.move = data.move.bind(that);
                that.outsideBoundariesTime = 0;

                return that;
            };

            that.clear = function () {
                that.isColliding = false;
                that.alive = false;
                that.outsideBoundariesTime = 0;

                that.type = null;
                that.position = {x: 0, y: 0};
                that.sprite = null;

                that.speedController = {x: 0, y: 0};

                // Dades i Funcions especifiques de cada tipus de enemic
                that.extra = {};
                that.move = null;

            };

            that.update = function () {

                if (that.isColliding) {
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
            var that = movingGameObjectConstructor(options);

            // that.move = null;

            that.bulletPool = options.pool.bullet;
            that.explosionPool = options.pool.explosion;

            that.fire = function () { // @protected
                for (var i = 0; i < that.cannon.length; i++) {
                    that.shoot(that.cannon[i]);
                }
            };

            that.shoot = function (cannon) { // @protected
                var origin;

                if (Math.random() < cannon.fireRate / 100) {
                    origin = {x: that.position.x + cannon.position.x, y: that.position.y + cannon.position.y};
                    that.bulletPool.instantiate(cannon.bullet, origin, cannon.direction);
                }
            };

            // that.alive = false;

            that.start = function (data) {

                // that.isColliding = false;
                that.alive = true;

                that.type = data.type;
                that.position = data.position;
                that.sprite = assetManager.getSprite(data.sprite);
                that.cannon = data.cannon;
                that.explosion = data.explosion;

                that.speedController = data.speedController;
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
                that.isColliding = false;
                that.alive = false;

                that.type = null;
                that.position = {x: 0, y: 0};
                that.sprite = null;

                that.speedController = {x: 0, y: 0};
                that.points = 0;
                that.cannon = null;

                // Dades i Funcions especifiques de cada tipus de enemic
                that.extra = null;
                that.move = null;
                that.outsideBoundariesTime = 0;

            };

            /**
             *
             * @returns {boolean} Cert si aquest enemic s'ha d'eliminar
             */
            that.update = function () {

                // Si ha sigut impactat, s'elimina. Aquí també es podria afegir la animació de la explosió
                if (that.isColliding) {
                    that.explosionPool.instantiate(that.explosion, that.position); // TODO canviar pel punt central del sprite
                    //that.explosionPool.instantiate('enemy_explosion', that.position); // TODO canviar pel punt central del sprite
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
            var that = spaceshipConstructor(options);

            that.start(entitiesRepository.get('player', options.position, options.speedController)); // TODO la posició inicial

            that.shoot = function (cannon) {
                var origin;
                if (cannon.lastShot > cannon.fireRate) {
                    cannon.lastShot = 0;
                    origin = {x: that.position.x + cannon.position.x, y: that.position.y + cannon.position.y};
                    that.bulletPool.instantiate(cannon.bullet, origin, cannon.direction);
                }
            };

            var getInput = function () {
                if (inputController.KEY_STATUS.left) {
                    that.position.x -= that.speedController.x;

                } else if (inputController.KEY_STATUS.right) {
                    that.position.x += that.speedController.x;

                }

                if (inputController.KEY_STATUS.up) {
                    that.position.y -= that.speedController.y;

                } else if (inputController.KEY_STATUS.down) {
                    that.position.y += that.speedController.y;
                }

                if (inputController.KEY_STATUS.space && !that.isColliding) {
                    that.fire();
                }

                // Evitem que surti de la pantalla
                that.position.x = that.position.x.clamp(0, gameCanvas.width - that.sprite.size.width);
                that.position.y = that.position.y.clamp(0, gameCanvas.height - that.sprite.size.height);

            };


            that.update = function () {
                updateCannon();

                // Si ha sigut impactat, s'elimina. Aquí també es podria afegir la animació de la explosió
                if (this.isColliding) {
                    that.explosionPool.instantiate(that.explosion, that.position);
                    return true;
                }

                getInput();
                this.updateSprite();
                this.render();
            };

            var updateCannon = function () {
                for (var i = 0; i < that.cannon.length; i++) {
                    if (that.cannon[i].lastShot === undefined) {
                        that.cannon[i].lastShot = that.cannon[i].fireRate + 1;
                    }
                    that.cannon[i].lastShot++;
                }
            };


            return that;
        },


        backgroundConstructor = function () {
            var that = {},
                layers = {},

                speedController = {
                    value: 0,
                    target: 0,
                    acceleration: 0.01,

                    reset: function () {
                        this.value = 0;
                        this.target = 0;
                        this.acceleration = 0.002;
                    },

                    update: function () {
                        if (this.value < this.target) {
                            this.value += this.acceleration;
                        } else if (this.value > this.target) {
                            this.value -= this.acceleration;
                        }
                    }
                },


                move = function (layer) {
                    layer.position.x += layer.speedController.x * speedController.value;
                    layer.position.y += layer.speedController.y * speedController.value;

                    if (layer.position.x < -layer.image.width || layer.position.x > layer.image.width) {
                        layer.position.x = 0;
                    }

                    if (layer.position.y < -layer.image.height || layer.position.y > layer.image.height) {
                        layer.position.y = 0;
                    }

                },

                render = function (layer) {
                    // Imatge actual
                    gameContext.drawImage(
                        layer.image, layer.position.x, layer.position.y, layer.image.width, layer.image.height);

                    // Següent imatge
                    gameContext.drawImage(
                        layer.image, layer.position.x + layer.image.width - 1,
                        layer.position.y, layer.image.width, layer.image.height);
                };


            that.update = function () {
                speedController.update();
                for (var i = 0; i < layers.length; i++) {
                    move(layers[i]);
                    render(layers[i]);
                }

            };


            that.start = function (data) {
                layers = data.layers;

                speedController.value = data.speedController.start;
                speedController.target = data.speedController.target;

                for (var i = 0; i < layers.length; i++) {
                    layers[i].image = assetManager.getImage(layers[i].id);
                    layers[i].position = {x: 0, y: 0}
                }
            };


            that.clear = function () {
                layers = {};
                speedController.reset();
            };


            return that;
        },

        spriteConstructor = function (options) {

            var that = {},
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

                if (updatedSprites.contains(that)) {
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

            // TODO: En aquest projecte no el fem servir perqué només tenim un canvas i es redibuixa completament

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

        // TODO s'ha de fer un pool de sprites i que es retorni el primer lliure, per evitar els problemas de que tots els sprites van amb el mateix frame
        assetManagerConstructor = function (progressCallback) {
            var that = {},
                successCount = 0,
                errorCount = 0,
                downloadQueue = [],// TODO convertir en un unic objecte que contingui totes les cues
                spritesQueue = [],
                soundsQueue = [],
                musicQueue = [],
                cache = {
                    images: {},
                    sprites: {},
                    sounds: {},
                    music: {}
                },
                intervals = {},
                currentSong;

            updateProgress = function () {
                if (progressCallback) {
                    progressCallback(successCount + errorCount, downloadQueue.length);
                }
            };


            that.queueDownload = function (asset) {
                downloadQueue.push(asset);
            };

            that.queueSprites = function (asset) {
                spritesQueue.push(asset);
            };

            that.queueSounds = function (asset) {
                soundsQueue.push(asset);
            };

            that.queueMusic = function (asset) {
                musicQueue.push(asset);
            };


            that.downloadAll = function (callback, args) {
                var i, j, pool, poolSize, sound;

                if (downloadQueue.length === 0) {
                    callback();
                }


                // Primer descarreguem les imatges
                for (i = 0; i < downloadQueue.length; i++) {
                    var path = downloadQueue[i].path,
                        id = downloadQueue[i].id,
                        img = new Image();

                    img.addEventListener("load", function () {
                        successCount += 1;
                        updateProgress();
                        if (that.isDone()) {
                            generateSprites();
                            callback(args);
                        }
                    }, false);
                    img.addEventListener("error", function () {
                        errorCount += 1;
                        updateProgress();
                        if (that.isDone()) {
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

            var generateSprites = function () {
                var pool;

                for (var i = 0; i < spritesQueue.length; i++) {

                    pool = [];

                    var poolSize = 10;

                    for (var j = 0; j < poolSize; j++) {
                        pool.push(spriteConstructor({
                                image: that.getImage(spritesQueue[i].id),
                                numberOfFrames: spritesQueue[i].numberOfFrames,
                                ticksPerFrame: spritesQueue[i].ticksPerFrame,
                                loop: spritesQueue[i].loop === undefined ? true : spritesQueue[i].loop
                            }
                        ));
                    }

                    cache.sprites[spritesQueue[i].id] = pool;
                }

            };

            var generateSounds = function () {
                var pool, poolSize, sound;
                for (var i = 0; i < soundsQueue.length; i++) {
                    pool = [];
                    poolSize = 10; // TODO nombre màxim de sons identics que es reprodueixen al mateix temps
                    for (var j = 0; j < poolSize; j++) {
                        //Initialize the sound
                        sound = new Audio(soundsQueue[i].path);
                        sound.volume = soundsQueue[i].volume;
                        sound.load(); // TODO això es necessari pels navegadorsm és antics, si funciona amb FF i Chrome ho esborremt
                        pool.push(sound);
                    }
                    cache.sounds[soundsQueue[i].id] = {
                        currentSound: 0,
                        pool: pool,
                        volume: soundsQueue[i].volume,
                    }

                }
            };

            that.isDone = function () {
                return (downloadQueue.length == successCount + errorCount);
            };

            that.getImage = function (id) {
                return cache.images[id];
            };


            that.getSprite = function (id) {
                var pool = cache.sprites[id];
                var sprite = pool[pool.length - 1];
                pool.unshift(pool.pop());
                return sprite;
            };

            that.getSound = function (id) {
                var sounds = cache.sounds[id];

                if (sounds.pool[sounds.currentSound].currentTime === 0
                    || sounds.pool[sounds.currentSound].ended) {
                    sounds.pool[sounds.currentSound].play();
                }
                sounds.currentSound = (sounds.currentSound + 1) % sounds.pool.length;
            };

            that.fadeOutAudio = function (timer) {
                that.clearIntervals();
                if (timer) {
                    intervals.fadeOutAudio = setTimeout(fadeOutAudio, timer);
                } else {
                    fadeOutAudio();
                }

            };

            var fadeOutAudio = function () {
                for (var id in cache.sounds) {
                    for (var i = 0; i < cache.sounds[id].pool.length; i++) {
                        sound = cache.sounds[id].pool[i];
                        sound.volume = 0;
                    }
                }
            };

            that.fadeInAudio = function () {
                that.clearIntervals();

                for (var id in cache.sounds) {
                    for (var i = 0; i < cache.sounds[id].pool.length; i++) {
                        sound = cache.sounds[id].pool[i];
                        sound.volume = cache.sounds[id].volume;
                    }
                }
            };

            that.clearIntervals = function () {
                clearInterval(intervals.fadeInAudio);
                clearInterval(intervals.fadeOutAudio);
            };

            that.queueMusic = function (asset) {
                musicQueue.push(asset);
            };

            var generateMusic = function () {
                for (var i = 0; i < musicQueue.length; i++) {
                    sound = new Audio(musicQueue[i].path);
                    sound.volume = musicQueue[i].volume;
                    sound.loop = musicQueue[i].loop;
                    sound.load(); // TODO això es necessari pels navegadorsm és antics, si funciona amb FF i Chrome ho esborremt
                    cache.music[musicQueue[i].id] = sound;
                }
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


        gameManagerConstructor = function () {
            var that = {},
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

                state,// "GameOver", "LoadingNextLevel", "Runnin" TODO: substituir per un enum


                initEnvironment = function (data) { // TODO: Esta puede ser privada, o ser sustituida por init
                    gameCanvas = document.getElementById(data.canvas.game);
                    gameContext = gameCanvas.getContext("2d");


                    explosionPool = poolConstructor(100, explosionConstructor/*, {pool: {sound: soundPool}}*/);


                    enemyShotPool = poolConstructor(500, shotConstructor);
                    enemyPool = poolConstructor(100, spaceshipConstructor, {
                        pool: {
                            bullet: enemyShotPool,
                            explosion: explosionPool
                        }
                    });

                    playerShotPool = poolConstructor(100, shotConstructor/*, {pool: {sound: soundPool}}*/);

                    //soundPool =  poolConstructor(100, explosionConstructor);

                    that.loadAssets(data.assets);

                },

                ui = (function () {
                    var scoreText = document.getElementById('score'),
                        distanceText = document.getElementById('distance'),
                        messageText = document.getElementById('messages');

                    return {
                        update: function () {
                            scoreText.innerHTML = score;
                            distanceText.innerHTML = distance;
                        },
                        showMessage: function (message, time) { // Temps en milisegons
                            messageText.innerHTML = message;
                            messageText.style.opacity = 1;

                            setTimeout(function () {
                                messageText.style.opacity = 0;
                            }, time);
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
                            }, 3000); // la transicion durea 3s
                        },

                        fadeIn: function () {
                            gameCanvas.style.opacity = 1;
                        },

                        fadeOut: function () {
                            gameCanvas.style.opacity = 0;
                        }


                    };
                })();


            that.init = function () {
                // Iniciem el joc indicant la url des de on es descarregaran les dades del joc.

                that.loadData(config.asset_data_url, initEnvironment);

            };


            that.loadData = function (url, callback) {
                var httpRequest = new XMLHttpRequest();

                httpRequest.open("GET", url, true);
                httpRequest.overrideMimeType('text/plain');
                httpRequest.send(null);

                httpRequest.onload = function () {
                    var data = JSON.parse(httpRequest.responseText);
                    callback(data);
                };
            };

            that.loadAssets = function (assets) {
                var i;
                // Descarreguem les imatges i generem els sprites
                for (i = 0; i < assets.images.length; i++) {
                    assetManager.queueDownload(assets.images[i]);
                }
                for (i = 0; i < assets.sprites.length; i++) {
                    assetManager.queueSprites(assets.sprites[i]);
                }

                for (i = 0; i < assets.sounds.length; i++) {
                    assetManager.queueSounds(assets.sounds[i]);
                }

                for (i = 0; i < assets.music.length; i++) {
                    assetManager.queueMusic(assets.music[i]);
                }

                assetManager.downloadAll(that.loadEnemiesData);

            };


            that.loadEnemiesData = function () {
                that.loadData(config.entity_data_url, function (data) {

                    entitiesRepository.add(data);
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

                var message = levels[level].name
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


            function update() { // TODO: eliminar després de les proves o canviar el nom a update <-- altre opció es fer que desde el gameLoop es cridint els diferents mètodes: Update(), DetectCollisions(), etc.
                window.requestAnimationFrame(update);

                updatedSprites = [];

                spawner();

                detectCollisions();

                background.update();
                enemyPool.update();
                enemyShotPool.update();
                playerShotPool.update();


                if (player.isColliding && state != "GameOver") {
                    setGameOver();
                } else if (enemyPool.actives === 0 && levelEnded && state != "GameOver" && state != "LoadingNextLevel") {
                    ui.transitionScreen(setEndLevel)
                    state = "LoadingNextLevel";
                } else if (state != "GameOver") {
                    player.update();
                    distance++;
                }

                explosionPool.update();

                ui.update();


            }

            function detectCollisions() {
                var impactInfo,
                    i;


                // bala del jugador amb enemic
                impactInfo = detectCollisionsPoolWithPool(playerShotPool, enemyPool);

                // TODO: en lloc de fer la destrucció automàtica afegir els mètodes per danyar al enemic
                if (impactInfo.length > 0) {
                    for (i = 0; i < impactInfo.length; i++) {
                        impactInfo[i].source.isColliding = true; // TODO: canviar el nom a isDestroyed
                        impactInfo[i].target.isColliding = true; // TODO: canviar el nom a isDestroyed
                        score += impactInfo[i].target.points;
                        //console.log("points", impactInfo[i].target.points);
                    }

                }

                // bala del enemic amb jugador
                impactInfo = detectCollisionsPoolWithGameObject(enemyShotPool, player);

                // TODO: en lloc de fer la destrucció automàtica afegir els mètodes per danyar al enemic
                if (impactInfo.length > 0) {
                    for (i = 0; i < impactInfo.length; i++) {
                        impactInfo[i].source.isColliding = true; // TODO: canviar el nom a isDestroyed
                        impactInfo[i].target.isColliding = true; // TODO: canviar el nom a isDestroyed

                    }

                }

                // enemic amb jugador
                impactInfo = detectCollisionsPoolWithGameObject(enemyPool, player);
                if (impactInfo.length > 0) {
                    for (i = 0; i < impactInfo.length; i++) {
                        impactInfo[i].source.isColliding = true; // TODO: canviar el nom a isDestroyed
                        impactInfo[i].target.isColliding = true; // TODO: canviar el nom a isDestroyed
                    }
                }


            }

            function detectCollisionsPoolWithPool(poolA, poolB) {
                var i = 0,
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
                var i = 0,
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


            // TODO: Crear un objecte privat distance que s'encarregui de cridar aquest mètodes amb un update() i dedicar
            // el spwaner realment a spawnejar enemics
            function spawner() {
                var waves = levels[currentLevel].waves,
                    currentWave;

                if (nextWave < waves.length && distance >= waves[nextWave].distance) {
                    currentWave = waves[nextWave];

                    for (var i = 0; i < currentWave.spawns.length; i++) {
                        if (!currentWave.spawns[i].formation) { // Si no te formació es tracta d'un enemic unic
                            spawnEnemy(currentWave.spawns[i]);
                        } else {
                            spawnFormation(currentWave.spawns[i]);
                        }
                    }

                    nextWave++;
                }

                if (distance > levels[currentLevel].end) {
                    levelEnded = true;
                }
            }

            function spawnEnemy(enemy) {
                enemyPool.instantiate(enemy.type, enemy.position, enemy.speedController);
            }

            function spawnFormation(wave) {
                var i, j,
                    originPosition,
                    spacer,
                    nextColumn,
                    currentPosition,
                    side;

                switch (wave.formation.type) {
                    case "columns":

                        // TODO aquestes variables s'han de poder eliminar en la seva major part. COMPTE: s'ha de crear una nova posició per cada objecte que instanciem o es canvien totes a l'hora.
                        originPosition = {x: wave.position.x, y: wave.position.y};
                        spacer = wave.formation.spacer;
                        nextColumn = originPosition.y + wave.formation.column_height;
                        currentPosition = {x: wave.position.x, y: wave.position.y};


                        for (i = 0; i < wave.formation.amount; i++) {

                            enemyPool.instantiate(wave.type, {
                                x: currentPosition.x,
                                y: currentPosition.y
                            }, wave.speedController);


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
                                }, wave.speedController);

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
                            }, wave.speedController);
                        }
                        break;

                    case "column":
                        originPosition = {x: wave.position.x, y: wave.position.y};
                        spacer = wave.formation.spacer;

                        for (i = 0; i < wave.formation.amount; i++) {
                            enemyPool.instantiate(wave.type, {
                                x: originPosition.x,
                                y: originPosition.y + (spacer * i)
                            }, wave.speedController);
                        }
                        break;


                    default:
                        console.log("Error, no es reconeix el tipus de formació")
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
                state = "Running";
            }


            function setGameOver() {
                player.update();
                state = "GameOver";

                ui.hideMessage();
                ui.showGameOver();
                ui.fadeOut();
                assetManager.fadeOutAudio(2000); // Donem temps per que es produeixi la explosió
                setTimeout(function () {
                    assetManager.getMusic("game-over");
                }, 2000);

            };

            that.restart = function () {

                //this.gameOverAudio.pause();
                ui.hideGameOver();
                assetManager.fadeInAudio();

                player = playerConstructor(
                    {
                        pool: {
                            bullet: playerShotPool,
                            explosion: explosionPool
                        },
                        position: {x: 10, y: 256},
                        speedController: {x: 4, y: 4}
                    });

                currentLevel = 0;
                score = 0;
                state = "Running";

                //that.startLevel(currentLevel);

                enemyPool.clear();
                explosionPool.clear();
                enemyShotPool.clear();
                playerShotPool.clear();

                assetManager.resetMusic(levels[currentLevel].music);

                //this.backgroundAudio.currentTime = 0;
                ui.fadeIn();
                that.startLevel(currentLevel);

                //this.start();
            };

            /**
             * Aquesta funció esborra tot el canvas. Com que el nostre joc fa servir imatges a pantalla completa no
             * caldra al gameLoop però es pot fer servir per altres pantalles
             */
            that.clearScreen = function () {
                gameContext.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
            };

            return that;
        },


        /**
         * Crea les instancias dels gestors i controladors i inicia el joc.
         */
        init = function () {
            // Creem les instancies dels gestors i controlladors
            gameManager = gameManagerConstructor();
            assetManager = assetManagerConstructor(function (current, total) {
                //console.log("Downloaded asset: " + current + "/" + total);
            });

            // Iniciem el joc
            gameManager.init();
        },

        restart = function () {
            gameManager.restart();
        };


// Aquest son els mètodes de IOC_INVADERS que son accesibles desde el espai global
    return {
        start: init,

        restart: restart
    }
};




