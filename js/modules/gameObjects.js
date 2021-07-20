import {KEY_STATUS} from "./inputController.js";
import {getEntity} from "./entityRepository.js";
import * as assetManager from "./assetManager.js";

export class Background {
    layers = {};
    gameContext = null;

    constructor(gameContext) {
        this.gameContext = gameContext;
    }

    move(layer) {
        layer.position.x += layer.speed.x;
        layer.position.y += layer.speed.y;

        if (layer.position.x < -layer.image.width || layer.position.x > layer.image.width) {
            layer.position.x = 0;
        }

        if (layer.position.y < -layer.image.height || layer.position.y > layer.image.height) {
            layer.position.y = 0;
        }
    }

    render(layer) {
        // Imatge actual
        this.gameContext.drawImage(
            layer.image, layer.position.x, layer.position.y, layer.image.width, layer.image.height);

        // Següent imatge
        this.gameContext.drawImage(
            layer.image, layer.position.x + layer.image.width - 1,
            layer.position.y, layer.image.width, layer.image.height);
    }

    update() {
        for (let i = 0; i < this.layers.length; i++) {
            this.move(this.layers[i]);
            this.render(this.layers[i]);
        }
    };

    start(data) {
        this.layers = data.layers;

        for (let i = 0; i < this.layers.length; i++) {
            this.layers[i].image = assetManager.getImage(this.layers[i].id);
            this.layers[i].position = {x: 0, y: 0}
        }
    };
}

export class Sprite {
    frameIndex = 0;
    ticksPerFrame = 0;
    numberOfFrames = 1;
    image = null;
    width = 0;
    height = 0;
    loop = true;
    tickCount = 0;
    position = {x: 0, y: 0};
    size = {width: 0, height: 0};
    isDone = false;
    gameContext = null;

    constructor(gameContext, options) {
        this.gameContext = gameContext;
        this.frameIndex = 0;
        this.ticksPerFrame = options.ticksPerFrame || 0;
        this.numberOfFrames = options.numberOfFrames || 1;
        this.image = options.image;
        this.width = options.image.width;
        this.height = options.image.height;
        this.loop = options.loop === undefined ? true : options.loop;

        this.position = options.position || {x: 0, y: 0};
        this.size = {width: this.width / this.numberOfFrames, height: this.height};
    }

    update() {
        this.tickCount++;

        if (this.tickCount > this.ticksPerFrame) {
            this.tickCount = 0;

            if (this.frameIndex < this.numberOfFrames - 1) {
                this.frameIndex += 1;
            } else {
                this.isDone = !this.loop;
                this.frameIndex = 0;
            }
        }
    };

    render() {
        if (this.isDone) {
            return;
        }

        this.gameContext.drawImage(
            this.image,
            this.frameIndex * this.width / this.numberOfFrames,
            0,
            this.width / this.numberOfFrames,
            this.height,
            this.position.x,
            this.position.y,
            this.width / this.numberOfFrames,
            this.height);
    };
}

class GameObject {
    alive = false;
    type = null;
    position = null;
    sprite = null;
    extra = {};

    constructor(options) {
        // aqui no fem res amb les opcions
    }

    updateSprite() {
        this.sprite.position = this.position;
        this.sprite.update();
    };

    render() {
        this.sprite.render()
    };

    start(data) {
        console.error("Error: start. Aquest mètode no està implementat", this);
        return this;
    };

    update() {
        console.error("Error: update. Aquest mètode no està implementat", this);
    };

    clear() {
        console.error("Error: clear. Aquest mètode no està implementat", this);
    };
}

const MAX_TIME_OUTSIDE_BOUNDARIES = 180;// nombre de frames fora de la pantalla avans de esborrar-lo. a 60 FPS això equival a 3s

class MovingGameObject extends GameObject {
    isDestroyed = false;
    speed = null;
    outsideBoundariesTime = 0;
    gameWidth = 0;
    gameHeight = 0;

    constructor(options) {
        super(options);

        this.gameWidth = options.gameWidth;
        this.gameHeight = options.gameHeight;
    }

    move() {
        console.error("Error. Aquest mètode no està implementat");
    };

    isOutsideBoundaries() {
        if (this.position.x >= this.gameWidth
            || this.position.x <= -this.sprite.size.width
            || this.position.y > this.gameWidth
            || this.position.y < -this.sprite.size.height) {
            this.outsideBoundariesTime++;
        } else {
            this.outsideBoundariesTime = 0;
        }

        return this.outsideBoundariesTime >= MAX_TIME_OUTSIDE_BOUNDARIES;
    }

    isCollidingWith(gameObject) {
        return (this.position.x < gameObject.position.x + gameObject.sprite.size.width
            && this.position.x + this.sprite.size.width > gameObject.position.x
            && this.position.y < gameObject.position.y + gameObject.sprite.size.height
            && this.position.y + this.sprite.size.height > gameObject.position.y);
    }
}

export class Explosion extends GameObject {

    start(data) {
        this.alive = true;
        this.type = data.type;
        this.position = data.position;
        this.sprite = assetManager.getSprite(data.sprite);
        this.sprite.isDone = false;
        assetManager.getSound(data.sound);
        return this;
    };

