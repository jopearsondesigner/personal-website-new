export interface Project {
	title: string;
	description: string;
	// Add other project properties as needed
}

export const projects: Record<string, Project> = {
	'project-1': {
		title: 'Project One',
		description: 'Description for project one'
	},
	'project-2': {
		title: 'Project Two',
		description: 'Description for project two'
	}
};
