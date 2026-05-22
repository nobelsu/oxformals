import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CollegePage } from "@/components/colleges/CollegePage";
import { slugToCollege } from "@/lib/data/collegeSlug";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function CollegeSlugPage({ params }: Props) {
  const { slug } = await params;
  const college = slugToCollege(slug);
  if (!college) notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6">
      <Suspense fallback={null}>
        <CollegePage college={college} />
      </Suspense>
    </main>
  );
}
