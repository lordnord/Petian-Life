import { ActionPositionKeys, ActionUnitKeys, battle_position, unit_id } from "../../../../../shared/battle_data";
import { ActionManager } from "../../actions/manager";
import { CharacterAction } from "../../actions/actions_00";
import { Battle } from "../../battle/classes/battle";
import { BattleEvent } from "../../battle/events";
import { BattleSystem } from "../../battle/system";
// import { Perks } from "../../character/Perks";
import { can_dodge } from "../../character/checks";
import { EventInventory } from "../../events/inventory_events";
import { Convert } from "../../systems_communication";
import { SocketWrapper, User } from "../user";
import { UserManagement } from "../user_manager";
import { Alerts } from "./alerts";
import { CharacterMapAction, TriggerResponse } from "../../actions/types";
import { Data } from "../../data";
import { battle_action_position, battle_action_self, battle_action_unit } from "../../battle/actions";
import { Validator } from "./common_validations";

export namespace HandleAction {
    function response_to_alert(user: User, response: TriggerResponse) {
        // console.log(response.response)
        switch(response.response) {
            case "TIRED": return 
            case "NO_RESOURCE": return Alerts.not_enough_to_user(user, 'something', undefined, undefined, undefined)
            case "IN_BATTLE": return Alerts.in_battle(user)
            case "OK": return
            case "ZERO_MOTION": return Alerts.impossible_move(user)
            case "INVALID_MOTION": return Alerts.impossible_move(user)
            case "IMPOSSIBLE_ACTION":return 
            case "ALREADY_IN_AN_ACTION": return 
        }
    }
    export function move(sw: SocketWrapper, data: {x: unknown, y: unknown}) {
        // do not handle unlogged or characterless
        if (sw.user_id == '#') return
        const user = UserManagement.get_user(sw.user_id)
        const character = Convert.user_to_character(user)
        if (character == undefined) return

        // sanitise data
        const x = Number(data.x)
        const y = Number(data.y)
        if ((Number.isNaN(x)) || (Number.isNaN(y))) {
            return
        }

        const destination: [number, number] = [x, y]
        const cell = Data.World.coordinate_to_id(destination)
        let response = ActionManager.start_action(CharacterAction.MOVE, character, cell)
        response_to_alert(user, response)
    }

    export function act(sw: SocketWrapper, action: CharacterMapAction) {
        // do not handle unlogged or characterless
        if (sw.user_id == '#') return
        const user = UserManagement.get_user(sw.user_id)
        const character = Convert.user_to_character(user)
        if (character == undefined) return

        const destination = character.cell_id
        let response = ActionManager.start_action(action, character, destination)
        // console.log(response)
        response_to_alert(user, response)
    }

    export function battle_self(sw: SocketWrapper, tag: unknown) {
        console.log('action self', tag)
        if (typeof tag != 'string') return

        const [user, character] = Convert.socket_wrapper_to_user_character(sw)
        if (character == undefined) return
        if (!character.in_battle()) return

        const battle =   Convert.character_to_battle(character)
        if (battle == undefined) return
        const unit =     Convert.character_to_unit(character)
        if (unit == undefined) return

        if (!battle.waiting_for_input) {
            console.log('not waiting for input')
            return
        }
        if (battle.heap.get_selected_unit()?.id != unit.id) {
            console.log('not selected unit')
            return
        }

        console.log('action is validated')
        battle_action_self(tag, battle, character, unit)
    }

    export function battle_unit(sw: SocketWrapper, action: unknown) {
        console.log('action unit', action)
        if (!Validator.is_tag_value(action)) {
            return
        }  

        const [user, character] = Convert.socket_wrapper_to_user_character(sw)
        if (character == undefined) return
        if (!character.in_battle()) return

        const battle =   Convert.character_to_battle(character)
        if (battle == undefined) return
        const unit =     Convert.character_to_unit(character)
        if (unit == undefined) return

        if (!battle.waiting_for_input) {
            return
        }
        if (battle.heap.get_selected_unit()?.id != unit.id) {
            return
        }

        const target_unit = battle.heap.get_unit(action.target as unit_id)
        if (target_unit == undefined) return 
        const target_character = Convert.unit_to_character(target_unit)

        battle_action_unit(action.tag as ActionUnitKeys, battle, character, unit, target_character, target_unit)
    }

