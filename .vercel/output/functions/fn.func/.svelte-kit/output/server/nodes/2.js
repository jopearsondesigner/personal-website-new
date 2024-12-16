import * as server from '../entries/pages/_page.server.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/+page.server.js";
export const imports = ["_app/immutable/nodes/2.BGhwnTar.js","_app/immutable/chunks/disclose-version.CuY00iDp.js","_app/immutable/chunks/utils.BhUedHvW.js","_app/immutable/chunks/legacy.CLnaGIGd.js","_app/immutable/chunks/store.D7i61OTN.js","_app/immutable/chunks/index.DJD0RTwG.js","_app/immutable/chunks/index-client.30ZbVJAp.js","_app/immutable/chunks/3.tzSCTpSK.js"];
export const stylesheets = ["_app/immutable/assets/2.bfH8Kb88.css"];
export const fonts = [];
