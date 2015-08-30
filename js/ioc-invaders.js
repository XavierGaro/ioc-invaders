// Esta será una clase estática
// TODO para que esta clase sea reutilizable el canvas hay que pasarlo y los datos de las imagenes hay que pasarlas desde fuera, es decir el parallax manager no se instancia automáticamente como ahora, se crea la clase y se instancia pasandole un canvas y un array con los datos a extraer

// Añadimos el método clamp al prototipo de Number
Number.prototype.clamp = function (min, max) {
    return Math.min(Math.max(this, min), max);
};


// Esta clase se encarga de gestionar el scroll parallax. El orden en que se pasan las capas determina cual está en el fondo y la velocidad relativa respecto al resto

var ParallaxManager = function (canvas, layers) {
    this.layers = [];
    this.canvas = document.getElementById(canvas); // TODO: Esto debe pasarse como argumento del constructor
    this.context = this.canvas.getContext("2d");

    // @private creamos el draweable y le añadimos el método draw personalizado, en ES2015 sustituir por subclase
    this.generateParallaxLayer = function (src, speed) {
        var layer = new Drawable(src, speed, 0, 0, this.canvas.width, this.canvas.height);
        layer.context = this.context;
        //layer.setSize(this.canvas.width, this.canvas.height);

        // @override
        layer.draw = function () {
            // start panning the image if auto is true
            this.x -= this.speed;

            this.context.drawImage(this.image, this.x, this.y, this.width, this.height);
            // "draw" a duplicate image the right of the original image
            this.context.drawImage(this.image, this.x + this.width, this.y, this.width, this.height);
            // if the image is scrolled off the screen it will be reset in its original position
            if (this.x <= 0 - this.width)
                this.x = 0;

        };

        return layer;

    };

    // @public, llamado desde el update()
    this.draw = function () {
        for (var i = 0; i < this.layers.length; i++) {
            this.layers[i].draw();
        }
    };

    // Inicialización
    for (var i = 0; i < layers.length; i++) {
        var layer = this.generateParallaxLayer(layers[i], i + 1); // Tiene que ser +1 porqué si no la capa del fondo queda fija
        this.layers.push(layer);

    }


};


// Clase abstracta de la que heredaran el resto de drawables
var Drawable = function (src, speed, x, y, width, height) {
    this.image = new Image();
    this.image.src = src;
    this.speed = speed || 0;
    this.x = x || 0;
    this.y = y || 0;
    this.width = width || this.image.width;
    this.height = height || this.image.height;
    this.collidableWith = "";
    this.type = "";
    this.isColliding = false;

    // @abstract, a implementar en las subclases
    this.draw = function () {
    };

    this.dirtyClear = function () {
        //this.context.clearRect(this.x - 1, this.y - 1, this.width + 2, this.height + 2);
    };

    this.move = function () {
    };

};


// NUEVO

