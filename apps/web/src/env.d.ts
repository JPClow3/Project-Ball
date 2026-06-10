/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results?: T[] }>;
  run(): Promise<unknown>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface RuntimeEnv {
  PUBLIC_APP_NAME: string;
  PUBLIC_APP_URL: string;
  PUBLIC_SUPPORT_URL: string;
  PUBLIC_CHAIN_ID: string;
  PUBLIC_CELO_RPC_URL: string;
  PUBLIC_CELO_EXPLORER_URL: string;
  PUBLIC_PROJECT_BALL_POOLS_ADDRESS: string;
  PROJECT_BALL_DB?: D1Database;
}

interface ImportMetaEnv extends RuntimeEnv {}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    lang: import('./i18n').Language;
  }
}
