import { describe, expect, it } from 'vitest';

import { INTENTS, editDistance, mailtoHref, subjectFor, suggestEmail } from './contactModel';

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
