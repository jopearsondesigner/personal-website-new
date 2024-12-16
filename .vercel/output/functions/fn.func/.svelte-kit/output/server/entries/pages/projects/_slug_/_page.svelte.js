import { a0 as escape_html, X as bind_props, S as pop, Q as push } from "../../../../chunks/index.js";
function _page($$payload, $$props) {
  push();
  let data = $$props["data"];
  $$payload.out += `<div class="bg-darkModeBg text-arcadeWhite min-h-screen p-4 md:p-8"><div class="container mx-auto"><h1 class="text-4xl font-arcade text-arcadeRed">${escape_html(data.project.title)}</h1> <p class="mt-4 text-lg">${escape_html(data.project.description)}</p> <div class="mt-8"><a href="/" class="p-2 bg-arcadeRed text-arcadeWhite rounded hover:bg-red-700">Back to Home</a></div></div></div>`;
  bind_props($$props, { data });
  pop();
}
export {
  _page as default
};
