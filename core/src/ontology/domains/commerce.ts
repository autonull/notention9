import type { OntologyNode } from '../../types/index.js';

/**
 * Commerce domain ontology - Products, Services, and Transactions
 */
export const commerceDomain: OntologyNode[] = [
    {
        id: 'commerce',
        label: 'Commerce',
        description: 'Buying and selling of goods and services.',
        children: [
            {
                id: 'product',
                label: 'Product',
                description: 'An article or substance that is manufactured or refined for sale.',
                attributes: {
                    name: {
                        type: 'string',
                        description: 'Product name',
                        icon: 'package',
                        operators: { real: ['is'], imaginary: ['is not', 'contains'] },
                    },
                    price: {
                        type: 'number',
                        description: 'Sale price',
                        icon: 'cash',
                        operators: { real: ['is'], imaginary: ['less than', 'greater than', 'between'] },
                    },
                    condition: {
                        type: 'enum',
                        options: ['new', 'like-new', 'used', 'refurbished'],
                        description: 'Product condition',
                        icon: 'star',
                        operators: { real: ['is'], imaginary: ['is not'] },
                    },
                    category: {
                        type: 'string',
                        description: 'Product category',
                        icon: 'tag',
                        operators: { real: ['is'], imaginary: ['contains'] },
                    },
                    brand: {
                        type: 'string',
                        description: 'Product brand',
                        icon: 'copyright',
                        operators: { real: ['is'], imaginary: ['is not', 'contains'] },
                    },
                    sku: {
                        type: 'string',
                        description: 'Stock Keeping Unit',
                        icon: 'barcode',
                        operators: { real: ['is'], imaginary: ['is not'] },
                    },
                    stock: {
                        type: 'number',
                        description: 'Items in stock',
                        icon: 'inventory',
                        operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
                    },
                    purchasePrice: {
                        type: 'number',
                        description: 'Purchase price',
                        icon: 'cash',
                        operators: { real: ['is'], imaginary: ['less than', 'greater than'] },
                    },
                    priceRate: {
                        type: 'number',
                        description: 'Price rate',
                        icon: 'cash-clock',
                        operators: { real: ['is'], imaginary: ['less than', 'greater than'] },
                    }
                }
            }
        ]
    }
];
