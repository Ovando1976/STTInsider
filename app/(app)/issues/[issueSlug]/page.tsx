type PageProps = {
  params: Promise<{ issueSlug: string }>;
};

export default async function IssueDetailPage({ params }: PageProps) {
  const { issueSlug } = await params;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-400">
          OPENVI
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Issue Detail
        </h1>
        <p className="mt-4 text-slate-300">Issue: {issueSlug}</p>
      </div>
    </main>
  );
}
