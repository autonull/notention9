/**
 * Natural language input generation from terms
 */

/**
 * Create more natural input text for a term based on its property key
 */
export function createNaturalInput(term: string, propKey: string): string {
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