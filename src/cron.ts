import 'dotenv/config';
import 'reflect-metadata';
import bootstrapDb from './config/db.config';
import getConfig from './config/env.config';
import {Container} from "typedi";
import {EventService} from "./api/services/event.service";

const eventService = Container.get(EventService);

// Load configurations
const config = getConfig();

async function init() {
	console.log('Starting cron...')
	let db = await bootstrapDb();
	await eventService.handleTodaysEvents();
	console.log('Cron finished')
}

init();

