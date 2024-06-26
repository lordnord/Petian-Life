import { Character } from "../character/character";
import { UI_Part } from "../client_communication/causality_graph";
import { UserManagement } from "../client_communication/user_manager";
import { location_id, character_id } from "@custom_types/ids";
import { ScriptedValue } from "../events/scripted_values";
import { trim } from "../calculations/basic_functions";
import { money } from "@custom_types/common";
import { cell_id } from "@custom_types/ids";
import { Trigger } from "../events/triggers";
import { skill } from "@custom_types/inventory";
import { MarketOrders } from "../market/system";
import { Perks } from "@custom_types/character";
import { DataID } from "../data/data_id";
import { Data } from "../data/data_objects";
import { LocationInterface } from "../location/location_interface";
import { EQUIP_SLOT, MATERIAL, MaterialConfiguration } from "@content/content";
import { Alerts } from "../client_communication/network_actions/alerts";
import { Status } from "../types";
import { Stash } from "../inventories/stash";


export const enum CHANGE_REASON {
    ATTACK = "Attack",
    REST = "Rest",
    EDUCATION = "Education",
    TRAVEL = "Travel",
    DODGE = "Dodging attempt",
    SHOOTING = "Shooting",
    RANGED_ATTACK = "Ranged attack",
    MAGIC_APPLICATION = "Application of magic",
    MAGIC_BOLT = "Magic bolt",
    FIGHTING = "Fighting",
    SKINNING = "Skinning enemies",
    HUNTING = "Hunting",
    FISHING = "Fishing",
    CLEANING = "Cleaning",
    GATHERING = "Gathering",
    WOODCUTTING = "Woodcutting",
    EATING = "Eating",
    CRAFTING = "Crafting",
    ENCHANTING = "Enchanting",
    EQUIPMENT_ENCHANT = "Equipment enchant",
    MOVED_TO_TRADE_STASH = "Moving to trade stash",
    TRADE = "Trade"
}

export namespace Effect {
    export namespace Update {
        export function cell_market(cell: cell_id) {
            const locals = DataID.Cells.local_character_id_list(cell)
            for (let item of locals) {
                const local_character = Data.Characters.from_id(item)
                UserManagement.add_user_to_update_queue(local_character.user_id, UI_Part.MARKET)
            }
        }
    }

    export function change_durability(character: Character, slot: EQUIP_SLOT, dx: number) {
        const item = character.equip.slot_to_item(slot)
        if (item == undefined) return
        item.durability += dx

        if (item.durability < 1) destroy_item(character, slot)

        UserManagement.add_user_to_update_queue(character.user_id, UI_Part.BELONGINGS)
    }

    export function destroy_item(character:Character, slot: EQUIP_SLOT) {
        character.equip.destroy_slot(slot)
        UserManagement.add_user_to_update_queue(character.user_id, UI_Part.BELONGINGS)
    }

    export namespace Transfer {
        export function savings(from: Character, to: Character, x: money, reason: CHANGE_REASON) {
            from.savings.transfer(to.savings, x)

            Alerts.Log.savings_transfer(from, to, x, reason)

            UserManagement.add_user_to_update_queue(from.user_id, UI_Part.SAVINGS)
            UserManagement.add_user_to_update_queue(to.user_id, UI_Part.SAVINGS)
        }

        export function stash(A: Character, B:Character, what: MATERIAL, amount: number, reason: CHANGE_REASON) {
            A.stash.transfer(B.stash, what, amount)
            Alerts.Log.material_transfer(A, B, what, amount, reason)

            UserManagement.add_user_to_update_queue(A.user_id, UI_Part.STASH)
            UserManagement.add_user_to_update_queue(B.user_id, UI_Part.STASH)
        }

        export function to_trade_stash(A: Character, material: MATERIAL, amount: number) {
            if (amount > 0) {
                if (A.stash.get(material) < amount) return false
                A.stash.transfer(A.trade_stash, material, amount)
                UserManagement.add_user_to_update_queue(A.user_id, UI_Part.STASH)
                Alerts.Log.to_trade_stash(A, material, amount)
                return true
            }

            if (amount < 0) {
                if (A.trade_stash.get(material) < -amount) return false
                A.trade_stash.transfer(A.stash, material, -amount)
                UserManagement.add_user_to_update_queue(A.user_id, UI_Part.STASH)
                Alerts.Log.from_trade_stash(A, material, -amount)
                return true
            }

            return true
        }

