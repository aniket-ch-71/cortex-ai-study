import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { QuestionEditor } from "@/components/admin/QuestionEditor";

function Page() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <QuestionEditor mode="create" onSaved={(id) => navigate({ to: "/admin/questions/$id", params: { id } })} />
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/admin/questions/new")({
  component: Page,
  head: () => ({ meta: [{ title: "New question · Admin · Pariksha" }, { name: "robots", content: "noindex,nofollow" }] }),
});
