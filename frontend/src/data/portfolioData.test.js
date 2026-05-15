import { describe, expect, it } from 'vitest';
import { portfolioData } from './portfolioData';

describe('portfolioData text encoding', () => {
  it('keeps personal info and project icons as plain readable text without mojibake sequences', () => {
    const personalInfoStrings = Object.values(portfolioData.personalInfo).filter(
      (value) => typeof value === 'string',
    );
    const projectIconStrings = portfolioData.projects.map((project) => project.icon);

    [...personalInfoStrings, ...projectIconStrings].forEach((value) => {
      expect(value).not.toContain('ðŸ');
    });

    expect(portfolioData.personalInfo.location).toBe('Redlands, CA');
    expect(portfolioData.personalInfo.phone).toBe('+1 909-871-6890');
    expect(portfolioData.personalInfo.email).toBe('yazhini.elanchezhian3368@coyote.csusb.edu');
    expect(projectIconStrings).toEqual(['AI', 'Books']);
  });
});