        export function to_trade_savings(A: Character, amount: money) {
            if (amount > 0) {
                if (A.savings.get() < amount) return false
                A.savings.transfer(A.trade_savings, amount)
                Alerts.Log.to_trade_savings(A, amount)
                return true
            }

            if (amount < 0) {
                if (A.trade_savings.get() < -amount) return false
                A.trade_savings.transfer(A.savings, -amount as money)
                Alerts.Log.from_trade_savings(A, -amount)
                return true
            }

            return true
        }
    }

    export namespace Set {
        export function status(character: Character, dstatus: Status, reason: CHANGE_REASON) {
            hp(character, dstatus.hp, reason)
            rage(character, dstatus.rage, reason);
            stress(character, dstatus.stress, reason);
            blood(character, dstatus.blood, reason);
            fatigue(character, dstatus.fatigue, reason)
        }

        export function fatigue(character: Character, x: number, reason: CHANGE_REASON) {
            if (!character._set_fatigue(x)) return;
            Alerts.Log.fatigue_set(character, x, reason)
            UserManagement.add_user_to_update_queue(character.user_id, UI_Part.FATIGUE);
        }

        export function stress(character: Character, x: number, reason: CHANGE_REASON) {
            if (!character._set_stress(x)) return;
            Alerts.Log.stress_set(character, x, reason)
            UserManagement.add_user_to_update_queue(character.user_id, UI_Part.STRESS);
        }

        export function hp(character: Character, x: number, reason: CHANGE_REASON) {
            if (!character._set_hp(x)) return;
            Alerts.Log.hp_set(character, x, reason)
            UserManagement.add_user_to_update_queue(character.user_id, UI_Part.HP);
        }

        export function rage(character: Character, x: number, reason: CHANGE_REASON) {
            if (!character._set_rage(x)) return;
            Alerts.Log.rage_set(character, x, reason)
            UserManagement.add_user_to_update_queue(character.user_id, UI_Part.RAGE);
        }

        export function blood(character: Character, x: number, reason: CHANGE_REASON) {
            if (!character._set_blood(x)) return;
            Alerts.Log.blood_set(character, x, reason)
            UserManagement.add_user_to_update_queue(character.user_id, UI_Part.BLOOD);
        }
    }

    export function transaction(        A: Character, B: Character,
                                        savings_A_to_B: money, stash_A_to_B: Stash,
                                        savings_B_to_A: money, stash_B_to_A: Stash, reason: CHANGE_REASON)
    {
        // transaction validation
        if (A.savings.get() < savings_A_to_B) return false
        if (B.savings.get() < savings_B_to_A) return false

        for (let material of MaterialConfiguration.MATERIAL) {
            if (A.stash.get(material) < stash_A_to_B.get(material)) return false
            if (B.stash.get(material) < stash_B_to_A.get(material)) return false
        }

        //transaction is validated, execution
        Transfer.savings(A, B, savings_A_to_B, reason)
        Transfer.savings(B, A, savings_B_to_A, reason)

        for (let material of MaterialConfiguration.MATERIAL) {
            Transfer.stash(A, B, material, stash_A_to_B.get(material), reason)
            Transfer.stash(B, A, material, stash_B_to_A.get(material), reason)
        }

        return true
    }

    export namespace Change {
        export function status(character: Character, dstatus: Status, reason: CHANGE_REASON) {
            hp(character, dstatus.hp, reason)
            rage(character, dstatus.rage, reason);
            stress(character, dstatus.stress, reason);
            blood(character, dstatus.blood, reason);
            fatigue(character, dstatus.fatigue, reason)
        }

        export function hp(character: Character, dx: number, reason: CHANGE_REASON) {
            if (!character._change_hp(dx)) return;
            Alerts.Log.hp_change(character, dx, reason)
            UserManagement.add_user_to_update_queue(character.user_id, UI_Part.HP);
        }

        export function fatigue(character: Character, dx: number, reason: CHANGE_REASON) {
            let prev = character.get_fatigue()
            let flag = character._change_fatigue(dx)
            let current = character.get_fatigue()
            let change = current - prev
            if ((dx - change > 0)) {
                stress(character, dx - change, reason)
            }
            if (Math.abs(change) > 0) Alerts.Log.fatigue_change(character, dx, reason)
            if (flag) UserManagement.add_user_to_update_queue(character.user_id, UI_Part.FATIGUE)
        }

