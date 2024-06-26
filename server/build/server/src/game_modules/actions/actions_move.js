"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.move = void 0;
const system_1 = require("../map/system");
const events_1 = require("../events/events");
const system_2 = require("../character/system");
const types_1 = require("./types");
const data_objects_1 = require("../data/data_objects");
const data_id_1 = require("../data/data_id");
exports.move = {
    duration(char) {
        return system_2.CharacterSystem.movement_duration_map(char);
    },
    check: function (char, cell) {
        if (char.in_battle()) {
            return types_1.NotificationResponse.InBattle;
        }
        const data = data_objects_1.Data.World.id_to_coordinate(cell);
        if (system_1.MapSystem.can_move(data)) {
            let [x, y] = data_objects_1.Data.World.id_to_coordinate(char.cell_id);
            let dx = data[0] - x;
            let dy = data[1] - y;
            if (system_1.MapSystem.is_valid_move(dx, dy)) {
                return { response: 'OK' };
            }
            if ((dx == 0 && dy == 0)) {
                return { response: 'Notification:', value: "You have to select another tile" };
            }
            return { response: 'Notification:', value: "You can travel only to neighbouring tiles" };
        }
        return { response: 'Notification:', value: "You can't travel to this cell due to terrain" };
    },
    start: function (char, data) {
        char.next_cell = data;
    },
    result: function (character) {
        if (character.next_cell == undefined)
            return;
        const new_cell = character.next_cell;
        if (new_cell == undefined) {
            console.log('something wrong with movement');
            console.log(character.next_cell);
            return;
        }
        events_1.Event.move(character, data_id_1.DataID.Cells.main_location(new_cell));
    },
    is_move: true
};
