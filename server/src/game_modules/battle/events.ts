import { action_points, battle_position, ms } from "../../../../shared/battle_data"
import { Alerts } from "../client_communication/network_actions/alerts"
import { geom } from "../geom"
import { Convert, Unlink } from "../systems_communication"
import { Character } from "../character/character"
import { Battle } from "./classes/battle"
import { BattleSystem } from "./system"
import { can_cast_magic_bolt, can_dodge, can_shoot } from "../character/checks"
import { trim } from "../calculations/basic_functions"
import { UserManagement } from "../client_communication/user_manager"
import { UI_Part } from "../client_communication/causality_graph"
import { BattleValues } from "./VALUES"
import { CharactersHeap } from "./classes/heap"
import { Data } from "../data/data_objects"

// export const MOVE_COST = 3

const COST = {
    ATTACK: 3,
    CHARGE: 1,
}



export namespace BattleEvent {
    export function NewUnit(battle: Battle, unit: Character) {
        unit.next_turn_after = CharactersHeap.get_max(battle) + 1 + Math.floor(Math.random() * 50)
        CharactersHeap.add_unit(battle, unit)
        Alerts.new_unit(battle, unit)
        if (battle.grace_period > 0) battle.grace_period = 5
        Alerts.battle_event_simple(battle, 'unit_join', unit, 0)
    }

    export function Leave(battle: Battle, unit: Character|undefined) {
        if (unit == undefined) return
        // console.log('leave' + unit.id)
        Alerts.battle_event_simple(battle, 'update', unit, 0)
        EndTurn(battle, unit)

        Alerts.remove_unit(battle, unit)
        Alerts.battle_event_simple(battle, 'flee', unit, 0)
        // console.log(character.get_name())

        UserManagement.add_user_to_update_queue(unit.user_id, UI_Part.BATTLE)
        Alerts.battle_event_simple(battle, 'unit_left', unit, 0)

        console.log(`${unit.id} left battle`)
        CharactersHeap.delete_unit(battle, unit)

        if (CharactersHeap.get_units_amount(battle) == 0) {
            BattleSystem.stop_battle(battle)
            return
        }
    }

    export function update_unit_after_turn(battle: Battle, unit: Character, character: Character) {
        CharactersHeap.pop(battle)
        unit.next_turn_after = unit.slowness + 1 + Math.floor(Math.random() * 50)
        const rage_mod = (100 + character.get_rage()) / 100
        let new_ap = Math.min((unit.action_points_left + unit.action_units_per_turn * rage_mod), unit.action_points_max) as action_points;
        unit.action_points_left = new_ap
        unit.dodge_turns = Math.max(0, unit.dodge_turns - 1)
        CharactersHeap.push(battle, unit.id)
    }

    export function EndTurn(battle: Battle, unit: Character) {
        // console.log('end turn')

        // invalid battle
        if (CharactersHeap.get_selected_unit(battle) == undefined) return false
        // not unit's turn
        if (CharactersHeap.get_selected_unit(battle)?.id != unit.id) return false;

        let current_time = Date.now() as ms
        battle.waiting_for_input = false
        battle.date_of_last_turn = current_time

        //updating unit and heap
        const current_ap = unit.action_points_left
        update_unit_after_turn(battle, unit, unit)
        const new_ap = unit.action_points_left

        // update grace period
        battle.grace_period = Math.max(battle.grace_period - 1, 0)

        // get next unit
        let next_unit = CharactersHeap.get_selected_unit(battle)
        if (next_unit == undefined) {
            console.log('something is very very wrong')
            return false
        }
        let time_passed = next_unit.next_turn_after
        CharactersHeap.update(battle, time_passed)

        // send updates
        Alerts.battle_event_simple(battle, 'end_turn', unit, current_ap - new_ap)
        Alerts.battle_update_unit(battle, unit)
        Alerts.battle_event_simple(battle, 'new_turn', next_unit, 0)
        return true
    }

    export function Move(battle: Battle, unit: Character, target: battle_position, ignore_flag: boolean) {
        let tmp = geom.minus(target, unit.position)
        var points_spent = geom.norm(tmp) * BattleValues.move_cost(unit)
        if (points_spent > unit.action_points_left) {
            tmp = geom.mult(geom.normalize(tmp), unit.action_points_left / BattleValues.move_cost(unit)) as battle_position
            points_spent = unit.action_points_left
        }
        const result = {x: tmp.x + unit.position.x, y: tmp.y + unit.position.y} as battle_position
        SetCoord(battle, unit, result)

        if (!ignore_flag) {
            // unit.action_points_left =  unit.action_points_left - points_spent as action_points
            Alerts.battle_event_target_position(battle, 'move', unit, unit.position, points_spent)
            Alerts.battle_update_unit(battle, unit)
        }
    }

    export function SetCoord(battle: Battle, unit: Character, target: battle_position) {
        unit.position.x = trim(target.x, -BattleValues.HALFWIDTH, BattleValues.HALFWIDTH)
        unit.position.y = trim(target.y, -BattleValues.HALFHEIGHT, BattleValues.HALFHEIGHT)
    }

