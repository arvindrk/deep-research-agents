/**
 * The shape of a cache directive, in one place. Two routes spelling the same
 * intent by hand is how one of them ends up with a stale answer nobody asked
 * for, or with a stored failure.
 *
 * The numbers are not shared: each surface has its own argument about how long
 * its answer stays true, and those arguments live next to the policies.
 */
export const NO_STORE = 'no-store';

/**
 * An answer a shared cache may hold, while the reader's own view revalidates.
 * `max-age=0` is deliberate: the reader who asks again gets a fresh check, and
 * the shared cache absorbs the repeat.
 */
export function sharedAnswerPolicy(
  sharedMaxAgeSeconds: number,
  staleWhileRevalidateSeconds: number,
): string {
  return [
    'public',
    'max-age=0',
    `s-maxage=${sharedMaxAgeSeconds}`,
    `stale-while-revalidate=${staleWhileRevalidateSeconds}`,
  ].join(', ');
}
