import { ROLES } from './permissions';

// The five "demo switcher" users represent one login per role.
export const DEMO_USERS = [
  {
    id: 'u1',
    name: 'Thandiwe Mokoena',
    initials: 'TM',
    email: 'thandiwe.mokoena@littleangels.org.za',
    role: ROLES.ADMIN,
    department: 'Operations & IT',
    title: 'Systems Administrator',
    active: true,
  },
  {
    id: 'u2',
    name: 'Sarah Naidoo',
    initials: 'SN',
    email: 'sarah.naidoo@littleangels.org.za',
    role: ROLES.FINANCE_MANAGER,
    department: 'Finance',
    title: 'Finance Manager',
    active: true,
  },
  {
    id: 'u3',
    name: 'David Okafor',
    initials: 'DO',
    email: 'david.okafor@littleangels.org.za',
    role: ROLES.PROGRAM_MANAGER,
    department: 'Programs',
    title: 'Program Manager: Early Childhood Development',
    active: true,
  },
  {
    id: 'u4',
    name: 'Lindiwe Zulu',
    initials: 'LZ',
    email: 'lindiwe.zulu@littleangels.org.za',
    role: ROLES.STAFF,
    department: 'Programs',
    title: 'Field Officer',
    active: true,
  },
  {
    id: 'u5',
    name: 'Michael Chen',
    initials: 'MC',
    email: 'michael.chen@auditpartners.co.za',
    role: ROLES.AUDITOR,
    department: 'External Audit',
    title: 'Independent Auditor',
    active: true,
  },
];

// Additional users only visible in the Admin > User Management screen,
// to demonstrate a more realistic org roster.
export const ALL_USERS = [
  ...DEMO_USERS,
  {
    id: 'u6',
    name: 'Precious Dlamini',
    initials: 'PD',
    email: 'precious.dlamini@littleangels.org.za',
    role: ROLES.STAFF,
    department: 'Programs',
    title: 'Community Facilitator',
    active: true,
  },
  {
    id: 'u7',
    name: 'James van der Merwe',
    initials: 'JV',
    email: 'james.vdm@littleangels.org.za',
    role: ROLES.PROGRAM_MANAGER,
    department: 'Programs',
    title: 'Program Manager: Nutrition',
    active: true,
  },
  {
    id: 'u8',
    name: 'Naledi Sithole',
    initials: 'NS',
    email: 'naledi.sithole@littleangels.org.za',
    role: ROLES.STAFF,
    department: 'Fundraising',
    title: 'Donor Relations Officer',
    active: false,
  },
];

export function userById(id) {
  return ALL_USERS.find((u) => u.id === id);
}
