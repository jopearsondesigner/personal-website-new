import { T as rest_props, R as setContext, V as fallback, W as element, X as bind_props, S as pop, Y as sanitize_props, Q as push, Z as slot, _ as spread_attributes, $ as getContext, a0 as escape_html, a1 as spread_props, a2 as invalid_default_snippet, a3 as attr, a4 as store_get, a5 as unsubscribe_stores, a6 as stringify, a7 as copy_payload, a8 as assign_payload, a9 as head } from "../../chunks/index.js";
import { w as writable } from "../../chunks/index2.js";
import { twMerge } from "tailwind-merge";
import { p as page } from "../../chunks/stores.js";
const bgColors = {
  gray: "bg-gray-50 dark:bg-gray-800",
  red: "bg-red-50 dark:bg-gray-800",
  yellow: "bg-yellow-50 dark:bg-gray-800 ",
  green: "bg-green-50 dark:bg-gray-800 ",
  indigo: "bg-indigo-50 dark:bg-gray-800 ",
  purple: "bg-purple-50 dark:bg-gray-800 ",
  pink: "bg-pink-50 dark:bg-gray-800 ",
  blue: "bg-blue-50 dark:bg-gray-800 ",
  light: "bg-gray-50 dark:bg-gray-700",
  dark: "bg-gray-50 dark:bg-gray-800",
  default: "bg-white dark:bg-gray-800",
  dropdown: "bg-white dark:bg-gray-700",
  navbar: "bg-white dark:bg-gray-900",
  navbarUl: "bg-gray-50 dark:bg-gray-800",
  form: "bg-gray-50 dark:bg-gray-700",
  primary: "bg-primary-50 dark:bg-gray-800 ",
  orange: "bg-orange-50 dark:bg-orange-800",
  none: ""
};
function Frame($$payload, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, [
    "tag",
    "color",
    "rounded",
    "border",
    "shadow",
    "node",
    "use",
    "options",
    "role",
    "transition",
    "params",
    "open"
  ]);
  push();
  const noop = () => {
  };
  setContext("background", true);
  let tag = fallback($$props["tag"], () => $$restProps.href ? "a" : "div", true);
  let color = fallback($$props["color"], "default");
  let rounded = fallback($$props["rounded"], false);
  let border = fallback($$props["border"], false);
  let shadow = fallback($$props["shadow"], false);
  let node = fallback($$props["node"], () => void 0, true);
  let use = fallback($$props["use"], noop);
  let options = fallback($$props["options"], () => ({}), true);
  let role = fallback($$props["role"], () => void 0, true);
  let transition = fallback($$props["transition"], () => void 0, true);
  let params = fallback($$props["params"], () => ({}), true);
  let open = fallback($$props["open"], true);
  const textColors = {
    gray: "text-gray-800 dark:text-gray-300",
    red: "text-red-800 dark:text-red-400",
    yellow: "text-yellow-800 dark:text-yellow-300",
    green: "text-green-800 dark:text-green-400",
    indigo: "text-indigo-800 dark:text-indigo-400",
    purple: "text-purple-800 dark:text-purple-400",
    pink: "text-pink-800 dark:text-pink-400",
    blue: "text-blue-800 dark:text-blue-400",
    light: "text-gray-700 dark:text-gray-300",
    dark: "text-gray-700 dark:text-gray-300",
    default: "text-gray-500 dark:text-gray-400",
    dropdown: "text-gray-700 dark:text-gray-200",
    navbar: "text-gray-700 dark:text-gray-200",
    navbarUl: "text-gray-700 dark:text-gray-400",
    form: "text-gray-900 dark:text-white",
    primary: "text-primary-800 dark:text-primary-400",
    orange: "text-orange-800 dark:text-orange-400",
    none: ""
  };
  const borderColors = {
    gray: "border-gray-300 dark:border-gray-800 divide-gray-300 dark:divide-gray-800",
    red: "border-red-300 dark:border-red-800 divide-red-300 dark:divide-red-800",
    yellow: "border-yellow-300 dark:border-yellow-800 divide-yellow-300 dark:divide-yellow-800",
    green: "border-green-300 dark:border-green-800 divide-green-300 dark:divide-green-800",
    indigo: "border-indigo-300 dark:border-indigo-800 divide-indigo-300 dark:divide-indigo-800",
    purple: "border-purple-300 dark:border-purple-800 divide-purple-300 dark:divide-purple-800",
    pink: "border-pink-300 dark:border-pink-800 divide-pink-300 dark:divide-pink-800",
    blue: "border-blue-300 dark:border-blue-800 divide-blue-300 dark:divide-blue-800",
    light: "border-gray-500 divide-gray-500",
    dark: "border-gray-500 divide-gray-500",
    default: "border-gray-200 dark:border-gray-700 divide-gray-200 dark:divide-gray-700",
    dropdown: "border-gray-100 dark:border-gray-600 divide-gray-100 dark:divide-gray-600",
    navbar: "border-gray-100 dark:border-gray-700 divide-gray-100 dark:divide-gray-700",
    navbarUl: "border-gray-100 dark:border-gray-700 divide-gray-100 dark:divide-gray-700",
    form: "border-gray-300 dark:border-gray-700 divide-gray-300 dark:divide-gray-700",
    primary: "border-primary-500 dark:border-primary-200  divide-primary-500 dark:divide-primary-200 ",
    orange: "border-orange-300 dark:border-orange-800 divide-orange-300 dark:divide-orange-800",
    none: ""
  };
  let divClass;
  color = color ?? "default";
  setContext("color", color);
  divClass = twMerge(bgColors[color], textColors[color], rounded && "rounded-lg", border && "border", borderColors[color], shadow && "shadow-md", $$sanitized_props.class);
  if (transition && open) {
    $$payload.out += "<!--[-->";
    element(
      $$payload,
      tag,
      () => {
        $$payload.out += `${spread_attributes({ role, ...$$restProps, class: divClass })}`;
      },
      () => {
        $$payload.out += `<!---->`;
        slot($$payload, $$props, "default", {});
        $$payload.out += `<!---->`;
      }
    );
  } else {
    $$payload.out += "<!--[!-->";
    if (open) {
      $$payload.out += "<!--[-->";
      element(
        $$payload,
        tag,
        () => {
          $$payload.out += `${spread_attributes({ role, ...$$restProps, class: divClass })}`;
        },
        () => {
          $$payload.out += `<!---->`;
          slot($$payload, $$props, "default", {});
          $$payload.out += `<!---->`;
        }
      );
    } else {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]-->`;
  }
  $$payload.out += `<!--]-->`;
  bind_props($$props, {
    tag,
    color,
    rounded,
    border,
    shadow,
    node,
    use,
    options,
    role,
    transition,
    params,
    open
  });
  pop();
}
function ToolbarButton($$payload, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, [
    "color",
    "name",
    "ariaLabel",
    "size",
    "href"
  ]);
  push();
  let color = fallback($$props["color"], "default");
  let name = fallback($$props["name"], () => void 0, true);
  let ariaLabel = fallback($$props["ariaLabel"], () => void 0, true);
  let size = fallback($$props["size"], "md");
  let href = fallback($$props["href"], () => void 0, true);
  const background = getContext("background");
  const colors = {
    dark: "text-gray-500 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600",
    gray: "text-gray-500 focus:ring-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 dark:hover:text-gray-300",
    red: "text-red-500 focus:ring-red-400 hover:bg-red-200 dark:hover:bg-red-800 dark:hover:text-red-300",
    yellow: "text-yellow-500 focus:ring-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-800 dark:hover:text-yellow-300",
    green: "text-green-500 focus:ring-green-400 hover:bg-green-200 dark:hover:bg-green-800 dark:hover:text-green-300",
    indigo: "text-indigo-500 focus:ring-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-800 dark:hover:text-indigo-300",
    purple: "text-purple-500 focus:ring-purple-400 hover:bg-purple-200 dark:hover:bg-purple-800 dark:hover:text-purple-300",
    pink: "text-pink-500 focus:ring-pink-400 hover:bg-pink-200 dark:hover:bg-pink-800 dark:hover:text-pink-300",
    blue: "text-blue-500 focus:ring-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 dark:hover:text-blue-300",
    primary: "text-primary-500 focus:ring-primary-400 hover:bg-primary-200 dark:hover:bg-primary-800 dark:hover:text-primary-300",
    default: "focus:ring-gray-400 hover:bg-gray-100"
  };
  const sizing = {
    xs: "m-0.5 rounded-sm focus:ring-1 p-0.5",
    sm: "m-0.5 rounded focus:ring-1 p-0.5",
    md: "m-0.5 rounded-lg focus:ring-2 p-1.5",
    lg: "m-0.5 rounded-lg focus:ring-2 p-2.5"
  };
  let buttonClass;
  const svgSizes = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    md: "w-5 h-5",
    lg: "w-5 h-5"
  };
  buttonClass = twMerge("focus:outline-none whitespace-normal", sizing[size], colors[color], color === "default" && (background ? "dark:hover:bg-gray-600" : "dark:hover:bg-gray-700"), $$sanitized_props.class);
  if (href) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<a${spread_attributes({
      href,
      ...$$restProps,
      class: buttonClass,
      "aria-label": ariaLabel ?? name
    })}>`;
    if (name) {
      $$payload.out += "<!--[-->";
      $$payload.out += `<span class="sr-only">${escape_html(name)}</span>`;
    } else {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]--> <!---->`;
    slot($$payload, $$props, "default", { svgSize: svgSizes[size] });
    $$payload.out += `<!----></a>`;
  } else {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<button${spread_attributes({
      type: "button",
      ...$$restProps,
      class: buttonClass,
      "aria-label": ariaLabel ?? name
    })}>`;
    if (name) {
      $$payload.out += "<!--[-->";
      $$payload.out += `<span class="sr-only">${escape_html(name)}</span>`;
    } else {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]--> <!---->`;
    slot($$payload, $$props, "default", { svgSize: svgSizes[size] });
    $$payload.out += `<!----></button>`;
  }
  $$payload.out += `<!--]-->`;
  bind_props($$props, { color, name, ariaLabel, size, href });
  pop();
}
function CloseButton($$payload, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, ["name"]);
  push();
  let name = fallback($$props["name"], "Close");
  ToolbarButton($$payload, spread_props([
    { name },
    $$restProps,
    {
      class: twMerge("ms-auto", $$sanitized_props.class),
      children: invalid_default_snippet,
      $$slots: {
        default: ($$payload2, { svgSize }) => {
          $$payload2.out += `<svg${attr("class", svgSize)} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>`;
        }
      }
    }
  ]));
  bind_props($$props, { name });
  pop();
}
function Drawer($$payload, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, [
    "activateClickOutside",
    "hidden",
    "position",
    "leftOffset",
    "rightOffset",
    "topOffset",
    "bottomOffset",
    "width",
    "backdrop",
    "bgColor",
    "bgOpacity",
    "placement",
    "id",
    "divClass",
    "transitionParams",
    "transitionType"
  ]);
  push();
  let activateClickOutside = fallback($$props["activateClickOutside"], true);
  let hidden = fallback($$props["hidden"], true);
  let position = fallback($$props["position"], "fixed");
  let leftOffset = fallback($$props["leftOffset"], "inset-y-0 start-0");
  let rightOffset = fallback($$props["rightOffset"], "inset-y-0 end-0");
  let topOffset = fallback($$props["topOffset"], "inset-x-0 top-0");
  let bottomOffset = fallback($$props["bottomOffset"], "inset-x-0 bottom-0");
  let width = fallback($$props["width"], "w-80");
  let backdrop = fallback($$props["backdrop"], true);
  let bgColor = fallback($$props["bgColor"], "bg-gray-900");
  let bgOpacity = fallback($$props["bgOpacity"], "bg-opacity-75");
  let placement = fallback($$props["placement"], "left");
  let id = fallback($$props["id"], "drawer-example");
  let divClass = fallback($$props["divClass"], "overflow-y-auto z-50 p-4 bg-white dark:bg-gray-800");
  let transitionParams = fallback($$props["transitionParams"], () => ({}), true);
  let transitionType = fallback($$props["transitionType"], "fly");
  const placements = {
    left: leftOffset,
    right: rightOffset,
    top: topOffset,
    bottom: bottomOffset
  };
  let backdropDivClass = twMerge("fixed top-0 start-0 z-50 w-full h-full", backdrop && bgColor, backdrop && bgOpacity);
  if (!hidden) {
    $$payload.out += "<!--[-->";
    if (backdrop && activateClickOutside) {
      $$payload.out += "<!--[-->";
      $$payload.out += `<div role="presentation"${attr("class", backdropDivClass)}></div>`;
    } else {
      $$payload.out += "<!--[!-->";
      if (backdrop && !activateClickOutside) {
        $$payload.out += "<!--[-->";
        $$payload.out += `<div role="presentation"${attr("class", backdropDivClass)}></div>`;
      } else {
        $$payload.out += "<!--[!-->";
      }
      $$payload.out += `<!--]-->`;
    }
    $$payload.out += `<!--]--> <div${spread_attributes({
      id,
      ...$$restProps,
      class: twMerge(divClass, width, position, placements[placement], $$sanitized_props.class),
      tabindex: "-1",
      "aria-controls": id,
      "aria-labelledby": id
    })}><!---->`;
    slot($$payload, $$props, "default", { hidden });
    $$payload.out += `<!----></div>`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  bind_props($$props, {
    activateClickOutside,
    hidden,
    position,
    leftOffset,
    rightOffset,
    topOffset,
    bottomOffset,
    width,
    backdrop,
    bgColor,
    bgOpacity,
    placement,
    id,
    divClass,
    transitionParams,
    transitionType
  });
  pop();
}
function NavContainer($$payload, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, ["fluid"]);
  push();
  let fluid = fallback($$props["fluid"], false);
  $$payload.out += `<div${spread_attributes({
    class: twMerge("mx-auto flex flex-wrap justify-between items-center ", fluid ? "w-full" : "container", $$sanitized_props.class),
    ...$$restProps
  })}><!---->`;
  slot($$payload, $$props, "default", {});
  $$payload.out += `<!----></div>`;
  bind_props($$props, { fluid });
  pop();
}
function Navbar($$payload, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, ["fluid"]);
  push();
  var $$store_subs;
  let fluid = fallback($$props["fluid"], false);
  let hidden = writable(true);
  setContext("navHidden", hidden);
  let toggle = () => hidden.update((hidden2) => !hidden2);
  {
    $$restProps.color = $$restProps.color ?? "navbar";
  }
  Frame($$payload, spread_props([
    { tag: "nav" },
    $$restProps,
    {
      class: twMerge("px-2 sm:px-4 py-2.5 w-full", $$sanitized_props.class),
      children: ($$payload2) => {
        NavContainer($$payload2, {
          fluid,
          children: ($$payload3) => {
            $$payload3.out += `<!---->`;
            slot(
              $$payload3,
              $$props,
              "default",
              {
                hidden: store_get($$store_subs ??= {}, "$hidden", hidden),
                toggle,
                NavContainer
              }
            );
            $$payload3.out += `<!---->`;
          },
          $$slots: { default: true }
        });
      },
      $$slots: { default: true }
    }
  ]));
  if ($$store_subs) unsubscribe_stores($$store_subs);
  bind_props($$props, { fluid });
  pop();
}
function NavBrand($$payload, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, ["href"]);
  push();
  let href = fallback($$props["href"], "");
  $$payload.out += `<a${spread_attributes({
    href,
    ...$$restProps,
    class: twMerge("flex items-center", $$sanitized_props.class)
  })}><!---->`;
  slot($$payload, $$props, "default", {});
  $$payload.out += `<!----></a>`;
  bind_props($$props, { href });
  pop();
}
function sineIn(t) {
  const v = Math.cos(t * Math.PI * 0.5);
  if (Math.abs(v) < 1e-14) return 1;
  else return 1 - v;
}
const loadingStore = writable(true);
const logo = "data:image/svg+xml,%3c?xml%20version='1.0'%20encoding='UTF-8'?%3e%3csvg%20xmlns='http://www.w3.org/2000/svg'%20xmlns:xlink='http://www.w3.org/1999/xlink'%20version='1.1'%20viewBox='0%200%20104.4%20107.8'%3e%3cdefs%3e%3cstyle%3e%20.cls-1%20{%20fill:%20url(%23linear-gradient-5);%20}%20.cls-2%20{%20fill:%20url(%23linear-gradient-4);%20}%20.cls-3%20{%20fill:%20url(%23linear-gradient-3);%20}%20.cls-4%20{%20fill:%20url(%23linear-gradient-2);%20}%20.cls-5%20{%20fill:%20url(%23linear-gradient);%20}%20%3c/style%3e%3clinearGradient%20id='linear-gradient'%20x1='54.8'%20y1='990.1'%20x2='67.9'%20y2='976.5'%20gradientTransform='translate(0%20-970)'%20gradientUnits='userSpaceOnUse'%3e%3cstop%20offset='0'%20stop-color='%2300a8a8'%20stop-opacity='0'/%3e%3cstop%20offset='.7'%20stop-color='%2300a8a8'%20stop-opacity='.7'/%3e%3cstop%20offset='1'%20stop-color='%2300a8a8'/%3e%3c/linearGradient%3e%3clinearGradient%20id='linear-gradient-2'%20x1='72.2'%20y1='992.4'%20x2='91.3'%20y2='996.7'%20gradientTransform='translate(0%20-970)'%20gradientUnits='userSpaceOnUse'%3e%3cstop%20offset='0'%20stop-color='%2300a8a8'%20stop-opacity='0'/%3e%3cstop%20offset='.7'%20stop-color='%2300a8a8'%20stop-opacity='.7'/%3e%3cstop%20offset='1'%20stop-color='%2300a8a8'/%3e%3c/linearGradient%3e%3clinearGradient%20id='linear-gradient-3'%20x1='112.7'%20y1='970.2'%20x2='92.2'%20y2='989.8'%20gradientTransform='translate(0%20-970)'%20gradientUnits='userSpaceOnUse'%3e%3cstop%20offset='0'%20stop-color='%2300a8a8'%20stop-opacity='0'/%3e%3cstop%20offset='1'%20stop-color='%2300a8a8'/%3e%3c/linearGradient%3e%3clinearGradient%20id='linear-gradient-4'%20x1='54.3'%20y1='976.8'%20x2='53.8'%20y2='1013.6'%20gradientTransform='translate(0%20-970)'%20gradientUnits='userSpaceOnUse'%3e%3cstop%20offset='0'%20stop-color='%2300a8a8'%20stop-opacity='0'/%3e%3cstop%20offset='1'%20stop-color='%2300a8a8'/%3e%3c/linearGradient%3e%3clinearGradient%20id='linear-gradient-5'%20x1='7.1'%20y1='117.1'%20x2='27.8'%20y2='95.1'%20gradientUnits='userSpaceOnUse'%3e%3cstop%20offset='0'%20stop-color='%2300a8a8'%20stop-opacity='0'/%3e%3cstop%20offset='1'%20stop-color='%2300a8a8'/%3e%3c/linearGradient%3e%3c/defs%3e%3c!--%20Generator:%20Adobe%20Illustrator%2028.6.0,%20SVG%20Export%20Plug-In%20.%20SVG%20Version:%201.2.0%20Build%20709)%20--%3e%3cg%3e%3cg%20id='Layer_1'%3e%3cg%20id='Layer_1-2'%20data-name='Layer_1'%3e%3cg%3e%3cg%20id='Page-1'%3e%3cg%20id='logo-main-5'%3e%3cg%20id='logo-main-copy-15'%3e%3cpath%20id='Path_3'%20class='cls-5'%20d='M50.3,8.6c2.8-.6,5.7-.8,8.6-.7,8.1,0,13.4,2.9,15.5,8.1h0c-2.4-.7-4.9-1.1-7.4-1-2.9-.1-5.8.1-8.6.7,0,0-8.1-7.1-8.1-7.1Z'/%3e%3c/g%3e%3c/g%3e%3c/g%3e%3cg%3e%3cg%20id='Page-1-2'%3e%3cg%20id='logo-main-5-2'%3e%3cg%20id='logo-main-copy-15-2'%3e%3cpath%20id='Path_3-2'%20class='cls-4'%20d='M104,32.7l-20.7-5.6-8.1-7.1,20.7,5.6s8.1,7.1,8.1,7.1Z'/%3e%3c/g%3e%3c/g%3e%3c/g%3e%3cg%20id='Page-1-3'%3e%3cg%20id='logo-main-5-3'%3e%3cg%20id='logo-main-copy-15-3'%3e%3cpath%20id='Path_3-3'%20class='cls-3'%20d='M95.9,25.6c.2-1.5.3-3.1.4-4.7C96.3,12.2,93.1,4.8,87.7,0l8.1,7.1c5.4,4.8,8.8,12.2,8.6,20.9,0,1.6-.2,3.2-.4,4.7l-8.1-7.1Z'/%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3cg%3e%3cg%20id='Page-1-4'%3e%3cg%20id='logo-main-5-4'%3e%3cg%20id='logo-main-copy-15-4'%3e%3cpath%20id='Path_3-4'%20class='cls-2'%20d='M49.3,64.6l1-56,8.1,7.1-1,56s-8.1-7.1-8.1-7.1Z'/%3e%3c/g%3e%3c/g%3e%3c/g%3e%3cg%20id='Page-1-5'%3e%3cg%20id='logo-main-5-5'%3e%3cg%20id='logo-main-copy-15-5'%3e%3cpath%20class='cls-1'%20d='M57.4,71.7c-.5,26.7-13.4,36.1-33.8,36.1s-9,0-11-.2c-.8-.5-1.5-1-1.7-1.1,0,0,0,0,0,0L0,98.5c5,1.5,10.3,2.2,15.5,2.2,20.4,0,33.4-9.3,33.8-36.1l8.1,7.1Z'/%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/g%3e%3c/svg%3e";
function Moon($$payload, $$props) {
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
    { bi: true, "bi-moon": true },
    void 0,
    3
  )}><!---->`;
  slot($$payload, $$props, "default", {});
  $$payload.out += `<!----><path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278zM4.858 1.311A7.269 7.269 0 0 0 1.025 7.71c0 4.02 3.279 7.276 7.319 7.276a7.316 7.316 0 0 0 5.205-2.162c-.337.042-.68.063-1.029.063-4.61 0-8.343-3.714-8.343-8.29 0-1.167.242-2.278.681-3.286z"></path></svg>`;
}
function Sun($$payload, $$props) {
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
    { bi: true, "bi-sun": true },
    void 0,
    3
  )}><!---->`;
  slot($$payload, $$props, "default", {});
  $$payload.out += `<!----><path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"></path></svg>`;
}
function LoadingScreen($$payload) {
  var $$store_subs;
  if (store_get($$store_subs ??= {}, "$loadingStore", loadingStore)) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<div class="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--dark-mode-bg)] dark:bg-[var(--dark-mode-bg)] svelte-1mxwioa"><div class="flex flex-col items-center svelte-1mxwioa"><img${attr("src", logo)} alt="Logo" class="h-16 w-16 animate-pulse svelte-1mxwioa"> <div class="mt-4 h-1 w-32 overflow-hidden rounded-full bg-[var(--arcade-white-200)] dark:bg-[var(--arcade-black-700)] svelte-1mxwioa"><div class="h-full w-full animate-progress bg-[var(--arcade-neon-green-200)] transition-transform duration-300 svelte-1mxwioa"></div></div></div></div>`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  if ($$store_subs) unsubscribe_stores($$store_subs);
}
const theme = writable("dark");
function Tooltip($$payload, $$props) {
  let text = $$props["text"];
  let position = fallback($$props["position"], "top");
  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2"
  };
  const arrowClasses = {
    top: "bottom-[-8px] left-1/2 -translate-x-1/2 border-t-arcadeBlack-600 dark:border-t-arcadeWhite-200 border-x-transparent border-b-transparent",
    bottom: "top-[-8px] left-1/2 -translate-x-1/2 border-b-arcadeBlack-600 dark:border-b-arcadeWhite-200 border-x-transparent border-t-transparent",
    left: "right-[-8px] top-1/2 -translate-y-1/2 border-l-arcadeBlack-600 dark:border-l-arcadeWhite-200 border-y-transparent border-r-transparent",
    right: "left-[-8px] top-1/2 -translate-y-1/2 border-r-arcadeBlack-600 dark:border-r-arcadeWhite-200 border-y-transparent border-l-transparent"
  };
  $$payload.out += `<div class="group relative inline-block svelte-vnrs4n"><!---->`;
  slot($$payload, $$props, "default", {});
  $$payload.out += `<!----> <div${attr("class", `absolute pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-300 z-[9999] ${stringify(positionClasses[position])} svelte-vnrs4n`)}><div class="relative svelte-vnrs4n"><div class="bg-arcadeBlack-600 dark:bg-arcadeWhite-200 text-arcadeWhite-200 dark:text-arcadeBlack-700 px-2 py-1 rounded text-xs font-light tracking-wide whitespace-nowrap shadow-lg backdrop-blur-sm bg-opacity-95 svelte-vnrs4n">${escape_html(text)}</div> <div${attr("class", `absolute w-0 h-0 border-[6px] ${stringify(arrowClasses[position])} svelte-vnrs4n`)}></div></div></div></div>`;
  bind_props($$props, { text, position });
}
function _layout($$payload, $$props) {
  push();
  var $$store_subs;
  const navbarHeight = writable(0);
  let hidden = true;
  let transitionParamsRight = { x: 320, duration: 200, easing: sineIn };
  store_get($$store_subs ??= {}, "$page", page).url.pathname;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    head($$payload2, ($$payload3) => {
      $$payload3.out += `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" class="svelte-1psbl68"> <link href="https://fonts.googleapis.com/css2?family=Gruppo&amp;display=swap" rel="stylesheet" class="svelte-1psbl68"> <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&amp;display=swap" rel="stylesheet" class="svelte-1psbl68"> <link href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;500;600;700&amp;family=VT323&amp;display=swap" rel="stylesheet" class="svelte-1psbl68"> <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@100;900&amp;display=swap" rel="stylesheet" class="svelte-1psbl68">`;
    });
    LoadingScreen($$payload2);
    $$payload2.out += `<!----> <nav${attr("class", `sticky relative md:border-b-[2.5px] md:border-arcadeBlack-200 md:dark:border-arcadeBlack-600 top-0 z-[101] ${stringify(store_get($$store_subs ??= {}, "$theme", theme) === "dark" ? "navbar-background-dark" : "navbar-background-light")} p-container-padding box-border md:shadow-header svelte-1psbl68`)}>`;
    Navbar($$payload2, {
      class: "container max-w-screen-xl mx-auto px-4 flex justify-between items-center",
      children: ($$payload3) => {
        NavBrand($$payload3, {
          href: "/",
          children: ($$payload4) => {
            $$payload4.out += `<img${attr("src", logo)} alt="Jo Pearson Logo" class="h-9 w-9 mr-[8px] pt-1 header-logo-pulse svelte-1psbl68"> <span class="hidden lg:inline-block text-[16px] header-text text-[color:var(--arcade-black-500)] dark:text-[color:var(--arcade-white-300)] uppercase tracking-[24.96px] mt-[5px] svelte-1psbl68">Jo Pearson</span>`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!----> <div class="flex md:order-2 items-center gap-4 svelte-1psbl68">`;
        Tooltip($$payload3, {
          text: store_get($$store_subs ??= {}, "$theme", theme) === "dark" ? "Switch to light mode" : "Switch to dark mode",
          position: "bottom",
          children: ($$payload4) => {
            $$payload4.out += `<button class="md:flex items-center justify-center w-10 h-10 rounded-full bg-opacity-20 hover:bg-opacity-30 transition-all duration-300 ease-in dark:text-[var(--arcade-white-300)] text-[var(--arcade-black-500)] svelte-1psbl68" aria-label="Toggle Dark Mode">`;
            if (store_get($$store_subs ??= {}, "$theme", theme) === "dark") {
              $$payload4.out += "<!--[-->";
              Sun($$payload4, { size: 20 });
            } else {
              $$payload4.out += "<!--[!-->";
              Moon($$payload4, { size: 20 });
            }
            $$payload4.out += `<!--]--></button>`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!----> <button class="text-arcadeBlack-500 dark:text-arcadeWhite-300 focus:outline-none whitespace-normal m-0.5 rounded-lg focus:ring-2 p-1.5 focus:ring-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 lg:hidden svelte-1psbl68"><svg class="w-6 h-6 svelte-1psbl68" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" class="svelte-1psbl68"></path></svg></button></div> <div class="lg:flex lg:flex-wrap lg:order-1 hidden svelte-1psbl68"><a href="/"${attr("class", `svelte-1psbl68 ${stringify([
          "nav-button",
          "active"
        ].filter(Boolean).join(" "))}`)}>Home</a> <a href="/#work"${attr("class", `svelte-1psbl68 ${stringify([
          "nav-button",
          ""
        ].filter(Boolean).join(" "))}`)}>Work</a> <a href="/#about"${attr("class", `svelte-1psbl68 ${stringify([
          "nav-button",
          ""
        ].filter(Boolean).join(" "))}`)}>About</a> <a href="/#contact"${attr("class", `svelte-1psbl68 ${stringify([
          "nav-button",
          ""
        ].filter(Boolean).join(" "))}`)}>Contact</a> <a href="/#blog"${attr("class", `svelte-1psbl68 ${stringify([
          "nav-button",
          ""
        ].filter(Boolean).join(" "))}`)}>Blog</a></div>`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----></nav> `;
    Drawer($$payload2, {
      placement: "right",
      transitionType: "fly",
      transitionParams: transitionParamsRight,
      get hidden() {
        return hidden;
      },
      set hidden($$value) {
        hidden = $$value;
        $$settled = false;
      },
      id: "sidebar",
      class: `${stringify(store_get($$store_subs ??= {}, "$theme", theme) === "dark" ? "navbar-background-dark" : "navbar-background-light")} p-4`,
      children: ($$payload3) => {
        $$payload3.out += `<div class="flex items-center svelte-1psbl68"><h5 id="drawer-label" class="inline-flex items-center mb-4 text-base font-semibold text-gray-500 dark:text-gray-400 svelte-1psbl68"></h5> `;
        CloseButton($$payload3, {
          class: "mb-4 text-[color:var(--arcade-white-300)]"
        });
        $$payload3.out += `<!----></div> <div class="nav-button-group-mobile svelte-1psbl68"><a href="/"${attr("class", `nav-button-mobile svelte-1psbl68 ${stringify(["active"].filter(Boolean).join(" "))}`)}>Home</a> <a href="/#work"${attr("class", `nav-button-mobile svelte-1psbl68 ${stringify([""].filter(Boolean).join(" "))}`)}>Work</a> <a href="/#about"${attr("class", `nav-button-mobile svelte-1psbl68 ${stringify([""].filter(Boolean).join(" "))}`)}>About</a> <a href="/#contact"${attr("class", `nav-button-mobile svelte-1psbl68 ${stringify([""].filter(Boolean).join(" "))}`)}>Contact</a> <a href="/#blog"${attr("class", `nav-button-mobile svelte-1psbl68 ${stringify([""].filter(Boolean).join(" "))}`)}>Blog</a> <button class="nav-button-mobile flex items-center svelte-1psbl68" aria-label="Toggle Dark Mode">`;
        if (store_get($$store_subs ??= {}, "$theme", theme) === "dark") {
          $$payload3.out += "<!--[-->";
          Sun($$payload3, { class: "mr-2" });
        } else {
          $$payload3.out += "<!--[!-->";
          Moon($$payload3, { class: "mr-2" });
        }
        $$payload3.out += `<!--]--> Theme</button></div>`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----> <main class="content-wrapper svelte-1psbl68"><!---->`;
    slot($$payload2, $$props, "default", {});
    $$payload2.out += `<!----></main>`;
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  bind_props($$props, { navbarHeight });
  pop();
}
export {
  _layout as default
};
