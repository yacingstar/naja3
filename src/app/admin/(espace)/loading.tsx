// Shown the instant a navigation starts, for every page under this layout.
//
// Nothing here makes the admin faster — the server still has to cold-start and
// query Supabase. What it changes is that the browser stops sitting on the
// previous screen with no sign that anything happened. Without a loading file
// there is no Suspense boundary, so Next has nothing to stream and the page
// appears all at once, late; with one, the shell and nav paint immediately and
// only the content below waits.
//
// Deliberately shaped like the tables it stands in for — a spinner in the
// middle of an empty page reads as "broken", a greyed-out table reads as
// "coming".
export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement…</span>

      <div className="h-4 w-24 animate-pulse bg-[#1d1a17]/10" />
      <div className="mt-3 h-11 w-56 animate-pulse bg-[#1d1a17]/10" />

      {/* Stands in for the status filter tabs on the orders screen. */}
      <div className="mt-6 flex flex-wrap gap-6 border-b border-[#1d1a17]/20 pb-3">
        {[68, 84, 76, 92, 72].map((w, i) => (
          <div key={i} className="h-3 animate-pulse bg-[#1d1a17]/[0.12]" style={{ width: w }} />
        ))}
      </div>

      {/* Des lignes cerclées comme celles qu'elles remplacent, qui s'effacent
          vers le bas pour que le bloc se lise comme inachevé et non comme du
          vrai contenu. */}
      <div className="mt-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex animate-pulse items-center gap-4 border-b border-[#1d1a17]/15 py-4"
            style={{ opacity: 1 - i * 0.13 }}
          >
            <div className="h-3 w-10 bg-[#1d1a17]/12" />
            <div className="h-4 flex-1 bg-[#1d1a17]/10" />
            <div className="hidden h-3 w-28 bg-[#1d1a17]/10 sm:block" />
            <div className="h-4 w-20 bg-[#1d1a17]/10" />
            <div className="h-5 w-24 bg-[#1d1a17]/[0.08]" />
          </div>
        ))}
      </div>
    </div>
  );
}
