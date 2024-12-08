export async function load({ params }: { params: { slug: string } }) {
    const projects: { [key: string]: { title: string; description: string; } } = {
        'project-1': { title: 'Project 1', description: 'Detailed description of Project 1' },
        'project-2': { title: 'Project 2', description: 'Detailed description of Project 2' }
        // Add more projects as needed
    };

    if (params.slug in projects) {
        return { project: projects[params.slug] };
    } else {
        // Handle the case when the slug is not found
        return { project: null };
    }
}