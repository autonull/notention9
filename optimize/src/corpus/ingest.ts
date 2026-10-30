import { readFile, readdir, stat, writeFile, mkdir } from 'fs/promises';
import { join, extname, basename, relative } from 'path';
import type { TestCase, MatchTestCase } from '../synthesis/fastEvaluator.js';

export interface CorpusConfig {
    inputDir: string;
    outputDir: string;
    fileExtensions: string[];
    minTermLength: number;
    maxTermsPerFile: number;
    generateTestCases: boolean;
    generateMatchCases: boolean;
}

export interface ExtractedTerm {
    term: string;
    frequency: number;
    files: string[];
    contexts: string[];
    category?: string;
}

export interface CorpusAnalysis {
    totalFiles: number;
    totalTerms: number;
    terms: ExtractedTerm[];
    vocabulary: string[];
    generatedTestCases: TestCase[];
    generatedMatchCases: MatchTestCase[];
    taxonomyGaps: string[];
}

const DEFAULT_CONFIG: CorpusConfig = {
    inputDir: 'corpus',
    outputDir: 'loop/corpus-output',
    fileExtensions: ['.txt', '.md', '.json'],
    minTermLength: 3,
    maxTermsPerFile: 100,
    generateTestCases: true,
    generateMatchCases: true,
};

const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
    'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their',
    'mine', 'yours', 'hers', 'ours', 'theirs', 'what', 'which', 'who', 'whom', 'whose',
    'where', 'when', 'why', 'how', 'all', 'each', 'every', 'some', 'any', 'no', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'now', 'then', 'here',
    'there', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'once',
]);

function isStopWord(word: string): boolean {
    return STOP_WORDS.has(word.toLowerCase());
}

