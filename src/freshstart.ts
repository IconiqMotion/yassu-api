import 'dotenv/config';
import 'reflect-metadata';
import {Container} from 'typedi';
import {UsersService} from './api/services/users.service';
import bootstrapDb from './config/db.config';
import getConfig from './config/env.config';
import {initJWT} from './config/jwt.config';
import Logger from './config/logger.config';
import {getManager} from "typeorm";

// Load configurations
const config = getConfig();
const userService = Container.get(UsersService);

Logger.info('Starting freshstart...');
Logger.info(`Env: ${config.name}`);

async function init() {
    let db = await bootstrapDb();
    initJWT();
    if (db) {
        Logger.info('DB is connected');
    } else {
        Logger.error('Cannot connect to db. this could be fatal');
    }
}

init();