    export function Charge(battle: Battle, unit: Character, target: Character) {
        if (unit.action_points_left < COST.CHARGE) {
            return
        }
        unit.action_points_left = unit.action_points_left - COST.CHARGE as action_points

        let dist = geom.dist(unit.position, target.position)
        if (dist > (unit.range() - 0.1)) {
            let direction = geom.minus(target.position, unit.position);
            let stop_before = geom.mult(geom.normalize(direction), unit.range() - 0.1);
            direction = geom.minus(direction, stop_before) as battle_position
            SetCoord(battle, unit, direction)
        }

        Alerts.battle_event_target_position(battle, 'move', unit, unit.position, COST.CHARGE)
    }

    // export function MagicBolt(battle: Battle, attacker: Character, defender: Character) {
    //     const AttackerCharacter = Convert.unit_to_character(attacker)
    //     const COST = 3
    //     if (!can_cast_magic_bolt(AttackerCharacter)) {
    //         return
    //     }
    //     if (attacker.action_points_left < COST) return

    //     const DefenderCharacter = Convert.unit_to_character(defender)
    //     attacker.action_points_left = attacker.action_points_left - COST as action_points
    //     let dist = geom.dist(attacker.position, defender.position)
    //     let response = Event.magic_bolt(AttackerCharacter, DefenderCharacter, dist, defender.dodge_turns > 0)

    //     switch(response) {
    //         case 'miss': Alerts.battle_event_target_unit(battle, 'miss', attacker, defender, COST); break;
    //         case 'ok': Alerts.battle_event_target_unit(battle, 'ranged_attack', attacker, defender, COST)
    //     }
    //     Alerts.battle_update_unit(battle, attacker)
    //     Alerts.battle_update_unit(battle, defender)
    // }

    export function Update(battle: Battle, unit: Character) {
        Alerts.battle_update_unit(battle, unit)
    }

    export function Dodge(battle: Battle, unit: Character) {
        if (!can_dodge(unit)) {
            return
        }

        if (unit.action_points_left < 4) {
            return
        }

        unit.dodge_turns = 2
        unit.action_points_left = unit.action_points_left - 4 as action_points
    }
}


//         if (action.action == 'push_back') {
//             if(!can_push_back(character)) {
//                 return {action: "not_learnt", who: unit_index}
//             }
//             if (action.target != null) {
//                 let unit2 = this.heap.get_unit(action.target);
//                 let char:Character = this.world.get_char_from_id(unit.character_id)

//                 if (unit.action_points_left < 5) {
//                     return { action: 'not_enough_ap', who: unit_index}
//                 }

//                 let range = char.get_range()
//                 let dist = geom.dist(unit.position, unit2.position)

//                 if (dist > range) {
//                     return { action: 'not_enough_range', who: unit_index}
//                 }

//                 let target_char = this.world.get_char_from_id(unit2.character_id);
//                 let dodge_flag = (unit2.dodge_turns > 0)


//                 let result =  character.attack(target_char, 'heavy', dodge_flag, dist);
//                 unit.action_points_left -= 5
//                 this.changed = true

//                 if (!(result.flags.evade || result.flags.miss)) {
//                     let a = unit.position
//                     let b = unit2.position
//                     let c = {x: b.x - a.x, y: b.y - a.y}
//                     let norm = Math.sqrt(c.x * c.x + c.y * c.y)
//                     let power_ratio = character.get_phys_power() / target_char.get_phys_power()
//                     let scale = range * power_ratio / norm / 2

//                     c = {x: c.x * scale, y: c.y * scale}

//                     unit2.position = {x: b.x + c.x, y: b.y + c.y}
//                 }

//                 return {action: 'attack', attacker: unit_index, target: action.target, result: result, actor_name: character.get_name()};
//             }

//             return { action: 'no_target_selected' };
//         }

//         if (action.action == 'fast_attack') {
//             if(!can_fast_attack(character)) {
//                 return {action: "not_learnt", who: unit_index}
//             }
//             if (action.target != null) {
//                 let unit2 = this.heap.get_unit(action.target);
//                 let char:Character = this.world.get_char_from_id(unit.character_id)

//                 if (unit.action_points_left < 1) {
//                     return { action: 'not_enough_ap', who: unit_index}
//                 }

//                 let dist = geom.dist(unit.position, unit2.position)

//                 if (dist > char.get_range()) {
//                     return { action: 'not_enough_range', who: unit_index}
//                 }

//                 let target_char = this.world.get_char_from_id(unit2.character_id);
//                 let dodge_flag = (unit2.dodge_turns > 0)

//                 let result =  character.attack(target_char, 'fast', dodge_flag, dist);
//                 unit.action_points_left -= 1
//                 this.changed = true
//                 return {action: 'attack', attacker: unit_index, target: action.target, result: result, actor_name: character.get_name()};
//             }

//             return { action: 'no_target_selected' };
//         }

//     }
