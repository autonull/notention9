export function log(context: string, message: string, data?: any) {
    if (data) {
        console.log(`[${context}] ${message}`, data);
    } else {
        console.log(`[${context}] ${message}`);
    }
}

export function error(context: string, message: string, err?: any) {
    console.error(`[${context}] ERROR: ${message}`, err);
}