/** Custom Pool object. Holds Bullet objects to be managed to prevent garbage collection. */
// TODO, a este objeto habría que pasarle por argumento el objeto a construir en lugar de incluir los generadores
function Pool(maxSize, canvas, sprite) {
    var size = maxSize; // Max bullets allowed in the playerBulletPool
    var pool = [];
    this.canvas = document.getElementById(canvas); // TODO: Esto debe pasarse como argumento del constructor
    this.context = this.canvas.getContext("2d");
    this.actives = size; // Por defecto suponemos que estan todos activos, cosa que es desmentida en cuanto se hace el primer recorrido


    // TODO: Esto debe llamarse automáticamente desde el constuctor
    this.init = function (type, bulletPool) {

        if (type.lastIndexOf('bullet', 0) === 0) { // Como en el caso de enemigos engloba todos los tipos de bullets
            for (var i = 0; i < size; i++) {
                // Initialize the bullet object
                // Esto es una subclase de drawable.

                pool[i] = this.generateBullet(sprite, type);
            }
        } else if (type.lastIndexOf('enemy', 0) === 0) { // Esta comparación nos permite añadir diferentes clases de enemigos, por ejemplo enemy_a, enemy_b, etc.
            for (var i = 0; i < size; i++) {
                // Initialize the enemy object
                // Esto es una subclase de drawable.
                pool[i] = this.generateEnemy(sprite, type, bulletPool);
            }
        }
    };

    /**
     * create the enemy ship object
     * @param src
     * @param type
     */
    this.generateEnemy = function (src, type, pool) {
        // TODO: Los enemigos deberian tener también unas coordenadas para lo que sería el cañon, que es el punto de origen
        // de las balas
        // Bala: punto de origen, dirección, sprite a utilizar

        var enemy = new Drawable(src);
        enemy.type = type;
        enemy.bulletPool = pool;
        enemy.percentFire = 1 / 500;
        enemy.alive = false;
        enemy.direction = 1; // Hacia abajo

        enemy.canvas = this.canvas;
        enemy.context = this.context;


        // Sets the Enemy values
        enemy.spawn = function (x, y, speed) {
            this.x = x;
            this.y = y;
            this.speed = speed;
            this.speedX = 0;
            this.speedY = speed;
            this.alive = true;

            this.leftEdge = this.x - 30;
            this.rightEdge = this.x + 30;
            this.topEdge = this.y + 40;
            this.bottomEdge = this.y - 40;

        };

        /**
         * Move the enemy
         */
        enemy.draw = function () {

            if (this.isColliding) {
                gameManager.playerScore += 10;
                gameManager.explosion.get();
                return true;
            } else if (this.x >= this.canvas.width
                || this.x <= -this.width
                || this.y > this.canvas.height
                || this.y < -this.canvas.height) {
                return true;
            }
            //this.context.clearRect(this.x - 1, this.y - 1, this.width + 2, this.height + 2);

            this.x += this.speedX;
            this.y += this.speedY * this.direction;


            if (this.y >= this.topEdge || this.y <= this.bottomEdge) {
                this.speedX = -this.speed;
                this.speedY = 0;
                this.direction = -this.direction;
            }

            if (this.x <= this.leftEdge) {
                this.speedX = 0;
                this.speedY = this.speed;
                this.leftEdge = this.x - 30;
                //console.log("Vamos a la arriba");
            }


            this.context.drawImage(this.image, this.x, this.y);

            // Enemy has a chance to shot every movement
            var chance = Math.random();
            if (chance < this.percentFire) {
                this.fire();
            }
        };
        /**
         * Fires a bullet
         */
        enemy.fire = function () {
            // TODO: Estos disparos salen de debajo de la nave y tienen que salir de su izquierda
            this.bulletPool.get(this.x - 10, this.y + this.height / 2, -2.5);

        };

        enemy.dirtyClear = function () {
            this.x = 0;
            this.y = 0;
            this.speed = 0;
            this.speedX = 0;
            this.speedY = 0;
            this.direction = 1;
            this.alive = false;
            this.isColliding = false;
        };

        return enemy;
    };


    this.generateBullet = function (src, type) {
        var bullet = new Drawable(src);
        // Is true if the bullet is currently in use
        bullet.alive = false;
        bullet.type = type;

        /** Sets the bullet values */
        bullet.spawn = function (x, y, speed) {
            this.x = x;
            this.y = y;
            this.speed = speed;
            this.alive = true;  // TODO Cambiar alive por active
        };

        bullet.canvas = this.canvas;
        bullet.context = this.context;

        /**
         * Uses a "dirty rectangle" to erase the bullet and moves it.
         * returns true if the bullet moved off the screen, indicating that the bullet is ready to be cleared by the
         * playerBulletPool, otherwise draws the bullet
         */
        bullet.draw = function () {
            //this.context.clearRect(this.x - 1, this.y - 1, this.width + 2, this.height + 2);
            this.x += this.speed;

            if (this.isColliding || (bullet.type === 'bullet_player' && this.x >= this.canvas.width + this.width)
                || (bullet.type === 'bullet_enemy' && this.x <= -this.width)) {
                return true;

            } else {
                this.context.drawImage(this.image, this.x, this.y);
            }
        };

        bullet.dirtyClear = function () {
            this.x = 0;
            this.y = 0;
            this.speed = 0;
            this.alive = false;
            this.isColliding = false;
        };

        return bullet;
    };


    /** Grabs the last item in the list, initializes it and pushes it to the front of the array. */
    this.get = function (x, y, speed) {

        if (!pool[size - 1].alive) {
            pool[size - 1].spawn(x, y, speed);
            pool.unshift(pool.pop());
        }
    };

    this.animate = function () {
        document.getElementById('score').innerHTML = gameManager.playerScore;


        // Primero hacemos el dirtyClear
        for (var i = 0; i < size; i++) {
            if (pool[i].alive) {
                pool[i].dirtyClear()
            } else {
                this.actives = i;
                break;
            }
        }

        // luego dibujamos
        for (var i = 0; i < size; i++) {
            // Only draw until we find a bullet that is not alive
            if (pool[i].alive) {
                if (pool[i].draw()) {
                    this.disable(i);
                    //pool[i].dirtyClear();
                    //pool.push((pool.splice(i, 1))[0]);
                }
            } else {
                break;
            }
        }
    };

    this.disable = function (i) {
        pool[i].dirtyClear();
        pool.push((pool.splice(i, 1))[0]);
    };


    this.detectCollisions = function (collider) {

        if (collider instanceof Pool) {
            //console.log(collider);
            for (var i = 0; i < size; i++) {
                if (pool[i].alive) {
                    if (collider.detectCollisions(pool[i])) {
                        return true;
                    }

                } else {
                    //console.log("No está en el pool");
                    return false;
                }
            }


        } else {
            for (var i = 0; i < size; i++) {
                if (pool[i].alive) {
                    if (this.checkCollision(collider, pool[i])) {

                        collider.isColliding = true;
                        pool[i].isColliding = true;
                        return true;
                    }

                } else {
                    //console.log("No está en el pool");
                    return false;
                }
            }


        }
        return false;

    };

    this.checkCollision = function (object1, object2) {
        return (object1.x < object2.x + object2.width && object1.x + object1.width > object2.x &&
        object1.y < object2.y + object2.height && object1.y + object1.height > object2.y);
    };

    // TODO en nuestra versión no lo necesitamos, al refactorizar puede que tampoco haga falta porqué pool será una propiedad
    this.getPool = function () {
        return pool;
    }
}

