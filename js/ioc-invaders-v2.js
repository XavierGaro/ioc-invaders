// UTILITATS

/**
 * Aquesta utilitat afegeix el mètode clamp a la superclasse Number. El que fa es afegir el métode clamp a tots els
 * nombres de manera que podem encaixonar-lo dins d'uns limits. En cas de que el nombre sigui menor que el mínim el
 * valor retornat es aquest mínim, i en cas de que sigui superior al màxim el valor retornat es el màxim.
 *
 * @param {number} min valor mínim
 * @param {number} max valor máxim
 * @returns {number} El nombre si està dins del limit o el valor corresponent al limit
 */
Number.prototype.clamp = function (min, max) {
    return Math.min(Math.max(this, min), max);
};


/**
 * Aquest es el mòdul que contindrà el nostre joc. D'aquesta manera tot el nostre lloc resideix en aquest espai de noms
 * i no poluciona el entorn global.
 */
var IOC_INVADERS = function (config) {
    var gameManager,
        assetManager,

        gameCanvas,
        gameContext,

        entitiesRepository = (function () {
            var enemies = {},

                addEntity = function (name, data) {
                    // Create sprite
                    var enemy = data;

                    console.log(data.sprite.id);
                    enemy.sprite = spriteConstructor({
                        context: gameContext,
                        image: assetManager.getAsset(data.sprite.id),
                        numberOfFrames: data.sprite.numberOfFrames,
                        ticksPerFrame: data.sprite.ticksPerFrame,
                        loop: data.sprite.loop
                    });

                    enemy.move = strategiesRepository.get(data.move);


                    enemies[name] = enemy;
                    // TODO: Instanciar canó, fire();
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
                    var entity = enemies[name];
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

        poolConstructor = function (maxSize, generator, config) {
            var that = {},
                size = maxSize,
                pool = [],
                disable = function (index) {
                    //console.log("disabling " + index);
                    pool[index].clear();
                    pool.push((pool.splice(index, 1))[0]);
                };

            that.actives = size;

            for (var i = 0; i < size; i++) {

                pool[i] = generator(config);
            }

            that.instantiate = function (type, position, speed) {
                var instance = pool[size - 1].start(entitiesRepository.get(type, position, speed));
                pool.unshift(pool.pop());
                return instance;
            };

            that.update = function () {
                for (var i = 0; i < size; i++) {
                    // Només dibuixiem fins que trobem un objecte que no sigui viu
                    if (pool[i].alive) {
                        if (pool[i].update()) {
                            // Si update ha retornat cert es que s'ha de desactivar
                            disable(i);
                        }
                    } else {
                        that.actives = i;
                        break;
                    }
                }
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
                that.sprite = data.sprite;
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
            //soundPool = options.pools.sound,

            // TODO: Redundante, en spaceshipConstructor es idéntico, la excepción es que esto no tiene el método fire(); <-- gameObject podría ser un objecto con todo esto privado
                updateSprite = function () {
                    that.sprite.position = that.position;
                    that.sprite.update();
                },

                render = function () {
                    that.sprite.render()
                },

                errorMessage = function () {
                    console.error("Error, aquesta funció s'ha de passar a les dades del mètode start");
                },

                move = errorMessage;


            that.alive = false;

            that.start = function (data) {
                that.isColliding = false;
                that.alive = true;

                that.type = data.type;
                that.position = data.position;
                that.sprite = data.sprite;
                //soundPool.get(data.sound);// TODO sound, ha de reproduir-se aqui mateix!

                that.speed = data.speed;

                // Dades i Funcions especifiques de cada tipus de enemic
                that.extra = data.extra || {};
                move = data.move.bind(that);

                return that;
            };

            that.clear = function () {
                that.isColliding = false;
                that.alive = false;

                that.type = null;
                that.position = {x: 0, y: 0};
                that.sprite = null;

                that.speed = {x: 0, y: 0};

                // Dades i Funcions especifiques de cada tipus de enemic
                that.extra = null;
                move = errorMessage;

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

                updateSprite();

                move();

                // Sa ha sortit de la pantalla s'elimina. Deixem 1 pantalla de marge per poder fer el desplegament fora de la pantalla
                if (this.position.x >= gameCanvas.width * 2
                    || this.position.x <= -gameCanvas.width
                    || this.position.y > gameCanvas.height * 2
                    || this.position.y < -gameCanvas.height) {
                    return true;
                }

                render();
            };


            return that;
        },


        spaceshipConstructor = function (options) {
            var that = {},

                updateSprite = function () {
                    that.sprite.position = that.position;
                    that.sprite.update();
                },

                render = function () {
                    that.sprite.render()
                },

                errorMessage = function () { //TODO: Reactivar
                    //console.error("Error, aquesta funció s'ha de passar a les dades del mètode start");
                },

                fire = function () {
                    if (Array.isArray(that.cannon)) {

                        for (var i = 0; i < that.cannon.length; i++) {
                            shot(that.cannon[i]);
                        }
                    } else if (that.cannon) {
                        shot(that.cannon);

                    }
                },

                shot = function (cannon) {
                    var origin = {x: that.position.x + cannon.position.x, y: that.position.y + cannon.position.y}
                    that.bulletPool.instantiate(cannon.bullet, origin, cannon.direction);
                },

                move = errorMessage;

            that.bulletPool = options.pool.bullet;
            //console.log(options.bulletPool, that.bulletPool);
            //alert("Stop");

            that.alive = false;

            that.start = function (data) {

                that.isColliding = false;
                that.alive = true;

                that.type = data.type;
                that.position = data.position;
                that.chanceToFire = data.chanceToFire;
                that.sprite = data.sprite;
                that.cannon = data.cannon;
                that.explosion = data.explosion;

                that.speed = data.speed;
                that.points = data.points; // al start

                // Dades i Funcions especifiques de cada tipus de enemic
                that.extra = data.extra || {};
                move = data.move.bind(that);
                //fire = data.fire.bind(that); TODO
                return that;
            };

            that.clear = function () {
                that.isColliding = false;
                that.alive = false;

                that.type = null;
                that.position = {x: 0, y: 0};
                that.chanceToFire = 0;
                that.sprite = null;

                that.speed = {x: 0, y: 0};
                that.points = 0;
                that.cannon = {};

                // Dades i Funcions especifiques de cada tipus de enemic
                that.extra = null;
                move = errorMessage;

            };

            /**
             *
             * @returns {boolean} Cert si aquest enemic s'ha d'eliminar
             */
            that.update = function () {

                // Si ha sigut impactat, s'elimina. Aquí també es podria afegir la animació de la explosió
                if (that.isColliding) {
                    that.explosion.get();
                    return true;
                }

                updateSprite();

                if (Math.random() < that.chanceToFire) {
                    fire();
                }

                move();

                // Sa ha sortit de la pantalla s'elimina. Deixem 1 pantalla de marge per poder fer el desplegament fora de la pantalla
                if (this.position.x >= gameCanvas.width * 2
                    || this.position.x <= -gameCanvas.width
                    || this.position.y > gameCanvas.height * 2
                    || this.position.y < -gameCanvas.height) {
                    return true;
                }


                render();
            };

            return that;

        },

        backgroundConstructor = function (options) {
            var that = {},
                layers = {},
                context = options.context,
                canvas = options.canvas,

                move = function(layer) {
                    layer.position.x += layer.speed.x;
                    layer.position.y += layer.speed.y;

                    if (layer.position.x<-layer.image.width || layer.position.x>layer.image.width) {
                        layer.position.x = 0;
                    }

                    if (layer.position.y<-layer.image.height || layer.position.y>layer.image.height) {
                        layer.position.y = 0;
                    }



                },

                render = function (layer) {

                    context.drawImage(
                        layer.image, layer.position.x, layer.position.y, layer.image.width, layer.image.height);

                    // Segons la direcció dibuixem pantalles extres a les posicions necessaries
                    if (layer.speed.x < 0) {
                        context.drawImage(
                            layer.image, layer.position.x + layer.image.width,
                            layer.position.y, layer.image.width, layer.image.height);
                    }

                    if (layer.speed.x > 0) {
                        context.drawImage(
                            layer.image, layer.position.x - layer.image.width,
                            layer.position.y, layer.image.width, layer.image.height);
                    }

                    if (layer.speed.y < 0) {
                        context.drawImage(
                            layer.image, layer.position.x, layer.position.y + layer.image.height,
                            layer.image.width, layer.image.height);
                    }

                    if (layer.speed.y > 0) {
                        context.drawImage(
                            layer.image, layer.position.x,
                            layer.position.y - layer.image.height, layer.image.width, layer.image.height);
                    }

                };

            that.update = function () {
                for (var i = 0; i < layers.length; i++) {
                    move(layers[i]);
                    render(layers[i]);
                }

            };


            that.start = function (data) {
                layers = data.layers;
                console.log(layers);

                for (var i = 0; i < layers.length; i++) {
                    layers[i].position = {x: 0, y: 0}
                }
            };

            that.clear = function () {
                layers = {};
            };

            return that;
        },

    // TODO: Els sprites han de ser reversibles, la meitat dels frames per  quan es mou a la dreta i la altre mitat per la esquerra
        spriteConstructor = function (options) {
            var that = {},
                frameIndex = 0,
                tickCount = 0,
                ticksPerFrame = options.ticksPerFrame || 0,
                numberOfFrames = options.numberOfFrames || 1,
                context = options.context,
                image = options.image,
                width = image.width,
                height = image.height,
                loop = options.loop === undefined ? true : options.loop;


            that.position = options.position || {x: 0, y: 0};
            that.size = {width: width / numberOfFrames, height: height};
            that.isDone = false;

            that.update = function () {

                tickCount += 1;

                if (tickCount > ticksPerFrame) {
                    tickCount = 0;

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

                context.drawImage(
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

        assetManagerConstructor = function (progressCallback) {
            var that = {},
                successCount = 0,
                errorCount = 0,
                downloadQueue = [],
                cache = {},
                updateProgress = function () {
                    if (progressCallback) {
                        progressCallback(successCount + errorCount, downloadQueue.length);
                    }
                };


            that.queueDownload = function (asset) {
                downloadQueue.push(asset);
            };

            that.downloadAll = function (callback) {
                if (downloadQueue.length === 0) {
                    callback();
                }

                for (var i = 0; i < downloadQueue.length; i++) {
                    console.log(downloadQueue[i]);
                    var path = downloadQueue[i].path,
                        id = downloadQueue[i].id,
                        img = new Image();

                    img.addEventListener("load", function () {
                        successCount += 1;
                        updateProgress();
                        if (that.isDone()) {
                            callback();
                        }
                    }, false);
                    img.addEventListener("error", function () {
                        errorCount += 1;
                        updateProgress();
                        if (that.isDone()) {
                            callback();
                        }
                    }, false);
                    img.src = path;
                    cache[id] = img;

                }
            };

            that.isDone = function () {
                return (downloadQueue.length == successCount + errorCount);
            };

            that.getAsset = function (id) {
                return cache[id];
            };

            return that;
        },


        gameManagerConstructor = function () {
            var that = {},

                enemyPool,
                enemyShotPool,
                playerShotPool,
                explosionPool,
                soundPool,

                background,

                initEnvironment = function (data) { // TODO: Esta puede ser privada, o ser sustituida por init
                    gameCanvas = document.getElementById(data.canvas.game);
                    gameContext = gameCanvas.getContext("2d");


                    enemyShotPool = poolConstructor(500, shotConstructor);
                    enemyPool = poolConstructor(100, spaceshipConstructor, {
                        pool: {
                            bullet: enemyShotPool,
                            explosion: explosionPool
                        }
                    });

                    playerShotPool = poolConstructor(100, shotConstructor/*, {pool: {sound: soundPool}}*/);
                    explosionPool = poolConstructor(100, explosionConstructor/*, {pool: {sound: soundPool}}*/);
                    //soundPool =  poolConstructor(100, explosionConstructor);

                    that.loadAssets(data.assets);


                };


            that.init = function () {
                console.log("GameManager#init");
                // Iniciem el joc indicant la url des de on es descarregaran les dades del joc.

                that.loadData(config.game_data_url, initEnvironment);

            };


            that.loadData = function (url, callback) {
                console.log("GameManager#loadData", url);

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
                console.log("GameManager#loadAssets", assets);

                for (var i = 0; i < assets.length; i++) {
                    assetManager.queueDownload(assets[i]);
                }

                assetManager.downloadAll(that.loadEnemiesData);

            };

            that.loadEnemiesData = function () {
                that.loadData(config.entity_data_url, function (data) {
                    console.log(data);
                    entitiesRepository.add(data);
                    that.loadLevelsData();
                })
            };

            that.loadLevelsData = function () {
                //that.loadData(config.levels_data_url, function (data) {
                //    console.log(data);


                background = backgroundConstructor({
                    context: gameContext,
                    canvas: gameCanvas // TODO sembla innecessari
                });

                background.start(
                    {
                        layers: [
                            {
                                image: assetManager.getAsset('bg_layer_1'),
                                speed: {x: 1, y: 0}
                            },
                            {
                                image: assetManager.getAsset('bg_layer_2'),
                                speed: {x: 2, y: 0}
                            },
                            {
                                image: assetManager.getAsset('bg_layer_3'),
                                speed: {x: 4, y: 0}
                            },
                            {
                                image: assetManager.getAsset('bg_layer_4'),
                                speed: {x: 8, y: 0}
                            }
                        ]
                    });


                that.start();
                //});
            };


            that.start = function () {
                console.log("GameManager#start");

                enemyPool.instantiate('alien_a', {x: 900, y: 100}, {x: -2, y: -2});
                enemyPool.instantiate('alien_b', {x: 900, y: 200}, {x: -2, y: 0});
                enemyPool.instantiate('alien_c', {x: 900, y: 300}, {x: -2, y: -2});
                enemyPool.instantiate('alien_d', {x: 900, y: 400}, {x: 0, y: -2});

                playerShotPool.instantiate('plasma_shot_1', {x: 10, y: 100}, {x: 1, y: 0});
                playerShotPool.instantiate('plasma_shot_2', {x: 10, y: 150}, {x: 1.5, y: 0});
                playerShotPool.instantiate('plasma_shot_3', {x: 10, y: 200}, {x: 2.5, y: 0});
                playerShotPool.instantiate('plasma_shot_4', {x: 10, y: 250}, {x: 3, y: 0});
                playerShotPool.instantiate('plasma_shot_5', {x: 10, y: 300}, {x: 3.5, y: 0});
                playerShotPool.instantiate('hot_plasma_shot', {x: 10, y: 350}, {x: 2.5, y: 0});

                explosionPool.instantiate('enemy_explosion', {x: 400, y: 400}, {x: 0, y: 0});
                explosionPool.instantiate('player_explosion', {x: 450, y: 400}, {x: 0, y: 0});

                gameLoop();

            };


            function gameLoop() { // TODO: eliminar després de les proves o canviar el nom a update <-- altre opció es fer que desde el gameLoop es cridint els diferents mètodes: Update(), DetectCollisions(), etc.

                //console.log("GameManager#gameLoop");
                window.requestAnimationFrame(gameLoop);


                //that.clear(); // TODO: Això no cal fer-ho servir una vegada estiguin implementats els scrolls
                // update()
                // render()

                background.update();
                enemyPool.update();
                enemyShotPool.update();
                playerShotPool.update();
                explosionPool.update();


            }

            /**
             * Aquesta funció esborra tot el canvas. Com que el nostre joc fa servir imatges a pantalla completa no
             * caldra al gameLoop però es pot fer servir per altres pantalles
             */
            that.clear = function () {
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
                console.log("Downloaded asset: " + current + "/" + total);
            });


            // Iniciem el joc
            gameManager.init();
        };


// Aquest son els mètodes de IOC_INVADERS que son accesibles desde el espai global
    return {
        start: init
    }
};



