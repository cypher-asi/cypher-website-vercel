import {
  MAX_BODY_LENGTH,
  MAX_SLUG_LENGTH,
  MAX_SUMMARY_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_VERSION_LENGTH,
  SLUG_RE,
  isPostKind,
  postBlobPrefix,
  type PostDraft,
} from './types';

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/**
 * Checks a draft a site sends; `publishing` also requires what a public post
 * can't go without. The messages are shown to editors as they are.
 */
export function cleanDraft(postId: string, raw: unknown, publishing: boolean): PostDraft | { error: string } {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  if (!isPostKind(input.kind)) return { error: 'Choose News or Changelog.' };
  const title = text(input.title);
  const summary = text(input.summary);
  const slug = text(input.slug).toLowerCase();
  const version = text(input.version);
  const bodyMd = typeof input.bodyMd === 'string' ? input.bodyMd : '';
  const coverPathname =
    typeof input.coverPathname === 'string' && input.coverPathname ? input.coverPathname : null;

  if (title.length > MAX_TITLE_LENGTH) return { error: 'That title is too long.' };
  if (summary.length > MAX_SUMMARY_LENGTH) return { error: 'That summary is too long.' };
  if (version.length > MAX_VERSION_LENGTH) return { error: 'That version is too long.' };
  if (bodyMd.length > MAX_BODY_LENGTH) return { error: 'That post is too long.' };
  if (!slug || slug.length > MAX_SLUG_LENGTH || !SLUG_RE.test(slug)) {
    return { error: 'The URL slug can only use lowercase letters, numbers and single hyphens.' };
  }
  if (coverPathname && (!coverPathname.startsWith(postBlobPrefix(postId)) || coverPathname.includes('..'))) {
    return { error: "That cover image doesn't belong to this post." };
  }
  if (publishing) {
    if (!title) return { error: 'Add a title before publishing.' };
    if (!bodyMd.trim()) return { error: 'Write something before publishing.' };
    if (slug.startsWith('untitled-')) return { error: 'Give the post a URL slug before publishing.' };
  }
  return { kind: input.kind, title, summary, slug, version, bodyMd, coverPathname };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+$/;

/** An author snapshot from a create request, or an error message. */
export function cleanAuthor(raw: unknown): { userId: string; name: string; email: string } | { error: string } {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const userId = text(input.userId);
  const name = text(input.name);
  const email = text(input.email).toLowerCase();
  if (!userId || userId.length > 200) return { error: 'author.userId is required.' };
  if (!name || name.length > 200) return { error: 'author.name is required.' };
  if (!EMAIL_RE.test(email) || email.length > 320) return { error: 'author.email must be an email address.' };
  return { userId, name, email };
}

/** The editor's email from a write request, or `null` when it isn't one. */
export function cleanEmail(raw: unknown): string | null {
  const email = text(raw).toLowerCase();
  return EMAIL_RE.test(email) && email.length <= 320 ? email : null;
}
