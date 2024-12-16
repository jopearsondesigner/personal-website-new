import { SvelteComponentTyped } from "svelte";
import type { HTMLAttributes } from 'svelte/elements';
declare const __propDef: {
    props: HTMLAttributes<HTMLAnchorElement | HTMLDivElement> & {
        href?: string;
        activeClass?: string;
        nonActiveClass?: string;
    };
    events: {
        blur: FocusEvent;
        change: Event;
        click: MouseEvent;
        focus: FocusEvent;
        keydown: KeyboardEvent;
        keypress: KeyboardEvent;
        keyup: KeyboardEvent;
        mouseenter: MouseEvent;
        mouseleave: MouseEvent;
        mouseover: MouseEvent;
    } & {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        default: {};
    };
};
export type NavLiProps = typeof __propDef.props;
export type NavLiEvents = typeof __propDef.events;
export type NavLiSlots = typeof __propDef.slots;
/**
 * [Go to docs](https://flowbite-svelte.com/)
 * ## Props
 * @prop export let href: $$Props['href'] = '';
 * @prop export let activeClass: $$Props['activeClass'] = undefined;
 * @prop export let nonActiveClass: $$Props['nonActiveClass'] = undefined;
 */
export default class NavLi extends SvelteComponentTyped<NavLiProps, NavLiEvents, NavLiSlots> {
}
export {};
