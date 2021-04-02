const Savings = require("./savings");
const Stash = require("./stash");

module.exports = class Area {
    constructor(world) {
        this.world = world
        this.stash = new Stash()
        this.savings = new Savings()

        this.tag = undefined
        this.factions_influence = {}
        this.local_resources = {}
        this.changed = false
    }

    async init(tag, factions_influence, local_resources) {
        this.tag = tag
        this.factions_influence = factions_influence
        this.local_resources = local_resources
        this.id = await this.load_to_db(pool);
        return this.id;
    }

    async update(pool) {
        if (this.changed) {
            this.save_to_db(pool)
        }
    }

    set_influence(faction, amount) {
        this.factions_influence[faction.tag] = amount
    }

    change_influence(faction, amount) {
        if (faction.tag in this.factions_influence) {
            this.faction_influence[faction.tag] = this.factions_influence[faction.tag] + amount
        } else {
            this.faction_influence[faction.tag] = amount
        }
        if (this.factions_influence[faction.tag] < 0) {
            this.factions_influence[faction.tag] = undefined
        }
        this.changed = true
    }

    get_influence(faction) {
        return this.factions_influence[faction.tag]
    }

    load_to_db(pool) {
        let res = await common.send_query(pool, constants.insert_area_query, [this.tag, this.savings.get_json(), this.stash.get_json(), this.factions_influence, this.local_resources]);
        return res.rows[0].id
    }   

    save_to_db(pool) {
        this.changed = false
        await common.send_query(pool, constants.update_area_query, [this.id, this.tag, this.savings.get_json(), this.stash.get_json(), this.factions_influence, this.local_resources]);
    }

    load_from_json(data) {
        this.id = data.id;
        this.tag = data.tag;
        this.factions_influence = data.factions_influence;
        this.local_resources = data.local_resources;
        this.savings.load_from_json(data.savings)
        this.stash.load_from_json(data.stash)
    }
};