import { PerksResponse } from "@custom_types/responses"
import { Convert } from "../../systems_communication"
import { SocketWrapper } from "../user"
import { perk_price } from "../../prices/perk_base_price"
import { ResponseNegativeQuantified, Trigger } from "../../events/triggers"
import { CharacterSystem } from "../../character/system"
import { Perks } from "@custom_types/character"
import { skill_price } from "../../prices/skill_price"
import { can_talk, is_enemy_characters } from "../../SYSTEM_REPUTATION"
import { Character } from "../../character/character"
import { skill } from "@custom_types/inventory"
import { Data } from "../../data/data_objects"
import { DataID } from "../../data/data_id"

export namespace Dialog {
    function talking_check(sw: SocketWrapper, character_id: unknown): [undefined, undefined]|[Character, Character]  {
        const [user, character] = Convert.socket_wrapper_to_user_character(sw)
        if (typeof character_id != 'number') {
            sw.socket.emit('alert', 'invalid character id')
            return [undefined, undefined]
        }
        if (character == undefined) {
            sw.socket.emit('alert', 'your character does not exist')
            return [undefined, undefined]
        }
        let target_character = Data.Characters.from_number(character_id)
        if (target_character == undefined) {
            sw.socket.emit('alert', 'character does not exist')
            return [undefined, undefined]
        }
        if (character.cell_id != target_character.cell_id) {
            user.socket.emit('alert', 'not in the same cell')
            return [undefined, undefined]
        }
        if (character_id == character.id) {
            user.socket.emit('alert', "can't talk with yourself")
            return [undefined, undefined]
        }
        if (!can_talk(character, target_character)) {
            user.socket.emit('alert', "can't talk with enemies or creatures of different race")
            return  [undefined, undefined]
        }


        return [character, target_character]
    }

    export function request_prices(sw: SocketWrapper, character_id: unknown) {
        const [character, target_character] = talking_check(sw, character_id)
        if ((character == undefined || target_character == undefined)) {
            return
        }

        let data_buy = Object.fromEntries(target_character.ai_price_belief_buy)
        let data_sell = Object.fromEntries(target_character.ai_price_belief_sell)

        // console.log(data_buy, data_sell)

        sw.socket.emit('character-prices', {buy: data_buy, sell: data_sell})
    }


    export function request_greeting(sw: SocketWrapper, character_id: unknown) {
        const [character, target_character] = talking_check(sw, character_id)
        if ((character == undefined || target_character == undefined)) {
            return
        }

        // if (target_character.dead()) return

        let data = target_character._perks
        let response: PerksResponse = {
            name: target_character.get_name(),
            race: target_character.race,
            factions: DataID.Reputation.character(target_character.id).map(Convert.reputation_to_socket),
            current_goal: target_character.ai_state,
            perks: {},
            skills: {},
            model: target_character.model,
            equip: target_character.equip_models()
        }
        for (let perk of Object.keys(data) ) {
            if (data[perk as Perks] == true) {
                response.perks[perk as Perks] = perk_price(perk as Perks, character, target_character)
            }
        }
        for (let skill of Object.keys(target_character._skills)) {
            let teaching_response = Trigger.can_learn_from(character, target_character, skill as skill)
            if (teaching_response.response == 'ok' || teaching_response.response == ResponseNegativeQuantified.Money) {
                const teacher_skill = CharacterSystem.skill(target_character, skill as skill)
                response.skills[skill as skill] = [
                    teacher_skill,
                    skill_price(skill as skill, character, target_character)
                ]
            }
        }
        sw.socket.emit('perks-info', response)
    }
}