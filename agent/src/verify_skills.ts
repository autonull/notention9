import { IndeedSkill, CraigslistSkill, GitHubSkill, Note } from '@notention/core';

async function verifySkills() {
    console.log('🧪 Verifying Standard Skills (Core)...');

    const indeed = new IndeedSkill();
    const craigslist = new CraigslistSkill();
    const github = new GitHubSkill();

    // Test Indeed
    const jobNote = {
        id: '1',
        content: 'Find react jobs in San Francisco',
        properties: [
            { key: 'role', values: ['react developer'] },
            { key: 'location', values: ['San Francisco'] }
        ],
        tags: [],
        createdAt: new Date().toISOString()
    } as unknown as Note;

    const indeedSequence = indeed.exportToActions(jobNote);
    const indeedNav = indeedSequence.actions.find(a => a.type === 'navigate');
    console.log('Indeed Action:', indeedNav?.url);

    if (indeedNav?.url?.includes('q=react') && indeedNav?.url?.includes('indeed')) {
        console.log('✅ Indeed Skill passes');
    } else {
        console.error('❌ Indeed Skill failed', indeedNav);
    }

    // Test Craigslist
    const clNote = {
        id: '2',
        content: 'apartment for rent',
        properties: [
            { key: 'query', values: ['apartment'] },
            { key: 'category', values: ['apa'] }
        ],
        tags: [],
        createdAt: new Date().toISOString()
    } as unknown as Note;

    const clSequence = craigslist.exportToActions(clNote);
    const clNav = clSequence.actions.find(a => a.type === 'navigate');
    console.log('CL Action:', clNav?.url);
    if (clNav?.url?.includes('apa')) {
        console.log('✅ Craigslist Skill passes');
    } else {
        console.error('❌ Craigslist Skill failed', clNav);
    }

    // Test GitHub
    const ghNote = {
        id: '3',
        content: 'notention-agent',
        properties: [
            { key: 'query', values: ['notention-agent'] }
        ],
        tags: [],
        createdAt: new Date().toISOString()
    } as unknown as Note;

    const ghSequence = github.exportToActions(ghNote);
    const ghNav = ghSequence.actions.find(a => a.type === 'navigate');
    console.log('GH Action:', ghNav?.url);
    if (ghNav?.url?.includes('q=notention-agent')) {
        console.log('✅ GitHub Skill passes');
    } else {
        console.error('❌ GitHub Skill failed', ghNav);
    }
}

verifySkills();
