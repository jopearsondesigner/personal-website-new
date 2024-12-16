import { _ as current_component, $ as rest_props, a0 as spread_attributes, a1 as slot, a2 as sanitize_props, a3 as attr, p as pop, a4 as stringify, a as push, a5 as ensure_array_like, e as escape_html, s as store_get, u as unsubscribe_stores, c as bind_props, a6 as head } from "../../chunks/index.js";
import { gsap } from "gsap";
import { w as writable, g as get } from "../../chunks/index2.js";
function onDestroy(fn) {
  var context = (
    /** @type {Component} */
    current_component
  );
  (context.d ??= []).push(fn);
}
function Gear($$payload, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, []);
  $$payload.out += `<svg${spread_attributes(
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: "16",
      height: "16",
      fill: "currentColor",
      viewBox: "0 0 16 16",
      ...$$restProps
    },
    { bi: true, "bi-gear": true },
    void 0,
    3
  )}><!---->`;
  slot($$payload, $$props, "default", {});
  $$payload.out += `<!----><path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"></path><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"></path></svg>`;
}
const createLayoutStore = () => {
  const defaultValues = {
    navbarHeight: 0,
    isNavbarVisible: true,
    previousNavbarHeight: 0
  };
  const { subscribe, set, update } = writable(defaultValues);
  return {
    subscribe,
    setNavbarHeight: (height) => update((state) => ({
      ...state,
      previousNavbarHeight: state.navbarHeight,
      navbarHeight: height
    })),
    toggleNavbarVisibility: () => update((state) => ({
      ...state,
      isNavbarVisible: !state.isNavbarVisible
    })),
    reset: () => set(defaultValues)
  };
};
const layoutStore = createLayoutStore();
function ArcadeCtaButton($$payload, $$props) {
  push();
  let buttonSize = 0.57;
  $$payload.out += `<button${attr("class", `cta-button svelte-5j4fzj ${stringify([""].filter(Boolean).join(" "))}`)}${attr("style", `--size-multiplier: ${stringify(buttonSize)};`)}>`;
  {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<svg${attr("width", 349 * buttonSize)}${attr("height", 144 * buttonSize)} viewBox="0 0 349 144" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_190_3531)"><path opacity="0.5" fill-rule="evenodd" clip-rule="evenodd" d="M48 32H301V40H309V48H317V96H309V104H301V112H48V104H40V96H32V48H40V40H48V32Z" fill="url(#paint0_linear_190_3531)"></path><g filter="url(#filter0_d_190_3531)"><path d="M92 80.5V75.5H94.5V73H97V70.5H102V68H104.5V65.5H97V68H92V65.5H94.5V63H107V65.5H109.5V70.5H107V73H104.5V75.5H99.5V78H109.5V80.5H92ZM113 80.5V63H128V65.5H130.5V73H128V75.5H118V80.5H113ZM118 73H125.5V65.5H118V73ZM157.5 80.5V78H155V75.5H160V78H167.5V73H157.5V70.5H155V65.5H157.5V63H170V65.5H172.5V68H167.5V65.5H160V70.5H170V73H172.5V78H170V80.5H157.5ZM183.5 80.5V65.5H178.5V63H193.5V65.5H188.5V80.5H183.5ZM197 80.5V68H199.5V65.5H202V63H209.5V65.5H212V68H214.5V80.5H209.5V75.5H202V80.5H197ZM202 73H209.5V68H207V65.5H204.5V68H202V73ZM218 80.5V63H233V65.5H235.5V73H230.5V75.5H233V78H235.5V80.5H228V78H225.5V75.5H223V80.5H218ZM223 73H228V70.5H230.5V65.5H223V73ZM246.5 80.5V65.5H241.5V63H256.5V65.5H251.5V80.5H246.5Z" fill="#27FF99"></path></g><rect x="40" y="104" width="8" height="8" fill="#27FF99"></rect><rect opacity="0.4" x="32" y="104" width="8" height="8" fill="#27FF99"></rect><rect x="32" y="96" width="8" height="8" fill="#27FF99"></rect><rect opacity="0.3" x="24" y="96" width="8" height="8" fill="#27FF99"></rect><rect opacity="0.7" x="24" y="88" width="8" height="8" fill="#27FF99"></rect><rect x="24" y="80" width="8" height="8" fill="#27FF99"></rect><rect x="24" y="72" width="8" height="8" fill="#27FF99"></rect><rect x="24" y="64" width="8" height="8" fill="#27FF99"></rect><rect x="24" y="56" width="8" height="8" fill="#27FF99"></rect><rect opacity="0.7" x="24" y="48" width="8" height="8" fill="#27FF99"></rect><rect x="32" y="40" width="8" height="8" fill="#27FF99"></rect><rect opacity="0.3" x="24" y="40" width="8" height="8" fill="#27FF99"></rect><rect x="40" y="32" width="8" height="8" fill="#27FF99"></rect><rect opacity="0.4" x="32" y="32" width="8" height="8" fill="#27FF99"></rect><rect opacity="0.7" x="48" y="24" width="8" height="8" fill="#27FF99"></rect><rect opacity="0.3" x="40" y="24" width="8" height="8" fill="#27FF99"></rect><rect opacity="0.7" x="48" y="112" width="8" height="8" fill="#27FF99"></rect><rect opacity="0.3" x="40" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="96" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="104" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="112" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="120" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="128" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="136" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="144" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="152" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="160" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="168" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="176" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="184" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="192" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="200" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="208" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="216" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="224" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="232" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="240" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="248" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="256" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="264" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="272" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="280" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="288" y="24" width="5" height="8" fill="#27FF99"></rect><rect x="56" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="64" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="72" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="80" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="88" y="24" width="8" height="8" fill="#27FF99"></rect><rect x="96" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="104" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="112" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="120" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="128" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="136" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="144" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="152" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="160" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="168" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="176" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="184" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="192" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="200" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="208" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="216" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="224" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="232" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="240" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="248" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="256" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="264" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="272" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="280" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="288" y="112" width="5" height="8" fill="#27FF99"></rect><rect opacity="0.7" x="293" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="56" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="64" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="72" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="80" y="112" width="8" height="8" fill="#27FF99"></rect><rect x="88" y="112" width="8" height="8" fill="#27FF99"></rect><rect width="8" height="8" transform="matrix(-1 0 0 1 309 104)" fill="#27FF99"></rect><rect opacity="0.4" width="8" height="8" transform="matrix(-1 0 0 1 317 104)" fill="#27FF99"></rect><rect width="8" height="8" transform="matrix(-1 0 0 1 317 96)" fill="#27FF99"></rect><rect opacity="0.3" width="8" height="8" transform="matrix(-1 0 0 1 325 96)" fill="#27FF99"></rect><rect opacity="0.3" width="8" height="8" transform="matrix(-1 0 0 1 309 112)" fill="#27FF99"></rect><line x1="301" y1="104.5" x2="309" y2="104.5" stroke="white"></line><line x1="309" y1="96.5" x2="317" y2="96.5" stroke="white"></line><rect width="8" height="8" transform="matrix(0 -1 -1 0 309 40)" fill="#27FF99"></rect><rect opacity="0.4" width="8" height="8" transform="matrix(0 -1 -1 0 317 40)" fill="#27FF99"></rect><rect width="8" height="8" transform="matrix(0 -1 -1 0 317 48)" fill="#27FF99"></rect><rect opacity="0.3" x="301" y="32" width="8" height="8" fill="#27FF99"></rect><rect opacity="0.3" x="301" y="32" width="8" height="8" fill="#27FF99"></rect><line x1="301" y1="32.5" x2="309" y2="32.5" stroke="white"></line><rect opacity="0.3" width="8" height="8" transform="matrix(0 -1 -1 0 325 48)" fill="#27FF99"></rect><rect opacity="0.3" width="8" height="8" transform="matrix(0 -1 -1 0 309 32)" fill="#27FF99"></rect><line x1="309" y1="40.5" x2="317" y2="40.5" stroke="white"></line><rect opacity="0.7" x="293" y="24" width="8" height="8" fill="#27FF99"></rect><rect opacity="0.7" x="317" y="88" width="8" height="8" fill="#27FF99"></rect><rect x="317" y="80" width="8" height="8" fill="#27FF99"></rect><rect opacity="0.7" x="317" y="48" width="8" height="8" fill="#27FF99"></rect><rect x="317" y="56" width="8" height="8" fill="#27FF99"></rect><rect x="317" y="64" width="8" height="8" fill="#27FF99"></rect><rect x="317" y="72" width="8" height="8" fill="#27FF99"></rect><line x1="32" y1="96.5" x2="40" y2="96.5" stroke="white"></line><line x1="40" y1="104.5" x2="48" y2="104.5" stroke="white"></line><line x1="32" y1="40.5" x2="40" y2="40.5" stroke="white"></line><line x1="24" y1="48.5" x2="32" y2="48.5" stroke="white"></line><line x1="40" y1="32.5" x2="48" y2="32.5" stroke="white"></line><line x1="56" y1="24.5" x2="293" y2="24.5" stroke="white"></line><line x1="56" y1="112.5" x2="293" y2="112.5" stroke="white"></line><line x1="317" y1="48.5" x2="325" y2="48.5" stroke="white"></line></g><defs><filter id="filter0_d_190_3531" x="92" y="62" width="164.5" height="18.5" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"></feFlood><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"></feColorMatrix><feOffset dy="-1"></feOffset><feComposite in2="hardAlpha" operator="out"></feComposite><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"></feColorMatrix><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_190_3531"></feBlend><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_190_3531" result="shape"></feBlend></filter><linearGradient id="paint0_linear_190_3531" x1="32" y1="72" x2="317" y2="72" gradientUnits="userSpaceOnUse"><stop stop-color="#2B2B2B"></stop><stop offset="0.485" stop-color="#2B2B2B"></stop><stop offset="1" stop-color="#555555"></stop></linearGradient><clipPath id="clip0_190_3531"><rect width="349" height="144" fill="white"></rect></clipPath></defs></svg>`;
  }
  $$payload.out += `<!--]--></button>`;
  pop();
}
function ArcadeNavigation($$payload, $$props) {
  push();
  let selectedIndex = 0;
  const menuItems = [
    {
      label: "Main Menu",
      action: () => handleScreenChange()
    },
    {
      label: "Play Guardians of Lumara",
      action: () => handleScreenChange()
    }
  ];
  function handleScreenChange(screen) {
  }
  const each_array = ensure_array_like(menuItems);
  $$payload.out += `<nav${attr("class", `arcade-navigation svelte-tdobyn ${stringify([""].filter(Boolean).join(" "))}`)} aria-label="Game navigation">`;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> `;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> <div id="menu-container relative"${attr("class", `menu-container pixel-art z-[101] text-link svelte-tdobyn ${stringify([""].filter(Boolean).join(" "))}`)} tabindex="0" role="menu" aria-label="Game navigation">`;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> <!--[-->`;
  for (let index = 0, $$length = each_array.length; index < $$length; index++) {
    let item = each_array[index];
    $$payload.out += `<button${attr("class", `menu-item z-[50] svelte-tdobyn ${stringify([selectedIndex === index ? "selected" : ""].filter(Boolean).join(" "))}`)} role="menuitem"${attr("aria-current", selectedIndex === index)}${attr("data-screen", item.label.toLowerCase().replace(/\s+/g, "-"))}>`;
    if (selectedIndex === index) {
      $$payload.out += "<!--[-->";
      $$payload.out += `<span class="arrow svelte-tdobyn" aria-hidden="true">▶</span>`;
    } else {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]--> <span class="menu-text svelte-tdobyn">${escape_html(item.label)}</span></button>`;
  }
  $$payload.out += `<!--]--></div></nav>`;
  pop();
}
let canvas = null;
let ctx = null;
let enemies = [];
let projectiles = [];
projectiles.forEach((projectile, index) => {
  if (projectile.update) {
    projectile.update(enemies);
    projectile.draw(ctx);
    if (!projectile.isActive || projectile.y > canvas.height) {
      console.log("Removing inactive projectile:", index);
      projectiles.splice(index, 1);
    }
  } else {
    console.error(`Projectile at index ${index} does not have an update method.`);
  }
});
function Game($$payload, $$props) {
  push();
  const GAME_WIDTH = 800;
  const GAME_HEIGHT = 600;
  onDestroy(() => {
  });
  $$payload.out += `<div class="game-wrapper relative w-full h-full flex items-center justify-center overflow-hidden svelte-191lvqb"><button class="size-control-toggle hidden lg:block svelte-191lvqb"><span class="arcade-text flex items-center justify-center svelte-191lvqb">`;
  Gear($$payload, { width: 12, class: "mr-2" });
  $$payload.out += `<!----> <p class="mt-1 svelte-191lvqb">SIZE</p></span></button> `;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> <div class="game-scale-wrapper flex justify-center items-center svelte-191lvqb"><div class="game-container svelte-191lvqb"${attr("style", `width: ${stringify(GAME_WIDTH)}px; height: ${stringify(GAME_HEIGHT)}px;`)}><div id="reflection" class="absolute inset-0 pointer-events-none z-[3] svelte-191lvqb"></div> <canvas id="gameCanvas"${attr("width", GAME_WIDTH)}${attr("height", GAME_HEIGHT)} class="canvas-pixel-art svelte-191lvqb"></canvas> <div id="scanline-overlay" class="absolute inset-0 pointer-events-none z-10 svelte-191lvqb"></div> <div class="neon-glow svelte-191lvqb"></div></div></div> `;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--></div>`;
  pop();
}
function GameComponent($$payload) {
  let decorativeText = [
    {
      text: "HIGH SCORE",
      value: "000000",
      side: "left"
    },
    { text: "1UP", value: "0", side: "right" }
  ];
  const each_array = ensure_array_like(decorativeText.filter((item) => item.side === "left"));
  const each_array_1 = ensure_array_like(decorativeText.filter((item) => item.side === "right"));
  $$payload.out += `<div class="flex items-center justify-center w-full h-full p-[1vmin]"><div class="game-background svelte-x9a91d"><div class="hidden lg:block"><div class="side-panel left svelte-x9a91d"><!--[-->`;
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let item = each_array[$$index];
    $$payload.out += `<div class="arcade-text svelte-x9a91d"><span class="label svelte-x9a91d">${escape_html(item.text)}</span> <span class="value svelte-x9a91d">${escape_html(item.value)}</span></div>`;
  }
  $$payload.out += `<!--]--> <div class="neon-line svelte-x9a91d"></div> <div class="pixel-decoration svelte-x9a91d"></div></div></div> <div class="game-view-container w-full lg:max-w-[calc(100%-300px)] svelte-x9a91d">`;
  Game($$payload);
  $$payload.out += `<!----></div> <div class="hidden lg:block"><div class="side-panel right svelte-x9a91d"><!--[-->`;
  for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
    let item = each_array_1[$$index_1];
    $$payload.out += `<div class="arcade-text svelte-x9a91d"><span class="label svelte-x9a91d">${escape_html(item.text)}</span> <span class="value svelte-x9a91d">${escape_html(item.value)}</span></div>`;
  }
  $$payload.out += `<!--]--> <div class="neon-line svelte-x9a91d"></div> <div class="pixel-decoration svelte-x9a91d"></div></div></div></div></div>`;
}
const animationState = writable({
  stars: Array(300).fill(null).map(() => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    z: Math.random() * 0.7 + 0.1,
    opacity: Math.random() * 0.5 + 0.5,
    style: ""
  })),
  glitchInterval: null,
  animationFrame: null,
  glowAnimation: null,
  isAnimating: false
});
const screenStore = writable("main");
function Hero($$payload, $$props) {
  push();
  var $$store_subs;
  let currentScreen = "main";
  let stars = [];
  function stopAnimations() {
    const state = get(animationState);
    if (state.glitchInterval) clearInterval(state.glitchInterval);
    if (state.animationFrame) cancelAnimationFrame(state.animationFrame);
    if (state.glowAnimation) state.glowAnimation.kill();
    gsap.killTweensOf("*");
    animationState.set({ ...state, stars: [], isAnimating: false });
  }
  function handleScreenChange(event) {
    const newScreen = event.detail;
    screenStore.set(newScreen);
    currentScreen = newScreen;
  }
  onDestroy(() => {
    return;
  });
  {
    stars = store_get($$store_subs ??= {}, "$animationState", animationState).stars;
  }
  if (currentScreen === "main") ;
  else {
    stopAnimations();
  }
  $$payload.out += `<section id="hero" class="w-full relative overflow-hidden flex items-center justify-center svelte-1233bo7"${attr("style", ` margin-top: calc(-${stringify(store_get($$store_subs ??= {}, "$layoutStore", layoutStore).navbarHeight)}px); height: calc(100vh + ${stringify(store_get($$store_subs ??= {}, "$layoutStore", layoutStore).navbarHeight)}px); `)}><div id="arcade-cabinet" class="w-full h-full relative flex items-center justify-center svelte-1233bo7"><div class="cabinet-background absolute inset-0 svelte-1233bo7"></div> <div class="arcade-screen-wrapper relative svelte-1233bo7"><div class="navigation-wrapper relative z-50 svelte-1233bo7">`;
  ArcadeNavigation($$payload);
  $$payload.out += `<!----></div> <div id="arcade-screen" class="relative w-[90vw] h-[70vh] md:w-[80vw] md:h-[600px] glow svelte-1233bo7"><div id="reflection" class="absolute inset-0 pointer-events-none svelte-1233bo7"></div> <div class="glow-effect svelte-1233bo7"></div> <div id="scanline-overlay" class="absolute inset-0 pointer-events-none z-10 svelte-1233bo7"></div> `;
  if (currentScreen === "main") {
    $$payload.out += "<!--[-->";
    const each_array = ensure_array_like(stars);
    $$payload.out += `<div id="space-background" class="absolute inset-0 overflow-hidden pointer-events-none svelte-1233bo7"><div class="star-container absolute inset-0 pointer-events-none svelte-1233bo7"><!--[-->`;
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let star = each_array[$$index];
      $$payload.out += `<div class="star absolute svelte-1233bo7"${attr("style", star.style)}></div>`;
    }
    $$payload.out += `<!--]--></div></div> <div id="text-wrapper" class="absolute inset-0 flex flex-col items-center justify-center z-0 p-2 box-border svelte-1233bo7"><div id="header" class="text-center mb-2 svelte-1233bo7">Power-up Your Brand!</div> <div id="insert-concept" class="text-center svelte-1233bo7">Insert Concept</div> <div class="mt-8 svelte-1233bo7">`;
    ArcadeCtaButton($$payload);
    $$payload.out += `<!----></div></div>`;
  } else {
    $$payload.out += "<!--[!-->";
    if (currentScreen === "game") {
      $$payload.out += "<!--[-->";
      GameComponent($$payload);
    } else {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]-->`;
  }
  $$payload.out += `<!--]--></div></div></div></section>`;
  if ($$store_subs) unsubscribe_stores($$store_subs);
  bind_props($$props, { handleScreenChange });
  pop();
}
function _page($$payload, $$props) {
  push();
  var $$store_subs;
  head($$payload, ($$payload2) => {
    $$payload2.out += `<link href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;500;600;700&amp;family=VT323&amp;display=swap" rel="stylesheet">`;
  });
  $$payload.out += `<div class="min-h-screen bg-background dark:bg-background-dark text-[color:var(--arcade-black-500)] dark:text-[color:var(--arcade-white-200)]"${attr("style", `margin-top: calc(-${stringify(store_get($$store_subs ??= {}, "$layoutStore", layoutStore).navbarHeight)}px)`)}><div class="container-fluid">`;
  Hero($$payload, {});
  $$payload.out += `<!----> <section id="about" class="mt-12"><h2 class="text-3xl md:text-4xl font-press-start">About Me</h2> <p class="mt-4 text-lg md:text-2xl"></p></section> <section id="work" class="mt-12"><h2 class="text-3xl md:text-4xl font-press-start">Work</h2></section> <section id="contact" class="mt-12"><h2 class="text-3xl md:text-4xl font-press-start">Contact</h2></section></div></div>`;
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
