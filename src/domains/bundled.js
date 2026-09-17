// Shipped definitions are immutable; installation-specific changes live in storage.
export const bundledSkills = [{
  domain: 'x.com', name: 'X', description: 'Read and compose content on X.',
  urls: ['https://x.com/'],
  instructions: 'Use the signed-in browser session. Load the relevant action only when needed. Ask the user before publishing content.',
  inputs: [{ name: 'query', type: 'string', description: 'Search text or account handle.' }],
  outputs: [{ name: 'results', type: 'array', description: 'Visible posts, authors, and source URLs.' }],
  actions: [
    { id: 'search', description: 'Search public posts.', url: 'https://x.com/search', inputs: [{ name: 'query', type: 'string', description: 'Search query.' }], outputs: [{ name: 'posts', type: 'array', description: 'Posts visible in the results.' }], instructions: 'Enter the query in search and read the visible results. Preserve source links.' },
    { id: 'compose', description: 'Prepare a post for review.', url: 'https://x.com/compose/post', inputs: [{ name: 'text', type: 'string', description: 'Draft post text.' }], outputs: [{ name: 'draft', type: 'string', description: 'Prepared text for user review.' }], instructions: 'Prepare the draft. Obtain explicit approval before publishing.' },
  ],
}];
