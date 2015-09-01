// UTILITATS

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
    //console.log("Mida d'aquest array: ", this.length);
    for (var i in this) {
        if (this[i] == needle) return true;
    }
    return false;
};


/**
 * Aquest es el mòdul que contindrà el nostre joc. D'aquesta manera tot el nostre lloc resideix en aquest espai de noms
 * i no poluciona el entorn global.
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
                    // Create sprite
                    var entity = data;

                    entity.sprite = data.sprite;

                    if (data.move) {
                        entity.move = strategiesRepository.get(data.move);
                    }

                    entities[name] = entity;
                };


            return {
                add: function (enemy) {
                    if (Array.isArray(enemy)) {
                        for (var i = 0; i < enemy.length; i++) {
                            addEntity(enemy[i].name, enemy[i].data);
                        }
                    } else {
                        addEntity(enemy.name, enemy.data);
                    }

                },

                // Retorna un nou objecte amb les propietats originals més les mesclades
                get: function (name, position, speed) {
                    var entity = entities[name];
                    if (!entity) {
                        console.error("No se encuentra el enemigo: ", entity);
                    }
                    entity.position = position;
                    entity.speed = speed;

                    return entity;
                }
            }
        })(),

        strategiesRepository = (function () { //IIFE només exposa el mètode get, no cal constructor.
            var strategies = {
                movement_pattern_a: function () {
                    // Inicialització
                    if (!this.extra.ready) {
                        this.extra.speed = Math.max(Math.abs(this.speed.x), Math.abs(this.speed.y));
                        this.extra.leftEdge = this.position.x - 10 * this.extra.speed;
                        this.extra.rightEdge = this.position.x + 10 * this.extra.speed;
                        this.extra.topEdge = this.position.y + 10 * this.extra.speed;
                        this.extra.bottomEdge = this.position.y - 10 * this.extra.speed;
                        this.extra.direction = {x: this.speed.x <= 0 ? -1 : 1, y: 1};
                        this.extra.ready = true;
                    }

                    this.position.x += this.speed.x;
                    this.position.y += this.speed.y * this.extra.direction.y;


                    if (this.position.y > this.extra.topEdge || this.position.y < this.extra.bottomEdge) {
                        this.speed.x = this.extra.direction.x >= 0 ? this.extra.speed : -this.extra.speed;
                        this.speed.y = 0;
                        this.extra.direction.y = -this.extra.direction.y;
                    }

                    if (this.position.x <= this.extra.leftEdge) {
                        this.speed.x = 0;
                        this.speed.y = this.extra.speed;
                        this.extra.leftEdge = this.position.x - 10 * this.extra.speed;
                    } else if (this.position.x >= this.extra.rightEdge) {
                        this.speed.x = 0;
                        this.speed.y = this.extra.speed;
                        this.extra.rightEdge = this.position.x + 10 * this.extra.speed;
                    }

                    this.position.y = this.position.y.clamp(this.extra.bottomEdge, this.extra.topEdge);
                },

                movement_pattern_b: function () { // TODO falta solucionar como se añaden los extras
                    // Inicialització

                    this.position.x += this.speed.x;
                    this.position.y += this.speed.y;

                },

                movement_pattern_c: function () { // TODO identic a movement_pattern_d però amb sin
                    // Inicialització

                    if (!this.extra.ready) {
                        this.extra.age = 0;
                        this.extra.speed = Math.max(Math.abs(this.speed.x), Math.abs(this.speed.y));
                        this.extra.ready = true;
                        this.extra.vertical = this.speed.x > this.speed.y;
                    }

                    if (this.extra.direction === 1) {
                        this.speed.x = this.extra.speed * Math.sin(this.extra.age * Math.PI / 64);

                    } else {
                        this.speed.y = this.extra.speed * Math.sin(this.extra.age * Math.PI / 64);

                    }

                    this.extra.age++;
                    this.position.x += this.speed.x;
                    this.position.y += this.speed.y;

                },

                movement_pattern_d: function () { // TODO identic a movement_pattern_d però amb cos
                    // Inicialització

                    if (!this.extra.ready) {
                        this.extra.age = 0;
                        this.extra.speed = Math.max(Math.abs(this.speed.x), Math.abs(this.speed.y));
                        this.extra.ready = true;
                        this.extra.vertical = this.speed.x > this.speed.y;
                    }

                    if (this.extra.direction === 1) {
                        this.speed.x = this.extra.speed * Math.cos(this.extra.age * Math.PI / 64);

                    } else {
                        this.speed.y = this.extra.speed * Math.cos(this.extra.age * Math.PI / 64);

                    }

                    this.extra.age++;
                    this.position.x += this.speed.x;
                    this.position.y += this.speed.y;

                }

            };

            return {
                get: function (strategy) {
                    return strategies[strategy];
                }
            }

        }()),


        inputController = (function () {
            // TODO: Código para el InputController
            // The keycodes that will be mapped when a user presses a button.
            // Original code by Doug McInnes
            var KEY_CODES = {
                    32: 'space',
                    37: 'left',
                    38: 'up',
                    39: 'right',
                    40: 'down'
                },

            // Creates the array to hold the KEY_CODES and sets all their values
            // to false. Checking true/flase is the quickest way to check status
            // of a key press and which one was pressed when determining
            // when to move and which direction.
                KEY_STATUS = {};
            for (var code in KEY_CODES) {
                KEY_STATUS[KEY_CODES[code]] = false;
            }
            /**
             * Sets up the document to listen to onkeydown events (fired when
             * any key on the keyboard is pressed down). When a key is pressed,
             * it sets the appropriate direction to true to let us know which
             * key it was.
             */
            document.onkeydown = function (e) {
                // Firefox and opera use charCode instead of keyCode to
                // return which key was pressed.
                var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
                if (KEY_CODES[keyCode]) {
                    e.preventDefault();
                    KEY_STATUS[KEY_CODES[keyCode]] = true;
                }
            };
            /**
             * Sets up the document to listen to ownkeyup events (fired when
             * any key on the keyboard is released). When a key is released,
             * it sets teh appropriate direction to false to let us know which
             * key it was.
             */
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


        explosionConstructor = function (options) {
            var that = {},
            //soundPool = options.pools.sound,

            // TODO: Redundante, en spaceshipConstructor es idéntico, la excepción es que esto no tiene el método fire(); <-- gameObject podría ser un objecto con todo esto privado
                updateSprite = function () {
                    that.sprite.position = that.position;
                    that.sprite.update();
                },

                render = function () {
                    that.sprite.render()
                };


            that.alive = false;

            that.start = function (data) {
                that.alive = true;
                that.type = data.type;
                that.position = data.position;
                that.sprite = assetManager.getSprite(data.sprite);
                that.sprite.isDone = false;
                //soundPool.get(that.sound) // TODO sound, s'ha de reproduir-se aqui mateix!
                return that;
            };

            that.clear = function () {
                that.alive = false;
                that.type = null;
                that.position = {x: 0, y: 0};
                that.sprite = null;
            };

            /**
             * TODO: Aquesta funció es practicament identica a la de spaceshipConstructor.
             *
             * @returns {boolean} Cert si aquest enemic s'ha d'eliminar
             */
            that.update = function () {


                // Si la animació ha finalitzat aturem la explosió
                if (that.sprite.isDone) {
                    return true;
                }
                updateSprite();
                render();
            };


            return that;

        },

        shotConstructor = function (options) {
            var that = {},
                errorMessage = function () {
                    console.error("Error, aquesta funció s'ha de passar a les dades del mètode start");
                };

            //soundPool = options.pools.sound,

            // TODO: Redundante, en spaceshipConstructor es idéntico, la excepción es que esto no tiene el método fire(); <-- gameObject podría ser un objecto con todo esto privado

            that.render = function () {
                that.sprite.render()
            };


            that.updateSprite = function () {
                that.sprite.position = that.position;
                that.sprite.update();
            };

            that.move = errorMessage;


            that.alive = false;

            that.start = function (data) {
                that.isColliding = false;
                that.alive = true;

                that.type = data.type;
                that.position = data.position;
                that.sprite = assetManager.getSprite(data.sprite);
                //that.sprite = assetManager.getSprite(data.sprite);;
                //soundPool.get(data.sound);// TODO sound, ha de reproduir-se aqui mateix!

                that.speed = data.speed;

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

                that.speed = {x: 0, y: 0};

                // Dades i Funcions especifiques de cada tipus de enemic
                that.extra = null;
                that.move = errorMessage;

            };

            /**
             * TODO: Aquesta funció es practicament identica a la de spaceshipConstructor.
             *
             * @returns {boolean} Cert si aquest enemic s'ha d'eliminar
             */
            that.update = function () {

                // Si ha sigut impactat, s'elimina. Aquí també es podria afegir la animació de la explosió
                if (that.isColliding) {
                    return true;
                }

                that.updateSprite();

                that.move();


                // TODO codi repetit a spaceshipConstrutor, canviar per altre solució
                // Si ha sortit de la pantalla durant massa temps s'elimina.
                if (that.checkBoundaries()) {
                    return true;
                }

                that.render();
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

        playerConstructor = function (options) {
            var that = spaceshipConstructor(options);

            that.start(entitiesRepository.get('player', options.position, options.speed)); // TODO la posició inicial

            that.shot = function (cannon) {
                var origin;

                if (that.lastShot > cannon.fireRate) {
                    that.lastShot = 0;
                    origin = {x: that.position.x + cannon.position.x, y: that.position.y + cannon.position.y};
                    that.bulletPool.instantiate(cannon.bullet, origin, cannon.direction);
                }

            };

            that.lastShot = 0;


            that.getInput = function () {
                if (inputController.KEY_STATUS.left) {
                    that.position.x -= that.speed.x;

                } else if (inputController.KEY_STATUS.right) {
                    that.position.x += that.speed.x;

                }

                if (inputController.KEY_STATUS.up) {
                    that.position.y -= that.speed.y;

                } else if (inputController.KEY_STATUS.down) {
                    that.position.y += that.speed.y;
                }

                if (inputController.KEY_STATUS.space && !that.isColliding) {
                    this.fire();
                }

                // Evitem que surti de la pantalla
                this.position.x = this.position.x.clamp(0, gameCanvas.width - this.sprite.size.width);
                this.position.y = this.position.y.clamp(0, gameCanvas.height - this.sprite.size.height);

            };


            // Sobrescrivim aquesta funció
            that.update = function () {
                that.lastShot++;

                // Si ha sigut impactat, s'elimina. Aquí també es podria afegir la animació de la explosió
                if (this.isColliding) {
                    that.explosionPool.instantiate('player_explosion', that.position); // TODO canviar pel punt central del sprite
                    return true;
                }

                this.getInput();
                this.updateSprite();
                this.render();
            };

            return that;
        },

        spaceshipConstructor = function (options) {
            var that = {},

                errorMessage = function () {
                    console.error("Error, aquesta funció s'ha de passar a les dades del mètode start");
                };

            that.move = errorMessage;

            that.updateSprite = function () {
                that.sprite.position = that.position;
                that.sprite.update();

            };

            that.render = function () {
                that.sprite.render()
            };

            that.bulletPool = options.pool.bullet;
            that.explosionPool = options.pool.explosion;

            that.fire = function () { // @protected
                if (Array.isArray(that.cannon)) {
                    for (var i = 0; i < that.cannon.length; i++) {
                        that.shot(that.cannon[i]);
                    }
                } else if (that.cannon) {
                    that.shot(that.cannon);

                }
            };

            that.shot = function (cannon) { // @protected
                var origin;

                if (Math.random() < cannon.fireRate / 100) {
                    origin = {x: that.position.x + cannon.position.x, y: that.position.y + cannon.position.y};
                    that.bulletPool.instantiate(cannon.bullet, origin, cannon.direction);
                }
            };

            that.alive = false;

            that.start = function (data) {

                that.isColliding = false;
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
                that.isColliding = false;
                that.alive = false;

                that.type = null;
                that.position = {x: 0, y: 0};
                that.sprite = null;

                that.speed = {x: 0, y: 0};
                that.points = 0;
                that.cannon = null;

                // Dades i Funcions especifiques de cada tipus de enemic
                that.extra = null;
                that.move = errorMessage;
                that.outsideBoundariesTime = 0;

            };

            /**
             *
             * @returns {boolean} Cert si aquest enemic s'ha d'eliminar
             */
            that.update = function () {

                // Si ha sigut impactat, s'elimina. Aquí també es podria afegir la animació de la explosió
                if (that.isColliding) {
                    that.explosionPool.instantiate('enemy_explosion', that.position); // TODO canviar pel punt central del sprite
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

        backgroundConstructor = function () {
            var that = {},
                layers = {},

                move = function (layer) {
                    layer.position.x += layer.speed.x * that.speed.value;
                    layer.position.y += layer.speed.y * that.speed.value;

                    if (layer.position.x < -layer.image.width || layer.position.x > layer.image.width) {
                        layer.position.x = 0;
                    }

                    if (layer.position.y < -layer.image.height || layer.position.y > layer.image.height) {
                        layer.position.y = 0;
                    }

                },

                render = function (layer) {

                    gameContext.drawImage(
                        layer.image, layer.position.x, layer.position.y, layer.image.width, layer.image.height);

                    // Segons la direcció dibuixem pantalles extres a les posicions necessaries
                    if (layer.speed.x * that.speed.value < 0) {
                        gameContext.drawImage(
                            layer.image, layer.position.x + layer.image.width,
                            layer.position.y, layer.image.width, layer.image.height);
                    }

                    if (layer.speed.x * that.speed.value > 0) {
                        gameContext.drawImage(
                            layer.image, layer.position.x - layer.image.width,
                            layer.position.y, layer.image.width, layer.image.height);
                    }

                    if (layer.speed.y * that.speed.value < 0) {
                        gameContext.drawImage(
                            layer.image, layer.position.x, layer.position.y + layer.image.height,
                            layer.image.width, layer.image.height);
                    }

                    if (layer.speed.y * that.speed.value > 0) {
                        gameContext.drawImage(
                            layer.image, layer.position.x,
                            layer.position.y - layer.image.height, layer.image.width, layer.image.height);
                    }

                };


            that.update = function () {
                that.speed.update();
                for (var i = 0; i < layers.length; i++) {
                    move(layers[i]);
                    render(layers[i]);
                }

            };


            that.start = function (data) {
                layers = data.layers;

                that.speed.value = data.speed.start;
                that.speed.target = data.speed.target;

                for (var i = 0; i < layers.length; i++) {
                    layers[i].image = assetManager.getAsset(layers[i].id);
                    layers[i].position = {x: 0, y: 0}
                }
            };

            that.speed = {
                value: 0,
                target: 0,
                acceleration: 0.01,

                reset: function () {
                    that.speed.value = 0;
                    that.speed.target = 0;
                    that.speed.acceleration = 0.002;
                },

                update: function () {
                    if (this.value < this.target) {
                        this.value += this.acceleration;
                    } else if (this.value > this.target) {
                        this.value -= this.acceleration;
                    }
                }

            };

            that.clear = function () {
                layers = {};
                that.speed.reset();
            };


            return that;
        },

    // TODO: Els sprites han de ser reversibles, la meitat dels frames per  quan es mou a la dreta i la altre mitat per la esquerra
        spriteConstructor = function (options) {
            //console.log(options);
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

                // TODO: Cercar una altre manera de fer-ho, això es necessari per actualitzar només 1 vegada per frame els sprites
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
            //that.clear = function () {
            //    context.clearRect(that.position.x, that.position.y, that.size.width, that.size.height);
            //};

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
                downloadQueue = [],
                spritesQueue = [],
                cache = {
                    images: {},
                    sprites: {}
                },
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


            that.downloadAll = function (callback, args) {
                var i, j;

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
                            callback(args);
                        }
                    }, false);
                    img.addEventListener("error", function () {
                        errorCount += 1;
                        updateProgress();
                        if (that.isDone()) {
                            callback(args);
                        }
                    }, false);
                    img.src = path;
                    cache.images[id] = img;
                }

                // A continuació generem els sprites;
                for (i = 0; i < spritesQueue.length; i++) {

                    var sprite = {
                        id: spritesQueue[i].id,
                        sprite: [],
                        actives: []
                    };

                    var poolSize = spritesQueue[i].numberOfFrames * spritesQueue[i].ticksPerFrame;

                    for (j = 0; j < poolSize; j++) {
                        sprite.sprite.push(spriteConstructor({
                                image: that.getAsset(spritesQueue[i].id),
                                numberOfFrames: spritesQueue[i].numberOfFrames,
                                ticksPerFrame: spritesQueue[i].ticksPerFrame,
                                loop: spritesQueue[i].loop === undefined ? true : spritesQueue[i].loop
                            }
                        ));
                    }

                    cache.sprites[sprite.id] = sprite;
                }
            };


            that.isDone = function () {
                return (downloadQueue.length == successCount + errorCount);
            };

            that.getAsset = function (id) {
                return cache.images[id];
            };

            that.getSprite = function (id) {
                var sprites = cache.sprites[id].sprite;
                var older = sprites[0];

                for (var i = 0; i < sprites.length; i++) {
                    if (sprites[i].tickCount === 0) {
                        return sprites[i];
                    } else {
                        if (sprites[i].lastTick < older.lastTick) {
                            older = sprites[i];
                        }

                    }
                }
                return older;
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
                soundPool,

                background,

                player,
            //gameOver,

                state,// "GameOver", "LoadingNextLevel"


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
                        activesText = document.getElementById('actives'),
                        messageText = document.getElementById('messages');

                    return {
                        update: function () {
                            scoreText.innerHTML = score;
                            distanceText.innerHTML = distance;
                            activesText.innerHTML = enemyPool.actives;
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

                        transitionScreen: function (callback, time) {
                            time = time || 2000;
                            gameCanvas.style.opacity = 0;

                            setTimeout(function () {
                                gameCanvas.style.opacity = 1;
                                callback();
                            }, time);
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
                var httpRequest;

                if (window.XMLHttpRequest) {// codi per IE7+, Firefox, Chrome, Opera, Safari
                    httpRequest = new XMLHttpRequest();
                } else { // codi for IE6, IE5
                    httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
                }

                httpRequest.open("GET", url, true);
                httpRequest.send(null);

                httpRequest.onreadystatechange = function () {
                    if (httpRequest.readyState === 4 && httpRequest.status === 200) {
                        // Hem rebut la resposta correctament
                        var data = JSON.parse(httpRequest.responseText);
                        callback(data);
                    } else if (httpRequest.readyState === 4) {
                        console.error("Error al carregar les dades del joc");
                    }
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


                //player = playerConstructor(
                //    {
                //        pool: {
                //            bullet: playerShotPool,
                //            explosion: explosionPool
                //        },
                //        position: {x: 10, y: 256},
                //        speed: {x: 3, y: 3}
                //    });

                //player = entitiesRepository.get('player', {x: 10, y: 256}, {x: 0, y: 0});

                //console.log(player);

                //enemyPool.instantiate('alien_a', {x: 900, y: 100}, {x: -2, y: -2});
                //enemyPool.instantiate('alien_b', {x: 900, y: 200}, {x: -2, y: 0});
                //enemyPool.instantiate('alien_c', {x: 900, y: 300}, {x: -2, y: -2});
                //enemyPool.instantiate('alien_d', {x: 900, y: 400}, {x: 0, y: -2});
                //
                //playerShotPool.instantiate('plasma_shot_1', {x: 10, y: 100}, {x: 1, y: 0});
                //playerShotPool.instantiate('plasma_shot_2', {x: 10, y: 150}, {x: 1.5, y: 0});
                //playerShotPool.instantiate('plasma_shot_3', {x: 10, y: 200}, {x: 2.5, y: 0});
                //playerShotPool.instantiate('plasma_shot_4', {x: 10, y: 250}, {x: 3, y: 0});
                //playerShotPool.instantiate('plasma_shot_5', {x: 10, y: 300}, {x: 3.5, y: 0});
                //playerShotPool.instantiate('hot_plasma_shot', {x: 10, y: 350}, {x: 2.5, y: 0});
                //
                //explosionPool.instantiate('enemy_explosion', {x: 400, y: 400}, {x: 0, y: 0});
                //explosionPool.instantiate('player_explosion', {x: 450, y: 400}, {x: 0, y: 0});

                //player = playerConstructor(
                //    {
                //        pool: {
                //            bullet: playerShotPool,
                //            explosion: explosionPool
                //        },
                //        position: {x: 10, y: 256},
                //        speed: {x: 3, y: 3}
                //    });
                //
                //currentLevel = 0;
                //score = 0;
                //gameOver = false;
                //
                //that.startLevel(currentLevel);

                that.restart();
                gameLoop(); // TODO esto debe ser update()

            };

            that.startLevel = function (level) {
                // TODO mostrar missatge de benvinguda
                var message = levels[level].name
                    + "<p><span>"
                    + levels[level].description
                    + "</span></p>";
                ui.showMessage(message, 3000);

                background.start(levels[level].background);
                levelEnded = false;
                nextWave = 0;
                distance = 0;
            };


            function gameLoop() { // TODO: eliminar després de les proves o canviar el nom a update <-- altre opció es fer que desde el gameLoop es cridint els diferents mètodes: Update(), DetectCollisions(), etc.
                window.requestAnimationFrame(gameLoop);

                gametime = Date.now();
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


                // jugador amb bonus TODO: tipus de bonus, arma 1, arma 2, punts extra, o velocitat
            };

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
                enemyPool.instantiate(enemy.type, enemy.position, enemy.speed);
            }

            function spawnFormation(wave) {
                switch (wave.formation.type) {
                    case "columns":

                        // TODO aquestes variables s'han de poder eliminar en la seva major part. COMPTE: s'ha de crear una nova posició per cada objecte que instanciem o es canvien totes a l'hora.
                        var originPosition = {x: wave.position.x, y: wave.position.y};
                        var spacer = wave.formation.spacer;
                        var nextColumn = originPosition.y + wave.formation.column_height;
                        var amount = wave.formation.amount;
                        var currentPosition = {x: wave.position.x, y: wave.position.y};


                        for (var i = 0; i < amount; i++) {

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

                    default:
                        console.log("Error, no es reconeix el tipus de formació")
                }

            }

            function setEndLevel() {
                //that.clearScreen();

                currentLevel++;

                if (currentLevel >= levels.length) {
                    //console.log("Enhorabona, has completat tots els nivells, tornem a començar!")
                    currentLevel = 0;
                }

                player.position = {x: 10, y: 256};
                player.speed = {x: 3, y: 3};

                enemyPool.clear();
                explosionPool.clear();
                enemyShotPool.clear();
                playerShotPool.clear();
                // TODO: les explosions també?

                that.startLevel(currentLevel); // TODO com que ja som dins del loop del joc no cal tornar a cridar-lo
                state = "Running";
            }


            function setGameOver() {
                player.update(); // TODO Un últim update per activar la explosió
                state = "GameOver";

                //this.backgroundAudio.pause();
                //this.gameOverAudio.currentTime = 0; // No hace falta porqué no es un loop
                //this.gameOverAudio.play();
                ui.hideMessage();
                ui.showGameOver();
                ui.fadeOut();


            }

            that.restart = function () {

                //this.gameOverAudio.pause();
                ui.hideGameOver();

                player = playerConstructor(
                    {
                        pool: {
                            bullet: playerShotPool,
                            explosion: explosionPool
                        },
                        position: {x: 10, y: 256},
                        speed: {x: 3, y: 3}
                    });

                currentLevel = 0;
                score = 0;
                state = "Running"

                //that.startLevel(currentLevel);

                enemyPool.clear();
                explosionPool.clear();
                enemyShotPool.clear();
                playerShotPool.clear();
                // TODO: les explosions també?

                //that.startLevel(currentLevel); // TODO com que ja som dins del loop del joc no cal tornar a cridar-lo

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