    clear() {
        this.alive = false;
        this.type = null;
        this.position = {x: 0, y: 0};
        this.sprite = null;
    };

    update() {
        if (this.sprite.isDone) {
            return true;
        }
        this.updateSprite();
        this.render();
    };
}

export class Shot extends MovingGameObject {

    start = function (data) {
        this.alive = true;

        this.type = data.type;
        this.position = data.position;
        this.sprite = assetManager.getSprite(data.sprite);

        assetManager.getSound(data.sound);

        this.speed = data.speed;

        // Dades i Funcions especifiques de cada tipus de enemic
        this.extra = data.extra || {};
        this.move = data.move.bind(this);
        this.outsideBoundariesTime = 0;

        return this;
    };

    clear = function () {
        this.isDestroyed = false;
        this.alive = false;
        this.outsideBoundariesTime = 0;

        this.type = null;
        this.position = {x: 0, y: 0};
        this.sprite = null;

        this.speed = {x: 0, y: 0};

        // Dades i Funcions especifiques de cada tipus de enemic
        this.extra = {};
        this.move = null;
    };

    update = function () {

        if (this.isDestroyed) {
            return true;
        }

        this.updateSprite();

        this.move();

        if (this.checkBoundaries()) {
            return true;
        }

        this.render();
    };
}

export class Spaceship extends MovingGameObject {

    bulletPool = null;
    explosionPool = null;
    cannon = null;
    explosion = null;
    speed = {x: 0, y: 0};
    points = 0;

    constructor(options) {
        super(options);
        this.bulletPool = options.pool.bullet;
        this.explosionPool = options.pool.explosion;
    }

    // @protected
    fire() {
        for (let i = 0; i < this.cannon.length; i++) {
            this.shoot(this.cannon[i]);
        }
    };

    // @protected
    shoot(cannon) {
        let origin;

        if (Math.random() < cannon.fireRate / 100) {
            origin = {x: this.position.x + cannon.position.x, y: this.position.y + cannon.position.y};
            this.bulletPool.instantiate(cannon.bullet, origin, cannon.direction);
        }
    };

    start(data) {
        this.alive = true;

        this.type = data.type;
        this.position = data.position;
        this.sprite = assetManager.getSprite(data.sprite);
        this.cannon = data.cannon;
        this.explosion = data.explosion;

        this.speed = data.speed;
        this.points = data.points;

        this.outsideBoundariesTime = 0;

        // Dades i Funcions especifiques de cada tipus de enemic
        this.extra = data.extra || {};
        if (data.move) {
            this.move = data.move.bind(this);
        }

        return this;
    };

    clear() {
        this.isDestroyed = false;
        this.alive = false;

        this.type = null;
        this.position = {x: 0, y: 0};
        this.sprite = null;

        this.speed = {x: 0, y: 0};
        this.points = 0;
        this.cannon = null;

        // Dades i Funcions especifiques de cada tipus de enemic
        this.extra = null;
        this.move = null;
        this.outsideBoundariesTime = 0;
    };

    update() {

        if (this.isDestroyed) {
            this.explosionPool.instantiate(this.explosion, this.position);
            return true;
        }

        this.updateSprite();

        this.move();
        this.fire();

        if (this.isOutsideBoundaries()) {
            return true;
        }

        this.render();
    };
}

export class Player extends Spaceship {

    constructor(options) {
        super(options);
        this.start(getEntity('player', options.position, options.speed));
    }

    getInput() {

        if (KEY_STATUS.ArrowLeft) {
            this.position.x -= this.speed.x;

        } else if (KEY_STATUS.ArrowRight) {
            this.position.x += this.speed.x;

        }

        if (KEY_STATUS.ArrowUp) {
            this.position.y -= this.speed.y;

        } else if (KEY_STATUS.ArrowDown) {
            this.position.y += this.speed.y;
        }

        if (KEY_STATUS.Space && !this.isDestroyed) {
            this.fire();
        }

        // S'evita que surti de la pantalla
        this.position.x = this.position.x.clamp(0, this.gameWidth - this.sprite.size.width);
        this.position.y = this.position.y.clamp(0, this.gameHeight - this.sprite.size.height);
    }

    updateCannon() {
        for (let i = 0; i < this.cannon.length; i++) {
            if (this.cannon[i].lastShot === undefined) {
                this.cannon[i].lastShot = this.cannon[i].fireRate + 1;
            }
            this.cannon[i].lastShot++;
        }
    }

    shoot(cannon) {
        let origin;
        if (cannon.lastShot > cannon.fireRate) {
            cannon.lastShot = 0;
            origin = {x: this.position.x + cannon.position.x, y: this.position.y + cannon.position.y};
            this.bulletPool.instantiate(cannon.bullet, origin, cannon.direction);
        }
    };

    update() {
        this.updateCannon();

        // Si ha sigut impactat, s'elimina. Aquí també es podria afegir la animació de la explosió
        if (this.isDestroyed) {
            this.explosionPool.instantiate(this.explosion, this.position);
            return true;
        }

        this.getInput();
        this.updateSprite();
        this.render();
    };
}