        export function stress(character: Character, dx: number, reason: CHANGE_REASON) {
            if (!character._change_stress(dx)) return;
            Alerts.Log.stress_change(character, dx, reason)
            if (Math.abs(dx) > 0) UserManagement.add_user_to_update_queue(character.user_id, UI_Part.STRESS)
        }

        export function rage(character: Character, dx: number, reason: CHANGE_REASON) {
            if (!character._change_rage(dx)) return;
            Alerts.Log.rage_change(character, dx, reason)
            if (Math.abs(dx) > 0) UserManagement.add_user_to_update_queue(character.user_id, UI_Part.RAGE)
        }

        export function blood(character: Character, dx: number, reason: CHANGE_REASON) {
            if (!character._change_blood(dx)) return;
            Alerts.Log.blood_change(character, dx, reason)
            if (Math.abs(dx) > 0) UserManagement.add_user_to_update_queue(character.user_id, UI_Part.BLOOD)
        }

        export function skill(character: Character, skill: skill, dx: number, reason: CHANGE_REASON) {
            character._skills[skill] += dx
            if (character._skills[skill] > 100)
                character._skills[skill] = 100
            else
                Alerts.Log.skill_change(character, skill, dx, reason);

            if (Math.abs(dx) > 0) UserManagement.add_user_to_update_queue(character.user_id, UI_Part.SKILLS)
        }
    }

    export function learn_perk(student: Character, perk: Perks){
        student._perks[perk] = true
        UserManagement.add_user_to_update_queue(student.user_id, UI_Part.SKILLS)
    }

    export function enter_location(character_id: character_id, location_id: location_id) {
        let character = Data.Characters.from_id(character_id)
        let response = Trigger.location_is_available(character_id, location_id)
        if (response.response == 'ok') {
            _enter_location(character_id, location_id)
        }
        return response
    }

    function _enter_location(character_id: character_id, location_id: location_id) {
        let character = Data.Characters.from_id(character_id)
        character.location_id = location_id

        //console.log("???")

        UserManagement.add_user_to_update_queue(character.user_id, UI_Part.MAP_POSITION)
    }

    export function location_quality_reduction_roll(location: LocationInterface) {
        if (location.has_house_level == 0) return;
        if (Math.random() > 0.9) {
            location.devastation = trim(location.devastation + 1, 0, ScriptedValue.max_devastation)
        }
    }

    export function location_repair(location: LocationInterface, x: number) {
        location.devastation = trim(location.devastation - x, 0, ScriptedValue.max_devastation)
    }

    export function rest_location_tick(character: Character) {
        let location = Data.Locations.from_id(character.location_id)

        if (location.owner_id != character.id) {
            return
        }

        const tier = ScriptedValue.rest_tier(character, location)
        let fatigue_target = ScriptedValue.rest_target_fatigue(tier, ScriptedValue.max_devastation - location.devastation, character.race)
        let stress_target = ScriptedValue.rest_target_stress(tier, ScriptedValue.max_devastation - location.devastation, character.race)
        if (fatigue_target < character.get_fatigue()) {
            let fatigue_change = trim(-5, fatigue_target - character.get_fatigue(), 0)
            Effect.Change.fatigue(character, fatigue_change, CHANGE_REASON.REST)
        }

        if (stress_target < character.get_stress()) {
            let stress_change = trim(-5, stress_target - character.get_stress(), 0)
            Effect.Change.stress(character, stress_change, CHANGE_REASON.REST)
        }

        location_quality_reduction_roll(location)
    }

    export function spoilage(character: Character, good: MATERIAL, rate: number) {
        let dice = Math.random()
        if (dice < rate) {
            let current_amount = character.stash.get(good)
            let integer = (Math.random() < 0.5) ? 1 : 0
            let spoiled_amount = Math.max(integer, Math.floor(current_amount * rate))
            character.stash.set(good, current_amount - spoiled_amount)
            UserManagement.add_user_to_update_queue(character.user_id, UI_Part.STASH)
            let orders = DataID.Character.market_orders_list(character.id)
            for (let order of orders) {
                let order_item = Data.MarketOrders.from_id(order)
                const current_amount = order_item.amount
                if (order_item.material != good) continue
                let spoiled_amount = Math.min(current_amount, Math.max(integer, Math.floor(current_amount * 0.01)))
                MarketOrders.decrease_amount(order, spoiled_amount)
            }
            Update.cell_market(character.cell_id)
        }
    }


}