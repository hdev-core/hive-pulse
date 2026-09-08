/**
 * Tag chips that carry no class-based signal.
 *
 * SlothBuzz renders each chip as
 *
 *   <span class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm …">
 *     <span>#</span><span>tag1</span><button aria-label="…">×</button>
 *   </span>
 *
 * inside <div class="flex flex-wrap gap-2">. Every class is a Tailwind utility, so the
 * class*="tag|chip|pill" scan in compose.ts finds nothing, and at the 10-tag cap both the
 * tag <input> and the suggestions row unmount — which is why anchoring the search on the
 * input reported a fully tagged post as 0 tags.
 *
 * Three earlier attempts widened that search and made things worse, because they all
 * scraped "#word" out of an arbitrary ancestor subtree and tried to exclude the bad hits
 * with a denylist. A denylist cannot work here: the post body legitimately contains
 * hashtags, so "#posh" in a draft was read as a tag.
 *
 * This inverts it. Nothing is excluded by name; instead a container qualifies only if
 * EVERY one of its element children is chip-shaped — tag grammar, exactly one close
 * control, a handful of nodes at most. A paragraph of prose containing #posh has children
 * that are not uniformly chips, so it never qualifies. The one denylist that remains is
 * structural and narrow: never read out of the editing surface at all.
 */

const TAG_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const CLOSE_GLYPHS = /[×✕✗✖⨯]/g;

const CLOSE_SEL = [
  'button', '[role="button"]',
  '[class*="close" i]', '[class*="remove" i]', '[class*="delete" i]',
  '[aria-label*="remove" i]', '[aria-label*="delete" i]',
].join(',');

/**
 * Applied with closest() to the candidate container, not as a descendant query. An earlier
 * fix used the descendant form, which stops you climbing INTO the editor but not starting
 * inside it — it re-created the bug it was written to fix.
 */
const EDITOR_SEL = '[contenteditable="true"],.CodeMirror,.cm-editor,textarea';

/** The tag this element represents as a chip, or null if it is not one. */
const chipTag = (el: Element): string | null => {
  // A suggestion is rendered as <button>#foo</button> — same text as a chip, but it is an
  // offer, not a selection. Links are hashtags in rendered post content.
  if (/^(BUTTON|A|INPUT|TEXTAREA|SELECT|IMG|SVG)$/.test(el.tagName.toUpperCase())) return null;

  // Structural test before any text read. textContent concatenates a whole subtree, so
  // doing it first would make this scan O(nodes x depth) on a large page; a chip has three
  // direct children at most, so this bounds the reads to small subtrees.
  if (el.children.length > 4) return null;

  const text = (el.textContent || '').replace(CLOSE_GLYPHS, '').trim().replace(/^#\s*/, '').trim();
  const tag = text.toLowerCase();
  if (tag.length < 2 || tag.length > 32 || /\s/.test(tag) || !TAG_RE.test(tag)) return null;

  // Exactly one close control, and a chip's worth of nodes. Without this, a wrapper holding
  // the whole chip row reads as a single chip: its text concatenates to "tag1tag2", which
  // has no whitespace and passes the grammar.
  if (el.querySelectorAll(CLOSE_SEL).length !== 1) return null;
  if (el.querySelectorAll('*').length > 6) return null;

  return tag;
};

/**
 * Tags from the largest container whose children are all chips. Returns [] when there is
 * no such container, which is the normal case on frontends handled by the class-based scan.
 */
export const scanChipTags = (root: ParentNode, excludeSelector?: string): string[] => {
  let best: string[] = [];

  for (const container of Array.from(root.querySelectorAll('*'))) {
    const kids = container.children;
    // A tag row is short and small. Bailing early here keeps this to one cheap text test
    // per element on a large page.
    if (!kids.length || kids.length > 40) continue;

    const tags: string[] = [];
    let uniform = true;
    for (const kid of Array.from(kids)) {
      // Tested on the child, not the container. Testing the container missed the case
      // where the container is <body> and the excluded subtree is its child: body.closest()
      // looks at ancestors, so an entire excluded subtree read as one chip one level up.
      // A child's closest() covers the container too, since the container is its parent.
      if (kid.closest(EDITOR_SEL) || (excludeSelector && kid.closest(excludeSelector))) {
        uniform = false; break;
      }
      const tag = chipTag(kid);
      if (!tag) { uniform = false; break; }
      tags.push(tag);
    }
    if (!uniform) continue;

    const unique = [...new Set(tags)];
    if (unique.length > best.length) best = unique;
  }

  return best;
};
