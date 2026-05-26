import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

mkdirSync(resolve("../../.cache/taro"), { recursive: true });
