import { Character } from "../../../base_game_classes/character/character";
import {ActionTargeted, CharacterActionResponce} from '../../action_manager'
import { MapSystem } from "../../../map/system";
import { Convert, Link, Unlink } from "../../../systems_communication";
import { UserManagement } from "../../../client_communication/user_manager";
import { UI_Part } from "../../../client_communication/causality_graph";

export const move:ActionTargeted ={
    duration(char: Character) {
        return 1 + char.get_fatigue() / 30;
    },

    check: function (char: Character, data: [number, number]) {
        if (char.in_battle()) {
            return CharacterActionResponce.IN_BATTLE
        }
        console.log('attempt to move')
        console.log(data)
        console.log(MapSystem.can_move(data))
        if (MapSystem.can_move(data)) {
            let [x, y] = MapSystem.id_to_coordinate(char.cell_id)
            let dx = data[0] - x;
            let dy = data[1] - y;
            console.log(dx, dy)
            console.log(x, y)
            console.log(char.cell_id)
            console.log(MapSystem.is_valid_move(dx, dy))
            if (MapSystem.is_valid_move(dx, dy)) {
                return CharacterActionResponce.OK
            }
            if ((dx == 0 && dy ==0)) {
                return CharacterActionResponce.ZERO_MOTION
            }
            return CharacterActionResponce.CANNOT_MOVE_THERE
        }
        return CharacterActionResponce.CANNOT_MOVE_THERE
    },

    start: function (char: Character, data: any) {
        char.next_cell = data
    },

    result: function (character: Character) {
        if (character.next_cell == undefined) return
        const new_cell = MapSystem.coordinate_to_cell(character.next_cell)
        if (new_cell == undefined) {
            console.log('something wrong with movement')
            console.log(character.next_cell)
            return
        }
        const old_cell = Convert.character_to_cell(character)
        Unlink.character_and_cell(character, old_cell)
        Link.character_and_cell(character, new_cell)

        // effect on fatigue
        character.change('fatigue', 2);

        //check if it is user and you need to update status
        const user = Convert.character_to_user(character)
        if (user != undefined) {
            UserManagement.add_user_to_update_queue(user.data.id, UI_Part.STATUS)
        }
    },

    is_move: true
}