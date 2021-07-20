import {getEntity} from "./entityRepository.js";

export class GameObjectPool {

    size = 0;
    pool = [];

    constructor(maxSize, generator, config) {
        this.size = maxSize;
        this.actives = maxSize;
        this.pool = [];

        for (let i = 0; i < this.size; i++) {
            this.pool[i] = new generator(config);
        }

    }

    disable(index) {
        this.pool[index].clear();
        this.pool.push((this.pool.splice(index, 1))[0]);
    }

    instantiate(type, position, speed) {
        let instance = this.pool[this.size - 1].start(getEntity(type, position, speed));
        this.pool.unshift(this.pool.pop());
        return instance;
    };


// function disable(index) {
//     that.pool[index].clear();
//     that.pool.push((that.pool.splice(index, 1))[0]);
// }

// that.actives = size;
//
// that.pool = [];
//
// for (let i = 0; i < size; i++) {
//     that.pool[i] = generator(config);
// }
//
// that.instantiate = function (type, position, speed) {
//     let instance = that.pool[size - 1].start(getEntity(type, position, speed));
//     that.pool.unshift(that.pool.pop());
//     return instance;
// };

    update(gametime) {
        for (let i = 0; i < this.size; i++) {
            // Només dibuixiem fins que trobem un objecte que no sigui viu
            if (this.pool[i].alive) {
                if (this.pool[i].update(gametime)) {
                    // Si update ha retornat cert es que s'ha de desactivar
                    this.disable(i);
                }
            } else {
                this.actives = i;
                break;
            }
        }
    };

    clear() {
        for (let i = 0; i < this.size; i++) {
            this.pool[i].alive = false;
        }
        this.actives = 0;
    };

}