function extractTerms(text: string, minLength: number): string[] {
    const words = text
        .toLowerCase()
        .replace(/[^\w\s'-]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= minLength)
        .filter(w => !isStopWord(w))
        .filter(w => !/^\d+$/.test(w))
        .filter(w => /^[a-z]/.test(w));
    
    return [...new Set(words)];
}

function extractPhrases(text: string, maxWords: number = 3): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const phrases: string[] = [];
    
    for (const sentence of sentences) {
        const words = sentence
            .toLowerCase()
            .replace(/[^\w\s'-]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length >= 2 && !isStopWord(w));
        
        for (let i = 0; i < words.length; i++) {
            for (let len = 2; len <= maxWords && i + len <= words.length; len++) {
                const phrase = words.slice(i, i + len).join(' ');
                if (phrase.length >= 5) {
                    phrases.push(phrase);
                }
            }
        }
    }
    
    return [...new Set(phrases)];
}

function categorizeTerm(term: string): string | undefined {
    const categories: Record<string, string[]> = {
        'work': ['developer', 'engineer', 'programmer', 'coding', 'software', 'project', 'task', 'job', 'career', 'freelance', 'contract', 'remote', 'salary', 'rate', 'hourly', 'skills', 'experience', 'senior', 'junior', 'lead', 'manager', 'architect', 'devops', 'backend', 'frontend', 'fullstack', 'api', 'database', 'testing', 'deployment', 'ci', 'cd', 'github', 'gitlab', 'agile', 'scrum', 'sprint', 'kanban'],
        'commerce': ['buy', 'sell', 'price', 'cost', 'budget', 'payment', 'invoice', 'order', 'product', 'service', 'market', 'customer', 'client', 'vendor', 'supplier', 'wholesale', 'retail', 'discount', 'offer', 'deal', 'transaction', 'purchase', 'revenue', 'profit', 'margin', 'currency', 'usd', 'eur', 'gbp'],
        'communication': ['email', 'message', 'chat', 'call', 'meeting', 'slack', 'teams', 'discord', 'whatsapp', 'telegram', 'signal', 'zoom', 'video', 'voice', 'conference', 'schedule', 'calendar', 'invite', 'reply', 'forward', 'thread', 'conversation', 'notification'],
        'learning': ['learn', 'study', 'course', 'tutorial', 'training', 'certification', 'workshop', 'bootcamp', 'mentor', 'coach', 'guide', 'book', 'article', 'documentation', 'reference', 'example', 'practice', 'exercise', 'project', 'portfolio', 'skill', 'knowledge', 'expertise'],
        'health': ['health', 'medical', 'doctor', 'appointment', 'prescription', 'medication', 'therapy', 'exercise', 'fitness', 'nutrition', 'diet', 'wellness', 'mental', 'stress', 'anxiety', 'sleep', 'hospital', 'clinic', 'insurance', 'treatment', 'diagnosis', 'symptom'],
        'personal': ['family', 'friend', 'home', 'house', 'apartment', 'rent', 'mortgage', 'utilities', 'grocery', 'shopping', 'cooking', 'cleaning', 'maintenance', 'repair', 'renovation', 'move', 'travel', 'vacation', 'holiday', 'trip', 'flight', 'hotel', 'car', 'insurance'],
    };
    
    const lower = term.toLowerCase();
    for (const [category, terms] of Object.entries(categories)) {
        if (terms.some(t => lower.includes(t))) {
            return category;
        }
    }
    return undefined;
}

function extractContext(text: string, term: string, window: number = 50): string[] {
    const contexts: string[] = [];
    const lowerText = text.toLowerCase();
    const lowerTerm = term.toLowerCase();
    let index = 0;
    
    while ((index = lowerText.indexOf(lowerTerm, index)) !== -1) {
        const start = Math.max(0, index - window);
        const end = Math.min(text.length, index + term.length + window);
        const context = text.slice(start, end).trim();
        if (context.length > 10) {
            contexts.push(context);
        }
        index += term.length;
        if (contexts.length >= 3) break;
    }
    
    return contexts;
}

export async function ingestCorpus(config: Partial<CorpusConfig> = {}): Promise<CorpusAnalysis> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    
    console.log(`📂 Ingesting corpus from ${finalConfig.inputDir}...`);
    
    // Ensure directories exist
    await mkdir(finalConfig.inputDir, { recursive: true });
    await mkdir(finalConfig.outputDir, { recursive: true });
    
    // Get all files
    const files = await getFiles(finalConfig.inputDir, finalConfig.fileExtensions);
    console.log(`  Found ${files.length} files`);
    
    // Process each file
    const termMap = new Map<string, ExtractedTerm>();
    const allTerms: string[] = [];
    
    for (const file of files) {
        const content = await readFile(file, 'utf-8');
        const relativePath = relative(finalConfig.inputDir, file);
        
        const terms = extractTerms(content, finalConfig.minTermLength);
        const phrases = extractPhrases(content);
        const allExtracted = [...terms, ...phrases].slice(0, finalConfig.maxTermsPerFile);
        
        for (const term of allExtracted) {
            const existing = termMap.get(term);
            if (existing) {
                existing.frequency++;
                if (!existing.files.includes(relativePath)) {
                    existing.files.push(relativePath);
                }
                const newContexts = extractContext(content, term);
                for (const ctx of newContexts) {
                    if (!existing.contexts.includes(ctx)) {
                        existing.contexts.push(ctx);
                    }
                }
            } else {
                const category = categorizeTerm(term);
                termMap.set(term, {
                    term,
                    frequency: 1,
                    files: [relativePath],
                    contexts: extractContext(content, term),
                    category,
                });
            }
            allTerms.push(term);
        }
    }
    
    // Sort terms by frequency
    const sortedTerms = Array.from(termMap.values())
        .sort((a, b) => b.frequency - a.frequency);
    
    // Extract vocabulary (unique terms)
    const vocabulary = [...new Set(allTerms)].sort();
    
    console.log(`  Extracted ${sortedTerms.length} unique terms from ${files.length} files`);
    console.log(`  Vocabulary size: ${vocabulary.length}`);
    
    // Generate test cases
    let generatedTestCases: TestCase[] = [];
    let generatedMatchCases: MatchTestCase[] = [];
    
    if (finalConfig.generateTestCases) {
        generatedTestCases = generateTestCasesFromCorpus(sortedTerms, vocabulary);
        console.log(`  Generated ${generatedTestCases.length} extraction test cases`);
    }
    
    if (finalConfig.generateMatchCases) {
        generatedMatchCases = generateMatchCasesFromCorpus(sortedTerms);
        console.log(`  Generated ${generatedMatchCases.length} match test cases`);
    }
    
    // Identify taxonomy gaps
    const taxonomyGaps = identifyTaxonomyGaps(sortedTerms);
    console.log(`  Identified ${taxonomyGaps.length} potential taxonomy gaps`);
    
    const analysis: CorpusAnalysis = {
        totalFiles: files.length,
        totalTerms: sortedTerms.length,
        terms: sortedTerms,
        vocabulary,
        generatedTestCases,
        generatedMatchCases,
        taxonomyGaps,
    };
    
    // Write output files
    await writeOutputFiles(finalConfig.outputDir, analysis);
    
    return analysis;
}

async function getFiles(dir: string, extensions: string[]): Promise<string[]> {
    const files: string[] = [];
    
    async function walk(currentDir: string): Promise<void> {
        const entries = await readdir(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = join(currentDir, entry.name);
            if (entry.isDirectory()) {
                await walk(fullPath);
            } else if (extensions.includes(extname(entry.name).toLowerCase())) {
                files.push(fullPath);
            }
        }
    }
    
    try {
        await walk(dir);
    } catch {
        // Directory might not exist
    }
    
    return files;
}

function generateTestCasesFromCorpus(terms: ExtractedTerm[], vocabulary: string[]): TestCase[] {
    const testCases: TestCase[] = [];
    
    // Valid ontology property keys that the extractor can recognize
    const validPropertyKeys = new Set([
        'role', 'skills', 'experience', 'budget', 'rate', 'price', 'location',
        'remote', 'availability', 'deadline', 'project', 'task', 'intent',
        'company', 'title', 'description', 'duration', 'deliveryTime',
        'channel', 'from', 'to', 'subject', 'body', 'email', 'phone',
        'name', 'firstName', 'lastName', 'organization', 'relationships',
        'city', 'country', 'address', 'capacity', 'amenities',
        'eventType', 'status', 'venue', 'organizer', 'cost',
        'meetingType', 'agenda', 'decisions', 'actionItems', 'recurring',
        'employmentType', 'experienceLevel', 'budgetRate',
        'condition', 'category', 'brand', 'sku', 'stock', 'purchasePrice', 'priceRate',
        'name', 'priority', 'tags', 'assignee', 'dueDate', 'estimatedHours', 'actualHours',
    ]);
    
    // Group terms by category
    const byCategory = new Map<string, ExtractedTerm[]>();
    for (const term of terms) {
        const cat = term.category || 'general';
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat)!.push(term);
    }
    
    let caseId = 1;
    
    // Generate extraction test cases from high-frequency terms that map to valid properties
    for (const [category, catTerms] of byCategory) {
        const topTerms = catTerms.slice(0, 10);
        if (topTerms.length < 2) continue;
        
        // Filter to terms that map to valid property keys
        const validTerms = topTerms.filter(t => validPropertyKeys.has(inferPropertyKey(t.term, category)));
        if (validTerms.length < 2) continue;
        
        // Create a composite input from top terms using natural language
        const inputParts = validTerms.slice(0, 5).map(t => t.term);
        const input = `I need ${inputParts.join(', ')} for my ${category} project`;
        
        const expectedProperties = validTerms.slice(0, 3).map(t => ({
            key: inferPropertyKey(t.term, category),
            operator: 'contains' as const,
            values: [t.term],
        }));
        
        // Only add if all expected properties are valid
        if (expectedProperties.every(p => validPropertyKeys.has(p.key))) {
            testCases.push({
                id: `corpus-extraction-${caseId++}`,
                name: `Corpus extraction: ${category}`,
                input,
                expectedMinProperties: Math.min(3, expectedProperties.length),
                expectedProperties,
            });
        }
    }
    
    // Generate single-term extraction cases for terms that map to valid properties
    for (const term of terms.slice(0, 30)) {
        if (term.frequency < 2) continue;
        const propKey = inferPropertyKey(term.term, term.category);
        if (!validPropertyKeys.has(propKey)) continue;
        
        // Create more natural input
        const input = createNaturalInput(term.term, propKey);
        
        testCases.push({
            id: `corpus-extraction-${caseId++}`,
            name: `Corpus term: ${term.term}`,
            input,
            expectedMinProperties: 1,
            expectedProperties: [
                {
                    key: propKey,
                    operator: 'contains',
                    values: [term.term],
                },
            ],
        });
    }
    
    return testCases.slice(0, 30);
}

function createNaturalInput(term: string, propKey: string): string {
    const templates: Record<string, string[]> = {
        'role': [`Looking for a ${term}`, `Need a ${term}`, `Hiring ${term}`],
        'skills': [`Need ${term} skills`, `Requires ${term} experience`, `Must know ${term}`],
        'experience': [`Need ${term} years experience`, `${term} level required`, `Experience: ${term}`],
        'budget': [`Budget ${term}`, `Up to ${term}`, `Max budget ${term}`],
        'rate': [`Rate ${term}`, `Paying ${term}`, `${term} per hour`],
        'price': [`Price ${term}`, `Cost ${term}`, `${term} total`],
        'location': [`In ${term}`, `Location: ${term}`, `${term} based`],
        'remote': [`${term} work`, `Work ${term}`, `${term} position`],
        'availability': [`Available ${term}`, `Can start ${term}`, `${term} availability`],
        'deadline': [`Deadline ${term}`, `Due by ${term}`, `Need by ${term}`],
        'project': [`Project: ${term}`, `Working on ${term}`, `${term} project`],
        'intent': [`${term} request`, `Want to ${term}`, `Need to ${term}`],
        'company': [`At ${term}`, `Company: ${term}`, `${term} Inc`],
        'title': [`Title: ${term}`, `Position: ${term}`, `Role: ${term}`],
        'description': [`Description: ${term}`, `Details: ${term}`, `About: ${term}`],
        'duration': [`Duration ${term}`, `For ${term}`, `Length: ${term}`],
        'deliveryTime': [`Delivery in ${term}`, `Ships in ${term}`, `${term} turnaround`],
        'channel': [`Via ${term}`, `Channel: ${term}`, `On ${term}`],
        'from': [`From ${term}`, `Sender: ${term}`, `${term} sent`],
        'to': [`To ${term}`, `Send to ${term}`, `Recipient: ${term}`],
        'email': [`Email ${term}`, `Contact: ${term}`, `${term}@example.com`],
        'name': [`Name: ${term}`, `Called ${term}`, `Contact ${term}`],
    };
    
    const templateList = templates[propKey];
    if (templateList && templateList.length > 0) {
        // Use a template that makes sense with the term
        return templateList[0];
    }
    return `Looking for ${term}`;
}

function generateMatchCasesFromCorpus(terms: ExtractedTerm[]): MatchTestCase[] {
    const matchCases: MatchTestCase[] = [];
    
    // Valid ontology property keys for matching
    const validPropertyKeys = new Set([
        'role', 'skills', 'experience', 'budget', 'rate', 'price', 'location',
        'remote', 'availability', 'deadline', 'project', 'task', 'intent',
        'company', 'title', 'description', 'duration', 'deliveryTime',
        'channel', 'from', 'to', 'subject', 'body', 'email', 'phone',
    ]);
    
    // Group by category for related match cases
    const byCategory = new Map<string, ExtractedTerm[]>();
    for (const term of terms) {
        const cat = term.category || 'general';
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat)!.push(term);
    }
    
    let caseId = 1;
    
    for (const [category, catTerms] of byCategory) {
        const topTerms = catTerms.slice(0, 5);
        if (topTerms.length < 2) continue;
        
        // Filter to terms that map to valid property keys
        const validTerms = topTerms.filter(t => validPropertyKeys.has(inferPropertyKey(t.term, category)));
        if (validTerms.length < 2) continue;
        
        // Create request/offer pairs from same category using natural language
        for (let i = 0; i < validTerms.length - 1; i++) {
            for (let j = i + 1; j < validTerms.length; j++) {
                const requestTerm = validTerms[i];
                const offerTerm = validTerms[j];
                
                const requestText = createNaturalInput(requestTerm.term, inferPropertyKey(requestTerm.term, category));
                const offerText = `Offering ${offerTerm.term} for ${category} work`;
                
                matchCases.push({
                    id: `corpus-match-${caseId++}`,
                    name: `Corpus match: ${category} - ${requestTerm.term} vs ${offerTerm.term}`,
                    requestText,
                    offerText,
                    expectedMinScore: 0.2,
                    expectedMaxScore: 0.8,
                });
            }
        }
    }
    
    return matchCases.slice(0, 20);
}

