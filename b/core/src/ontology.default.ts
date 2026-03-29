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
          firstName: {
            type: 'string',
            description: 'First/given name.',
            icon: 'user',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          lastName: {
            type: 'string',
            description: 'Last/family name.',
            icon: 'user',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
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
          role: {
            type: 'string',
            description: 'Professional role or position',
            icon: 'briefcase',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          organization: {
            type: 'string',
            description: 'Associated organization',
            icon: 'building',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          relationships: {
            type: 'relationship',
            description: 'Relationships to other entities',
            icon: 'link',
            operators: { real: ['has'], imaginary: ['not has'] },
            referenceType: 'entity'
          },
          intent: {
            type: 'enum',
            options: ['reminder', 'schedule', 'task', 'shopping', 'health', 'communication', 'monitor', 'automation'],
            description: 'The inferred intent of the note',
            icon: 'brain',
            operators: { real: ['is'], imaginary: ['is not'] }
          }
        },
      },
      {
        id: 'organization',
        label: 'Organization',
        description: 'A group of people with a particular purpose.',
        attributes: {
          name: {
            type: 'string',
            description: 'Organization name',
            icon: 'building',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          website: {
            type: 'string',
            description: 'Official website URL',
            icon: 'world',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          industry: {
            type: 'string',
            description: 'Industry or sector',
            icon: 'industry',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          employees: {
            type: 'number',
            description: 'Number of employees',
            icon: 'users',
            operators: { real: ['is'], imaginary: ['less than', 'greater than'] },
          },
          founded: {
            type: 'date',
            description: 'Founded date',
            icon: 'calendar',
            operators: { real: ['is'], imaginary: ['is after', 'is before'] },
          },
          relationships: {
            type: 'relationship',
            description: 'Relationships to other entities',
            icon: 'link',
            operators: { real: ['has'], imaginary: ['not has'] },
            referenceType: 'entity'
          }
        },
      },
      {
        id: 'place',
        label: 'Place',
        description: 'A specific point on Earth or in space.',
        attributes: {
          name: {
            type: 'string',
            description: 'Place name or title',
            icon: 'location',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
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
          type: {
            type: 'enum',
            options: ['residential', 'commercial', 'industrial', 'educational', 'medical', 'government', 'recreational', 'transportation', 'other'],
            description: 'Type of place',
            icon: 'map',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
          capacity: {
            type: 'number',
            description: 'Maximum capacity',
            icon: 'people',
            operators: { real: ['is'], imaginary: ['less than', 'greater than'] },
          },
          accessibility: {
            type: 'enum',
            options: ['fully accessible', 'partially accessible', 'not accessible'],
            description: 'Accessibility level',
            icon: 'wheelchair',
            operators: { real: ['is'], imaginary: ['is not'] },
          }
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
          { id: 'ai', label: 'AI' },
          { id: 'blockchain', label: 'Blockchain' },
          { id: 'webdev', label: 'Web Development' },
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
          subject: {
            type: 'string',
            description: 'Subject or title of the message',
            icon: 'subject',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          body: {
            type: 'string',
            description: 'Content of the message',
            icon: 'text',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          conversationId: {
            type: 'string',
            description: 'Thread or conversation identifier',
            icon: 'chat-bubble',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
          channel: {
            type: 'enum',
            options: ['whatsapp', 'telegram', 'discord', 'sms', 'email', 'slack', 'teams', 'signal', 'call'],
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
          cc: {
            type: 'string',
            description: 'Carbon copy recipients',
            icon: 'copy',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          bcc: {
            type: 'string',
            description: 'Blind carbon copy recipients',
            icon: 'eye-off',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          messageType: {
            type: 'enum',
            options: ['text', 'image', 'voice', 'video', 'file', 'link', 'reaction', 'status'],
            description: 'Type of message content',
            icon: 'document',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
          priority: {
            type: 'enum',
            options: ['low', 'normal', 'high', 'urgent'],
            description: 'Priority level of the message',
            icon: 'priority',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
          status: {
            type: 'enum',
            options: ['sent', 'delivered', 'read', 'failed'],
            description: 'Delivery status of the message',
            icon: 'status',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
          attachments: {
            type: 'number',
            description: 'Number of attachments',
            icon: 'attachment',
            operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
          },
          sentiment: {
            type: 'enum',
            options: ['positive', 'neutral', 'negative', 'mixed'],
            description: 'Sentiment of the message',
            icon: 'sentiment',
            operators: { real: ['is'], imaginary: ['is not'] },
          }
        },
      },
    ],
  },
  {
    id: 'event',
    label: 'Event',
    description: 'Something that happens, especially something of importance.',
    attributes: {
      title: {
        type: 'string',
        description: 'Title or name of the event',
        icon: 'title',
        operators: { real: ['is'], imaginary: ['is not', 'contains'] },
      },
      description: {
        type: 'string',
        description: 'Detailed description of the event',
        icon: 'info',
        operators: { real: ['is'], imaginary: ['contains'] },
      },
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
      duration: {
        type: 'number',
        description: 'Duration in minutes',
        icon: 'timer',
        operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
      },
      venue: {
        type: 'string',
        description: 'The name of the place where the event takes place',
        icon: 'map-pin',
        operators: { real: ['is'], imaginary: ['is not'] },
      },
      location: {
        type: 'geo',
        description: 'Geographic coordinates of the venue',
        icon: 'map',
        operators: { real: ['is'], imaginary: ['is near'] },
      },
      eventType: {
        type: 'enum',
        options: ['meeting', 'conference', 'workshop', 'seminar', 'training', 'social', 'celebration', 'performance', 'sports', 'other'],
        description: 'Type of event',
        icon: 'calendar',
        operators: { real: ['is'], imaginary: ['is not'] },
      },
      status: {
        type: 'enum',
        options: ['planned', 'confirmed', 'in-progress', 'completed', 'cancelled', 'postponed'],
        description: 'Current status of the event',
        icon: 'status',
        operators: { real: ['is'], imaginary: ['is not'] },
      },
      capacity: {
        type: 'number',
        description: 'Maximum number of attendees',
        icon: 'people',
        operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
      },
      attendees: {
        type: 'number',
        description: 'Number of registered attendees',
        icon: 'users',
        operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
      },
      organizer: {
        type: 'string',
        description: 'Organizer of the event',
        icon: 'organizer',
        operators: { real: ['is'], imaginary: ['is not', 'contains'] },
      },
      cost: {
        type: 'number',
        description: 'Cost of attending the event',
        icon: 'cash',
        operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
      },
      virtual: {
        type: 'enum',
        options: ['true', 'false'],
        description: 'Whether the event is virtual',
        icon: 'video',
        operators: { real: ['is'], imaginary: ['is not'] },
      },
      recurring: {
        type: 'enum',
        options: ['none', 'daily', 'weekly', 'monthly', 'yearly'],
        description: 'Recurring pattern of the event',
        icon: 'repeat',
        operators: { real: ['is'], imaginary: ['is not'] },
      }
    },
    children: [
      {
        id: 'meeting',
        label: 'Meeting',
        description: 'A formal or informal gathering for discussion',
        attributes: {
          meetingType: {
            type: 'enum',
            options: ['one-on-one', 'team', 'department', 'company', 'client', 'board'],
            description: 'Type of meeting',
            icon: 'meeting',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
          agenda: {
            type: 'string',
            description: 'Meeting agenda',
            icon: 'list',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          minutes: {
            type: 'string',
            description: 'Meeting minutes or notes',
            icon: 'notes',
            operators: { real: ['is'], imaginary: ['contains'] },
          }
        }
      },
      {
        id: 'conference',
        label: 'Conference',
        description: 'A formal meeting for discussion of specific topics',
        attributes: {
          topic: {
            type: 'string',
            description: 'Main topic or theme of the conference',
            icon: 'topic',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          speakers: {
            type: 'number',
            description: 'Number of speakers',
            icon: 'speaker',
            operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
          }
        }
      },
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
          title: {
            type: 'string',
            description: 'Job title',
            icon: 'title',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          role: {
            type: 'string',
            description: 'The job title or role.',
            icon: 'briefcase',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          description: {
            type: 'string',
            description: 'Detailed job description',
            icon: 'info',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          company: {
            type: 'string',
            description: 'Company offering the job',
            icon: 'building',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          location: {
            type: 'string',
            description: 'Job location',
            icon: 'location',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          employmentType: {
            type: 'enum',
            options: ['full-time', 'part-time', 'contract', 'temporary', 'internship', 'volunteer'],
            description: 'Type of employment',
            icon: 'employment',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
          experienceLevel: {
            type: 'enum',
            options: ['entry', 'mid', 'senior', 'executive'],
            description: 'Required experience level',
            icon: 'experience',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
          skills: {
            type: 'string',
            description: 'Required skills',
            icon: 'skills',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          responsibilities: {
            type: 'string',
            description: 'Job responsibilities',
            icon: 'responsibilities',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          requirements: {
            type: 'string',
            description: 'Job requirements',
            icon: 'requirements',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          benefits: {
            type: 'string',
            description: 'Job benefits',
            icon: 'benefits',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          budget: {
            type: 'number',
            description: 'Total budget amount.',
            icon: 'cash',
            operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
          },
          budgetRate: {
            type: 'number',
            description: 'Budget rate (e.g., per hour, per day).',
            icon: 'cash-clock',
            operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
          },
          startDate: {
            type: 'date',
            description: 'Start date for the position',
            icon: 'calendar',
            operators: { real: ['is'], imaginary: ['is after', 'is before'] },
          },
          endDate: {
            type: 'date',
            description: 'End date for the position (if temporary)',
            icon: 'calendar',
            operators: { real: ['is'], imaginary: ['is after', 'is before'] },
          },
          remote: {
            type: 'enum',
            options: ['true', 'false', 'hybrid'],
            description: 'Whether the job is remote',
            icon: 'remote',
            operators: { real: ['is'], imaginary: ['is not'] },
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
          title: {
            type: 'string',
            description: 'Service title',
            icon: 'title',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          role: {
            type: 'string',
            description: 'The role offered.',
            icon: 'briefcase',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          description: {
            type: 'string',
            description: 'Detailed service description',
            icon: 'info',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          serviceType: {
            type: 'string',
            description: 'Type of service (e.g. Plumbing, Design)',
            icon: 'service',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          skills: {
            type: 'string',
            description: 'Skills offered',
            icon: 'skills',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          portfolio: {
            type: 'string',
            description: 'Portfolio or examples of work',
            icon: 'portfolio',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          rate: {
            type: 'number',
            description: 'Service rate (e.g., per hour, per day, per project).',
            icon: 'cash-clock',
            operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
          },
          availability: {
            type: 'string',
            description: 'When the service is available',
            icon: 'calendar',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          deliveryTime: {
            type: 'number',
            description: 'Expected delivery time in days',
            icon: 'timer',
            operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
          },
          clientType: {
            type: 'enum',
            options: ['individual', 'startup', 'small business', 'enterprise', 'non-profit'],
            description: 'Preferred client type',
            icon: 'client',
            operators: { real: ['is'], imaginary: ['is not'] },
          }
        }
      },
      {
        id: 'project',
        label: 'Project',
        description: 'A planned piece of work.',
        requiredAttributes: ['deadline'],
        attributes: {
          title: {
            type: 'string',
            description: 'Project title',
            icon: 'title',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          description: {
            type: 'string',
            description: 'Project description',
            icon: 'info',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          status: {
            type: 'enum',
            options: ['Planning', 'Active', 'On Hold', 'Completed', 'Archived', 'Cancelled'],
            description: 'Current status of the project.',
            icon: 'status',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
          deadline: {
            type: 'date',
            description: 'The date the project is due.',
            icon: 'clock',
            operators: { real: ['is'], imaginary: ['is after', 'is before'] },
          },
          startDate: {
            type: 'date',
            description: 'The date the project started.',
            icon: 'clock',
            operators: { real: ['is'], imaginary: ['is after', 'is before'] },
          },
          budget: {
            type: 'number',
            description: 'Project budget',
            icon: 'cash',
            operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
          },
          spent: {
            type: 'number',
            description: 'Amount spent so far',
            icon: 'cash-spent',
            operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
          },
          teamSize: {
            type: 'number',
            description: 'Number of team members',
            icon: 'team',
            operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
          },
          priority: {
            type: 'enum',
            options: ['Low', 'Medium', 'High', 'Urgent'],
            description: 'Project priority',
            icon: 'priority',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
          category: {
            type: 'string',
            description: 'Project category',
            icon: 'category',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          stakeholders: {
            type: 'string',
            description: 'Project stakeholders',
            icon: 'stakeholders',
            operators: { real: ['is'], imaginary: ['contains'] },
          }
        },
      },
      {
        id: 'task',
        label: 'Task',
        description: 'A piece of work to be done.',
        attributes: {
          title: {
            type: 'string',
            description: 'Task title',
            icon: 'title',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          description: {
            type: 'string',
            description: 'Task description',
            icon: 'info',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          priority: {
            type: 'enum',
            options: ['Low', 'Medium', 'High', 'Urgent'],
            description: 'The priority of the task.',
            icon: 'priority',
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
            icon: 'check',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
          assignee: {
            type: 'string',
            description: 'Person assigned to the task',
            icon: 'assignee',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          estimatedTime: {
            type: 'number',
            description: 'Estimated time to complete in hours',
            icon: 'timer',
            operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
          },
          actualTime: {
            type: 'number',
            description: 'Actual time taken in hours',
            icon: 'actual-time',
            operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
          },
          category: {
            type: 'string',
            description: 'Task category',
            icon: 'category',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          dependencies: {
            type: 'string',
            description: 'Other tasks this task depends on',
            icon: 'dependencies',
            operators: { real: ['is'], imaginary: ['contains'] },
          }
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
            icon: 'label',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] }
          },
          title: {
            type: 'string',
            description: 'Product title',
            icon: 'title',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] }
          },
          description: {
            type: 'string',
            description: 'Detailed product description',
            icon: 'info',
            operators: { real: ['is'], imaginary: ['contains'] }
          },
          price: {
            type: 'number',
            description: 'Total price of the product',
            icon: 'cash',
            operators: { real: ['is'], imaginary: ['less than', 'greater than'] }
          },
          priceRate: {
            type: 'number',
            description: 'Price rate (e.g., per unit, per kg, per hour)',
            icon: 'cash-clock',
            operators: { real: ['is'], imaginary: ['less than', 'greater than'] }
          },
          currency: {
            type: 'enum',
            options: ['USD', 'EUR', 'GBP', 'JPY', 'INR', 'CHF', 'CAD', 'AUD', 'CNY', 'KRW', 'RUB', 'BTC', 'ETH'],
            description: 'Currency type for monetary values',
            icon: 'cash',
            operators: { real: ['is'], imaginary: ['is not'] }
          },
          condition: {
            type: 'enum',
            options: ['New', 'Like New', 'Very Good', 'Good', 'Fair', 'Poor'],
            description: 'Condition of the item',
            icon: 'condition',
            operators: { real: ['is'], imaginary: ['is not'] }
          },
          category: {
            type: 'string',
            description: 'Product category',
            icon: 'category',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] }
          },
          brand: {
            type: 'string',
            description: 'Brand of the product',
            icon: 'brand',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] }
          },
          model: {
            type: 'string',
            description: 'Model of the product',
            icon: 'model',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] }
          },
          sku: {
            type: 'string',
            description: 'Stock Keeping Unit identifier',
            icon: 'sku',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] }
          },
          upc: {
            type: 'string',
            description: 'Universal Product Code',
            icon: 'upc',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] }
          },
          quantity: {
            type: 'number',
            description: 'Available quantity',
            icon: 'quantity',
            operators: { real: ['is'], imaginary: ['greater than', 'less than'] }
          },
          weight: {
            type: 'number',
            description: 'Weight of the product',
            icon: 'weight',
            operators: { real: ['is'], imaginary: ['greater than', 'less than'] }
          },
          dimensions: {
            type: 'string',
            description: 'Dimensions (L x W x H)',
            icon: 'dimensions',
            operators: { real: ['is'], imaginary: ['contains'] }
          },
          color: {
            type: 'string',
            description: 'Color of the product',
            icon: 'color',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] }
          },
          material: {
            type: 'string',
            description: 'Material of the product',
            icon: 'material',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] }
          },
          manufacturer: {
            type: 'string',
            description: 'Manufacturer of the product',
            icon: 'manufacturer',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] }
          },
          warranty: {
            type: 'string',
            description: 'Warranty information',
            icon: 'warranty',
            operators: { real: ['is'], imaginary: ['contains'] }
          },
          ageRestriction: {
            type: 'number',
            description: 'Minimum age restriction (if any)',
            icon: 'age',
            operators: { real: ['is'], imaginary: ['greater than', 'less than'] }
          },
          shipping: {
            type: 'enum',
            options: ['free', 'paid', 'local pickup only'],
            description: 'Shipping options',
            icon: 'shipping',
            operators: { real: ['is'], imaginary: ['is not'] }
          },
          returnPolicy: {
            type: 'string',
            description: 'Return policy information',
            icon: 'return',
            operators: { real: ['is'], imaginary: ['contains'] }
          },
          seller: {
            type: 'string',
            description: 'Seller information',
            icon: 'seller',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] }
          },
          rating: {
            type: 'number',
            description: 'Average customer rating (1-5)',
            icon: 'rating',
            operators: { real: ['is'], imaginary: ['greater than', 'less than'] }
          },
          reviews: {
            type: 'number',
            description: 'Number of customer reviews',
            icon: 'reviews',
            operators: { real: ['is'], imaginary: ['greater than', 'less than'] }
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
          title: {
            type: 'string',
            description: 'Service title',
            icon: 'title',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] }
          },
          description: {
            type: 'string',
            description: 'Detailed service description',
            icon: 'info',
            operators: { real: ['is'], imaginary: ['contains'] }
          },
          serviceType: {
            type: 'string',
            description: 'Type of service (e.g. Plumbing, Design)',
            icon: 'service',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] }
          },
          category: {
            type: 'string',
            description: 'Service category',
            icon: 'category',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] }
          },
          rate: {
            type: 'number',
            description: 'Service rate (e.g. per hour, per day, per project)',
            icon: 'cash-clock',
            operators: { real: ['is'], imaginary: ['less than', 'greater than'] }
          },
          pricingModel: {
            type: 'enum',
            options: ['hourly', 'fixed', 'per project', 'per item', 'subscription', 'negotiable'],
            description: 'Pricing model',
            icon: 'pricing',
            operators: { real: ['is'], imaginary: ['is not'] }
          },
          availability: {
            type: 'string',
            description: 'When the service is available',
            icon: 'calendar',
            operators: { real: ['is'], imaginary: ['contains'] }
          },
          duration: {
            type: 'number',
            description: 'Typical service duration in hours',
            icon: 'timer',
            operators: { real: ['is'], imaginary: ['greater than', 'less than'] }
          },
          location: {
            type: 'string',
            description: 'Service location or coverage area',
            icon: 'location',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] }
          },
          remote: {
            type: 'enum',
            options: ['available', 'not available', 'hybrid'],
            description: 'Whether service is available remotely',
            icon: 'remote',
            operators: { real: ['is'], imaginary: ['is not'] }
          },
          qualifications: {
            type: 'string',
            description: 'Service provider qualifications',
            icon: 'qualifications',
            operators: { real: ['is'], imaginary: ['contains'] }
          },
          certifications: {
            type: 'string',
            description: 'Service provider certifications',
            icon: 'certifications',
            operators: { real: ['is'], imaginary: ['contains'] }
          },
          experience: {
            type: 'number',
            description: 'Years of experience',
            icon: 'experience',
            operators: { real: ['is'], imaginary: ['greater than', 'less than'] }
          },
          portfolio: {
            type: 'string',
            description: 'Portfolio or examples of work',
            icon: 'portfolio',
            operators: { real: ['is'], imaginary: ['contains'] }
          },
          maxProjects: {
            type: 'number',
            description: 'Maximum concurrent projects',
            icon: 'projects',
            operators: { real: ['is'], imaginary: ['greater than', 'less than'] }
          },
          responseTime: {
            type: 'number',
            description: 'Average response time in hours',
            icon: 'response',
            operators: { real: ['is'], imaginary: ['greater than', 'less than'] }
          },
          satisfaction: {
            type: 'number',
            description: 'Customer satisfaction rating (1-100%)',
            icon: 'satisfaction',
            operators: { real: ['is'], imaginary: ['greater than', 'less than'] }
          }
        }
      }
    ]
  },
  {
    id: 'measurements',
    label: 'Measurements',
    description: 'Physical and quantitative measurements.',
    attributes: {
      distance: {
        type: 'number',
        description: 'Linear distance measurement',
        icon: 'ruler',
        operators: { real: ['is'], imaginary: ['less than', 'greater than'] }
      },
      distanceUnit: {
        type: 'enum',
        options: ['m', 'km', 'cm', 'mm', 'μm', 'nm', 'in', 'ft', 'yd', 'mi', 'nmi', 'au', 'ly', 'pc'],
        description: 'Unit for distance measurement',
        icon: 'ruler',
        operators: { real: ['is'], imaginary: ['is not'] }
      },
      weight: {
        type: 'number',
        description: 'Weight or mass measurement',
        icon: 'scale',
        operators: { real: ['is'], imaginary: ['less than', 'greater than'] }
      },
      weightUnit: {
        type: 'enum',
        options: ['kg', 'g', 'mg', 'μg', 'lb', 'oz', 'ton', 'stone'],
        description: 'Unit for weight measurement',
        icon: 'scale',
        operators: { real: ['is'], imaginary: ['is not'] }
      },
      volume: {
        type: 'number',
        description: 'Volume measurement',
        icon: 'water',
        operators: { real: ['is'], imaginary: ['less than', 'greater than'] }
      },
      volumeUnit: {
        type: 'enum',
        options: ['l', 'ml', 'cl', 'hl', 'tsp', 'tbsp', 'floz', 'cup', 'pt', 'qt', 'gal'],
        description: 'Unit for volume measurement',
        icon: 'water',
        operators: { real: ['is'], imaginary: ['is not'] }
      },
      temperature: {
        type: 'number',
        description: 'Temperature measurement',
        icon: 'thermometer',
        operators: { real: ['is'], imaginary: ['less than', 'greater than'] }
      },
      temperatureUnit: {
        type: 'enum',
        options: ['°C', '°F', 'K'],
        description: 'Unit for temperature measurement',
        icon: 'thermometer',
        operators: { real: ['is'], imaginary: ['is not'] }
      },
      area: {
        type: 'number',
        description: 'Area measurement',
        icon: 'square',
        operators: { real: ['is'], imaginary: ['less than', 'greater than'] }
      },
      areaUnit: {
        type: 'enum',
        options: ['m²', 'km²', 'ha', 'a', 'ft²', 'mi²', 'acre'],
        description: 'Unit for area measurement',
        icon: 'square',
        operators: { real: ['is'], imaginary: ['is not'] }
      },
      duration: {
        type: 'number',
        description: 'Time duration measurement',
        icon: 'timer',
        operators: { real: ['is'], imaginary: ['less than', 'greater than'] }
      },
      durationUnit: {
        type: 'enum',
        options: ['s', 'min', 'h', 'd', 'wk', 'mo', 'yr', 'decade', 'century'],
        description: 'Unit for time duration measurement',
        icon: 'timer',
        operators: { real: ['is'], imaginary: ['is not'] }
      },
      speed: {
        type: 'number',
        description: 'Speed measurement',
        icon: 'speed',
        operators: { real: ['is'], imaginary: ['less than', 'greater than'] }
      },
      speedUnit: {
        type: 'enum',
        options: ['m/s', 'km/h', 'mi/h', 'knot'],
        description: 'Unit for speed measurement',
        icon: 'speed',
        operators: { real: ['is'], imaginary: ['is not'] }
      },
      energy: {
        type: 'number',
        description: 'Energy measurement',
        icon: 'energy',
        operators: { real: ['is'], imaginary: ['less than', 'greater than'] }
      },
      energyUnit: {
        type: 'enum',
        options: ['J', 'kJ', 'cal', 'kcal', 'Wh', 'kWh'],
        description: 'Unit for energy measurement',
        icon: 'energy',
        operators: { real: ['is'], imaginary: ['is not'] }
      },
      power: {
        type: 'number',
        description: 'Power measurement',
        icon: 'power',
        operators: { real: ['is'], imaginary: ['less than', 'greater than'] }
      },
      powerUnit: {
        type: 'enum',
        options: ['W', 'kW', 'MW', 'hp'],
        description: 'Unit for power measurement',
        icon: 'power',
        operators: { real: ['is'], imaginary: ['is not'] }
      },
      pressure: {
        type: 'number',
        description: 'Pressure measurement',
        icon: 'pressure',
        operators: { real: ['is'], imaginary: ['less than', 'greater than'] }
      },
      pressureUnit: {
        type: 'enum',
        options: ['Pa', 'kPa', 'bar', 'psi', 'atm'],
        description: 'Unit for pressure measurement',
        icon: 'pressure',
        operators: { real: ['is'], imaginary: ['is not'] }
      },
      frequency: {
        type: 'number',
        description: 'Frequency measurement',
        icon: 'frequency',
        operators: { real: ['is'], imaginary: ['less than', 'greater than'] }
      },
      frequencyUnit: {
        type: 'enum',
        options: ['Hz', 'kHz', 'MHz', 'GHz'],
        description: 'Unit for frequency measurement',
        icon: 'frequency',
        operators: { real: ['is'], imaginary: ['is not'] }
      },
      precision: {
        type: 'number',
        description: 'Precision or tolerance of measurement',
        icon: 'precision',
        operators: { real: ['is'], imaginary: ['less than', 'greater than'] }
      },
      uncertainty: {
        type: 'number',
        description: 'Uncertainty of measurement',
        icon: 'uncertainty',
        operators: { real: ['is'], imaginary: ['less than', 'greater than'] }
      },
      measuredBy: {
        type: 'string',
        description: 'Who or what performed the measurement',
        icon: 'measurer',
        operators: { real: ['is'], imaginary: ['is not', 'contains'] }
      },
      measuredAt: {
        type: 'datetime',
        description: 'When the measurement was taken',
        icon: 'clock',
        operators: { real: ['is'], imaginary: ['is after', 'is before'] }
      },
      measurementMethod: {
        type: 'string',
        description: 'Method used for measurement',
        icon: 'method',
        operators: { real: ['is'], imaginary: ['is not', 'contains'] }
      }
    },
    children: [
      {
        id: 'physical-object',
        label: 'Physical Object',
        description: 'An object with measurable properties.',
        attributes: {
          name: {
            type: 'string',
            description: 'Name of the object',
            icon: 'label',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] }
          },
          description: {
            type: 'string',
            description: 'Description of the object',
            icon: 'info',
            operators: { real: ['is'], imaginary: ['contains'] }
          },
          dimensions: {
            type: 'string',
            description: 'Physical dimensions (e.g., 10x20x5 cm)',
            icon: 'cube',
            operators: { real: ['is'], imaginary: ['contains'] }
          },
          material: {
            type: 'string',
            description: 'Material composition',
            icon: 'layers',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] }
          },
          color: {
            type: 'string',
            description: 'Color of the object',
            icon: 'color',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] }
          },
          texture: {
            type: 'string',
            description: 'Texture of the object',
            icon: 'texture',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] }
          },
          shape: {
            type: 'enum',
            options: ['sphere', 'cube', 'cylinder', 'cone', 'pyramid', 'rectangular', 'irregular', 'other'],
            description: 'Shape of the object',
            icon: 'shape',
            operators: { real: ['is'], imaginary: ['is not'] }
          },
          condition: {
            type: 'enum',
            options: ['new', 'excellent', 'very good', 'good', 'fair', 'poor', 'damaged'],
            description: 'Physical condition of the object',
            icon: 'condition',
            operators: { real: ['is'], imaginary: ['is not'] }
          },
          manufacturer: {
            type: 'string',
            description: 'Manufacturer of the object',
            icon: 'manufacturer',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] }
          },
          model: {
            type: 'string',
            description: 'Model of the object',
            icon: 'model',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] }
          },
          serialNumber: {
            type: 'string',
            description: 'Serial number of the object',
            icon: 'serial',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] }
          },
          purchaseDate: {
            type: 'date',
            description: 'Date when the object was purchased',
            icon: 'purchase',
            operators: { real: ['is'], imaginary: ['is after', 'is before'] }
          },
          purchasePrice: {
            type: 'number',
            description: 'Purchase price of the object',
            icon: 'cash',
            operators: { real: ['is'], imaginary: ['less than', 'greater than'] }
          },
          currentValue: {
            type: 'number',
            description: 'Current value of the object',
            icon: 'value',
            operators: { real: ['is'], imaginary: ['less than', 'greater than'] }
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
          title: {
            type: 'string',
            description: 'Meeting title',
            icon: 'title',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          description: {
            type: 'string',
            description: 'Meeting description',
            icon: 'info',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          startDateTime: {
            type: 'datetime',
            description: 'Meeting start time',
            icon: 'clock',
            operators: { real: ['is'], imaginary: ['is after', 'is before'] },
          },
          endDateTime: {
            type: 'datetime',
            description: 'Meeting end time',
            icon: 'clock',
            operators: { real: ['is'], imaginary: ['is after', 'is before'] },
          },
          duration: {
            type: 'number',
            description: 'Meeting duration in minutes',
            icon: 'timer',
            operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
          },
          attendees: {
            type: 'string',
            description: 'Meeting attendees',
            icon: 'users',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          organizer: {
            type: 'string',
            description: 'Meeting organizer',
            icon: 'organizer',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          venue: {
            type: 'string',
            description: 'Meeting venue',
            icon: 'location',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
          location: {
            type: 'geo',
            description: 'Meeting location coordinates',
            icon: 'map',
            operators: { real: ['is'], imaginary: ['is near'] },
          },
          virtual: {
            type: 'enum',
            options: ['true', 'false'],
            description: 'Whether the meeting is virtual',
            icon: 'video',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
          agenda: {
            type: 'string',
            description: 'Meeting agenda',
            icon: 'agenda',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          minutes: {
            type: 'string',
            description: 'Meeting minutes',
            icon: 'minutes',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          decisions: {
            type: 'string',
            description: 'Decisions made during the meeting',
            icon: 'decision',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          actionItems: {
            type: 'string',
            description: 'Action items from the meeting',
            icon: 'action',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          status: {
            type: 'enum',
            options: ['scheduled', 'in-progress', 'completed', 'cancelled'],
            description: 'Meeting status',
            icon: 'status',
            operators: { real: ['is'], imaginary: ['is not'] },
          }
        },
      },
      {
        id: 'template-person',
        label: 'Person Profile',
        description: 'To keep track of a contact.',
        attributes: {
          firstName: {
            type: 'string',
            description: 'First/given name',
            icon: 'user',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          lastName: {
            type: 'string',
            description: 'Last/family name',
            icon: 'user',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          displayName: {
            type: 'string',
            description: 'Display name',
            icon: 'display',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          email: {
            type: 'string',
            description: 'Email address',
            icon: 'email',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          phone: {
            type: 'string',
            description: 'Phone number',
            icon: 'phone',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
          role: {
            type: 'string',
            description: 'Professional role',
            icon: 'role',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          organization: {
            type: 'string',
            description: 'Associated organization',
            icon: 'organization',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          department: {
            type: 'string',
            description: 'Department in organization',
            icon: 'department',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          location: {
            type: 'string',
            description: 'Geographic location',
            icon: 'location',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          birthday: {
            type: 'date',
            description: 'Birthday',
            icon: 'birthday',
            operators: { real: ['is'], imaginary: ['is after', 'is before'] },
          },
          anniversary: {
            type: 'date',
            description: 'Work anniversary',
            icon: 'anniversary',
            operators: { real: ['is'], imaginary: ['is after', 'is before'] },
          },
          interests: {
            type: 'string',
            description: 'Personal or professional interests',
            icon: 'interests',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          skills: {
            type: 'string',
            description: 'Skills and expertise',
            icon: 'skills',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          relationships: {
            type: 'string',
            description: 'Relationships with other contacts',
            icon: 'relationships',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          notes: {
            type: 'string',
            description: 'Additional notes about the person',
            icon: 'notes',
            operators: { real: ['is'], imaginary: ['contains'] },
          }
        },
      },
      {
        id: 'template-project',
        label: 'Project Plan',
        description: 'To outline a new project.',
        attributes: {
          title: {
            type: 'string',
            description: 'Project title',
            icon: 'title',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          },
          description: {
            type: 'string',
            description: 'Project description',
            icon: 'info',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          status: {
            type: 'enum',
            options: ['Planning', 'Active', 'On Hold', 'Completed', 'Archived', 'Cancelled'],
            description: 'Project status',
            icon: 'status',
            operators: { real: ['is'], imaginary: ['is not'] },
          },
          startDate: {
            type: 'date',
            description: 'Project start date',
            icon: 'calendar',
            operators: { real: ['is'], imaginary: ['is after', 'is before'] },
          },
          deadline: {
            type: 'date',
            description: 'Project deadline',
            icon: 'calendar',
            operators: { real: ['is'], imaginary: ['is after', 'is before'] },
          },
          budget: {
            type: 'number',
            description: 'Total project budget',
            icon: 'cash',
            operators: {
              real: ['is'],
              imaginary: ['less than', 'greater than', 'between'],
            },
          },
          budgetRate: {
            type: 'number',
            description: 'Project budget rate (e.g., per hour, per day)',
            icon: 'cash-clock',
            operators: {
              real: ['is'],
              imaginary: ['less than', 'greater than', 'between'],
            },
          },
          spent: {
            type: 'number',
            description: 'Amount spent so far',
            icon: 'spent',
            operators: {
              real: ['is'],
              imaginary: ['less than', 'greater than', 'between'],
            },
          },
          teamSize: {
            type: 'number',
            description: 'Number of team members',
            icon: 'team',
            operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
          },
          stakeholders: {
            type: 'string',
            description: 'Project stakeholders',
            icon: 'stakeholders',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          objectives: {
            type: 'string',
            description: 'Project objectives',
            icon: 'objectives',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          deliverables: {
            type: 'string',
            description: 'Project deliverables',
            icon: 'deliverables',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          risks: {
            type: 'string',
            description: 'Project risks',
            icon: 'risks',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          milestones: {
            type: 'string',
            description: 'Project milestones',
            icon: 'milestones',
            operators: { real: ['is'], imaginary: ['contains'] },
          },
          category: {
            type: 'string',
            description: 'Project category',
            icon: 'category',
            operators: { real: ['is'], imaginary: ['is not', 'contains'] },
          }
        },
      },
    ],
  },
];
