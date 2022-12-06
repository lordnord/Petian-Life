import { action_points, BattleData, battle_id, battle_position, ms, unit_id } from "../../../../shared/battle_data"
import { Convert } from "../systems_communication"
import { Character } from "../character/character"
import { CharacterSystem } from "../character/system"
import { BattleAI } from "./AI/battle_ai"
import { Battle } from "./classes/battle"
import { UnitsHeap } from "./classes/heap"
import { Unit } from "./classes/unit"
import { BattleEvent } from "./events"
import fs from "fs"
import { Event } from "../events/events"
import { Data } from "../data"
import path from "path"
import { SAVE_GAME_PATH } from "../../SAVE_GAME_PATH"

var last_unit_id = 0 as unit_id

function time_distance(a: ms, b: ms) {
    return b - a as ms
}

const save_path = path.join(SAVE_GAME_PATH, 'battles.txt')

export namespace BattleSystem {

    export function id_to_unit(id: unit_id, battle: Battle) {
        return battle.heap.get_unit(id)
    }

    export function load() {
        console.log('loading battles')
        if (!fs.existsSync(save_path)) {
            fs.writeFileSync(save_path, '')
        }
        let data = fs.readFileSync(save_path).toString()
        let lines = data.split('\n')

        for (let line of lines) {
            if (line == '') {continue}
            const battle = string_to_battle(line)
            if (battle.date_of_last_turn == '%') {
                battle.date_of_last_turn = Date.now() as ms
            }

            Data.Battle.set(battle.id, battle)
            const last_id = Data.Battle.id()
            Data.Battle.set_id(Math.max(battle.id, last_id) as battle_id)            
        }

        console.log('battles loaded')
    }

    export function save() {
        console.log('saving battles')
        let str:string = ''
        for (let item of Data.Battle.list()) {
            if (item.ended) continue;
            str = str + battle_to_string(item) + '\n' 
        }
        fs.writeFileSync(save_path, str)
        console.log('battles saved')
    }

    function battle_to_string(battle: Battle) {
        return JSON.stringify(battle)
    }

    function string_to_battle(s: string) {
        const json:Battle = JSON.parse(s)
        const battle = new Battle(json.id, json_to_heap(json.heap))
        
        const unit = battle.heap.get_selected_unit()
        if (unit != undefined) {
            const character = Convert.unit_to_character(unit)
            if (character.is_player()) {
                battle.waiting_for_input = true
            } else {
                battle.waiting_for_input = false
            }
        } else {
            battle.waiting_for_input = false
        }
        battle.ended = json.ended
        battle.last_event_index = json.last_event_index
        battle.grace_period = json.grace_period||0
        return battle
    }

    function json_to_heap(s: UnitsHeap) {
        const h = new UnitsHeap([])
        for (let unit of s.raw_data) {
            const character = Convert.unit_to_character(unit)
            if (character != undefined) h.add_unit(unit)
        }
        return h
    }

    // only creates and initialise battle
    // does not add participants
    export function create_battle(): battle_id{
        Data.Battle.increase_id()
        const last_id = Data.Battle.id()
        let heap = new UnitsHeap([])
        let battle = new Battle(last_id, heap)
        battle.grace_period = 6
        Data.Battle.set(last_id, battle)
        return last_id
    }

    export function create_unit(character: Character, team: number): Unit {
        last_unit_id = last_unit_id + 1 as unit_id
        
        // deciding position
        const dx = Math.random() * 2
        const dy = Math.random() * 2
        if (team == 1) {
            var position = {x: 0 + dx, y: 8 + dy} as battle_position
        } else {
            var position = {x: 0 + dx, y: 0 + dy} as battle_position
        }

        const unit = new Unit(last_unit_id, position, team,
            10 as action_points, 10 as action_points, 10 as action_points, 3 as action_points, 
            character.id)
        
        return unit
    }

//     add_fighter(agent:Character, team:number, position:{x:number, y: number}|undefined) {
//         console.log('add fighter')
        
//         if (position == undefined) {
//             
//             if (team == 1) {
//                 position = {x: 0 + dx, y: 8 + dy}
//             } else {
//                 position = {x: 0 + dx, y: 0 + dy}
//             }
//         }

//         let unit = new Unit();
//         unit.init(agent, position, team)

//         this.heap.add_unit(unit)

//         agent.set_flag('in_battle', true)
//         agent.set_in_battle_id(this.heap.data.length - 1)
//         agent.set_battle_id(this.id)

//         this.changed = true;
//     }

//     // agent joins battle on a side of team
//     join(agent: Character, team: number) {
//         console.log(agent.name + ' joins battle on a side ' + team)
//         this.add_fighter(agent, team, undefined)
//         this.send_data_start()
//     }



    export function add_figther(battle_id: battle_id, character: Character, team: number) {
        const battle = Convert.id_to_battle(battle_id)
        if (battle == undefined) return
        
        const unit = create_unit(character, team)
        BattleEvent.NewUnit(battle, unit)
    }

