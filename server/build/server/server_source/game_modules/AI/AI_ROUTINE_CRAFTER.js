"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crafter_routine = void 0;
const ammunition_1 = require("../craft/ammunition");
const cooking_1 = require("../craft/cooking");
const materials_manager_1 = require("../manager_classes/materials_manager");
const AI_ROUTINE_GENERIC_1 = require("./AI_ROUTINE_GENERIC");
const AI_SCRIPTED_VALUES_1 = require("./AI_SCRIPTED_VALUES");
const AIactions_1 = require("./AIactions");
function crafter_routine(character) {
    if (character.in_battle())
        return;
    if (character.action != undefined)
        return;
    if (character.is_player())
        return;
    if (character.current_building != undefined)
        return;
    (0, AI_ROUTINE_GENERIC_1.GenericRest)(character);
    if ((character.skills.cooking > 40) || (character.perks.meat_master == true)) {
        AIactions_1.AIactions.craft_bulk(character, cooking_1.Cooking.meat);
    }
    if ((character.skills.woodwork > 40) && (character.perks.fletcher == true)) {
        AIactions_1.AIactions.craft_bulk(character, ammunition_1.AmmunitionCraft.bone_arrow);
    }
    if ((character.perks.alchemist)) {
        AIactions_1.AIactions.craft_bulk(character, cooking_1.Cooking.elodino);
    }
    if ((character.skills.woodwork > 40) && (character.perks.weapon_maker == true)) {
        AIactions_1.AIactions.make_wooden_weapon(character, AI_SCRIPTED_VALUES_1.AItrade.buy_price_bulk(character, materials_manager_1.WOOD));
    }
    if ((character.skills.bone_carving > 40) && (character.perks.weapon_maker == true)) {
        AIactions_1.AIactions.make_bone_weapon(character, AI_SCRIPTED_VALUES_1.AItrade.buy_price_bulk(character, materials_manager_1.RAT_BONE));
    }
    if ((character.skills.clothier > 40) && (character.perks.skin_armour_master == true)) {
        AIactions_1.AIactions.make_armour(character, AI_SCRIPTED_VALUES_1.AItrade.buy_price_bulk(character, materials_manager_1.RAT_SKIN));
    }
    if ((character.skills.clothier > 40) && (character.perks.shoemaker == true)) {
        AIactions_1.AIactions.make_boots(character, AI_SCRIPTED_VALUES_1.AItrade.buy_price_bulk(character, materials_manager_1.RAT_SKIN));
    }
}
exports.crafter_routine = crafter_routine;