    export function battle_position(sw: SocketWrapper, action: unknown) {
        console.log('action position', action)
        if (!Validator.is_tag_point(action)) return;

        const [user, character] = Convert.socket_wrapper_to_user_character(sw)
        if (character == undefined) return
        if (!character.in_battle()) return

        const battle =   Convert.character_to_battle(character)
        if (battle == undefined) return
        const unit =     Convert.character_to_unit(character)
        if (unit == undefined) return

        if (!battle.waiting_for_input) {
            return
        }
        if (battle.heap.get_selected_unit()?.id != unit.id) {
            return
        }

        const target = action.target as battle_position

        battle_action_position(action.tag as ActionPositionKeys, battle, character, unit, target)
    }



    // export function battle(sw:SocketWrapper, input: {action: unknown, target: unknown}) {
    //     const [user, character] = Convert.socket_wrapper_to_user_character(sw)
    //     if (character == undefined) return
    //     if (!character.in_battle()) return

    //     const battle =   Convert.character_to_battle(character)
    //     if (battle == undefined) return
    //     const unit =     Convert.character_to_unit(character)
    //     if (unit == undefined) return

    //     if (!battle.waiting_for_input) {
    //         return
    //     }
    //     if (battle.heap.get_selected_unit()?.id != unit.id) {
    //         return
    //     }
    //     if (input == undefined) return;
    //     if (input.action == undefined) return;

    //     if (input.action == 'move') {
    //         if (input.target == undefined) return

    //         const target = input.target as battle_position
    //         if (target.x == undefined) return;
    //         if (isNaN(target.x)) return;
    //         if (target.y == undefined) return;
    //         if (isNaN(target.y)) return;

    //         BattleEvent.Move(battle, unit, character, target)
    //     } else if (input.action == 'attack_slice') {
    //         if (input.target == undefined) return
    //         const defender_id = input.target as unit_id
    //         const defender = BattleSystem.id_to_unit(defender_id, battle)
    //         if (defender == undefined) return undefined
    //         const character_defender = Convert.unit_to_character(defender)
    //         battle_action_unit('Slash', battle, character, unit,character_defender, defender)
    //         // BattleEvent.Attack(battle, unit, defender, 'slice')
    //     } else if (input.action == 'attack_blunt') {
    //         if (input.target == undefined) return
    //         const defender_id = input.target as unit_id
    //         const defender = BattleSystem.id_to_unit(defender_id, battle)
    //         if (defender == undefined) return undefined
            
    //         const character_defender = Convert.unit_to_character(defender)
    //         battle_action_unit('Knock', battle, character, unit,character_defender, defender)
    //     } else if (input.action == 'attack_pierce') {
    //         if (input.target == undefined) return
    //         const defender_id = input.target as unit_id
    //         const defender = BattleSystem.id_to_unit(defender_id, battle)
    //         if (defender == undefined) return undefined
            
    //         const character_defender = Convert.unit_to_character(defender)
    //         battle_action_unit('Pierce', battle, character, unit,character_defender, defender)
    //     } else if (input.action == 'end_turn') {
    //         BattleEvent.EndTurn(battle, unit)
    //     // else if (input.action == 'fast_attack') {
    //     //     if(!can_fast_attack(character)) {
    //     //         return {action: "not_learnt"}
    //     //     }
    //     //     return  battle.action(index, BattleAI.convert_attack_to_action(battle, index, input.target, 'fast'))
    //     } else if (input.action == 'dodge') {
    //         if(!can_dodge(character)) {
    //             return {action: "not_learnt"}
    //         }
    //         return BattleEvent.Dodge(battle, unit)
    //     // } else if (input.action == 'push_back') {
    //     //     if(!can_push_back(character)) {
    //     //         return {action: "not_learnt"}
    //     //     }
    //     //     return  battle.action(index, {action: 'push_back', target: input.target})
    //     } else if (input.action == 'magic_bolt') {
    //         if (input.target == undefined) return
    //         const defender_id = input.target as unit_id
    //         const defender = BattleSystem.id_to_unit(defender_id, battle)
    //         return BattleEvent.MagicBolt(battle, unit, defender)
    //     } else if (input.action == 'shoot') { 
    //         if (input.target == undefined) return
    //         const defender_id = input.target as unit_id
    //         const defender = BattleSystem.id_to_unit(defender_id, battle)
    //         battle_action_unit('Ranged', battle, character, unit,character, defender)
    //     } else if (input.action == 'flee') {
    //         battle_action_self('Flee', battle, character, unit)
    //         // BattleEvent.Flee(battle, unit)
    //     } else if (input.action == 'switch_weapon') {
    //         EventInventory.switch_weapon(character)
    //         BattleEvent.Update(battle, unit)
    //     } else {
    //         return  
    //     }
    // }
}

    //  move(user: User, data: {x: number, y: number}) {
    //     if (!user.logged_in) {
    //         return 
    //     }
    //     let char = user.get_character();

    // }