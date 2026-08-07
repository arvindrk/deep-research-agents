import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const REPO_ROOT = process.cwd();
const RULES_DIR = join(REPO_ROOT, '.agents/rules');
const SKILLS_DIR = join(REPO_ROOT, '.agents/skills');
const SKILL_ENTRYPOINTS = ['SKILL.md', 'AGENTS.md'];

const read = (path: string) => readFileSync(join(REPO_ROOT, path), 'utf8');
const markdownIn = (dir: string) => readdirSync(dir).filter((name) => name.endsWith('.md')).sort();

/** Repo-relative targets of every markdown link in AGENTS.md, ignoring anchors and URLs. */
function linkedPaths(markdown: string): string[] {
  const links = markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g);
  return [...links]
    .map(([, target]) => target)
    .filter((target) => !target.startsWith('http') && !target.startsWith('#'));
}

describe('agent manifest', () => {
  const agentsMd = read('AGENTS.md');
  const ruleFiles = markdownIn(RULES_DIR);

  it('indexes every rule file in AGENTS.md', () => {
    const linked = new Set(linkedPaths(agentsMd));
    for (const file of ruleFiles) {
      assert.ok(
        linked.has(`.agents/rules/${file}`),
        `.agents/rules/${file} exists but AGENTS.md does not link it, so it is silently unenforced`,
      );
    }
  });

  it('links nothing from AGENTS.md that does not exist', () => {
    for (const target of linkedPaths(agentsMd)) {
      assert.ok(existsSync(join(REPO_ROOT, target)), `AGENTS.md links ${target}, which does not exist`);
    }
  });

  it('gives every rule a title and some content', () => {
    for (const file of ruleFiles) {
      const body = readFileSync(join(RULES_DIR, file), 'utf8');
      assert.match(body, /^# .+/m, `.agents/rules/${file} has no H1 title`);
      assert.ok(body.trim().split('\n').length > 3, `.agents/rules/${file} is a stub`);
    }
  });

  it('resolves every link a rule makes', () => {
    for (const file of ruleFiles) {
      const body = readFileSync(join(RULES_DIR, file), 'utf8');
      for (const target of linkedPaths(body)) {
        assert.ok(
          existsSync(join(RULES_DIR, target)),
          `.agents/rules/${file} links ${target}, which does not resolve`,
        );
      }
    }
  });

  it('gives every skill an entrypoint', () => {
    const skills = readdirSync(SKILLS_DIR, { withFileTypes: true }).filter((entry) => entry.isDirectory());
    assert.ok(skills.length > 0, 'no skills found');

    for (const skill of skills) {
      assert.ok(
        SKILL_ENTRYPOINTS.some((name) => existsSync(join(SKILLS_DIR, skill.name, name))),
        `.agents/skills/${skill.name} has no ${SKILL_ENTRYPOINTS.join(' or ')} entrypoint`,
      );
    }
  });

  it('points CLAUDE.md at AGENTS.md', () => {
    assert.match(read('CLAUDE.md'), /AGENTS\.md/, 'CLAUDE.md must forward to AGENTS.md');
  });

  it('documents every verify step as a command in AGENTS.md', () => {
    const { scripts } = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
    for (const step of ['lint', 'typecheck', 'eval', 'build', 'verify']) {
      assert.ok(scripts[step], `package.json is missing the ${step} script`);
      assert.match(agentsMd, new RegExp(`npm run ${step}\\b`), `AGENTS.md does not document npm run ${step}`);
    }
  });
});