function inferPropertyKey(term: string, category?: string): string {
    const lower = term.toLowerCase();
    
    // Common mappings - use word boundaries for more precise matching
    if (/\b(rate|price|cost|budget)\b/.test(lower)) return 'price';
    if (/\b(skill|tech|stack)\b/.test(lower)) return 'skills';
    if (/\b(role|job|position|title)\b/.test(lower)) return 'role';
    if (/\b(remote|location|city|country)\b/.test(lower)) return 'location';
    if (/\b(experience|senior|junior|year)\b/.test(lower)) return 'experience';
    if (/\b(deadline|due|schedule|time)\b/.test(lower)) return 'deadline';
    if (/\b(avail|free|open)\b/.test(lower)) return 'availability';
    if (/\b(project|task|work)\b/.test(lower)) return 'project';
    if (category && ['role', 'skills', 'experience', 'budget', 'rate', 'price', 'location', 'remote', 'availability', 'deadline', 'project', 'task', 'intent', 'company', 'title', 'description', 'duration', 'deliveryTime', 'channel', 'from', 'to', 'subject', 'body', 'email', 'phone'].includes(category)) return category;
    
    return 'keyword';
}

function identifyTaxonomyGaps(terms: ExtractedTerm[]): string[] {
    const gaps: string[] = [];
    const categories = new Set(terms.map(t => t.category).filter(Boolean) as string[]);
    
    // Check for taxonomy axes coverage
    const taxonomyAxes = {
        socialForm: ['communal', 'authority', 'equality', 'market'],
        topology: ['1:1', '1:N', 'N:M', 'chain', 'coalition', 'hierarchy', 'mesh'],
        exchange: ['goods', 'labour', 'knowledge', 'capital', 'care', 'space', 'access', 'commitment', 'status', 'identity'],
        stakes: ['info', 'social', 'economic', 'legal', 'safety', 'existential'],
        temporality: ['one-shot', 'recurring', 'open-ended', 'deadline', 'ephemeral', 'generational'],
        heterogeneity: ['shared', 'cross-domain', 'multilingual', 'tacit', 'contested'],
    };
    
    // Check if corpus terms suggest missing taxonomy values
    const termText = terms.map(t => t.term).join(' ').toLowerCase();
    
    if (termText.includes('care') || termText.includes('family') || termText.includes('friend')) {
        if (!termText.includes('market')) {
            gaps.push('Care/kinship scenarios missing - taxonomy currently only covers market exchange');
        }
    }
    
    if (termText.includes('mentor') || termText.includes('apprentice') || termText.includes('learn')) {
        gaps.push('Mentorship/apprenticeship scenarios suggest authority-ranking or communal sharing axes');
    }
    
    if (termText.includes('open source') || termText.includes('community') || termText.includes('volunteer')) {
        gaps.push('Open source/community scenarios suggest communal sharing or generalized exchange');
    }
    
    if (termText.includes('legal') || termText.includes('contract') || termText.includes('compliance')) {
        gaps.push('Legal/contract scenarios suggest legal stakes and codified formality');
    }
    
    if (termText.includes('crisis') || termText.includes('emergency') || termText.includes('urgent')) {
        gaps.push('Crisis/emergency scenarios suggest safety stakes and ephemeral temporality');
    }
    
    if (termText.includes('long-term') || termText.includes('career') || termText.includes('lifetime')) {
        gaps.push('Long-term scenarios suggest generational temporality and existential stakes');
    }
    
    return gaps;
}

