"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.launch = void 0;
const fs_1 = require("fs");
// Always the first.
const data_id_1 = require("./game_modules/data/data_id");
const data_objects_1 = require("./game_modules/data/data_objects");
//importing order is important because of lists of entities defined in these files
const system_1 = require("./game_modules/character/system");
const system_2 = require("./game_modules/map/system");
const user_manager_1 = require("./game_modules/client_communication/user_manager");
// import { http, io_type } from "./server";
const manager_1 = require("./game_modules/actions/manager");
const auth_1 = require("./game_modules/client_communication/network_actions/auth");
const events_1 = require("./game_modules/events/events");
const systems_communication_1 = require("./game_modules/systems_communication");
const system_3 = require("./game_modules/battle/system");
const events_2 = require("./game_modules/battle/events");
require("./game_modules/craft/craft");
const path = __importStar(require("path"));
const SAVE_GAME_PATH_1 = require("./SAVE_GAME_PATH");
const game_master_1 = require("./game_modules/game_master");
if (!(0, fs_1.existsSync)(SAVE_GAME_PATH_1.SAVE_GAME_PATH)) {
    (0, fs_1.mkdirSync)(SAVE_GAME_PATH_1.SAVE_GAME_PATH);
}
console.log(SAVE_GAME_PATH_1.SAVE_GAME_PATH);
const version_path = path.join(SAVE_GAME_PATH_1.SAVE_GAME_PATH, 'version.txt');
function get_version_raw() {
    if (!(0, fs_1.existsSync)(version_path)) {
        (0, fs_1.writeFileSync)(version_path, '0');
    }
    return (0, fs_1.readFileSync)(version_path).toString();
}
function set_version(n) {
    console.log('set version ' + n);
    (0, fs_1.writeFileSync)(version_path, '' + n);
    return n;
}
function get_version() {
    let data = Number(get_version_raw());
    return data;
}
const gameloop = require('node-gameloop');
var shutdown = false;
function launch(http_server) {
    try {
        process.on('SIGTERM', () => {
            console.info('SIGTERM signal received. Preparing for shutdown');
            shutdown = true;
        });
        process.on('SIGINT', () => {
            console.info('SIGINT signal received. Preparing for shutdown');
            shutdown = true;
        });
        process.on('SIGHUP', () => {
            console.info('SIGHUP signal received. Preparing for shutdown');
            shutdown = true;
        });
        console.log('reading save files');
        console.log('connection ready');
        load();
        console.log('systems are ready');
        system_2.MapSystem.initial_update();
        gameloop.setGameLoop((delta) => update(delta, http_server), 100);
    }
    catch (e) {
        console.log(e);
    }
}
exports.launch = launch;
function load() {
    // MapSystem.load()
    data_objects_1.Data.load();
    user_manager_1.UserManagement.load_users();
    auth_1.Auth.load();
    //validating battle status
    data_objects_1.Data.Characters.for_each(object => {
        const battle = systems_communication_1.Convert.character_to_battle(object);
        if (battle == undefined) {
            object.battle_id = undefined;
        }
    });
    data_objects_1.Data.Battles.for_each(battle => {
        // console.log('test battle for shadow units')
        for (let id of Object.values(battle.heap)) {
            let character = data_objects_1.Data.Characters.from_id(id);
            if (character == undefined || !character.in_battle()) {
                events_2.BattleEvent.Leave(battle, character);
            }
        }
    });
    let version = get_version();
    if (version == 0) {
        const factions = data_objects_1.Data.Factions.get_factions();
        for (const item of factions) {
            game_master_1.GameMaster.spawn_faction(data_id_1.DataID.Location.cell_id(data_id_1.DataID.Faction.spawn(item.tag)), item.tag);
        }
        set_version(1);
    }
}
function save() {
    user_manager_1.UserManagement.save_users();
    auth_1.Auth.save();
    data_objects_1.Data.save();
}
var update_timer = 0;
var map_update_timer = 0;
// seconds
function update(delta, http_server) {
    if (shutdown) {
        http_server.close();
        // express_server.close(() => {
        //     console.log('express server closed')
        // })
        save();
        process.exit(0);
    }
    system_1.CharacterSystem.update(delta);
    manager_1.ActionManager.update_characters(delta);
    user_manager_1.UserManagement.update_users();
    system_3.BattleSystem.update(delta * 1000);
    data_objects_1.Data.Characters.for_each(character => {
        if (character.dead()) {
            events_1.Event.death(character);
        }
    });
    map_update_timer += delta;
    if (map_update_timer > 1) {
        system_2.MapSystem.update(map_update_timer);
        game_master_1.GameMaster.update(map_update_timer);
        map_update_timer = 0;
    }
    update_timer += delta;
    if (update_timer > 50000) {
        save();
        update_timer = 0;
    }
}