// Clase para el jugador
/** Create the Ship object that the player controls. The ship is drawn on the "ship" canvas and uses dirty rectangles
 * to move around the Screen.
 * Subclase de Drawable
 * */
var generateShip = function (src, canvas, pool) {

    var ship = new Drawable(src);
    ship.canvas = document.getElementById(canvas); // TODO: Esto debe pasarse como argumento del constructor
    ship.context = ship.canvas.getContext("2d");

    ship.speed = 3;

    ship.bulletPool = pool;
    ship.bulletPool.init('bullet_player'); // TODO esto debe llamarse desde el constructor
    ship.fireRate = 15;
    ship.counter = 0;
    ship.draw = function () {
        ship.context.drawImage(this.image, this.x, this.y);

    };


    // TODO Toda la funcionalidad de moverse y disparar debe ejectuarse desde el motor de juego y no el drawable
    ship.move = function () {
        ship.counter++;

        // Determine if the action is move action
        if (KEY_STATUS.left || KEY_STATUS.right || KEY_STATUS.down || KEY_STATUS.up) {
            // The ship moved, so erase it's current image os ti can be redraw in it's new position.

            //ship.context.clearRect(ship.x - 1, ship.y - 1, ship.width + 2, ship.height + 2);

            if (KEY_STATUS.left) {
                ship.x -= ship.speed;

            } else if (KEY_STATUS.right) {
                ship.x += ship.speed;

            }

            if (KEY_STATUS.up) {
                ship.y -= ship.speed;

            } else if (KEY_STATUS.down) {
                ship.y += ship.speed;
            }

        }

        if (KEY_STATUS.space && ship.counter >= ship.fireRate && !this.isColliding) {
            ship.fire();
            ship.counter = 0;
        }


        // TODO ajustar el this.x y this.y añadiendo el método clamp() a Number.prototype
        ship.x = ship.x.clamp(0, this.canvas.width - this.width);
        ship.y = ship.y.clamp(0, this.canvas.height - this.height);

        // Finish redrawing the ship
        if (!this.isColliding) {
            ship.draw();
        }

    };

    ship.fire = function () {
        this.bulletPool.get(this.x + 16, this.y + 5, 10, 'bullet_player');
        gameManager.laser.get();
    };
    return ship;

};

// TODO: Código para el InputController
// The keycodes that will be mapped when a user presses a button.
// Original code by Doug McInnes
KEY_CODES = {
    32: 'space',
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down',
}

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
}
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
}