async function writeOutputFiles(outputDir: string, analysis: CorpusAnalysis): Promise<void> {
    await mkdir(outputDir, { recursive: true });
    
    // Write full analysis
    await writeFile(join(outputDir, 'analysis.json'), JSON.stringify(analysis, null, 2));
    
    // Write vocabulary
    await writeFile(join(outputDir, 'vocabulary.txt'), analysis.vocabulary.join('\n'));
    
    // Write terms with metadata
    await writeFile(join(outputDir, 'terms.json'), JSON.stringify(analysis.terms, null, 2));
    
    // Write test cases for fast evaluator
    if (analysis.generatedTestCases.length > 0) {
        await writeFile(
            join(outputDir, 'extraction-test-cases.json'),
            JSON.stringify(analysis.generatedTestCases, null, 2)
        );
    }
    
    if (analysis.generatedMatchCases.length > 0) {
        await writeFile(
            join(outputDir, 'match-test-cases.json'),
            JSON.stringify(analysis.generatedMatchCases, null, 2)
        );
    }
    
    // Write taxonomy gaps report
    await writeFile(join(outputDir, 'taxonomy-gaps.json'), JSON.stringify(analysis.taxonomyGaps, null, 2));
    
    console.log(`\n✅ Corpus analysis written to ${outputDir}/`);
    console.log(`   - analysis.json (full)`);
    console.log(`   - vocabulary.txt (terms list)`);
    console.log(`   - terms.json (with frequency, contexts, categories)`);
    console.log(`   - extraction-test-cases.json (${analysis.generatedTestCases.length} cases)`);
    console.log(`   - match-test-cases.json (${analysis.generatedMatchCases.length} cases)`);
    console.log(`   - taxonomy-gaps.json (${analysis.taxonomyGaps.length} gaps)`);
}

export async function loadCorpusTestCases(outputDir: string): Promise<{
    extraction: TestCase[];
    match: MatchTestCase[];
}> {
    const extractionPath = join(outputDir, 'extraction-test-cases.json');
    const matchPath = join(outputDir, 'match-test-cases.json');
    
    let extraction: TestCase[] = [];
    let match: MatchTestCase[] = [];
    
    try {
        const extContent = await readFile(extractionPath, 'utf-8');
        extraction = JSON.parse(extContent);
    } catch {
        // File might not exist
    }
    
    try {
        const matchContent = await readFile(matchPath, 'utf-8');
        match = JSON.parse(matchContent);
    } catch {
        // File might not exist
    }
    
    return { extraction, match };
}