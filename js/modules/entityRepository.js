import {getStrategy} from "./strategiesRepository.js";

let entities = {};

function add(name, data) {
    let entity = data;

    if (data.move) {
        entity.move = getStrategy(data.move);
    }

    entities[name] = entity;
}

export function addEntity(entity) {
    if (Array.isArray(entity)) {
        for (let i = 0; i < entity.length; i++) {
            add(entity[i].name, entity[i].data);
        }
    } else {
        add(entity.name, entity.data);
    }

}

// Retorna un nou objecte amb les propietats originals més les mesclades
export function getEntity(name, position, speed) {
    let entity = entities[name];
    if (!entity) {
        console.error("No es troba la entitat: ", entity);
    }
    entity.position = position;
    entity.speed = speed;

    return entity;
}