import { CharacterActionResponce } from "../../manager_classes/action_manager";
import type { CharacterGenericPart } from "../character_generic_part";


export const hunt = {
    check: async function(pool: any, char:CharacterGenericPart, data: any): Promise<CharacterActionResponce> {
        if (!char.in_battle()) {
            let cell = char.get_cell();
            if (cell == undefined) {
                return CharacterActionResponce.INVALID_CELL
            }
            if (cell.can_hunt()) {
                return CharacterActionResponce.OK
            } else {
                return CharacterActionResponce.NO_RESOURCE
            }
        } else return CharacterActionResponce.IN_BATTLE
    },

    result: async function(pool: any, char:CharacterGenericPart, data: any) {
        char.changed = true

        let skill = char.skills.hunt.practice
        let dice = Math.random()

        char.change_fatigue(10)

        if (dice * 100 > skill) {
            char.stash.inc(char.world.materials.MEAT, 1)
            char.change_blood(5)
            
        } else {
            let dice = Math.random()
            if (dice * 100 > skill) {
                char.skills.hunt.practice += 1
            }            
            char.change_stress(1)
        }
        
        char.send_status_update()
        char.send_stash_update()
    },

    start: async function(pool: any, char:CharacterGenericPart, data: any) {
    },
}