// Configuración del juego
//var gameConfig = {
//    canvas: {
//        background: "background",
//        main: "main",
//        player: "ship"
//    },
//    layers: [
//        "assets/images/layer1.png",
//        "assets/images/layer2.png",
//        "assets/images/layer3.png",
//        "assets/images/layer4.png"],
//    poolSize: {
//        bullets_player: 30,
//        bullets_enemies: 50,
//        enemies: 30
//    },
//    sprites: {
//        spaceship: "assets/images/spaceship.png",
//        bullet_player: "assets/images/blast.png",
//        bullet_enemy: "assets/images/enemy_blast.png",
//        enemy: "assets/images/alien_a.png"
//    }
//
//};

var GameManager = function (config) {
    // TODO: Separar la inicialización?
    //this.parallaxManager = new ParallaxManager(config.canvas.background, config.layers);
    //this.playerBulletPool = new Pool(config.poolSize.bullets_player, config.canvas.main, config.sprites.bullet_player);
    //this.ship = generateShip(config.sprites.spaceship, config.canvas.player, this.playerBulletPool);



    // Inicialización del juego, aquí se pueden añadir otros valores como el número de vidas inicial, reinicialización de las posiciones, vaciado de los pools de enemigos y balas, etc.
    this.start = function () {


        this.parallaxManager = new ParallaxManager(config.canvas.background, config.layers);
        this.playerBulletPool = new Pool(config.poolSize.bullets_player, config.canvas.main, config.sprites.bullet_player);
        this.ship = generateShip(config.sprites.spaceship, config.canvas.player, this.playerBulletPool);


        this.playerScore = 0;
        this.currentWave = 1;


        // Posición inicial de la nave
        this.ship.x = this.ship.width / 2;
        this.ship.y = (this.ship.canvas.height - this.ship.height) / 2;

        // Initialize the enemy enemy pools

        this.enemyBulletPool = new Pool(config.poolSize.bullets_enemies, config.canvas.main, config.sprites.bullet_enemy);
        this.enemyBulletPool.init('bullet_enemy');


        this.enemyPool = new Pool(config.poolSize.enemies, config.canvas.main, config.sprites.enemy);
        this.enemyPool.init('enemy', this.enemyBulletPool);
        // Oleada inicial
        this.spawnWave(this.currentWave);


        // TODO: Las dimensiones hay que obtenerlas del sprite. Como esto es solo para organizar la formación podemos
        // usar otro método, por ejemplo calculando según el tamaño del canvas


        // Audio files
        this.laser = new SoundPool(10);
        this.laser.init("laser");
        this.explosion = new SoundPool(20);
        this.explosion.init("explosion");
        this.backgroundAudio = new Audio("assets/sounds/POL-rocketman-short.mp3");
        this.backgroundAudio.loop = true;
        this.backgroundAudio.volume = .25;
        this.backgroundAudio.load(); // TODO esto parece que es solo para navegadores más antiguos
        this.gameOverAudio = new Audio("assets/sounds/game-over.mp3");
        this.gameOverAudio.loop = false;
        this.gameOverAudio.volume = .25;
        this.gameOverAudio.load();

        //this.checkAudio = window.setInterval(function() {checkReadyState()}, 1000);




        // Iniciamos la música
        this.backgroundAudio.play();

        this.update();
        this.ship.draw();
    };

    /**
     * Ensure the game sound has loaded before starting the game
     * TODO: Al igual que la carga de imagenes seguramente para estos ejemplos no hace falta ya que se ejecutan en local
     */
    //function checkReadyState() {
    //    if (gameManager.gameOverAudio.readyState === 4 && gameManager.backgroundAudio.readyState ===4) {
    //        window.clearInterval(game.checkAudio);
    //        gameManager.start();
    //    }
    //}

    this.spawning = false;

    // Wave corresponde al número de la oleada
    this.spawnWave = function (wave) {

        this.spawning = true;
        console.log("Wave " + wave);


        var height = this.ship.canvas.height - 30;
        var width = this.ship.canvas.width - 50;
        var maxPerCol = Math.min(wave, 6);
        var x = width - 30, y = 0;
        var spacer = 50;

        for (var i = 1; i <= wave; i++) {
            y += height / (maxPerCol + 1 );
            this.enemyPool.get(x, y, 1);


            if (i % maxPerCol === 0) {
                x -= spacer;
                y = 0;
            }

        }
        this.enemyBulletPool.actives = wave;

        this.spawning = false;
    };

    // Llamada a draw a todos los componentes
    // Game Loop
    this.update = function () {



        this.detectCollisions();


        // Si la última wave está muerta creamos una nueva TODO buscar otro lugar más apropiado, donde se incremente la puntuación por ejemplo
        if (this.enemyPool.actives === 0 && !this.spawning) {
            this.spawnWave(++this.currentWave);
        }

        // Animate game objects

        if (!gameManager.ship.isColliding) { // TODO lo que habría que hacer si está colisionando es quitar una vida y después comprobar si es game over
            requestAnimationFrame(function () {
                this.update();
            }.bind(this));

            // TODO primero habría que hacer todos los clears de los objetos del pool y después el draw para evitar que se borren los trozos de bala debajo de las naves

            this.parallaxManager.draw();
            this.ship.move();
            this.playerBulletPool.animate();

            this.enemyBulletPool.animate();


            this.enemyPool.animate();

        } else {
            this.gameOver();
        }



    };

    this.detectCollisions = function () {

        // Comprobamos si albuna bala del jugador ha impactado al enemigo
        this.playerBulletPool.detectCollisions(this.enemyPool);

        // Comprobamos si alguna bala enemiga ha impactado al jugador
        this.enemyBulletPool.detectCollisions(this.ship);

        // Comprobamos si algún enemigo ha impactado al jugador
        this.enemyPool.detectCollisions(this.ship);

    };


    this.gameOver = function() {
        this.backgroundAudio.pause();
        //this.gameOverAudio.currentTime = 0; // No hace falta porqué no es un loop
        this.gameOverAudio.play();
        document.getElementById('game-over').style.display = "block";


    };

    this.restart = function() {

        this.gameOverAudio.pause();
        document.getElementById('game-over').style.display = "none";

        var shipCanvas = document.getElementById(config.canvas.player); // TODO: Esto debe pasarse como argumento del constructor
        var shipContext = shipCanvas.getContext("2d");

        var bgCanvas = document.getElementById(config.canvas.background); // TODO: Esto debe pasarse como argumento del constructor
        var bgContext = bgCanvas.getContext("2d");

        var mainCanvas = document.getElementById(config.canvas.main); // TODO: Esto debe pasarse como argumento del constructor
        var mainContext = mainCanvas.getContext("2d");


        this.backgroundAudio.currentTime = 0;
        this.start();
    }
};


