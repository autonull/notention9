import type { OntologyNode } from './types';

export const DEFAULT_ONTOLOGY: OntologyNode[] = [
  {
    id: 'entity',
    label: 'Entity',
    description: 'The base for all things that can be identified.',
    children: [
      {
        id: 'person',
        label: 'Person',
        description: 'An individual human being.',
        requiredAttributes: ['name'],
        attributes: {
          name: {
            type: 'string',
            description: 'Full name.',
            icon: 'user',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
          email: {
            type: 'string',
            description: 'Email address',
            icon: 'send',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          phone: {
            type: 'string',
            description: 'Phone number',
            icon: 'chat',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
        },
      },
      {
        id: 'organization',
        label: 'Organization',
        description: 'A group of people with a particular purpose.',
        attributes: {
          website: {
            type: 'string',
            description: 'Official website URL',
            icon: 'world',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
        },
      },
      {
        id: 'place',
        label: 'Place',
        description: 'A specific point on Earth or in space.',
        attributes: {
          address: {
            type: 'string',
            description: 'Physical street address',
            icon: 'map',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          location: {
            type: 'geo',
            description: 'Geographic coordinates',
            icon: 'map-pin',
            operators: { real: ['is'], imaginary: ['is near'] },
          },
        },
      },
    ],
  },
  {
    id: 'concept',
    label: 'Concept',
    description: 'An abstract idea or a general notion.',
    children: [
      {
        id: 'technology',
        label: 'Technology',
        children: [
          { id: 'ai', label: 'AI', aliases: ['artificial intelligence', 'ml', 'machine learning'] },
          { id: 'blockchain', label: 'Blockchain', aliases: ['crypto', 'web3'] },
          { id: 'webdev', label: 'Web Development', aliases: ['web dev', 'frontend', 'backend', 'fullstack'] },
          {
            id: 'programming-languages',
            label: 'Programming Language',
            children: [
              { id: 'javascript', label: 'JavaScript', aliases: ['js', 'es6', 'node', 'nodejs'] },
              { id: 'typescript', label: 'TypeScript', aliases: ['ts'] },
              { id: 'python', label: 'Python', aliases: ['py'] },
              { id: 'react', label: 'React', aliases: ['reactjs', 'react.js'] }
            ]
          }
        ],
      },
      { id: 'science', label: 'Science' },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    description: 'Messages and conversations across channels.',
    children: [
      {
        id: 'message',
        label: 'Message',
        description: 'A communication sent through a channel.',
        attributes: {
          conversationId: {
            type: 'string',
            description: 'Thread or conversation identifier',
            icon: 'chat-bubble',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
          channel: {
            type: 'enum',
            options: ['whatsapp', 'telegram', 'discord', 'sms', 'email'],
            description: 'Communication channel',
            icon: 'share',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
          from: {
            type: 'string',
            description: 'Sender identifier (phone, email, username)',
            icon: 'arrow-left',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          to: {
            type: 'string',
            description: 'Recipient identifier',
            icon: 'arrow-right',
            operators: { real: ['is'], imaginary: ['send to'] },
          },
          messageType: {
            type: 'enum',
            options: ['text', 'image', 'voice', 'video', 'file'],
            description: 'Type of message content',
            icon: 'document',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
        },
      },
    ],
  },
  {
    id: 'event',
    label: 'Event',
    description: 'Something that happens, especially something of importance.',
    attributes: {
      startDateTime: {
        type: 'datetime',
        description: 'The start date and time',
        icon: 'clock',
        operators: { real: ['is'], imaginary: ['is after', 'is before'] },
      },
      endDateTime: {
        type: 'datetime',
        description: 'The end date and time',
        icon: 'clock',
        operators: { real: ['is'], imaginary: ['is after', 'is before'] },
      },
      venue: {
        type: 'string',
        description: 'The name of the place where the event takes place',
        icon: 'map-pin',
        operators: { real: ['is'], imaginary: ['is not'] },
      },
    },
    children: [
      { id: 'meeting', label: 'Meeting' },
      { id: 'conference', label: 'Conference' },
    ],
  },
  {
    id: 'work',
    label: 'Work',
    description: 'Activity involving mental or physical effort.',
    children: [
      {
        id: 'job-request',
        label: 'Job Request',
        description: 'A request for work or hiring.',
        actionLabel: 'Post Job',
        extends: ['job', 'request'],
        requiredAttributes: ['role'],
        attributes: {
          role: {
            type: 'string',
            description: 'The job title or role.',
            // Using unitType here slightly metaphorically or we'd need 'enum' for validation against ontology nodes?
            // Actually, matching logic handles string vs ontology node canonicalization.
            operators: { real: ['is'], imaginary: ['is not'] },
          },
          budget: {
            type: 'number',
            description: 'Budget or salary.',
            operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
          }
        }
      },
      {
        id: 'freelance-offer',
        label: 'Freelance Offer',
        description: 'Offering services as a freelancer.',
        actionLabel: 'Post Offer',
        extends: ['freelance', 'offer'],
        requiredAttributes: ['role', 'rate'],
        attributes: {
          role: {
            type: 'string',
            description: 'The role offered.',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
          rate: {
            type: 'number',
            description: 'Hourly rate.',
            operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
          }
        }
      },
      {
        id: 'project',
        label: 'Project',
        description: 'A planned piece of work.',
        requiredAttributes: ['deadline'],
        attributes: {
          status: {
            type: 'enum',
            options: ['Planning', 'Active', 'On Hold', 'Completed', 'Archived'],
            description: 'Current status of the project.',
            icon: 'information-circle',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
          deadline: {
            type: 'date',
            description: 'The date the project is due.',
            icon: 'clock',
            operators: { real: ['is'], imaginary: ['is after', 'is before'] },
          },
        },
      },
      {
        id: 'task',
        label: 'Task',
        description: 'A piece of work to be done.',
        attributes: {
          priority: {
            type: 'enum',
            options: ['Low', 'Medium', 'High', 'Urgent'],
            description: 'The priority of the task.',
            icon: 'exclamation-triangle',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
          dueDate: {
            type: 'date',
            description: 'The date the task should be completed by.',
            icon: 'clock',
            operators: { real: ['is'], imaginary: ['is after', 'is before'] },
          },
          completed: {
            type: 'enum',
            options: ['true', 'false'],
            description: 'Whether the task is completed.',
            icon: 'check-circle',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
        },
      },
    ],
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    children: [
      {
        id: 'product',
        label: 'Product',
        description: 'A physical or digital item for sale.',
        actionLabel: 'Sell Product',
        requiredAttributes: ['name', 'price'],
        attributes: {
          name: {
            type: 'string',
            description: 'Name of the product',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] }
          },
          price: {
            type: 'number',
            description: 'Price of the product',
            operators: { real: ['is'], imaginary: ['less than', 'greater than'] }
          },
          condition: {
            type: 'enum',
            options: ['New', 'Used - Like New', 'Used - Good', 'Used - Fair'],
            description: 'Condition of the item',
            operators: { real: ['is'], imaginary: ['is not'] }
          },
          category: {
            type: 'string',
            description: 'Product category',
            operators: { real: ['is'], imaginary: ['contains'] }
          }
        }
      },
      {
        id: 'service',
        label: 'Service',
        description: 'A service offered for a fee.',
        actionLabel: 'Offer Service',
        requiredAttributes: ['serviceType', 'rate'],
        attributes: {
          serviceType: {
            type: 'string',
            description: 'Type of service (e.g. Plumbing, Design)',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] }
          },
          rate: {
            type: 'number',
            description: 'Cost per unit (e.g. hour, project)',
            operators: { real: ['is'], imaginary: ['less than', 'greater than'] }
          },
          availability: {
            type: 'string',
            description: 'When the service is available',
            operators: { real: ['is'], imaginary: ['contains'] }
          }
        }
      }
    ]
  },
  {
    id: 'templates',
    label: 'Templates',
    description: 'Pre-defined structures for your notes.',
    children: [
      {
        id: 'template-meeting',
        label: 'Meeting Note',
        description: 'For capturing meeting details.',
        attributes: {
          startDateTime: {
            type: 'datetime',
            operators: { real: ['is'], imaginary: ['is after', 'is before'] },
          },
          attendees: {
            type: 'string',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          venue: {
            type: 'string',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
          location: {
            type: 'geo',
            operators: { real: ['is'], imaginary: ['is near'] },
          },
        },
      },
      {
        id: 'template-person',
        label: 'Person Profile',
        description: 'To keep track of a contact.',
        attributes: {
          name: {
            type: 'string',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
          email: {
            type: 'string',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          phone: {
            type: 'string',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
          organization: {
            type: 'string',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
        },
      },
      {
        id: 'template-project',
        label: 'Project Plan',
        description: 'To outline a new project.',
        attributes: {
          status: {
            type: 'enum',
            options: ['Planning', 'Active', 'On Hold', 'Completed', 'Archived'],
            operators: { real: ['is'], imaginary: ['is not'] },
          },
          deadline: {
            type: 'date',
            operators: { real: ['is'], imaginary: ['is after', 'is before'] },
          },
          budget: {
            type: 'number',
            operators: {
              real: ['is'],
              imaginary: ['less than', 'greater than', 'between'],
            },
          },
          stakeholders: {
            type: 'string',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
        },
      },
    ],
  },
];
