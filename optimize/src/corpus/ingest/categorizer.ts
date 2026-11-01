/**
 * Term categorization utilities
 */

export function categorizeTerm(term: string): string | undefined {
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