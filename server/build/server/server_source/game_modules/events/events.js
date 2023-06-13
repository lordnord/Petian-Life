"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Event = void 0;
const battle_calcs_1 = require("../battle/battle_calcs");
const events_1 = require("../battle/events");
const system_1 = require("../battle/system");
const basic_functions_1 = require("../calculations/basic_functions");
const system_2 = require("../attack/system");
const generate_loot_1 = require("../races/generate_loot");
// import { Perks } from "../character/Perks";
const perk_requirement_1 = require("../character/perk_requirement");
const perk_base_price_1 = require("../prices/perk_base_price");
const system_3 = require("../character/system");
const alerts_1 = require("../client_communication/network_actions/alerts");
const user_manager_1 = require("../client_communication/user_manager");
const data_1 = require("../data");
const materials_manager_1 = require("../manager_classes/materials_manager");
const systems_communication_1 = require("../systems_communication");
const effects_1 = require("./effects");
const inventory_events_1 = require("./inventory_events");
const market_1 = require("./market");
const damage_types_1 = require("../damage_types");
const skill_price_1 = require("../prices/skill_price");
const scripted_values_1 = require("./scripted_values");
// import { BuildingType } from "../DATA_LAYOUT_BUILDING";
const helpers_1 = require("../craft/helpers");
const GRAVEYARD_CELL = 0;
var Event;
(function (Event) {
    function buy_perk(student, perk, teacher) {
        let savings = student.savings.get();
        let price = (0, perk_base_price_1.perk_price)(perk, student, teacher);
        if (savings < price) {
            alerts_1.Alerts.not_enough_to_character(student, 'money', price, savings);
            return;
        }
        let responce = (0, perk_requirement_1.perk_requirement)(perk, student);
        if (responce != 'ok') {
            alerts_1.Alerts.generic_character_alert(student, 'alert', responce);
            return;
        }
        effects_1.Effect.Transfer.savings(student, teacher, price);
        effects_1.Effect.learn_perk(student, perk);
    }
    Event.buy_perk = buy_perk;
    function buy_skill(student, skill, teacher) {
        let savings = student.savings.get();
        let price = (0, skill_price_1.skill_price)(skill, student, teacher);
        if (savings < price) {
            alerts_1.Alerts.not_enough_to_character(student, 'money', price, savings);
            return;
        }
        if (teacher.skills[skill] <= student.skills[skill] + 20)
            return;
        if (teacher.skills[skill] < 30)
            return;
        effects_1.Effect.Transfer.savings(student, teacher, price);
        effects_1.Effect.Change.skill(student, skill, 1);
    }
    Event.buy_skill = buy_skill;
    function move(character, new_cell_id) {
        // console.log(`Character ${character.name} moves to ${new_cell.x} ${new_cell.y}`)
        const old_cell_id = character.cell_id;
        // Unlink.character_and_cell(character, old_cell)
        systems_communication_1.Link.character_and_cell(character.id, new_cell_id);
        let probability = 0.5;
        let urbanisation = data_1.Data.Cells.urbanisation(old_cell_id);
        let forestation = data_1.Data.Cells.forestation(old_cell_id);
        if (forestation > 100)
            probability += 0.1;
        if (forestation > 300)
            probability += 0.1;
        if (urbanisation > 4)
            probability -= 0.2;
        if (urbanisation > 0)
            probability -= 0.1;
        // effect on fatigue depending on boots
        if (character.equip.data.armour.foot == undefined) {
            effects_1.Effect.Change.fatigue(character, 5);
        }
        else {
            const durability = character.equip.data.armour.foot.durability;
            effects_1.Effect.Change.fatigue(character, Math.round((0, basic_functions_1.trim)(5 - 4 * (durability / 100), 1, 5)));
        }
        const dice = Math.random();
        if (dice < probability) {
            effects_1.Effect.change_durability(character, 'foot', -1);
            let skill_dice = Math.random();
            if (skill_dice * skill_dice * skill_dice > character.skills.travelling / 100) {
                effects_1.Effect.Change.skill(character, 'travelling', 1);
            }
        }
        user_manager_1.UserManagement.add_user_to_update_queue(character.user_id, 1 /* UI_Part.STATUS */);
        user_manager_1.UserManagement.add_user_to_update_queue(character.user_id, 7 /* UI_Part.MAP */);
        let user = systems_communication_1.Convert.character_to_user(character);
        if (user == undefined)
            return;
        let new_cell = data_1.Data.Cells.from_id(new_cell_id);
        alerts_1.Alerts.log_to_user(user, 'rat scent ' + new_cell.rat_scent);
    }
    Event.move = move;
    function new_character(template, name, starting_cell, model) {
        // console.log('creating new character')
        let character = system_3.CharacterSystem.template_to_character(template, name, starting_cell);
        if (model == undefined)
            model = { chin: 0, mouth: 0, eyes: 0 };
        character.set_model_variation(model);
        const cell = data_1.Data.Cells.from_id(starting_cell);
        systems_communication_1.Link.character_and_cell(character.id, cell.id);
        data_1.Data.CharacterDB.save();
        return character;
    }
    Event.new_character = new_character;
    function ranged_dodge(attack, defender, flag_dodge) {
        // evasion helps against arrows better than in melee
        // 100 evasion - 2 * attack skill = 100% of arrows are missing
        // evaded attack does not rise skill of attacker
        // dodge is an active evasion
        // it gives base 10% of arrows missing
        // and you rise your evasion if you are attacked
        const attack_skill = 2 * attack.attack_skill;
        const evasion = defender.skills.evasion;
        let evasion_chance = evasion / (100 + attack_skill);
        if (flag_dodge)
            evasion_chance = evasion_chance + 0.1;
        const evasion_roll = Math.random();
        if (evasion_roll < evasion_chance) {
            attack.flags.miss = true;
            return 'miss';
        }
        if (flag_dodge) {
            const dice_evasion_skill_up = Math.random();
            if (dice_evasion_skill_up > evasion_chance) {
                effects_1.Effect.Change.skill(defender, 'evasion', 1);
            }
        }
    }
    function shoot(attacker, defender, distance, flag_dodge) {
        // sanity checks
        if (defender.get_hp() == 0)
            return 'miss';
        if (attacker.get_hp() == 0)
            return 'miss';
        if (attacker.stash.get(materials_manager_1.ARROW_BONE) < 1) {
            alerts_1.Alerts.not_enough_to_character(attacker, 'arrow', 1, 0);
            return 'no_ammo';
        }
        data_1.Data.Reputation.set_a_X_b(defender.id, 'enemy', attacker.id);
        //remove arrow
        change_stash(attacker, materials_manager_1.ARROW_BONE, -1);
        //check missed attack because of lack of skill
        const acc = battle_calcs_1.Accuracy.ranged(attacker, distance);
        const dice_accuracy = Math.random();
        if (dice_accuracy > acc) {
            const dice_skill_up = Math.random();
            if (dice_skill_up * 100 > attacker.skills.ranged) {
                effects_1.Effect.Change.skill(attacker, 'ranged', 1);
            }
            return 'miss';
        }
        const dice_skill_up = Math.random();
        if (dice_skill_up * 50 > attacker.skills.ranged) {
            effects_1.Effect.Change.skill(attacker, 'ranged', 1);
        }
        // create attack
        const attack = system_2.Attack.generate_ranged(attacker);
        // durability changes weapon
        const roll_weapon = Math.random();
        if (roll_weapon < 0.2) {
            effects_1.Effect.change_durability(attacker, 'weapon', -1);
        }
        const responce = ranged_dodge(attack, defender, flag_dodge);
        if (responce == 'miss') {
            damage_types_1.DmgOps.mult_ip(attack.damage, 0);
        }
        else {
            const roll = Math.random();
            if (roll < 0.5)
                effects_1.Effect.change_durability(defender, 'body', -1);
            else if (roll < 0.7)
                effects_1.Effect.change_durability(defender, 'legs', -1);
            else if (roll < 0.8)
                effects_1.Effect.change_durability(defender, 'foot', -1);
            else if (roll < 0.9)
                effects_1.Effect.change_durability(defender, 'head', -1);
            else
                effects_1.Effect.change_durability(defender, 'arms', -1);
        }
        //apply status to attack
        attack.attacker_status_change.fatigue += 5;
        attack.defender_status_change.fatigue += 5;
        attack.defender_status_change.stress += 3;
        attack.defence_skill += defender.skills.evasion;
        deal_damage(defender, attack, attacker);
        //if target is dead, loot it all
        if (defender.dead()) {
            kill(attacker, defender);
        }
        return 'ok';
    }
    Event.shoot = shoot;
    function magic_bolt(attacker, defender, dist, flag_dodge) {
        if (defender.dead())
            return 'miss';
        if (attacker.dead())
            return 'miss';
        data_1.Data.Reputation.set_a_X_b(defender.id, 'enemy', attacker.id);
        const BLOOD_COST = 10;
        // managing costs
        if (attacker.stash.get(materials_manager_1.ZAZ) > 0)
            Event.change_stash(attacker, materials_manager_1.ZAZ, -1);
        else if (attacker.status.blood >= BLOOD_COST)
            attacker.status.blood -= BLOOD_COST;
        else {
            const blood = attacker.status.blood;
            const hp = attacker.status.hp;
            if (blood + hp > BLOOD_COST) {
                attacker.status.blood = 0;
                attacker.status.hp -= (BLOOD_COST - blood);
            }
            else {
                attacker.status.hp = 1;
            }
        }
        const dice = Math.random();
        if (dice > attacker.skills.magic_mastery / 50) {
            effects_1.Effect.Change.skill(attacker, 'magic_mastery', 1);
        }
        const attack = system_2.Attack.generate_magic_bolt(attacker, dist);
        attack.defender_status_change.stress += 5;
        deal_damage(defender, attack, attacker);
        //if target is dead, loot it all
        if (defender.dead()) {
            kill(attacker, defender);
        }
        return 'ok';
    }
    Event.magic_bolt = magic_bolt;
    function deal_damage(defender, attack, attacker) {
        const total = system_3.CharacterSystem.damage(defender, attack.damage);
        defender.change_status(attack.defender_status_change);
        attacker.change_status(attack.attacker_status_change);
        const resistance = system_3.CharacterSystem.resistance(defender);
        alerts_1.Alerts.log_attack(defender, attack, resistance, total, 'defender');
        alerts_1.Alerts.log_attack(attacker, attack, resistance, total, 'attacker');
        user_manager_1.UserManagement.add_user_to_update_queue(defender.user_id, 1 /* UI_Part.STATUS */);
        user_manager_1.UserManagement.add_user_to_update_queue(attacker.user_id, 1 /* UI_Part.STATUS */);
    }
    function attack(attacker, defender, dodge_flag, attack_type) {
        if (attacker.dead())
            return;
        if (defender.dead())
            return;
        const attack = system_2.Attack.generate_melee(attacker, attack_type);
        //status changes for melee attack
        attack.attacker_status_change.rage += 5;
        attack.attacker_status_change.fatigue += 5;
        attack.defender_status_change.rage += 3;
        attack.defender_status_change.stress += 1;
        data_1.Data.Reputation.set_a_X_b(defender.id, 'enemy', attacker.id);
        //calculating defense skill
        evade(defender, attack, dodge_flag);
        block(defender, attack);
        parry(defender, attack);
        //calculating improvement to skill
        attack_skill_improvement(attacker, defender, attack);
        //breaking items
        attack_affect_durability(attacker, defender, attack);
        //applying defense and attack skill
        let damage_modifier = (40 + attack.attack_skill) / (40 + attack.defence_skill);
        damage_types_1.DmgOps.mult_ip(attack.damage, damage_modifier);
        // console.log('attack after modification')
        // console.log(attack)
        //apply damage and status effect after all modifiers
        deal_damage(defender, attack, attacker);
        //if target is dead, loot it all
        if (defender.dead()) {
            kill(attacker, defender);
        }
    }
    Event.attack = attack;
    function attack_affect_durability(attacker, defender, attack) {
        if (!attack.flags.miss) {
            const durability_roll = Math.random();
            if (durability_roll < 0.5)
                effects_1.Effect.change_durability(attacker, 'weapon', -1);
            if (attack.flags.blocked) {
                effects_1.Effect.change_durability(defender, 'weapon', -1);
            }
            else {
                const roll = Math.random();
                if (roll < 0.5)
                    effects_1.Effect.change_durability(defender, 'body', -1);
                else if (roll < 0.7)
                    effects_1.Effect.change_durability(defender, 'legs', -1);
                else if (roll < 0.8)
                    effects_1.Effect.change_durability(defender, 'foot', -1);
                else if (roll < 0.9)
                    effects_1.Effect.change_durability(defender, 'head', -1);
                else
                    effects_1.Effect.change_durability(defender, 'arms', -1);
            }
        }
    }
    function attack_skill_improvement(attacker, defender, attack) {
        // if attacker skill is lower than total defence skill of attack, then attacker can improve
        if (attack.attack_skill < attack.defence_skill) {
            const improvement_rate = (100 + attack.defence_skill) / (100 + attack.attack_skill);
            if (improvement_rate > 1) {
                effects_1.Effect.Change.skill(attacker, attack.weapon_type, Math.floor(improvement_rate));
            }
            else {
                const dice = Math.random();
                if (dice < improvement_rate)
                    effects_1.Effect.Change.skill(attacker, attack.weapon_type, 1);
            }
        }
        //fighting provides constant growth of this skill up to some level
        //for defender
        const dice = Math.random();
        if ((dice < 0.5) && (attack.attack_skill <= 30)) {
            effects_1.Effect.Change.skill(defender, system_3.CharacterSystem.melee_weapon_type(defender), 1);
        }
        //for attacker
        const dice2 = Math.random();
        if ((dice2 < 0.5) && (attack.attack_skill <= 30)) {
            effects_1.Effect.Change.skill(attacker, attack.weapon_type, 1);
        }
    }
    function parry(defender, attack) {
        const weapon = system_3.CharacterSystem.melee_weapon_type(defender);
        const skill = defender.skills[weapon] + Math.round(Math.random() * 5);
        attack.defence_skill += skill;
        // roll parry
        const parry_dice = Math.random();
        if ((skill > attack.attack_skill)) {
            attack.defence_skill += 40;
            attack.flags.blocked = true;
        }
        //fighting provides constant growth of this skill up to some level
        if (skill < attack.attack_skill) {
            effects_1.Effect.Change.skill(defender, weapon, 1);
        }
        const dice = Math.random();
        if ((dice < 0.1) && (skill <= 10)) {
            effects_1.Effect.Change.skill(defender, weapon, 1);
        }
    }
    function block(defender, attack) {
        const skill = defender.skills.blocking + Math.round(Math.random() * 10);
        attack.defence_skill += skill;
        // roll block
        const block_dice = Math.random();
        if (block_dice * skill > attack.defence_skill) {
            attack.flags.blocked = true;
        }
        //fighting provides constant growth of this skill
        if (skill < attack.attack_skill) {
            effects_1.Effect.Change.skill(defender, 'blocking', 1);
        }
        const dice = Math.random();
        if ((dice < 0.1) && (skill <= 20)) {
            effects_1.Effect.Change.skill(defender, 'blocking', 1);
        }
    }
    function evade(defender, attack, dodge_flag) {
        //this skill has quite wide deviation
        const skill = (0, basic_functions_1.trim)(defender.skills.evasion + Math.round((Math.random() - 0.5) * 40), 0, 200);
        //passive evasion
        attack.defence_skill += skill;
        //active dodge
        if (dodge_flag) {
            attack.flags.miss = true;
            attack.defence_skill += 50;
        }
        // roll miss
        const block_dice = Math.random();
        if (block_dice * skill > attack.defence_skill) {
            attack.flags.miss = true;
        }
        //fighting provides constant growth of this skill
        if (skill < attack.attack_skill) {
            effects_1.Effect.Change.skill(defender, 'evasion', 1);
        }
        const dice = Math.random();
        if ((dice < 0.1) && (skill <= 10)) {
            effects_1.Effect.Change.skill(defender, 'evasion', 1);
        }
    }
    function kill(killer, victim) {
        let cell = data_1.Data.Cells.from_id(killer.cell_id);
        console.log(killer.name + ' kills ' + victim.name + ' at ' + `(${cell?.x}, ${cell?.y})`);
        death(victim);
        if (killer.id == victim.id) {
            return;
        }
        const loot = system_3.CharacterSystem.rgo_check(victim);
        system_3.CharacterSystem.transfer_all(victim, killer);
        for (const item of loot) {
            Event.change_stash(killer, item.material, item.amount);
        }
        // console.log(killer.stash.data)
        //loot items rgo
        // console.log('check items drop')
        const dropped_items = generate_loot_1.Loot.items(victim.race());
        for (let item of dropped_items) {
            inventory_events_1.EventInventory.add_item(killer, item);
        }
        // skinning check
        const skin = generate_loot_1.Loot.skinning(victim.archetype.race);
        if (skin > 0) {
            const dice = Math.random();
            if (dice < killer.skills.skinning / 100) {
                Event.change_stash(killer, materials_manager_1.RAT_SKIN, skin);
            }
            else {
                effects_1.Effect.Change.skill(killer, 'skinning', 1);
            }
        }
        if (victim.current_building != undefined) {
            effects_1.Effect.leave_room(victim.id);
        }
        data_1.Data.Buildings.remove_ownership_character(victim.id);
        user_manager_1.UserManagement.add_user_to_update_queue(killer.user_id, 4 /* UI_Part.STASH */);
    }
    Event.kill = kill;
    function death(character) {
        // UserManagement.add_user_to_update_queue(character.user_id, "death");
        if (character.cleared)
            return;
        console.log('death of ' + character.name);
        market_1.EventMarket.clear_orders(character);
        const user_data = systems_communication_1.Convert.character_to_user_data(character);
        systems_communication_1.Unlink.user_data_and_character(user_data, character);
        const battle = systems_communication_1.Convert.character_to_battle(character);
        systems_communication_1.Unlink.character_and_battle(character, battle);
        // const cell = Convert.character_to_cell(character)
        // cell.changed_characters = true
        systems_communication_1.Link.character_and_cell(character.id, GRAVEYARD_CELL);
        character.cleared = true;
    }
    Event.death = death;
    function change_stash(character, tag, amount) {
        character.stash.inc(tag, amount);
        let user = systems_communication_1.Convert.character_to_user(character);
        if (user == undefined)
            return;
        alerts_1.Alerts.log_to_user(user, `change ${materials_manager_1.materials.index_to_material(tag).string_tag} by ${amount}. Now: ${character.stash.get(tag)}`);
        user_manager_1.UserManagement.add_user_to_update_queue(character.user_id, 4 /* UI_Part.STASH */);
    }
    Event.change_stash = change_stash;
    function support_in_battle(character, target) {
        console.log('attempt to support in battle');
        if (character.id == target.id)
            return undefined;
        if (!target.in_battle())
            return;
        if (character.cell_id != target.cell_id) {
            return undefined;
        }
        console.log('validated');
        const battle = systems_communication_1.Convert.character_to_battle(target);
        if (battle == undefined)
            return;
        const unit_target = systems_communication_1.Convert.character_to_unit(target);
        if (unit_target == undefined)
            return;
        join_battle(character, battle, unit_target.team);
    }
    Event.support_in_battle = support_in_battle;
    function start_battle(attacker, defender) {
        console.log('attempt to start battle');
        if (attacker.id == defender.id)
            return undefined;
        if (attacker.in_battle())
            return undefined;
        if (attacker.cell_id != defender.cell_id) {
            return undefined;
        }
        console.log('valid participants');
        // two cases
        // if defender is in battle, attempt to join it against him as a new team
        // else create new battle
        const battle = systems_communication_1.Convert.character_to_battle(defender);
        const unit_def = systems_communication_1.Convert.character_to_unit(defender);
        if ((battle != undefined) && (unit_def != undefined)) {
            // let team = AIhelper.check_team_to_join(attacker, battle, unit_def.team)
            // if (team == 'no_interest') team = Math.random()
            let team = system_1.BattleSystem.get_empty_team(battle);
            join_battle(attacker, battle, team);
        }
        else {
            const battle_id = system_1.BattleSystem.create_battle();
            console.log('new battle: ' + battle_id);
            const battle = systems_communication_1.Convert.id_to_battle(battle_id);
            join_battle(defender, battle, 0);
            join_battle(attacker, battle, 1);
        }
    }
    Event.start_battle = start_battle;
    function join_battle(agent, battle, team) {
        if (agent.in_battle()) {
            return;
        }
        const unit = system_1.BattleSystem.create_unit(agent, team, battle);
        events_1.BattleEvent.NewUnit(battle, unit);
        systems_communication_1.Link.character_battle_unit(agent, battle, unit);
        alerts_1.Alerts.battle_update_data(battle);
        user_manager_1.UserManagement.add_user_to_update_queue(agent.user_id, 18 /* UI_Part.BATTLE */);
    }
    Event.join_battle = join_battle;
    function stop_battle(battle) {
        battle.ended = true;
        for (let unit of Object.values(battle.heap.data)) {
            const character = systems_communication_1.Convert.unit_to_character(unit);
            if (character != undefined) {
                character.battle_id = -1;
                character.battle_unit_id = -1;
            }
            user_manager_1.UserManagement.add_user_to_update_queue(character.user_id, 18 /* UI_Part.BATTLE */);
        }
    }
    Event.stop_battle = stop_battle;
    // export function build_building(character: Character, type: LandPlotType) {
    // }
    function buy_land_plot(character, seller) {
        if (data_1.Data.Reputation.from_id('city', seller.id) != 'leader')
            return 'not_a_leader';
        if (character.cell_id != seller.cell_id)
            return 'too_far';
        if (character.savings.get() < 500)
            return 'not_enough_money';
        if (data_1.Data.Cells.free_space(character.cell_id) < 1)
            return 'no_space';
        effects_1.Effect.Transfer.savings(character, seller, 500);
        const land_plot = effects_1.Effect.new_building(character.cell_id, "land_plot" /* LandPlotType.LandPlot */, 100, 1);
        data_1.Data.Buildings.set_ownership(character.id, land_plot);
    }
    Event.buy_land_plot = buy_land_plot;
    function develop_land_plot(character, plot_id, type) {
        let cost = scripted_values_1.ScriptedValue.building_price_wood(type);
        if (character.stash.get(materials_manager_1.WOOD) < cost)
            return;
        change_stash(character, materials_manager_1.WOOD, -cost);
        let building = data_1.Data.Buildings.from_id(plot_id);
        building.type = type;
        // Effect.new_building(character.cell_id, type, character.skills.woodwork)
    }
    Event.develop_land_plot = develop_land_plot;
    function repair_building(character, builing_id) {
        let building = data_1.Data.Buildings.from_id(builing_id);
        let skill = character.skills.woodwork;
        let repair = Math.min(5, skill - building.durability);
        if (repair <= 0)
            return;
        let cost = Math.round(repair / 100 * scripted_values_1.ScriptedValue.building_price_wood(building.type) / 2 + 0.51);
        if (cost > character.stash.get(materials_manager_1.WOOD))
            return;
        let difficulty = Math.floor(building.durability / 3 + 10);
        (0, helpers_1.on_craft_update)(character, [{ skill: 'woodwork', difficulty: difficulty }]);
        change_stash(character, materials_manager_1.WOOD, -cost);
        effects_1.Effect.building_repair(building, repair);
    }
    Event.repair_building = repair_building;
    function remove_tree(cell) {
        let land_plots = data_1.Data.Buildings.from_cell_id(cell);
        if (land_plots == undefined)
            return;
        for (let item of land_plots) {
            const plot = data_1.Data.Buildings.from_id(item);
            if (plot.type == "forest_plot" /* LandPlotType.ForestPlot */) {
                plot.durability = plot.durability - 1;
                if (plot.durability < 0)
                    plot.durability = 0;
            }
        }
    }
    Event.remove_tree = remove_tree;
})(Event = exports.Event || (exports.Event = {}));
