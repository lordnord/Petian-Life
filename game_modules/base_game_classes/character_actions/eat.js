"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eat = void 0;
function eat(char) {
    if (!char.in_battle()) {
        let tmp = char.stash.get('food');
        if (tmp > 0) {
            char.change_hp(10);
            char.stash.inc('food', -1);
        }
    }
}
exports.eat = eat;
