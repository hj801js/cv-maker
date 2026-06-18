// Schema registry — describes each section of the CV.
// `EditorPane` dispatches to ObjectEditor / ListEditor / StringListEditor
// based on `type`. Field labels are Korean for UI; data values stay English.

import { labels } from './i18n/ko.js';

const L = labels.sections;
const F = labels.fields;

export const sections = [
  {
    key: 'basicInfo',
    label: L.basicInfo,
    type: 'object',
    fields: [
      { key: 'name', label: F.name, type: 'text' },
      { key: 'nameEn', label: F.nameEn, type: 'text' },
      { key: 'title', label: F.title, type: 'text' },
      { key: 'tagline', label: F.tagline, type: 'text' },
      { key: 'affiliation', label: F.affiliation, type: 'text' },
      { key: 'dateOfBirth', label: F.dateOfBirth, type: 'text', placeholder: 'YYYY-MM-DD' },
      { key: 'email', label: F.email, type: 'text' },
      { key: 'phone', label: F.phone, type: 'text' },
      { key: 'address', label: F.address, type: 'textarea' },
      { key: 'citizenship', label: F.citizenship, type: 'text' },
      { key: 'website', label: F.website, type: 'text' },
      { key: 'linkedin', label: F.linkedin, type: 'text' },
      { key: 'github', label: F.github, type: 'text' },
      { key: 'orcid', label: F.orcid, type: 'text', placeholder: '0000-0000-0000-0000' },
      { key: 'photo', label: F.photo, type: 'image' }
    ]
  },
  {
    key: 'summary',
    label: L.summary,
    type: 'text',
    multiline: true
  },
  {
    key: 'specialties',
    label: L.specialties,
    type: 'stringList'
  },
  {
    key: 'certifications',
    label: L.certifications,
    type: 'stringList'
  },
  {
    key: 'memberships',
    label: L.memberships,
    type: 'stringList'
  },
  {
    key: 'researchField',
    label: L.researchField,
    type: 'object',
    fields: [
      { key: 'title', label: F.titleField, type: 'text' },
      { key: 'items', label: F.details, type: 'stringList' }
    ]
  },
  {
    key: 'experiences',
    label: L.experiences,
    type: 'list',
    itemLabel: (it) => `${it.role || ''} @ ${it.company || ''}`,
    factory: () => ({
      company: '',
      location: '',
      role: '',
      startDate: '',
      endDate: null,
      responsibilities: []
    }),
    fields: [
      { key: 'company', label: F.company, type: 'text' },
      { key: 'location', label: F.location, type: 'text' },
      { key: 'role', label: F.role, type: 'text' },
      { key: 'startDate', label: F.startDate, type: 'text', placeholder: 'YYYY-MM' },
      { key: 'endDate', label: F.endDate, type: 'text', placeholder: 'YYYY-MM 또는 비워두기' },
      { key: 'responsibilities', label: F.responsibilities, type: 'stringList' }
    ]
  },
  {
    key: 'projects',
    label: L.projects,
    type: 'list',
    itemLabel: (it) => it.title || '(제목 없음)',
    factory: () => ({
      title: '',
      startYear: null,
      endYear: null,
      description: '',
      partner: '',
      achievement: ''
    }),
    fields: [
      { key: 'title', label: F.titleField, type: 'text' },
      { key: 'startYear', label: F.startYear, type: 'number' },
      { key: 'endYear', label: F.endYear, type: 'number' },
      { key: 'description', label: F.description, type: 'textarea' },
      { key: 'partner', label: F.partner, type: 'text' },
      { key: 'achievement', label: F.achievement, type: 'textarea' }
    ]
  },
  {
    key: 'hardwareExperiences',
    label: L.hardwareExperiences,
    type: 'list',
    itemLabel: (it) => it.title || '(제목 없음)',
    factory: () => ({ title: '', startYear: null, endYear: null, details: [] }),
    fields: [
      { key: 'title', label: F.titleField, type: 'text' },
      { key: 'startYear', label: F.startYear, type: 'number' },
      { key: 'endYear', label: F.endYear, type: 'number' },
      { key: 'details', label: F.details, type: 'stringList' }
    ]
  },
  {
    key: 'education',
    label: L.education,
    type: 'list',
    itemLabel: (it) => `${it.degree || ''} (${it.year || ''})`,
    factory: () => ({
      degree: '',
      university: '',
      location: '',
      year: null,
      dissertation: '',
      supervisor: '',
      researchInterests: [],
      extras: []
    }),
    fields: [
      { key: 'degree', label: F.degree, type: 'text' },
      { key: 'university', label: F.university, type: 'text' },
      { key: 'location', label: F.location, type: 'text' },
      { key: 'year', label: F.year, type: 'number' },
      { key: 'dissertation', label: F.dissertation, type: 'textarea' },
      { key: 'supervisor', label: F.supervisor, type: 'text' },
      { key: 'researchInterests', label: F.researchInterests, type: 'stringList' },
      { key: 'extras', label: F.extras, type: 'stringList' }
    ]
  },
  {
    key: 'publications.journals',
    label: `${L.publications} - ${L.journals}`,
    type: 'list',
    path: ['publications', 'journals'],
    itemLabel: (it) => it.title || '(제목 없음)',
    factory: () => ({ authors: '', title: '', venue: '', date: '' }),
    fields: [
      { key: 'authors', label: F.authors, type: 'textarea' },
      { key: 'title', label: F.titleField, type: 'textarea' },
      { key: 'venue', label: F.venue, type: 'textarea' },
      { key: 'date', label: F.date, type: 'text', placeholder: 'YYYY 또는 YYYY-MM' }
    ]
  },
  {
    key: 'publications.conferences',
    label: `${L.publications} - ${L.conferences}`,
    type: 'list',
    path: ['publications', 'conferences'],
    itemLabel: (it) => it.title || '(제목 없음)',
    factory: () => ({ authors: '', title: '', venue: '', date: '' }),
    fields: [
      { key: 'authors', label: F.authors, type: 'textarea' },
      { key: 'title', label: F.titleField, type: 'textarea' },
      { key: 'venue', label: F.venue, type: 'textarea' },
      { key: 'date', label: F.date, type: 'text', placeholder: 'YYYY 또는 YYYY-MM' }
    ]
  },
  {
    key: 'patents',
    label: L.patents,
    type: 'list',
    itemLabel: (it) => `${it.number || ''} — ${it.title || ''}`,
    factory: () => ({ authors: 'H. Kim, et. al.', title: '', number: '', year: null, status: 'Registered' }),
    fields: [
      { key: 'authors', label: F.authors, type: 'text' },
      { key: 'title', label: F.titleField, type: 'textarea' },
      { key: 'number', label: F.number, type: 'text' },
      { key: 'year', label: F.year, type: 'number' },
      { key: 'status', label: F.status, type: 'text' }
    ]
  },
  {
    key: 'skills.technical',
    label: `${L.skills} - ${L.technical}`,
    type: 'stringList',
    path: ['skills', 'technical']
  },
  {
    key: 'skills.languages',
    label: `${L.skills} - ${L.languages}`,
    type: 'list',
    path: ['skills', 'languages'],
    itemLabel: (it) => `${it.name} (${it.level})`,
    factory: () => ({ name: '', level: '' }),
    fields: [
      { key: 'name', label: F.name, type: 'text' },
      { key: 'level', label: F.titleField, type: 'text' }
    ]
  }
];

