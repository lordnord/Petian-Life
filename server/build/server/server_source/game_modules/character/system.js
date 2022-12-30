"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CharacterSystem = void 0;
const materials_manager_1 = require("../manager_classes/materials_manager");
const damage_types_1 = require("../misc/damage_types");
const character_1 = require("./character");
const generate_loot_1 = require("../races/generate_loot");
const fs_1 = __importDefault(require("fs"));
const data_1 = require("../data");
var path = require('path');
const SAVE_GAME_PATH_1 = require("../../SAVE_GAME_PATH");
const ai_manager_1 = require("../AI/ai_manager");
const skills_1 = require("./skills");
var loaded_flag_characters = false;
const save_path = path.join(SAVE_GAME_PATH_1.SAVE_GAME_PATH, 'characters.txt');
var ai_campaign_decision_timer = 0;
var CharacterSystem;
(function (CharacterSystem) {
    function load() {
        if (loaded_flag_characters) {
            return;
        }
        console.log('loading characters');
        if (!fs_1.default.existsSync(save_path)) {
            fs_1.default.writeFileSync(save_path, '');
        }
        let data = fs_1.default.readFileSync(save_path).toString();
        let lines = data.split('\n');
        for (let line of lines) {
            if (line == '') {
                continue;
            }
            const character = string_to_character(line);
            data_1.Data.Character.set(character.id, character);
            data_1.Data.Character.set_id(Math.max(character.id, data_1.Data.Character.id()));
        }
        loaded_flag_characters = true;
        console.log('characters loaded');
    }
    CharacterSystem.load = load;
    function save() {
        console.log('saving characters');
        let str = '';
        for (let item of data_1.Data.Character.list()) {
            if (item.dead())
                continue;
            str = str + character_to_string(item) + '\n';
        }
        fs_1.default.writeFileSync(save_path, str);
        console.log('characters saved');
    }
    CharacterSystem.save = save;
    function character_to_string(c) {
        let ids = [c.id, c.battle_id, c.battle_unit_id, c.user_id, c.cell_id].join('&');
        let name = c.name;
        let archetype = JSON.stringify(c.archetype);
        let equip = c.equip.to_string();
        let stash = JSON.stringify(c.stash.get_json());
        let trade_stash = JSON.stringify(c.trade_stash.get_json());
        let savings = c.savings.get();
        let trade_savings = c.trade_savings.get();
        let status = JSON.stringify(c.status);
        let skills = JSON.stringify(c.skills);
        let perks = JSON.stringify(c.perks);
        let innate_stats = JSON.stringify(c.stats);
        let explored = JSON.stringify({ data: c.explored });
        return [ids, name, archetype, equip, stash, trade_stash, savings, trade_savings, status, skills, perks, innate_stats, explored].join(';');
    }
    CharacterSystem.character_to_string = character_to_string;
    function string_to_character(s) {
        const [ids, name, raw_archetype, raw_equip, raw_stash, raw_trade_stash, raw_savings, raw_trade_savings, raw_status, raw_skills, raw_perks, raw_innate_stats, raw_explored] = s.split(';');
        let [raw_id, raw_battle_id, raw_battle_unit_id, raw_user_id, raw_cell_id] = ids.split('&');
        if (raw_user_id != '#') {
            var user_id = Number(raw_user_id);
        }
        else {
            var user_id = '#';
        }
        const innate_stats = JSON.parse(raw_innate_stats);
        const stats = innate_stats.stats;
        const character = new character_1.Character(Number(raw_id), Number(raw_battle_id), Number(raw_battle_unit_id), user_id, Number(raw_cell_id), name, JSON.parse(raw_archetype), stats, innate_stats.max.hp);
        character.stats = innate_stats;
        character.explored = JSON.parse(raw_explored).data;
        character.equip.from_string(raw_equip);
        character.stash.load_from_json(JSON.parse(raw_stash));
        character.trade_stash.load_from_json(JSON.parse(raw_trade_stash));
        character.savings.inc(Number(raw_savings));
        character.trade_savings.inc(Number(raw_trade_savings));
        character.set_status(JSON.parse(raw_status));
        character.skills = new skills_1.SkillList();
        for (let [_, skill] of Object.entries(JSON.parse(raw_skills))) {
            character.skills[_] = skill;
        }
        character.perks = JSON.parse(raw_perks);
        return character;
    }
    CharacterSystem.string_to_character = string_to_character;
    function template_to_character(template, name, cell_id) {
        data_1.Data.Character.increase_id();
        if (name == undefined)
            name = template.name_generator();
        let character = new character_1.Character(data_1.Data.Character.id(), -1, -1, '#', cell_id, name, template.archetype, template.stats, template.max_hp);
        character.stats.base_resists = damage_types_1.DmgOps.add(character.stats.base_resists, template.base_resists);
        data_1.Data.Character.set(data_1.Data.Character.id(), character);
        character.explored[cell_id] = true;
        return character;
    }
    CharacterSystem.template_to_character = template_to_character;
    function transfer_savings(A, B, x) {
        A.savings.transfer(B.savings, x);
    }
    CharacterSystem.transfer_savings = transfer_savings;
    function transfer_stash(A, B, what, amount) {
        A.stash.transfer(B.stash, what, amount);
    }
    CharacterSystem.transfer_stash = transfer_stash;
    function to_trade_stash(A, material, amount) {
        if (amount > 0) {
            if (A.stash.get(material) < amount)
                return false;
            A.stash.transfer(A.trade_stash, material, amount);
            return true;
        }
        if (amount < 0) {
            if (A.trade_stash.get(material) < -amount)
                return false;
            A.trade_stash.transfer(A.stash, material, -amount);
            return true;
        }
        return true;
    }
    CharacterSystem.to_trade_stash = to_trade_stash;
    function to_trade_savings(A, amount) {
        if (amount > 0) {
            if (A.savings.get() < amount)
                return false;
            A.savings.transfer(A.trade_savings, amount);
            return true;
        }
        if (amount < 0) {
            if (A.trade_savings.get() < -amount)
                return false;
            A.trade_savings.transfer(A.savings, -amount);
            return true;
        }
        return true;
    }
    CharacterSystem.to_trade_savings = to_trade_savings;
    function transaction(A, B, savings_A_to_B, stash_A_to_B, savings_B_to_A, stash_B_to_A) {
        // transaction validation
        if (A.savings.get() < savings_A_to_B)
            return false;
        if (B.savings.get() < savings_B_to_A)
            return false;
        for (let material of materials_manager_1.materials.get_materials_list()) {
            if (A.stash.get(material) < stash_A_to_B.get(material))
                return false;
            if (B.stash.get(material) < stash_B_to_A.get(material))
                return false;
        }
        //transaction is validated, execution
        A.savings.transfer(B.savings, savings_A_to_B);
        B.savings.transfer(A.savings, savings_B_to_A);
        for (let material of materials_manager_1.materials.get_materials_list()) {
            A.stash.transfer(B.stash, material, stash_A_to_B.get(material));
            B.stash.transfer(A.stash, material, stash_B_to_A.get(material));
        }
        return true;
    }
    CharacterSystem.transaction = transaction;
    function melee_damage_raw(character, type) {
        const weapon_damage = character.equip.get_melee_damage(type);
        if (weapon_damage != undefined)
            return weapon_damage;
        //handle case of unarmed
        const damage = new damage_types_1.Damage();
        if (type == 'blunt') {
            if (character.perks.advanced_unarmed) {
                damage.blunt = 30;
            }
            else {
                damage.blunt = 10;
            }
        }
        if (type == 'slice') {
            if (character.perks.claws) {
                damage.slice = 15;
            }
            else {
                damage.slice = 2;
            }
        }
        if (type == 'pierce') {
            damage.pierce = 0;
        }
        return damage;
    }
    CharacterSystem.melee_damage_raw = melee_damage_raw;
    function ranged_damage_raw(character) {
        const damage = character.equip.get_ranged_damage();
        if (damage != undefined)
            return damage;
        return new damage_types_1.Damage();
    }
    CharacterSystem.ranged_damage_raw = ranged_damage_raw;
    function phys_power(character) {
        return character.stats.stats.phys_power * character.equip.get_phys_power_modifier();
    }
    CharacterSystem.phys_power = phys_power;
    function magic_power(character) {
        let result = character.stats.stats.magic_power + character.equip.get_magic_power();
        if (character.perks.mage_initiation)
            result += 10;
        if (character.perks.magic_bolt)
            result += 10;
        if (character.perks.blood_mage) {
            const blood_mod = character.status.blood / 50;
            result = Math.round(result * (1 + blood_mod));
        }
        return result;
    }
    CharacterSystem.magic_power = magic_power;
    function attack_skill(character) {
        const weapon = character.equip.data.weapon;
        if (weapon == undefined)
            return character.skills.noweapon;
        return character.skills[weapon.weapon_tag];
    }
    CharacterSystem.attack_skill = attack_skill;
    function resistance(character) {
        let result = character.stats.base_resists;
        result = damage_types_1.DmgOps.add(result, character.equip.resists());
        return result;
    }
    CharacterSystem.resistance = resistance;
    function weapon_type(character) {
        const weapon = character.equip.data.weapon;
        if (weapon == undefined)
            return 'noweapon';
        return weapon.weapon_tag;
    }
    CharacterSystem.weapon_type = weapon_type;
    function melee_weapon_type(character) {
        const weapon = character.equip.data.weapon;
        if (weapon == undefined)
            return 'noweapon';
        if (weapon.weapon_tag == 'ranged')
            return 'polearms';
        return weapon.weapon_tag;
    }
    CharacterSystem.melee_weapon_type = melee_weapon_type;
    function damage(character, damage) {
        let total = 0;
        for (let tag of damage_types_1.damage_types) {
            character.change_hp(-damage[tag]);
            total += damage[tag];
        }
        return total;
    }
    CharacterSystem.damage = damage;
    function transfer_all(origin, target) {
        origin.stash.transfer_all(target.stash);
        origin.savings.transfer_all(target.savings);
        origin.equip.transfer_all(target);
    }
    CharacterSystem.transfer_all = transfer_all;
    function rgo_check(character) {
        const loot = generate_loot_1.Loot.base(character.archetype.race);
        return loot;
    }
    CharacterSystem.rgo_check = rgo_check;
    //     mod_spell_damage_with_stats(result: AttackResult, tag:spell_tags) {
    //         let power_mod = this.get_magic_power() / 10
    //         let skill_mod = this.skills.magic_mastery / 10
    //         let damage_mod = power_mod * (skill_mod + 1)
    //         if (this.skills.perks.magic_bolt) {
    //             damage_mod = damage_mod * 1.5
    //         }
    //         if (this.skills.perks.mage_initiation) {
    //             damage_mod = damage_mod * 1.5
    //         }
    //         damage_mod = Math.floor(damage_mod)
    //         result.damage['blunt']  = Math.floor(Math.max(1, result.damage['blunt']     * damage_mod));
    //         result.damage['pierce'] = Math.floor(Math.max(0, result.damage['pierce']    * damage_mod));
    //         result.damage['slice']  = Math.floor(Math.max(0, result.damage['slice']     * damage_mod));
    //         result.damage['fire']   = Math.floor(Math.max(0, result.damage['fire']      * damage_mod));
    //         return result
    //     }
    //     roll_accuracy(result: AttackResult, mod: 'fast'|'heavy'|'usual'|'ranged', distance?: number) {
    //         let dice = Math.random();
    //         result.chance_to_hit = this.get_accuracy(result, mod, distance)
    //         if (dice > result.chance_to_hit) {
    //             result.flags.miss = true;
    //         }
    //         return result
    //     }
    //     roll_crit(result: AttackResult) {
    //         let dice = Math.random()
    //         let crit_chance = this.get_crit_chance("attack");
    //         let mult = this.get_crit_mult();
    //         if (dice < crit_chance) {
    //             result.damage['blunt'] = result.damage['blunt'] * mult;
    //             result.damage['pierce'] = result.damage['pierce'] * mult;
    //             result.damage['slice'] = result.damage['slice'] * mult;
    //             result.flags.crit = true;
    //         }
    //         return result
    //     }
    //     roll_dodge(result: AttackResult, mod: 'fast'|'heavy'|'usual'|'ranged', dodge_flag: boolean) {
    //         let dice = Math.random()
    //         let base_evade_chance = this.get_evasion_chance();
    //         let attack_specific_dodge = 0;
    //         if (dodge_flag) switch(mod){
    //             case 'fast': {attack_specific_dodge = 0.2; break}
    //             case 'usual': {attack_specific_dodge = 0.5; break}
    //             case 'heavy': {attack_specific_dodge = 1; break}
    //             case 'ranged': {attack_specific_dodge = 0.2;break}
    //         }
    //         let evade_chance = base_evade_chance + attack_specific_dodge
    //         if (dice < evade_chance) {
    //             result.flags.evade = true
    //             result.flags.crit = false
    //         }
    //         return result
    //     }
    //     roll_block(result: AttackResult) {
    //         let dice = Math.random()
    //         let block_chance = this.get_block_chance();
    //         if (dice < block_chance) {
    //             result.flags.blocked = true;
    //         }
    //         return result;
    //     }
    function update(dt) {
        ai_campaign_decision_timer += dt;
        if (ai_campaign_decision_timer > 8) {
            for (let char of data_1.Data.Character.list()) {
                if (char.dead()) {
                    continue;
                }
                if (Math.random() > 0.6) {
                    ai_manager_1.CampaignAI.decision(char);
                }
            }
            ai_campaign_decision_timer = 0;
        }
    }
    CharacterSystem.update = update;
    function battle_update(character) {
    }
    CharacterSystem.battle_update = battle_update;
})(CharacterSystem = exports.CharacterSystem || (exports.CharacterSystem = {}));
