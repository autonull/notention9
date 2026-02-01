
import { IndeedSkill } from './skills/standard/IndeedSkill';
import { CraigslistSkill } from './skills/standard/CraigslistSkill';
import { GitHubSkill } from './skills/standard/GitHubSkill';
import { Note } from '@notention/core/src/types';

async function verifySkills() {
    console.log('🧪 Verifying Standard Skills...');

    const indeed = new IndeedSkill();
    const craigslist = new CraigslistSkill();
    const github = new GitHubSkill();

    // Test Indeed
    const jobNote = {
        id: '1',
        content: 'Find react jobs in San Francisco',
        tags: [],
        timestamp: Date.now()
    } as unknown as Note;

    const indeedAction = await indeed.export(jobNote);
    console.log('Indeed Action:', indeedAction?.url);
    if (indeedAction?.url.includes('q=react') && indeedAction?.url.includes('indeed')) {
        console.log('✅ Indeed Skill passes');
    } else {
        console.error('❌ Indeed Skill failed');
    }

    // Test Craigslist
    const clNote = {
        id: '2',
        content: 'apartment for rent',
        tags: [],
        timestamp: Date.now()
    } as unknown as Note;

    const clAction = await craigslist.export(clNote);
    console.log('CL Action:', clAction?.url);
    if (clAction?.url.includes('apa')) {
        console.log('✅ Craigslist Skill passes');
    } else {
        console.error('❌ Craigslist Skill failed');
    }

    // Test GitHub
    const ghNote = {
        id: '3',
        content: 'notention-agent',
        tags: [],
        timestamp: Date.now()
    } as unknown as Note;

    const ghAction = await github.export(ghNote);
    console.log('GH Action:', ghAction?.url);
    if (ghAction?.url.includes('q=notention-agent')) {
        console.log('✅ GitHub Skill passes');
    } else {
        console.error('❌ GitHub Skill failed');
    }
}

verifySkills();
