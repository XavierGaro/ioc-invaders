let strategies = {

    movement_pattern_a: function () {

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

    movement_pattern_b: function () {

        this.position.x += this.speed.x;
        this.position.y += this.speed.y;

    },

    movement_pattern_c: function () {

        if (!this.extra.ready) {
            this.extra.age = 0;
            this.extra.speed = Math.max(Math.abs(this.speed.x), Math.abs(this.speed.y));
            this.extra.ready = true;
            this.extra.vertical = this.speed.x > this.speed.y;
        }

        if (this.extra.direction === 1) {
            this.speed.x = this.extra.speed * Math.cos(-this.extra.age * Math.PI / 64);

        } else {
            this.speed.y = this.extra.speed * Math.sin(this.extra.age * Math.PI / 64);

        }

        this.extra.age++;
        this.position.x += this.speed.x;
        this.position.y += this.speed.y;

    },

    movement_pattern_d: function () {

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

export function getStrategy(strategy) {
    return strategies[strategy];
}

