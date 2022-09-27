"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cell = void 0;
const system_js_1 = require("../base_game_classes/character/system.js");
class Cell {
    constructor(id, x, y, name, development, res) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.name = name;
        this.visited_recently = false;
        this.last_visit = 0;
        this.orders_bulk = new Set();
        this.orders_item = new Set();
        this.characters_set = new Set();
        if (development == undefined) {
            this.development = { rural: 0, urban: 0, wild: 0, ruins: 0, wastelands: 0 };
        }
        else {
            this.development = development;
        }
        if (res == undefined) {
            this.resources = { water: false, prey: false, forest: false, fish: false };
        }
        else {
            this.resources = res;
        }
    }
    get_characters_list() {
        let result = [];
        for (let item of this.characters_set.values()) {
            let character = system_js_1.CharacterSystem.id_to_character(item);
            let return_item = { id: item, name: character.name };
            result.push(return_item);
        }
        return result;
    }
    get_characters_id_set() {
        return this.characters_set;
    }
    get_actions() {
        let actions = {
            hunt: false,
            rest: false,
            clean: false
        };
        actions.hunt = this.can_hunt();
        actions.clean = this.can_clean();
        actions.rest = this.can_rest();
        return actions;
    }
    can_clean() {
        return (this.resources.water);
    }
    can_hunt() {
        return ((this.development.wild > 0) || (this.resources.prey));
    }
    can_rest() {
        return (this.development.urban > 0);
    }
    get_item_market() {
        return undefined;
    }
    get_market() {
        return undefined;
    }
    visit() {
        this.visited_recently = true;
        this.last_visit = 0;
    }
    async update(dt) {
        if (this.visited_recently) {
            this.last_visit += dt;
            if (this.last_visit > 10) {
                this.visited_recently = false;
                this.last_visit = 0;
            }
        }
    }
}
exports.Cell = Cell;
