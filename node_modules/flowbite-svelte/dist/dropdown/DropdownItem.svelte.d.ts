import { SvelteComponentTyped } from "svelte";
import type { HTMLAttributes } from 'svelte/elements';
declare const __propDef: {
    props: HTMLAttributes<HTMLAnchorElement | HTMLButtonElement> & {
        defaultClass?: string;
        href?: string;
        activeClass?: string;
    };
    events: {
        click: MouseEvent;
        change: Event;
        keydown: KeyboardEvent;
        keyup: KeyboardEvent;
        focus: FocusEvent;
        blur: FocusEvent;
        mouseenter: MouseEvent;
        mouseleave: MouseEvent;
    } & {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        default: {};
    };
};
export type DropdownItemProps = typeof __propDef.props;
export type DropdownItemEvents = typeof __propDef.events;
export type DropdownItemSlots = typeof __propDef.slots;
/**
 * [Go to docs](https://flowbite-svelte.com/)
 * ## Props
 * @prop export let defaultClass: $$Props['defaultClass'] = 'font-medium py-2 px-4 text-sm hover:bg-gray-100 dark:hover:bg-gray-600';
 * @prop export let href: $$Props['href'] = undefined;
 * @prop export let activeClass: $$Props['activeClass'] = undefined;
 * @prop export let active: boolean = false;
 */
export default class DropdownItem extends SvelteComponentTyped<DropdownItemProps, DropdownItemEvents, DropdownItemSlots> {
}
export {};