function SoundPool(maxSize) {
    var size = maxSize;
    var pool = [];
    this.pool = pool;
    var currSound = 0;

    /*
     * Populates the pool array with the given sound
     */

    this.init = function (object) {
        if (object == "laser") {
            for (var i = 0; i < size; i++) {
                // Initialize the sound
                var laser = new Audio("assets/sounds/shoot.mp3");
                laser.volume = .12;
                laser.load(); // TODO esto parece que es solo para navegadores más antiguos
                pool[i] = laser;

            }
        } else if (object == "explosion") {
            for (var i = 0; i < size; i++) {
                var explosion = new Audio("assets/sounds/explosion.mp3");
                explosion.volume = .25;
                explosion.load();// TODO esto parece que es solo para navegadores más antiguos
                pool[i] = explosion;
            }
        }
    };

    /* Plays a sound */
    this.get = function () {
        if (pool[currSound].currentTime == 0 || pool[currSound].ended) {
            pool[currSound].play();
        }
        currSound = (currSound + 1) % size;
    }
}



// Aquí se inicia el juego. TODO: pasar la ruta de configuración al constructor y que la carga se haga desde ahí

var gameManager;

(function() {
    var httpRequest;

    if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari
        httpRequest=new XMLHttpRequest();
    }

    else{ // code for IE6, IE5
        httpRequest=new ActiveXObject("Microsoft.XMLHTTP");
    }

    httpRequest.open("GET","game-config.json",true);
    httpRequest.send(null);

    httpRequest.onreadystatechange = function() {
        if (httpRequest.readyState === 4) {
        // everything is good, the response is received
            if (httpRequest.status === 200) {
                // perfect!

                var config = JSON.parse(httpRequest.responseText);
                gameManager = new GameManager(config);
                gameManager.start();
            } else {
                console.error("Error al cargar la configuración del juego");
                // there was a problem with the request,
                // for example the response may contain a 404 (Not Found)
                // or 500 (Internal Server Error) response code
            }

        } else {
            // still not ready
        }

    };


// TODO: Extraer la funcionalidad de los drawables que no sea estrictamente dibujarse y crear una factoría par obtenerlos DrawableFactory

})();


