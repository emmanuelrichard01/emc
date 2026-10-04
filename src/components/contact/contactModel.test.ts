import { describe, expect, it } from 'vitest';

import {
  INTENTS,
  attachmentLabel,
  buildVCard,
  editDistance,
  mailtoHref,
  overlapSentence,
  subjectFor,
  suggestEmail,
  topicFor,
  workdayOverlapMinutes,
  zoneOffsetMinutes,
} from './contactModel';

describe('suggestEmail', () => {
  it('catches near misses of the big providers', () => {
    expect(suggestEmail('ada@gmial.com')).toBe('ada@gmail.com');
    expect(suggestEmail('ada@gmai.com')).toBe('ada@gmail.com');
    expect(suggestEmail('ada@hotmial.com')).toBe('ada@hotmail.com');
    expect(suggestEmail('ada@outlok.com')).toBe('ada@outlook.com');
    expect(suggestEmail('Ada.Obi@YAHOO.CMO')).toBe('Ada.Obi@yahoo.com');
    expect(suggestEmail('ada@gmail.co')).toBe('ada@gmail.com');
  });

  it('fixes a .com typo on any domain', () => {
    expect(suggestEmail('ada@acme-logistics.con')).toBe('ada@acme-logistics.com');
  });

  it('never rewrites a real company domain into a provider', () => {
    expect(suggestEmail('ada@gmail.com')).toBeNull();
    expect(suggestEmail('ada@mail.com')).toBeNull();
    expect(suggestEmail('ada@ymail.com')).toBeNull();
    expect(suggestEmail('ada@email.com')).toBeNull();
    expect(suggestEmail('ada@gitlab.com')).toBeNull();
    expect(suggestEmail('ada@company.co')).toBeNull();
    expect(suggestEmail('ada@stripe.com')).toBeNull();
  });

  it('leaves half-typed addresses alone', () => {
    expect(suggestEmail('ada')).toBeNull();
    expect(suggestEmail('ada@')).toBeNull();
    expect(suggestEmail('@gmail.com')).toBeNull();
  });

  it('counts a transposition as one edit', () => {
    expect(editDistance('gmial', 'gmail')).toBe(1);
    expect(editDistance('abc', 'abc')).toBe(0);
  });
});

describe('subjects and fallback', () => {
  it('files a message under what it is about', () => {
    expect(subjectFor(INTENTS[0], ' Ada Obi ')).toBe('Portfolio · A role · Ada Obi');
    expect(subjectFor(INTENTS[3], '')).toBe('Portfolio · Something else');
  });

  it('encodes the fallback so nothing is lost on the way to the mail app', () => {
    const href = mailtoHref('me@x.com', 'Hi & bye', 'Line one\nline two?');
    expect(href).toBe('mailto:me@x.com?subject=Hi%20%26%20bye&body=Line%20one%0Aline%20two%3F');
  });
});

describe('working hours overlap', () => {
  it('reads real offsets, daylight saving included', () => {
    expect(zoneOffsetMinutes('Africa/Lagos', new Date('2026-01-15T12:00:00Z'))).toBe(60);
    expect(zoneOffsetMinutes('Europe/London', new Date('2026-01-15T12:00:00Z'))).toBe(0);
    expect(zoneOffsetMinutes('Europe/London', new Date('2026-07-15T12:00:00Z'))).toBe(60);
    expect(zoneOffsetMinutes('America/New_York', new Date('2026-07-15T12:00:00Z'))).toBe(-240);
    expect(zoneOffsetMinutes('Asia/Kolkata', new Date('2026-07-15T12:00:00Z'))).toBe(330);
  });

  it('measures the shared part of a 09:00 to 17:00 day', () => {
    expect(workdayOverlapMinutes(60)).toBe(480); // Abuja, Berlin in winter
    expect(workdayOverlapMinutes(0)).toBe(420); // London in winter
    expect(workdayOverlapMinutes(-240)).toBe(180); // New York in summer
    expect(workdayOverlapMinutes(330)).toBe(210); // India
    expect(workdayOverlapMinutes(-420)).toBe(0); // California in summer
    expect(workdayOverlapMinutes(600)).toBe(0); // Sydney
    expect(workdayOverlapMinutes(780)).toBe(0); // Auckland
  });

  it('says it in one plain sentence', () => {
    expect(overlapSentence(480)).toBe('We share the whole working day.');
    expect(overlapSentence(420)).toBe('Our working days overlap by 7 hours.');
    expect(overlapSentence(210)).toBe('Our working days overlap by 3.5 hours.');
    expect(overlapSentence(60)).toBe('Our working days overlap by 1 hour.');
    expect(overlapSentence(30)).toBe('Our working days overlap by 30 minutes.');
    expect(overlapSentence(0)).toMatch(/don’t overlap/);
  });
});

describe('doors and drafts', () => {
  it('folds a collaboration into something else', () => {
    expect(topicFor('collab')).toBe('other');
    expect(topicFor('role')).toBe('role');
  });

  it('names an attached draft from how it starts', () => {
    expect(attachmentLabel('Project brief: Ledger')).toBe('Project brief');
    expect(attachmentLabel('From my conversation with the assistant on your site:\n\nQ: hi')).toBe('Conversation with the assistant');
    expect(attachmentLabel('I checked a role against your site')).toBe('Role fit summary');
    expect(attachmentLabel('Something')).toBe('From the assistant');
  });
});

describe('buildVCard', () => {
  it('builds a vCard 3.0 entry with escaped values and CRLF lines', () => {
    const card = buildVCard({
      name: 'Emmanuel Moghalu',
      family: 'Moghalu',
      given: 'Emmanuel',
      title: 'Software, Data; Engineer',
      email: 'emma.moghalu@gmail.com',
      url: 'https://builtbyem.dev',
      city: 'Abuja',
      country: 'Nigeria',
      links: ['https://github.com/emmanuelrichard01'],
    });
    expect(card.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n')).toBe(true);
    expect(card).toContain('N:Moghalu;Emmanuel;;;\r\n');
    expect(card).toContain('TITLE:Software\\, Data\\; Engineer\r\n');
    expect(card).toContain('ADR;TYPE=WORK:;;;Abuja;;;Nigeria\r\n');
    expect(card.endsWith('END:VCARD\r\n')).toBe(true);
    expect(card.split('\r\n').every((line) => !line.includes('\n'))).toBe(true);
  });
});
