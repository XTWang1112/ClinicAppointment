import type { IRepository } from "./repository";
import { sqliteRepository } from "./sqliteRepository";

export const repository: IRepository = sqliteRepository;

export type { IRepository };