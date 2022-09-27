"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flee_chance = exports.BattleReworked2 = exports.UnitData = void 0;
const stash_1 = require("./base_game_classes/inventories/stash");
var common = require("./common.js");
var { constants } = require("./static_data/constants.js");
const geom_1 = require("./geom");
const battle_ai_1 = require("./battle_ai");
const character_1 = require("./base_game_classes/character/character");
const materials_manager_1 = require("./manager_classes/materials_manager");
const savings_1 = require("./base_game_classes/savings");
class UnitsHeap {
    constructor() {
        this.data = [];
        this.heap = [];
        this.last = 0;
        this.selected = -1;
        this.changed = false;
    }
    get_value(i) {
        return this.data[this.heap[i]].next_turn_after;
    }
    get_units_amount() {
        return this.data.length;
    }
    get_unit(i) {
        return this.data[i];
    }
    get_selected_unit() {
        return this.data[this.selected];
    }
    push(obj) {
        this.heap[this.last] = obj;
        this.last += 1;
        this.shift_up(this.last - 1);
        this.changed = true;
    }
    shift_up(i) {
        let tmp = i;
        while (tmp > 0 && this.get_value(tmp) < this.get_value(Math.floor((tmp - 1) / 2))) {
            this.swap(tmp, Math.floor((tmp - 1) / 2));
            tmp = Math.floor((tmp - 1) / 2);
        }
        this.changed = true;
    }
    shift_down(i) {
        let tmp = i;
        while (tmp * 2 + 1 < this.last) {
            if (tmp * 2 + 2 < this.last) {
                if ((this.get_value(tmp * 2 + 2) < this.get_value(tmp * 2 + 1)) && (this.get_value(tmp * 2 + 2) < this.get_value(tmp))) {
                    this.swap(tmp, tmp * 2 + 2);
                    tmp = tmp * 2 + 2;
                }
                else if (this.get_value(tmp * 2 + 1) < this.get_value(tmp)) {
                    this.swap(tmp, tmp * 2 + 1);
                    tmp = tmp * 2 + 1;
                }
                else {
                    break;
                }
            }
            else if (this.get_value(tmp * 2 + 1) < this.get_value(tmp)) {
                this.swap(tmp, tmp * 2 + 1);
                tmp = tmp * 2 + 1;
            }
            else {
                break;
            }
        }
        this.changed = true;
    }
    add_unit(u) {
        this.data.push(u);
        this.push(this.data.length - 1);
        this.changed = true;
    }
    swap(a, b) {
        let s = this.heap[a];
        this.heap[a] = this.heap[b];
        this.heap[b] = s;
        this.changed = true;
    }
    pop() {
        if (this.last == 0) {
            return undefined;
        }
        let tmp = this.heap[0];
        this.selected = tmp;
        this.last -= 1;
        this.heap[0] = this.heap[this.last];
        this.heap.length = this.last;
        this.shift_down(0);
        this.changed = true;
        return tmp;
    }
    update(dt) {
        for (let i in this.data) {
            this.data[i].update(dt);
        }
        this.changed = true;
    }
    get_json() {
        return {
            data: this.data,
            last: this.last,
            heap: this.heap,
            selected: this.selected
        };
    }
    load_from_json(j) {
        for (let i in j.data) {
            let unit = new UnitData();
            unit.load_from_json(j.data[i]);
            this.data.push(unit);
        }
        this.last = j.last;
        this.heap = j.heap;
        this.selected = j.selected;
    }
}
class UnitData {
    constructor() {
        this.action_points_left = 0;
        this.action_points_max = 0;
        this.initiative = 100;
        this.speed = 0;
        this.next_turn_after = 100;
        this.position = { x: 0, y: 0 };
        this.char_id = -1;
        this.team = -1;
        this.dead = true;
        this.dodge_turns = 0;
    }
    init(char, position, team) {
        let ap = char.get_action_points();
        this.action_points_left = ap;
        this.action_points_max = ap;
        this.initiative = char.get_initiative();
        this.speed = char.get_speed();
        this.next_turn_after = char.get_initiative();
        this.position = position;
        this.char_id = char.id;
        this.team = team;
        this.dead = false;
        this.dodge_turns = 0;
    }
    load_from_json(data) {
        this.action_points_left = data.action_points_left;
        this.action_points_max = data.action_points_max;
        this.initiative = data.initiative;
        this.speed = data.speed;
        this.next_turn_after = data.next_turn_after;
        this.position = data.position;
        this.char_id = data.char_id;
        this.team = data.team;
        this.dead = data.dead;
        this.dodge_turns = data.dodge_turns;
    }
    update(dt) {
        this.next_turn_after = this.next_turn_after - dt;
    }
    end_turn() {
        this.next_turn_after = this.initiative;
        this.action_points_left = Math.min((this.action_points_left + this.speed), this.action_points_max);
        this.dodge_turns = Math.max(0, this.dodge_turns - 1);
    }
}
exports.UnitData = UnitData;
class BattleReworked2 {
    constructor(world) {
        this.heap = new UnitsHeap();
        this.world = world;
        this.id = -1;
        this.savings = new savings_1.Savings();
        this.stash = new stash_1.Stash();
        this.changed = false;
        this.waiting_for_input = false;
        this.draw = false;
        this.ended = false;
        this.last_turn = Date.now(); //milliseconds
    }
    init(pool) {
        this.id = await this.load_to_db(pool);
        this.last_turn = Date.now();
        return this.id;
    }
    load_to_db(pool) {
        // @ts-ignore: Unreachable code error
        if (global.flag_nodb) {
            // @ts-ignore: Unreachable code error
            global.last_id += 1;
            // @ts-ignore: Unreachable code error
            return global.last_id;
        }
        let res = await common.send_query(pool, constants.new_battle_query, [this.heap.get_json(), this.savings.get_json(), this.stash.get_json(), this.waiting_for_input]);
        return res.rows[0].id;
    }
    load_from_json(data) {
        this.id = data.id;
        this.heap.load_from_json(data.heap);
        this.savings.load_from_json(data.savings);
        this.stash.load_from_json(data.stash);
        this.waiting_for_input = data.waiting_for_input;
    }
    save_to_db(pool) {
        await common.send_query(pool, constants.update_battle_query, [this.id, this.heap.get_json(), this.savings.get_json(), this.stash.get_json(), this.waiting_for_input]);
        this.changed = false;
        this.heap.changed = false;
    }
    delete_from_db(pool) {
        await common.send_query(pool, constants.delete_battle_query, [this.id]);
    }
    // networking
    send_data_start() {
        this.world.socket_manager.send_battle_data_start(this);
        if (this.waiting_for_input) {
            this.send_action({ action: 'new_turn', target: this.heap.selected });
        }
    }
    send_update() {
        this.world.socket_manager.send_battle_update(this);
        if (this.waiting_for_input) {
            this.send_action({ action: 'new_turn', target: this.heap.selected });
        }
    }
    send_current_turn() {
        this.send_action({ action: 'new_turn', target: this.heap.selected });
    }
    send_action(a) {
        this.world.socket_manager.send_battle_action(this, a);
    }
    send_stop() {
        this.world.socket_manager.send_stop_battle(this);
    }
    update(pool) {
        if (this.changed || this.heap.changed) {
            this.save_to_db(pool);
        }
        let current_time = Date.now();
        if (current_time - this.last_turn > 60 * 1000) {
            let unit = this.heap.get_selected_unit();
            let char = this.get_char(unit);
            let res = await this.process_input(pool, char.get_in_battle_id(), { action: 'end_turn' });
            this.send_action(res);
            this.send_update();
        }
        if ((!this.waiting_for_input)) {
            this.last_turn = current_time;
            // heap manipulations
            let tmp = this.heap.pop();
            if (tmp == undefined) {
                return { responce: 'no_units_left' };
            }
            let unit = this.heap.get_unit(tmp);
            let time_passed = unit.next_turn_after;
            this.heap.update(time_passed);
            //character stuff
            let char = this.world.get_char_from_id(unit.char_id);
            if ((char == undefined) || char.is_dead()) {
                return { responce: 'dead_unit' };
            }
            await char.update(pool, 0);
            let dt = unit.next_turn_after;
            this.heap.update(dt);
            if (char.is_dead()) {
                unit.dead = true;
                return { responce: 'char_is_dead' };
            }
            this.send_action({ action: 'new_turn', target: tmp });
            //actual actions
            if (char.is_player()) {
                this.waiting_for_input = true;
                this.changed = true;
                return { responce: 'waiting_for_input' };
            }
            else {
                let log_obj = [];
                await this.make_turn(pool);
                unit.end_turn();
                this.heap.push(tmp);
                this.changed = true;
                return { responce: 'end_turn', data: log_obj };
            }
        }
        else {
            return { responce: 'waiting_for_input' };
        }
    }
    get_units() {
        return this.heap.data;
    }
    get_unit(i) {
        return this.heap.get_unit(i);
    }
    get_char(unit) {
        return this.world.get_char_from_id(unit.char_id);
    }
    make_turn(pool) {
        let unit = this.heap.get_selected_unit();
        let char = this.get_char(unit);
        let action = battle_ai_1.BattleAI.action(this, unit, char);
        while (action.action != 'end_turn') {
            let logged_action = await this.action(pool, this.heap.selected, action);
            this.send_action(logged_action);
            this.send_update();
            action = battle_ai_1.BattleAI.action(this, unit, char);
        }
        this.changed = true;
    }
    action(pool, unit_index, action) {
        console.log('battle action');
        console.log(action);
        let unit = this.heap.get_unit(unit_index);
        var character = this.world.get_char_from_id(unit.char_id);
        //no action
        if (action.action == null) {
            return { action: 'pff', who: unit_index };
        }
        //move toward enemy
        if (action.action == 'move') {
            let tmp = geom_1.geom.minus(action.target, unit.position);
            let MOVE_COST = 3;
            if (geom_1.geom.norm(tmp) * MOVE_COST > unit.action_points_left) {
                tmp = geom_1.geom.mult(geom_1.geom.normalize(tmp), unit.action_points_left / MOVE_COST);
            }
            unit.position.x = tmp.x + unit.position.x;
            unit.position.y = tmp.y + unit.position.y;
            let points_spent = geom_1.geom.norm(tmp) * MOVE_COST;
            unit.action_points_left -= points_spent;
            this.changed = true;
            return { action: 'move', who: unit_index, target: unit.position, actor_name: character.name };
        }
        if (action.action == 'attack') {
            if (action.target != null) {
                let unit2 = this.heap.get_unit(action.target);
                let char = this.world.get_char_from_id(unit.char_id);
                if (unit.action_points_left < 3) {
                    return { action: 'not_enough_ap', who: unit_index };
                }
                let dist = geom_1.geom.dist(unit.position, unit2.position);
                if (dist > char.get_range()) {
                    return { action: 'not_enough_range', who: unit_index };
                }
                let target_char = this.world.get_char_from_id(unit2.char_id);
                let dodge_flag = (unit2.dodge_turns > 0);
                let result = await character.attack(pool, target_char, 'usual', dodge_flag, dist);
                unit.action_points_left -= 3;
                this.changed = true;
                return { action: 'attack', attacker: unit_index, target: action.target, result: result, actor_name: character.name };
            }
            return { action: 'no_target_selected' };
        }
        if (action.action == 'shoot') {
            if (!(0, character_1.can_shoot)(character)) {
                return { action: "not_learnt", who: unit_index };
            }
            if (action.target == null) {
                return { action: 'no_target_selected', who: unit_index };
            }
            if (unit.action_points_left < 3) {
                return { action: 'not_enough_ap', who: unit_index };
            }
            let target_unit = this.heap.get_unit(action.target);
            let target_char = this.world.get_char_from_id(target_unit.char_id);
            let dodge_flag = (target_unit.dodge_turns > 0);
            let dist = geom_1.geom.dist(unit.position, target_unit.position);
            character.stash.inc(materials_manager_1.ARROW_BONE, -1);
            let result = await character.attack(pool, target_char, 'ranged', dodge_flag, dist);
            unit.action_points_left -= 3;
            this.changed = true;
            return { action: 'attack', attacker: unit_index, target: action.target, result: result, actor_name: character.name };
        }
        if (action.action == 'magic_bolt') {
            if (!(0, character_1.can_cast_magic_bolt)(character)) {
                // console.log('???')
                return { action: "not_learnt", who: unit_index };
            }
            if (action.target == null) {
                return { action: 'no_target_selected', who: unit_index };
            }
            if (unit.action_points_left < 3) {
                return { action: 'not_enough_ap', who: unit_index };
            }
            let target_unit = this.heap.get_unit(action.target);
            let target_char = this.world.get_char_from_id(target_unit.char_id);
            if (character.skills.perks.magic_bolt != true) {
                character.stash.inc(materials_manager_1.ZAZ, -1);
            }
            let result = await character.spell_attack(pool, target_char, 'bolt');
            unit.action_points_left -= 3;
            this.changed = true;
            return { action: 'attack', attacker: unit_index, target: action.target, result: result, actor_name: character.name };
        }
        if (action.action == 'push_back') {
            if (!(0, character_1.can_push_back)(character)) {
                return { action: "not_learnt", who: unit_index };
            }
            if (action.target != null) {
                let unit2 = this.heap.get_unit(action.target);
                let char = this.world.get_char_from_id(unit.char_id);
                if (unit.action_points_left < 5) {
                    return { action: 'not_enough_ap', who: unit_index };
                }
                let range = char.get_range();
                let dist = geom_1.geom.dist(unit.position, unit2.position);
                if (dist > range) {
                    return { action: 'not_enough_range', who: unit_index };
                }
                let target_char = this.world.get_char_from_id(unit2.char_id);
                let dodge_flag = (unit2.dodge_turns > 0);
                let result = await character.attack(pool, target_char, 'heavy', dodge_flag, dist);
                unit.action_points_left -= 5;
                this.changed = true;
                if (!(result.flags.evade || result.flags.miss)) {
                    let a = unit.position;
                    let b = unit2.position;
                    let c = { x: b.x - a.x, y: b.y - a.y };
                    let norm = Math.sqrt(c.x * c.x + c.y * c.y);
                    let power_ratio = character.get_phys_power() / target_char.get_phys_power();
                    let scale = range * power_ratio / norm / 2;
                    c = { x: c.x * scale, y: c.y * scale };
                    unit2.position = { x: b.x + c.x, y: b.y + c.y };
                }
                return { action: 'attack', attacker: unit_index, target: action.target, result: result, actor_name: character.name };
            }
            return { action: 'no_target_selected' };
        }
        if (action.action == 'fast_attack') {
            if (!(0, character_1.can_fast_attack)(character)) {
                return { action: "not_learnt", who: unit_index };
            }
            if (action.target != null) {
                let unit2 = this.heap.get_unit(action.target);
                let char = this.world.get_char_from_id(unit.char_id);
                if (unit.action_points_left < 1) {
                    return { action: 'not_enough_ap', who: unit_index };
                }
                let dist = geom_1.geom.dist(unit.position, unit2.position);
                if (dist > char.get_range()) {
                    return { action: 'not_enough_range', who: unit_index };
                }
                let target_char = this.world.get_char_from_id(unit2.char_id);
                let dodge_flag = (unit2.dodge_turns > 0);
                let result = await character.attack(pool, target_char, 'fast', dodge_flag, dist);
                unit.action_points_left -= 1;
                this.changed = true;
                return { action: 'attack', attacker: unit_index, target: action.target, result: result, actor_name: character.name };
            }
            return { action: 'no_target_selected' };
        }
        if (action.action == 'dodge') {
            if (!(0, character_1.can_dodge)(character)) {
                return { action: "not_learnt", who: unit_index };
            }
            if (unit.action_points_left < 4) {
                return { action: 'not_enough_ap', who: unit_index };
            }
            unit.dodge_turns = 2;
            unit.action_points_left -= 4;
            return { action: 'dodge', who: unit_index };
        }
        if (action.action == 'flee') {
            if (unit.action_points_left >= 3) {
                unit.action_points_left -= 3;
                let dice = Math.random();
                this.changed = true;
                if (dice <= flee_chance(character)) {
                    this.draw = true;
                    return { action: 'flee', who: unit_index };
                }
                else {
                    return { action: 'flee-failed', who: unit_index };
                }
            }
            return { action: 'not_enough_ap', who: unit_index };
        }
        if (action.action == 'switch_weapon') {
            // console.log('????')
            if (unit.action_points_left < 3) {
                return { action: 'not_enough_ap', who: unit_index };
            }
            unit.action_points_left -= 3;
            character.switch_weapon();
            return { action: 'switch_weapon', who: unit_index };
        }
        if (action.action == 'spell_target') {
            if (unit.action_points_left > 3) {
                let spell_tag = action.spell_tag;
                let unit2 = this.heap.get_unit(action.target);
                let target_char = this.world.get_char_from_id(unit2.char_id);
                let result = await character.spell_attack(pool, target_char, spell_tag);
                if (result.flags.close_distance) {
                    let dist = geom_1.geom.dist(unit.position, unit2.position);
                    if (dist > 1.9) {
                        let v = geom_1.geom.minus(unit2.position, unit.position);
                        let u = geom_1.geom.mult(geom_1.geom.normalize(v), 0.9);
                        v = geom_1.geom.minus(v, u);
                        unit.position.x = v.x;
                        unit.position.y = v.y;
                    }
                    result.new_pos = { x: unit.position.x, y: unit.position.y };
                }
                unit.action_points_left -= 3;
                this.changed = true;
                return { action: spell_tag, who: unit_index, result: result, actor_name: character.name };
            }
        }
        if (action.action == 'end_turn') {
            this.waiting_for_input = false;
            unit.end_turn();
            this.heap.push(unit_index);
            this.changed = true;
            return { action: 'end_turn', who: unit_index };
        }
        this.changed = true;
    }
    get_data() {
        let data = {};
        for (var i = 0; i < this.heap.data.length; i++) {
            let unit = this.heap.data[i];
            var character = this.world.get_char_from_id(unit.char_id);
            if (character != undefined) {
                data[i] = {
                    id: unit.char_id,
                    position: { x: unit.position.x, y: unit.position.y },
                    tag: character.get_model(),
                    range: character.get_range(),
                    hp: character.get_hp(),
                    name: character.name,
                    ap: unit.action_points_left
                };
            }
        }
        return data;
    }
    add_fighter(agent, team, position) {
        console.log('add fighter');
        if (position == undefined) {
            let dx = Math.random() * 2;
            let dy = Math.random() * 2;
            if (team == 1) {
                position = { x: 0 + dx, y: 8 + dy };
            }
            else {
                position = { x: 0 + dx, y: 0 + dy };
            }
        }
        let unit = new UnitData();
        unit.init(agent, position, team);
        this.heap.add_unit(unit);
        agent.set_flag('in_battle', true);
        agent.set_in_battle_id(this.heap.data.length - 1);
        agent.set_battle_id(this.id);
        this.changed = true;
    }
    // agent joins battle on a side of team
    join(agent, team) {
        console.log(agent.name + ' joins battle on a side ' + team);
        this.add_fighter(agent, team, undefined);
        this.send_data_start();
    }
    check_team_to_join(agent) {
        if (agent.faction_id == -1)
            return 'no_interest';
        let data = this.get_units();
        for (let item of data) {
            let char_id = item.char_id;
            let char = this.world.entity_manager.chars[char_id];
            if (char.faction_id == agent.faction_id) {
                return item.team;
            }
        }
        return 'no_interest';
    }
    transfer(target, tag, x) {
        this.stash.transfer(target.stash, tag, x);
        this.changed = true;
    }
    get_team_status(team) {
        let tmp = [];
        for (let i in this.heap.data) {
            let unit = this.heap.data[i];
            if (unit.team == team) {
                let char = this.world.get_char_from_id(unit.char_id);
                if (char != undefined) {
                    tmp.push({ name: char.name, hp: char.get_hp(), next_turn: unit.next_turn_after, ap: unit.action_points_left });
                }
            }
        }
        return tmp;
    }
    get_status() {
        let tmp = [];
        for (let i in this.heap.data) {
            let unit = this.heap.data[i];
            let char = this.world.get_char_from_id(unit.char_id);
            if (char != undefined) {
                tmp.push({ name: char.name, hp: char.get_hp(), next_turn: unit.next_turn_after, ap: unit.action_points_left });
            }
        }
        return tmp;
    }
    is_over() {
        var team_lost = [];
        for (let team = 0; team < 10; team++) {
            team_lost[team] = true;
        }
        for (var i = 0; i < this.heap.data.length; i++) {
            let unit = this.heap.data[i];
            var char = this.world.get_char_from_id(unit.char_id);
            if ((char == undefined) || (char.get_hp() == 0)) {
                if (!unit.dead) {
                    unit.dead = true;
                }
            }
            else {
                team_lost[unit.team] = false;
            }
        }
        if (this.draw == true) {
            return 'draw';
        }
        else {
            let teams_left = 0;
            let team_not_lost = -1;
            for (let team = 0; team < 10; team++) {
                if (!team_lost[team]) {
                    teams_left += 1;
                    team_not_lost = team;
                }
            }
            if (teams_left > 1) {
                return -1;
            }
            else if (teams_left == 1) {
                return team_not_lost;
            }
            else {
                return 'draw';
            }
        }
        return -1;
    }
    clean_up_battle() {
        for (let i = 0; i < this.heap.get_units_amount(); i++) {
            let unit = this.heap.get_unit(i);
            let char = this.world.get_char_from_id(unit.char_id);
            if (char != undefined) {
                char.set_flag('in_battle', false);
                char.set_battle_id(-1);
            }
            this.changed = true;
        }
        this.send_stop();
    }
    reward() { }
    reward_team(team) { }
    process_input(unit_index, input) {
        if (!this.waiting_for_input) {
            return { action: 'action_in_progress', who: unit_index };
        }
        if (this.heap.selected != unit_index) {
            let char1 = this.get_char(this.get_unit(this.heap.selected));
            let char2 = this.get_char(this.get_unit(unit_index));
            if (char1.id != char2.id) {
                return { action: 'not_your_turn', who: unit_index };
            }
        }
        if (input != undefined) {
            this.changed = true;
            let index = this.heap.selected;
            let character = this.get_char(this.get_unit(this.heap.selected));
            if (input.action == 'move') {
                return await this.action(pool, index, { action: 'move', target: input.target });
            }
            else if (input.action == 'attack') {
                return await this.action(pool, index, battle_ai_1.BattleAI.convert_attack_to_action(this, index, input.target, 'usual'));
            }
            else if (input.action == 'fast_attack') {
                if (!(0, character_1.can_fast_attack)(character)) {
                    return { action: "not_learnt" };
                }
                return await this.action(pool, index, battle_ai_1.BattleAI.convert_attack_to_action(this, index, input.target, 'fast'));
            }
            else if (input.action == 'dodge') {
                if (!(0, character_1.can_dodge)(character)) {
                    return { action: "not_learnt" };
                }
                return await this.action(pool, index, { action: 'dodge', who: index });
            }
            else if (input.action == 'push_back') {
                if (!(0, character_1.can_push_back)(character)) {
                    return { action: "not_learnt" };
                }
                return await this.action(pool, index, { action: 'push_back', target: input.target });
            }
            else if (input.action == 'magic_bolt') {
                return await this.action(pool, index, { action: 'magic_bolt', target: input.target });
            }
            else if (input.action == 'shoot') {
                return await this.action(pool, index, { action: 'shoot', target: input.target });
            }
            else if (input.action == 'flee') {
                return await this.action(pool, index, { action: 'flee', who: index });
            }
            else if (input.action == 'switch_weapon') {
                return await this.action(pool, index, { action: 'switch_weapon', who: index });
            }
            else {
                return await this.action(pool, index, input);
            }
        }
    }
    units_amount() {
        return this.heap.get_units_amount();
    }
}
exports.BattleReworked2 = BattleReworked2;
function flee_chance(character) {
    return 0.4;
}
exports.flee_chance = flee_chance;
