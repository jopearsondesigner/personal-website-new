export async function load() {
	const projects = [
		{ title: 'Project 1', description: 'Description of Project 1', link: '/projects/project-1' },
		{ title: 'Project 2', description: 'Description of Project 2', link: '/projects/project-2' }
		// Add more projects as needed
	];
	return { projects };
}
