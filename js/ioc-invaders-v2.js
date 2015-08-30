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
        alien = [],// TODO: només per proves

        enemiesRepository = (function () {
            var enemies = {},

                addEnemy = function (name, data) {
                    // Create sprite
                    var enemy = data;

                    console.log(data.sprite.id);
                    enemy.sprite = spriteConstructor({
                        context: gameContext,
                        image: assetManager.getAsset(data.sprite.id),
                        numberOfFrames: data.sprite.numberOfFrames,
                        ticksPerFrame: data.sprite.ticksPerFrame
                    });

                    enemy.move = strategiesRepository.get(data.move);


                    enemies[name] = enemy;
                    // TODO: Instanciar canó, fire();
                };


            return {
                add: function (enemy) {
                    if (Array.isArray(enemy)) {
                        for (var i = 0; i < enemy.length; i++) {
                            addEnemy(enemy[i].name, enemy[i].data);
                        }
                    } else {
                        addEnemy(enemy.name, enemy.data);
                    }

                },

                // Retorna un nou objecte amb les propietats originals més les mesclades
                get: function (name, position, speed) {


                    var enemy = enemies[name];
                    enemy.position = position;
                    enemy.speed = speed;

                    return enemy;
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

                //
                movement_pattern_c: function () { // TODO falta solucionar como se añaden los extras
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

                }


            };

            return {
                get: function (strategy) {
                    return strategies[strategy];
                }
            }

        }()),

        enemyConstructor = function (options) {
            var that = {},

                updateSprite = function () {
                    //that.sprite.position = {x: that.x, y: that.y};
                    that.sprite.position = that.position;
                    //that.sprite.x = that.x;
                    //that.sprite.y = that.y;
                    that.sprite.update();
                },

                render = function () {
                    that.sprite.render()
                },

                errorMessage = function () { //TODO: Reactivar
                    //console.error("Error, aquesta funció s'ha de passar a les dades del mètode spawn");
                },

                fire = errorMessage,

                move = errorMessage;

            //that.bulletPool = options.bulletPool;
            that.alive = false;

            that.spawn = function (data) {

                that.isColliding = false;
                that.alive = true;

                that.type = data.type;
                that.position = data.position;
                that.chanceToFire = data.chanceToFire;
                that.sprite = data.sprite;
                that.cannon = data.cannon;
                that.explosion = data.explosion;

                that.speed = data.speed;
                that.points = data.points; // al spawn

                // Dades i Funcions especifiques de cada tipus de enemic
                that.extra = data.extra || {};
                move = data.move.bind(that);
                //fire = data.fire.bind(that); TODO
            };

            that.clear = function () {
                that.isColliding = false;
                that.alive = false;

                that.type = null;
                that.position = {x: 0, y: 0};
                that.chanceToFire = 0;
                that.sprite = null;

                that.speed = {x: 0, y: 0};
                that.points = 0; // al spawn
                that.cannon = {};

                // Dades i Funcions especifiques de cada tipus de enemic
                that.extra = null;
                move = errorMessage;
                fire = errorMessage;

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

                // Sa ha sortit de la pantalla s'elimina
                if (this.position.x >= gameCanvas.width
                    || this.position.x <= -gameCanvas.width
                    || this.position.y > gameCanvas.height
                    || this.position.y < -gameCanvas.height) {
                    return true;
                }


                render();
            };


            return that;

        },


    ///////////////////////////////////////////////////////////

        spriteConstructor = function (options) {
            var that = {},
                frameIndex = 0,
                tickCount = 0,
                ticksPerFrame = options.ticksPerFrame || 0,
                numberOfFrames = options.numberOfFrames || 1,
                context = options.context,
                image = options.image,
                width = image.width,
                height = image.height;

            that.position = options.position || {x: 0, y: 0};
            that.size = {width: width / numberOfFrames, height: height};

            that.update = function () {

                tickCount += 1;

                if (tickCount > ticksPerFrame) {
                    tickCount = 0;

                    if (frameIndex < numberOfFrames - 1) {
                        frameIndex += 1;
                    } else {
                        frameIndex = 0;
                    }
                }
            };

            // TODO: En aquest projecte no el fem servir perqué només tenim un canvas i es redibuixa completament
            that.clear = function () {
                context.clearRect(that.position.x, that.position.y, that.size.width, that.size.height);
            };

            that.render = function () {

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
                initEnvironment = function (data) { // TODO: Esta puede ser privada, o ser sustituida por init
                    gameCanvas = document.getElementById(data.canvas.game);
                    gameContext = gameCanvas.getContext("2d");
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

                assetManager.downloadAll(that.populateEnemyRepository);

            };

            that.populateEnemyRepository = function () {
                that.loadData(config.enemy_data_url, function (data) {

                    console.log(data);
                    enemiesRepository.add(data);

                    that.start();
                })
            };


            that.start = function () {
                console.log("GameManager#start");

                alien[0] = enemyConstructor(
                    {bulletPool: null});
                alien[0].spawn(enemiesRepository.get('alien_a', {x: 900, y: 100}, {x: -2, y: -2}));


                alien[1] = enemyConstructor(
                    {bulletPool: null});
                alien[1].spawn(enemiesRepository.get('alien_b', {x: 900, y: 200}, {x: -2, y: 2}));

                alien[2] = enemyConstructor(
                    {bulletPool: null});
                alien[2].spawn(enemiesRepository.get('alien_c', {x: 900, y: 300}, {x: -2, y: 2}));


                gameLoop();

            };


            function gameLoop() { // TODO: eliminar després de les proves o canviar el nom a update <-- altre opció es fer que desde el gameLoop es cridint els diferents mètodes: Update(), DetectCollisions(), etc.

                //console.log("GameManager#gameLoop");
                window.requestAnimationFrame(gameLoop);


                that.clear(); // TODO: Això no cal fer-ho servir una vegada estiguin implementats els scrolls
                // update()
                // render()

                //background.update();
                for (var i = 0; i < alien.length; i++) {
                    alien[i].update();
                }


            }

            /**
             * Aquesta funció esborra tot el canvas. Com que el nostre joc fa servir imatges a pantalla completa no caldra
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


