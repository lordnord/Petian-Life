module.exports = {
    item_base_damage: {
        sword: (result) => {
            result.damage = {blunt: 5, pierce: 10, slice: 20, fire: 0}
            return result
        },
        empty: (result) => {
            result.damage = {blunt: 3, pierce: 1, slice: 1, fire: 0}
            return result
        },
        fist: (result) => {
            result.damage = {blunt: 10, pierce: 1, slice: 1, fire: 0};
            return result
        }
    },

    item_base_resists : {
        empty: (resists) => {
            return resists
        },
        rat_leather_armour: (resists) => {
            resists.pierce += 3;
            resists.slice += 3;
            return resists;
        },
        rat_fur_cap: (resists) => {
            resists.pierce += 1;
            resists.slice += 1;
            return resists;
        },
        rat_leather_leggins: (resists) => {
            resists.pierce += 2;
            resists.slice += 2;
            return resists;
        }
    },

    damage_affixes_effects: {
        sharp: (result, tier) => {
            result.damage.pierce += tier * 5;
            result.damage.slice += tier * 5
            return result
        },
        heavy: (result, tier) => {
            result.damage.blunt += tier * 5;
            return result
        },
        hot: (result, tier) => {
            result.damage.fire += tier * 10
            return result
        }
    },

    protection_affixes_effects: {
        thick: (resists, tier) => {
            resists.pierce += tier * 3;
            resists.slice += tier * 3;
            return resists;
        },
        power_battery: (resists, tier) => {
            return resists
        }
    },

    get_power: {
        power_battery: (data, tier) => {
            data += tier
            return data
        }
    },

    slots: {
        sword: 'right_hand',
        rat_leather_armour: 'body',
        rat_fur_cap: 'head',
        rat_leather_leggins: 'legs',
    },

    loot_chance_weight: {
        sword: 1000,
        rat_leather_armour: 1000,
        rat_fur_cap: 1000,
        rat_leather_leggins: 1000
    },

    loot_affixes_weight: {
        sword: {
            sharp: 6,
            heavy: 10,
            hot: 3,
            power_battery: 1
        },
        rat_leather_armour: {
            thick: 2,
            power_battery: 1
        },
        rat_fur_cap: {
            thick: 2,
            power_battery: 1
        },
        rat_leather_leggins: {
            thick: 2,
            power_battery: 1
        }
    }
}