"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Item = void 0;
class Item {
    constructor(durability, affixes, model_tag) {
        this.durability = durability;
        this.affixes = affixes;
        this.model_tag = model_tag;
    }
    // tag():string {
    //     return this.model_tag
    // }
    json() {
        return {
            durability: this.durability,
            affixes: this.affixes,
            // slot: this.slot,
            // material: this.material,
            // weapon_tag: this.weapon_tag,
            model_tag: this.model_tag,
            // range: BaseRange[this.model_tag],
            // resists: this.resists,
            // damage: this.damage
        };
    }
}
exports.Item = Item;
