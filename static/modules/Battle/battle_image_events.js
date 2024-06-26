import { socket } from "../Socket/socket.js";
import { IMAGES } from "../load_images.js";
import { BattleImage, battle_canvas_context, camera, player_character_id, units_views } from "./battle_image.js";
import { position_c } from "./battle_image_helper.js";
import { BATTLE_MOVEMENT_SPEED } from "./constants.js";
const INSTANT_EVENT_DURATION = 1; //seconds
function new_log_message(msg) {
    if (msg == null) {
        return;
    }
    if (msg == 'ok')
        return;
    var log = document.getElementById('log');
    var new_line = document.createElement('p');
    var text = document.createTextNode(msg);
    new_line.append(text);
    log.appendChild(new_line);
    log.scrollTop = log.scrollHeight;
}
export class BattleImageEvent {
    constructor(event_id, character_id, ap_change, hp_change, duration) {
        this.unit = character_id;
        this.ap_change = ap_change;
        this.ap_change_left = ap_change;
        this.hp_change = hp_change;
        this.hp_change_left = hp_change;
        this.logged = false;
        this.event_id = event_id;
        this.time_passed = 0;
        this.duration = duration;
        // this.ap_before = unit.ap
    }
    /**
     * returns true if effect is finished
     * @param dt number: time passed
     */
    effect(dt) {
        if (!this.logged) {
            this.on_start();
            this.logged = true;
            let unit = units_views[this.unit];
            if (unit == undefined)
                return true;
            unit.hp = unit.hp + this.hp_change;
            unit.ap = unit.ap + this.ap_change;
            unit.ap_change = this.ap_change_left;
            unit.hp_change = this.hp_change_left;
            return false;
        }
        this.time_passed += dt;
        this.update(dt);
        if (this.time_passed >= this.duration) {
            this.ap_change_left = 0;
            this.hp_change_left = 0;
            return true;
        }
        this.ap_change_left = this.ap_change * (this.duration - this.time_passed) / this.duration;
        this.hp_change_left = this.hp_change * (this.duration - this.time_passed) / this.duration;
        let unit = units_views[this.unit];
        if (this.hp_change_left < -1) {
            unit.a_image.set_action('attacked');
        }
        else {
            unit.a_image.set_action('idle');
        }
        unit.ap_change = this.ap_change_left;
        unit.hp_change = this.hp_change_left;
        camera.x = Math.sin(this.hp_change_left / 4) * 30;
        return false;
    }
    /**
     * Set up data and logs it in chat for the event when it is updated for the first time
     */
    on_start() {
        new_log_message('some event');
    }
    /**
     * Updates data during event
     */
    update(dt) {
    }
    /**
     * Calculates required time to finish event
     * @returns Seconds required for an event
     */
    estimated_time_left() {
        return this.duration - this.time_passed;
    }
}
export class MoveEvent extends BattleImageEvent {
    constructor(event_id, character_id, ap_change, target) {
        const unit = units_views[character_id];
        let direction = position_c.diff(unit.position, target);
        let norm = position_c.norm(direction);
        super(event_id, character_id, ap_change, 0, norm / BATTLE_MOVEMENT_SPEED);
        this.target_position = target;
        this.total_distance = norm;
    }
    on_start() {
        let unit = units_views[this.unit];
        let message = unit.name + ' moved (' + this.target_position.x + ' ' + this.target_position.y + ')';
        // let unit= units_views[this.unit]
        let direction_vec = position_c.diff(this.target_position, unit.position);
        if (direction_vec.x < 0) {
            unit.orientation = 'left';
        }
        else {
            unit.orientation = 'right';
        }
        new_log_message(message);
    }
    update(dt) {
        const unit = units_views[this.unit];
        let direction = position_c.diff(this.target_position, unit.position);
        let norm = position_c.norm(direction);
        const move = position_c.scalar_mult(BATTLE_MOVEMENT_SPEED / norm * dt, direction);
        if (norm < BATTLE_MOVEMENT_SPEED * dt) {
            unit.position = this.target_position;
            unit.a_image.set_action('idle');
            if (player_character_id == unit.id) {
                socket.emit('req-flee-chance');
            }
        }
        else {
            unit.position = position_c.sum(unit.position, move);
            unit.a_image.set_action('move');
        }
    }
}
export class EndTurn extends BattleImageEvent {
    constructor(event_id, character_id, ap_change) {
        super(event_id, character_id, ap_change, 0, INSTANT_EVENT_DURATION);
        this.time_passed = 0;
    }
    on_start() {
        let unit = units_views[this.unit];
        if (unit != undefined)
            new_log_message('end turn' + unit.name);
        this.logged = true;
    }
}
export class NewUnitEvent extends BattleImageEvent {
    constructor(event_id, character_id, data) {
        super(event_id, character_id, 0, 0, 0);
        this.unit = character_id;
        this.data = data;
        this.time_passed = 0;
    }
    on_start() {
        let unit = units_views[this.unit];
        if (unit != undefined)
            return;
        BattleImage.load_unit(this.data);
        unit = units_views[this.unit];
        new_log_message('new fighter: ' + unit.name);
    }
}
export class UpdateDataEvent extends BattleImageEvent {
    constructor(event_id, character_id, data) {
        super(event_id, character_id, 0, 0, INSTANT_EVENT_DURATION);
        this.unit = character_id;
        this.data = data;
        this.type = 'update';
        this.time_passed = 0;
    }
    on_start() {
        let unit = units_views[this.unit];
        if (unit == undefined)
            return;
        new_log_message('update data of ' + unit.name);
        this.ap_change = this.data.ap - unit.ap;
        this.hp_change = this.data.hp - unit.hp;
        this.ap_change_left = this.ap_change;
        this.hp_change_left = this.hp_change;
        unit.range = this.data.range;
        let direction_vec = position_c.diff(this.data.position, unit.position);
        if (direction_vec.x < 0) {
            unit.orientation = 'left';
        }
        else if (direction_vec.x > 0) {
            unit.orientation = 'right';
        }
        unit.position = this.data.position;
        unit.next_turn = this.data.next_turn;
        BattleImage.update_unit_displays(unit.id);
    }
}
export class UnitLeftEvent extends BattleImageEvent {
    on_start() {
        BattleImage.unload_unit_by_id(this.unit);
    }
}
export class ClearBattleEvent extends BattleImageEvent {
    effect(dt) {
        console.log('clear battle');
        BattleImage.reset();
        return true;
    }
}
function get_attack_direction(a, d) {
    let hor = 'left';
    if (a.position.x < d.position.x) {
        hor = 'right';
    }
    let ver = 'up';
    if (a.position.y < d.position.y) {
        ver = 'down';
    }
    return hor + '_' + ver;
}
// write attack stages
// stand
// prepare
// hit
const ATTACK_DURATION = 2;
const STAND_UNTIL = 0.2;
const PREPARE_UNTIL = 1.8;
const HIT_UNTIL = 2;
export class AttackEvent extends BattleImageEvent {
    constructor(event_id, character_id, ap_change, hp_change, target_id) {
        super(event_id, character_id, ap_change, hp_change, ATTACK_DURATION);
        this.target = target_id;
    }
    on_start() {
        let unit_view_attacker = units_views[this.unit];
        let unit_view_defender = units_views[this.target];
        if (unit_view_attacker == undefined || unit_view_defender == undefined)
            return;
        let direction_vec = position_c.diff(unit_view_attacker.position, unit_view_defender.position);
        direction_vec = position_c.scalar_mult(1 / position_c.norm(direction_vec), direction_vec);
        if (direction_vec.x < 0) {
            unit_view_attacker.orientation = 'left';
        }
        else {
            unit_view_attacker.orientation = 'right';
        }
        unit_view_defender.current_animation = { type: 'attacked', data: { direction: direction_vec, dodge: false } };
        unit_view_attacker.current_animation = { type: 'attack', data: direction_vec };
        new_log_message(unit_view_attacker.name + ' attacks ' + unit_view_defender.name);
    }
    update(dt) {
        let attacker = units_views[this.unit];
        let defender = units_views[this.target];
        if (attacker == undefined || defender == undefined)
            return;
        if (this.time_passed <= STAND_UNTIL) {
            attacker.a_image.set_action('idle');
        }
        else if (this.time_passed <= PREPARE_UNTIL) {
            attacker.a_image.set_action('prepare');
        }
        else if (this.time_passed <= HIT_UNTIL) {
            attacker.a_image.set_action('attack');
            let position = position_c.battle_to_canvas(defender.position, camera);
            battle_canvas_context.drawImage(IMAGES['attack_' + 0], position.x - 50, position.y - 80, 100, 100);
        }
    }
}
export class RangedAttackEvent extends BattleImageEvent {
    constructor(event_id, character_id, ap_change, hp_change, target_id) {
        const unit = units_views[character_id];
        const unit2 = units_views[target_id];
        let direction = position_c.diff(unit.position, unit2.position);
        let norm = position_c.norm(direction);
        super(event_id, character_id, ap_change, hp_change, norm * 2);
        this.target = target_id;
    }
    on_start() {
        let unit_view_attacker = units_views[this.unit];
        let unit_view_defender = units_views[this.target];
        let direction_vec = position_c.diff(unit_view_attacker.position, unit_view_defender.position);
        direction_vec = position_c.scalar_mult(1 / position_c.norm(direction_vec), direction_vec);
        if (direction_vec.x < 0) {
            unit_view_attacker.orientation = 'left';
        }
        else {
            unit_view_attacker.orientation = 'right';
        }
        unit_view_defender.current_animation = { type: 'attacked', data: { direction: direction_vec, dodge: false } };
        unit_view_attacker.current_animation = { type: 'attack', data: direction_vec };
        new_log_message(unit_view_attacker.name + ' attacks ' + unit_view_defender.name);
    }
    update(dt) {
        let attacker = units_views[this.unit];
        let defender = units_views[this.target];
        const t = this.time_passed / this.duration;
        const A = position_c.battle_to_canvas(attacker.position, camera);
        const B = position_c.battle_to_canvas(defender.position, camera);
        const projx = A.x * (1 - t) + B.x * (t);
        const projy = A.y * (1 - t) + B.y * (t);
        battle_canvas_context.beginPath();
        battle_canvas_context.fillStyle = "rgba(200, 0, 0, 0.5)";
        battle_canvas_context.arc(projx, projy, 50, 0, 2 * Math.PI);
        battle_canvas_context.fill();
        if (this.time_passed <= STAND_UNTIL) {
            attacker.a_image.set_action('idle');
        }
        else if (this.time_passed <= PREPARE_UNTIL) {
            attacker.a_image.set_action('prepare');
        }
        else if (this.time_passed <= HIT_UNTIL) {
            attacker.a_image.set_action('attack');
            let position = position_c.battle_to_canvas(defender.position, camera);
            battle_canvas_context.drawImage(IMAGES['attack_' + 0], position.x - 50, position.y - 80, 100, 100);
        }
        else {
            attacker.a_image.set_action('idle');
        }
    }
}
// export class MissEvent {
//     type: 'miss'
//     character_id: character_id
//     target_id: character_id
//     constructor(unit: character_id, target: character_id) {
//         this.type = 'miss'
//         this.character_id = unit
//         this.target_id = target
//     }
//     effect() {
//         let unit_view_attacker = units_views[this.character_id]
//         let unit_view_defender = units_views[this.target_id]
//         let direction_vec = position_c.diff(unit_view_attacker.position, unit_view_defender.position)
//         direction_vec = position_c.scalar_mult(1/position_c.norm(direction_vec), direction_vec)
//         unit_view_defender.animation_sequence.push({type: 'attacked', data: {direction: direction_vec, dodge: true}})
//     }
//     generate_log_message():string {
//         let unit = units_data[this.character_id]
//         let target = units_data[this.target_id]
//         let result = unit.name + ' attacks ' + target.name + ': '
//         return result + ' MISS!';
//     }
// }
export class RetreatEvent extends BattleImageEvent {
    constructor(event_id, character_id, cost) {
        super(event_id, character_id, 0, 0, cost);
    }
    on_start() {
        let unit = units_views[this.unit];
        if (unit != undefined) {
            unit.killed = true;
        }
        if (this.unit == player_character_id) {
            new_log_message('You had retreated from the battle');
        }
        else {
            new_log_message(this.unit + 'had retreated from the battle');
        }
    }
}
export class NewTurnEvent extends BattleImageEvent {
    constructor(event_id, character_id, data) {
        super(event_id, character_id, 0, 0, INSTANT_EVENT_DURATION);
        this.unit = character_id;
        this.data = data;
        this.time_passed = 0;
    }
    on_start() {
        let time_passed = this.data.next_turn;
        BattleImage.set_current_turn(this.unit, time_passed);
    }
}
