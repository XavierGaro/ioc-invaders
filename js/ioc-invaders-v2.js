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
        alien, // TODO: només per proves


        spriteConstructor = function (options) {
            var that = {},
                frameIndex = 0,
                tickCount = 0,
                ticksPerFrame = options.ticksPerFrame || 0,
                numberOfFrames = options.numberOfFrames || 1,
                context = options.context,
                image = options.image;

            that.width = image.width;
            that.height = image.height;
            that.x = options.x || 0;
            that.y = options.y || 0;

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

            that.dirtyClear = function () {
                context.clearRect(that.x, that.y, that.width, that.height);
            };

            that.render = function () {

                context.drawImage(
                    image,
                    frameIndex * that.width / numberOfFrames,
                    0,
                    that.width / numberOfFrames,
                    that.height,
                    that.x,
                    that.y,
                    that.width / numberOfFrames,
                    that.height);
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

            that.downloadAll = function (downloadCallback) {
                if (downloadQueue.length === 0) {
                    downloadCallback();
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
                            downloadCallback();
                        }
                    }, false);
                    img.addEventListener("error", function () {
                        errorCount += 1;
                        updateProgress();
                        if (that.isDone()) {
                            downloadCallback();
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
            var that = {};

            that.init = function () {
                console.log("GameManager#init");
                // Iniciem el joc indicant la url des de on es descarregaran les dades del joc.

                that.loadData(that.initEnvironment);
            };

            that.initEnvironment = function (data) {
                gameCanvas = document.getElementById(data.canvas.game);
                gameContext = gameCanvas.getContext("2d");

                that.loadAssets(data.assets);
            };

            that.loadData = function (callback) {
                console.log("GameManager#loadData", config.game_data_url);

                var httpRequest;

                if (window.XMLHttpRequest) {// codi per IE7+, Firefox, Chrome, Opera, Safari
                    httpRequest = new XMLHttpRequest();
                } else { // codi for IE6, IE5
                    httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
                }

                httpRequest.open("GET", config.game_data_url, true);
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

                //assetManager.queueDownload('assets/images/alien_sprite_a.png');


                assetManager.downloadAll(that.start);

            };

            that.start = function () {
                console.log("GameManager#start");


                var alienImage = assetManager.getAsset('enemy');

                // Create sprite
                alien = spriteConstructor({
                    context: gameContext, // Esto debe obtenerse
                    image: alienImage, // Esto debe ser la ruta de la imagen? NO
                    numberOfFrames: 6,
                    ticksPerFrame: 4
                });

                gameLoop();
            };


            function gameLoop() { // TODO: eliminar després de les proves o canviar el nom a update <-- altre opció es fer que desde el gameLoop es cridint els diferents mètodes: Update(), DetectCollisions(), etc.
                console.log("GameManager#gameLoop");
                window.requestAnimationFrame(gameLoop);


                // dirtyClear()
                // update()
                // render()

                alien.update();
                alien.dirtyClear();
                alien.render();


            }

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