    export function update() {
        const current_date = Date.now() as ms

        for (let battle of Data.Battle.list()) {
            if (battle.ended) continue;

            // if turn lasts longer than 60 seconds, it ends automatically
            if (battle.waiting_for_input) {
                if ((battle.date_of_last_turn != '%') && (time_distance(battle.date_of_last_turn, current_date) > 60 * 1000)) {
                    const unit = battle.heap.get_selected_unit()
                    if (unit != undefined) BattleEvent.EndTurn(battle, unit)
                }
            }

            // if turn is still running, then do nothing
            if (battle.waiting_for_input) {
                return
            }

            // if battle is not waiting for input, then we need to start new turn
            BattleEvent.NewTurn(battle)

            // get information about current unit
            const unit = battle.heap.get_selected_unit()
            console.log('current unit is' + unit?.id)
            if (unit == undefined) {battle.ended = true; return}
            let character:Character = Convert.unit_to_character(unit)
            console.log(character.name)

            if (character.dead()) {
                BattleEvent.Leave(battle, unit)
                return
            }

            CharacterSystem.battle_update(character)

            //processing cases of player and ai separately for a now
            // if character is player, then wait for input
            if (character.is_player()) {
                battle.waiting_for_input = true
                return
            } 

            // else ask ai to make all needed moves and end turn
            {
                const responce = AI_turn(battle)
                console.log(responce)
                if (responce == 'end') BattleEvent.EndTurn(battle, unit)
                if (responce == 'leave') BattleEvent.Leave(battle, unit);
            }
        }
    }

    /** Checks if there is only one team left */
    export function safe(battle: Battle) {
        const teams:{[_ in number]:number} = {}
        for (const unit of battle.heap.raw_data) {
            const character = Convert.unit_to_character(unit)
            if (character == undefined) continue
            if (character.dead()) continue
            if (teams[unit.team] == undefined) teams[unit.team] = 1
            else teams[unit.team] += 1
        }
        const total = Object.values(teams)
        if (total.length > 1) return false
        return true 
    }

    /**  Makes moves for currently selected character depending on his battle_ai
    */
    function AI_turn(battle: Battle){
        const unit = battle.heap.get_selected_unit()
        if (unit == undefined) return
        const character = Convert.unit_to_character(unit)
        if (character.dead()) return 'leave'
        do {
            var action = BattleAI.action(battle, unit, character);
        } while (action == 'again')
        return action
    }

    export function data(battle: Battle):BattleData {
        let data:BattleData = {};
        for (var i = 0; i < battle.heap.raw_data.length; i++) {
            let unit = battle.heap.raw_data[i];
            let character:Character = Convert.unit_to_character(unit)
            if (!character.dead()) data[i] = (Convert.unit_to_unit_socket(unit))
        }
        return data
    }

//     get_status() {
//         let tmp:{name: string, hp: number, next_turn: number, ap: number}[] = []
//         for (let i in this.heap.data) {
//             let unit = this.heap.data[i]
//             let char:Character = this.world.get_char_from_id(unit.char_id)
//             if (char != undefined) {
//                 tmp.push({name: char.name, hp: char.get_hp(), next_turn: unit.next_turn_after, ap: unit.action_points_left})
//             }
//         }
//         return tmp
//     }
}




//     get_units() {
//         return this.heap.data
//     }

//     get_unit(i: number) {
//         return this.heap.get_unit(i)
//     }

//     get_char(unit: Unit) {
//         return this.world.get_char_from_id(unit.char_id)
//     }








//     get_team_status(team: number) {
//         let tmp:{name: string, hp: number, next_turn: number, ap: number}[] = []
//         for (let i in this.heap.data) {
//             let unit = this.heap.data[i]
//             if (unit.team == team) {
//                 let char:Character = this.world.get_char_from_id(unit.char_id)
//                 if (char != undefined) {
//                     tmp.push({name: char.name, hp: char.get_hp(), next_turn: unit.next_turn_after, ap: unit.action_points_left})
//                 }
//             }
//         }
//         return tmp
//     }



//     is_over() {
//         var team_lost: boolean[] = [];
//         for (let team = 0; team < 10; team++) {
//             team_lost[team] = true
//         }
//         for (var i = 0; i < this.heap.data.length; i++) {
//             let unit = this.heap.data[i]
//             var char: Character = this.world.get_char_from_id(unit.char_id);
//             if ((char == undefined) || (char.get_hp() == 0)) {
//                 if (!unit.dead) {
//                     unit.dead = true;
//                 }
//             } else {
//                 team_lost[unit.team] = false
//             }
//         }

//         if (this.draw == true) {
//             return 'draw';
//         } else {
//             let teams_left = 0
//             let team_not_lost = -1
//             for (let team = 0; team < 10; team++) {
//                 if (!team_lost[team]) {
//                     teams_left += 1
//                     team_not_lost = team
//                 }
//             }
//             if (teams_left > 1) {
//                 return -1
//             } else if (teams_left == 1) {
//                 return team_not_lost
//             } else {
//                 return 'draw'
//             }
//         }
//         return -1;
//     }

//     clean_up_battle() {
//         for (let i = 0; i < this.heap.get_units_amount(); i++) {
//             let unit = this.heap.get_unit(i);
//             let char:Character = this.world.get_char_from_id(unit.char_id);
//             if (char != undefined) {
//                 char.set_flag('in_battle', false);
//                 char.set_battle_id(-1)
//             }
//             this.changed = true
//         }
//         this.send_stop()
//     }

//     reward() {}    
//      reward_team(team: number) {}



//     units_amount() {
//         return this.heap.get_units_amount()
//     }
// }

//     send_action(a: any) {
//         this.world.socket_manager.send_battle_action(this, a)
//     }

//     send_stop(){
//         this.world.socket_manager.send_stop_battle(this)
//     }