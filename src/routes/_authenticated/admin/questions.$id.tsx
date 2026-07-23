import { createFileRoute } from "@tanstack/react-router";
import { QuestionEditor } from "@/components/admin/QuestionEditor";

function Page() {
  const { id } = Route.useParams();
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <QuestionEditor mode="edit" questionId={id} />
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/admin/questions/$id")({
  component: Page,
  head: () => ({ meta: [{ title: "Edit question · Admin · Pariksha" }, { name: "robots", content: "noindex,nofollow" }] }),
});
