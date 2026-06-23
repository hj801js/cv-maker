// Coerce a (possibly hand-edited or corrupt) CV object into the shape the
// editor and preview expect, so a malformed profile can't break the UI.
// Non-destructive: valid values pass through; only wrong-typed/missing fields
// fall back to safe empty defaults. Pure — unit-tested in test/normalizeCv.test.js.

const arr = (v) => (Array.isArray(v) ? v : []);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const str = (v) => (typeof v === 'string' ? v : '');

export function normalizeCv(cv) {
  const c = obj(cv);
  const rf = obj(c.researchField);
  const pubs = obj(c.publications);
  const skills = obj(c.skills);
  return {
    ...c,
    basicInfo: obj(c.basicInfo),
    summary: str(c.summary),
    specialties: arr(c.specialties),
    certifications: arr(c.certifications),
    memberships: arr(c.memberships),
    researchField: { ...rf, title: str(rf.title), items: arr(rf.items) },
    experiences: arr(c.experiences),
    projects: arr(c.projects),
    hardwareExperiences: arr(c.hardwareExperiences),
    education: arr(c.education),
    publications: { ...pubs, journals: arr(pubs.journals), conferences: arr(pubs.conferences) },
    patents: arr(c.patents),
    skills: { ...skills, technical: arr(skills.technical), languages: arr(skills.languages) }
  };
}
