"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Accuracy = void 0;
const AVERAGE_SKILL = 30;
const IDEAL_DIST = 20; // AVERAGE_SKILL archer can hit with 1 probability in ideal conditions
const STRESS_HINDER = 0.2; // maximal reduction to accuracy
const RAGE_HINDER = 0.2; // maximal reduction to accuracy
var Accuracy;
(function (Accuracy) {
    function ranged(character, distance) {
        let base_accuracy = (IDEAL_DIST / (distance + 0.1)) * (character.skills.ranged / AVERAGE_SKILL);
        let accuracy = base_accuracy * (1 - STRESS_HINDER * character.status.stress / 100) * (1 - RAGE_HINDER * character.status.rage);
        return Math.min(accuracy, 1);
    }
    Accuracy.ranged = ranged;
    function melee(character) {
        let base_accuracy = 1;
        let accuracy = base_accuracy * (1 - STRESS_HINDER * character.status.stress / 100) * (1 - RAGE_HINDER * character.status.rage);
        return Math.min(accuracy, 1);
    }
    Accuracy.melee = melee;
})(Accuracy = exports.Accuracy || (exports.Accuracy = {}));
// get_accuracy(result: {weapon_type: WEAPON_TYPE}, mod: 'fast'|'heavy'|'usual'|'ranged', distance?: number) {
//     let base_accuracy = character_defines.accuracy + this.get_weapon_skill(result.weapon_type) * character_defines.skill_accuracy_modifier
//     let blood_burden = character_defines.blood_accuracy_burden;
//     let rage_burden = character_defines.rage_accuracy_burden
//     let blood_acc_loss = this.status.blood * blood_burden;
//     let rage_acc_loss = this.status.rage * rage_burden;
//     let stress_acc_loss = this.status.stress * 0.01
//     let final = base_accuracy - blood_acc_loss - rage_acc_loss - stress_acc_loss
//     if ((distance != undefined) && (mod == 'ranged')) {
//         if (distance < 2) distance = 2
//         distance = Math.sqrt(distance - 2) / 2 + 2
//         final = final / (distance - 1.5)
//         return Math.min(1, Math.max(0, final))
//     }
//     return Math.min(1, Math.max(0.1, final))
// }    
// get_attack_chance(mod: 'fast'|'heavy'|'usual'|'ranged', distance?: number) {
//     let weapon = this.equip.data.weapon
//     let weapon_type = WEAPON_TYPE.NOWEAPON
//     if (weapon != undefined) {
//         weapon_type = weapon.get_weapon_type()
//     }
//     return this.get_accuracy({weapon_type: weapon_type}, mod, distance)
// }
