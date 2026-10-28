export const expect = {
    any: (type: any) => ({ __expectAny: true, type }),
    arrayContaining: (arr: any[]) => ({ __expectArrayContaining: true, array: arr }),
    objectContaining: (obj: any) => ({ __expectObjectContaining: true, object: obj }),
};