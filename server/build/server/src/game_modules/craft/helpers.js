"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.use_input = exports.check_inputs = exports.on_craft_update = exports.roll_skill_improvement = exports.skill_to_ratio = exports.MAX_SKILL_MULTIPLIER_BULK = void 0;
const basic_functions_1 = require("../calculations/basic_functions");
const effects_1 = require("../effects/effects");
const events_1 = require("../events/events");
const system_1 = require("../character/system");
exports.MAX_SKILL_MULTIPLIER_BULK = 10;
function skill_to_ratio(skill, difficulty) {
    return (0, basic_functions_1.trim)(skill / difficulty, 0, exports.MAX_SKILL_MULTIPLIER_BULK);
}
exports.skill_to_ratio = skill_to_ratio;
function roll_skill_improvement(current, target) {
    if (current == 0)
        return true;
    if (target == 0)
        return false;
    const dice = Math.random();
    if (dice < ((0, basic_functions_1.trim)(target * 2, 0, 100) - current) / (0, basic_functions_1.trim)(target * 2, 0, 100))
        return true;
}
exports.roll_skill_improvement = roll_skill_improvement;
function on_craft_update(character, difficulty) {
    let fatigue = 5;
    for (let item of difficulty) {
        const pure_skill = system_1.CharacterSystem.pure_skill(character, item.skill);
        const total_skill = system_1.CharacterSystem.skill(character, item.skill);
        if (roll_skill_improvement(pure_skill, item.difficulty)) {
            effects_1.Effect.Change.skill(character, item.skill, 1, "Crafting" /* CHANGE_REASON.CRAFTING */);
        }
        fatigue += (0, basic_functions_1.trim)(item.difficulty - total_skill, 0, 20);
    }
    effects_1.Effect.Change.stress(character, 1, "Crafting" /* CHANGE_REASON.CRAFTING */);
    effects_1.Effect.Change.fatigue(character, fatigue, "Crafting" /* CHANGE_REASON.CRAFTING */);
}
exports.on_craft_update = on_craft_update;
function check_inputs(inputs, stash) {
    let flag = true;
    for (let item of inputs) {
        let tmp = stash.get(item.material);
        if ((tmp < item.amount)) {
            flag = false;
        }
    }
    return flag;
}
exports.check_inputs = check_inputs;
function use_input(input, character) {
    for (let item of input) {
        events_1.Event.change_stash(character, item.material, -item.amount);
    }
}
exports.use_input = use_input;
