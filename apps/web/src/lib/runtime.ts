import { getDatabase } from "./db";

export function getRuntimeEnv(): RuntimeEnv {
  return {
    PUBLIC_APP_NAME: import.meta.env.PUBLIC_APP_NAME,
    PUBLIC_APP_URL: import.meta.env.PUBLIC_APP_URL,
    PUBLIC_SUPPORT_URL: import.meta.env.PUBLIC_SUPPORT_URL,
    PUBLIC_CHAIN_ID: import.meta.env.PUBLIC_CHAIN_ID,
    PUBLIC_CELO_RPC_URL: import.meta.env.PUBLIC_CELO_RPC_URL,
    PUBLIC_CELO_EXPLORER_URL: import.meta.env.PUBLIC_CELO_EXPLORER_URL,
    PUBLIC_PROJECT_BALL_POOLS_ADDRESS: import.meta.env.PUBLIC_PROJECT_BALL_POOLS_ADDRESS,
    PROJECT_BALL_DB: getDatabase()
  };
}
