/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as billingSync from "../billingSync.js";
import type * as customers from "../customers.js";
import type * as htmlEscape from "../htmlEscape.js";
import type * as http from "../http.js";
import type * as lib_phone from "../lib/phone.js";
import type * as memberships from "../memberships.js";
import type * as messages from "../messages.js";
import type * as rateLimit from "../rateLimit.js";
import type * as seed from "../seed.js";
import type * as shops from "../shops.js";
import type * as support from "../support.js";
import type * as system from "../system.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  billingSync: typeof billingSync;
  customers: typeof customers;
  htmlEscape: typeof htmlEscape;
  http: typeof http;
  "lib/phone": typeof lib_phone;
  memberships: typeof memberships;
  messages: typeof messages;
  rateLimit: typeof rateLimit;
  seed: typeof seed;
  shops: typeof shops;
  support: typeof support;
  system: typeof system;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
