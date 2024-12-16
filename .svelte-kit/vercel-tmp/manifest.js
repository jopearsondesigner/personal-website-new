export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([".DS_Store","assets/.DS_Store","assets/images/.DS_Store","assets/images/game/game_mechanics_sprite.png","assets/images/game/main_logo_title_screen-01.svg","assets/images/game/projectile_main_sprite.png","assets/images/game/vela_main_sprite.png","assets/images/game/void_swarm_sprite.png","favicon.png"]),
	mimeTypes: {".png":"image/png",".svg":"image/svg+xml"},
	_: {
		client: {"start":"_app/immutable/entry/start.o8U8HcLZ.js","app":"_app/immutable/entry/app.6Rg-QIFZ.js","imports":["_app/immutable/entry/start.o8U8HcLZ.js","_app/immutable/chunks/entry.BAEMMdYb.js","_app/immutable/chunks/utils.BhUedHvW.js","_app/immutable/chunks/index.DJD0RTwG.js","_app/immutable/entry/app.6Rg-QIFZ.js","_app/immutable/chunks/utils.BhUedHvW.js","_app/immutable/chunks/disclose-version.CuY00iDp.js","_app/immutable/chunks/index-client.30ZbVJAp.js","_app/immutable/chunks/3.tzSCTpSK.js"],"stylesheets":[],"fonts":[],"uses_env_dynamic_public":false},
		nodes: [
			__memo(() => import('../output/server/nodes/0.js')),
			__memo(() => import('../output/server/nodes/1.js')),
			__memo(() => import('../output/server/nodes/2.js')),
			__memo(() => import('../output/server/nodes/3.js')),
			__memo(() => import('../output/server/nodes/4.js'))
		],
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/projects",
				pattern: /^\/projects\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/projects/[slug]",
				pattern: /^\/projects\/([^/]+?)\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			}
		],
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
