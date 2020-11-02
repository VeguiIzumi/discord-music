/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import type { ClientOptions } from "discord.js";
import type Command from "./Command";
import type Listener from "./Listener";
import { Collection, Client } from "discord.js";
import { readdir } from "fs/promises";
import { join } from "path";
import nodeSuperfetch from "node-superfetch";

import config from "../config.json";

import "../extenders";
import YouTubeSearch from "../utils/YoutubeSearch";

export default class MusicClient extends Client {
    public readonly httpClient = nodeSuperfetch;
    public readonly commands: Collection<string, Command> = new Collection();
    public readonly config: typeof config = config;
    public readonly youtube = new YouTubeSearch(this);
    public readonly cooldowns: Collection<string, number>;
    public constructor(options?: ClientOptions) {
        super({
            disableMentions: "everyone",
            ...options
        });
        this.cooldowns = new Collection();
    }

    public build(): void {
        void this.loadCommands();
        void this.loadEventListeners();
        void this.login(process.env.TOKEN);
    }

    public async loadCommands(): Promise<void> {
        const categories = await readdir(join(__dirname, "..", "commands"));
        for (const category of categories) {
            const commands = await readdir(join(__dirname, "..", "commands", category));
            for (const commandFile of commands) {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const commandClass = require(`../commands/${category}/${commandFile}`).default;
                const command: Command = new commandClass(this);
                command.config.category = category;
                this.commands.set(command.config.name, command);
            }
        }
    }

    public async loadEventListeners(): Promise<void> {
        const listeners = await readdir(join(__dirname, "..", "listeners"));
        for (const listenerFile of listeners) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const listenerClass = require(`../listeners/${listenerFile}`).default;
            const listener: Listener = new listenerClass(this);
            this.on(listener.name, listener.exec.bind(listener));
        }
    }
}

declare module "discord.js" {
    export interface Client {
        httpClient: typeof nodeSuperfetch;
        commands: Collection<string, Command>;
        config: typeof config;
        cooldowns: Collection<string, number>;
        loadCommands(): Promise<void>;
        loadEventListeners(): Promise<void>;
    }
}
