import { createService } from "@/app/actions";
import { requireUser } from "@/lib/session";
import { ServiceForm } from "@/components/service-form";
import { PageTitle } from "@/components/ui";

export const metadata = { title: "New service" };

export default async function NewService() {
  await requireUser();
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <PageTitle sub="Buyers see this on your profile and in the mapper list.">Offer a mapping service</PageTitle>
      <ServiceForm action={createService} submitLabel="Publish service" />
    </div>
  );
}
