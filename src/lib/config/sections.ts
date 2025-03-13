// src/lib/config/sections.ts
import type { ComponentType } from 'svelte';

// Section configuration interface
export interface SectionConfig {
	id: string; // Unique identifier for the section (used for navigation)
	component: ComponentType; // The actual Svelte component
	title: string; // Display title for navigation
	order: number; // Order in which sections appear
	fullHeight?: boolean; // Whether section should take up full viewport height
	showInNav?: boolean; // Whether to show in navigation (default: true)
	props?: Record<string, any>; // Optional props to pass to component
}

// Import all section components
import Hero from '$lib/components/sections/Hero.svelte';
import About from '$lib/components/sections/About.svelte';
import Work from '$lib/components/sections/Work.svelte';
import Contact from '$lib/components/sections/Contact.svelte';
// Remove the Blog import since the component doesn't exist

// Define your sections configuration
export const sections: SectionConfig[] = [
	{
		id: 'hero',
		component: Hero,
		title: 'Home',
		order: 1,
		fullHeight: true,
		showInNav: true
	},
	{
		id: 'about',
		component: About,
		title: 'About',
		order: 2,
		showInNav: true
	},
	{
		id: 'work',
		component: Work,
		title: 'Work',
		order: 3,
		showInNav: true
	},
	{
		id: 'contact',
		component: Contact,
		title: 'Contact',
		order: 4,
		showInNav: true
	}
];

// Helper function to get sections for navigation
export function getNavSections(): SectionConfig[] {
	return sections
		.filter((section) => section.showInNav !== false)
		.sort((a, b) => a.order - b.order);
}

// Helper to get all sections in order
export function getAllSections(): SectionConfig[] {
	return [...sections].sort((a, b) => a.order - b.order);
}
