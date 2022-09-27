"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemSystem = void 0;
const affix_1 = require("../affix");
const damage_types_1 = require("../misc/damage_types");
const item_1 = require("./item");
const empty_resists = new damage_types_1.Damage();
var ItemSystem;
(function (ItemSystem) {
    function size(item) {
        if (item.slot == 'weapon') {
            switch (item.weapon_tag) {
                case 'onehand':
                    return 1;
                case 'polearms':
                    return 2;
                case 'ranged':
                    return 1;
                case 'twohanded':
                    return 3;
            }
        }
        switch (item.slot) {
            case 'arms': return 1;
            case 'foot': return 1;
            case 'head': return 1;
            case 'legs': return 3;
            case 'body': return 5;
        }
        // return 1
    }
    ItemSystem.size = size;
    function create(item_desc) {
        let item = new item_1.Item(item_desc.durability, [], item_desc.slot, item_desc.range, item_desc.material, item_desc.weapon_tag, item_desc.model_tag, item_desc.resists, item_desc.damage);
        for (let aff of item_desc.affixes) {
            item.affixes.push(aff);
        }
        return item;
    }
    ItemSystem.create = create;
    function weight(item) {
        return item.material.density * size(item);
    }
    ItemSystem.weight = weight;
    function power(item) {
        if (item == undefined)
            return 0;
        let result = 0;
        for (let i = 0; i < item.affixes.length; i++) {
            let affix = item.affixes[i];
            let f = affix_1.get_power[affix.tag];
            if (f != undefined) {
                result = f(result);
            }
        }
        return result;
    }
    ItemSystem.power = power;
    function melee_damage(item, type) {
        // calculating base damage of item
        let damage = new damage_types_1.Damage();
        switch (type) {
            case 'blunt': {
                damage.blunt = ItemSystem.weight(item) * item.damage.blunt;
                break;
            }
            case 'pierce': {
                damage.pierce = ItemSystem.weight(item) * item.damage.pierce;
                break;
            }
            case 'slice': {
                damage.slice = ItemSystem.weight(item) * item.damage.slice;
                break;
            }
        }
        damage.fire = item.damage.fire;
        // summing up all affixes
        for (let i = 0; i < item.affixes.length; i++) {
            let affix = item.affixes[i];
            damage = affix_1.damage_affixes_effects[affix.tag](damage);
        }
        return damage;
    }
    ItemSystem.melee_damage = melee_damage;
    function ranged_damage(weapon) {
        const damage = new damage_types_1.Damage();
        if (weapon?.weapon_tag == 'ranged') {
            damage.pierce = 10;
            return damage;
        }
        damage.blunt = weight(weapon) * weapon.damage.blunt;
        damage.pierce = weight(weapon) * weapon.damage.pierce;
        damage.slice = weight(weapon) * weapon.damage.slice;
        return damage;
    }
    ItemSystem.ranged_damage = ranged_damage;
    function resists(item) {
        if (item == undefined) {
            return empty_resists;
        }
        let result = item.resists;
        for (let i = 0; i < item.affixes.length; i++) {
            let affix = item.affixes[i];
            let f = affix_1.protection_affixes_effects[affix.tag];
            if (f != undefined) {
                result = f(result);
            }
        }
        return result;
    }
    ItemSystem.resists = resists;
})(ItemSystem = exports.ItemSystem || (exports.ItemSystem = {}));
