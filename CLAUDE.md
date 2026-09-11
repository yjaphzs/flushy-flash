# CLAUDE.md

@AGENTS.md

The shared agent guidance lives in [AGENTS.md](./AGENTS.md) and is imported above,
so Codex, Copilot, Cursor and Claude Code all read one set of rules and they
cannot drift apart. Everything there applies here — read it before changing code.

## Claude Code specifics

### Skills installed for this project

Nine skills are committed under `.agents/skills/` and tracked in
`skills-lock.json`. The ones worth invoking explicitly:

| Skill | Use it when |
|---|---|
| `heroui-native` | Building any UI. It fetches live component docs — run `node .agents/skills/heroui-native/scripts/get_component_docs.mjs Button` rather than guessing a prop name |
| `expo-router` | Touching routes, groups, guards, modals or native tabs |
| `react-native-testing` | Writing component tests (RNTL v14, async render) |
| `expo-dev-client` | Anything about dev builds — this app can never use Expo Go |
| `expo-upgrade` | SDK upgrades, the main long-term maintenance burden |
| `vercel-react-native-skills` | Performance: list virtualisation, Reanimated, native modules |
| `vercel-composition-patterns` | Designing component APIs (compound components) |
| `expo-design-system` / `expo-project-structure` | Design tokens and file placement |

Skills deliberately **not** installed, because they contradict this stack:
`callstack/react-navigation` (teaches the banned navigators), `expo-native-ui` and
`expo-ui` (`@expo/ui`, competes with HeroUI), `heroui-react` and
`heroui-migration` (web HeroUI — the native skill explicitly warns against
applying web patterns), and the shadcn skills.

If a skill install pulls in dependencies, check `skills-lock.json` afterwards:
adding `vercel-composition-patterns` silently pulled in shadcn/Radix skills, and
the HeroUI install pulled in the web variants. Both were removed with
`npx skills remove <name> -y`.

### Firebase MCP

A Firebase MCP server is usually connected. Prefer it over shelling out to
`firebase-tools` for project inspection, SDK config and deploys. The
`firebase-security-rules-auditor` skill is the right tool for reviewing
`firestore.rules` — those rules are written but **not yet proven** (see AGENTS.md §7).

### Editing notes

- `.claude/skills/` holds absolute symlinks into `.agents/skills/` and is
  gitignored. The real content in `.agents/skills/` is committed. Regenerate the
  links locally with `npx skills add` if they are missing.
- Shell heredocs choke on `firestore.rules` (the `$'` in the email regex and the
  `$(database)` interpolations). Use the Write tool for that file rather than
  fighting the quoting.
- Prefer running the full verification block in AGENTS.md §9 before reporting
  done. `expo-doctor` catches SDK version drift that typecheck and lint miss.
