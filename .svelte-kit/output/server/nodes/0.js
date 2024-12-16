import * as universal from '../entries/pages/_layout.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.Bhhqquvh.js","_app/immutable/chunks/disclose-version.Ba94ovf-.js","_app/immutable/chunks/utils.D22Xb4Z6.js","_app/immutable/chunks/legacy._ApLulLh.js","_app/immutable/chunks/index-client.DmTjv-97.js","_app/immutable/chunks/store.Ce-nu3-4.js","_app/immutable/chunks/index.BF1R2iSJ.js","_app/immutable/chunks/3.AivEKjif.js","_app/immutable/chunks/stores.DKJUXDM8.js","_app/immutable/chunks/entry.ZPZqo7aW.js"];
export const stylesheets = ["_app/immutable/assets/0.CIYszk20.css"];
export const fonts = [];
