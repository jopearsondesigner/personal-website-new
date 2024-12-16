import * as server from '../entries/pages/_page.server.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/+page.server.js";
export const imports = ["_app/immutable/nodes/2.CdzY6pup.js","_app/immutable/chunks/disclose-version.Ba94ovf-.js","_app/immutable/chunks/utils.D22Xb4Z6.js","_app/immutable/chunks/legacy._ApLulLh.js","_app/immutable/chunks/store.Ce-nu3-4.js","_app/immutable/chunks/index.BF1R2iSJ.js","_app/immutable/chunks/index-client.DmTjv-97.js","_app/immutable/chunks/3.AivEKjif.js"];
export const stylesheets = ["_app/immutable/assets/2.bfH8Kb88.css"];
export const fonts = [];