// English section labels for the editor nav/title (Korean labels live above).
const SECTION_LABELS_EN = {
  basicInfo: 'Personal Information',
  summary: 'Summary',
  specialties: 'Specialties',
  certifications: 'Certifications',
  memberships: 'Memberships',
  researchField: 'Research Field',
  experiences: 'Experience',
  projects: 'R&D Projects',
  hardwareExperiences: 'Hardware Experience',
  education: 'Education',
  'publications.journals': 'Publications - Journals',
  'publications.conferences': 'Publications - Conferences',
  patents: 'Patents',
  'skills.technical': 'Skills - Technical',
  'skills.languages': 'Skills - Languages'
};

export function sectionLabel(section, lang) {
  if (lang === 'en') return SECTION_LABELS_EN[section.key] || section.label;
  return section.label;
}

// Reorderable big sections (output order is user-controlled). `basicInfo` and its
// folded detail items are pinned and excluded from reordering.
export const MAIN_SECTION_KEYS = [
  'summary',
  'researchField',
  'education',
  'experiences',
  'projects',
  'publications.journals',
  'publications.conferences',
  'patents',
  'hardwareExperiences',
  'specialties',
  'skills.technical'
];
export const PINNED_SECTION_KEYS = ['basicInfo', 'certifications', 'memberships', 'skills.languages'];

// Sections that support the Korean table layout (entry/list sections).
export const TABLE_SECTION_KEYS = [
  'education',
  'experiences',
  'projects',
  'publications.journals',
  'publications.conferences',
  'patents',
  'hardwareExperiences',
  'specialties',
  'skills.technical'
];

// Helpers to read/write nested values based on a section's `path` (or just key)
export function getSectionPath(section) {
  return section.path || [section.key];
}

export function getAt(obj, pathArr) {
  return pathArr.reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

export function setAt(obj, pathArr, value) {
  let node = obj;
  for (let i = 0; i < pathArr.length - 1; i++) {
    const k = pathArr[i];
    if (node[k] == null || typeof node[k] !== 'object') node[k] = {};
    node = node[k];
  }
  node[pathArr[pathArr.length - 1]] = value;
}
