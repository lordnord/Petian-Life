"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rest = void 0;
exports.rest = {
    check: async function (pool, char, data) {
        if (!char.in_battle()) {
            let cell = char.get_cell();
            if (cell.can_rest()) {
                return 1 /* OK */;
            }
            return 3 /* NO_RESOURCE */;
        }
        return 2 /* IN_BATTLE */;
    },
    result: async function (pool, char, data) {
        char.changed = true;
        char.change_stress(-20);
        char.send_status_update();
    },
    start: async function (pool, char, data) {
    },
};
